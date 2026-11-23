// ===== pu_meet owner settings =====
// Edit this file on GitHub (pencil icon → Commit changes); the site updates in about a minute.

// Auto-delete switch.
//   false → events are kept until you delete them yourself in the Firebase console.
//   true  → visitors' browsers quietly delete expired events (at most once a day per browser, up to 10 at a time).
// Every new event always records its delete date (expireAt), so you can switch this on later
// and older events made after Nov 23, 2026 will still be cleaned up.
export const AUTO_DELETE = false;

// How many months after the event's last date it is kept
// ("days of the week" events: months after the latest response).
export const KEEP_MONTHS = 2;
