// deactivate-user — Admin disables (or re-enables) a user account.
// Bans/unbans in auth + flips profiles.is_active.
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, requireAdmin, HttpError } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await requireAdmin(req);

    const { user_id, is_active = false } = await req.json();
    if (!user_id) throw new HttpError(400, "user_id is required");
    if (user_id === caller.id) {
      throw new HttpError(400, "You cannot deactivate your own account");
    }

    const admin = adminClient();

    const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
      // 'none' lifts the ban; a long duration effectively disables sign-in.
      ban_duration: is_active ? "none" : "876000h",
    });
    if (authErr) throw new HttpError(authErr.status ?? 400, authErr.message);

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ is_active })
      .eq("id", user_id);
    if (profileErr) throw new HttpError(400, profileErr.message);

    return json({ user_id, is_active });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: (err as Error).message }, status);
  }
});
