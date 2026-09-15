# SANcha site — backlog

Things parked for later (not urgent). Add/remove freely.

## Real content
Swap the remaining placeholders for the real thing when it's ready:
- Real product prices (IKI/YUAN/etc.) — currently "coming soon" / test values.
- Real product photos via the sheet's `image` column (see `SHEET-SETUP.md`).
- Confirm menu/drinks, wholesale details, event/booking specifics.

## Custom domain (sanchamatcha.co.uk)
- ✅ Done — DNS repointed to GitHub Pages via Wix, `CNAME` restored, HTTPS live.

## Google Search Console (SEO)
- Verify the site in Search Console and submit `https://sanchamatcha.co.uk/sitemap.xml`
  so Google indexes it faster. (SEO meta/OG/JSON-LD/sitemap/robots already in place.)
- **Decide whose Google account owns it:** ideally the *client's* own account (or one
  made for `contact@sanchamatcha.co.uk`) so they permanently own their search data —
  they can then add us as a user. Alternatively verify with our account now to start
  indexing and add the client as an owner later (multiple owners allowed).
- Verification is a DNS TXT record in Wix (which we control), so any account works —
  it's only a question of who should own it long-term.

## Performance polish (Lighthouse)
- Live mobile scores: Performance **84**, Accessibility **100**, Best Practices **100**,
  SEO effectively 100. Remaining perf points are LCP (~3.5s, hero image over the network)
  and a small CLS (0.087, from async font swap — still in the "good" <0.1 range).
- To push further later: ship a smaller/optimised hero image (or WebP), and add a
  size-adjusted font fallback to remove the font-swap layout shift. Diminishing returns.

---

## Decisions on record
- **Keep** the currently-unused assets (`assets/emblem-green.png`,
  `assets/emblem-bowl-dark.png`, `assets/source/sancha logo copy.pdf`) — may reuse later.
