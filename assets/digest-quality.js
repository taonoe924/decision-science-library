/* Shared publication gate for scheduled four-paper batches.
 * Used by both the browser and Node CI. Structural evidence checks do NOT
 * independently establish that a scholarly claim is factually true.
 */
(function(root){
  'use strict';
  const headline = /^#{2,6}\s*\*?([1-6])[.．、]\s*/gm;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const requiredChecks = [
    'bibliography', 'rq_and_design', 'identification_and_limitations',
    'quantitative_claims', 'equations', 'markdown_and_links'
  ];
  const allowedCategory = ['causal','causal','decision','decision'];
  const text = v => typeof v === 'string' && v.trim().length > 0;
  const validHttps = v => {
    if(!text(v)) return false;
    try { const u = new URL(v); return u.protocol === 'https:' && Boolean(u.hostname); }
    catch { return false; }
  };
  function validatePaper(p,date,index){
    const issues=[];
    const fail = m => issues.push(m);
    if(!p || typeof p !== 'object') return ['paper record missing'];
    if(!/^digest-\d{8}-0[1-4]$/.test(p.paper_id||''))fail('invalid digest paper_id');
    if(p.paper_id!==('digest-'+date.replace(/-/g,'')+'-0'+(index+1)))fail('paper_id mismatches date/position');
    if(p.source_date!==date)fail('source_date mismatches batch date');
    if(p.digest_category!==allowedCategory[index])fail('category/order must be causal,causal,decision,decision');
    if(!text(p.title_candidate)||!text(p.title_ja))fail('original/translated title missing');
    if(!validHttps(p.source_url))fail('original source URL not verified');
    if(!text(p.rq_candidate)||!text(p.hypothesis_candidate))fail('RQ/proposition missing');
    if(!Array.isArray(p.method_keywords)||!p.method_keywords.length)fail('method keywords missing');
    if(!Array.isArray(p.source_weeks)||!p.source_weeks.length)fail('source week missing');
    if(!text(p.source_text)||p.source_text.length<700)fail('full paper write-up missing');
    const nums = text(p.source_text)?[...p.source_text.matchAll(headline)].map(m=>Number(m[1])):[];
    if(nums.length!==6||nums.some((n,i)=>n!==i+1))fail('exactly six numbered sections in order required');
    if(p.source_heading_count!==6)fail('source_heading_count must equal 6');
    if(p.publication_status!=='approved')fail('publication_status not approved');
    if(p.substantive_verification!=='partially_checked_against_primary_sources')fail('primary text/result cross-check missing');
    const o=p.original_review||{};
    if(!validHttps(o.source_url)||!text(o.locator)||!text(o.scope))fail('source review needs URL, section/table locator and scope');
    if(!datePattern.test(p.original_review_checked_on||''))fail('review date missing');
    const q=p.quality_review||{};
    if(q.schema_version!==1||q.approved!==true)fail('quality_review approval missing');
    if(!datePattern.test(q.reviewed_on||''))fail('quality_review date missing');
    for(const k of requiredChecks) if(q.checks?.[k]!==true)fail('incomplete quality check: '+k);
    if(!Array.isArray(q.evidence)||q.evidence.length<2)fail('at least two source-evidence records required');
    else {
      for(const [i,e] of q.evidence.entries()){
        if(!['bibliography','design','result','formula','limitation'].includes(e?.type))fail('invalid evidence type '+i);
        if(!validHttps(e?.source_url)||!text(e?.locator)||!text(e?.claim))fail('incomplete source evidence '+i);
      }
      for(const type of ['design','result'])if(!q.evidence.some(e=>e?.type===type))fail('missing '+type+' evidence');
    }
    return issues;
  }
  function validateBatch(batch,date){
    const problems=[];
    if(!datePattern.test(date||''))problems.push('invalid digest date');
    if(!Array.isArray(batch)||batch.length!==4){
      problems.push('each scheduled publication must contain exactly four papers');
      return {ok:false, problems};
    }
    const ids=new Set(), titles=new Set();
    for(let i=0;i<4;i++){
      const p=batch[i]||{};
      const label=p.paper_id||'paper '+(i+1);
      for(const e of validatePaper(p,date,i))problems.push(label+': '+e);
      if(ids.has(p.paper_id))problems.push(label+': duplicate ID');
      ids.add(p.paper_id);
      const key=String(p.title_candidate||'').toLowerCase().replace(/\s+/g,' ').trim();
      if(!key||titles.has(key))problems.push(label+': duplicate or empty title');
      titles.add(key);
    }
    return {ok:problems.length===0, problems};
  }
  root.DSLDigestQuality={validatePaper,validateBatch,requiredChecks};
})(typeof window!=='undefined'?window:globalThis);
