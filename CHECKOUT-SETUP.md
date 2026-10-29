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

### 4) Redeploying after a `Checkout.gs` code change
**The `apps-script/Checkout.gs` file in this repo is NOT the running backend.** Editing it here
changes nothing live — the deployed Apps Script web app has its own copy. To push a change:

1. Open the Apps Script project (the standalone checkout web app, **not** the forms one).
2. Open `Checkout.gs` in the editor and **replace its entire contents** with the repo version
   (copy–paste the whole file). Save (⌘S / Ctrl-S).
3. **Deploy ▸ Manage deployments ▸** (pencil/edit the existing web-app deployment) ▸
   **Version: New version** ▸ **Deploy**. Editing the existing deployment keeps the **same
   `/exec` URL**, so nothing in `checkout.js` needs to change. *(Do NOT create a brand-new
   deployment — that gives a new URL and you'd have to re-wire the frontend.)*
4. **Re-authorize if prompted.** The email code now uses `GmailApp.sendEmail` (new
   `gmail.send` scope). The first run after this change will show an authorization screen —
   click through it as the script-owner account. If you skip it, emails silently fail to send.
5. **Test it worked:** place a sandbox order (success card, not amount `11`) and confirm the
   confirmation email now shows sender **"SANcha Matcha"** with reply-to
   **contact@sanchamatcha.co.uk**, and the order-alert email's Reply goes to the customer.

> Go-live note: to send FROM a branded address (e.g. `orders@sanchamatcha.co.uk`) rather than
> the script owner's Gmail, add a verified **"Send mail as"** alias in that Gmail account
> (Settings ▸ Accounts) and pass `{ from: '…' }` to `GmailApp.sendEmail` (see the `TODO` in
> `Checkout.gs`). Until then the underlying sender address stays the owner's Gmail.

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
- [x] SumUp API flow validated in sandbox (create + retrieve checkout via curl)
- [x] Frontend (`assets/checkout.js`) — cart state, drawer, add-to-basket, qty/remove, details form, payment step, confirmation
- [x] index.html integration — nav basket button, drawer markup + CSS, "Add to basket" on tins, SDK + script includes
- [x] UI verified via headless screenshots (basket / details / payment) + no mobile overflow (sw=390 @390)
- [x] Deploy backend (sandbox) + paste /exec URL → **CORS verified in a real browser** (text/plain works; no Cloudflare pivot needed)
- [x] End-to-end sandbox order confirmed: PAID → Orders row + stock decrement + confirmation email received
- [x] Email sender presentation: name "SANcha Matcha" + reply-to contact@sanchamatcha.co.uk (needs Apps Script redeploy — see §4)
- [ ] Shipping (UK rate), VAT handling, on-brand email template + client thank-you copy
- [ ] Sold-out "notify me" email automation (waitlist)
- [ ] End-to-end sandbox test (incl. card widget + amount=11 failure path), then live switch
- [ ] *(optional)* Real address lookup/autocomplete — see "Optional go-live enhancements"

## Optional go-live enhancements

### Address lookup / autocomplete (postcode → pick your address)
**What we have now:** the checkout validates the **email** (format + "did you mean gmail.com?"
typo nudge) and the **UK postcode format**, and sanity-checks the address isn't blank. This catches
the common typos — but it **cannot confirm an address actually exists / is deliverable**.

**The upgrade:** wire a UK address-lookup API so the customer types their postcode, picks their
exact address from a dropdown, and the fields auto-fill. Eliminates mistyped/undeliverable addresses
and speeds up checkout.

- **Providers (UK):** [Ideal Postcodes](https://ideal-postcodes.co.uk), [getAddress.io](https://getaddress.io),
  [Loqate](https://www.loqate.com). All are pay-as-you-go/subscription (roughly ~£20/mo or a few
  pence per lookup — client decides based on volume). Each gives a drop-in JS widget + an API key.
- **How it'd integrate:** add a "Find address" postcode field above the current address box in the
  details step (`index.html`), load the provider's widget in `assets/checkout.js`, and on select,
  fill `address` + `postcode`. The free-text address box stays as a fallback / for edits. **No
  backend change** — the backend already treats the address as free text. Client provides the API
  key (stored in the frontend; these keys are domain-restricted, so that's expected/safe).
- **Decision needed from client:** whether to buy this, and which provider. Low effort to add once
  we have a key (~half a day). Format-checking is adequate for launch if they'd rather defer.

## Still needed from the client
Sandbox key verified · shipping rate · VAT details · policy wordings · order-confirmation
thank-you text · the inbox for new-order alerts · **(optional)** address-lookup provider + API key.
