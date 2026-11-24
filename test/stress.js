const E=require('../engine.js');let pass=0,fail=0;const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL',m));};
const base={age:'below60',metro:true};
const T=i=>E.calculate(Object.assign({},base,i));
// 1. Junk inputs never throw and never give NaN/negative tax
const junk=[0,-500000,'',null,undefined,'abc','12,00,000','1e9',NaN,Infinity,-Infinity,1e15,0.5,'  ',{},[]];
for(const v of junk)for(const k of ['gross','basic','c80','rentPaid','hraReceived','tds','interest','employerNps']){
  let r;try{r=T({gross:1500000,basic:600000,[k]:v});}catch(e){ok(false,`throws on ${k}=${String(v)}: ${e.message}`);continue;}
  for(const x of [r.newRegime.total,r.oldRegime.total,r.monthlyTakeHome])ok(Number.isFinite(x)&&x>=0||k==='gross'&&x===r.monthlyTakeHome&&Number.isFinite(x),`bad output ${k}=${String(v)}: ${x}`);}
// 2. Unknown age falls back safely
ok(Number.isFinite(T({gross:1e6,age:'zzz'}).oldRegime.total),'unknown age');
// 3. Boundaries: around every slab, rebate, surcharge threshold, both regimes, all ages
const edges=[250000,300000,400000,500000,800000,1000000,1200000,1270588,1600000,2000000,2400000,5e6,1e7,2e7,5e7];
for(const age of ['below60','60to79','80plus'])for(const e of edges)for(const d of [-10,-1,0,1,10,1000]){
  const ti=e+d;const nGross=ti+75000,oGross=ti+50000;
  const n=T({gross:nGross,age}).newRegime,o=T({gross:oGross,age}).oldRegime;
  ok(Math.abs(n.taxable-Math.round(ti/10)*10)<1,`new taxable at ${ti}`);ok(Math.abs(o.taxable-Math.round(ti/10)*10)<1,`old taxable at ${ti}`);
  ok(n.total>=0&&o.total>=0,'non-negative');}
// 4. Monotonic and no cliff: one more rupee of salary never cuts tax, and never raises tax by more than about the rupee (marginal relief)
for(const age of ['below60','60to79','80plus'])for(let g=0;g<=6e7;g+=g<3e6?5000:g<2.2e7?50000:500000){
  const a=T({gross:g,age}),b=T({gross:g+1000,age});
  for(const reg of ['newRegime','oldRegime']){ok(b[reg].total>=a[reg].total-10,`${reg} drops at ${g} ${age}`);
    ok((reg==='oldRegime'&&a[reg].taxable<=500000&&b[reg].taxable>500000)||b[reg].total-a[reg].total<=1000*1.04+20,`${reg} cliff at ${g} ${age}: ${a[reg].total}->${b[reg].total}`);}}
// 5. More deductions never raise old-regime tax
for(let k=0;k<3000;k++){const g=Math.random()*5e7,c=Math.random()*2e5;
  ok(T({gross:g,c80:c+10000}).oldRegime.total<=T({gross:g,c80:c}).oldRegime.total,'deduction raised tax');}
// 6. Older age never pays more under old regime
for(let g=0;g<3e6;g+=10000){const y=T({gross:g,age:'below60'}).oldRegime.total,m=T({gross:g,age:'60to79'}).oldRegime.total,o=T({gross:g,age:'80plus'}).oldRegime.total;ok(m<=y&&o<=m,`age order at ${g}`);}
// 7. Break-even really is break-even
for(let g=800000;g<=5e6;g+=100000){const r=T({gross:g});if(r.breakEven){
  const at=T({gross:g,eduLoan:r.breakEven}).oldRegime.total,below=T({gross:g,eduLoan:Math.max(0,r.breakEven-5000)}).oldRegime.total;
  ok(at<=r.newRegime.total&&below>r.newRegime.total-1,`break-even wrong at ${g}: ${r.breakEven}`);}}
// 8. Refund sign
ok(T({gross:1500000,tds:200000}).refund>0,'refund positive');ok(T({gross:1500000,tds:1000}).refund<0,'balance due');ok(T({gross:1500000}).refund===null,'no tds');
// 9. Speed: 100,000 full calculations (each includes break-even search and 4 what-ifs)
const t0=Date.now();for(let k=0;k<100000;k++)T({gross:Math.random()*1e8,basic:4e5,c80:1e5,hraReceived:2e5,rentPaid:2e5});
const ms=Date.now()-t0;ok(ms<20000,'too slow');
console.log(`${pass} checks passed, ${fail} failed. 100,000 calculations in ${ms} ms (${(ms/100).toFixed(3)} ms per 1,000 keystrokes)`);process.exit(fail?1:0);
