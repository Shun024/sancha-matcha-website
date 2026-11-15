# SANcha — Launch-Day Runbook

**Target launch: 23 November 2026.** This is the exact go-live sequence, in order,
with the gotchas we hit during the build. Work top to bottom. Nothing here is
destructive until **Step 4 (the merge)** — everything before is prep you can do early.

> Legend: **[DEV]** = you, in the repo / terminal · **[GSHEET]** = the content sheet ·
> **[ORDERS@]** = Apps Script signed in as orders@ · **[CLIENT]** = needs the client.

---

## 0. Pre-flight — confirm BEFORE launch day (don't block the 23rd on these)

- [ ] **[CLIENT] Live SumUp API key** created in the LIVE SumUp account
      (Profile ▸ Developers ▸ API keys — it's a *secret* server-side key, no public key).
- [ ] **[CLIENT] Live products in the sheet**: final IKI/YUAN (and any others) with
      **price incl. VAT** and a **`stock`** column populated. The checkout both displays
      and charges from this sheet, so display = charge.
- [ ] **[CLIENT] VAT rate** confirmed (loose tea is often zero-rated UK food). Receipt is
      safe either way today (shows VAT no. + "prices include VAT", no 20% line).
- [ ] **[CLIENT] Terms of Sale** doc → build `/terms/` (footer already links to it; it's a
      404 until the page exists).
- [ ] **[DEV]** Preview is green: https://shun024.github.io/sancha-preview/ (full site +
      all pages). Regenerate command in the Appendix.

---

## 1. Swap SumUp sandbox → live  **[ORDERS@]**

The checkout runs as a **standalone Apps Script under orders@**. Secrets live in its
**Script Properties** (Project Settings ▸ Script properties) — NOT in the repo.

