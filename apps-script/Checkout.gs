/**
 * SANcha — SumUp checkout backend (Google Apps Script).  [SCAFFOLD]
 *
 * Deploy as a Web App:  Deploy ▸ New deployment ▸ Web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Then paste the /exec URL into assets/checkout.js (CHECKOUT_ENDPOINT).
 *
 * Secrets live in  Project Settings ▸ Script properties  (never in this file / the repo):
 *   SUMUP_API_KEY   = SANDBOX secret key while testing; swap to the LIVE key at go-live
 *   SUMUP_MERCHANT  = matching SANDBOX merchant code; swap to LIVE at go-live
 *   ORDER_ALERT_TO  = email address that should be notified on each new order
 *   SHEET_ID        = the product spreadsheet's ID (from its URL:
 *                     docs.google.com/spreadsheets/d/<SHEET_ID>/edit)
 *
 * Catalogue + stock are read from the "Tins" (and "Shop") tabs; orders are written
 * to an auto-created "Orders" tab.
 *
 * IMPORTANT: this is a SEPARATE Apps Script project from the forms doPost
 * (waitlist/wholesale) — one project can only have one doPost. Because it's
 * standalone (not bound to the sheet) it opens the sheet by SHEET_ID.
 */

var SUMUP_API = 'https://api.sumup.com/v0.1';
var CURRENCY  = 'GBP';

/* --- Shipping (UK) --------------------------------------------------------
 * CONFIRM WITH CLIENT, then set these. Defaults = free shipping (no change to
 * the total), so the checkout behaves exactly as before until a rate is set.
 *   SHIPPING_FLAT      flat delivery charge per order, in GBP (0 = free).
 *   SHIPPING_FREE_OVER subtotal at/above which delivery is free (null = never). */
var SHIPPING_FLAT      = 0;      // TODO client: e.g. 3.95
var SHIPPING_FREE_OVER = null;   // TODO client: e.g. 40  (free over £40)

/* --- VAT ------------------------------------------------------------------
 * CONFIRM WITH CLIENT. 'none' = not VAT-registered (no VAT line, current
 * behaviour). 'inc' = prices already include VAT (show a note, no maths).
 * 'add' = add VAT on top at the rate below. Set VAT_NUMBER for receipts. */
var VAT_MODE   = 'none';         // TODO client: 'none' | 'inc' | 'add'
var VAT_RATE   = 0.20;           // used only when VAT_MODE === 'add'
var VAT_NUMBER = '';             // TODO client: registration number for receipts

function props_()   { return PropertiesService.getScriptProperties(); }
function cfg_(k)     { return props_().getProperty(k) || ''; }
// Standalone project → open the sheet by ID; falls back to bound sheet if present.
function getSS_()    { var id = cfg_('SHEET_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function json_(obj)  { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'createCheckout': return json_(createCheckout_(req));
      case 'finalizeOrder':  return json_(finalizeOrder_(req));
      default:               return json_({ error: 'unknown action' });
    }
  } catch (err) {
    return json_({ error: String(err) });
  }
}

/* 1) Create a SumUp checkout for the submitted cart.
 * Every line is re-validated against the sheet (price + stock) and the total is
 * computed HERE, server-side — the browser can never set its own price. */
function createCheckout_(req) {
  var cart = req.cart || [];
  if (!cart.length) throw new Error('empty cart');

  var products = loadProducts_();
  var lines = [], subtotal = 0;
  cart.forEach(function (item) {
    var p = products[normKey_(item.id || item.name)];
    if (!p) throw new Error('unknown product: ' + (item.id || item.name));
    var qty = Math.max(1, parseInt(item.qty, 10) || 1);
    if (p.stock != null && qty > p.stock) throw new Error('out of stock: ' + p.name);
    subtotal += p.price * qty;
    lines.push({ key: p.key, name: p.name, qty: qty, price: p.price });
  });
  var shipping = shipping_(subtotal);
  var total    = round2_(subtotal + shipping);

  var reference = 'SANCHA-' + Date.now() + '-' + Math.floor(Math.random() * 1e4);
  var checkout = sumup_('POST', '/checkouts', {
    checkout_reference: reference,
    amount: total,
    currency: CURRENCY,
    merchant_code: cfg_('SUMUP_MERCHANT'),
    description: 'SANcha order ' + reference
  });

  // Stash the validated order so finalize can trust it (keyed by reference).
  stashPending_(reference, {
    lines: lines, subtotal: round2_(subtotal), shipping: round2_(shipping),
    total: total, customer: req.customer || {}
  });
  return {
    checkoutId: checkout.id, reference: reference,
    subtotal: round2_(subtotal), shipping: round2_(shipping),
    amount: total, currency: CURRENCY
  };
}

/* UK delivery charge for a given subtotal. Free by default until the client
 * sets SHIPPING_FLAT / SHIPPING_FREE_OVER above. */
function shipping_(subtotal) {
  if (!SHIPPING_FLAT) return 0;
  if (SHIPPING_FREE_OVER != null && subtotal >= SHIPPING_FREE_OVER) return 0;
  return SHIPPING_FLAT;
}

/* 2) Finalise after the card widget reports success.
 * Re-checks the REAL status with SumUp (never trust the browser), then records
 * the order, decrements stock, and sends the emails. */
