# pu_meet

A when2meet-style scheduler with **no date limit**: pick any number of dates, any distance ahead
(use ‹ › / « » to move through months and years, or "Add range" for long spans), or survey by days of the week.

- Static site → hosted free on **GitHub Pages** (`https://<your-username>.github.io/pu_meet/`)
- Responses stored in **Firebase Firestore** (Google's free database; the "Spark" plan costs nothing)
- Live updates: when someone fills in the grid, everyone's group view updates without reloading
- Drag a rectangle to mark availability (like when2meet), hover the group grid to see who is free,
  and a "Best times" list ranks the time blocks most people can make

Without Firebase set up, it runs in **demo mode** (saved only in your own browser) — good for trying it out.

## Files

| File | What it does |
|---|---|
| `index.html` | Page shell |
| `app.js` | Create-event page and event page (grids, dragging, best times) |
| `storage.js` | Saves/loads data: Firebase if configured, otherwise browser localStorage |
| `firebase-config.js` | **You paste your Firebase keys here** |
| `firestore.rules` | Database security rules to paste into Firebase |
| `style.css` | Styling |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

## 1. Try it locally

```bash
cd ~/pu_meet
python3 -m http.server 8000
# open http://localhost:8000
```

## 2. Set up Firebase (free, ~5 minutes)

1. Go to <https://console.firebase.google.com> → **Add project** → name it `pu-meet` (Google Analytics can be turned off).
2. Left menu → **Build → Firestore Database** → **Create database** → pick a location (e.g. `us-central`) → start in **production mode**.
3. In Firestore, open the **Rules** tab, replace everything with the contents of `firestore.rules`, click **Publish**.
4. Project Overview (gear icon) → **Project settings** → **Your apps** → click the web icon `</>` → register an app named `pu_meet` (no hosting needed).
5. Copy the `firebaseConfig` values it shows into `firebase-config.js`.

The Firebase web keys are meant to be public (they only identify the project); the security rules are what protect the data.

## 3. Publish on GitHub Pages

```bash
cd ~/pu_meet
git init
git add .
git commit -m "pu_meet: when2meet-style scheduler"
gh repo create pupubear007/pu_meet --public --source=. --push
# (or create the repo on github.com and: git remote add origin ... && git push -u origin main)
```

Then on GitHub: repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save.
After ~1 minute the site is at `https://pupubear007.github.io/pu_meet/`.

## Notes and limits

- Times are shown in the event's time zone (chosen when creating); people in other time zones see a reminder to convert.
- Like when2meet without passwords, anyone with the link can edit any name's row.
- Firestore's free plan allows 50,000 reads and 20,000 writes per day — plenty for a lab or class.
- Each event's link is `.../#/e/<id>`; ids are random 10-character strings.
