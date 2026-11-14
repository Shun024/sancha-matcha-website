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
 * Royal Mail: £3.75 flat, up to 2kg (~65 tins) — well beyond any realistic
 * order, so a single flat rate is fine. Free delivery at/above £40 subtotal.
 *   SHIPPING_FLAT      flat delivery charge per order, in GBP (0 = free).
 *   SHIPPING_FREE_OVER subtotal at/above which delivery is free (null = never). */
var SHIPPING_FLAT      = 3.75;   // Royal Mail flat, up to 2kg
var SHIPPING_FREE_OVER = 40;     // free over £40

/* --- VAT ------------------------------------------------------------------
 * Client is VAT-registered; prices already INCLUDE VAT ('inc' = show a note +
 * the VAT number on receipts, no maths — the displayed price is the price paid).
 * 'none' = not registered; 'add' = add VAT on top at the rate below.
 * NOTE: VAT rate on the matcha itself is unconfirmed — loose tea is normally
 * ZERO-rated UK food, so there may be no VAT element despite registration.
 * We show the number + "incl. VAT" note and deliberately do NOT print a 20%
 * breakdown until the client confirms the rate. */
var VAT_MODE   = 'inc';          // 'none' | 'inc' | 'add'
var VAT_RATE   = 0.20;           // used only when VAT_MODE === 'add'
var VAT_NUMBER = '526 9478 48';  // registration number for receipts

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
      case 'notifyMe':       return json_(notifyMe_(req));
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
  // Emails are best-effort: the payment has already succeeded and the order is
  // recorded, so a mail failure (e.g. auth/quota) must NOT fail the response —
  // otherwise the customer sees an error and may pay again. Log and carry on.
  var emailError = null;
  try { sendConfirmation_(co, pending); sendAlert_(co, pending); }
  catch (mailErr) { emailError = String(mailErr); console.error('order email failed: ' + emailError); }
  return { ok: true, status: 'PAID', reference: co.checkout_reference, emailError: emailError };
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
var ORDERS_HEADER = ['Timestamp','Reference','Status','Name','Email','Items','Total','Currency','Tracking','Dispatched'];
function recordOrder_(co, pending) {
  var ss = getSS_();
  var sh = ss.getSheetByName('Orders');
  if (!sh) { sh = ss.insertSheet('Orders'); sh.appendRow(ORDERS_HEADER); }
  var c = pending.customer || {};
  var items = (pending.lines || []).map(function (l) { return l.qty + '× ' + l.name; }).join(', ');
  // Tracking + Dispatched are filled later by the client (triggers the dispatch email).
  sh.appendRow([new Date(), co.checkout_reference, co.status, c.name || '', c.email || '', items, pending.total, co.currency || CURRENCY, '', '']);
}
function stashPending_(ref, data) { props_().setProperty('PENDING_' + ref, JSON.stringify(data)); }
function popPending_(ref) {
  var k = 'PENDING_' + ref, v = props_().getProperty(k);
  if (v) props_().deleteProperty(k);
  return v ? JSON.parse(v) : null;
}

/* --- Emails --------------------------------------------------------------- */
var FROM_NAME = 'SANcha Matcha';
var FROM_EMAIL = 'orders@sanchamatcha.co.uk';          // branded sender (see fromOpt_)
var REPLY_TO  = 'contact@sanchamatcha.co.uk';
var SITE_URL  = 'https://sanchamatcha.co.uk';
var LOGO_URL  = SITE_URL + '/assets/logo-cream.png';   // cream logo for the dark header
// TODO client: approve / replace this thank-you line.
var THANKYOU_COPY = 'Thank you for your order — every tin is whisked and packed with care. ' +
  'We\'ll email you tracking as soon as it\'s on its way.';
// Shown as a dedicated "Delivery" line on the receipt.
var DELIVERY_ESTIMATE = 'Dispatched within 1–2 working days &middot; Royal Mail delivery in 2–3 days';
// Business details for the receipt footer (legal name + registered address + VAT).
var BUSINESS_FOOTER = 'VS Partners Ltd trading as SANcha &middot; ' +
  '3rd Floor, 86-90 Paul Street, London, England, EC2A 4NE' +
  ' &middot; Company No. 16185759' +
  (VAT_NUMBER ? ' &middot; VAT ' + VAT_NUMBER : '') + '<br>sanchamatcha.co.uk';

