// Prompts a user copies into their own AI (Claude / ChatGPT / etc.) to
// generate JSON payloads matching our import schemas. Zero cost to us,
// user stays in control of which model they use.

export const ACTIVITY_PROMPT = `Convert the workout screenshot / description to this JSON schema for on-the-run app.
Output ONLY the JSON, no markdown fence, no explanation.

Schema (activity v1):
{
  "schema": "activity",
  "version": 1,
  "date": "YYYY-MM-DD",             // when the workout happened
  "start_time": "HH:mm",            // optional
  "sport": "run" | "strength" | "hiit" | "cycling" | "swim" | "mobility" | "walk" | "other",
  "session_type": "easy" | "long" | "tempo" | "interval" | "recovery" | "race" | null,
  "title": "Easy morning 5K",
  "duration": "h:mm:ss" | "mm:ss",
  "distance_km": 5.2,
  "avg_hr": 141,
  "max_hr": 155,
  "calories": 350,
  "training_load": 120,
  "run": {                          // only when sport = "run"
    "avg_pace": "m:ss" per km,
    "cadence_spm": 178,
    "gct_avg_ms": 285,
    "gct_min_ms": 260,
    "balance": "49.9/50.1",
    "vo2max": 42,
    "elevation_gain_m": 45
  },
  "items": [                        // only for strength/hiit — per-item + per-set
    { "name": "Pull-up", "sets": [ { "reps": 6 }, { "reps": 6 }, { "reps": 4, "status": "failed" } ] }
  ],
  "notes": ""
}

Rules:
- RPE dan Feel JANGAN diisi — user isi sendiri saat review di app.
- Skip field yang tidak ada di data (bukan tebak 0 atau null).
- Duration & pace pakai format string, bukan detik.
- Kalau ragu, biarkan kosong.

Data:
[Tempel screenshot atau deskripsi aktivitas kamu di sini]`;

// Prompt for importing SESSIONS into an existing program (or bikin sesi lepas).
// Skip program/phases blocks — those are handled separately.
export const SESSIONS_PROMPT = `Convert the training plan sessions to this JSON schema for on-the-run app.
Output ONLY the JSON, no markdown fence, no explanation.

Konteks: sesi-sesi ini akan dimasukkan ke program yang sudah ada (atau jadi sesi lepas).
JANGAN bikin blok "program" atau "phases" — cukup sessions.

Schema (plan v1 — sessions only):
{
  "schema": "plan",
  "version": 1,
  "week_notes": [
    { "week_start": "YYYY-MM-DD (Senin)", "context": "...", "principles": ["..."] }
  ],
  "sessions": [
    {
      "date": "YYYY-MM-DD",
      "sport": "run" | "strength" | "hiit" | "cycling" | "swim" | "mobility" | "walk" | "rest" | "other",
      "session_type": "easy" | "long" | "tempo" | "interval" | "recovery" | "race" | "strength" | "hiit" | "mobility" | "cross" | "rest" | null,
      "title": "Easy Run",
      "description": "...",
      "target_duration_min": 30,
      "target_duration_max": 35,
      "target_distance_km": 5,
      "target_intensity": "Z1-Z2",
      "blocks": [
        {
          "name": "Main",
          "rounds": 1,
          "items": [
            { "name": "Easy jog", "duration_sec": 1800, "target": "HR 139-154" }
          ]
        }
      ]
    }
  ]
}

Rules:
- **sport WAJIB pakai string persis ini (huruf kecil, jangan sinonim):** run, strength, hiit, cycling, swim, mobility, walk, rest, other.
  Common mistakes to AVOID: "cycle" → HARUS "cycling". "running" → HARUS "run". "swim" bukan "swimming". "recovery" bukan sport, itu session_type.
- **session_type WAJIB pakai string persis (satu kata, tanpa suffix):** easy, long, tempo, interval, recovery, race, strength, hiit, mobility, cross, rest, other.
  Common mistakes to AVOID: "long_run" → HARUS "long". "easy_run" → HARUS "easy". "race_day" → HARUS "race". "intervals" → HARUS "interval". Jangan pakai suffix "_run"/"_training"/"_day". Kalau ragu → omit field-nya.
- target_duration_* di level sesi pakai MENIT; duration_sec di level item pakai DETIK.
- Semua field di item optional kecuali name.
- Kalau strength: sport = "strength", isi blocks[].items[] dengan reps + load_kg + rest_sec.
- Kalau rest day: sport = "rest", blocks: [].
- **JANGAN pakai 0 atau "N/A" untuk field yang tidak berlaku** — omit field-nya. Contoh: sesi strength tidak perlu target_distance_km sama sekali, jangan tulis 0.
- Format tanggal ketat YYYY-MM-DD.

Data:
[Tempel plan mingguan kamu di sini — bebas format]`;

