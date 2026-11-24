/* KitnaTax: tax engine for resident salaried individuals.
   No numbers live here: every rate and limit comes from rules/<year>.json.
   A new year is a new JSON file, not a code change. */
(function (root) {
  // Rules come from rules/<year>.json. A null slab limit means "no upper limit".
  const RULES = {};
  const fix = slabs => slabs.map(([upto, rate]) => [upto === null ? Infinity : upto, rate]);
  function addRules(json) {
    const r = JSON.parse(JSON.stringify(json));
    r.newRegime.slabs = fix(r.newRegime.slabs);
    for (const k of Object.keys(r.oldRegime.slabs)) r.oldRegime.slabs[k] = fix(r.oldRegime.slabs[k]);
    r.checked = r.verified;
    RULES[r.year] = r;
    return r;
  }
  const latest = () => Object.keys(RULES).sort().pop();

  // Clean any input: non-numbers, negatives and infinities become safe values; cap at Rs 1 lakh crore.
  const n = v => { const x = Number(v); return Number.isFinite(x) ? Math.min(Math.max(0, x), 1e12) : (x === Infinity ? 1e12 : 0); };
  const round10 = v => Math.round(v / 10) * 10;

  function slabTax(income, slabs) {
    let tax = 0, prev = 0;
    for (const [upto, rate] of slabs) {
      if (income <= prev) break;
      tax += (Math.min(income, upto) - prev) * rate;
      prev = upto;
    }
    return tax;
  }

  // Surcharge with marginal relief: tax plus surcharge above a threshold may
  // not exceed tax plus surcharge at the threshold by more than the extra income.
  function withSurcharge(income, baseTaxFn, bands) {
    const base = baseTaxFn(income);
    let idx = -1;
    bands.forEach(([t], i) => { if (income > t) idx = i; });
    if (idx < 0) return { tax: base, surcharge: 0 };
    const [t, rate] = bands[idx];
    const prevRate = idx > 0 ? bands[idx - 1][1] : 0;
    const full = base * (1 + rate);
    const atT = baseTaxFn(t) * (1 + prevRate);
    const capped = Math.min(full, atT + (income - t));
    return { tax: base, surcharge: capped - base };
  }

  function hraExemption(i, R) {
    const basic = n(i.basic), hra = n(i.hraReceived), rent = n(i.rentPaid);
    if (!hra || !rent) return 0;
    const pct = i.metro ? 0.5 : 0.4;
    return Math.max(0, Math.min(hra, rent - 0.1 * basic, pct * basic));
  }

  function finish(taxable, slabs, reg, R) {
    taxable = round10(Math.max(0, taxable));
    const fn = x => slabTax(x, slabs);
    const slab = fn(taxable);
    let rebate = 0;
    if (taxable <= reg.rebateLimit) rebate = Math.min(slab, reg.rebateMax);
    else if (reg === R.newRegime) {
      // Marginal relief just above the rebate limit.
      const excess = taxable - reg.rebateLimit;
      if (slab > excess) rebate = slab - excess;
    }
    const afterRebate = slab - rebate;
    const sur = taxable > reg.surcharge[0][0]
      ? withSurcharge(taxable, fn, reg.surcharge).surcharge : 0;
    const cess = (afterRebate + sur) * R.cess;
    const total = round10(afterRebate + sur + cess);
    return { taxable, slab, rebate, surcharge: sur, cess, total };
  }

  function computeNew(i, R) {
    const reg = R.newRegime;
    const gross = n(i.gross);
    const empNps = Math.min(n(i.employerNps), reg.employerNpsPct * n(i.basic));
    const lines = [
      ['Gross salary', gross],
      ['Bank interest', n(i.interest)],
      ['Standard deduction', -Math.min(reg.sd, gross)],
      ['Employer pension (NPS)', -empNps]
    ];
    const taxable = lines.reduce((s, l) => s + l[1], 0);
    return Object.assign({ lines }, finish(taxable, reg.slabs, reg, R));
  }

  function oldDeductions(i, R) {
    const L = R.oldRegime.limits, senior = i.age !== 'below60';
    return {
      hra: hraExemption(i, R),
      profTax: Math.min(n(i.profTax), L.profTax),
      homeLoan: Math.min(n(i.homeLoan), L.homeLoan),
      c80: Math.min(n(i.c80), L.c80),
      ccd1b: Math.min(n(i.ownNps), L.ccd1b),
      empNps: Math.min(n(i.employerNps), R.oldRegime.employerNpsPct * n(i.basic)),
      d80: Math.min(n(i.healthSelf), senior ? L.d80SelfSenior : L.d80Self) +
           Math.min(n(i.healthParents), i.parentsSenior ? L.d80ParentsSenior : L.d80Parents),
      e80: n(i.eduLoan),
      interest: Math.min(n(i.interest), senior ? L.ttb : L.tta)
    };
  }

  function computeOld(i, R) {
    const reg = R.oldRegime, gross = n(i.gross);
    const d = oldDeductions(i, R);
    const lines = [
      ['Gross salary', gross],
      ['Bank interest', n(i.interest)],
      ['Standard deduction', -Math.min(reg.sd, gross)],
      ['Rent allowance (HRA)', -d.hra],
      ['Professional tax', -d.profTax],
      ['Home loan interest', -d.homeLoan],
      ['Tax-saving investments (80C)', -d.c80],
      ['Your pension savings (NPS)', -d.ccd1b],
      ['Employer pension (NPS)', -d.empNps],
      ['Health insurance (80D)', -d.d80],
      ['Education loan interest', -d.e80],
      [i.age !== 'below60' ? 'Bank interest, seniors (80TTB)' : 'Savings interest (80TTA)', -d.interest]
    ];
    const taxable = lines.reduce((s, l) => s + l[1], 0);
    return Object.assign({ lines, deductions: d }, finish(taxable, reg.slabs[i.age] || reg.slabs.below60, reg, R));
  }

  // Deductions (beyond the standard deduction) the old regime needs to match the new.
  function breakEven(i, R) {
    const target = computeNew(i, R).total;
    const reg = R.oldRegime;
    const base = n(i.gross) + n(i.interest) - Math.min(reg.sd, n(i.gross));
    const slabs = reg.slabs[i.age] || reg.slabs.below60;
    const tax = d => finish(base - d, slabs, reg, R).total;
    if (tax(0) <= target) return 0;
    if (tax(base) > target) return null;
    let lo = 0, hi = base;
    while (hi - lo > 100) { const mid = (lo + hi) / 2; if (tax(mid) <= target) hi = mid; else lo = mid; }
    return Math.ceil(hi / 1000) * 1000;
  }

  // For each old-regime deduction not fully used, the tax saved by filling it.
  function opportunities(i, R) {
    const L = R.oldRegime.limits, senior = i.age !== 'below60';
    const now = computeOld(i, R).total;
    const items = [
      { key: 'c80', name: 'Tax-saving investments: PF, PPF, ELSS funds, life insurance, school fees (80C)', limit: L.c80, newSec: '123' },
      { key: 'ownNps', name: 'Your own pension savings, NPS (80CCD(1B))', limit: L.ccd1b, newSec: '124' },
      { key: 'healthSelf', name: 'Health insurance for you and family (80D)', limit: senior ? L.d80SelfSenior : L.d80Self, newSec: '126' },
      { key: 'healthParents', name: 'Health insurance for parents (80D)', limit: i.parentsSenior ? L.d80ParentsSenior : L.d80Parents, newSec: '126' }
    ];
    return items.map(it => {
      const used = Math.min(n(i[it.key]), it.limit);
      const gap = it.limit - used;
      const filled = Object.assign({}, i, { [it.key]: it.limit });
      return Object.assign(it, { used, gap, saves: gap > 0 ? now - computeOld(filled, R).total : 0 });
    });
  }

  function calculate(i, year) {
    const R = RULES[year || latest()];
    if (!R) throw new Error('No tax rules loaded');
    const nw = computeNew(i, R), od = computeOld(i, R);
    const best = od.total < nw.total ? 'old' : 'new';
    const bestTax = Math.min(nw.total, od.total);
    const tds = n(i.tds);
    return {
      year: R.label, checked: R.checked, newRegime: nw, oldRegime: od, best,
      saving: Math.abs(nw.total - od.total),
      breakEven: breakEven(i, R),
      opportunities: opportunities(i, R),
      monthlyTakeHome: (n(i.gross) + n(i.interest) - bestTax - Math.min(n(i.profTax), R.oldRegime.limits.profTax)) / 12,
      refund: tds ? tds - bestTax : null,
      // Old regime has no marginal relief at the Rs 5 lakh rebate limit: flag people just above it.
      oldRebateCliff: od.taxable > R.oldRegime.rebateLimit && od.taxable <= R.oldRegime.rebateLimit + 75000
    };
  }

  const api = { RULES, addRules, latest, calculate, slabTax, hraExemption };
  if (typeof module !== 'undefined' && module.exports) {
    // In Node (tests, watcher), load every rules file automatically.
    const fs = require('fs'), path = require('path'), dir = path.join(__dirname, 'rules');
    for (const f of fs.readdirSync(dir)) if (/^\d{4}-\d{2}\.json$/.test(f)) addRules(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    module.exports = api;
  }
  else root.TaxEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
