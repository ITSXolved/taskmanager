// create-user — Admin provisions a new user via the service role.
// Returns a one-time temporary password to share securely.
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

    const { name, email, role = "user", title } = await req.json();
    if (!name || !email) throw new HttpError(400, "name and email are required");
    if (!["admin", "user"].includes(role)) throw new HttpError(400, "invalid role");

    const admin = adminClient();
    const tempPassword = generateTempPassword();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, role, title, must_change_password: true },
    });

    if (error) {
      throw new HttpError(error.status ?? 400, error.message);
    }

    // profiles row is created by the on_auth_user_created trigger.
    return json({
      user_id: data.user.id,
      email,
      name,
      role,
      tempPassword,
    });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: (err as Error).message }, status);
  }
});
