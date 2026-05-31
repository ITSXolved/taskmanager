import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Service-role client — bypasses RLS. Never expose to the browser. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Resolve the caller from the request's Authorization header and verify they
 * are an active admin. Throws on failure.
 */
export async function requireAdmin(req: Request): Promise<{ id: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new HttpError(401, "Missing authorization header");

  const admin = adminClient();
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) throw new HttpError(401, "Invalid session");

  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    throw new HttpError(403, "Admin privileges required");
  }
  return { id: userData.user.id };
}

/** Cryptographically-random, human-shareable temporary password. */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) =>
    set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];

  let pw = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i++) pw += pick(all);
  // shuffle
  return pw
    .split("")
    .sort(() => (crypto.getRandomValues(new Uint32Array(1))[0] % 2 ? 1 : -1))
    .join("");
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
