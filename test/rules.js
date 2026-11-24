// Rules data file sanity, freshness warning on every page, and year labels in pages matching the rules.
const fs = require('fs'), path = require('path'), load = require('./_page'), root = path.join(__dirname, '..');
let pass = 0, fail = 0; const ok = (c, m) => c ? pass++ : (fail++, console.log('FAIL', m));
(async () => {
  const cur = JSON.parse(fs.readFileSync(path.join(root, 'rules/current.json'))).current;
  const r = JSON.parse(fs.readFileSync(path.join(root, `rules/${cur}.json`)));
  ok(r.year === cur, 'year matches file');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(r.verified || ''), 'verified date filled in (set it after checking every number)');
  ok(r.validFrom < r.validTo && r.verified >= '2000', 'dates in order');
  const slabsOK = s => s.every(([u, t], i) => t >= 0 && t <= 0.5 && (i === s.length - 1 ? u === null : u > (i ? s[i - 1][0] : 0)));
  ok(slabsOK(r.newRegime.slabs), 'new slabs ascending, last open'); for (const k in r.oldRegime.slabs) ok(slabsOK(r.oldRegime.slabs[k]), 'old slabs ' + k);
  for (const reg of [r.newRegime, r.oldRegime]) ok(reg.surcharge.every(([t, x], i) => i === 0 || (t > reg.surcharge[i - 1][0] && x > reg.surcharge[i - 1][1])), 'surcharge ascending');
  ok(r.cess > 0 && r.cess < 0.1, 'cess sane');
  const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ok(idx.includes(`<h1>Salary tax calculator for India, ${cur}</h1>`), 'page title shows current tax year');
  for (const page of ['index.html', 'guides/intimation-143-1.html', 'privacy.html', 'disclaimer.html']) {
    const live = load(page, { today: '2026-11-24T10:00:00' }); await live.ready;
    ok(/Last checked/.test(live.d.getElementById('fresh').textContent) && !live.d.querySelector('.stale'), page + ': note shown, no warning while current');
    const old = load(page, { today: `${+r.validTo.slice(0, 4)}-04-01T09:00:00` }); await old.ready;
    ok(!!old.d.querySelector('.stale'), page + ': warning shown from 1 April after rules end');
    {const a=old.d.querySelector('[data-report]');ok(!a || (!a.hidden && /github.com\/lazymallu\/kitnatax\/issues\/new/.test(a.href)), page + ': report link points at the issue form');}
    ok(live.errs.length === 0, page + ': no script errors ' + live.errs.join(';'));
  }
  console.log(`${pass} rules and freshness checks passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
