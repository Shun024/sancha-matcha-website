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

## Performance polish (Lighthouse) — DONE
- Live mobile: Performance **91–92**, Accessibility **100**, Best Practices **100**,
  SEO effectively 100. **CLS 0**, FCP 1.2s, LCP ~3.2s, SI ~3.8s.
- Done: self-hosted Cormorant + Jost (same-origin woff2, font-display:optional, preloaded
  above-the-fold weights) with metric-matched fallbacks; WebP hero via <picture>;
  aspect-ratio reserved on hero/story images. Eliminated the font-swap CLS.
- Only remaining lever (minor): LCP ~3.2s is the hero image over throttled mobile —
  a smaller/further-optimised hero asset could shave a little. Diminishing returns.

## Launch-readiness checklist (Sep 2026)
Done: privacy + terms pages, custom 404, form validation + honeypot, apple-touch-icon,
image compression, sitemap/robots, meta title+desc, OG image, alt text, colour contrast,
mobile-friendly, page speed, secrets check (clean), broken-link check (clean), FAQ+schema.
Still open:
- **Force HTTPS:** confirm the "Enforce HTTPS" box is ticked in GitHub → Settings → Pages
  (DNS check was green). One-click, client/us to confirm.
- **Analytics:** deferred — client chose "none for now" (Privacy Policy states no
  analytics/cookies). If added later: cookieless (Plausible/Fathom) needs NO cookie banner;
  GA4 would need a consent banner built.
- **Legal pages need a review:** privacy/terms are solid plain-English drafts — client should
  add registered business details and have them checked before relying on them commercially.
- **Newsletter form** validates client-side but isn't wired to storage yet (see below /
  the newsletter→Google Sheet plan in memory).

## Newsletter form → storage (not wired yet)
The subscribe form (`#cta` section) now validates the email and has a honeypot spam trap,
but `handleSubscribe()` does not send anywhere yet (marked with a `TODO` in the code).
To make it capture emails:
- Recommended: Google Apps Script web app (`doPost`) that appends `[timestamp, email]` to a
  Google Sheet (fits the existing Sheets-as-CMS setup). Front-end POSTs the email to the
  deploy URL; keep the honeypot check server-side too.
- Needs from client: create the Sheet + Apps Script and give us the deployment URL.
- Then update `handleSubscribe()` to POST instead of just clearing the field, and update the
  Privacy Policy if the storage/provider changes what data is held.

---

## Decisions on record
- **Keep** the currently-unused assets (`assets/emblem-green.png`,
  `assets/emblem-bowl-dark.png`, `assets/source/sancha logo copy.pdf`) — may reuse later.
