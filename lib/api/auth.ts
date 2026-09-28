import { verifyApiToken } from "@/lib/services/api-tokens";

/**
 * Parse the Authorization header and resolve to the owning userId.
 * Returns null for any failure (missing header, wrong scheme, invalid token).
 */
export async function userIdFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return verifyApiToken(token.trim());
}
