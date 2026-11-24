// Real-browser audit: every page at 360/768/1280px, overflow, tap targets, axe accessibility, keyboard, slow network, offline.
// Needs: npm i @sparticuz/chromium@131 puppeteer-core@23 axe-core@4.10.2, and the site served at http://127.0.0.1:8811/
const chromium=require('@sparticuz/chromium'),pp=require('puppeteer-core'),fs=require('fs');
const axe=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const B='http://127.0.0.1:8811/';
const pages=['index.html','guides/intimation-143-1.html','privacy.html','disclaimer.html','404.html'];
const sizes=[[360,780,'phone'],[768,1024,'tablet'],[1280,900,'desktop']];
(async()=>{
 const br=await pp.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--no-proxy-server'],headless:true});
 const report=[];
 for(const p of pages)for(const [w,h,n] of sizes)for(const scheme of (n==='phone'&&p==='index.html'?['light','dark']:['light'])){
  const pg=await br.newPage();const errs=[];pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));pg.on('pageerror',e=>errs.push(String(e)));
  pg.on('requestfailed',r=>errs.push('failed '+r.url()));
  await pg.setViewport({width:w,height:h,deviceScaleFactor:1});await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await pg.goto(B+p,{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,400));
  const m=await pg.evaluate(()=>{const de=document.documentElement;const over=de.scrollWidth-window.innerWidth;
   const wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>window.innerWidth+1&&!e.closest('.scroll')}).slice(0,5).map(e=>e.tagName+'.'+e.className+'#'+e.id);
   const small=[...document.querySelectorAll('button,input,select,a.btn,.presets button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.height<44&&!(e.type==='checkbox'))}).map(e=>(e.id||e.textContent.trim().slice(0,15))+':'+Math.round(e.getBoundingClientRect().height));
   const fonts=[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+f.weight);
   return {over,wide,small:[...new Set(small)].slice(0,8),fonts:[...new Set(fonts)],bytes:performance.getEntriesByType('resource').reduce((s,e)=>s+(e.transferSize||e.encodedBodySize||0),0)+ (performance.getEntriesByType('navigation')[0]?.encodedBodySize||0)}});
  let ax=null;if(n!=='tablet'){await pg.evaluate(axe);ax=await pg.evaluate(async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa','best-practice']});return r.violations.map(v=>v.id+'('+v.nodes.length+'): '+v.nodes.slice(0,2).map(x=>x.target.join(' ')).join(' | '))});}
  const name=`${p.replace(/\W/g,'_')}-${n}-${scheme}`;await pg.screenshot({path:`/tmp/shots/${name}.png`,fullPage:n!=='desktop'||p!=='index.html'?true:false});
  report.push({name,errs,...m,axe:ax});await pg.close();}
 // keyboard: tab through index and record focus order of first 12
 const pg=await br.newPage();await pg.setViewport({width:1280,height:900});await pg.goto(B+'index.html',{waitUntil:'networkidle0'});
 const order=[];for(let i=0;i<14;i++){await pg.keyboard.press('Tab');order.push(await pg.evaluate(()=>{const e=document.activeElement;const o=getComputedStyle(e).outlineStyle;return (e.id||e.textContent.trim().slice(0,18))+(o==='none'?'[NO OUTLINE]':'')}))}
 // slow 3G + offline
 const cdp=await pg.target().createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:50000,uploadThroughput:20000});
 const t0=Date.now();await pg.goto(B+'index.html?slow',{waitUntil:'load'});const slow=Date.now()-t0;const vt=await pg.$eval('#vLine',e=>e.textContent);
 await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await pg.goto(B+'index.html',{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,1500));await pg.reload({waitUntil:'networkidle0'});await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});let off;try{await pg.reload({waitUntil:'load',timeout:8000});off='loaded from cache: '+await pg.$eval('#vLine',e=>e.textContent)}catch(e){off='offline reload failed: '+e.message.slice(0,60)}
 console.log(JSON.stringify({report,keyboard:order,slow3g:{ms:slow,result:vt},offline:off},null,1));await br.close();})();
