// Start a new tax year: node scripts/new-year.mjs 2027-28
// Copies the current rules to the new year with new dates and a blank "verified" date (tests fail until a person
// checks every number and fills it in), points current.json at it, and moves year mentions in the pages forward.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const next = process.argv[2];
if (!/^\d{4}-\d{2}$/.test(next || '')) { console.error('Usage: node scripts/new-year.mjs 2027-28'); process.exit(2); }
const cur = JSON.parse(fs.readFileSync(path.join(root, 'rules/current.json'), 'utf8')).current;
const y0 = +cur.slice(0, 4), y1 = +next.slice(0, 4);
if (y1 !== y0 + 1 || next.slice(5) !== String(y1 + 1).slice(2)) { console.error(`Next year after ${cur} is ${y0 + 1}-${String(y0 + 2).slice(2)}`); process.exit(2); }
const r = JSON.parse(fs.readFileSync(path.join(root, `rules/${cur}.json`), 'utf8'));
Object.assign(r, { year: next, label: `Tax year ${next} (1 April ${y1} to 31 March ${y1 + 1})`, validFrom: `${y1}-04-01`, validTo: `${y1 + 1}-03-31`, verified: '' });
for (const w of r.watch || []) if (w.newYearSignal) w.newYearSignal = [`${y1 + 1}-${String(y1 + 2).slice(2)}`];
fs.writeFileSync(path.join(root, `rules/${next}.json`), JSON.stringify(r, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'rules/current.json'), JSON.stringify({ current: next }, null, 2) + '\n');
// Pages: tax-year label, the age date, filing and revision deadlines move one year on.
const bump = s => s.replaceAll(cur, next)
  .replace(/31 (March|July) (\d{4})/g, (m, mo, y) => `31 ${mo} ${+y + 1}`);
const files = ['index.html', 'guides/intimation-143-1.html'];
for (const f of files) { const p = path.join(root, f); fs.writeFileSync(p, bump(fs.readFileSync(p, 'utf8'))); }
console.log(`Created rules/${next}.json and moved page dates on by a year.
Now: 1) update every number in rules/${next}.json that the Budget changed, 2) set "verified" to today,
3) update the worked examples in tests.js, 4) run the tests (see test/README.md).`);
