// reset-password — Admin resets a user's password; returns a new temp password
// and forces a change on next login.
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  adminClient,
  requireAdmin,
  generateTempPassword,
  HttpError,
} from "../_shared/admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);

    const { user_id } = await req.json();
    if (!user_id) throw new HttpError(400, "user_id is required");

    const admin = adminClient();
    const tempPassword = generateTempPassword();

    const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });
    if (authErr) throw new HttpError(authErr.status ?? 400, authErr.message);

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", user_id);
    if (profileErr) throw new HttpError(400, profileErr.message);

    return json({ user_id, tempPassword });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: (err as Error).message }, status);
  }
});
