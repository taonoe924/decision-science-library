(async()=>{'use strict';
const papers=[...(window.PAPERS||[])];
// Supplemental digests are additive; the original W33-W46 data remains unchanged.
try {
  const manifestResponse=await fetch('./data/digests/index.json',{cache:'no-store'});
  if(manifestResponse.ok){
    const manifest=await manifestResponse.json();
    const dates=Array.isArray(manifest.dates)?manifest.dates.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).slice(0,200):[];
    const batches=await Promise.all(dates.map(async date=>{
      try {
        const response=await fetch('./data/digests/'+date+'.json',{cache:'no-store'});
        if(!response.ok)return [];
        const batch=await response.json();
        const review=window.DSLDigestQuality?.validateBatch?.(batch,date);
        if(!review?.ok){
          console.warn('Digest not published (quality gate):',date,review?.problems||['quality module unavailable']);
          return [];
        }
        return batch;
      }catch(e){console.warn('Digest unavailable:',date,e);return [];}
    }));
    const ids=new Set(papers.map(p=>p.paper_id));
    const titles=new Set(papers.map(p=>String(p.title_candidate||'').toLowerCase().replace(/\s+/g,' ').trim()));
    for(const batch of batches)for(const p of (Array.isArray(batch)?batch:[])){
      if(!p||!p.paper_id||!p.title_candidate||!p.source_date)continue;
      const key=String(p.title_candidate).toLowerCase().replace(/\s+/g,' ').trim();
      if(ids.has(p.paper_id)||titles.has(key))continue;
      papers.push(p);ids.add(p.paper_id);titles.add(key);
    }
  }
}catch(e){console.warn('Scheduled digest loading failed; showing existing papers.',e);}
const app=document.getElementById('app');const navs=[['home','ホーム'],['latest','今週の4本'],['library','論文ライブラリ'],['rq','RQ探索'],['compare','論文比較'],['network','研究ネットワーク'],['archive','配信アーカイブ']];
const genres=[['因果推論・方法論',/DID|DML|causal|inference|difference|treatment|counterfactual|transport|policy learning|estimand|synthetic|heterogene|randomiz/i],['AI・意思決定',/AI|algorithm|decision|machine|generative|judgment|prediction/i],['健康・行動',/health|medical|hospital|behavior|reminder|nudge|patient|mortality/i],['経済・組織',/firm|management|labor|worker|tax|economic|growth|productivity|education/i]];
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const genre=p=>{let t=p.title_candidate+' '+(p.method_keywords||[]).join(' ');return genres.find(x=>x[1].test(t))?.[0]||'その他'};
const title=p=>p.title_candidate||'タイトル要確認';const titleJa=p=>p.title_ja||'日本語訳準備中';const dualTitle=(p)=>`<span class="title-ja">${safe(titleJa(p))}</span><span class="title-en">${safe(title(p))}</span>`;const route=(page,id='')=>'#/'+page+(id?'/'+encodeURIComponent(id):'');
let state={query:'',genre:'all',week:'all',selected:[],net:'all',netAxis:'identification_tags',netTag:'all'};
const unique=(xs)=>[...new Set(xs)];const weeks=unique(papers.flatMap(p=>p.source_weeks||[])).sort();
const sourceText=p=>p.source_text||'';

// Presentation normalization: keep mathematical meaning, remove decorative boxes.
function unboxMath(tex){
  let s=String(tex||'');
  for(let pass=0;pass<12;pass++){
    let next='', cursor=0, m;
    const rx=/\\(?:boxed|fbox)\s*\{/g;
    while((m=rx.exec(s))){
      let start=m.index+m[0].length, depth=1, i=start;
      while(i<s.length && depth){
        if(s[i]==='{' && s[i-1]!=='\\')depth++;
        else if(s[i]==='}' && s[i-1]!=='\\')depth--;
        i++;
      }
      if(depth!==0)continue;
      next+=s.slice(cursor,m.index)+'{'+s.slice(start,i-1)+'}';
      cursor=i; rx.lastIndex=i;
    }
    next+=s.slice(cursor);
    if(next===s)break;
    s=next;
  }
  return s;
}

function normalizeDisplayMath(src){
  // Convert historical math delimited by standalone dollar-sign lines into display blocks.
  const lines=src.split('\n'), out=[];
  let buffer=null;
  for(const line of lines){
    if(line.trim()==='$'){
      if(buffer===null)buffer=[];
      else{out.push('$$',...buffer,'$$');buffer=null;}
    }else if(buffer===null)out.push(line);
    else buffer.push(line);
  }
  if(buffer!==null)out.push('$',...buffer);
  return out.join('\n');
}
function md(src){
  let s=normalizeDisplayMath(unboxMath(String(src||'')).replace(/\r\n/g,'\n')).replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2');
  // Remove expired legacy footnote markers (including escaped and spaced forms).
  // DOI links and ordinary research references are preserved.
  s=s.replace(/^\s*\\?\[\^(?:20\d{6})-\d+\]:[^\n]*(?:\n|$)/gm,'');
  s=s.replace(/\\?\[\^(?:20\d{6})-\d+\]/g,'');
  s=s.replace(/(?:^|\s)cite[^]+/g,'');
  const blocks=[];
  s=s.replace(/\$\$([\s\S]*?)\$\$/g,(_,x)=>{const id=blocks.length;blocks.push('<div class="math">\\['+safe(x.trim())+'\\]</div>');return '\nMATHBLOCK'+id+'\n'});
  s=s.replace(/\\\[([\s\S]*?)\\\]/g,(_,x)=>{const id=blocks.length;blocks.push('<div class="math">\\['+safe(x.trim())+'\\]</div>');return '\nMATHBLOCK'+id+'\n'});
  const inline=x=>safe(x)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/g,(_,label,url)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>');
  const splitCells=line=>{
    let v=line.trim().replace(/^\|/,'').replace(/\|$/,'');
    return v.split(/(?<!\\)\|/).map(cell=>cell.trim().replace(/\\\|/g,'|'));
  };
  const isDivider=line=>{
    const cells=splitCells(line);
    return cells.length>=2&&cells.every(c=>/^:?-{3,}:?$/.test(c.replace(/\s/g,'')));
  };
  const lines=s.split('\n');
  let out='',list=null,para=[];
  const flush=()=>{
    if(para.length){out+='<p>'+inline(para.join(' '))+'</p>';para=[];}
    if(list){out+='</'+list+'>';list=null;}
  };
  for(let i=0;i<lines.length;i++){
    const t=lines[i].trim();
    if(/^```/.test(t)){
      flush();
      const codeLines=[];
      while(i+1<lines.length && !/^```\s*$/.test(lines[i+1].trim()))codeLines.push(lines[++i]);
      if(i+1<lines.length)i++;
      out+='<pre><code>'+safe(codeLines.join('\n'))+'</code></pre>';
      continue;
    }
    if(!t){flush();continue;}
    if(/^MATHBLOCK\d+$/.test(t)){flush();out+=blocks[Number(t.slice(9))]||'';continue;}
    const head=splitCells(t);
    if(i+1<lines.length && head.length>=2 && t.includes('|') && isDivider(lines[i+1])){
      flush();
      const align=splitCells(lines[i+1]).map(c=>c.startsWith(':')&&c.endsWith(':')?'center':c.endsWith(':')?'right':'left');
      const cell=(v,tag,j)=>'<'+tag+' style="text-align:'+align[Math.min(j,align.length-1)]+'">'+inline(v)+'</'+tag+'>';
      out+='<div class="table-scroll" role="region" aria-label="研究データの表" tabindex="0"><table class="md-table"><thead><tr>'+head.map((v,j)=>cell(v,'th',j)).join('')+'</tr></thead><tbody>';
      i+=1;
      let rowCount=0;
      while(i+1<lines.length){
        const line=lines[i+1].trim();
        if(!line||!line.includes('|')||isDivider(line))break;
        const row=splitCells(line);
        rowCount++;
        out+='<tr>'+head.map((_,j)=>cell(row[j]||'','td',j)).join('')+'</tr>';
        i++;
      }
      out+='</tbody></table>'+(rowCount===0?'<div class="table-note">注：元の配信データには列見出しのみがあり、行の内容は記載されていません。</div>':'')+'</div>';
      continue;
    }
    const h=t.match(/^(#{1,6})\s+(.+)/);
    if(h){flush();const level=Math.min(4,h[1].length+1);out+='<h'+level+'>'+inline(h[2])+'</h'+level+'>';continue;}
    if(t.startsWith('> ')){flush();out+='<blockquote>'+inline(t.slice(2))+'</blockquote>';continue;}
    const li=t.match(/^([-*]|\d+\.)\s+(.+)/);
    if(li){
      const next=/\d/.test(li[1][0])?'ol':'ul';
      if(list!==next){flush();out+='<'+next+'>';list=next;}
      out+='<li>'+inline(li[2])+'</li>';
      continue;
    }
    if(/^---+$/.test(t)){flush();out+='<hr>';continue;}
    if(list){flush();}
    para.push(t);
  }
  flush();
  return out;
}
function paperOnlyText(text){
  // Archived weekly digests may include a subsequent category or cross-paper synthesis
  // after section 6. Retain full source data; render only the single-paper exposition.
  const all=[...String(text||'').matchAll(/^#{2,6}\s*(?:\*\*)?6[.．、](?!\d)\s*[^\n]+$/gm)];
  if(!all.length)return text;
  const finalSix=all[all.length-1], start=finalSix.index+finalSix[0].length;
  const suffix=String(text).slice(start);
  const cut=/^---\s*\n\s*#{2,4}\s*(?:今週読むなら|4本を横断|B[｜．.：\s]|[AB][．.｜]\s*|今回の研究テーマから)/m.exec(suffix);
  return cut?String(text).slice(0,start+cut.index).trim():text;
}
function headings(text){
  const body=paperOnlyText(text),parts=[];
  const re=/^#{2,6}\s*(?:\*\*)?([1-6])[.．、](?!\d)\s*([^\n*]+)(?:\*\*)?\s*$/gm;
  const matches=[...body.matchAll(re)];
  if(matches.length!==6||matches.some((m,i)=>Number(m[1])!==i+1))return null;
  for(let i=0;i<matches.length;i++){
    parts.push({n:Number(matches[i][1]),heading:matches[i][2].trim(),body:body.slice(matches[i].index+matches[i][0].length,matches[i+1]?.index||body.length).trim()});
  }
  return parts;
}
function paperCard(p,extra=''){return `<article class="card"><div class="meta">${safe((p.source_weeks||[]).join('・'))} · ${safe(p.source_date||'配信日未確認')} <span class="pill">${safe(genre(p))}</span></div><h3 class="paper-title"><a href="${route('paper',p.paper_id)}">${dualTitle(p)}</a></h3><div class="meta">${safe(p.design_status||'研究デザイン要確認')}</div><div class="actions"><a class="btn" href="${route('paper',p.paper_id)}">詳細を読む</a>${extra}</div></article>`}
function layout(content,active){app.innerHTML=`<header class="top"><div class="shell topinner"><div class="brand">Decision Science Library</div><div class="subbrand">論文から、新しい研究の問いへ。</div><nav class="nav" aria-label="メインメニュー">${navs.map(([k,v])=>`<button data-page="${k}" class="${active===k?'active':''}">${v}</button>`).join('')}</nav></div></header><main class="shell page">${content}</main><footer class="footer"><div class="shell">Decision Science Library · 過去配信と新規配信の研究ライブラリ · 原著未照合の項目を含みます</div></footer>`;app.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>location.hash=route(b.dataset.page));}
function home(){let featured=papers.slice(0,6);layout(`<div class="pagehead"><h1>研究を探す。問いを育てる。</h1><p>因果推論・意思決定科学の論文を、研究課題・手法・配信履歴から探索できます。</p></div><div class="stats"><div class="card stat"><strong>${papers.length}</strong><span>論文レコード（暫定）</span></div><div class="card stat"><strong>${weeks.length}</strong><span>収録週数</span></div><div class="card stat"><strong>6</strong><span>論文解説の基本見出し</span></div></div><section class="section"><div class="card"><h2>今週の4本</h2><p>最近追加された論文から、Research Questionを起点に読み始めましょう。</p><div class="actions"><a class="btn primary" href="${route('latest')}">最新4本の解説を見る</a></div></div></section><div class="notice">収録データは過去の配信Markdownから抽出したもので、タイトル・DOI・数値結果などの原著照合は完了していません。論文数も今後の同定により変わる可能性があります。</div><section class="section"><h2>ジャンルから探す</h2><div class="grid">${[...genres.map(x=>x[0]),'その他'].map(g=>`<div class="card"><h3>${safe(g)}</h3><p class="meta">${papers.filter(p=>genre(p)===g).length} レコード</p><button class="btn" data-genre="${safe(g)}">この分野を探索</button></div>`).join('')}</div></section><section class="section"><h2>収録論文から</h2><div class="grid">${featured.map(p=>paperCard(p)).join('')}</div></section><section class="section"><h2>研究の問いを広げる</h2><div class="card"><p class="tagline">同じテーマでも、識別戦略や対象集団、メカニズムを変えると新たなRQが生まれます。まずはRQ探索と研究ネットワークで、収録論文の関係候補を確認してください。</p><div class="actions"><a class="btn primary" href="${route('rq')}">RQ探索を開く</a><a class="btn" href="${route('network')}">ネットワークを開く</a></div></div></section>`,'home');app.querySelectorAll('[data-genre]').forEach(b=>b.onclick=()=>{state.genre=b.dataset.genre;location.hash=route('library')})}
function library(){let matches=papers.filter(p=>(state.genre==='all'||genre(p)===state.genre)&&(state.week==='all'||(p.source_weeks||[]).includes(state.week))&&(!state.query||(title(p)+' '+titleJa(p)+' '+sourceText(p)).toLowerCase().includes(state.query.toLowerCase())));layout(`<div class="pagehead"><h1>論文ライブラリ</h1><p>タイトル・本文検索、ジャンル、配信週で絞り込めます。</p></div><div class="toolbar"><input id="search" placeholder="タイトル、RQ、手法、本文を検索" value="${safe(state.query)}" aria-label="検索"><select id="genre" aria-label="ジャンル"><option value="all">全ジャンル</option>${[...genres.map(x=>x[0]),'その他'].map(g=>`<option value="${safe(g)}" ${state.genre===g?'selected':''}>${safe(g)}</option>`).join('')}</select><select id="week" aria-label="配信週"><option value="all">全配信週</option>${weeks.map(w=>`<option ${state.week===w?'selected':''}>${safe(w)}</option>`).join('')}</select></div><div class="count">${matches.length}件を表示 / ${papers.length}件</div><div class="grid">${matches.slice(0,100).map(p=>paperCard(p,`<button class="btn" data-select="${p.paper_id}">${state.selected.includes(p.paper_id)?'比較から外す':'比較に追加'}</button>`)).join('')||'<div class="card empty">該当する論文がありません。</div>'}</div><div class="actions"><a class="btn primary" href="${route('compare')}">選択した論文を比較（${state.selected.length}件）</a></div>`,'library');app.querySelector('#search').oninput=e=>{state.query=e.target.value;let pos=e.target.selectionStart;library();let n=app.querySelector('#search');n.focus();n.setSelectionRange(pos,pos)};app.querySelector('#genre').onchange=e=>{state.genre=e.target.value;library()};app.querySelector('#week').onchange=e=>{state.week=e.target.value;library()};app.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{let id=b.dataset.select;state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):state.selected.length<4?[...state.selected,id]:state.selected;library()})}
function auditPanel(p){
  const r=p.detailed_review;
  if(!r)return '<div class="audit-summary"><h2>原著照合の状況</h2><p>詳細監査記録は未整備です。論文中の数値、信頼区間、識別仮定は原著で再確認してください。</p></div>';
  const status=String(r.status||'');
  const ev=p.quantitative_evidence;
  const quantitative=ev?.status==='selected_numeric_rows_checked_against_original_tables'
    ? '原著の指定Table/Figureの一部を数値照合。ほかの結果は未完了'
    :ev?.status==='headline_approximations_checked_against_primary_abstract'
    ? '公式要旨で概数のみ確認。表番号・SE・CIは未確認'
    :ev?.status==='author_repo_summary_stats_checked'
    ? '著者公開資料の評価結果と一部95%CIを確認。論文全体は未照合'
    :ev?.status==='sample_counts_and_narrative_approximate_effect_checked'
    ? '原著の標本構成と本文中の概数を確認。対応するCIは未確認'
    :status==='selected_results_checked_against_original'?'原著本文の指定箇所で一部の定量結果を照合':
    status==='selected_results_checked_against_primary_abstract'?'公式要旨の主要数値のみ部分照合':
    status==='selected_results_checked_against_source_excerpt'?'公開本文抜粋による部分照合':
    '数値・信頼区間は原著本文との完全照合未了';
  const limitations=Array.isArray(r.limitations)?r.limitations.filter(Boolean):[];
  const source=/^https:\/\//.test(r.source_url||'')?
    '<a href="'+safe(r.source_url)+'" target="_blank" rel="noopener noreferrer">確認に用いた一次資料</a>':'';
  return '<div class="audit-summary"><h2>原著照合の状況</h2>'+
    '<p><strong>確認範囲：</strong>'+safe(r.scope||'一部の公開情報')+'</p>'+
    '<p><strong>定量結果：</strong>'+safe(quantitative)+'</p>'+
    '<p><strong>参照箇所：</strong>'+safe(r.locator||'未記録')+'</p>'+
    (r.checked_on?'<p><strong>確認日：</strong>'+safe(r.checked_on)+'</p>':'')+
    (limitations.length?'<strong>未確認・注意事項</strong><ul>'+limitations.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul>':'')+
    (source?'<p>'+source+'</p>':'')+
    '<p class="small muted">監査記録の整備は論文全文の検証完了を意味しません。</p></div>';
}
function evidencePanel(p){
  const e=p.quantitative_evidence;
  if(!e||!Array.isArray(e.records)||!e.records.length)return '';
  const rows=e.records.map(x=>
    '<tr><td>'+safe(x.table||'')+'</td><td>'+safe(x.estimand||'')+'</td>'+
    '<td>'+safe(x.estimate||'')+'</td><td>'+safe(x.se||'未確認')+'</td>'+
    '<td>'+safe(x.ci95||'未確認')+'</td><td>'+safe(x.unit||'')+'</td>'+
    '<td>'+safe(x.caveat||'')+'</td></tr>').join('');
  const source=/^https:\/\//.test(e.source_url||'')?
    '<a href="'+safe(e.source_url)+'" target="_blank" rel="noopener noreferrer">数値の確認に用いた一次資料</a>':'';
  return '<details class="audit-evidence"><summary>一次資料と照合した定量情報（'+e.records.length+'件）</summary>'+
    '<p class="small">出典：'+safe(e.source_version||'')+'。'+safe(e.method||'')+'</p>'+
    (e.n_total?'<p class="small">標本数：'+safe(e.n_total)+'人。'+safe(e.groups||'')+'</p>':'')+
    '<div class="table-scroll" role="region" aria-label="原著の定量結果" tabindex="0">'+
    '<table class="md-table"><thead><tr><th>原著の箇所</th><th>推定対象</th><th>推定値</th><th>SE</th><th>95%CI</th><th>単位</th><th>解釈上の注意</th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table></div>'+
    '<p class="small">'+source+'。確認日：'+safe(e.checked_on||'')+'。未確認をゼロと解釈しないでください。</p>'+
    '</details>';
}

/* Paper-specific visual abstract: schematic, not a reproduced author figure.
   Uses only available digest metadata and labels missing fields explicitly. */
function overviewFigure(p){
  const clean=x=>String(x||'').replace(/\s+/g,' ').replace(/\[\^(?:20\d{6})-\d+\]/g,'').replace(/元配信の中心命題（解説者による再構成）：/g,'').trim();
  const esc=x=>safe(clean(x));
  const lines=(s,n=35,count=2)=>{
    const ch=[...clean(s)],out=[];for(let i=0;i<ch.length&&out.length<count;i+=n)out.push(ch.slice(i,i+n).join(''));
    // Explicitly signal shortened explanatory text; no invisible overflow beyond the SVG.
    if(ch.length>n*count)out[count-1]=out[count-1].slice(0,Math.max(0,n-5))+'…（本文参照）';
    return out.length?out:['情報を確認中'];
  };
  const textRows=(s,x,y,width=37,count=2,size=17,fill='#243b54')=>lines(s,width,count).map((t,i)=>'<text x="'+x+'" y="'+(y+i*(size+9))+'" font-size="'+size+'" fill="'+fill+'">'+esc(t)+'</text>').join('');
  const box=(x,y,w,h,label,desc,accent='#ecf4f9')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="12" fill="'+accent+'" stroke="#cbdde8"/><text x="'+(x+15)+'" y="'+(y+31)+'" font-size="18" font-weight="700" fill="#164264">'+esc(label)+'</text>'+textRows(desc,x+15,y+62,Math.max(10,Math.floor((w-30)/17)),2,16);
  const arrow=(x1,y1,x2,y2)=>'<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" fill="none" stroke="#6188a3" stroke-width="2.5"/><path d="M'+x2+' '+y2+' l-9 -4 v8 z" fill="#6188a3" transform="rotate('+Math.atan2(y2-y1,x2-x1)*180/Math.PI+' '+x2+' '+y2+')"/>';
  // Use methodological metadata rather than scanning the full digest, which often discusses competing designs.
  const methods=[...(p.method_keywords||[]),...(p.research_map?.identification_tags||[]),p.design_status||''].join(' ');
  const knownDesign=String(p.design_status||'');
  // Keyword-derived labels are not evidence that a method was actually used.
  // Display a specific design only when a source-checked classification is available.
  const strongDesign=Boolean(p.research_design_verified===true || p.design_verified===true || p.visual_abstract_design_verified===true);
  const isRCT=/\bRCT\b|randomi[sz]ed|ランダム化|無作為割付|無作為化/i.test(methods);
  const isDID=/\bDID\b|difference.in.difference|差の差|差分の差分/i.test(methods);
  const isRD=/\bRDD\b|regression discontinuity|回帰不連続/i.test(methods);
  const isSurvival=/survival|time.to.event|生存時間|ハザード/i.test(methods);
  const isTheory=/理論|simulation|シミュレーション|estimand|推定対象/i.test(methods);
  const type=!strongDesign?'general':isRCT?'rct':isDID?'did':isRD?'rdd':isSurvival?'survival':isTheory?'theory':'general';
  const typeName={rct:'ランダム化比較試験（RCT）',did:'差の差分析（DID）',rdd:'回帰不連続デザイン（RDD）',survival:'生存時間・イベント分析',theory:'理論・推定方法の研究',general:'研究の概念整理（手法未確定）'}[type];
  const out=(p.research_map?.outcome_tags||[]).slice(0,2).join('・')||'測定指標は本文を確認';
  let graphic='';
  if(type==='rct'){
    graphic+=box(30,148,286,107,'対象者','条件に合う参加者')+box(460,128,290,98,'介入群','施策・治療を受ける')+box(460,255,290,98,'比較群','対照となる条件')+box(894,184,273,114,'比較する結果',out);
    graphic+=arrow(316,197,455,177)+arrow(316,209,455,302)+arrow(751,177,888,221)+arrow(751,303,888,260);
    graphic+='<text x="340" y="180" font-size="15" fill="#506d83">無作為に割り付け</text>';
  }else if(type==='did'){
    graphic+=box(28,169,240,100,'介入・制度変更','政策や施策の導入');
    graphic+='<rect x="334" y="128" width="492" height="236" rx="10" fill="#fff" stroke="#bfd2df"/>';
    graphic+='<text x="469" y="157" font-size="17" font-weight="700" fill="#164264">導入前</text><text x="672" y="157" font-size="17" font-weight="700" fill="#164264">導入後</text>';
    graphic+='<line x1="334" y1="247" x2="826" y2="247" stroke="#d7e2ea"/><line x1="562" y1="128" x2="562" y2="364" stroke="#d7e2ea"/>';
    graphic+='<text x="356" y="204" font-size="18" fill="#183c59">介入群</text><text x="356" y="319" font-size="18" fill="#183c59">比較群</text>';
    for(const [x,y,v] of [[488,205,'前'],[686,205,'後'],[488,318,'前'],[686,318,'後']])graphic+='<circle cx="'+x+'" cy="'+(y-7)+'" r="22" fill="#e9f2f8"/><text x="'+(x-9)+'" y="'+y+'" font-size="17" fill="#164264">'+v+'</text>';
    graphic+=box(885,173,284,111,'変化の差を比較',out)+arrow(826,242,879,242)+arrow(268,218,328,218);
  }else if(type==='rdd'){
    graphic+=box(28,160,280,112,'制度上の閾値','基準の前後を比較');
    graphic+='<rect x="380" y="126" width="444" height="237" rx="12" fill="#fff" stroke="#cbdde8"/>';
    graphic+='<line x1="429" y1="322" x2="784" y2="322" stroke="#6e8ca2" stroke-width="2"/><line x1="429" y1="322" x2="429" y2="158" stroke="#6e8ca2" stroke-width="2"/>';
    graphic+='<line x1="617" y1="153" x2="617" y2="324" stroke="#d38b51" stroke-dasharray="6 6" stroke-width="3"/>';
    graphic+='<path d="M450 286 L590 245 M644 204 L766 165" stroke="#4d84a6" stroke-width="4" fill="none"/>';
    graphic+='<text x="580" y="349" font-size="15" fill="#7d5738">閾値</text><text x="450" y="178" font-size="15" fill="#425c72">閾値直前と直後の結果</text>';
    graphic+=box(882,172,287,110,'局所的な差を評価',out)+arrow(309,217,371,217)+arrow(826,235,875,235);
  }else if(type==='survival'){
    graphic+=box(28,170,275,105,'対象者と追跡','観察開始から追跡');
    graphic+='<rect x="366" y="145" width="466" height="202" rx="12" fill="#fff" stroke="#cbdde8"/>';
    graphic+='<text x="388" y="177" font-size="18" fill="#164264" font-weight="700">時間の経過とイベント発生</text>';
    graphic+='<line x1="414" y1="281" x2="792" y2="281" stroke="#5d829b" stroke-width="2"/>';
    graphic+='<path d="M424 219 H512 V232 H603 V249 H717 V268 H783" stroke="#477d9b" fill="none" stroke-width="4"/>';
    graphic+='<text x="437" y="312" font-size="15" fill="#5b7183">追跡開始</text><text x="717" y="312" font-size="15" fill="#5b7183">追跡期間</text>';
    graphic+=box(894,170,275,114,'時間と結果を評価',out)+arrow(303,223,358,223)+arrow(832,236,886,236);
  }else if(type==='theory'){
    graphic+=box(29,164,332,109,'既存手法の課題','推定対象・仮定を整理')+box(440,164,332,109,'新しい考え方',methods.slice(0,65)||'識別・推定方法を検討')+box(855,164,311,109,'検証・適用',out);
    graphic+=arrow(361,217,431,217)+arrow(772,217,847,217);
  }else{
    graphic+=box(28,164,343,109,'研究課題',p.rq_candidate||'何を明らかにするか')+box(428,164,341,109,'比較・分析',methods||'研究デザインを確認中')+box(827,164,343,109,'評価する結果',out);
    graphic+=arrow(371,218,420,218)+arrow(769,218,819,218);
  }
  const rq=p.rq_candidate||'研究課題は本文で確認してください';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 566" width="1200" height="566" role="img">'+
    '<rect width="1200" height="477" rx="14" fill="#f3f7fa"/>'+
    '<text x="28" y="40" font-size="24" fill="#173d59" font-weight="700">この論文の全体像</text>'+
    '<text x="28" y="71" font-size="16" fill="#50728b">研究デザイン：'+esc(typeName)+'（配信データからの暫定判定）</text>'+
    textRows('問い：'+rq,28,99,62,2,16,'#37556b')+graphic+
    '<text x="28" y="419" font-size="17" font-weight="700" fill="#183c59">意思決定への接続（仮説・解説者による整理）</text>'+
    textRows(p.hypothesis_candidate||'結果をどのような判断に利用できるか、本文で確認してください',28,453,65,3,16,'#37556b')+
    '<text x="28" y="545" font-size="13" fill="#637c8f">注：原著図ではなく、解説用の模式図。群構成・数値・識別条件を確認した図ではありません。</text></svg>';
  return '<figure class="paper-overview"><img src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'" alt="'+safe('論文概要図：'+typeName+'。研究の問い、研究設計、結果、意思決定への接続を図解')+'" loading="lazy" decoding="async"><figcaption>論文概要（'+safe(typeName)+'の概念図／原著の図ではありません。研究デザインの判定は暫定的です）</figcaption></figure>';
}
function detail(id){let p=papers.find(x=>x.paper_id===id);if(!p){layout('<div class="card">論文が見つかりません。<a href="#/library">一覧へ戻る</a></div>','library');return}let parts=headings(sourceText(p));let sections=parts?parts.map((s,i)=>`<section class="section" id="s${i}"><h2>${s.n}. ${safe(s.heading)}</h2><div class="prose">${md(s.body)}</div></section>`).join(''):`<section class="section"><h2>短報（元配信の全文）</h2><div class="prose">${md(sourceText(p))}</div></section>`;let toc=parts?parts.map((s,i)=>`<a href="#s${i}" data-anchor="s${i}">${s.n}. ${safe(s.heading)}</a>`).join(''):'<p class="meta">この論文は短報形式で収録されており、6見出し構成ではありません。本文をそのまま掲載しています。</p>';layout(`<div class="pagehead"><a href="${route('library')}">← ライブラリへ戻る</a><h1 style="margin-top:12px">${safe(titleJa(p))}</h1><p class="detail-en-title">${safe(title(p))}</p><p>${safe((p.source_weeks||[]).join('・'))} · ${safe(p.source_date||'日付未確認')} · ${safe(p.design_status||'手法要確認')}</p></div><div class="notice">${p.substantive_verification==='partially_checked_against_primary_sources'?'一部の研究デザイン・定量結果を原著の指定箇所と照合しました（本文内の「原著照合ノート」を参照）。その他の説明や数値は未照合です。':p.substantive_verification==='partial_abstract_or_primary_source_checked'?'原著・出版社要旨等の一部と照合しました。本文内の「原著照合ノート」または「分類監査ノート」に確認範囲を記録しています。数式・効果量・信頼区間・識別仮定など全項目の検証は未完了です。':'この解説は過去配信の原文を保持したものです。原著照合は未完了です。数値・出典・識別仮定を研究に使用する際は原論文をご確認ください。'}</div>${auditPanel(p)}${evidencePanel(p)}<div class="split"><div><div class="card"><div class="meta">${safe(genre(p))}　${(p.method_keywords||[]).map(x=>`<span class="pill">${safe(x)}</span>`).join('')}</div><p class="tagline"><strong>研究課題（RQ）：</strong>${safe(p.rq_candidate||'構造化待ち（本文をご参照ください）')}<span class="meta"> ${['reconstructed_from_digest_overview_not_author_verified','analyst_reconstruction_from_digest_not_author_verified'].includes(p.rq_provenance)?'［元配信の説明から再構成・原著未照合］':p.rq_provenance==='extracted_from_digest_rq'?'［元配信のRQ欄から抽出・原著未照合］':'［原著未照合］'}</span></p><p class="tagline"><strong>仮説・中心命題：</strong>${safe(p.hypothesis_candidate||'構造化待ち')}<span class="meta"> ${p.hypothesis_provenance==='extracted_digest_proposition_not_author_verified'||p.hypothesis_provenance==='analyst_reconstruction_from_digest_not_author_verified'?'［元配信から抽出した要約・著者の正式仮説とは限りません］':'［原著未照合］'}</span></p><div class="meta"><strong>研究デザイン・Outcome・メカニズム（探索用の暫定分類）</strong><div>${[["識別・分析",(p.research_map?.identification_tags||[])],["Outcome",(p.research_map?.outcome_tags||[])],["メカニズム候補",(p.research_map?.mechanism_tags||[])]].filter(x=>x[1].length).map(x=>`<p>${safe(x[0])}：${x[1].map(t=>`<span class="pill">${safe(t)}</span>`).join("")}</p>`).join("")}</div><p>${String(p.research_map?.review_status||'').includes('reviewed')||p.research_map?.review_status==='source_cross_checked_selected_fields_only'?'識別手法等の一部を一次資料と照合した探索用分類です。分類の全項目を検証したわけではありません。':'元配信テキストからの自動分類候補です。分類自体の原著照合は未完了です。'}</p></div><div class="actions"><button class="btn" id="addCompare">${state.selected.includes(id)?'比較対象から外す':'比較対象に追加'}</button>${p.doi_candidate?`<a class="btn" target="_blank" rel="noopener" href="https://doi.org/${encodeURIComponent(p.doi_candidate)}">DOIを開く</a>`:''}${/^https?:\/\//.test(p.source_url||'')?`<a class="btn" href="${safe(p.source_url)}" target="_blank" rel="noopener">原文リンク</a>`:''}</div></div><div class="card">${overviewFigure(p)}${sections}</div>${p.digest_context?`<details class="card digest-context"><summary>同じ配信回の横断まとめ（開いて読む）</summary><div class="prose">${md(p.digest_context)}</div></details>`:'' }<div class="card"><h2>研究の型と次のRQ</h2><p class="muted">構造化・原著照合待ち。既存の解説「次読むべき論文は？」を参照してください。</p></div></div><aside class="card side"><strong>この論文の目次</strong>${toc}<hr><p class="small muted">データ品質：${p.substantive_verification==="not_checked_against_original"?"原著未照合":"原著・要旨等の一部を照合済み"}</p>${p.detailed_review?`<p class="small"><strong>${p.detailed_review.status==="selected_results_checked_against_original"?"原著の指定箇所にある数値の部分照合":p.detailed_review.status==="selected_results_checked_against_primary_abstract"?"原著要旨の主要数値の部分照合":p.detailed_review.status==="selected_results_checked_against_source_excerpt"?"公開テキストによる数値部分照合":"理論・研究設計の部分照合"}：</strong>${safe(p.detailed_review.locator||"原著の指定箇所")}。全文監査ではありません。</p>`:""}<p class="small muted">論文ID：${safe(p.paper_id)}</p></aside></div>`,'library');app.querySelector('#addCompare').onclick=()=>{state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):state.selected.length<4?[...state.selected,id]:state.selected;detail(id)};app.querySelectorAll('[data-anchor]').forEach(a=>a.onclick=e=>{e.preventDefault();document.getElementById(a.dataset.anchor)?.scrollIntoView({behavior:'smooth'})})}
function compare(){let chosen=state.selected.map(id=>papers.find(p=>p.paper_id===id)).filter(Boolean);layout(`<div class="pagehead"><h1>論文比較</h1><p>最大4本まで選択し、RQ・研究デザイン・検証内容を横並びにします。</p></div><div class="notice">比較表は配信原文からの抜粋を含みます。原著との整合性は未検証です。</div><div class="card"><h3>比較対象を選択（${chosen.length}/4）</h3><div class="toolbar"><select id="addPaper"><option value="">論文を追加…</option>${papers.filter(p=>!state.selected.includes(p.paper_id)).map(p=>`<option value="${p.paper_id}">${safe(titleJa(p))} / ${safe(title(p))}</option>`).join('')}</select><button class="btn" id="clear">選択を解除</button></div><div class="actions">${chosen.map(p=>`<button class="btn" data-remove="${p.paper_id}">× ${safe(titleJa(p).slice(0,36))}</button>`).join('')}</div></div>${chosen.length?`<div class="card comparewrap"><table class="compare"><thead><tr><th>比較項目</th>${chosen.map(p=>`<th><a href="${route('paper',p.paper_id)}">${dualTitle(p)}</a></th>`).join('')}</tr></thead><tbody>${[['ジャンル',p=>genre(p)],['配信週',p=>(p.source_weeks||[]).join('・')],['RQ（抽出候補）',p=>p.rq_candidate||'未構造化'],['仮説（抽出候補）',p=>p.hypothesis_candidate||'未構造化'],['手法（キーワード）',p=>p.design_status||'未確認'],['解説の長さ',p=>sourceText(p).length.toLocaleString()+'文字'],['原著確認',p=>'未照合']].map(([name,fn])=>`<tr><th>${name}</th>${chosen.map(p=>`<td>${safe(fn(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="card empty">論文ライブラリから比較対象を追加してください。</div>'}`,'compare');app.querySelector('#addPaper').onchange=e=>{if(e.target.value&&state.selected.length<4)state.selected.push(e.target.value);compare()};app.querySelector('#clear').onclick=()=>{state.selected=[];compare()};app.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.selected=state.selected.filter(x=>x!==b.dataset.remove);compare()})}
function rq(){let groups=[...genres.map(x=>x[0]),'その他'];layout(`<div class="pagehead"><h1>RQ探索マップ</h1><p>ジャンルから論文へ進み、研究課題を考えるための探索画面です。</p></div><div class="notice">現段階の分類はタイトル・手法キーワードに基づく暫定分類です。因果的なメカニズムや引用関係を確定したものではありません。</div><div class="card"><h3>研究の問い → 方法・メカニズム → 論文</h3><div class="nodegrid"><div class="node"><strong>関心のある研究課題</strong><p class="small">何を明らかにしたいか？</p></div><div class="node"><strong>検証の仕組み</strong><p class="small">どんな比較・仮定・測定が必要か？</p></div><div class="node paper"><strong>先行研究</strong><p class="small">類似のRQ・研究デザインを探す</p></div></div></div>${groups.map(g=>`<section class="card"><h3>${safe(g)} <span class="meta">${papers.filter(p=>genre(p)===g).length}件</span></h3>${papers.filter(p=>genre(p)===g).slice(0,7).map(p=>`<div class="rqrow"><span class="meta">${safe(p.design_status||'研究デザイン要確認')}</span><div><a href="${route('paper',p.paper_id)}">${dualTitle(p)}</a></div></div>`).join('')}<div class="actions"><button class="btn" data-g="${safe(g)}">この分野の全論文を見る</button></div></section>`).join('')}`,'rq');app.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{state.genre=b.dataset.g;location.hash=route('library')})}
function network(){
  const dimensions=[['identification_tags','識別・分析手法'],['outcome_tags','Outcome分野'],['mechanism_tags','メカニズム候補']];
  const dimension=dimensions.some(x=>x[0]===state.netAxis)?state.netAxis:'identification_tags';
  const available=[...new Set(papers.flatMap(p=>p.research_map?.[dimension]||[]))].sort((a,b)=>a.localeCompare(b,'ja'));
  const current=available.includes(state.netTag)?state.netTag:'all';
  const matches=papers.filter(p=>(current==='all'||(p.research_map?.[dimension]||[]).includes(current))&&(state.net==='all'||genre(p)===state.net)).sort((a,b)=>(b.source_date||'').localeCompare(a.source_date||''));
  const subset=matches.slice(0,24),cols=6,rows=Math.max(1,Math.ceil(subset.length/cols));
  const nodes=subset.map((p,i)=>({paper:p,x:80+(i%cols)*155,y:65+Math.floor(i/cols)*110,label:titleJa(p).slice(0,17)}));
  const lines=[];
  const related=(a,b)=>{
    const ra=a.paper.research_map||{},rb=b.paper.research_map||{};
    const get=k=>(ra[k]||[]).filter(t=>(rb[k]||[]).includes(t)).length;
    const method=get('identification_tags'),outcome=get('outcome_tags'),mechanism=get('mechanism_tags');
    return method>0&&outcome>0 || method>0&&mechanism>0 || outcome>0&&mechanism>0;
  };
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(lines.length<70&&related(nodes[i],nodes[j]))lines.push([nodes[i],nodes[j]]);
  const h=Math.max(250,rows*110+35);
  const svg='<svg viewBox="0 0 960 '+h+'" style="width:100%;height:auto" role="img" aria-label="研究データから抽出した関連候補のネットワーク">'+lines.map(([a,b])=>'<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#cad7e3" stroke-width="1.3"/>').join('')+nodes.map(n=>'<a href="'+route('paper',n.paper.paper_id)+'"><g><title>'+safe(title(n.paper))+'</title><circle cx="'+n.x+'" cy="'+n.y+'" r="11" fill="#5e8fb0"/><text x="'+n.x+'" y="'+(n.y+24)+'" text-anchor="middle" font-size="10" fill="#29445b">'+safe(n.label)+'</text></g></a>').join('')+'</svg>';
  const select=(id,options,value)=>'<select id="'+id+'">'+options.map(([v,t])=>'<option value="'+safe(v)+'"'+(v===value?' selected':'')+'>'+safe(t)+'</option>').join('')+'</select>';
  const controls=select('netaxis',dimensions,dimension)+select('nettag',[['all','全分類'],...available.map(x=>[x,x])],current)+select('netcat',[['all','全ジャンル'],...genres.map(x=>[x[0],x[0]]),['その他','その他']],state.net);
  layout('<div class="pagehead"><h1>研究ネットワーク</h1><p>研究デザイン、Outcome、メカニズムから横断的に論文を探せます。</p></div><div class="notice">分類は配信解説から機械的に抽出した<strong>探索用の候補</strong>であり、原著に基づく確認済みの分類ではありません。線は複数の分類タグを共有する候補関係を示し、引用・因果メカニズム・実証済みの関係を意味しません。ネットワーク図は一致した論文のうち新しい順に最大24件を表示します。</div><div class="toolbar">'+controls+'</div><p class="count">'+matches.length+'件が該当（図には'+subset.length+'件）</p><div class="card">'+(nodes.length?svg:'該当する論文がありません。')+'</div><h2>該当する論文</h2><div class="grid">'+matches.slice(0,100).map(p=>paperCard(p)).join('')+'</div>','network');
  app.querySelector('#netaxis').onchange=e=>{state.netAxis=e.target.value;state.netTag='all';network();};
  app.querySelector('#nettag').onchange=e=>{state.netTag=e.target.value;network();};
  app.querySelector('#netcat').onchange=e=>{state.net=e.target.value;network();};
}
function latest(){
  const sorted=papers.slice().filter(p=>p.source_date&&/^\d{4}-\d{2}-\d{2}$/.test(p.source_date)).sort((a,b)=>b.source_date.localeCompare(a.source_date)||a.paper_id.localeCompare(b.paper_id));
  const selection=sorted.slice(0,4);
  const newest=selection[0]?.source_date||'未登録';
  const tokyoToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const currentWeekStart=(date)=>{const d=new Date(date+'T12:00:00+09:00'),day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return d.toISOString().slice(0,10);};
  const isFresh=newest!=='未登録'&&currentWeekStart(newest)===currentWeekStart(tokyoToday);
  const subtitle=isFresh?'今週登録された論文から、直近の4本をご紹介します。':'直近登録の4本を表示しています。今週の新規登録分は、まだサイトに反映されていません。';
  layout(`<div class="pagehead"><h1>今週の4本</h1><p>因果推論とデータ×意思決定。RQを起点に、最新登録の研究を探索するための入口です。</p></div>
    <div class="notice"><strong>最終登録日：${safe(newest)}</strong> ／ ${safe(subtitle)}<br>表示基準：登録元の配信日が新しい順。各論文の正式な書誌情報・定量結果は未照合の場合があります。</div>
    <div class="grid">${selection.map((p,i)=>`<article class="card"><div class="meta">No. ${i+1} ・ 配信日 ${safe(p.source_date||'不明')} ・ ${safe(genre(p))}</div><h2 class="paper-title"><a href="${route('paper',p.paper_id)}">${dualTitle(p)}</a></h2><p><strong>Research Question</strong></p><p>${safe(p.rq_candidate||'RQは原文で確認してください。')}</p><div class="actions"><a class="btn" href="${route('paper',p.paper_id)}">6見出しの詳細解説を読む</a></div></article>`).join('')}</div>
    <div class="actions"><a class="btn" href="${route('library')}">全論文ライブラリへ</a><a class="btn" href="${route('archive')}">配信アーカイブへ</a></div>`,'latest');
}
function archive(){layout(`<div class="pagehead"><h1>配信アーカイブ</h1><p>過去配信の週から論文をたどれます。週内の配信回数と論文数は同一とは限りません。</p></div>${weeks.slice().reverse().map(w=>`<section class="archivegroup"><h2>${safe(w)} <span class="meta">${papers.filter(p=>(p.source_weeks||[]).includes(w)).length}件</span></h2><div class="grid">${papers.filter(p=>(p.source_weeks||[]).includes(w)).map(p=>paperCard(p)).join('')}</div></section>`).join('')}`,'archive')}
function typesetMath(){if(window.MathJax?.typesetPromise){window.MathJax.typesetPromise([app]).catch(e=>console.warn('MathJax:',e));}}
function render(){let parts=decodeURIComponent(location.hash.replace(/^#\/?/,'')).split('/');let page=parts[0]||'home';window.scrollTo(0,0);switch(page){case'home':home();break;case'library':library();break;case'paper':detail(parts[1]);break;case'compare':compare();break;case'rq':rq();break;case'network':network();break;case'archive':archive();break;case'latest':latest();break;default:home()}typesetMath()}window.addEventListener('hashchange',render);render();
})();