/* Send FROM the branded orders@ address — but ONLY once it's been set up as a
 * verified "Send mail as" alias on the sending Gmail account (Gmail ▸ Settings ▸
 * Accounts ▸ Send mail as). Until then, including an unverified `from` throws, so
 * we fall back to the account's own address and the branded FROM_NAME. */
function fromOpt_() {
  try {
    if (FROM_EMAIL && GmailApp.getAliases().indexOf(FROM_EMAIL) > -1) return { from: FROM_EMAIL };
  } catch (e) { /* no alias access → fall through */ }
  return {};
}

// Brand palette (kept in sync with index.html :root)
var C_GREEN = '#293D30', C_CREAM = '#FFF4D6', C_MAROON = '#6C2C25',
    C_STONE = '#c9b79a', C_LINE = '#e7ddbe';

function gbp_(n) { return '£' + (Number(n) || 0).toFixed(2); }

/* Run this ONCE from the Apps Script editor (Run ▸ authorizeAndPreviewEmail) to
 * grant the Gmail (gmail.send) permission and send yourself a sample of the
 * branded confirmation email. Clears the "authorization required" error that
 * otherwise makes order emails fail silently. Sends to the signed-in owner. */
function authorizeAndPreviewEmail() {
  var co = { checkout_reference: 'SANCHA-TEST-0001', status: 'PAID', currency: 'GBP' };
  var pending = {
    lines: [{ name: 'IKI', qty: 1, price: 24 }, { name: 'YUAN', qty: 2, price: 26 }],
    subtotal: 76, shipping: 0, total: 76,
    customer: {
      name: 'Test Buyer', email: Session.getActiveUser().getEmail(),
      address: '1 Test Street, Testville', postcode: 'TE5 7ST'
    }
  };
  sendConfirmation_(co, pending);
}

function sendConfirmation_(co, pending) {
  var c = pending.customer || {};
  if (!c.email) return;
  GmailApp.sendEmail(c.email, 'Your SANcha order ' + co.checkout_reference,
    confirmationText_(co, pending), Object.assign({   // plain-text fallback
      name: FROM_NAME,
      replyTo: REPLY_TO,
      htmlBody: confirmationHtml_(co, pending)
    }, fromOpt_()));
}

// Plain-text fallback for clients that don't render HTML.
function confirmationText_(co, pending) {
  var lines = (pending.lines || []).map(function (l) {
    return '  ' + l.qty + ' x ' + l.name + '  ' + gbp_(l.price * l.qty);
  }).join('\n');
  var t = 'Thank you for your order!\n\nOrder ' + co.checkout_reference + '\n\n' + lines +
    '\n\nSubtotal: ' + gbp_(pending.subtotal != null ? pending.subtotal : pending.total);
  if (pending.shipping) t += '\nShipping: ' + gbp_(pending.shipping);
  else if (pending.subtotal != null) t += '\nShipping: Free';
  t += '\nTotal: ' + gbp_(pending.total);
  if (VAT_MODE === 'inc') t += '\n\nAll prices include VAT' + (VAT_NUMBER ? ' (VAT no. ' + VAT_NUMBER + ')' : '') + '.';
  t += '\n\nDelivery: ' + DELIVERY_ESTIMATE.replace(/&middot;/g, '·');
  t += '\n\n' + SITE_URL;
  return t;
}

