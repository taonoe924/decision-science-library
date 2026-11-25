#!/usr/bin/env node
// Decision Science Library: non-network structural quality gate.
// This does not claim that any paper has been checked against its original publication.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [], warnings = [];
const error = (id, msg) => errors.push(id + ': ' + msg);
const warn = (id, msg) => warnings.push(id + ': ' + msg);
const text = readFileSync(join(root, 'assets', 'papers.js'), 'utf8').trim();
const match = text.match(/^window\.PAPERS\s*=\s*([\s\S]*);\s*$/);
if (!match) throw new Error('assets/papers.js must assign a JSON array to window.PAPERS');
const papers = JSON.parse(match[1]);
if (!Array.isArray(papers) || papers.length === 0) throw new Error('PAPERS must be a non-empty array');

const allowedStatus = new Set([
  'not_checked_against_original',
  'partial_abstract_or_primary_source_checked',
  'partially_checked_against_primary_sources'
]);
const ids = new Set(), titles = new Map(), allUrls = new Set();
let tableCount=0, shortReports=0, emptyTables=0, reviewed=0;
const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(x=>x.trim());
const divider = line => {
  const cs = cells(line);
  return cs.length>=2 && cs.every(x=>/^:?-{3,}:?$/.test(x.replace(/\s/g, '')));
};
for (const [i,p] of papers.entries()) {
  const id = p.paper_id || 'record['+i+']';
  if (!/^paper-[a-z0-9]+$/i.test(id)) error(id,'invalid paper_id');
  if (ids.has(id)) error(id,'duplicate paper_id');
  ids.add(id);
  if (!p.title_candidate || typeof p.title_candidate!=='string') error(id,'title is missing');
  else {
    const key=p.title_candidate.toLowerCase().replace(/[^a-z0-9]/g,'');
    if (titles.has(key)) warn(id,'possible duplicate title of '+titles.get(key));
    titles.set(key,id);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.source_date||'')) error(id,'source_date must be ISO YYYY-MM-DD');
  if (!Array.isArray(p.source_weeks)) error(id,'source_weeks must be an array');
  try {
    const url=new URL(p.source_url);
    if (url.protocol!=='https:') error(id,'source_url must use https');
    if ([...url.searchParams.keys()].some(k=>k.startsWith('utm_'))) warn(id,'source_url has tracking parameters');
    allUrls.add(url.href);
  } catch { error(id,'invalid source_url'); }
  if (p.doi_candidate && !/^10\.\d{4,9}\/\S+$/.test(p.doi_candidate)) warn(id,'nonstandard DOI candidate format');
  if (typeof p.source_text!=='string'||p.source_text.length<100) error(id,'source_text missing or too short');
  else {
    const lines=p.source_text.split(/\r?\n/);
    const nums=[...p.source_text.matchAll(/^#{2,6}\s*\*?([1-6])[.．、]\s*/gm)].map(m=>Number(m[1]));
    if (new Set(nums).size<6) { shortReports++;warn(id,'short-form / fewer than six recognized section headings'); }
    for(let j=0;j<lines.length-1;j++){
      if(!lines[j].includes('|')||!divider(lines[j+1]))continue;
      const width=cells(lines[j]).length;
      if(width!==cells(lines[j+1]).length)error(id,'table header / separator width mismatch at line '+(j+1));
      tableCount++;
      let rows=0;let k=j+2;
      while(k<lines.length&&lines[k].trim()&&lines[k].includes('|')){
        rows++;
        if(cells(lines[k]).length!==width)error(id,'table width mismatch at line '+(k+1));
        k++;
      }
      if(rows===0){emptyTables++;warn(id,'table without body rows at line '+(j+1));}
      j=k-1;
    }
    const open=(p.source_text.match(/\\\[/g)||[]).length;
    const close=(p.source_text.match(/\\\]/g)||[]).length;
    if(open!==close)warn(id,'possible block LaTeX delimiter mismatch');
    if(p.source_text.includes('\uFFFD'))warn(id,'replacement character in text');
  }
  if (!allowedStatus.has(p.substantive_verification)) error(id,'unknown verification status');
  if (p.substantive_verification!=='not_checked_against_original') {
    reviewed++;
    if (!p.original_review && !p.taxonomy_audit)warn(id,'verification flag without inspectable source review');
  }
}
const digestIndex=JSON.parse(readFileSync(join(root,'data','digests','index.json'),'utf8'));
if(!Array.isArray(digestIndex.dates))error('digest-index','dates must be array');
else for(const date of digestIndex.dates){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){error('digest-index','invalid date '+date);continue;}
  const batch=JSON.parse(readFileSync(join(root,'data','digests',date+'.json'),'utf8'));
  if(!Array.isArray(batch))error(date,'digest must contain an array');
  else for(const item of batch){
    if(!item.paper_id||!item.title_candidate||!item.source_date)error(date,'digest record missing required fields');
    if(ids.has(item.paper_id))warn(date,'digest duplicates base paper '+item.paper_id);
  }
}
console.log('Decision Science Library quality gate');
console.log(JSON.stringify({papers:papers.length,reviewed,unreviewed:papers.length-reviewed,tables:tableCount,emptyTables,shortReports,uniqueUrls:allUrls.size,errors:errors.length,warnings:warnings.length},null,2));
for(const msg of warnings)console.warn('WARNING '+msg);
for(const msg of errors)console.error('ERROR '+msg);
if(errors.length)process.exitCode=1;
