// Refund guide tests: status picker, processing-deadline maths at edges, junk dates, official links only.
const load=require('./_page');(async()=>{const {w,d,errs,ready}=load('guides/refund-not-received.html');await ready;let pass=0,fail=0;const ok=(c,m)=>c?pass++:(fail++,console.log('FAIL',m));
const all=[...d.querySelectorAll('.pick button')].map(b=>b.dataset.case);ok(all.length===5,'five statuses');
ok(d.querySelectorAll('[data-show]').length===5&&all.every(c=>d.querySelector(`[data-show=${c}]`)),'every status has steps');
for(const c of [...all,'wait']){d.querySelector(`[data-case=${c}]`).click();
  const vis=[...d.querySelectorAll('[data-show]')].filter(s=>!s.hidden).map(s=>s.dataset.show);ok(vis.length===1&&vis[0]===c,'picker '+c);
  ok(d.querySelectorAll('.pick [aria-pressed=true]').length===1,'one pressed '+c);}
const L=w.__limits,T=new w.Date(2026,10,24),f=x=>x&&[x.verify.getFullYear()+'-'+(x.verify.getMonth()+1)+'-'+x.verify.getDate(),x.process.getFullYear()+'-'+(x.process.getMonth()+1)+'-'+x.process.getDate()];
// The department's own example: filed 10 Aug 2025 -> processed by 31 Dec 2026.
const cases=[['2025-08-10',['2025-9-9','2026-12-31']],['2026-03-31',['2026-4-30','2026-12-31']],['2026-04-01',['2026-5-1','2027-12-31']],['2024-02-29',['2024-3-30','2024-12-31']],['2025-12-15',['2026-1-14','2026-12-31']],['2026-07-31',['2026-8-30','2027-12-31']]];
for(const [iso,want] of cases){const got=f(L(iso,T));ok(got&&got[0]===want[0]&&got[1]===want[1],`limits ${iso}: ${got} want ${want}`);}
ok(L('2025-08-10',T).days===37,'days left counted');ok(L('2024-07-31',T).days<0,'passed window flagged');ok(L('2027-01-01',T).future===true,'future date flagged');
for(const bad of ['','2026-02-30','abc','2026-13-01','<script>','9999-99-99',null,undefined])ok(L(bad,T)===null,'junk date '+bad);
const inp=d.getElementById('d');for(const v of ['2025-08-10','','2024-07-31','2030-01-01','2026-02-30']){inp.value=v;inp.dispatchEvent(new w.Event('input'));const t=d.getElementById('dates').textContent;ok(t.length>10&&!/NaN|undefined|Invalid/.test(t),'render '+v);}
const links=[...d.querySelectorAll('a[href^=http]')].map(a=>a.href);
ok(links.filter(u=>!/^https:\/\/kitnatax\.pages\.dev\/|^https:\/\/github\.com\/lazymallu\/kitnatax\/issues\//.test(u)).every(u=>/^https:\/\/(www\.|eportal\.)?incometax(india)?\.gov\.in\//.test(u)),'all outside links official');
ok([...d.querySelectorAll('a[href^=http]')].every(a=>a.rel.includes('noopener')||/kitnatax|github/.test(a.href)),'outside links noopener');
ok(d.querySelector('a[href="intimation-143-1.html"]'),'links to the 143(1) guide');
const ld=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);ok(ld['@type']==='FAQPage'&&ld.mainEntity.length===3,'FAQ data valid');
ok(d.querySelectorAll('h1').length===1,'one h1');
ok(errs.length===0,'script errors: '+errs.join('; '));ok(/Last checked/.test(d.getElementById('fresh').textContent),'freshness note');
console.log(`${pass} refund guide checks passed, ${fail} failed; ${links.length} official links`);process.exit(fail?1:0);})();