function finalizeOrder_(req) {
  if (!req.checkoutId) throw new Error('missing checkoutId');
  var co = sumup_('GET', '/checkouts/' + encodeURIComponent(req.checkoutId), null);
  if (co.status !== 'PAID') return { ok: false, status: co.status };

  var pending = popPending_(co.checkout_reference) || {};
  recordOrder_(co, pending);
  decrementStock_(pending.lines || []);
  sendConfirmation_(co, pending);
  sendAlert_(co, pending);
  return { ok: true, status: 'PAID', reference: co.checkout_reference };
}

/* --- SumUp REST helper ---------------------------------------------------- */
function sumup_(method, path, body) {
  var opts = {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + cfg_('SUMUP_API_KEY') },
    muteHttpExceptions: true
  };
  if (body) opts.payload = JSON.stringify(body);
  var resp = UrlFetchApp.fetch(SUMUP_API + path, opts);
  var code = resp.getResponseCode(), text = resp.getContentText();
  if (code < 200 || code >= 300) throw new Error('SumUp ' + code + ': ' + text);
  return text ? JSON.parse(text) : {};
}

/* --- Catalogue + stock (from the sheet) ----------------------------------- */
// Returns { key: { key, name, price(Number), stock(Number|null), tab, row } }
function loadProducts_() {
  var out = {};
  ['Tins', 'Shop'].forEach(function (tab) {
    var sh = getSS_().getSheetByName(tab);
    if (!sh) return;
    var values = sh.getDataRange().getValues();
    if (values.length < 2) return;
    var head = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var iName = head.indexOf('name') > -1 ? head.indexOf('name') : head.indexOf('title');
    var iPrice = head.indexOf('price'), iStock = head.indexOf('stock');
    for (var r = 1; r < values.length; r++) {
      var name = String(values[r][iName] || '').trim();
      if (!name) continue;
      out[normKey_(name)] = {
        key: normKey_(name),
        name: name,
        price: parsePrice_(values[r][iPrice]),
        stock: iStock > -1 && values[r][iStock] !== '' ? Number(values[r][iStock]) : null,
        tab: tab, row: r + 1, stockCol: iStock > -1 ? iStock + 1 : null
      };
    }
  });
  return out;
}

function decrementStock_(lines) {
  var products = loadProducts_();
  lines.forEach(function (l) {
    var p = products[l.key];
    if (!p || p.stock == null || !p.stockCol) return;
    var sh = getSS_().getSheetByName(p.tab);
    sh.getRange(p.row, p.stockCol).setValue(Math.max(0, p.stock - l.qty));
  });
}

/* --- Orders tab + pending stash ------------------------------------------- */
function recordOrder_(co, pending) {
  var ss = getSS_();
  var sh = ss.getSheetByName('Orders');
  if (!sh) { sh = ss.insertSheet('Orders'); sh.appendRow(['Timestamp','Reference','Status','Name','Email','Items','Total','Currency']); }
  var c = pending.customer || {};
  var items = (pending.lines || []).map(function (l) { return l.qty + '× ' + l.name; }).join(', ');
  sh.appendRow([new Date(), co.checkout_reference, co.status, c.name || '', c.email || '', items, pending.total, co.currency || CURRENCY]);
}
function stashPending_(ref, data) { props_().setProperty('PENDING_' + ref, JSON.stringify(data)); }
function popPending_(ref) {
  var k = 'PENDING_' + ref, v = props_().getProperty(k);
  if (v) props_().deleteProperty(k);
  return v ? JSON.parse(v) : null;
}

/* --- Emails --------------------------------------------------------------- */
var FROM_NAME = 'SANcha Matcha';
var REPLY_TO  = 'contact@sanchamatcha.co.uk';
// TODO go-live: send FROM a branded address (orders@sanchamatcha.co.uk) via a
// verified Gmail "Send mail as" alias — add { from: ... } below once set up.
function sendConfirmation_(co, pending) {
  var c = pending.customer || {};
  if (!c.email) return;
  // TODO: on-brand HTML template (logo/colours) + the client's thank-you copy.
  var items = (pending.lines || []).map(function (l) { return l.qty + '× ' + l.name; }).join('<br>');
  GmailApp.sendEmail(c.email, 'Your SANcha order ' + co.checkout_reference, '', {
    name: FROM_NAME,
    replyTo: REPLY_TO,
    htmlBody: 'Thank you for your order!<br><br>' + items + '<br><br>Total: £' + pending.total
  });
}
function sendAlert_(co, pending) {
  var to = cfg_('ORDER_ALERT_TO');
  if (!to) return;
  var c = pending.customer || {};
  var items = (pending.lines || []).map(function (l) { return l.qty + '× ' + l.name; }).join(', ');
  GmailApp.sendEmail(to, 'New SANcha order ' + co.checkout_reference,
    'Reference: ' + co.checkout_reference +
    '\nCustomer: ' + (c.name || '') + ' <' + (c.email || '') + '>' +
    '\nItems: ' + items + '\nTotal: £' + pending.total,
    { name: FROM_NAME, replyTo: c.email || REPLY_TO });
}

/* --- utils ---------------------------------------------------------------- */
function normKey_(s)   { return String(s || '').trim().toLowerCase(); }
function round2_(n)    { return Math.round(n * 100) / 100; }
function parsePrice_(v){ return Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')) || 0; }
