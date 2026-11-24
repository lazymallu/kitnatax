// Weekly health check. Node 18+, no installs. Exit code 1 = something needs a human.
// 1. Rules freshness: fails from 1 April after the current rules' last valid day.
// 2. Official rate pages: each must still contain the numbers we use; flags when a new year's rates appear.
// 3. Every outside link on the site: 404/410 = broken (fail); blocked or timed out = warning only.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = process.env.WATCH_TODAY ? new Date(process.env.WATCH_TODAY) : new Date();
const fails = [], warns = [], oks = [];
const cur = JSON.parse(fs.readFileSync(path.join(root, 'rules/current.json'), 'utf8')).current;
const rules = JSON.parse(fs.readFileSync(path.join(root, `rules/${cur}.json`), 'utf8'));

// 1. Freshness
const end = new Date(rules.validTo + 'T23:59:59+05:30');
if (today > end) fails.push(`Rules ${cur} expired on ${rules.validTo}. Run: node scripts/new-year.mjs, then update the numbers.`);
else if ((end - today) / 864e5 < 70) warns.push(`Rules ${cur} end on ${rules.validTo}. Budget day is 1 February: check for changes.`);
else oks.push(`Rules ${cur} valid until ${rules.validTo}`);
if (!rules.verified) fails.push(`Rules ${cur} have no "verified" date: someone must check them against official sources.`);

const norm = t => t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[,\s]/g, '');
async function get(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (site link check)' } });
      return { status: r.status, text: r.ok ? await r.text() : '' };
    } catch (e) { if (attempt) return { status: 0, error: e.name }; }
  }
}

// 2. Official pages that hold our numbers
for (const w of rules.watch || []) {
  const r = await get(w.url);
  if (r.status === 404 || r.status === 410) { fails.push(`Official page gone (${r.status}): ${w.url}`); continue; }
  if (r.status !== 200) { warns.push(`Could not read official page (${r.status || r.error}), check by hand: ${w.url}`); continue; }
  const body = norm(r.text);
  const missing = (w.mustContain || []).filter(s => !body.includes(s.replace(/[,\s]/g, '')));
  if (missing.length) fails.push(`Official page no longer shows ${missing.join(', ')}: rates may have changed. ${w.url}`);
  const signals = (w.newYearSignal || []).filter(s => body.includes(s.replace(/[,\s]/g, '')));
  if (signals.length) warns.push(`Official page now mentions ${signals.join(', ')}: next year's rates may be out. ${w.url}`);
  if (!missing.length) oks.push(`Numbers still match: ${w.url}`);
}

// 3. Every outside link in the site's pages
const pages = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
  if (['.git', 'node_modules', 'test', 'scripts', '.github'].includes(f.name)) continue;
  const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.html$/.test(f.name)) pages.push(p); } })(root);
const links = new Set();
for (const p of pages) for (const m of fs.readFileSync(p, 'utf8').matchAll(/href="(https:\/\/[^"]+)"/g))
  if (!m[1].includes('YOUR-DOMAIN') && !/fonts\.(googleapis|gstatic)\.com/.test(m[1])) links.add(m[1].replace(/&amp;/g, '&'));
for (const url of links) {
  const r = await get(url.split('#')[0]);
  if (r.status === 404 || r.status === 410) fails.push(`Broken link (${r.status}): ${url}`);
  else if (r.status >= 200 && r.status < 400) oks.push(`Link OK: ${url}`);
  else warns.push(`Link not reachable from the checker (${r.status || r.error}), check by hand: ${url}`);
}

const out = [`# Site check ${today.toISOString().slice(0, 10)}`, '',
  `**${fails.length} need fixing, ${warns.length} to look at, ${oks.length} fine.**`, '',
  ...fails.map(f => `- FIX: ${f}`), ...warns.map(w => `- LOOK: ${w}`), '', `<details><summary>Fine</summary>\n\n${oks.map(o => '- ' + o).join('\n')}\n</details>`].join('\n');
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
process.exit(fails.length ? 1 : 0);
