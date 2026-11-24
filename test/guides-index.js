// Guides list and top bar: every guide is listed, every listed guide exists, every page has the Guides button and its links resolve.
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');let pass=0,fail=0;const ok=(c,m)=>c?pass++:(fail++,console.log('FAIL',m));
const load=require('./_page');
(async()=>{
const idx=fs.readFileSync(path.join(root,'guides/index.html'),'utf8');
const files=fs.readdirSync(path.join(root,'guides')).filter(f=>f.endsWith('.html')&&f!=='index.html');
const cards=[...idx.matchAll(/<li class="card"><a class="t" href="([^"]+)">([^<]+)<\/a>/g)].map(m=>({href:m[1],title:m[2]}));
for(const f of files)ok(cards.some(c=>c.href===f),'guide missing from the guides list: '+f);
for(const c of cards)ok(fs.existsSync(path.join(root,'guides',c.href)),'listed guide does not exist: '+c.href);
ok(cards.length===files.length,'one card per guide');
for(const f of files){const h1=(fs.readFileSync(path.join(root,'guides',f),'utf8').match(/<h1>([^<]+)/)||[])[1]||'';
  ok(h1.length>10,'guide has a title: '+f);}
const pages=['index.html','privacy.html','disclaimer.html','404.html','guides/index.html',...files.map(f=>'guides/'+f)];
for(const p of pages){const s=fs.readFileSync(path.join(root,p),'utf8');const bar=(s.match(/<nav class="topbar"[\s\S]*?<\/nav>/)||[''])[0];
  ok((s.match(/class="topbar"/g)||[]).length===1,'one top bar on '+p);
  const g=(bar.match(/class="tb-guides"[^>]*href="([^"]+)"/)||[])[1];ok(g,'Guides button on '+p);
  for(const h of [...bar.matchAll(/href="([^"]+)"/g)].map(m=>m[1])){const t=h.startsWith('/')?path.join(root,h,h.endsWith('/')?'index.html':''):path.join(root,path.dirname(p),h);ok(fs.existsSync(t),`top bar link ${h} on ${p} resolves`);}
  ok(bar.indexOf('tb-guides')>0&&s.indexOf('class="topbar"')<s.indexOf('<main'),'top bar comes before the content on '+p);}
const sm=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');ok(!/\.html</.test(sm),'sitemap uses clean addresses (Cloudflare redirects .html)');
for(const p of pages.filter(p=>p!=='404.html')){const s=fs.readFileSync(path.join(root,p),'utf8');const c=(s.match(/rel="canonical" href="([^"]+)"/)||[])[1]||'';ok(c&&!c.endsWith('.html'),'clean canonical on '+p+': '+c);
  const want='https://kitnatax.pages.dev/'+p.replace(/(^|\/)index\.html$/,'$1').replace(/\.html$/,'');ok(c===want,`canonical ${c} matches ${want}`);ok(sm.includes('<loc>'+c+'</loc>'),'in sitemap: '+c);}
const {d,errs,ready}=load('guides/index.html');await ready;
ok(d.querySelectorAll('h1').length===1,'one h1');ok(d.querySelector('.tb-guides[aria-current=page]'),'Guides marked as current page');
ok(!/Coming next|coming soon|upcoming/i.test(d.body.textContent),'no upcoming topics shown');
ok(errs.length===0,'script errors: '+errs.join('; '));ok(/Last checked/.test(d.getElementById('fresh').textContent),'freshness note');
console.log(`${pass} guides-list and top-bar checks passed, ${fail} failed; ${cards.length} guides listed`);process.exit(fail?1:0);})();
