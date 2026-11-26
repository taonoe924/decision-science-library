// Browser smoke checks for Decision Science Library, using local repository assets.
// Headless Chromium checks layout and interaction; scholarly accuracy needs separate audit.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const base='http://127.0.0.1:8765/';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForServer(){
  for(let i=0;i<45;i++){
    if(server.exitCode!==null)throw new Error('Local HTTP server terminated');
    try{const response=await fetch(base);if(response.ok)return;}catch{}
    await pause(200);
  }
  throw new Error('Local HTTP server did not start');
}
let browser;
try{
  await waitForServer();
  await mkdir('test-artifacts',{recursive:true});
  browser=await chromium.launch({headless:true});
  const cases=[
    {name:'desktop',viewport:{width:1280,height:800},isMobile:false},
    {name:'mobile',viewport:{width:390,height:844},isMobile:true}
  ];
  for(const item of cases){
    const page=await browser.newPage({viewport:item.viewport,isMobile:item.isMobile});
    // Rendering of Markdown and structured tables does not require a CDN request.
    await page.route('https://cdn.jsdelivr.net/**',route=>route.abort());
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'#/paper/paper-62ca0acf9a',{waitUntil:'domcontentloaded'});
    await page.locator('details.audit-evidence summary').waitFor({timeout:15000});
    const title=await page.locator('h1').first().innerText();
    assert.ok(title.length>0,'paper title missing on '+item.name);
    assert.equal(await page.locator('.split .section h2').count(),6,'six section headings missing on '+item.name);
    await page.locator('details.audit-evidence summary').click();
    const rows=await page.locator('.audit-evidence tbody tr').count();
    assert.ok(rows>=16,'SWOG verified table should contain 16+ numeric rows on '+item.name);
    const cols=await page.locator('.audit-evidence thead th').count();
    assert.equal(cols,7,'evidence table must display 7 columns');
    const markdownTables=await page.locator('.prose .md-table').count();
    assert.ok(markdownTables>=2,'original Markdown results tables must render as HTML tables on '+item.name);
    assert.ok(await page.locator('.prose .md-table tbody tr').count()>=8,
      'original Markdown results table rows missing on '+item.name);
    const overflow=await page.evaluate(()=>({
      screenWidth:document.documentElement.clientWidth,
      bodyWidth:document.documentElement.scrollWidth,
      tableWidth:document.querySelector('.audit-evidence .table-scroll')?.scrollWidth||0,
      tableVisibleWidth:document.querySelector('.audit-evidence .table-scroll')?.clientWidth||0
    }));
    assert.ok(overflow.bodyWidth<=overflow.screenWidth+4,
      'horizontal page overflow on '+item.name+': '+JSON.stringify(overflow));
    if(item.isMobile)assert.ok(overflow.tableWidth>overflow.tableVisibleWidth,
      'mobile table should use horizontal scrolling');
    await page.locator('details.audit-evidence').scrollIntoViewIfNeeded();
    await page.screenshot({path:'test-artifacts/'+item.name+'-paper.png'});
    await page.goto(base+'#/paper/paper-48724c28e5',{waitUntil:'domcontentloaded'});
    await page.locator('details.audit-evidence summary').waitFor({timeout:15000});
    await page.locator('details.audit-evidence summary').click();
    assert.ok(await page.locator('.audit-evidence tbody tr').count()>=7,
      'spillover evidence rows missing on '+item.name);
    await page.goto(base+'#/paper/paper-8db14dc31c',{waitUntil:'domcontentloaded'});
    await page.locator('.split .section h2').first().waitFor({timeout:15000});
    assert.equal(await page.locator('.split .section h2').count(),6,
      'archived cross-paper weekly summary must not appear as extra sections');
    assert.equal(await page.locator('.split .prose').filter({hasText:'今週読むならこの順'}).count(),0,
      'weekly digest text leaked into individual paper detail');
    assert.deepEqual(errors,[],'JavaScript errors on '+item.name);
    await page.close();
    console.log('PASS '+item.name+' six sections, numeric evidence, scroll and overflow');
  }
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
