# pu_meet

**Live site: https://pupubear007.github.io/pu_meet/**

A when2meet-style group scheduler with **no date limit**. Create an event, send the link,
everyone paints the times they are free, and the group grid shows when the most people can meet.

- **Any dates, any distance ahead:** move through months (‹ ›) and years (« »), click or drag days,
  or use **Add range** (with an optional "skip weekends") for long spans. Or survey by **days of the week**.
- **Drag to mark availability:** drag a rectangle on your grid, like when2meet. Saves automatically.
- **Live group view:** the group grid updates as people respond, without reloading.
  Darker green = more people; outlined cells = everyone is free.
- **Hover a group cell** to see who is available and who is not.
- **Best times** list ranks the time blocks most people can make.
- **Switch person / sign out** button to enter availability for someone else on the same computer.
- Grids for many dates scroll sideways together; gaps mark skipped days.

Hosting: static files on **GitHub Pages**. Data: **Firebase Firestore** (Google's free database, "Spark" plan, $0/month).

## How to use

1. Open the live site, type an event name, and pick dates (or days of the week).
2. Set **No earlier than / No later than**, the **time slot length** (15, 30 or 60 minutes) and the **time zone**.
3. Click **Create Event**, then **Copy link** and send it to people.
4. Each person types their name, clicks **Sign in**, and drags over the times they are free.
   Signing in again later with the same name (capital letters don't matter) loads and edits that person's row.
5. Use **Switch person / sign out** to fill in for someone else.

## Files

| File | What it does |
|---|---|
| `index.html` | Page shell |
| `app.js` | Create-event page and event page (grids, dragging, best times, sign in/out) |
| `storage.js` | Saves and loads data: Firebase if configured, otherwise the browser's localStorage ("demo mode") |
| `firebase-config.js` | Firebase web keys for project `pu-meet` |
| `settings.js` | Owner settings: auto-delete switch and how many months to keep events |
| `firestore.rules` | Database security rules (paste into Firebase → Firestore → Rules) |
| `style.css` | Styling |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is |

## Run locally

```bash
git clone https://github.com/pupubear007/pu_meet ~/pu_meet
cd ~/pu_meet
python3 -m http.server 8000
# open http://localhost:8000
```

Running locally still uses the real Firebase database. To try it without touching real data,
empty the `apiKey` in `firebase-config.js`: the site then runs in **demo mode** (yellow banner),
saving only in your own browser.

## Setup (already done for this repo — kept for reference or for a fork)

1. **Firebase:** at <https://console.firebase.google.com> create a project → **Databases & Storage → Firestore → Create database**
   (production mode) → **Rules** tab: paste `firestore.rules` and **Publish** →
   **Settings → General → Your apps → `</>` (Web)** → register an app and copy the `firebaseConfig` values into `firebase-config.js`.
   These web keys are meant to be public; the security rules are what protect the data.
2. **GitHub Pages:** repo **Settings → Pages** → Source **Deploy from a branch** → Branch `main`, folder `/ (root)` → **Save**.

## Auto-delete switch (`settings.js`)

```js
export const AUTO_DELETE = false;  // false = you delete events by hand; true = the site deletes expired events
export const KEEP_MONTHS = 2;      // months kept after the event's last date
```

- Every new event stores a delete date (`expireAt`) = last date + 2 months
  ("days of the week" events: 2 months after the latest response). The event page shows it.
- **To switch on:** on GitHub open `settings.js` → pencil icon → change `false` to `true` → **Commit changes**.
  Then in Firebase → **Firestore → Rules**, paste the current `firestore.rules` and **Publish**
  (the rules allow the website to delete an event only after its delete date). The Data Policy page and footer update their wording automatically.
- **How it works (free):** about once a day per visitor's browser, the site deletes up to 10 expired events and their responses.
  So deletion happens when people visit the site, possibly a little after the delete date.
- Firestore's built-in auto-delete ("TTL policy") would do this without visitors, but it requires the paid (Blaze) billing plan.
- Events created before Nov 23, 2026 have no delete date: delete those by hand in the Firebase console.

## Data policy

The same text is shown on the site at **Data Policy** (`#/policy`).

- **Stored:** event name, dates or days of the week, time range, time zone; for each response, the name typed and
  the time slots marked. No email, password, location or accounts. The browser remembers your last-used name per event.
- **Where:** Google Firebase (Cloud Firestore); website on GitHub Pages. Those services may keep standard technical logs.
- **Who can see it:** anyone with an event's link can see all names and availability and edit any response.
  Don't put private or sensitive information in names.
- **How long:** events and their responses are deleted (by hand, or automatically when the switch is on) about **2 months after the event's last date**
  ("days of the week" events: about 2 months after the last response). Deleted data cannot be recovered.
- **Earlier removal:** ask the site owner or open an issue on this repo.
- Hobby project, offered as-is.

## Notes and limits

- Times are shown in the event's time zone. People whose computer is set to another time zone see a reminder to convert.
- Like when2meet without passwords, anyone with the link can edit any name's row. Events and rows cannot be deleted from the site; the owner deletes them in the Firebase console (Firestore → Data → the event → ⋮ → Delete document, including nested data).
- Firestore's free plan allows 50,000 reads and 20,000 writes per day, plenty for a lab or class.
- Event links look like `https://pupubear007.github.io/pu_meet/#/e/<id>`, where the id is a random 10-character string.
- After an update is pushed, GitHub Pages takes about a minute; press Cmd + Shift + R to reload without the cached copy.

## Troubleshooting

Open the browser console (**View → Developer → JavaScript Console**) and look for red errors:

| Error | Meaning |
|---|---|
| `API key not valid` | `apiKey` in `firebase-config.js` has a typo |
| `Missing or insufficient permissions` | Firestore rules not published (or changed) |
| `database ... does not exist` | Firestore database has not been created |
