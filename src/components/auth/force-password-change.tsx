"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}

const strengthMeta = [
  { label: "Too weak", color: "bg-destructive", text: "text-destructive" },
  { label: "Weak", color: "bg-destructive", text: "text-destructive" },
  { label: "Fair", color: "bg-amber-500", text: "text-amber-500" },
  { label: "Good", color: "bg-info", text: "text-info" },
  { label: "Strong", color: "bg-success", text: "text-success" },
];

export function ForcePasswordChange({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowser();

  const score = useMemo(() => scorePassword(next), [next]);
  const meta = strengthMeta[score];
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    current.length > 0 && score >= 2 && next === confirm && !mismatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const { error: updateErr } = await supabase.auth.updateUser({
      password: next,
    });
    if (updateErr) {
      setLoading(false);
      setError(updateErr.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(onComplete, 1600);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {success ? (
          <div className="flex flex-col items-center py-6 text-center animate-scale-in">
            <div className="relative mb-4">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-success/30" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-lg font-bold">Password updated</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Redirecting you to your dashboard…
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <DialogTitle>Set a new password</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="current">Current password</Label>
                <Input
                  id="current"
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Temporary password"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new">New password</Label>
                <Input
                  id="new"
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="At least 8 characters"
                />
                {next.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            i < score ? meta.color : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn("text-xs font-medium", meta.text)}>
                      {meta.label}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className={cn(mismatch && "border-destructive")}
                />
                {mismatch && (
                  <p className="text-xs text-destructive">
                    Passwords do not match.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
                disabled={!canSubmit}
              >
                <KeyRound className="h-4 w-4" />
                Update password
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
