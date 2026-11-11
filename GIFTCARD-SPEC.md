# SANcha — Gift Card Feature: Spec & Build Estimate
*Custom build on the existing stack · drafted 2026-11-14*

## 1. Goal
Let customers **buy digital gift cards on the SANcha website**, delivered by email (and optionally
as an Apple/Google Wallet pass), **redeemable online and in-store** — built natively on the
**existing SumUp checkout + Google Sheet**, so running costs stay at SumUp's standard **2.5%** with
**no third-party gift-card platform fees**.

## 2. How it connects to what we already have
It **reuses** the systems already built:
- **SumUp Online Payments checkout** (Apps Script backend + card widget) → sells gift cards and
  charges balances. SumUp is the **payment processor only**.
- **Google Sheet** → a new **"Gift Cards" tab** is the single source of truth for codes/balances.
- Existing **order recording + branded email** infrastructure.

> **Key point:** SumUp does not "do" gift cards. All the gift-card brains — unique codes, balances,
> validation, redemption — are **custom-built on the Sheet + Apps Script**. SumUp just moves the money.

## 3. Scope
**In scope**
- Buy a gift card online: choose amount, recipient name/email, optional message.
- Pay via the **existing SumUp checkout** (2.5%).
- Unique, unguessable gift-card **code** generated + stored.
- **Branded delivery email** with the code (+ Wallet pass in Phase 2).
- **Redeem online:** enter code at checkout → balance deducted → **remainder charged via SumUp**.
  Supports **partial balances** (a card can be used across multiple orders until £0).
- **Redeem in-store:** private staff **lookup/redeem page** (enter code → see balance → deduct an
  amount) + charge any remainder on the SumUp card machine.
- Balance tracking, status, server-side validation, basic anti-fraud (random codes, one source of truth).

**Out of scope (initially / optional)**
- Physical plastic gift cards.
- **Scannable** in-store redemption on the SumUp reader — SumUp's terminal **cannot read our custom
  codes**, so in-store is a manual lookup step.
- Scheduled future-dated delivery (could be added later).
- **Apple/Google Wallet passes = Phase 2** (optional add-on).

## 4. Data model — "Gift Cards" sheet tab
`Code | Issued | OriginalValue | Balance | Currency | Status(Active/Redeemed/Void) | BuyerName |
BuyerEmail | RecipientName | RecipientEmail | Message | OrderRef | LastUsed | Notes`
- Codes are **random + non-sequential** (e.g. `SANCHA-GIFT-7F3K-2QX9`) so unused ones can't be guessed.
- **Balance** is the source of truth, decremented server-side on each redemption.
- All validation/decrement happens in **Apps Script** — never trusted from the browser.

## 5. User flows
**A. Buy (online)** → pick "Gift Card" + amount + recipient → pay via SumUp checkout → on PAID, backend
generates code, writes the Gift Cards row (balance = value), emails the recipient/buyer the branded card.

**B. Redeem online** → enter code at checkout → backend validates (exists, Active, balance > 0) →
applies `min(balance, order total)` → SumUp charges the **remainder** (or, if the card covers the whole
order, completes with **no SumUp charge**) → balance decremented, redemption logged.

**C. Redeem in-store** → staff open the private Redeem page → enter code → see balance → enter amount to
deduct → backend decrements + logs → charge any remainder on the SumUp machine as normal.

## 6. Components to build
- **Frontend** (`index.html` / `checkout.js`): gift-card purchase UI (amount + recipient); gift-code
  entry field at checkout with applied-discount display.
- **Backend** (`Checkout.gs`): gift-card product in `createCheckout`; code generation + Gift Cards tab
  writes on finalize; online redemption endpoint (validate / apply / partial-balance / remainder);
  in-store redeem endpoint; branded gift delivery email.
- **In-store**: a small private staff "Redeem" web page.
- **Wallet passes (Phase 2)**: Apple `.pkpass` (signed) + Google Wallet pass object.

## 7. Apple / Google Wallet passes (Phase 2 detail)
- **Google Wallet:** free. Create a pass class + object via the Google Wallet API, add a
  "Save to Google Wallet" button in the email. Relatively straightforward.
- **Apple Wallet:** needs an **Apple Developer account (~£79/yr)** + a Pass Type ID certificate.
  `.pkpass` files must be **cryptographically signed** — Apps Script can't sign them cleanly, so this
  needs a **tiny serverless function** (e.g. Cloudflare Worker, free tier) or a pass service. This is
  the most technically involved part and the only part with an ongoing cost.

## 8. Decisions needed from the client
- Fixed amounts (£10/£25/£50) **or** any custom value? Min/max?
- Partial redemption allowed? *(recommend: yes)*
- Expiry? *(UK good practice: no expiry or ≥ 12 months)*
- Refund policy on gift-card purchases?
- Lost-code policy?
- Email goes to buyer, recipient, or both?
- Which wallets — Google only (free), Apple too (£79/yr), or neither for v1?

## 9. Running costs
| Item | Cost |
|---|---|
| SumUp fee (sale + charging remainder) | **2.5%** (standard; no per-card fee) |
| Hosting (Apps Script + GitHub Pages) | **£0** |
| Google Wallet passes | **£0** |
| Apple Wallet passes *(optional)* | **~£79/yr** Apple Developer + free serverless signer |

*(vs GiftUp: ~3.49%/card + your processor ≈ ~5% total.)*

## 10. Build estimate
*Effort in developer-days — apply your day-rate for a £ figure.*

**Phase 1 — MVP** (sell + redeem online + in-store lookup, email code, **no wallet passes**)
| Task | Days |
|---|---|
| Backend: gift product + code generation + Gift Cards tab + delivery email | 1.5 |
| Online redemption: validate / apply / partial balance / charge remainder / gift-covers-whole-order path | 2.0 |
| Frontend: purchase UI + code-entry at checkout | 1.0 |
| In-store staff redeem page | 0.5 |
| Sandbox testing + edge cases | 1.0 |
| **Phase 1 subtotal** | **~6 days** (5–7) |

**Phase 2 — Wallet passes** (optional)
| Task | Days |
|---|---|
| Google Wallet pass (class/object + email button) | 1.5 |
| Apple Wallet `.pkpass` (serverless signer + cert setup + generation) | 2.5 |
| Testing | 0.5 |
| **Phase 2 subtotal** | **~4.5 days** (3.5–5.5) |

**Full feature: ~10–12 developer-days.**

**Biggest-risk/complexity items** (why the ranges exist): the **online redemption** logic (partial
balances, the "gift covers the whole order so no SumUp charge" path, preventing double-spend) and the
**Apple `.pkpass` signing** (needs the extra serverless component). Everything else is routine.

## 11. Recommendation
1. **Launch the store first** — gift cards are **not launch-blocking**.
2. Build **Phase 1 MVP** next — covers the core ask (sold + redeemed online + in-store) at a **2.5%**
   running cost, fully on-brand.
3. Add **Phase 2 wallet passes** only if "Add to Apple/Google Wallet" is a must-have (do **Google**
   first — it's free and easy; add **Apple** only if needed, since it carries the cost + signing work).
4. **Alternative** if speed matters more than cost/ownership: **GiftUp** — no build, wallet passes +
   in-store app out of the box, but **~5%** per sale and a separate system *(see the earlier comparison)*.
