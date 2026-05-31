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
    const { name, email, role = "user", title, phone } = await req.json();
    if (!name || !email) {
      throw new AdminError(400, "Name and email are required");
    }
    if (!["admin", "user"].includes(role)) {
      throw new AdminError(400, "Invalid role");
    }

    const admin = serviceClient();
    const tempPassword = generateTempPassword();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, role, title, phone, must_change_password: true },
    });
    if (error) throw new AdminError(error.status ?? 400, error.message);

    // Persist phone in case the DB trigger predates the phone column.
    if (phone) {
      await admin.from("profiles").update({ phone }).eq("id", data.user.id);
    }

    return NextResponse.json({
      user_id: data.user.id,
      email,
      name,
      role,
      tempPassword,
    });
  } catch (err) {
    const status = err instanceof AdminError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
