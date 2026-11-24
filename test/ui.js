// Calculator page: 5,600 rapid junk keystrokes, selects, presets, reset. Looks for NaN/undefined and script errors.
const load = require('./_page');
(async () => {
  const { w, d, errs, ready } = load('index.html'); await ready;
  const $ = id => d.getElementById(id); const fire = (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true }));
  let bad = 0; const check = m => { const t = d.querySelector('.readout').textContent + $('opps').textContent + $('brk').textContent;
    if (!t.trim() || /NaN|undefined|Infinity|null/.test(t)) { if (bad++ < 5) console.log('BAD after', m); } };
  check('first load');
  const ids = ['gross','basic','employerNps','interest','hraReceived','rentPaid','profTax','c80','ownNps','healthSelf','healthParents','homeLoan','eduLoan','tds'];
  const junk = ['', '0', '-5', 'abc', '12,00,000', '99999999999999999', '1.5', '₹15,00,000', '  7 ', '1e9', '<img src=x onerror=alert(1)>', '१२००००'];
  const t0 = Date.now(); let n = 0;
  for (let r = 0; r < 400; r++) for (const id of ids) { $(id).value = junk[(r + n) % junk.length]; fire($(id), 'input'); n++; check(id + '=' + $(id).value); }
  for (const a of ['below60', '60to79', '80plus']) for (const c of [...$('city').options].map(o => o.value)) { $('age').value = a; $('city').value = c; fire($('age'), 'change'); check(a + c); }
  for (const b of d.querySelectorAll('#presets button')) { b.click(); check('preset'); }
  $('reset').click(); check('reset');
  const fresh = $('fresh').textContent;
  const injected = !!d.querySelector('img[src=x]');
  console.log(`${n} rapid inputs in ${Date.now() - t0} ms; display errors: ${bad}; script errors: ${errs.length}; injected markup: ${injected}; note: "${fresh.slice(0, 60)}..."`);
  process.exit(bad || errs.length || injected || !/Last checked/.test(fresh) ? 1 : 0);
})();
