// Guide page tests: case picker, deadline maths at edges, junk dates, links.
const load=require('./_page');(async()=>{const {w,d,errs,ready}=load('guides/intimation-143-1.html');await ready;let pass=0,fail=0;const ok=(c,m)=>c?pass++:(fail++,console.log('FAIL',m));
for(const c of ['nil','refund','demand','refund']){d.querySelector(`[data-case=${c}]`).click();
  const vis=[...d.querySelectorAll('[data-show]')].filter(s=>!s.hidden).map(s=>s.dataset.show);ok(vis.length===1&&vis[0]===c,'picker '+c);}
const D=w.__deadlines,T=new w.Date(2026,10,24),f=x=>x&&[x.respond.toISOString().slice(0,10),x.rectify.getFullYear()+'-'+(x.rectify.getMonth()+1)+'-'+x.rectify.getDate()];
const cases=[['2026-11-24',['2026-12-24','2031-3-31']],['2026-03-31',['2026-04-30','2030-3-31']],['2026-04-01',['2026-05-01','2031-3-31']],['2024-02-29',['2024-03-30','2028-3-31']],['2026-12-15',['2027-01-14','2031-3-31']]];
for(const [iso,want] of cases){const got=f(D(iso,T));ok(got&&got[1]===want[1]&&Math.abs(new Date(got[0])-new Date(want[0]))<=864e5,`deadline ${iso}: ${got} want ${want}`);}
for(const bad of ['','2026-02-30','abc','2026-13-01','<script>','9999-99-99',null,undefined])ok(D(bad,T)===null,'junk date '+bad);
ok(D('2027-01-01',T).future===true,'future date flagged');
const inp=d.getElementById('d');for(const v of ['2026-11-01','','2026-12-01','2020-01-01']){inp.value=v;inp.dispatchEvent(new w.Event('input'));ok(!/NaN|undefined|Invalid/.test(d.getElementById('dates').textContent),'render '+v);}
const links=[...d.querySelectorAll('a[href^=http]')].map(a=>a.href);
ok(links.filter(u=>!/YOUR-DOMAIN|^https:\/\/kitnatax\.pages\.dev\/|^https:\/\/github\.com\/lazymallu\/kitnatax\/issues\//.test(u)).every(u=>/^https:\/\/(www\.|eportal\.)?incometax(india)?\.gov\.in\//.test(u)),'all outside links official');
ok(errs.length===0,'script errors: '+errs.join('; '));
console.log(`${pass} guide checks passed, ${fail} failed; ${links.length} official links`);ok(/Last checked/.test(d.getElementById('fresh').textContent),'freshness note');
process.exit(fail?1:0);})();
