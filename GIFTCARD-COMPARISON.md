# Gift Cards: SumUp built-in vs Custom-built — Comparison
*For the SANcha partners · 2026-11-14*

## Context
We're deciding between **SumUp's built-in gift card feature** (free, already part of our SumUp
account) and **building a custom gift-card system** on our website. The original reason to consider
custom was **Apple/Google Wallet** integration — but we've decided that's **not needed**; customers
can simply receive their gift cards **by email**. With wallet off the table, here's how the two compare.

## At a glance
| | **SumUp built-in** | **Custom-built** |
|---|---|---|
| Build cost | **£0** (already included) | **One-off build fee** (quoted separately) |
| Running cost | SumUp 2.5% per sale | SumUp 2.5% per sale — **same** |
| Delivered by email with a code | ✅ | ✅ |
| Where it's bought | A SumUp-hosted page (separate link) | On **our own website**, in our branding |
| **Redeem in the shop** | ✅ shown at the SumUp till | ✅ staff look it up (manual step) |
| **Redeem online (on our website)** | ❌ **in-store only** | ✅ **can be spent at online checkout** |
| Balance / part-spending | Tracked by SumUp (in-store) | Tracked in **our own Google Sheet** |
| Data ownership | In SumUp's system | In our own sheet |
| Apple/Google Wallet | ❌ | ✅ possible later — **but we've decided we don't need it** |
| Setup & upkeep | None — SumUp handles it | Custom code we build + maintain |

## The one question that decides it
Running costs are the **same** either way, and wallet is no longer a requirement — so the whole
decision comes down to one thing:

> **Do we need customers to be able to spend a gift card *online* (to buy tins on our website)?**

- **No — gift cards only redeemed in the shop** → **Use SumUp's built-in gift cards.** Free, nothing
  to build, nothing to maintain.
- **Yes — gift cards should work online too** → **Custom build.** It's the only option that lets a gift
  card be spent on the website (SumUp's can't).

## What the extra cost actually buys
The "additional cost of a custom system" is essentially a **one-off build fee** — running costs are
identical. In return you get:
1. **Online redemption** — the big one: gift cards usable on the website.
2. A gift-card purchase that lives **on our own branded site** (vs a separate SumUp link).
3. Gift-card data held in **our own Google Sheet**.

*(Apple/Google Wallet would be a further add-on — no longer a requirement.)*

## Recommendation
Given wallet is no longer needed: **if gift cards will only ever be redeemed in the shop, SumUp's free
built-in feature is the sensible choice** — it does the email-a-code, redeem-in-store job at no cost
or maintenance. **The custom build is only worth the spend if we specifically want gift cards to be
spendable online.**

**A sensible middle path:** launch with **SumUp's free gift cards now**, and build the custom
online-redeemable version **later, only if** customers actually start wanting to use gift cards
online — so we don't pay for capability we may not use.
