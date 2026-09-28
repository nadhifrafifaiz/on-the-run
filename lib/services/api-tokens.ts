import { and, desc, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/db/client";
import { apiTokens } from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";

const TOKEN_PREFIX = "otr_";
const TOKEN_BYTES = 24; // → 32-char base64url body

function generatePlaintextToken(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// UI-visible prefix like "otr_ab12cd34…" — first 12 chars of the plaintext.
function displayPrefix(token: string): string {
  return token.slice(0, 12);
}

export type ApiToken = typeof apiTokens.$inferSelect;

/**
 * Create a new token for the user. Returns the plaintext ONCE — caller must
 * show it and never store it. Only the SHA-256 hash and display prefix are
 * persisted.
 */
export async function createApiToken(
  userId: string,
  name: string,
): Promise<{ token: string; row: ApiToken }> {
  const trimmed = name.trim();
  if (!trimmed) throw new ServiceError("VALIDATION", "Nama token wajib diisi");
  if (trimmed.length > 60) throw new ServiceError("VALIDATION", "Nama maksimal 60 karakter");

  const plaintext = generatePlaintextToken();
  const [row] = await db
    .insert(apiTokens)
    .values({
      userId,
      name: trimmed,
      tokenHash: hashToken(plaintext),
      tokenPrefix: displayPrefix(plaintext),
    })
    .returning();

  return { token: plaintext, row };
}

/** All tokens for a user, newest first — active + revoked. */
export async function listApiTokens(userId: string): Promise<ApiToken[]> {
  return db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt));
}

/** Mark a token as revoked (soft delete — preserves audit trail). */
export async function revokeApiToken(userId: string, id: string): Promise<void> {
  const res = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.userId, userId), eq(apiTokens.id, id), isNull(apiTokens.revokedAt)))
    .returning({ id: apiTokens.id });
  if (res.length === 0) throw new ServiceError("NOT_FOUND", "Token tidak ditemukan");
}

/**
 * Verify a plaintext bearer token. Returns the owning userId if valid + active.
 * Constant-time compare on the hash, updates last_used_at on hit.
 * Returns null on any failure — never leaks WHY it failed.
 */
export async function verifyApiToken(plaintext: string): Promise<string | null> {
  if (!plaintext || !plaintext.startsWith(TOKEN_PREFIX)) return null;
  const hash = hashToken(plaintext);

  const [row] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hash))
    .limit(1);
  if (!row) return null;
  if (row.revokedAt !== null) return null;

  // Constant-time verify on the hex-digest bytes.
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(row.tokenHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  // Best-effort last_used update — don't block or throw on failure.
  db.update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, row.id))
    .catch(() => {});

  return row.userId;
}
