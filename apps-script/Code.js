// Slipscanner – mail side. Standalone Apps Script, deployed as a web app (execute as me, anyone with the link).
// The phone posts one scan at a time: { token, item, pdf (base64) }. The script emails the PDF to the address chosen on
// the phone, which must be on the ALLOWED_TO list in Script properties (so a leaked URL + token cannot spam anyone else).
// Scope: script.send_mail only (plus your own address) – this script cannot read, label or delete mail.
// On the receiving Gmail, a filter on subject "[SLIP]" (or the +slips address) applies the label "Slipscanner Inbox".

var MAX_BYTES = 20 * 1024 * 1024;

// Run once from the editor: makes a token, allows your own address, and logs what to type into the phone.
// More addresses: Project Settings > Script properties > ALLOWED_TO, comma-separated.
function setup() {
  var p = PropertiesService.getScriptProperties(), me = Session.getEffectiveUser().getEmail();
  if (!p.getProperty('TOKEN')) p.setProperty('TOKEN', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  if (!p.getProperty('ALLOWED_TO')) p.setProperty('ALLOWED_TO', me);
  console.log('Web app URL: ' + (ScriptApp.getService().getUrl() || 'Deploy > New deployment > Web app first'));
  console.log('Token (keep private): ' + p.getProperty('TOKEN'));
  console.log('Allowed addresses: ' + p.getProperty('ALLOWED_TO'));
  console.log('New token: delete TOKEN under Project Settings > Script properties, run setup, type the new token into the phone.');
}

function allowed_() {
  return String(PropertiesService.getScriptProperties().getProperty('ALLOWED_TO') || '').split(',')
    .map(function (s) { return s.trim().toLowerCase(); }).filter(String);
}

function doPost(e) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var b = JSON.parse(e.postData.contents);
    var p = PropertiesService.getScriptProperties(), token = p.getProperty('TOKEN');
    if (!token || b.token !== token) return json_({ ok: false, error: 'bad token' });
    if (b.ping) return json_({ ok: true, allowed: allowed_() });
    var it = b.item || {};
    if (!/^[\w-]{6,64}$/.test(String(it.id))) throw new Error('not a Slipscanner record');
    if (p.getProperty('id_' + it.id)) return json_({ ok: true, duplicate: true });   // shortcut: ids kept in script properties (500 kB ≈ 10 000 slips), move to a sheet if that fills
    var to = String(it.to || '').trim().toLowerCase();
    if (allowed_().indexOf(to) < 0) throw new Error('address not allowed: ' + to + ' (add it to ALLOWED_TO in the script)');
    var pdf = Utilities.base64Decode(String(b.pdf || ''));
    if (pdf.length < 100 || pdf.length > MAX_BYTES) throw new Error('PDF missing or too large');
    if (String.fromCharCode(pdf[0], pdf[1], pdf[2], pdf[3], pdf[4]) !== '%PDF-') throw new Error('not a PDF');
    var file = (it.date || 'scan') + '_slip_' + it.id + '.pdf';
    MailApp.sendEmail({ to: to, name: 'Slipscanner', subject: subject_(it), body: body_(it), attachments: [Utilities.newBlob(pdf, 'application/pdf', file)] });
    p.setProperty('id_' + it.id, new Date().toISOString());
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally { lock.releaseLock(); }
}

function clean_(s) { return String(s || '').replace(/[\r\n]+/g, ' ').slice(0, 80); }
// Subject carries the tags for a quick look; the body carries them as JSON for the Mac side.
function subject_(it) {
  return ['[SLIP]', it.date, it.paidWith || '-', it.amount ? 'R' + Number(it.amount).toFixed(2) : '-', clean_(it.note) || '-', 'id ' + it.id].join(' · ');
}
function body_(it) {
  var tags = { id: it.id, date: it.date, paidWith: clean_(it.paidWith), amount: it.amount || '', note: clean_(it.note), pages: it.pages || '', source: it.source || '', scanned: it.created || '' };
  return 'Scanned with Slipscanner. Tags:\nSLIPSCANNER ' + JSON.stringify(tags) + '\n';
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
