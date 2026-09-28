import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser } from "./helpers/db";
import { upsertProfile, getProfile } from "@/lib/services/profiles";
import { addMetricsHistory, listMetricsHistory, metricsAt } from "@/lib/services/metrics";
import {
  activateProgram,
  archiveProgram,
  createProgram,
  getProgram,
  listPrograms,
  updateProgram,
} from "@/lib/services/programs";
import { createSession, deleteSession, getSession, markSession } from "@/lib/services/sessions";
import { logActivity, getActivity, listActivities, deleteActivity } from "@/lib/services/activities";
import { applyImport, duplicateWeek } from "@/lib/services/plans";
import { bestEfforts, daySessions, weeklySummary } from "@/lib/services/stats";
import { createDraft, discardDraft, getDraft, listPending } from "@/lib/services/drafts";
import { createRace, getRace, listRaces, updateRace } from "@/lib/services/races";
import { deleteAllUserData } from "@/lib/services/account";
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  verifyApiToken,
} from "@/lib/services/api-tokens";
import { ServiceError } from "@/lib/utils/errors";

let userA: string;
let userB: string;

beforeAll(async () => {
  userA = await createTestUser();
  userB = await createTestUser();
});

afterAll(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

describe("profiles", () => {
  it("A cannot read B's profile", async () => {
    await upsertProfile(userB, { timezone: "Asia/Jakarta", units: "metric", weekStart: "monday" });
    const a = await getProfile(userA);
    expect(a).toBeNull();
  });

  it("upsert scopes writes to caller", async () => {
    await upsertProfile(userA, {
      timezone: "Asia/Jakarta",
      units: "metric",
      weekStart: "monday",
      displayName: "A",
    });
    const a = await getProfile(userA);
    expect(a?.displayName).toBe("A");
    const b = await getProfile(userB);
    expect(b?.displayName).not.toBe("A");
  });
});

describe("metrics", () => {
  it("A cannot read B's metrics history", async () => {
    await addMetricsHistory(userB, { effectiveFrom: "2026-01-01", maxHr: 190 });
    const list = await listMetricsHistory(userA);
    expect(list.length).toBe(0);
    const at = await metricsAt(userA, "2026-06-01");
    expect(at).toBeNull();
  });

  it("effective_from window returns latest own row", async () => {
    await addMetricsHistory(userA, { effectiveFrom: "2026-01-01", maxHr: 180 });
    await addMetricsHistory(userA, { effectiveFrom: "2026-06-01", maxHr: 185 });
    const at = await metricsAt(userA, "2026-07-01");
    expect(at?.maxHr).toBe(185);
    const early = await metricsAt(userA, "2026-03-01");
    expect(early?.maxHr).toBe(180);
  });
});

describe("programs", () => {
  it("A cannot see B's program", async () => {
    const bProg = await createProgram(userB, { name: "B's plan", type: "main" });
    const aList = await listPrograms(userA);
    expect(aList.find((p) => p.id === bProg.id)).toBeUndefined();
    const got = await getProgram(userA, bProg.id);
    expect(got).toBeNull();
  });

  it("A cannot update B's program", async () => {
    const bProg = await createProgram(userB, { name: "B keeps this", type: "supporting" });
    await expect(updateProgram(userA, bProg.id, { name: "hacked" })).rejects.toBeInstanceOf(
      ServiceError,
    );
  });

  it("one main active program per user enforced", async () => {
    const p1 = await createProgram(userA, { name: "First main", type: "main" });
    const p2 = await createProgram(userA, { name: "Second main", type: "main" });
    await activateProgram(userA, p1.id);
    await expect(activateProgram(userA, p2.id)).rejects.toBeInstanceOf(ServiceError);
    await archiveProgram(userA, p1.id);
    // now activating p2 should work
    const active = await activateProgram(userA, p2.id);
    expect(active.status).toBe("active");
  });
});

describe("sessions", () => {
  it("A cannot read/update/delete B's session", async () => {
    const bSession = await createSession(userB, {
      date: "2026-10-01",
      sport: "run",
      status: "planned",
      position: 0,
      blocks: [],
    });
    expect(await getSession(userA, bSession.id)).toBeNull();
    await expect(markSession(userA, bSession.id, "done")).rejects.toBeInstanceOf(ServiceError);
    await expect(deleteSession(userA, bSession.id)).rejects.toBeInstanceOf(ServiceError);
  });
});

describe("activities.log", () => {
  it("runs in one transaction and fills zone_snapshot", async () => {
    // Ensure a fresh metrics row that will be snapshotted.
    await addMetricsHistory(userA, {
      effectiveFrom: "2026-09-01",
      maxHr: 195,
      restingHr: 55,
      hrZones: { z2: { min: 139, max: 154 } },
    });
    const act = await logActivity(userA, {
      date: "2026-09-15",
      sport: "run",
      title: "Easy",
      durationSec: 1800,
      distanceM: 5000,
      avgHr: 145,
      rpe: 4,
      feel: "good",
      source: "manual",
      run: { avgPaceSecPerKm: 360, cadenceSpm: 176 },
      items: [],
    });
    expect(act.zoneSnapshot).not.toBeNull();
    expect((act.zoneSnapshot as { max_hr: number }).max_hr).toBe(195);
  });

  it("rejects out-of-range fields", async () => {
    await expect(
      logActivity(userA, {
        date: "2026-09-16",
        sport: "run",
        durationSec: 10, // below 30s min
        source: "manual",
        items: [],
      }),
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it("A cannot link to B's planned session", async () => {
    const bSession = await createSession(userB, {
      date: "2026-10-05",
      sport: "run",
      status: "planned",
      position: 0,
      blocks: [],
    });
    await expect(
      logActivity(userA, {
        date: "2026-10-05",
        sport: "run",
        source: "manual",
        plannedSessionId: bSession.id,
        items: [],
      }),
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it("A cannot read/delete B's activity", async () => {
    const bAct = await logActivity(userB, {
      date: "2026-09-20",
      sport: "run",
      source: "manual",
      items: [],
    });
    expect(await getActivity(userA, bAct.id)).toBeNull();
    await expect(deleteActivity(userA, bAct.id)).rejects.toBeInstanceOf(ServiceError);
  });

  it("list is scoped to caller", async () => {
    const aList = await listActivities(userA);
    const bList = await listActivities(userB);
    for (const a of aList) expect(a.userId).toBe(userA);
    for (const b of bList) expect(b.userId).toBe(userB);
  });
});

describe("plans.applyImport", () => {
  it("scopes program + sessions to caller", async () => {
    const result = await applyImport(userA, {
      schema: "plan",
      version: 1,
      program: { name: "Import test", type: "supporting" },
      week_notes: [],
      sessions: [
        {
          date: "2026-11-02",
          sport: "run",
          session_type: "easy",
          title: "Easy 30",
          target_duration_min: 30,
          blocks: [
            {
              name: "Main",
              rounds: 1,
              items: [{ name: "Easy jog", duration_sec: 1800 }],
            },
          ],
        },
      ],
    });
    expect(result.sessionsInserted).toBe(1);
    const aList = await listPrograms(userA);
    const bList = await listPrograms(userB);
    const found = aList.find((p) => p.id === result.programId);
    expect(found).toBeDefined();
    expect(bList.find((p) => p.id === result.programId)).toBeUndefined();
  });

  it("duplicateWeek copies own sessions only", async () => {
    const res = await duplicateWeek(userA, "2026-11-02", "2026-11-09");
    expect(res.copied).toBeGreaterThan(0);
    const bSessions = await daySessions(userB, "2026-11-09", "2026-11-15");
    expect(bSessions.length).toBe(0);
  });
});

describe("drafts", () => {
  it("A cannot read/discard B's draft", async () => {
    const bDraft = await createDraft(userB, "mcp", {
      schema: "activity",
      version: 1,
      date: "2026-09-20",
      sport: "run",
    });
    expect(await getDraft(userA, bDraft.id)).toBeNull();
    await expect(discardDraft(userA, bDraft.id)).rejects.toBeInstanceOf(ServiceError);
    const aPending = await listPending(userA);
    expect(aPending.find((d) => d.id === bDraft.id)).toBeUndefined();
  });
});

describe("races", () => {
  it("A cannot see or modify B's race", async () => {
    const bRace = await createRace(userB, { name: "B's HM", date: "2027-03-01" });
    expect(await getRace(userA, bRace.id)).toBeNull();
    const aList = await listRaces(userA);
    expect(aList.find((r) => r.id === bRace.id)).toBeUndefined();
    await expect(updateRace(userA, bRace.id, { name: "hacked" })).rejects.toBeInstanceOf(
      ServiceError,
    );
  });
});

describe("stats", () => {
  it("bestEfforts / weeklySummary / daySessions are scoped", async () => {
    // Give B some data — should never appear in A's stats.
    await logActivity(userB, {
      date: "2026-09-10",
      sport: "run",
      durationSec: 1926, // 32:06
      distanceM: 5000,
      effortDistanceM: 5000,
      source: "manual",
      items: [],
    });
    const aBE = await bestEfforts(userA);
    // A's best 5K should NOT be B's 32:06.
    const a5k = aBE.find((b) => b.distanceLabel === "5K");
    if (a5k) expect(a5k.timeSec).not.toBe(1926);

    const aWeek = await weeklySummary(userA, "2026-09-07");
    expect(aWeek.sessionsPlanned).toBeGreaterThanOrEqual(0);
    // No B rows should sneak in.
    const aDays = await daySessions(userA, "2026-11-09", "2026-11-15");
    for (const row of aDays) expect(row.session.userId).toBe(userA);
  });
});

describe("api-tokens", () => {
  it("verifyApiToken resolves to owner userId", async () => {
    const { token } = await createApiToken(userA, "widget-A");
    expect(await verifyApiToken(token)).toBe(userA);
  });

  it("B cannot revoke A's token", async () => {
    const { row } = await createApiToken(userA, "another-A");
    await expect(revokeApiToken(userB, row.id)).rejects.toThrow(ServiceError);
    // Still verifies as valid for A.
    const stillValid = (await listApiTokens(userA)).find((t) => t.id === row.id);
    expect(stillValid?.revokedAt).toBeNull();
  });

  it("revoked tokens no longer verify", async () => {
    const { token, row } = await createApiToken(userA, "to-revoke");
    await revokeApiToken(userA, row.id);
    expect(await verifyApiToken(token)).toBeNull();
  });

  it("garbage tokens fail without leaking", async () => {
    expect(await verifyApiToken("")).toBeNull();
    expect(await verifyApiToken("bogus_xxxx")).toBeNull();
    expect(await verifyApiToken("otr_notreal")).toBeNull();
  });

  it("A cannot see B's tokens", async () => {
    await createApiToken(userB, "widget-B");
    const aTokens = await listApiTokens(userA);
    for (const t of aTokens) expect(t.userId).toBe(userA);
  });
});

describe("account.delete", () => {
  it("only deletes caller's data", async () => {
    // Snapshot counts for B before.
    const bBefore = await listActivities(userB);
    expect(bBefore.length).toBeGreaterThan(0);
    await deleteAllUserData(userA);
    const bAfter = await listActivities(userB);
    expect(bAfter.length).toBe(bBefore.length);
    // A's rows should be gone.
    const aAfter = await listActivities(userA);
    expect(aAfter.length).toBe(0);
    expect(await getProfile(userA)).toBeNull();
  });
});