// On-brand HTML confirmation. Table layout + inline styles for email-client
// compatibility; absolute image/URL paths; web-safe font fallbacks.
function confirmationHtml_(co, pending) {
  var c = pending.customer || {};
  var rows = (pending.lines || []).map(function (l) {
    return '<tr>' +
      '<td style="padding:10px 0;border-bottom:1px solid ' + C_LINE + ';color:' + C_GREEN + ';font-size:15px;">' +
        '<strong>' + l.qty + '&times;</strong> ' + escHtml_(l.name) + '</td>' +
      '<td align="right" style="padding:10px 0;border-bottom:1px solid ' + C_LINE + ';color:' + C_GREEN + ';font-size:15px;white-space:nowrap;">' +
        gbp_(l.price * l.qty) + '</td></tr>';
  }).join('');

  var hasBreak = pending.subtotal != null;
  var shipTxt = pending.shipping ? gbp_(pending.shipping) : 'Free';
  var totalsRows =
    (hasBreak ? totalRow_('Subtotal', gbp_(pending.subtotal), false) +
                totalRow_('Shipping', shipTxt, false) : '') +
    totalRow_('Total', gbp_(pending.total), true);

  var addr = [c.name, c.address, c.postcode].filter(function (x) { return x; })
    .map(escHtml_).join('<br>');

  return '' +
  '<!doctype html><html><body style="margin:0;padding:0;background:' + C_LINE + ';">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C_LINE + ';padding:24px 0;">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:' + C_CREAM + ';border-radius:14px;overflow:hidden;font-family:Georgia,\'Times New Roman\',serif;">' +
        // header
        '<tr><td align="center" style="background:' + C_GREEN + ';padding:28px 24px;">' +
          '<img src="' + LOGO_URL + '" alt="SANcha Matcha" width="150" style="display:block;border:0;max-width:150px;height:auto;"></td></tr>' +
        // body
        '<tr><td style="padding:32px 32px 8px;">' +
          '<h1 style="margin:0 0 6px;color:' + C_GREEN + ';font-size:24px;font-weight:normal;">Thank you for your order</h1>' +
          '<p style="margin:0 0 4px;color:' + C_MAROON + ';font-size:13px;letter-spacing:.08em;text-transform:uppercase;">Order ' + escHtml_(co.checkout_reference) + '</p>' +
          '<p style="margin:16px 0 0;color:' + C_GREEN + ';font-size:15px;line-height:1.6;">' + escHtml_(THANKYOU_COPY) + '</p>' +
        '</td></tr>' +
        // order summary
        '<tr><td style="padding:16px 32px 8px;">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows + totalsRows + '</table>' +
          (VAT_MODE === 'inc' ? '<p style="margin:10px 0 0;color:' + C_STONE + ';font-size:12px;">All prices include VAT' +
            (VAT_NUMBER ? ' &middot; VAT no. ' + escHtml_(VAT_NUMBER) : '') + '.</p>' : '') +
        '</td></tr>' +
        // delivery estimate
        '<tr><td style="padding:16px 32px 0;">' +
          '<p style="margin:0 0 6px;color:' + C_MAROON + ';font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Delivery</p>' +
          '<p style="margin:0;color:' + C_GREEN + ';font-size:15px;line-height:1.5;">' + DELIVERY_ESTIMATE + '</p></td></tr>' +
        // delivery address
        (addr ? '<tr><td style="padding:16px 32px;">' +
          '<p style="margin:0 0 6px;color:' + C_MAROON + ';font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Delivering to</p>' +
          '<p style="margin:0;color:' + C_GREEN + ';font-size:15px;line-height:1.5;">' + addr + '</p></td></tr>' : '') +
        // footer
        '<tr><td style="padding:24px 32px 32px;border-top:1px solid ' + C_LINE + ';">' +
          '<p style="margin:0;color:' + C_GREEN + ';font-size:13px;line-height:1.6;">Questions? Just reply to this email and it\'ll reach us at ' + REPLY_TO + '.</p>' +
          '<p style="margin:12px 0 0;color:' + C_STONE + ';font-size:12px;">' + BUSINESS_FOOTER + '</p>' +
        '</td></tr>' +
      '</table>' +
    '</td></tr>' +
  '</table></body></html>';
}

function totalRow_(label, value, bold) {
  var w = bold ? 'bold' : 'normal';
  var top = bold ? 'border-top:2px solid ' + C_GREEN + ';' : '';
  var size = bold ? '17px' : '14px';
  return '<tr>' +
    '<td style="padding:8px 0;' + top + 'color:' + C_GREEN + ';font-size:' + size + ';font-weight:' + w + ';">' + label + '</td>' +
    '<td align="right" style="padding:8px 0;' + top + 'color:' + C_GREEN + ';font-size:' + size + ';font-weight:' + w + ';white-space:nowrap;">' + value + '</td></tr>';
}

function escHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    Object.assign({ name: FROM_NAME, replyTo: c.email || REPLY_TO }, fromOpt_()));
}

/* --- Back-in-stock waitlist (per product) ---------------------------------
 * Separate from the general launch list (that posts to the forms project). Here
 * each signup is tied to a SPECIFIC sold-out product so we can email exactly the
 * people waiting on it when it's restocked. Stored in a "Waitlist" tab. */
// Own tab — do NOT reuse the general launch-list "Waitlist" tab (different columns).
var WAITLIST_TAB = 'Stock Waitlist';
var WAITLIST_HEADER = ['Timestamp','ProductKey','Product','Name','Email','Status','Notified'];

// doPost action: a customer asks to be told when a sold-out product is restocked.
function notifyMe_(req) {
  var email = String(req.email || '').trim();
  var name  = String(req.name  || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('valid email required');

  var p = loadProducts_()[normKey_(req.product || req.id || req.name)];
  if (!p) throw new Error('unknown product');

  var ss = getSS_(), sh = ss.getSheetByName(WAITLIST_TAB);
  if (!sh) { sh = ss.insertSheet(WAITLIST_TAB); sh.appendRow(WAITLIST_HEADER); }

  // Dedup: if this email is already 'Waiting' for this product, don't add again.
  var rows = sh.getDataRange().getValues();
  for (var r = 1; r < rows.length; r++) {
    if (normKey_(rows[r][1]) === p.key &&
        String(rows[r][4]).trim().toLowerCase() === email.toLowerCase() &&
        String(rows[r][5]).trim().toLowerCase() === 'waiting') {
      return { ok: true, already: true };
    }
  }
  sh.appendRow([new Date(), p.key, p.name, name, email, 'Waiting', '']);
  try { sendWaitlistConfirm_(email, name, p.name); }
  catch (mailErr) { console.error('waitlist confirm email failed: ' + mailErr); }
  return { ok: true };
}

/* --- Installable onEdit: dispatch emails + restock notifications ----------
 * ONE trigger on the product/orders spreadsheet. Run installTriggers() ONCE
 * from the editor to create it (and grant the permissions).
 *   - type a Royal Mail tracking number into Orders ▸ Tracking  → dispatch email
 *   - raise a sold-out stock cell in Tins/Shop above 0          → back-in-stock blast
 * Only single-cell edits fire (uses e.value / e.oldValue), so a paste or bulk
 * edit can't accidentally trigger a blast. */
function onSheetEdit_(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet(), tab = sh.getName();
    if (tab === 'Orders') return onOrdersEdit_(e, sh);
    if (tab === 'Tins' || tab === 'Shop') return onStockEdit_(e, sh);
  } catch (err) { console.error('onSheetEdit_ failed: ' + err); }
}

// 0-based index of a header (case-insensitive), or -1.
function headerIndex_(sh, name) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); })
    .indexOf(String(name).toLowerCase());
}

// Dispatch email when a Tracking number is entered on an order not yet shipped.
function onOrdersEdit_(e, sh) {
  var iTrack = headerIndex_(sh, 'tracking');
  if (iTrack < 0 || e.range.getColumn() !== iTrack + 1 || e.range.getRow() < 2) return;
  var tracking = String(e.value || e.range.getValue() || '').trim();
  if (!tracking) return;   // cleared, not set

  var col = {};
  sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .forEach(function (h, i) { col[String(h).trim().toLowerCase()] = i; });
  var row = sh.getRange(e.range.getRow(), 1, 1, sh.getLastColumn()).getValues()[0];

  if (col.dispatched != null && String(row[col.dispatched]).trim()) return;  // already dispatched
  var email = String(row[col.email] || '').trim();
  if (!email) return;
  sendDispatch_(email, {
    name: row[col.name] || '', reference: row[col.reference] || '',
    items: row[col.items] || '', tracking: tracking
  });
  if (col.dispatched != null) sh.getRange(e.range.getRow(), col.dispatched + 1).setValue(new Date());
}

