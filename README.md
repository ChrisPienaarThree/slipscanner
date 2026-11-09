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
6. **Install the app on the phone**, see [Install on the phone](#install-on-the-phone) below.
7. **Link the phone.** In the app open **⚙︎ Settings**, paste the web app URL and the token (see
   [Find the /exec URL](#find-the-exec-url) and [Find the token](#find-the-token)), and tap **Save and test**.
   You should see *Connected. Allowed addresses: …*; the send-to address is filled in for you.
8. **Gmail filter (recommended).** In Gmail, open the search options (▾), set **Subject** to `[SLIP]`,
   click **Create filter**, tick **Apply the label** → *New label* **Slipscanner Inbox** (and **Skip the Inbox** if
   you don't want scans in your inbox).

## Install on the phone

The app is a web page that installs like an app. Install it from the browser, then **always open it from the
Home Screen icon**. The installed app keeps its own storage, separate from the browser tab, so Settings and scans
entered in a browser tab do not appear in the installed app.

### iPhone or iPad, Safari

1. Open **Safari** and go to https://chrispienaarthree.github.io/slipscanner/. Wait until the page has loaded (you see *New document*).
2. Tap the **Share** button (a square with an arrow pointing up).
   - iPhone: at the bottom of the screen. If the bar at the bottom only shows the address, tap **•••** next to it
     first, then **Share**.
   - iPad: at the top right, next to the address.
3. Scroll down the list and tap **Add to Home Screen**.
   If it is not there: scroll to the bottom, tap **Edit Actions…** and add **Add to Home Screen**.
4. Keep the name **Slipscanner**. If you see **Open as Web App**, leave it switched on. Tap **Add** (top right).
5. Go to the Home Screen and open **Slipscanner** from its icon.
6. The first time you tap **📷 Camera**, allow camera access.

### iPhone or iPad, Chrome (iOS 16.4 or newer)

1. Open **Chrome** and go to https://chrispienaarthree.github.io/slipscanner/.
2. Tap the **Share** button in the address bar (top right; a square with an arrow).
3. Tap **Add to Home Screen** (scroll down if needed), keep the name, tap **Add**.
4. Open **Slipscanner** from the Home Screen icon.

### Android, Chrome

1. Open **Chrome** and go to https://chrispienaarthree.github.io/slipscanner/.
2. Tap the **⋮** menu (top right) → **Add to Home screen** or **Install app**.
3. Tap **Install** (or **Add**), and confirm **Add to home screen** if asked.
4. Open **Slipscanner** from the Home screen or the app drawer. Allow camera access when asked.

### Updates

Open the app once with signal: it fetches the newest version by itself. The version number is at the bottom of
**⚙︎ Settings**.

## Find the /exec URL

The app needs the **web app URL** of your deployment. It ends in **`/exec`**.

1. In the script editor click **Deploy → Manage deployments**.
2. Select the active deployment (left). Under **Web app**, the **URL** is shown: click **Copy**.
   It looks like `https://script.google.com/macros/s/AKfy…long code…/exec`.
3. Not the URL from **Deploy → Test deployments**: that one ends in `/dev` and only works in your own signed-in
   browser, not from the app.

You can check the URL by opening it in a browser: it says *Slipscanner script is running*.

## Find the token

The token is the password for your script. `setup` made it: 48 letters and numbers. The app sends it with every
scan; the script ignores anything without it.

- **Script properties:** in the script editor click ⚙️ **Project Settings** (left bar) and scroll down to
  **Script properties**. The value next to **TOKEN** is the token. Select it and copy it.
- **Or the execution log:** in the editor choose **setup** in the function dropdown and click ▶ **Run**. The log at
  the bottom shows `Token (keep private): …`. Running `setup` again shows the same token; it does not change it.

**Getting the URL and token onto the phone:** on a Mac with the same Apple ID and Handoff switched on, copy on the
Mac and paste on the iPhone (Universal Clipboard). Or open the script editor on the phone and copy from there.
Don't send the token by email or chat.

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
