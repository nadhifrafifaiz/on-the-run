// ============================================================
// on-the-run — Scriptable widget
// ============================================================
// Setup:
//   1. Install "Scriptable" from the App Store (free).
//   2. In the on-the-run web app: Settings → Widget & API →
//      "Buat token baru" → copy the plaintext token (shown once).
//   3. Open Scriptable, tap "+", paste this whole file.
//   4. Edit BASE_URL and TOKEN below.
//   5. Tap ▶︎ (top-right) to preview.
//   6. Long-press home screen → + → search "Scriptable" →
//      add a widget → tap it → "Script" = this script's name.
//
// Optional (safer token storage): after first run, replace the
// TOKEN constant with:
//     Keychain.set("otr_token", "otr_paste_here");   // run once, then delete this line
// and read it in the widget with:
//     const TOKEN = Keychain.get("otr_token");
// ============================================================

const BASE_URL = "https://YOUR-VERCEL-URL.vercel.app"; // e.g. https://on-the-run.vercel.app
const TOKEN = "otr_paste_your_token_here";

// ------------------------------------------------------------
// Fetch today's data
// ------------------------------------------------------------
async function fetchToday() {
  const req = new Request(BASE_URL + "/api/v1/today");
  req.headers = { Authorization: "Bearer " + TOKEN };
  req.timeoutInterval = 10;
  const json = await req.loadJSON();
  if (json.error) throw new Error(json.error.message);
  return json.data;
}

// ------------------------------------------------------------
// Build the widget
// ------------------------------------------------------------
async function buildWidget() {
  const data = await fetchToday();
  const w = new ListWidget();
  w.backgroundColor = new Color("#0a0a0a");
  w.setPadding(14, 14, 14, 14);

  // Header — date
  const date = w.addText(formatDate(data.date));
  date.textColor = new Color("#71717a");
  date.font = Font.mediumSystemFont(10);

  w.addSpacer(4);

  // Today's session (first one)
  const session = data.todaySessions[0];
  if (session) {
    const title = w.addText(session.title || fmtSport(session.sport));
    title.textColor = Color.white();
    title.font = Font.boldSystemFont(16);
    title.lineLimit = 1;

    if (session.sessionType) {
      const type = w.addText(session.sessionType.toUpperCase());
      type.textColor = new Color("#a1a1aa");
      type.font = Font.systemFont(10);
    }

    // Compact targets line
    const parts = [];
    if (session.targetDurationMinSec) {
      parts.push(Math.round(session.targetDurationMinSec / 60) + "m");
    }
    if (session.targetDistanceM) {
      parts.push((session.targetDistanceM / 1000).toFixed(1) + " km");
    }
    if (session.targetIntensity) parts.push(session.targetIntensity);
    if (parts.length > 0) {
      const targets = w.addText(parts.join(" · "));
      targets.textColor = new Color("#d4d4d8");
      targets.font = Font.systemFont(12);
    }
  } else {
    const rest = w.addText("Rest day");
    rest.textColor = Color.white();
    rest.font = Font.boldSystemFont(16);
  }

  w.addSpacer();

  // Weekly summary line
  const wk = data.week;
  const summary = w.addText(
    wk.sessionsDone +
      "/" +
      wk.sessionsPlanned +
      " sesi  ·  " +
      wk.runDistanceKm.toFixed(1) +
      " km",
  );
  summary.textColor = new Color("#a1a1aa");
  summary.font = Font.systemFont(11);

  return w;
}

// ------------------------------------------------------------
// Formatters
// ------------------------------------------------------------
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(dt);
}

function fmtSport(s) {
  const map = {
    run: "Lari",
    strength: "Strength",
    hiit: "HIIT",
    cycling: "Sepeda",
    swim: "Renang",
    mobility: "Mobility",
    walk: "Jalan",
    rest: "Istirahat",
    other: "Lainnya",
  };
  return map[s] || s;
}

// ------------------------------------------------------------
// Entry
// ------------------------------------------------------------
try {
  const widget = await buildWidget();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentSmall(); // preview when running from the app
  }
} catch (e) {
  const err = new ListWidget();
  err.backgroundColor = new Color("#7f1d1d");
  const t = err.addText("Error");
  t.textColor = Color.white();
  t.font = Font.boldSystemFont(14);
  const msg = err.addText(String(e.message ?? e));
  msg.textColor = new Color("#fecaca");
  msg.font = Font.systemFont(10);
  if (config.runsInWidget) Script.setWidget(err);
  else await err.presentSmall();
}

Script.complete();