// Back-in-stock blast when a sold-out item is restocked (stock 0/blank → >0).
function onStockEdit_(e, sh) {
  var iStock = headerIndex_(sh, 'stock');
  if (iStock < 0 || e.range.getColumn() !== iStock + 1 || e.range.getRow() < 2) return;
  var oldV = e.oldValue, newV = Number(e.value);
  if (!(newV > 0)) return;
  if (!(oldV === undefined || oldV === '' || Number(oldV) <= 0)) return;  // was in stock → not a restock

  var iName = headerIndex_(sh, 'name'); if (iName < 0) iName = headerIndex_(sh, 'title');
  if (iName < 0) return;
  var name = String(sh.getRange(e.range.getRow(), iName + 1).getValue() || '').trim();
  if (name) notifyWaitlist_(normKey_(name), name);
}

// Email everyone currently 'Waiting' for a product, then mark them 'Notified'
// so a later restock won't email the same people again. New signups after this
// come in as 'Waiting' and get the NEXT restock's email only.
function notifyWaitlist_(productKey, productName) {
  var sh = getSS_().getSheetByName(WAITLIST_TAB);
  if (!sh) return;
  var values = sh.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (normKey_(values[r][1]) !== productKey) continue;
    if (String(values[r][5]).trim().toLowerCase() !== 'waiting') continue;
    var email = String(values[r][4] || '').trim(), name = String(values[r][3] || '').trim();
    if (!email) continue;
    try {
      sendBackInStock_(email, name, productName);
      sh.getRange(r + 1, 6).setValue('Notified');
      sh.getRange(r + 1, 7).setValue(new Date());
    } catch (mailErr) { console.error('back-in-stock email failed for ' + email + ': ' + mailErr); }
  }
}

/* Run ONCE from the editor (Run ▸ installTriggers) to create the onEdit trigger
 * and authorize it. Safe to re-run — clears any previous copy first. */
function installTriggers() {
  var id = cfg_('SHEET_ID');
  if (!id) throw new Error('set SHEET_ID in Script properties first');
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onSheetEdit_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetEdit_').forSpreadsheet(id).onEdit().create();
}

/* --- Branded transactional emails (dispatch / waitlist) ------------------- */
function royalMailTrack_(t) {
  return 'https://www.royalmail.com/track-your-item#/tracking-results/' + encodeURIComponent(t);
}
function ctaButton_(href, label) {
  return '<p style="margin:20px 0 0;"><a href="' + href + '" style="display:inline-block;background:' +
    C_GREEN + ';color:' + C_CREAM + ';text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;">' +
    label + '</a></p>';
}
function firstName_(name) { return name ? ', ' + escHtml_(String(name).trim().split(/\s+/)[0]) : ''; }

function sendDispatch_(email, o) {
  var url = royalMailTrack_(o.tracking);
  var inner =
    '<h1 style="margin:0 0 6px;color:' + C_GREEN + ';font-size:24px;font-weight:normal;">Your order\'s on its way</h1>' +
    (o.reference ? '<p style="margin:0 0 4px;color:' + C_MAROON + ';font-size:13px;letter-spacing:.08em;text-transform:uppercase;">Order ' + escHtml_(o.reference) + '</p>' : '') +
    '<p style="margin:16px 0 0;color:' + C_GREEN + ';font-size:15px;line-height:1.6;">Good news' + firstName_(o.name) +
      ' — your SANcha order has been dispatched via Royal Mail' + (o.items ? ' (' + escHtml_(o.items) + ')' : '') + '.</p>' +
    '<p style="margin:16px 0 0;color:' + C_GREEN + ';font-size:15px;line-height:1.6;">Tracking number: <strong>' + escHtml_(o.tracking) + '</strong></p>' +
    ctaButton_(url, 'Track your parcel');
  GmailApp.sendEmail(email, 'Your SANcha order is on its way' + (o.reference ? ' (' + o.reference + ')' : ''),
    'Your SANcha order has been dispatched via Royal Mail.\nTracking number: ' + o.tracking +
    '\nTrack it: ' + url + '\n\n' + SITE_URL,
    Object.assign({ name: FROM_NAME, replyTo: REPLY_TO, htmlBody: brandEmail_(inner) }, fromOpt_()));
}

