# SANcha — Google Sheet setup (Waiting List, Wholesale form, Badges & FAQ)

Everything below lives in the **same spreadsheet** you already use for the products
(Tins / Shop / Wholesale tabs).

> **What's new in this round:** the waiting-list form now records a marketing-consent
> tick, and there's a brand-new **wholesale enquiry form** you can fully customise from a
> sheet tab. Both forms share the **same** Apps Script you already deployed — you just need
> to **update the script once** (steps below). Your existing `/exec` URL stays the same, so
> nothing needs re-pasting into the site.

---

## 1) Update the forms script (waiting list + wholesale enquiries)

This replaces the earlier waitlist-only script with one that handles **both** forms and
records the consent tick.

1. Open the product spreadsheet → **Extensions ▸ Apps Script**.
2. Select all, delete, and paste this:

```javascript
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var p = (e && e.parameter) || {};
    if (p.source === 'wholesale-enquiry') return saveDynamic(ss, 'Wholesale Enquiries', p);
    return saveWaitlist(ss, p);
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}

function saveWaitlist(ss, p) {
  var sh = ss.getSheetByName('Waitlist');
  if (!sh) { sh = ss.insertSheet('Waitlist'); sh.appendRow(['Timestamp', 'Name', 'Email', 'Consent']); }
  sh.appendRow([new Date(), p.name || '', p.email || '', p.consent || '']);
  return ContentService.createTextOutput('ok');
}

// Writes one column per submitted field. Add new questions to the wholesale form and new
// columns appear here automatically — nothing to edit in this script.
function saveDynamic(ss, tabName, p) {
  var sh = ss.getSheetByName(tabName);
  if (!sh) { sh = ss.insertSheet(tabName); sh.appendRow(['Timestamp']); }
  var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  Object.keys(p).forEach(function (k) {
    if (k === 'source') return;
    if (headers.indexOf(k) === -1) { headers.push(k); sh.getRange(1, headers.length).setValue(k); }
  });
  var row = headers.map(function (h) {
    return h === 'Timestamp' ? new Date() : (p[h] != null ? p[h] : '');
  });
  sh.appendRow(row);
  return ContentService.createTextOutput('ok');
}
```

3. **Re-deploy as a new version** (keeps the same `/exec` URL):
   **Deploy ▸ Manage deployments ▸** pencil/edit icon ▸ *Version:* **New version** ▸ **Deploy**.
4. **One-off tidy-up:** delete the existing **Waitlist** tab (it only has the test row) so it
   rebuilds with the new **Consent** column. It re-creates itself on the next signup.

*(The waiting-list form now shows a consent tick — "I'd like to receive SANcha Matcha product
launch emails and occasional updates. I can unsubscribe at any time." — which people must tick
to join. The tick is recorded in the Consent column as your opt-in record.)*

---

## 2) Product badges → add two columns to the **Tins** tab

👉 **These columns don't exist yet — you add them.** That's why you couldn't find them.
On your existing **Tins** tab, add two new columns with these exact header names (lowercase):

| badge | new |
|-------|-----|
| Signature Blend | yes |
| Single Cultivar | yes |

- **badge** = the type label (shows as a red pill with pink text), e.g. `Signature Blend`,
  `Single Cultivar`. Leave a cell blank for no type badge.
- **new** = `yes` to show the pink **New** badge, or `no`/blank to hide it.

Edit these anytime and the badges on the product images update automatically.
*(Until you add the columns, IKI shows "Signature Blend" + New and YUAN shows "Single
Cultivar" + New by default.)*

---

## 3) FAQ tab — ✅ already live

The FAQ is already pulling from your **FAQ** tab (`question` / `answer`, optional `visible`).
Just edit that tab and the site updates.

---

## 4) Wholesale enquiry form → a "WholesaleForm" tab (you design the questions)

The wholesale section now has a real enquiry **form** (instead of just an email link). You
control every question from the sheet, and every submission is saved automatically.

1. Add a new tab called **WholesaleForm** with these columns (header row, lowercase):

   | question | type | options | required | placeholder |
   |----------|------|---------|----------|-------------|
   | Your name | text | | yes | |
   | Business name | text | | yes | |
   | Email | email | | yes | |
   | Phone | tel | | no | |
   | Business type | select | Café\|Restaurant\|Retailer\|Distributor\|Other | no | |
   | Estimated monthly volume | text | | no | e.g. 2–5 kg |
   | Message | textarea | | no | Anything else we should know? |

   - **question** = the label shown on the form (also becomes the response column header).
   - **type** = `text`, `email`, `tel`, `number`, `textarea`, or `select`.
   - **options** = only for `select` — choices separated by `|` (pipe).
   - **required** = `yes` to make the field mandatory.
   - **placeholder** = optional grey hint text.
   - *(optional `visible` column: `no` hides a row.)*

   Add, remove or reword rows anytime to change the questions. A starter is in
   `assets/wholesale-form-template.csv`.

2. **File ▸ Share ▸ Publish to web** → pick the **WholesaleForm** tab → **CSV** → **Publish**.
3. Copy that link and **send it to me** (I paste it into the site).

**Responses** land automatically in a **Wholesale Enquiries** tab (auto-created on the first
submission), with one column per question. Add a new question later and a new column appears
on its own — no extra setup. *(Until the link is added, the form shows a sensible default set
of fields and still saves responses.)*

---

### What I need back from you
- Confirmation you've **re-deployed the updated script** (step 1). *(Your `/exec` URL is
  unchanged, so I don't need it again unless you created a brand-new deployment.)*
- The **WholesaleForm tab CSV link** (step 4).

*(Badges in step 2 and the FAQ in step 3 need nothing from me — just edit the tabs.)*
