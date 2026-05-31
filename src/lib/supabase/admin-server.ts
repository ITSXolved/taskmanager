import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomInt } from "crypto";
import type { Database } from "@/lib/database.types";
import { createClient as createUserClient } from "@/lib/supabase/server";

/** Service-role client — bypasses RLS. Server-only. */
export function serviceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export class AdminError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Verify the calling session belongs to an active admin. */
export async function requireAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AdminError(
      500,
      "SUPABASE_SERVICE_ROLE_KEY is not set on the server (.env.local)."
    );
  }
  const supabase = createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AdminError(401, "Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    (profile.role !== "admin" && profile.role !== "super_admin")
  ) {
    throw new AdminError(403, "Admin privileges required");
  }
  return { id: user.id, role: profile.role };
}

/** Verify the caller is an active super admin. */
export async function requireSuperAdmin() {
  const caller = await requireAdmin();
  if (caller.role !== "super_admin") {
    throw new AdminError(403, "Super admin privileges required");
  }
  return caller;
}

export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[randomInt(set.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = 0; i < 8; i++) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
