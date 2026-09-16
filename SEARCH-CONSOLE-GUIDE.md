# Getting SANcha found on Google — Search Console setup

**Goal:** tell Google the website exists so it starts showing up in search results.
Right now the site is built and technically ready, but Google hasn't *discovered* it yet.
This guide walks you through the one-time setup. It takes about **10 minutes**.

> **Plain-English summary of what we're doing:**
> 1. Create a free Google Search Console account for the site.
> 2. Prove to Google you own the site (one small verification step).
> 3. Hand Google a "map" of the site (the sitemap).
> 4. Ask Google to look at the homepage now.
> Then wait a few days to ~2 weeks for it to appear in search.

---

## Before you start — which Google account?

Whatever Google account you sign in with becomes an **owner** of the site's search data.
**Use the account you want to own SANcha's Google presence long-term** — ideally a business
Google account (for example one tied to `contact@sanchamatcha.co.uk`), not a personal one you
might lose access to. You can add other people as users later.

If you don't have a business Google account yet, you can create a free one at
[accounts.google.com](https://accounts.google.com) first.

---

## Step 1 — Open Search Console

1. Go to **[search.google.com/search-console](https://search.google.com/search-console)**.
2. Sign in with the Google account you chose above.
3. Click **"Start now"** if prompted.

---

## Step 2 — Add the website

You'll see two boxes: **"Domain"** and **"URL prefix"**. Use **Domain** (it covers the whole
site, including `www` and `https`).

1. In the **Domain** box, type: `sanchamatcha.co.uk`
2. Click **Continue**.
3. Google will show you a **TXT record** — a line of text that looks like
   `google-site-verification=xxxxxxxxxxxxxxxxxxxx`. **Copy it.** Keep this tab open.

---

## Step 3 — Verify you own the domain (add the TXT record in Wix)

The domain is managed in **Wix**, so we prove ownership by adding that line to the domain's
DNS settings.

> ⚠️ **If you don't have access to the Wix domain settings**, send the copied
> `google-site-verification=...` line to whoever manages the domain (your web person) and ask
> them to add it as a **TXT record on the root (`@`) host**. Then skip to Step 4.

If you do have Wix access:

1. In a new tab, sign in to **[wix.com](https://www.wix.com)** and go to
   **Account → Domains** (or **Manage Domains**).
2. Click **`sanchamatcha.co.uk`**, then open **DNS Records** / **Manage DNS**.
3. Find the **TXT** records section and click **Add Record** (or **+ Add**).
   - **Type:** `TXT`
   - **Host / Name:** `@` (this means the root domain; some screens show it blank — that's fine)
   - **Value / Data:** paste the `google-site-verification=...` line from Step 2
   - **TTL:** leave the default
4. **Save.**

> **Important:** this is a *new, separate* record. Do **not** delete or change the existing
> records that point the site to its host — those keep the website online.

5. Go back to the Search Console tab and click **Verify**.
   - If it says "not found," wait 15–60 minutes for the change to spread, then click **Verify**
     again. (DNS changes can take a little while.)

✅ When it says **"Ownership verified,"** you're done with the hard part.

---

## Step 4 — Submit the sitemap

The sitemap is a list of the site's pages that helps Google crawl efficiently.

1. In Search Console (left menu), click **Sitemaps**.
2. Under "Add a new sitemap," type: `sitemap.xml`
3. Click **Submit**.
4. It should show **"Success"** (status may say "Couldn't fetch" for a few minutes right after
   — that usually resolves on its own; check back later).

---

## Step 5 — Ask Google to index the homepage now

1. At the very top of Search Console, use the **search/inspect bar** and paste:
   `https://sanchamatcha.co.uk/`
2. Press Enter. It will say the URL is "not on Google" (expected for now).
3. Click **Request Indexing**.
4. Wait for it to finish the quick test, then you're done.

You can repeat Step 5 for other pages if you like (e.g. add `/privacy/`, `/terms/`), but the
homepage is the important one.

---

## What happens next

- **Indexing:** the site typically starts appearing in Google within a **few days to ~2 weeks**.
  New sites take time — this is normal, not a fault.
- **Check progress:** search Google for `site:sanchamatcha.co.uk`. When pages start listing
  there, you're indexed.
- **Your brand name** ("sancha matcha") should surface first, since it matches the domain and
  business name. Ranking for generic terms like "matcha London" takes longer and grows over time.

---

## Highly recommended bonus — Google Business Profile

Because SANcha has a **physical presence** (Westfield store + market stalls), a free
**Google Business Profile** is the fastest way to show up in **Google Maps** and local
"matcha near me" searches — often faster than normal search indexing.

1. Go to **[business.google.com](https://business.google.com)**.
2. Add your business name **SANcha**, category (e.g. *Tea shop* / *Matcha*), and the
   Westfield store address.
3. Follow the verification steps (usually a postcard, phone, or email).
4. Add photos, opening hours, and your website link `https://sanchamatcha.co.uk`.

---

## Quick checklist

- [ ] Signed into Search Console with the right (business) Google account
- [ ] Added `sanchamatcha.co.uk` as a **Domain** property
- [ ] Added the `google-site-verification` **TXT record** in Wix and **Verified**
- [ ] Submitted `sitemap.xml`
- [ ] Requested indexing for the homepage
- [ ] (Bonus) Created a Google Business Profile

Questions or stuck on a step? Send a screenshot of where you are and we'll sort it.
