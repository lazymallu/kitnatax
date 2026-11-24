// Worked examples checked by hand against the slab tables. Run: node tests.js
const { calculate, hraExemption, RULES } = require('./engine.js');
const base = { age: 'below60', basic: 0, hraReceived: 0, rentPaid: 0, metro: false };
const cases = [
  ['New: 12.75L salary pays nil (rebate)', { gross: 1275000 }, 'new', 0],
  ['New: 13L salary, marginal relief caps tax at 25,000 + cess', { gross: 1300000 }, 'new', 26000],
  ['New: 15.75L salary', { gross: 1575000 }, 'new', 109200],
  ['New: 25.75L salary', { gross: 2575000 }, 'new', 343200],
  ['New: 50.85L salary, surcharge marginal relief', { gross: 5085000 }, 'new', 1133600],
  ['Old: 10L, 80C 1.5L, 80D 25k', { gross: 1000000, c80: 150000, healthSelf: 25000 }, 'old', 70200],
  ['Old: 5.5L salary pays nil (rebate)', { gross: 550000 }, 'old', 0],
  ['Old: senior 60-79, 6L salary', { gross: 600000, age: '60to79' }, 'old', 20800],
];
let fail = 0;
for (const [name, inp, reg, want] of cases) {
  const r = calculate(Object.assign({}, base, inp));
  const got = (reg === 'new' ? r.newRegime : r.oldRegime).total;
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}, want ${want}`);
}
const h = hraExemption({ basic: 600000, hraReceived: 240000, rentPaid: 240000, metro: true }, RULES['2026-27']);
console.log(`${h === 180000 ? 'PASS' : 'FAIL'}  HRA metro example: got ${h}, want 180000`); if (h !== 180000) fail++;
const be = calculate(Object.assign({}, base, { gross: 1500000 })).breakEven;
console.log(`INFO  Break-even deductions at 15L salary: ${be}`);
process.exit(fail ? 1 : 0);