// Prompt for creating a FULL PROGRAM from scratch: name + dates + goal + phases + first N weeks of sessions.
// Use when starting a new training block (mis. HM 2027 Prep).
export const PROGRAM_PROMPT = `Convert the training program brief to this JSON schema for on-the-run app.
Output ONLY the JSON, no markdown fence, no explanation.

Konteks: bikin PROGRAM LENGKAP dari nol (nama + rentang tanggal + goal + phases + sesi mingguan).
Program dimasukkan sebagai status "draft" — nanti user aktifkan sendiri di app.

Schema (plan v1 — full program):
{
  "schema": "plan",
  "version": 1,
  "program": {
    "name": "HM 2027 Preparation",
    "type": "main",                          // "main" | "supporting"
    "goal": "Sub-2:45 at HM race February 2027",
    "start_date": "2026-10-05",
    "end_date": "2027-02-15",
    "notes": "12 minggu base + 6 minggu build + 3 minggu peak + 2 minggu taper"
  },
  "phases": [
    { "name": "Base",   "start_date": "2026-10-05", "end_date": "2026-11-30", "focus": "Build aerobic base, run volume 25-40km/wk" },
    { "name": "Build",  "start_date": "2026-12-01", "end_date": "2027-01-11", "focus": "Threshold + long runs up to 18km" },
    { "name": "Peak",   "start_date": "2027-01-12", "end_date": "2027-02-01", "focus": "Race pace intervals, long 21km" },
    { "name": "Taper",  "start_date": "2027-02-02", "end_date": "2027-02-15", "focus": "Volume down, freshness up" }
  ],
  "week_notes": [
    { "week_start": "2026-10-05", "context": "Minggu pertama base", "principles": ["Semua run Z1-Z2", "Strength 2x/mgg"] }
  ],
  "sessions": [
    {
      "date": "2026-10-06",
      "sport": "run",
      "session_type": "easy",
      "title": "Easy Run",
      "target_duration_min": 30,
      "target_intensity": "Z1-Z2",
      "blocks": [
        { "name": "Main", "items": [{ "name": "Easy jog", "duration_sec": 1800, "target": "HR 139-154" }] }
      ]
    }
  ]
}

Rules:
- **sport WAJIB pakai string persis ini (huruf kecil, jangan sinonim):** run, strength, hiit, cycling, swim, mobility, walk, rest, other.
  Common mistakes to AVOID: "cycle" → HARUS "cycling". "running" → HARUS "run". "swim" bukan "swimming".
- **session_type WAJIB pakai string persis (satu kata, tanpa suffix):** easy, long, tempo, interval, recovery, race, strength, hiit, mobility, cross, rest, other.
  Common mistakes to AVOID: "long_run" → HARUS "long". "easy_run" → HARUS "easy". "race_day" → HARUS "race". "intervals" → HARUS "interval". Jangan pakai suffix "_run"/"_training"/"_day". Kalau ragu → omit field-nya.
- Phases HARUS punya tanggal (start_date, end_date). Boleh overlap atau gap dari program dates.
- Sesi tidak perlu "phase" field — otomatis match by date.
- Kalau user cuma minta minggu pertama, isi sessions untuk minggu itu aja. Kalau minta seluruh block, isi semua minggu.
- Format tanggal ketat YYYY-MM-DD.
- target_duration_* level sesi = MENIT; duration_sec level item = DETIK.
- **JANGAN pakai 0 atau "N/A" untuk field yang tidak berlaku** — omit field-nya. Contoh: sesi strength tidak perlu target_distance_km, sesi rest tidak perlu blocks. Skip aja.

Data:
[Tempel brief program kamu: race target, tanggal, current fitness, HR max, dll]`;

// Backward-compatible alias — old code using PLAN_PROMPT still works.
export const PLAN_PROMPT = PROGRAM_PROMPT;
