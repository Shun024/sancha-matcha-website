# SANcha — Taking payments with SumUp (Option 1: hosted)

We're using SumUp's **hosted checkout** — the safest, lowest-maintenance way to sell online.
Customers pay on SumUp's secure pages; the website just links to them. No code, no servers,
no card data on our side. You manage products and "Buy" links straight from your Google Sheet.

---

## 1) Create your SumUp Online Store (recommended)

The Online Store gives customers a real **basket + checkout** (add multiple items, pay once).

1. Log in to **SumUp** → **Online Store** (in the dashboard / SumUp app).
2. Add your products — start with **IKI** and **YUAN** tins: name, price, photos, and stock.
3. Publish the store. You'll get:
   - a **store link** (e.g. `https://yourname.sumupstore.com`), and
   - a **product link** for each item (open a product → copy its page URL).

*(Alternative — **Payment Links**: if you'd rather not run a full store yet, SumUp can create a
pay link for a fixed amount per product. These work too, but they're single-item — no basket.
Either kind of link works in step 2 below.)*

---

## 2) Add the links to your Sheet — a new `buy_url` column on the **Tins** tab

Just like the badge columns, add **one new column** to your existing **Tins** tab:

| name | … | price | buy_url |
|------|---|-------|---------|
| IKI  | … | £24 | https://yourname.sumupstore.com/product/iki |
| YUAN | … | £24 | https://yourname.sumupstore.com/product/yuan |

- **buy_url** = that product's SumUp link (store product page, or a payment link).
- As soon as a product has a `buy_url`, a **"Buy now"** button appears on its card and opens
  SumUp's checkout in a new tab. Leave it blank and the card stays as-is (no button).
- Update the **price** column at the same time so the real price shows.

The same `buy_url` column also works on the **Shop** tab (for Merchandise, Gift Cards, etc.).

---

## 3) Test the whole purchase flow (before launch)

Because it's hosted, you test with a **tiny real payment, then refund it** (two minutes):

1. On the site, click **Buy now** on a tin → you land on SumUp's checkout.
2. Complete a real purchase for a small amount (set a £0.01–£1 test product, or just buy the
   real tin).
3. Check the order appears in your **SumUp dashboard** (Sales / Transactions).
4. **Refund** that test order from the dashboard.

That confirms the full flow end-to-end — basket, checkout, payment, order record — with no
real money kept.

---

## 4) (Optional) Point the top "Shop" button at your store

By default the site's **Shop** button scrolls to the tins (where the Buy buttons are). If you'd
prefer it to open your SumUp store directly, send me the **store link** and I'll wire it up.

---

### What I need back from you
- The **product links** pasted into the `buy_url` column (nothing to send me — just edit the
  sheet; buttons appear automatically), **or** send me the links and I'll add them.
- *(Optional)* the **store link**, if you want the top "Shop" button to open the store.

### At launch
Once tins are buyable, you may want to **remove the "Join the waiting list"** button under the
tins (or keep it for sold-out items). Tell me which and I'll adjust.
