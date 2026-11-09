# Slipscanner

A phone app (PWA) that scans slips and invoices to PDF and keeps them **on the phone until they are safely emailed**
to an address you choose. Works offline.

**Open the app:** https://chrispienaarthree.github.io/slipscanner/ – on iPhone, Safari → Share → *Add to Home Screen*.

- **Scan:** take a photo (or pick a photo or PDF already on the phone). The app finds the slip's edges, you can drag
  the corners, and it straightens the page and cleans it up (black and white or colour). Several pages make one PDF.
- **Details (optional):** slip date, amount, paid with, a note, and which address to send to.
- **Outbox:** scans wait on the phone (IndexedDB) and are emailed when there is signal. Each scan has an ID, so a
  retry never sends it twice. Sent scans are deleted from the phone 30 days after sending.
- **Sync:** a small Google Apps Script (in `apps-script/`) in your own Google account emails each PDF, only to
  addresses you have allowed. Its only permission is *send mail*: it cannot read your mail.
- Tip: in Gmail, make a filter for subject `[SLIP]` that applies a label, so all scans land in one place.
- No libraries, no tracking. Nothing is sent anywhere except through your own Apps Script.

## Set up the Apps Script

1. Go to script.google.com → *New project*. Paste `apps-script/Code.js`, and replace `appsscript.json`
   (show it under *Project Settings*).
2. *Deploy → New deployment → Web app*, execute as *Me*, access *Anyone*. Allow access when asked.
3. Run `setup` once. The execution log shows the web app URL and the token: type them into the app's Settings.
4. More addresses: *Project Settings → Script properties → ALLOWED_TO*, comma-separated.

## Licence

MIT, see [`LICENSE`](LICENSE). Third-party code: see [`THIRD-PARTY.md`](THIRD-PARTY.md).
