# izzie's notebook

A personal second brain: Today, Reading, Writing, Days, Goals and Journal. It is a website that installs like an app on phone and computer, works offline, and syncs through a private Supabase account.

## How it fits together

- `app/` is the whole site. Plain HTML, CSS and JavaScript, no build step.
  - `app.js`: the rooms Today, Reading, Writing, Days and Goals (ported from the approved mockup).
  - `journal.js`: the Journal room, mood and headache on Today, the Monday plan (with goals for the week), On this day, and the monthly wrapped.
  - `remind.js`: turning phone reminders for fixed dates on and off.
  - `sync.js`: saves to the device and syncs with Supabase. Edits made on two devices at once are merged item by item.
  - `boot.js`: sign-in and start-up.
  - `config.js`: the Supabase project URL and anon key.
  - `sw.js`, `manifest.webmanifest`, `icons/`: offline support and "Add to Home Screen".
- `app/supabase/schema.sql`: run once in the Supabase SQL editor.
- `app/supabase/remind/index.ts` and `reminders.sql`: the phone reminders (an Edge Function run every hour). Setup steps: `app/supabase/REMINDERS.md`.
- Light or dark follows the device setting unless "Light" or "Dark" is picked in the footer (saved per device).
- Book covers and search come from Open Library (no account needed).
- Pushing to `main` publishes the site with GitHub Pages (`.github/workflows/pages.yml`).

## Setup

1. Supabase: create a project, run `app/supabase/schema.sql` in the SQL editor, and put the Project URL and anon key in `app/config.js`.
2. Supabase → Authentication → URL Configuration: set Site URL to the GitHub Pages address.
3. GitHub → Settings → Pages: Source = GitHub Actions.

## Tests

```
node tests/merge.test.js
node tests/remind.test.js      # which dates get a reminder
node tests/e2e.js /tmp/shots   # needs Playwright + Chromium
node tests/round6.js /tmp/shots6
```
The end-to-end test uses a stand-in for Supabase (`tests/fake-supabase.js`) to check two devices syncing.
