import { NextResponse } from "next/server";
import {
  serviceClient,
  requireAdmin,
  generateTempPassword,
  AdminError,
} from "@/lib/supabase/admin-server";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { user_id } = await req.json();
    if (!user_id) throw new AdminError(400, "user_id is required");

    const admin = serviceClient();
    const tempPassword = generateTempPassword();

    const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });
    if (authErr) throw new AdminError(authErr.status ?? 400, authErr.message);

    await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", user_id);

    return NextResponse.json({ user_id, tempPassword });
  } catch (err) {
    const status = err instanceof AdminError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
