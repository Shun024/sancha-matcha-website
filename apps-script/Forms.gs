/**
 * SANcha — website forms backend (Google Apps Script).
 *
 * This is the SEPARATE forms project (NOT the checkout). It is container-bound to
 * the content spreadsheet and handles ALL website form submissions through one
 * doPost, routed by the `source` field:
 *   tins-waitlist     -> "Waitlist" tab            (no auto-reply)
 *   wholesale-enquiry -> "Wholesale Enquiries" tab (+ auto-reply)
 *   contact           -> "Contact" tab             (+ auto-reply)
 *   returns-request   -> "Returns" tab             (+ auto-reply)
 *
 * This file is the SOURCE OF TRUTH. To apply changes: open the forms Apps Script
 * project (Extensions ▸ Apps Script on the content sheet), paste this whole file
 * over the existing Code.gs, save, then Deploy ▸ Manage deployments ▸ edit the
 * existing web app ▸ New version ▸ Deploy (keeps the same /exec URL, so nothing on
 * the website changes). On the first run after adding the emails you'll be asked
 * to authorise the Gmail (gmail.send) scope — approve it, or the auto-replies
 * silently won't send.
 *
 * Auto-reply emails are BEST-EFFORT: a mail failure never fails the save.
 * They send FROM whatever account owns/runs this project (reply-to contact@).
 */

var REPLY_TO  = 'contact@sanchamatcha.co.uk';
var FROM_NAME = 'SANcha Matcha';
var SITE_URL  = 'https://sanchamatcha.co.uk';

// Version marker — open the web app's /exec URL in a browser to confirm THIS code
// is the deployed version. If you see this text, the latest forms code is live.
function doGet() {
  return ContentService.createTextOutput(
    'SANcha forms backend v2 — routes: waitlist, wholesale, contact, returns (with auto-replies). ' +
    'If you can read this, the latest code is deployed.');
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
      { name: FROM_NAME, replyTo: REPLY_TO });
  } catch (err) {
    console.error('auto-reply failed: ' + err);
  }
}
