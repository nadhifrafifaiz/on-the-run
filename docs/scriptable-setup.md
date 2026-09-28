# Scriptable widget setup

Step-by-step guide to get an iOS home-screen widget showing your training data.

## What you need

- iPhone or iPad
- [Scriptable](https://scriptable.app) app from App Store (free)
- The web app deployed on Vercel (or running locally & reachable — Vercel URL is easier)
- 5 minutes

## 1. Deploy the app (once)

If you haven't yet, push to your Vercel project. Once deployed you'll have a public URL like:

```
https://on-the-run.vercel.app
```

The widget hits this URL — it does **not** run locally.

## 2. Mint an API token

1. Open the app (browser) → **Setelan** (Settings)
2. Scroll to **Widget & API**
3. Enter a name (e.g. `iPhone widget`) → tap **Buat token**
4. **Copy the token immediately** — it's shown once and never again.
   It looks like `otr_ab12cd34ef56...`

If you lose it, just revoke and mint a new one.

## 3. Install the widget script

1. Open Scriptable on your iPhone → tap **+** (top-right)
2. Copy the entire contents of `docs/scriptable-widget.js` from this repo, or
   grab it from the "Contoh template Scriptable" collapsible in Settings
3. Paste into Scriptable
4. Edit these two lines at the top:

   ```javascript
   const BASE_URL = "https://on-the-run.vercel.app";    // your Vercel URL
   const TOKEN    = "otr_ab12cd34ef56...";              // your token
   ```

5. Tap the script name at the top → rename to `on-the-run` → **Done**
6. Tap ▶︎ at bottom-right to preview

If you see your today's session or "Rest day" — it works.
If you see "Error", check that BASE_URL has no trailing slash and TOKEN is correct.

## 4. Add to home screen

1. Long-press an empty area on the home screen → **+** (top-left) → search **Scriptable**
2. Pick the widget size (Small is enough for now)
3. Tap **Add Widget**
4. Tap the newly-added widget once (while still in edit mode)
5. Set **Script** = `on-the-run`
6. Tap outside to save

Done. The widget refreshes automatically (iOS decides when — usually every ~15 min).

## Optional: store token in Keychain

If you don't want the token sitting as plaintext in your script:

Run once in Scriptable (from a fresh script):

```javascript
Keychain.set("otr_token", "otr_your_actual_token_here");
```

Then in `on-the-run.js`, replace the TOKEN constant with:

```javascript
const TOKEN = Keychain.get("otr_token");
```

The token now lives in iOS Keychain, not the script body.

## Available endpoints

All require `Authorization: Bearer <token>`.

| Path | Returns |
|---|---|
| `GET /api/v1/today` | Today's date, planned sessions (with blocks + items), today's logged activities, weekly summary |
| `GET /api/v1/week` | Weekly summary + compact list of all sessions this week |
| `GET /api/v1/next-race` | Next upcoming race + days-to-race |

Response envelope: `{ data, error, message }`. On success `error` is `null`, on failure `data` is `null` and `error.code` / `error.message` describe the problem.

## Troubleshooting

**401 Unauthorized** — Token wrong, revoked, or `Authorization: Bearer ` prefix missing.

**Empty todaySessions** — No session planned for today. Not an error.

**Widget shows "Error"** — Tap the widget → Scriptable opens the script → look at Console. Common causes:
- typo in `BASE_URL` (extra slash, wrong subdomain)
- token was revoked
- app not deployed to Vercel yet (widget can't reach `localhost`)
