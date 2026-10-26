# SANcha — custom checkout (SumUp Option 2)  [WORK IN PROGRESS]

A custom basket + checkout built into the site, paying via SumUp's Online Payments API.
Backend = Google Apps Script (`apps-script/Checkout.gs`); card entry = SumUp's card widget;
catalogue + stock + orders live in the Google Sheet.

## How it flows
1. Customer adds tins to the basket (`assets/checkout.js`) and enters their details.
2. Browser → **createCheckout** on the Apps Script web app. The backend re-checks price +
   stock from the sheet, computes the total **server-side**, and calls SumUp
   `POST /v0.1/checkouts` → returns a `checkoutId`.
3. Browser mounts the **SumUp card widget** with that `checkoutId`; customer pays.
4. On `success`, browser → **finalizeOrder**. The backend re-reads the real status from SumUp
   (`GET /v0.1/checkouts/{id}` → must be `PAID`), then writes the order to an **Orders** tab,
   **decrements stock**, and emails the customer + an order alert.

Money/price are never trusted from the browser — the backend is the source of truth.

## Setup
### 1) Deploy the backend
- Open the product spreadsheet → **Extensions ▸ Apps Script**, add `Checkout.gs`
  (keep it as its **own** web app, separate from the forms doPost).
- **Project Settings ▸ Script properties:**
  - `SUMUP_API_KEY` = your **sandbox** secret key (swap to live at launch)
  - `SUMUP_MERCHANT` = matching **sandbox** merchant code (swap to live at launch)
  - `ORDER_ALERT_TO` = email to notify on each order
- **Deploy ▸ New deployment ▸ Web app** (Execute as: Me, Access: Anyone) → copy the `/exec` URL.

### 2) Wire the frontend
- Paste that `/exec` URL into `assets/checkout.js` → `CHECKOUT_ENDPOINT`.
- In `index.html` add (still TODO — part of the frontend UI buildout):
  - `<script src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"></script>`
  - `<script src="assets/checkout.js" defer></script>`
  - a basket button with `#cart-count`, a `#cart-drawer` / `#cart-items` container, and a
    checkout view containing `<div id="sumup-card"></div>`
  - "Add to basket" buttons calling `SANchaCart.add(id, name, price)`

### 3) Sandbox → live switch
Only the two Script properties change: set `SUMUP_API_KEY` + `SUMUP_MERCHANT` to the **live**
values and redeploy (new version). No code change.

## Testing (sandbox)
- Sandbox never moves real money. **An amount of exactly `11` always fails** by design — use it
  to test the failure path.
- Use SumUp's sandbox/test card numbers for success.
- Check: Orders tab row created, stock decremented on the Tins tab, confirmation + alert emails sent.

## Known risk to verify EARLY
Apps Script web apps are awkward for CORS. We send `createCheckout`/`finalizeOrder` as
`text/plain` to dodge the preflight, and read the JSON back. **This must be verified in a real
browser early** — if Apps Script won't return a browser-readable response reliably, the fallback
is to move just this backend to **Cloudflare Workers** (the frontend/flow stays the same).

## Status
- [x] Backend scaffold (`apps-script/Checkout.gs`) — createCheckout, finalizeOrder, stock, orders, emails (email/shipping templates = TODO)
- [x] Frontend scaffold (`assets/checkout.js`) — cart state + checkout orchestration + widget mount
- [ ] Frontend UI: basket drawer, add-to-basket buttons, checkout form, confirmation screen
- [ ] index.html integration (SDK + script + hooks)
- [ ] Shipping (UK rate), VAT handling, on-brand email template + client thank-you copy
- [ ] Verify the CORS approach in-browser against the sandbox
- [ ] End-to-end sandbox test, then live switch

## Still needed from the client
Sandbox key verified · shipping rate · VAT details · policy wordings · order-confirmation
thank-you text · the inbox for new-order alerts.
