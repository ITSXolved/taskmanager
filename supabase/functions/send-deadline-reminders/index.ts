// send-deadline-reminders — Scheduled job (cron). Finds tasks due within the
// next 24h that aren't done and inserts a 'due_soon' notification per assignee,
// skipping anyone already reminded today for that task.
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = adminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Tasks due within the window, not completed.
  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id, title, due_date, status, task_assignees(user_id)")
    .neq("status", "done")
    .gte("due_date", now.toISOString())
    .lte("due_date", in24h.toISOString());

  if (error) return json({ error: error.message }, 500);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  let created = 0;
  for (const task of tasks ?? []) {
    const assignees = (task.task_assignees ?? []) as { user_id: string }[];
    for (const a of assignees) {
      // De-dupe: one due_soon reminder per (user, task) per day.
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", a.user_id)
        .eq("type", "due_soon")
        .eq("payload->>task_id", task.id)
        .gte("created_at", todayStart.toISOString())
        .maybeSingle();

      if (existing) continue;

      const { error: insErr } = await admin.from("notifications").insert({
        user_id: a.user_id,
        type: "due_soon",
        title: `"${task.title}" is due soon`,
        payload: { task_id: task.id, due_date: task.due_date },
      });
      if (!insErr) created++;
    }
  }

  return json({ scanned: tasks?.length ?? 0, notifications_created: created });
});
