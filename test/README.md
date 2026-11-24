Run all of these before every release (GitHub runs them automatically on every push and every Monday):
  node tests.js                    hand-worked examples for the current year
  cd test && node compare.js 20000 20,000 random people vs an independent Python reference (both read rules/*.json)
  cd test && node stress.js        junk inputs, every boundary, no tax cliffs, monotonic, speed
  node test/rules.js               rules file sanity, "last checked" note and out-of-date warning on every page
  node test/guide.js               143(1) guide: picker, deadline edge dates, junk dates, official links only
  node test/refund-guide.js        refund guide: status picker, processing-deadline edge dates, junk dates, official links only
  node test/ui.js                  5,600 rapid junk keystrokes through the calculator page
Page tests need jsdom: npm install --no-save jsdom@24.1.3
  node test/browser-audit.js       real Chromium: 3 widths, dark mode, accessibility (axe), keyboard, slow network, offline
