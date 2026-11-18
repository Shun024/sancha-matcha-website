/**
 * SANcha — website forms backend (Google Apps Script).
 *
 * This is the SEPARATE forms project (NOT the checkout). It handles ALL website
 * form submissions through one doPost, routed by the `source` field:
 *   tins-waitlist     -> "Waitlist" tab            (no auto-reply)
 *   wholesale-enquiry -> "Wholesale Enquiries" tab (+ auto-reply)
 *   contact           -> "Contact" tab             (+ auto-reply)
 *   returns-request   -> "Returns" tab             (+ auto-reply)
 *
 * RUNS EITHER WAY (see getSS_):
 *   • STANDALONE under contact@ (RECOMMENDED for go-live) — set a Script Property
 *     SHEET_ID = <the content sheet's id>. Running under the domain Workspace
 *     account makes auto-replies send FROM contact@ (DKIM-aligned → inbox, not
 *     spam), and returns@/business@ send-as aliases become usable.
 *   • CONTAINER-BOUND (the original dev setup) — no SHEET_ID property; it uses the
 *     spreadsheet it is bound to.
 *
 * This file is the SOURCE OF TRUTH. To apply changes: paste this whole file over
 * the project's Code.gs, save, then Deploy ▸ Manage deployments ▸ edit the web app
 * ▸ New version ▸ Deploy (keeps the same /exec URL). On the first run after adding
 * the emails you'll be asked to authorise the Gmail (gmail.send) + Sheets scopes —
 * approve them, or the auto-replies silently won't send.
 *
 * Auto-reply emails are BEST-EFFORT: a mail failure never fails the save.
 * They send FROM the branded alias per form type (reply-to contact@).
 */

// Returns the content spreadsheet. Standalone (contact@): reads SHEET_ID from
// Script Properties. Container-bound (dev): falls back to the bound spreadsheet.
function getSS_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

var REPLY_TO  = 'contact@sanchamatcha.co.uk';
var FROM_NAME = 'SANcha Matcha';
var SITE_URL  = 'https://sanchamatcha.co.uk';

// Branded sender per form type. For these to actually send FROM these addresses,
// this project must RUN UNDER a Workspace account that has each one set up as a
// verified "Send mail as" alias (Gmail ▸ Settings ▸ Accounts). Until an alias
// exists, fromFor_ falls back to the account's own address so mail still sends.
var FROM_BY_KIND = {
  contact:   'contact@sanchamatcha.co.uk',
  returns:   'returns@sanchamatcha.co.uk',
  wholesale: 'business@sanchamatcha.co.uk'
};
function fromFor_(kind) {
  try {
    var addr = FROM_BY_KIND[kind];
    if (addr && GmailApp.getAliases().indexOf(addr) > -1) return { from: addr };
  } catch (e) { /* no alias access → fall through */ }
  return {};
}

// Run ONCE from the editor (Run ▸ authorizeEmail) to grant the Gmail send
// permission and confirm it works — the form auto-replies need this. It emails a
// confirmation to you (the script owner). Approve the Gmail prompt when asked.
function authorizeEmail() {
  var me = Session.getActiveUser().getEmail();
  GmailApp.sendEmail(me, 'SANcha forms — email authorised ✓',
    'If you received this, the forms script can now send auto-reply emails to customers.\n\n— SANcha Matcha',
    { name: FROM_NAME, replyTo: REPLY_TO });
}

// Version marker — open the web app's /exec URL in a browser to confirm THIS code
// is the deployed version. If you see this text, the latest forms code is live.
function doGet() {
  return ContentService.createTextOutput(
    'SANcha forms backend v2 — routes: waitlist, wholesale, contact, returns (with auto-replies). ' +
    'If you can read this, the latest code is deployed.');
}

