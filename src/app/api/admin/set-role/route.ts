import { NextResponse } from "next/server";
import {
  serviceClient,
  requireAdmin,
  AdminError,
} from "@/lib/supabase/admin-server";

export async function POST(req: Request) {
  try {
    const caller = await requireAdmin();
    const { user_id, role } = await req.json();
    if (!user_id) throw new AdminError(400, "user_id is required");
    if (!["admin", "user"].includes(role)) {
      throw new AdminError(400, "role must be 'admin' or 'user'");
    }
    if (user_id === caller.id && role !== "admin") {
      throw new AdminError(400, "You cannot remove your own admin access");
    }

    const admin = serviceClient();

    // Keep auth metadata and the profile row in sync.
    const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
      user_metadata: { role },
    });
    if (authErr) throw new AdminError(authErr.status ?? 400, authErr.message);

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", user_id);
    if (profileErr) throw new AdminError(400, profileErr.message);

    return NextResponse.json({ user_id, role });
  } catch (err) {
    const status = err instanceof AdminError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
