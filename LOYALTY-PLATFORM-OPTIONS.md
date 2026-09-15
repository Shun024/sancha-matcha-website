# SANcha — Online / Redemption Platform Options

**Purpose:** choosing the platform that will (a) take online payments for tins and
(b) let customers redeem the loyalty "free tin" voucher — **online *and* in store**.

*Prices are UK, as of September 2026 — always confirm current pricing on the provider's
site before committing. Transaction % is what you pay the platform on each sale.*

---

## What actually matters for our decision

1. **In person + online.** SANcha sells at markets/stalls *and* wants an online shop, so
   ideally one system handles both (one login, one card reader, one set of fees).
2. **Single-use "free tin" voucher.** The loyalty reward must be redeemable **once** and
   work in both channels, so it can't be reused or shared.
3. **Low ongoing maintenance.** A hosted platform means no servers, security, or code to
   maintain — just normal business admin (refunds, issuing vouchers).

Whatever we pick, the *rest* of the loyalty flow is identical: unique serial on each card →
scan QR → intake form + photo → manual review → issue a single-use code. The platform only
decides **how the free-tin code is enforced at checkout.**

---

## At a glance

| | Monthly cost | Online fee | In-person fee | Single-use voucher | In-person + online | Maintenance |
|---|---|---|---|---|---|---|
| **SumUp** | £0 (pay-as-you-go) | 2.5% | 1.69% | ⚠️ needs confirming (codes / gift cards) | ✅ one system | Very low |
| **Wix Stores** | ~£16–25/mo | varies | via Wix POS | ✅ built-in | ✅ (POS add-on) | Very low |
| **Shopify** | £19–25/mo | 2.0% + 25p | 1.7% (POS) | ✅ built-in | ✅ (POS add-on) | Very low |
| **Stripe (hosted)** | £0 | ~1.5% + 20p | needs Stripe Terminal | ✅ built-in promo codes | Online-first | Low |
| **Full custom build** | hosting only | you choose gateway | you build it | you build it | you build it | **High + permanent** |

---

## 1. SumUp

**What it is:** payments company popular with UK market traders — card reader for in person,
plus a free hosted online store, gift cards and discount codes, all in one account.

**Pros**
- **No monthly fee** — pay-as-you-go, cheapest to start.
- In-person rate **1.69%**; card reader ~£25–29 one-off; **free** online store included.
- One system covers **stall + website + gift cards** — great if you already use (or would use)
  a SumUp reader at markets.
- Fully hosted → **no technical maintenance**.

**Cons**
- Online store is **more basic** than Wix/Shopify (fine for a small tin range).
- Online transaction fee **2.5%** is higher than the others.
- ⚠️ **Voucher is the open question:** SumUp *has* discount codes, but we could **not confirm**
  they can be **single-use / 100%-off**. A **gift card** loaded with one tin's value may be the
  cleaner "free tin" tool (tracks a balance, works online + in store) — **needs confirming with
  SumUp**.

**Best for:** lowest cost and simplest setup, *especially if selling in person is central.*

---

## 2. Wix Stores

**What it is:** the shop add-on to a Wix website. **The domain is already in Wix**, so this is
the most "joined-up" option if the client wants everything under one Wix roof.

**Pros**
- **Single-use coupons built in** — can limit a coupon to one use total or one per customer,
  incl. percentage / fixed-amount. ✅ solves the voucher cleanly.
- Integrates with the **existing Wix account & domain** — one dashboard.
- In-person selling via **Wix mobile POS** (available UK, excl. Northern Ireland).
- Fully hosted → **no technical maintenance**.

**Cons**
- **Monthly fee** (eCommerce plans ~£16–25/mo annual; more if paying monthly).
- In-person POS is newer/less established than SumUp or Shopify.
- Ties the shop to Wix (harder to move later).

**Best for:** keeping everything in the Wix ecosystem the client already has, with proper
single-use vouchers.

---

## 3. Shopify

**What it is:** the most established dedicated eCommerce platform — powerful, robust, huge
app ecosystem.

**Pros**
- **Single-use discount codes built in** — limit total uses or one-per-customer; supports
  bulk **unique** codes (via apps). ✅ strongest voucher tooling.
- In-person **Shopify POS** at **1.7%** with a card reader (~£49); online **2.0% + 25p**.
- Most reliable and scalable; best if the brand grows.
- Fully hosted → **no technical maintenance**.

**Cons**
- **Monthly fee** (Basic £19/mo annual, £25/mo monthly) — most expensive baseline.
- Full **in-person POS Pro is £65/mo** extra (basic POS is included, may be enough).
- More features than a small tin shop strictly needs.

**Best for:** if the client wants the most robust, "serious" store and expects to grow.

---

## 4. Stripe (hosted middle-path — keep our current site)

**What it is:** we keep the site we built and bolt on **Stripe-hosted checkout** for payments,
using Stripe's **built-in single-use promotion codes** for the voucher.

**Pros**
- **No monthly fee**; competitive online rate (~1.5% + 20p).
- Stripe handles all the scary payment security (PCI) — **very low maintenance**.
- **Single-use promo codes built in.** ✅
- Keeps our existing custom-designed site (no rebuild on a store platform).

**Cons**
- **Online-first.** In-person needs a separate **Stripe Terminal** reader + more setup —
  less convenient than SumUp/Shopify/Wix for a casual market stall.
- Slightly more technical to set up than a click-together store (a little "glue" code),
  though upkeep afterwards is light.

**Best for:** if online is the main channel and the client wants to avoid monthly fees while
keeping the bespoke website.

---

## 5. Full custom build (build the store + payments ourselves)

**What it is:** hand-build the catalogue, cart, checkout, payments, orders and voucher logic.

**Pros**
- Total control and no platform fees.

**Cons**
- **High effort** and, critically, **permanent maintenance** — security patching, PCI
  compliance, fraud, refunds, tax, uptime — **forever**, owned by us on the client's behalf.
- Everything the platforms above give for free, we'd build and keep alive.

**Best for:** essentially no one at this scale. **Not recommended.**

---

## Recommendation

- **Selling in person is central & want lowest cost →** **SumUp** (pending the voucher
  confirmation below).
- **Want everything under the existing Wix account, with proper single-use vouchers →**
  **Wix Stores.**
- **Want the most robust store and room to grow →** **Shopify.**
- **Online-first, no monthly fee, keep our custom site →** **Stripe middle-path.**
- **Full custom →** not worth the permanent liability.

**Leading candidate: SumUp** — lowest cost, one system for stall + web + gift cards, no
maintenance — *provided* it can enforce the free-tin voucher.

### The one thing to confirm before choosing SumUp
Ask SumUp support:
> "In the SumUp online store, can I create a **discount code that is 100%-off (a free item)**
> and **limited to a single use**? If not, can I **issue individual gift cards** (loaded with a
> set value) that can be redeemed **once, both online and in store**?"

A clear **yes** makes SumUp the front-runner. A **no** points to **Wix Stores** (already in
their ecosystem) or **Shopify** — both of which have single-use vouchers built in.
