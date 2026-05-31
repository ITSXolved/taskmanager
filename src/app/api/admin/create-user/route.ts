import { NextResponse } from "next/server";
import {
  serviceClient,
  requireAdmin,
  generateTempPassword,
  AdminError,
} from "@/lib/supabase/admin-server";

export async function POST(req: Request) {
  try {
    const caller = await requireAdmin();
    const {
      name,
      email,
      role = "user",
      title,
      phone,
      org_id,
      manager_id,
    } = await req.json();
    if (!name || !email) {
      throw new AdminError(400, "Name and email are required");
    }
    if (!["super_admin", "admin", "user"].includes(role)) {
      throw new AdminError(400, "Invalid role");
    }
    // Only super admins may create admins / super admins.
    if (role !== "user" && caller.role !== "super_admin") {
      throw new AdminError(403, "Only super admins can create admins");
    }

    const admin = serviceClient();
    const tempPassword = generateTempPassword();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        title,
        phone,
        org_id,
        manager_id,
        must_change_password: true,
      },
    });
    if (error) throw new AdminError(error.status ?? 400, error.message);

    // Persist phone/org/manager in case the DB trigger predates these columns.
    const patch: {
      phone?: string;
      org_id?: string;
      manager_id?: string;
    } = {};
    if (phone) patch.phone = phone;
    if (org_id) patch.org_id = org_id;
    if (manager_id) patch.manager_id = manager_id;
    if (Object.keys(patch).length) {
      await admin.from("profiles").update(patch).eq("id", data.user.id);
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
