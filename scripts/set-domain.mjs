// At launch: node scripts/set-domain.mjs example.in   (replaces YOUR-DOMAIN in pages, sitemap and robots)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = (process.argv[2] || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) { console.error('Usage: node scripts/set-domain.mjs yourdomain.in'); process.exit(2); }
let n = 0;
(function walk(dir) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
  if (['.git', 'node_modules', 'scripts', 'test'].includes(f.name)) continue;
  const p = path.join(dir, f.name);
  if (f.isDirectory()) walk(p);
  else if (/\.(html|xml|txt)$/.test(f.name)) { const s = fs.readFileSync(p, 'utf8'); if (s.includes('YOUR-DOMAIN')) { fs.writeFileSync(p, s.replaceAll('YOUR-DOMAIN', d)); n++; } }
} })(root);
console.log(`Set domain to ${d} in ${n} files.`);