function doPost(e) {
  try {
    var ss = getSS_();
    var p = (e && e.parameter) || {};
    switch (p.source) {
      case 'wholesale-enquiry':
        saveDynamic(ss, 'Wholesale Enquiries', p);
        autoReply_(p, 'We’ve received your wholesale enquiry', 'wholesale');
        break;
      case 'contact':
        saveDynamic(ss, 'Contact', p);
        autoReply_(p, 'We’ve received your message', 'contact');
        break;
      case 'returns-request':
        // Save any uploaded photo/video evidence to Drive first; store the links
        // (not the base64) in the sheet. Best-effort — a file error never fails the save.
        try {
          var links = saveReturnEvidence_(p);
          if (links.length) p.Evidence = links.join('\n');
        } catch (ev) { console.error('evidence save failed: ' + ev); }
        delete p.evidence_json;   // never write the raw base64 into the sheet
        saveDynamic(ss, 'Returns', p);
        autoReply_(p, 'We’ve received your return request', 'returns');
        break;
      default:
        saveWaitlist(ss, p);
    }
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}

function saveWaitlist(ss, p) {
  var sh = ss.getSheetByName('Waitlist');
  if (!sh) { sh = ss.insertSheet('Waitlist'); sh.appendRow(['Timestamp', 'Name', 'Email', 'Consent']); }
  sh.appendRow([new Date(), p.name || '', p.email || '', p.consent || '']);
}

// --- Returns evidence (photos/videos) ------------------------------------
// The returns form sends `evidence_json` = a JSON array of { name, type, data }
// where `data` is base64. We decode each, save it to a Drive folder, and return
// the file links to store in the sheet. Requires the Drive scope — on the first
// run after adding this you'll be re-prompted to authorise (then redeploy).
var RETURNS_FOLDER = 'SANcha Returns Evidence';
function saveReturnEvidence_(p) {
  var raw = p.evidence_json;
  if (!raw) return [];
  var files;
  try { files = JSON.parse(raw); } catch (e) { return []; }
  if (!files || !files.length) return [];
  var parent = getOrCreateFolder_(RETURNS_FOLDER);
  var who = String(p['Order number'] || p.Name || 'return').replace(/[^\w \-]/g, '').trim() || 'return';
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyy-MM-dd HH:mm');
  var sub = parent.createFolder(who + ' — ' + stamp);
  var links = [];
  files.forEach(function (f, i) {
    try {
      var bytes = Utilities.base64Decode(f.data);
      var blob = Utilities.newBlob(bytes, f.type || 'application/octet-stream', f.name || ('evidence-' + (i + 1)));
      var file = sub.createFile(blob);
      // Viewable by anyone who has the link (the links live only in the private
      // Returns sheet). Lets staff open evidence from any account, no domain juggling.
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (sh) {}
      links.push(file.getUrl());
    } catch (fe) { console.error('evidence file ' + (i + 1) + ' failed: ' + fe); }
  });
  return links;
}
function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

// Run ONCE from the editor (Run ▸ setupReturnsEvidence) BEFORE redeploying. It
// forces the Drive-permission prompt (which the returns upload needs) and creates
// the "SANcha Returns Evidence" folder so you can see it. After approving Drive,
// Deploy ▸ Manage deployments ▸ New version so the web app picks up the Drive scope
// — without that redeploy the live form saves the row but silently skips the files.
function setupReturnsEvidence() {
  var f = getOrCreateFolder_(RETURNS_FOLDER);
  Logger.log('Returns evidence folder ready: ' + f.getUrl());
  return f.getUrl();
}

// Writes one column per submitted field. Add a new form field and a new column
// appears here automatically — nothing to edit in this script.
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
}

// Best-effort branded auto-reply to the submitter. `kind` selects the message body.
function autoReply_(p, subject, kind) {
  try {
    var to = p.Email || p.email || '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return;   // no valid email -> skip quietly
    var first = (p.Name || p.name || '').toString().trim().split(/\s+/)[0];
    var hi = first ? ('Hi ' + first + ',') : 'Hi there,';
    var line = {
      wholesale: 'Thanks for your wholesale enquiry — we’ve received it and will be in touch with pricing and samples shortly.',
      contact:   'Thanks for getting in touch — we’ve received your message and will get back to you as soon as we can.',
      returns:   'Thanks — we’ve received your return request and our team will be in touch with the next steps within 1–2 working days.'
    }[kind] || 'Thanks — we’ve received your message and will be in touch shortly.';
    GmailApp.sendEmail(to, subject + ' — SANcha',
      hi + '\n\n' + line + '\n\n— SANcha Matcha\n' + SITE_URL,
      Object.assign({ name: FROM_NAME, replyTo: REPLY_TO }, fromFor_(kind)));
  } catch (err) {
    console.error('auto-reply failed: ' + err);
  }
}