function sendBackInStock_(email, name, product) {
  var inner =
    '<h1 style="margin:0 0 6px;color:' + C_GREEN + ';font-size:24px;font-weight:normal;">It\'s back in stock</h1>' +
    '<p style="margin:0 0 4px;color:' + C_MAROON + ';font-size:13px;letter-spacing:.08em;text-transform:uppercase;">' + escHtml_(product) + '</p>' +
    '<p style="margin:16px 0 0;color:' + C_GREEN + ';font-size:15px;line-height:1.6;">Good news' + firstName_(name) +
      ' — <strong>' + escHtml_(product) + '</strong> is back in stock. Tins tend to go quickly, so grab yours while they last.</p>' +
    ctaButton_(SITE_URL + '#tins', 'Shop now');
  GmailApp.sendEmail(email, product + ' is back in stock — SANcha',
    product + ' is back in stock! Shop now: ' + SITE_URL + '#tins\n\n' + SITE_URL,
    Object.assign({ name: FROM_NAME, replyTo: REPLY_TO, htmlBody: brandEmail_(inner) }, fromOpt_()));
}

function sendWaitlistConfirm_(email, name, product) {
  var inner =
    '<h1 style="margin:0 0 6px;color:' + C_GREEN + ';font-size:24px;font-weight:normal;">You\'re on the list</h1>' +
    '<p style="margin:0 0 4px;color:' + C_MAROON + ';font-size:13px;letter-spacing:.08em;text-transform:uppercase;">' + escHtml_(product) + '</p>' +
    '<p style="margin:16px 0 0;color:' + C_GREEN + ';font-size:15px;line-height:1.6;">Thanks' + firstName_(name) +
      ' — we\'ll email you the moment <strong>' + escHtml_(product) + '</strong> is back in stock. You only need to sign up once.</p>';
  GmailApp.sendEmail(email, 'You\'re on the waiting list — SANcha',
    'Thanks — we\'ll email you the moment ' + product + ' is back in stock.\n\n' + SITE_URL,
    Object.assign({ name: FROM_NAME, replyTo: REPLY_TO, htmlBody: brandEmail_(inner) }, fromOpt_()));
}

// Shared on-brand HTML shell: dark header w/ cream logo, cream card, footer.
function brandEmail_(innerHtml) {
  return '' +
  '<!doctype html><html><body style="margin:0;padding:0;background:' + C_LINE + ';">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C_LINE + ';padding:24px 0;">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:' + C_CREAM + ';border-radius:14px;overflow:hidden;font-family:Georgia,\'Times New Roman\',serif;">' +
        '<tr><td align="center" style="background:' + C_GREEN + ';padding:28px 24px;">' +
          '<img src="' + LOGO_URL + '" alt="SANcha Matcha" width="150" style="display:block;border:0;max-width:150px;height:auto;"></td></tr>' +
        '<tr><td style="padding:32px 32px 24px;">' + innerHtml + '</td></tr>' +
        '<tr><td style="padding:20px 32px 28px;border-top:1px solid ' + C_LINE + ';">' +
          '<p style="margin:0;color:' + C_GREEN + ';font-size:13px;line-height:1.6;">Questions? Just reply to this email and it\'ll reach us at ' + REPLY_TO + '.</p>' +
          '<p style="margin:12px 0 0;color:' + C_STONE + ';font-size:12px;">' + BUSINESS_FOOTER + '</p>' +
        '</td></tr>' +
      '</table>' +
    '</td></tr>' +
  '</table></body></html>';
}

/* --- utils ---------------------------------------------------------------- */
function normKey_(s)   { return String(s || '').trim().toLowerCase(); }
function round2_(n)    { return Math.round(n * 100) / 100; }
function parsePrice_(v){ return Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')) || 0; }
