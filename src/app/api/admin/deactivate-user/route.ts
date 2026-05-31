import { NextResponse } from "next/server";
import {
  serviceClient,
  requireAdmin,
  AdminError,
} from "@/lib/supabase/admin-server";

export async function POST(req: Request) {
  try {
    const caller = await requireAdmin();
    const { user_id, is_active = false } = await req.json();
    if (!user_id) throw new AdminError(400, "user_id is required");
    if (user_id === caller.id) {
      throw new AdminError(400, "You cannot deactivate your own account");
    }

    const admin = serviceClient();
    const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
      ban_duration: is_active ? "none" : "876000h",
    });
    if (authErr) throw new AdminError(authErr.status ?? 400, authErr.message);

    await admin.from("profiles").update({ is_active }).eq("id", user_id);

    return NextResponse.json({ user_id, is_active });
  } catch (err) {
    const status = err instanceof AdminError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
