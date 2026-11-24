// Loads a site page in jsdom with its own scripts and a fetch that reads local files.
const path = require('path'), fs = require('fs'), { pathToFileURL, fileURLToPath } = require('url');
let jsdom; try { jsdom = require('jsdom'); } catch { jsdom = require('/tmp/jd/node_modules/jsdom'); }
const root = path.join(__dirname, '..');
module.exports = function load(rel, { today } = {}) {
  const errs = [];
  const vc = new jsdom.VirtualConsole().on('jsdomError', e => errs.push(e.message));
  const dom = new jsdom.JSDOM(fs.readFileSync(path.join(root, rel), 'utf8'), {
    url: pathToFileURL(path.join(root, rel)).href, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = async u => { const p = fileURLToPath(String(u)); const ok = fs.existsSync(p); const t = ok ? fs.readFileSync(p, 'utf8') : '';
        return { ok, status: ok ? 200 : 404, json: async () => JSON.parse(t), text: async () => t }; };
      if (today) { const Real = w.Date, fixed = new Real(today).getTime();
        w.Date = class extends Real { constructor(...a) { a.length ? super(...a) : super(fixed); } static now() { return fixed; } }; }
    }
  });
  const ready = new Promise(res => dom.window.addEventListener('load', res)).then(() => dom.window.SITE_RULES && dom.window.SITE_RULES.catch(() => {})).then(() => new Promise(r => setTimeout(r, 50)));
  return { dom, w: dom.window, d: dom.window.document, errs, ready };
};
