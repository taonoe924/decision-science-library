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
  // Source heading_count metadata can be stale: trust actual 1–6 headings.
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

/* Individual visual abstracts cross-checked against their public primary abstracts.
   These explain study logic, not the author's figure or fully validated estimates. */
const VERIFIED_ABSTRACTS={

  'paper-1dec3c647c':{
    type:'ユニット別トレンドを伴うDIDの推定量',
    steps:[['各地域の傾向を調整','固定効果と固有の時系列トレンド'],['一定の効果を仮定','処置後を1係数に集約する問題'],['動的効果を別々に推定','時間別効果を平均する代替案']],
    outcome:'一定効果係数は平均効果に偏り得る。動的効果の単純平均を提案',
    caveat:'Economics Letters原著公開要旨を照合。具体的な数値の推定結果ではありません。',
    source:'https://doi.org/10.1016/j.econlet.2026.113121'
  },
  'paper-235e73a026':{
    type:'閾値の差分を使った分位点因果効果',
    steps:[['閾値の制度が複数ある','前後期間で既存制度の段差も残る'],['分布への効果を識別','安定した分布効果の条件を設定'],['二重頑健に推定','分位点処置効果と推論']],
    outcome:'平均でなく分位点ごとの因果効果を推定できる条件を示す',
    caveat:'Econometrics Journal要旨を照合。分布効果の安定性が識別に必要です。',
    source:'https://doi.org/10.1093/ectj/utag028'
  },
  'paper-ec4e9eeabb':{
    type:'医師へのLLM支援を複数国で無作為比較',
    steps:[['複数国の医師を対象','国ごとに標準症例を提示'],['LLM利用群と対照群','診療判断へのアクセス差を比較'],['判断品質と格差を評価','国別の効果の違いも検討']],
    outcome:'LLM支援が医療判断と国間格差にどう作用するか検証',
    caveat:'npj Digital Medicine公表要旨で照合。実臨床のアウトカムと同一視できません。',
    source:'https://www.nature.com/articles/s41746-026-03111-5'
  },
  'paper-3213b8fc54':{
    type:'人間から最適な介入方針へ切り替える時点',
    steps:[['人間の判断を継続','観測できない専門的な情報も活用'],['切替時点を決定','どの状態からアルゴリズムを開始するか'],['逐次意思決定を最適化','純粋な人間・AI方針と比較']],
    outcome:'条件下で人間のみ・アルゴリズムのみを上回る開始方針を理論化',
    caveat:'arXiv原著要旨を照合。保証は論文で設定する識別条件に依存します。',
    source:'https://arxiv.org/abs/2609.29844'
  },
  'paper-87f8569164':{
    type:'生成AI利用中の成績と支援終了後の学習',
    steps:[['高校数学の学習を比較','通常学習・GPT Base・GPT Tutor'],['AI利用中の課題','課題遂行時の成績を測定'],['AIなしで試験','支援なしの定着度を評価']],
    outcome:'ガードレールのないAIは支援終了後の学習成果を損ない得る',
    caveat:'PNAS原著要旨で照合。対象は特定高校の数学授業です。',
    source:'https://doi.org/10.1073/pnas.2422633122'
  },
  'paper-8b8144db83':{
    type:'二重・脱バイアス機械学習（DML）',
    steps:[['高次元の交絡を調整','機械学習で補助関数を推定'],['Neyman直交スコア','補助推定の誤差の影響を抑える'],['Cross-fittingを実施','推定と推論を分離して実行']],
    outcome:'条件下で因果パラメータの漸近正規性・妥当な推論を実現',
    caveat:'Econometrics Journal掲載要旨を照合。直交性と収束条件が必要です。',
    source:'https://doi.org/10.1111/ectj.12097'
  },
  'paper-c638566481':{
    type:'ワクチン接種を促す19種類のSMSナッジ',
    steps:[['外来予定の患者を対象','約4.7万人を無作為割付'],['19種類の文面を比較','通常の案内と予約済み表現など'],['接種行動を測定','共通実験基盤で表現差を評価']],
    outcome:'予約済みと伝える接種案内・2回のリマインドが有効',
    caveat:'PNAS原著公開要旨を照合。インフルエンザ予防接種の場面に限定。',
    source:'https://doi.org/10.1073/pnas.2101165118'
  },
  'paper-63007291f5':{
    type:'人間の保釈判断と機械予測の政策価値',
    steps:[['裁判官の判断を観察','保釈・拘留によって結果の観測が変化'],['予測モデルを構築','出廷・再逮捕などのリスクを順位付け'],['判断ルールを比較','予測精度ではなく政策価値を評価']],
    outcome:'機械予測を判断に組み込む場合の潜在的な政策改善を分析',
    caveat:'Quarterly Journal of Economicsの公開要旨を照合。制度・評価仮定に依存します。',
    source:'https://doi.org/10.1093/qje/qjx032'
  },

  'paper-6575c5dfe1':{
    type:'推定リスクを考慮した施策選択',
    steps:[['施策の価値を推定','政策ごとの厚生と不確実性'],['価値と推定リスクを両立','効率的な意思決定の候補を比較'],['信頼水準で制約','一定の価値を下回る危険を管理']],
    outcome:'単純な推定値最大化ではなく、信頼性を伴う施策配分',
    caveat:'arXiv v3要旨を照合。保証には著者の仮定と指定水準があります。',
    source:'https://arxiv.org/abs/2502.10653'
  },
  'paper-f1ad1fb3a4':{
    type:'過去の実験結果を将来時点へ移送',
    steps:[['過去のA/Bテスト','ある時点の効果を推定'],['時点間の違いを扱う','反復試験法と共通群法を比較'],['将来の効果を評価','精度と時間に由来する偏り']],
    outcome:'共通群法は高精度でも時点の仮定次第で偏る',
    caveat:'arXiv v2要旨を照合。時間の経過だけで効果を移せるわけではありません。',
    source:'https://arxiv.org/abs/2603.07018'
  },
  'paper-83b0e41aa8':{
    type:'生存データの打切りと個別効果の推定',
    steps:[['イベント発生前に追跡終了','右打切りで時点が不明'],['生存木で繰返し補完','MISTRで結果の欠測を扱う'],['異質効果を学習','重い打切りやIV設定を比較']],
    outcome:'著者報告：重い打切り下で既存法より精度を改善',
    caveat:'arXiv v3要旨を照合。未観測交絡はIVなど追加条件の下で扱います。',
    source:'https://arxiv.org/abs/2502.01575'
  },
  'paper-f39eae36a4':{
    type:'導入時期が異なる政策と波及効果',
    steps:[['地域ごとに導入時期が異なる','未導入地域も影響を受ける'],['効果を3種類に分解','直接・波及・総合効果'],['曝露が同じ対象を比較','比較群の汚染を考慮して推定']],
    outcome:'保健センター導入で波及効果が死亡率への影響の相当部分を占める',
    caveat:'arXiv v1要旨を照合。曝露の定義と平行トレンド条件が必要です。',
    source:'https://arxiv.org/abs/2605.15119'
  },
  'paper-dac0ca69ca':{
    type:'未観測交絡に強い政策配分学習',
    steps:[['観察データの偏りを想定','未測定交絡が方針を歪める'],['感度モデルを設定','最悪ケースの厚生を評価'],['頑健な施策を選ぶ','二重頑健スコアを利用']],
    outcome:'交絡の許容範囲で損失が大きくならない方針を探索',
    caveat:'arXiv公開本文を照合。許容した交絡範囲外の安全性は保証しません。',
    source:'https://arxiv.org/abs/2507.20550'
  },
  'paper-e53343e16f':{
    type:'コホート別DID効果のベイズ部分統合',
    steps:[['導入群・時点ごとに効果を推定','一括統合か個別推定かが課題'],['似た効果だけを統合','Dirichlet過程混合事前分布'],['不確実性を評価','統合群と事後分布を推定']],
    outcome:'著者報告：条件付きシミュレーションで分散を26〜52％低減',
    caveat:'大学公開要旨を照合。真の効果差の分離可能性に依存します。',
    source:'https://www.ashoka.edu.in/research/a-bayesian-approach-to-partial-homogeneity-in-staggered-difference-in-difference/'
  },
  'paper-5b0863ec2d':{
    type:'場所に対する施策の因果効果を測定',
    steps:[['店舗・施設など場所が処置','周辺の対象への影響を考える'],['実際の場所と候補地を比較','反実仮想の地点を定義'],['空間相関を考慮して推定','周辺店舗の来客への影響を評価']],
    outcome:'食料品店の短距離での来客増。より遠距離では効果なし',
    caveat:'Econometrica公開要旨を照合。候補地点と処置確率の仮定に依存します。',
    source:'https://onlinelibrary.wiley.com/doi/full/10.3982/ECTA21571'
  },
  'paper-bb858e1205':{
    type:'分布やネットワークなどの結果へのDID',
    steps:[['Outcomeが単一数値でない','分布・ネットワークなどの対象'],['測地線で差を表す','一般の距離空間でDIDを定義'],['測地線ATTを推定','必要な空間構造と識別を考える']],
    outcome:'通常の引き算ができないOutcomeへDIDを拡張',
    caveat:'Biometrika公開要旨を照合。対象となる距離空間の条件が必要です。',
    source:'https://doi.org/10.1093/biomet/asag054'
  },

  'paper-fad50f3029':{
    type:'専門家の意思決定時間を情報として利用',
    steps:[['選択肢の難しさを考える','判断に時間がかかる理由を整理'],['追加情報の取得をモデル化','待ち時間と選択確率を結ぶ'],['現場データで検討','編集者・融資担当者などを比較']],
    outcome:'判断時間が長いことは判断品質の高さを一意に意味しない',
    caveat:'NBER公開要旨で確認。意思決定時間だけから質を断定できません。',
    source:'https://www.nber.org/papers/w32515'
  },
  'paper-bda44147e2':{
    type:'睡眠時間の増加と労働・認知機能',
    steps:[['チェンナイの低所得労働者','睡眠環境と活動量計で計測'],['夜間睡眠と職場昼寝','無作為化介入で比較'],['仕事や認知を測定','生産性・幸福感・判断を評価']],
    outcome:'夜間睡眠＋27分は主要成果の改善なし。昼寝の総合指標は＋0.12SD',
    caveat:'NBER要旨を照合。測定対象・環境に固有の結果です。',
    source:'https://www.nber.org/papers/w26746'
  },
  'paper-bd820a3c55':{
    type:'クッキー同意のUIと消費者厚生',
    steps:[['同意バナーを無作為変更','表示・デフォルト・同意先を変える'],['選択行動を測る','同意率・操作負担・理解度'],['消費者厚生を推定','サイト単位とブラウザ単位を比較']],
    outcome:'操作導線で選択は変化。繰返しの同意負担を減らすことが重要',
    caveat:'NBER要旨を照合。同意率上昇と厚生改善は同義ではありません。',
    source:'https://www.nber.org/papers/w34025'
  },
  'paper-81e90efb7e':{
    type:'将来支出の想起と貯蓄行動',
    steps:[['予定支出を思い出せない','季節的な所得・支出の変動'],['支出項目を想起させる','新しい情報は与えない実験'],['家計行動を追跡','貯蓄・支出・次期農業収入']],
    outcome:'6週間後の貯蓄＋15％、翌年の農作物収入＋9％（著者報告）',
    caveat:'NBER要旨を照合。数値は対象農家と研究設定に基づきます。',
    source:'https://www.nber.org/papers/w35430'
  },
  'paper-def930c5de':{
    type:'有効政策が実行されない理由を検証',
    steps:[['既に有効性がある政策','学校長の実施行動を観測'],['複数の介入を比較','証拠・少額報酬・支援・リマインド'],['実装率で検証','実施への注意配分を評価']],
    outcome:'追加リマインドで実施率＋20％pt。証拠提示等は明確な効果なし',
    caveat:'NBER要旨を照合。政策実装の制度的条件には依存します。',
    source:'https://www.nber.org/papers/w35291'
  },
  'paper-aec80c656f':{
    type:'人の判断を改善可能と言うための検証',
    steps:[['選択の誤りを疑う','本人の選好と間違いを区別'],['3つの診断法を比較','誤認・確信度・行動パターン'],['リスク選択で実験','各手法の判定を照合']],
    outcome:'診断法によって改善すべき判断の判定が異なる',
    caveat:'NBER要旨を照合。観察された選択を誤りと決めつけないでください。',
    source:'https://www.nber.org/papers/w34979'
  },
  'paper-cf94b5d051':{
    type:'所得への期待と進路選択の関係',
    steps:[['所得と幸福の関係を予想','将来の満足度を過大評価する可能性'],['科学的情報を無作為提示','所得の限界満足度を伝える'],['判断を再評価','職業選択・所得との交換関係']],
    outcome:'所得の幸福への寄与を学ぶと、所得重視の判断が弱まる',
    caveat:'NBER要旨で確認。すべての所得水準へ一律の結論ではありません。',
    source:'https://www.nber.org/papers/w35423'
  },
  'paper-9be0b9fd8f':{
    type:'DIDの効果を直接・間接経路に分解',
    steps:[['施策全体の効果','施策→Outcomeだけでなく媒介を検討'],['媒介変数の経路を識別','条件付き平行トレンド等を仮定'],['DMLを用いて推定','直接効果と間接効果を分離']],
    outcome:'医療保険の健康への直接効果と健診経由の経路を例示',
    caveat:'arXiv要旨で確認。媒介分解には追加の識別仮定が必要です。',
    source:'https://arxiv.org/abs/2602.23877'
  },

  'paper-44a219aa63':{
    type:'処置前トレンドを基準にしたDID推論',
    steps:[['処置前の変動を観測','複数期間のDIDの変動を確認'],['参照分布を構成','処置前の変化と処置後を比較'],['候補効果を検定','平行トレンド以外の制約で推論']],
    outcome:'処置前の推移を用いて処置後効果を評価する方法',
    caveat:'arXiv公開要旨を照合。平行トレンドに代わる識別条件が必要です。',
    source:'https://arxiv.org/abs/2607.21312'
  },
  'paper-48724c28e5':{
    type:'波及効果がある実験の割付最適化',
    steps:[['干渉する対象を考慮','他者や地域への波及を定義'],['割付と推定を同時設計','最悪ケース分散を小さくする'],['疑似実験で比較','推定精度と標準誤差を確認']],
    outcome:'著者報告：実効標本数が50〜100％以上増加する例',
    caveat:'NBER要旨に基づく疑似実験結果。全ネットワークで同様の改善を保証しません。',
    source:'https://www.nber.org/papers/w35570'
  },
  'paper-07919c7d40':{
    type:'回帰不連続デザインの推定精度を改善',
    steps:[['閾値近傍で効果を推定','通常の局所多項式法と比較'],['部分線形モデルを提案','滑らかな部分とジャンプを区別'],['12研究に似せたシミュレーション','信頼区間の幅と妥当性を評価']],
    outcome:'著者報告：推定誤差を抑え、短く妥当な信頼区間を構成',
    caveat:'NBER要旨を照合。全データ状況での優越性は保証しません。',
    source:'https://www.nber.org/papers/w35699'
  },
  'paper-5445c52194':{
    type:'DIDにおける未観測交絡の感度分析',
    steps:[['平行トレンドの逸脱','未観測要因による偏りを想定'],['偏りを指標化','交絡の強さとATTの関係を整理'],['結論の頑健性を検討','結論を覆す交絡の強さを報告']],
    outcome:'平行トレンドを二択で扱わず、結果の脆弱さを定量化',
    caveat:'arXiv公開要旨を照合。感度分析で交絡が自動的に解消するわけではありません。',
    source:'https://arxiv.org/abs/2609.19386'
  },
  'paper-1d8263bd82':{
    type:'生存時間の異質効果と未観測交絡',
    steps:[['打切りのある生存データ','患者により追跡期間が異なる'],['負の対照を利用','未観測交絡の代理変数を扱う'],['Causal Survival Forest','個人差のある効果を学習']],
    outcome:'著者報告：シミュレーションで偏りと推定誤差を低減',
    caveat:'arXiv要旨を照合。負の対照の妥当性など条件が必要です。',
    source:'https://arxiv.org/abs/2608.19749'
  },
  'paper-e539e49ca6':{
    type:'生成AIが成果と専門能力に与える影響',
    steps:[['特許弁護士133人','3か月のランダム化試験'],['AI支援中の仕事を評価','専門家が品質をブラインド採点'],['AIなしで再評価','支援終了後の判断能力を測定']],
    outcome:'仕事の品質は改善。支援終了後の平均改善は経験豊富な弁護士に集中',
    caveat:'NBER要旨を照合。ジュニアの平均的な能力改善は認められていません。',
    source:'https://www.nber.org/papers/w35720'
  },
  'paper-21bfea85b2':{
    type:'三重差分（DDD）と処置効果の異質性',
    steps:[['サブグループ間を比較','通常のDDDの解釈を確認'],['効果の異質性を考慮','単純なDDD係数との違い'],['新たな推定対象を定義','頑健な推定量と識別条件を提案']],
    outcome:'DDD係数が必ずしもグループ間の因果効果差にはならない',
    caveat:'arXiv要旨を照合。理論的な推定対象の違いを示す概念図です。',
    source:'https://arxiv.org/abs/2502.19620'
  },
  'paper-399d8b695e':{
    type:'健康診断での習慣形成を検証する実験',
    steps:[['大学職員4,799人','3年間の健診・無作為化インセンティブ'],['初回と2回目を区別','受診歴による後続行動の差を分析'],['習慣の形成機構を比較','初回閾値説と繰返し強化説']],
    outcome:'初回受診後の次回受診率は32.4〜36.1％pt増。2回目の追加効果は検出されず',
    caveat:'NBER要旨を照合。数値は論文内の推定に依存します。',
    source:'https://www.nber.org/papers/w32745'
  },

  'paper-c79dc0a5e2':{
    type:'個人への害を抑える政策学習（方法論）',
    steps:[['平均の改善だけでは不足','施策によって悪化する人がいる'],['害を受ける確率を制御','Conformal Policy Learningを設計'],['制約下で施策を配分','改善と安全性の両立を評価']],
    outcome:'分布に依存しない条件付きの安全性保証を提案',
    caveat:'arXiv原著本文で研究目的を確認。保証には研究内の条件があります。',
    source:'https://arxiv.org/abs/2609.17296'
  },
  'paper-730aa60651':{
    type:'人間とAIの役割分担（理論・設計）',
    steps:[['分類の意思決定','人間もAIも異なる得意・不得意'],['役割分担を設計','自動化または人間への選択的支援'],['十分統計量で評価','協働方針の反実仮想を比較']],
    outcome:'自動化と選択的なAI支援を共通の枠組みで検討',
    caveat:'NBER公開要旨との照合。人間とAIのどちらかが常に優秀という結果ではありません。',
    source:'https://www.nber.org/papers/w33949'
  },
  'paper-99c4958bc6':{
    type:'不完全な医療エビデンスと治療方針（意思決定）',
    steps:[['治療の利益と害','利益より害の推定が不確か'],['治療ルールを比較','既存ガイドラインと代替案'],['曖昧さを考慮した判断','Maximin・Minimax Regret']],
    outcome:'有害事象の仮定によって推奨方針・評価が変わる',
    caveat:'NBER要旨を照合。患者集団や害の仮定を無視して一般化できません。',
    source:'https://www.nber.org/papers/w35798'
  },
  'paper-6582247bcc':{
    type:'認知負荷下の医師の診断行動（実証研究）',
    steps:[['診療時の認知負荷','同時進行の判断で処理負担が増える'],['行動の切り替え','熟考に代わり検査等の行動が増える'],['診断行動の質を検討','医師の行動ログと患者データ']],
    outcome:'認知負荷のもとで診断行動の数と精度が変化',
    caveat:'NBER研究紹介を照合。実証研究でありRCTと断定しません。',
    source:'https://www.nber.org/papers/w35034'
  },

  'paper-b7ba3b5524':{
    type:'政策ルール変更の動学的因果効果（方法論）',
    steps:[['政策の見方が2種類','政策ショックと政策ルールの変更'],['同じ効果かを検討','局所射影法の推定対象を整理'],['動学的効果を比較','一時的変化と持続的な政策変更']],
    outcome:'政策の何を変えるかによって推定対象が異なる',
    caveat:'NBER公開要旨との照合。具体的な政策効果量は提示していません。',
    source:'https://www.nber.org/papers/w35615'
  },
  'paper-061d1b0eff':{
    type:'生成AIの因果推論ワークフロー評価（ベンチマーク）',
    steps:[['AIが分析案とコードを作る','手法名だけでなく推定値も確認'],['同じ合成データで実行','正解となる推定量と照合'],['実行と正答を区別','コードが動いても誤答はあり得る']],
    outcome:'実行できた426件のうち66件は誤った推定値（著者報告）',
    caveat:'arXiv要旨との照合。対象モデル・設定に限定された結果です。',
    source:'https://arxiv.org/abs/2609.07944'
  },
  'paper-9f6d9ca5d6':{
    type:'短期の政策効果と合成コントロール（方法論）',
    steps:[['早期に政策効果を知りたい','処置対象が1単位のパネルデータ'],['時変の交絡構造を考慮','非パラメトリックな反実仮想モデル'],['局所的効果を推定','投影を用いた推定と統計的推論']],
    outcome:'短い期間での政策効果を評価する推定対象を提案',
    caveat:'arXiv要旨との照合。標準的な長期ATEと同一視しないでください。',
    source:'https://arxiv.org/abs/2609.10617'
  },
  'paper-fb57ffda6e':{
    type:'推定対象に応じた共変量調整（理論）',
    steps:[['何の平均効果を求める？','全体ATE・処置群ATTなど'],['調整変数の効率性を評価','因果グラフだけでは不十分な場合'],['推定対象ごとに比較','精度と推定対象のずれを検討']],
    outcome:'ATEに最適な調整変数が他の効果にも最適とは限らない',
    caveat:'arXiv要旨との照合。識別可能性と効率性を分けて考える必要があります。',
    source:'https://arxiv.org/abs/2609.11222'
  },

  'paper-62ca0acf9a':{
    type:'死亡により測定が途切れるOutcomeの因果推論',
    steps:[['追跡中に死亡が発生','生存者にだけOutcomeが定義される'],['何を推定するか定義','全対象集団で解釈可能な推定対象'],['識別・推定を検討','前立腺がん試験の再分析で比較']],
    outcome:'どの推定対象を選ぶかで治療の結論が変わり得る',
    caveat:'arXiv要旨との照合。全対象集団の効果と生存者限定効果を混同しないでください。',
    source:'https://arxiv.org/abs/2607.00222'
  },
  'paper-8db14dc31c':{
    type:'反事実分布のベイズ型推定（方法論）',
    steps:[['平均効果だけでは不足','効果の分布や分位点も知りたい'],['マルチンゲール事後分布','柔軟な反事実分布を推定'],['不確実性も合わせて評価','分位点などの推定に接続']],
    outcome:'平均値に隠れる分布差と推定の不確実性を評価',
    caveat:'arXiv要旨との照合。DMLを使う研究と断定しないでください。',
    source:'https://arxiv.org/abs/2607.24143'
  },
  'paper-260bb098e8':{
    type:'因果効果の他集団への移送可能性（理論）',
    steps:[['元集団の研究結果','別環境にも適用できるか検討'],['因果モデルを対応づける','介入時の振る舞いの差を表現'],['近似的な移送を評価','移送できない場合も範囲を提示']],
    outcome:'厳密な移送だけでなく、近似誤差を伴う推定範囲を検討',
    caveat:'arXiv要旨との照合。一般の実データに無条件に移送できる意味ではありません。',
    source:'https://arxiv.org/abs/2608.15645'
  },
  'paper-4ba1548978':{
    type:'処置後に変わる共変量とDID（方法論＋応用）',
    steps:[['処置後の共変量が問題','通常の調整ではバイアスの懸念'],['識別条件を整理','処置前値の調整や補完的手法'],['推定量を提案・適用','DMLも含め雇用喪失の事例を分析']],
    outcome:'共変量を単に除外する以外の識別・推定方法を検討',
    caveat:'arXiv要旨との照合。どの共変量でも調整可能という主張ではありません。',
    source:'https://arxiv.org/abs/2608.03881'
  },
  'paper-382caf1ae2':{
    type:'制度の閾値と企業行動（方法論＋実証）',
    steps:[['制度上の段差','企業規模を超えると給与税が変わる'],['行動・比較集団の変化','企業が閾値を避け、規模分布も変化'],['反実仮想分布を推定','従来のDIDとの推定結果を比較']],
    outcome:'著者報告：閾値超の企業数 約18％減、雇用・資本・付加価値 約10％減',
    caveat:'NBER公開要旨で概数を照合。標準誤差・95％信頼区間は図には表示しません。',
    source:'https://www.nber.org/papers/w35484'
  },
  'paper-8fba52c564':{
    type:'州・政策別の差の差分析（方法論）',
    steps:[['政策導入の違い','州・政策種類・導入時点が異なる'],['推定対象を分ける','全体／州別／政策種類別のATT'],['識別と推論を検討','集約の粒度ごとに仮定を確認']],
    outcome:'意思決定者の問いに合う集計単位で政策効果を評価',
    caveat:'原著要旨との方法論上の整合を確認。個別の政策効果量を示す図ではありません。',
    source:'https://arxiv.org/abs/2609.01467'
  },
  'paper-8da38f287b':{
    type:'ネットワーク干渉下の政策評価（方法論）',
    steps:[['ネットワークで干渉','他者への介入も本人の結果に影響'],['政策変更を想定','実験時とは異なる割当方針を評価'],['構造仮定＋重み付け','Fourier部分空間を使い推定']],
    outcome:'政策の移送に伴う推定の分散とバイアスを検討',
    caveat:'arXiv要旨との方法論上の整合を確認。因果効果の数値は断定しません。',
    source:'https://arxiv.org/abs/2609.02756'
  },
  'paper-b28db29cef':{
    type:'因果推論の基盤モデル（概説）',
    steps:[['事前学習モデル','因果効果の推定方法を事前に学習'],['新たなデータを入力','共変量・処置・Outcomeを文脈として与える'],['効果を推定','モデル更新なしでATE・CATEを推定']],
    outcome:'案件ごとの再学習を減らす可能性と識別仮定の課題を整理',
    caveat:'arXiv要旨に基づく概念図。単一RCTの実証結果ではありません。',
    source:'https://arxiv.org/abs/2609.03003'
  }
};
function verifiedOverviewFigure(p){
  const v=VERIFIED_ABSTRACTS[p.paper_id];if(!v)return '';
  const tidy=x=>String(x||'').replace(/\s+/g,' ').trim();
  const wrap=(value,max=22,count=3)=>{
    const cs=[...tidy(value)],out=[];
    for(let i=0;i<cs.length&&out.length<count;i+=max)out.push(cs.slice(i,i+max).join(''));
    if(cs.length>max*count)out[count-1]=out[count-1].slice(0,Math.max(0,max-4))+'…';
    return out.length?out:['未確認'];
  };
  const rows=(value,x,y,max=22,count=3,font=16)=>{
    return wrap(value,max,count).map((line,i)=>'<text x="'+x+'" y="'+(y+i*26)+'" font-size="'+font+'" fill="#263f55">'+safe(line)+'</text>').join('');
  };
  const boxes=v.steps.map(([title,body],i)=>{
    const x=26+394*i;
    return '<rect x="'+x+'" y="127" width="362" height="168" rx="12" fill="#fff" stroke="#d0dfe9"/>'+
      wrap(String(i+1)+'．'+title,16,2).map((t,j)=>'<text x="'+(x+16)+'" y="'+(156+j*23)+'" font-size="18" font-weight="700" fill="#194666">'+safe(t)+'</text>').join('')+
      rows(body,x+16,221,19,3,16)+
      (i<2?'<path d="M'+(x+365)+' 208 h21 m-7 -6 l7 6 -7 6" fill="none" stroke="#5587a5" stroke-width="2"/>':'');
  }).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 465" width="1200" height="465" role="img">'+
    '<rect width="1200" height="465" rx="14" fill="#f2f7fa"/>'+
    '<text x="26" y="42" font-size="25" font-weight="700" fill="#163c58">この論文の全体像</text>'+
    '<text x="26" y="80" font-size="17" fill="#496c83">'+safe(v.type)+'</text>'+
    boxes+'<text x="26" y="335" font-size="19" font-weight="700" fill="#194666">何が分かる？</text>'+
    rows(v.outcome,26,367,54,2,17)+
    '<text x="26" y="431" font-size="14" fill="#566e82">'+safe(v.caveat)+'</text>'+
    '<text x="26" y="451" font-size="13" fill="#566e82">注：研究内容を説明するための再構成図であり、原著図の転載ではありません。</text></svg>';
  return '<figure class="paper-overview"><img src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'" alt="'+safe('原著要旨を照合した論文概要図：'+v.type)+'" loading="lazy" decoding="async">'+
    '<figcaption>研究の流れ（原著公開要旨に基づく再構成・<a href="'+safe(v.source)+'" target="_blank" rel="noopener noreferrer">照合先</a>）。本文中の結果や識別仮定の全項目を検証したものではありません。</figcaption></figure>';
}

function overviewFigure(p){
  if(VERIFIED_ABSTRACTS[p.paper_id])return verifiedOverviewFigure(p);
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
  const methodsDisplay=(p.method_keywords||[]).slice(0,3).join('・')||'分析手法は原著で確認';
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
    graphic+=box(28,164,343,109,'研究課題',p.rq_candidate||'何を明らかにするか')+box(428,164,341,109,'比較・分析',methodsDisplay)+box(827,164,343,109,'評価する結果',out);
    graphic+=arrow(371,218,420,218)+arrow(769,218,819,218);
  }
  const rq=p.rq_candidate||'研究課題は本文で確認してください';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 566" width="1200" height="566" role="img">'+
    '<rect width="1200" height="477" rx="14" fill="#f3f7fa"/>'+
    '<text x="28" y="40" font-size="24" fill="#173d59" font-weight="700">この論文の全体像</text>'+
    '<text x="28" y="71" font-size="16" fill="#50728b">研究デザイン：'+esc(typeName)+'（配信データからの暫定判定）</text>'+
    textRows('問い：'+rq,28,99,62,1,16,'#37556b')+graphic+
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