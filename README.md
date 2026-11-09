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

## Set up (about 5 minutes)

You need a Google account; scans are emailed from it. Do steps 1–5 in a browser at **script.google.com**,
signed in to that account.

1. **New project.** Open https://script.google.com and click **New project**. Click *Untitled project* and
   rename it **Slipscanner**.
2. **Paste the code.** In the editor, delete everything in `Code.gs` and paste the contents of
   [`apps-script/Code.js`](apps-script/Code.js) (on that page, the *Copy raw file* button at the top right of the code).
3. **Replace the manifest.** Click ⚙️ **Project Settings** (left bar) and tick
   **Show "appsscript.json" manifest file in editor**. Back in the editor (`<>`), open `appsscript.json` and replace
   its contents with [`apps-script/appsscript.json`](apps-script/appsscript.json). Click 💾 **Save**.
4. **Run setup.** In the function dropdown on the toolbar choose **setup**, then ▶ **Run**.
   - Google asks for permission: choose your account → **Advanced** → **Go to Slipscanner (unsafe)** → **Allow**.
     It says "unsafe" only because it is your own, unverified script. The only permission is *send email as you*.
   - The **Execution log** at the bottom shows the **Token** and the **Allowed addresses** (your own address).
     Copy the token.
5. **Deploy as a web app.** **Deploy → New deployment** → ⚙️ next to *Select type* → **Web app**.
   - *Execute as:* **Me**. *Who has access:* **Anyone**. Click **Deploy**.
   - Copy the **Web app URL** (it ends in `/exec`).
6. **Install the app on the phone.** Open https://chrispienaarthree.github.io/slipscanner/ in Safari → Share → **Add to Home Screen**
   (Android: Chrome menu → *Install app*).
7. **Link the phone.** In the app open **Settings**, paste the web app URL and the token, and tap **Save and test**.
   You should see *Connected. Allowed addresses: …*; the send-to address is filled in for you.
8. **Gmail filter (recommended).** In Gmail, open the search options (▾), set **Subject** to `[SLIP]`,
   click **Create filter**, tick **Apply the label** → *New label* **Slipscanner Inbox** (and **Skip the Inbox** if
   you don't want scans in your inbox).

### More send-to addresses

⚙️ **Project Settings → Script properties → ALLOWED_TO**: add addresses, comma-separated. Then add the same
addresses in the app under **Settings → Send to**. The script refuses any address not on this list, so a leaked
URL and token cannot be used to email anyone else.

### Updating the script

Paste the new `Code.js`, save, then **Deploy → Manage deployments** → ✏️ → *Version:* **New version** → **Deploy**.
The URL stays the same.

### Keep the token private

If it leaks or the phone is lost: delete **TOKEN** under Script properties, run `setup` again, and type the new token
into the app.

## Licence

MIT, see [`LICENSE`](LICENSE). Third-party code: see [`THIRD-PARTY.md`](THIRD-PARTY.md).
