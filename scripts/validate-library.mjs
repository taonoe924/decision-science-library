// Automated static data-quality checks for Decision Science Library.
// Passing this gate does not prove substantive claims or browser rendering are correct.
import fs from 'node:fs';
import vm from 'node:vm';

const errors=[];
const fail=(name,message)=>errors.push(name+': '+message);
const src=fs.readFileSync(new URL('../assets/papers.js',import.meta.url),'utf8');
const context={window:{}};
vm.runInNewContext(src,context,{filename:'assets/papers.js',timeout:10000});
const papers=context.window.PAPERS;
if(!Array.isArray(papers))throw new Error('window.PAPERS must be an array');
const idSeen=new Set(), titleSeen=new Set();
const https=x=>{try{return new URL(x).protocol==='https:';}catch{return false;}};
const validDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'');
const sectionRx=/^#{2,6}\s*(?:\*\*)?([1-6])[.．、](?!\d)\s*([^\n*]+)(?:\*\*)?\s*$/gm;
for(const [i,p] of papers.entries()){
  const name=(i+1)+'. '+String(p?.title_candidate||'[untitled]');
  if(!p?.paper_id||idSeen.has(p.paper_id))fail(name,'missing or duplicate paper ID');
  idSeen.add(p?.paper_id);
  const key=String(p?.title_candidate||'').toLowerCase().replace(/\s+/g,' ').trim();
  if(!key||titleSeen.has(key))fail(name,'missing or duplicated title');
  titleSeen.add(key);
  if(!https(p?.source_url))fail(name,'invalid source_url');
  if(!validDate(p?.source_date))fail(name,'invalid source_date');
  if(!String(p?.rq_candidate||'').trim())fail(name,'RQ is missing');
  const sections=[...String(p?.source_text||'').matchAll(sectionRx)].map(m=>Number(m[1]));
  if(sections.join(',')!=='1,2,3,4,5,6')fail(name,'expected exactly six numbered sections: '+sections.join(','));
  const r=p?.detailed_review;
  if(!r)fail(name,'detailed_review missing');
  else{
    if(!https(r.source_url)||!String(r.locator||'').trim())fail(name,'source audit link/locator missing');
    if(!String(r.scope||'').trim())fail(name,'source audit scope missing');
    if(!validDate(r.checked_on))fail(name,'source audit checked_on missing/invalid');
  }
  const e=p?.quantitative_evidence;
  if(e){
    if(!https(e.source_url)||!validDate(e.checked_on)||!String(e.status||'').trim())
      fail(name,'quantitative evidence provenance incomplete');
    if(!Array.isArray(e.records)||e.records.length===0)fail(name,'empty quantitative evidence records');
    else for(const [j,row] of e.records.entries()){
      for(const field of ['table','estimand','estimate','se','ci95','unit','caveat'])
        if(!String(row?.[field]??'').trim())fail(name,'quant row '+(j+1)+' missing '+field);
      const ci=String(row?.ci95||'').match(/^\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\]$/);
      if(ci && Number(ci[1])>Number(ci[2]))fail(name,'CI bounds reversed at row '+(j+1));
    }
  }
}
if(papers.length<83)fail('catalog','expected at least 83 existing historical records');
console.log('Quality gate: '+papers.length+' papers; '+papers.filter(p=>p.quantitative_evidence).length+
  ' quantitative evidence panels; '+papers.reduce((n,p)=>n+(p.quantitative_evidence?.records?.length||0),0)+' evidence rows');
if(errors.length){for(const e of errors)console.error('FAIL '+e);process.exitCode=1;}
else console.log('PASS: six sections, source provenance, IDs, dates, quantitative schema and CI ordering');
