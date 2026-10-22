# SANcha — Google Sheet setup for Waiting List, Badges & FAQ

Everything below lives in the **same spreadsheet** you already use for the products
(Tins / Shop / Wholesale tabs). Do these three one-time steps and send the two links back.

---

## 1) Waiting list → a new "Waitlist" tab (collects name + email)

The signup form on the site needs a tiny free script to drop entries into your Sheet.

1. Open the product spreadsheet → **Extensions ▸ Apps Script**.
2. Delete anything in the editor and paste this:

```javascript
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Waitlist');
    if (!sh) {
      sh = ss.insertSheet('Waitlist');
      sh.appendRow(['Timestamp', 'Name', 'Email', 'Source']);
    }
    var p = (e && e.parameter) || {};
    sh.appendRow([new Date(), p.name || '', p.email || '', p.source || '']);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}
```

3. Click **Deploy ▸ New deployment** → gear icon ▸ **Web app**.
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - **Deploy**, approve the permissions prompt.
4. Copy the **Web app URL** (ends in `/exec`) and **send it to me**.

It auto-creates the **Waitlist** tab the first time someone signs up. At launch, you email
everyone from that tab (Gmail mail-merge or a bulk tool). *(No URL yet = the form still works
and thanks people, but nothing is saved until the URL is pasted in.)*

---

## 2) Product badges → two columns on the **Tins** tab

Add two columns to your existing Tins tab (header row, lowercase):

| badge | new |
|-------|-----|
| Signature Blend | yes |
| Single Cultivar | yes |

- **badge** = the type label (red pill / pink text), e.g. `Signature Blend`, `Single Cultivar`. Leave blank for none.
- **new** = `yes` to show the pink **New** badge (pink pill / red text), or `no`/blank to hide it.

Change these anytime and the badges on the product images update automatically.
*(Until you add the columns, IKI shows "Signature Blend" + New and YUAN shows "Single Cultivar" + New by default.)*

---

## 3) FAQ → a new "FAQ" tab

1. Add a new tab called **FAQ** with two columns (header row): `question` and `answer`
   (optional `visible` column: `no` hides a row). See `assets/faq-sheet-template.csv` for the
   starter content.
2. **File ▸ Share ▸ Publish to web** → pick the **FAQ** tab → **CSV** → **Publish**.
3. Copy that link and **send it to me** (I paste it into the site, same as the other tabs).

Until the link is added, the site shows the built-in FAQ as a safe fallback.

---

### What I need back from you
- The **Web app `/exec` URL** from step 1 (waiting list).
- The **FAQ tab CSV link** from step 3.

(Badges in step 2 need nothing from me — just edit the Tins tab.)