- [ ] Set **`SUMUP_API_KEY`** = the LIVE secret key (replaces the sandbox `sup_sk_…`).
- [ ] Set **`SUMUP_MERCHANT`** = **`MEXKY1DC`** (live merchant; sandbox was `M76KKB35`).
- [ ] Leave **`SHEET_ID`** (original content sheet) and **`ORDER_ALERT_TO`** (orders@) as-is.
- [ ] **No redeploy needed** for a property change — but if you also edited `Checkout.gs`,
      re-paste it and **Deploy ▸ Manage deployments ▸ edit ▸ New version** (keeps the same
      `/exec`, so the website doesn't change).

> The website points at the orders@ checkout `/exec` (`AKfycbz05KCR…`, in `assets/checkout.js`)
> and the contact@ forms `/exec` (`AKfycbwtkNq6…`, in `assets/site-app.js` + `returns/index.html`).
> These do **not** change at launch.

## 2. Reset stock + clear test data  **[GSHEET]**

- [ ] **Tins** tab: set final starting **stock** (agreed 100 IKI / 100 YUAN unless changed).
- [ ] **Orders** tab: delete the sandbox test order rows.
- [ ] **Stock Waitlist** tab: delete test "Waiting"/"Notified" rows.
- [ ] (Optional) clear test rows from Waitlist / Contact / Returns / Wholesale tabs.

## 3. Build the Terms page (if the doc arrived)  **[DEV]**

- [ ] Create `/terms/index.html` from the client's doc (mirror the `/privacy/` page style).
      Footer already links `/terms/`.

## 4. GO LIVE — merge the full site to `main`  **[DEV]**

`main` is the live site (currently the Coming Soon holding page). `sumup-checkout` is the
full site + checkout. Everything needed (privacy, favicon, rebrand, redeem) is already in
`sumup-checkout`; the only `main`-only content is the temporary Coming Soon page, which we
drop. **Validated command** (produces a tree identical to `sumup-checkout`, Coming Soon gone):

```bash
git checkout main
git pull origin main
git merge -X theirs sumup-checkout -m "Go live: full site + custom SumUp checkout"

# VERIFY before pushing:
grep -c 'id="coming-soon"' index.html          # expect 0
git diff --quiet sumup-checkout -- index.html && echo "index OK" || echo "CHECK index.html"

git push origin main
```

- [ ] Merge done, `grep` returns **0**, index.html matches sumup-checkout.
- [ ] Pushed to `origin/main`.

## 5. Confirm the live domain serves the full site  **[DEV]**

- [ ] Wait for GitHub Pages to build, then hard-refresh **https://sanchamatcha.co.uk/**
      (CNAME is `sanchamatcha.co.uk`). You should see the full homepage, **not** Coming Soon.
- [ ] Spot-check pages: `/why-matcha/` `/our-story/` `/wholesale/` `/visit/` `/contact/`
      `/faq/` `/matcha/iki/` `/matcha/yuan/` `/privacy/` `/returns/`.
- [ ] Favicon is the brand icon (not the old Wix one) — `?v=2` cache-bust is in place.

## 6. Real live smoke test — one low-value order, then refund  **[DEV + CLIENT]**

- [ ] Place a **real** small order on the live site with a real card.
- [ ] Confirm: payment shows in the **SumUp dashboard**; **confirmation email from orders@**
      (check it's in inbox); a row appears in **Orders**; **stock decremented** by the qty.
- [ ] Enter a **tracking number** on that order row → **dispatch email** arrives (one only —
      the duplicate dev trigger was removed).
- [ ] **Refund** the test order in the SumUp dashboard.
- [ ] Reset that product's stock back up by the test qty.

## 7. Forms + back-in-stock final check  **[DEV]**

- [ ] Submit **Contact**, **Wholesale**, **Returns** once each → rows save to their tabs and
      auto-replies arrive from **contact@ / business@ / returns@** respectively (reply-to contact@).
- [ ] Back-in-stock: set a product to **0**, sign up on its page ("notify me"), then raise it
      **0 → >0** → the "back in stock" email sends (it lands in Gmail **Promotions** — that's
      expected for promotional mail; it is delivered, not spam).

## 8. Announce 🎉

- [ ] Social posts / newsletter go out once Steps 5–7 are green.

---

## Rollback (if something's wrong after go-live)

The Coming Soon page is preserved in history. To revert the live site quickly:

```bash
git checkout main
git revert --no-edit <merge-commit-sha>   # or: git reset --hard <pre-launch-sha> && git push --force-with-lease
git push origin main
```

A payment/checkout problem does **not** require a full rollback — you can take the product
offline by setting its **stock to 0** in the sheet (shows "notify me" instead of "add to
basket"), while you investigate.

---

## Appendix — key references (NO secrets here)

| Thing | Value / location |
|---|---|
| Live site branch | `main` (CNAME `sanchamatcha.co.uk`) |
| Full-site/preview branch | `sumup-checkout` |
| Preview URL | https://shun024.github.io/sancha-preview/ (repo `Shun024/sancha-preview`) |
| Checkout backend | standalone Apps Script under **orders@**; `/exec` wired in `assets/checkout.js` |
| Forms backend | standalone Apps Script under **contact@**; `/exec` in `assets/site-app.js` + `returns/index.html` |
| Checkout Script Properties | `SHEET_ID`, `SUMUP_API_KEY`, `SUMUP_MERCHANT` (live `MEXKY1DC`), `ORDER_ALERT_TO` (orders@) |
| Forms Script Property | `SHEET_ID` (content sheet; shared to contact@ as Editor) |
| Business (receipt footer) | VS Partners Ltd · Co. No. 16185759 · VAT 526 9478 48 · 3rd Floor 86–90 Paul Street, London EC2A 4NE |
| `Checkout.gs` / `Forms.gs` | repo `apps-script/` = source of truth; **deployed code is a snapshot — re-paste + New version to apply changes** |

### Regenerate the preview after any change
The preview host serves on a subpath, so absolute `/asset` paths get a `/sancha-preview`
prefix baked in (production branch stays clean). One command:

```bash
SRC=$(pwd); TMP=/tmp/sancha-preview-build; rm -rf "$TMP"; mkdir -p "$TMP"
git -C "$SRC" archive sumup-checkout | tar -x -C "$TMP"; cd "$TMP"
find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \) -print0 | while IFS= read -r -d '' f; do
  perl -0777 -pi -e 's{href="/}{href="/sancha-preview/}g; s{src="/}{src="/sancha-preview/}g; s{srcset="/}{srcset="/sancha-preview/}g; s{url\(/}{url(/sancha-preview/}g; s{href: "/}{href: "/sancha-preview/}g; s{"/#tins"}{"/sancha-preview/#tins"}g; s{"/#shop"}{"/sancha-preview/#shop"}g;' "$f"
done
rm -f CNAME; git init -q; git checkout -q -b main; git add -A
git -c user.email=preview@local -c user.name=preview commit -q -m "Preview build"
git remote add preview https://github.com/Shun024/sancha-preview.git
git push -q --force preview main; cd "$SRC"
```

### Post-launch backlog (deferred, agreed)
Address autofill (paid API), Apple/Google Pay in the SumUp widget, order-review step +
prominent totals, gift cards, `returns@`/`business@` kept as free aliases.
