/* Shared by every page. The only settings to fill in at launch are in SITE below. */
(function () {
  const SITE = {
    // Where "Report an error" goes, e.g. a GitHub issue form or a Google Form. Empty = link hidden.
    reportUrl: 'https://github.com/lazymallu/kitnatax/issues/new?template=error-report.yml',
    // Cloudflare Web Analytics token (free, no cookies). Empty = no analytics loaded.
    cfAnalyticsToken: ''
  };
  const me = document.currentScript;
  const base = new URL('..', me.src);               // site root, works from any folder
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); };

  // True once today is after the rules' last valid day, i.e. from 1 April of the next tax year.
  function isStale(validTo, today) {
    const [y, m, d] = validTo.split('-').map(Number);
    return today > new Date(y, m - 1, d, 23, 59, 59);
  }

  async function getJSON(path) {
    const r = await fetch(new URL(path, base));
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.json();
  }

  function freshness(rules) {
    const slot = document.getElementById('fresh');
    if (!slot) return;
    slot.textContent = `Rules for ${rules.label.charAt(0).toLowerCase() + rules.label.slice(1)}. Last checked against official sources on ${fmt(rules.verified)}.`;
    if (isStale(rules.validTo, new Date())) {
      const warn = document.createElement('div');
      warn.className = 'stale';
      warn.setAttribute('role', 'alert');
      warn.innerHTML = `This page uses rules for tax year ${esc(rules.year)}, which ended on ${esc(fmt(rules.validTo))}. Rates for the current year may differ. Check the <a href="https://www.incometaxindia.gov.in/" rel="noopener">Income Tax Department</a> before relying on these figures.`;
      document.body.prepend(warn);
    }
  }

  function report() {
    for (const a of document.querySelectorAll('[data-report]')) {
      if (SITE.reportUrl) a.href = SITE.reportUrl; else a.hidden = true;
    }
  }

  function analytics() {
    if (!SITE.cfAnalyticsToken) return;
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.dataset.cfBeacon = JSON.stringify({ token: SITE.cfAnalyticsToken });
    document.head.appendChild(s);
  }

  window.SITE = SITE;
  window.SITE_isStale = isStale;
  window.SITE_RULES = getJSON('rules/current.json')
    .then(c => getJSON(`rules/${encodeURIComponent(c.current)}.json`))
    .then(r => { freshness(r); return r; });
  window.SITE_RULES.catch(() => {
    const slot = document.getElementById('fresh');
    if (slot) slot.textContent = 'Tax rules could not be loaded. Reload the page, or check your connection.';
  });
  report();
  analytics();
  // Offline copy on the real site only (not in previews or frames).
  if ('serviceWorker' in navigator && window.isSecureContext && window.top === window) {
    navigator.serviceWorker.register(new URL('sw.js', base)).catch(() => {});
  }
})();
