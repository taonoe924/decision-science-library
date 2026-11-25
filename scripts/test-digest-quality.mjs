#!/usr/bin/env node
import '../assets/digest-quality.js';
import assert from 'node:assert/strict';

const gate=globalThis.DSLDigestQuality;
assert.ok(gate?.validateBatch,'shared digest gate must load');
const day='2026-11-27';
function record(index){
  return {
    paper_id:'digest-20261127-0'+(index+1),
    digest_category:index<2?'causal':'decision',
    source_date:day,
    source_weeks:['W48'],
    title_candidate:'Sample Original Title '+index,
    title_ja:'仮の日本語題 '+index,
    source_url:'https://example.edu/papers/'+index,
    rq_candidate:'検証する研究課題 '+index,
    hypothesis_candidate:'著者の仮説ではなく解説者の中心命題 '+index,
    method_keywords:['RCT'],
    source_heading_count:6,
    source_text:'研究設計の説明。'.repeat(60)+'\n'+Array.from({length:6},(_,i)=>'##### '+(i+1)+'．見出し\n詳細な説明を記載する。').join('\n\n'),
    publication_status:'approved',
    substantive_verification:'partially_checked_against_primary_sources',
    original_review:{
      source_url:'https://example.edu/papers/'+index,
      locator:'Abstract and Table 1',
      scope:'Research design and quantitative outcome cross-checked'
    },
    original_review_checked_on:day,
    quality_review:{
      schema_version:1,
      approved:true,
      reviewed_on:day,
      checks:Object.fromEntries(gate.requiredChecks.map(x=>[x,true])),
      evidence:[
        {type:'design',source_url:'https://example.edu/papers/'+index,locator:'Methods',claim:'Sample design is explicitly described'},
        {type:'result',source_url:'https://example.edu/papers/'+index,locator:'Results Table 1',claim:'Sample result and its uncertainty were checked'}
      ]
    }
  };
}
const good=Array.from({length:4},(_,i)=>record(i));
assert.equal(gate.validateBatch(good,day).ok,true,'fully annotated batch should pass');
const change=(fn)=>{const copy=structuredClone(good);fn(copy);return gate.validateBatch(copy,day)};
assert.equal(change(x=>x[0].publication_status='draft').ok,false,'draft must not publish');
assert.equal(change(x=>x[0].original_review.locator='').ok,false,'no source locator must not publish');
assert.equal(change(x=>x[2].quality_review.checks.quantitative_claims=false).ok,false,'unchecked numeric results must not publish');
assert.equal(change(x=>x[3].quality_review.evidence=[]).ok,false,'missing evidence must not publish');
assert.equal(change(x=>x[0].source_heading_count=5).ok,false,'incomplete sections must not publish');
assert.equal(change(x=>x[1].digest_category='decision').ok,false,'wrong category must not publish');
assert.equal(change(x=>x[0].substantive_verification='not_checked_against_original').ok,false,'unverified source must not publish');
assert.equal(gate.validateBatch(good.slice(0,3),day).ok,false,'incomplete four-paper batch must not publish');
console.log('PASS: 9 shared digest quality-gate test cases');
