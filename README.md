# KitnaTax

Free salary tax calculator for India (old vs new regime, deductions, refund check) and plain-English guides to tax notices. Live at https://kitnatax.pages.dev

- Static site: no server, no database, nothing a visitor types leaves their browser.
- All tax numbers live in `rules/<year>.json`. Every rule links to its official source.
- Tests: see `test/README.md`. The `Site check` workflow runs them on every push and every Monday, and watches the official rate pages and all outside links.
- New tax year: `node scripts/new-year.mjs 2027-28`, update the numbers, set `verified`, run the tests.

Not affiliated with the Income Tax Department. Estimates only, not tax advice.

Fonts: Mukta and Anek Latin by Ek Type, SIL Open Font License (see `assets/fonts/`).
