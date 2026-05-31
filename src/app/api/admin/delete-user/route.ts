import { NextResponse } from "next/server";
import {
  serviceClient,
  requireAdmin,
  AdminError,
} from "@/lib/supabase/admin-server";

export async function POST(req: Request) {
  try {
    const caller = await requireAdmin();
    const { user_id } = await req.json();
    if (!user_id) throw new AdminError(400, "user_id is required");
    if (user_id === caller.id) {
      throw new AdminError(400, "You cannot delete your own account");
    }

    // Deleting the auth user cascades to the profile (FK on delete cascade).
    const admin = serviceClient();
    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) throw new AdminError(error.status ?? 400, error.message);

    return NextResponse.json({ user_id, deleted: true });
  } catch (err) {
    const status = err instanceof AdminError ? err.status : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
