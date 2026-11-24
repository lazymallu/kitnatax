// Random cross-check of engine.js against reference.py.
const E=require('../engine.js'),{execFileSync}=require('child_process');
let s=12345;const rnd=()=>(s=s*16807%2147483647)/2147483647;
const pick=a=>a[Math.floor(rnd()*a.length)];
const amt=max=>Math.round(rnd()**2*max);
const N=+process.argv[2]||20000,cases=[];
for(let k=0;k<N;k++){const gross=pick([amt(3e5),amt(2e6),amt(6e6),amt(3e7),amt(8e7),300000+Math.round(rnd()*20)*50000]);
 cases.push({gross,basic:Math.round(gross*(0.3+rnd()*0.3)),age:pick(['below60','60to79','80plus']),metro:rnd()<.5,parentsSenior:rnd()<.5,
  hraReceived:rnd()<.6?amt(gross*.25):0,rentPaid:rnd()<.6?amt(9e5):0,profTax:pick([0,2400,2500,5000]),c80:amt(3e5),ownNps:amt(1e5),
  employerNps:rnd()<.3?amt(gross*.15):0,healthSelf:amt(8e4),healthParents:amt(8e4),homeLoan:amt(4e5),eduLoan:rnd()<.2?amt(3e5):0,interest:amt(1e5)});}
const ref=JSON.parse(execFileSync('python3',['-I','reference.py'],{input:JSON.stringify(cases),maxBuffer:1e9}).toString());
let bad=0;cases.forEach((c,k)=>{const r=E.calculate(c);const [rn,ro]=ref[k];
 if(Math.abs(r.newRegime.total-rn)>10||Math.abs(r.oldRegime.total-ro)>10){if(bad++<8)console.log('MISMATCH',JSON.stringify(c),'engine',r.newRegime.total,r.oldRegime.total,'ref',rn,ro);}});
console.log(`${N} random cases: ${N-bad} match, ${bad} differ`);process.exit(bad?1:0);
