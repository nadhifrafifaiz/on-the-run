import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// Create a fake auth.users row so FKs to auth.users(id) resolve. Returns userId.
// Uses INSERT ... ON CONFLICT DO NOTHING and only fills the columns we need.
export async function createTestUser(): Promise<string> {
  const userId = randomUUID();
  const email = `test+${userId}@otr.local`;
  // Supabase's auth.users has many columns; only id and instance_id have
  // real constraints for our purposes. Use raw SQL to touch just what we need.
  await db.execute(sql`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      ${userId}::uuid,
      'authenticated',
      'authenticated',
      ${email},
      '',
      now(),
      now(),
      now(),
      '{"provider":"test"}'::jsonb,
      '{}'::jsonb,
      false
    )
  `);
  return userId;
}

// Delete an auth.users row — cascades will clear all public tables owned by user.
export async function deleteTestUser(userId: string) {
  await db.execute(sql`DELETE FROM auth.users WHERE id = ${userId}::uuid`);
}
