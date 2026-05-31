"use client";

import { useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  Camera,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  Globe,
  Clock,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function ProfilePage() {
  const { currentUser, isAdmin, refreshMembers } = useApp();
  const { theme, setTheme } = useTheme();
  const supabase = getSupabaseBrowser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);

  const score = useMemo(() => scorePassword(next), [next]);
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-info",
    "bg-success",
  ];

  async function changePassword() {
    if (!current || score < 2 || next !== confirm) {
      toast.error("Please complete the form correctly");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password changed successfully");
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const ext = file.name.split(".").pop();
    const path = `${currentUser.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", currentUser.id);
    refreshMembers();
    toast.success("Avatar updated");
  }

  if (!currentUser) return null;

  return (
    <div>
      <PageHeader title="Profile" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <div className="group relative">
              <Avatar
                name={currentUser.name}
                color={currentUser.avatarColor}
                size="xl"
              />
              <button
                onClick={() => avatarInput.current?.click()}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadAvatar}
              />
            </div>
            <h3 className="mt-3 text-lg font-bold">{currentUser.name}</h3>
            <p className="text-sm text-muted-foreground">{currentUser.title}</p>
            <Badge
              variant={isAdmin ? "default" : "secondary"}
              className="mt-2"
            >
              <ShieldCheck className="h-3 w-3" />
              {isAdmin ? "Administrator" : "Member"}
            </Badge>

            <div className="mt-5 w-full space-y-2 border-t border-border pt-4 text-left text-sm">
              <Row label="Email" value={currentUser.email} />
              <Row
                label="Joined"
                value={format(new Date(currentUser.joinedAt), "MMM yyyy")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Account info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input defaultValue={currentUser.name} />
              </div>
              <div className="space-y-1.5">
                <Label>Email (read-only)</Label>
                <Input value={currentUser.email} readOnly disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input defaultValue={currentUser.title} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={isAdmin ? "Administrator" : "Member"} readOnly disabled />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => toast.success("Profile updated")}>
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                  />
                  {next.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              i < score ? colors[score] : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {labels[score]}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={cn(
                      confirm.length > 0 &&
                        confirm !== next &&
                        "border-destructive"
                    )}
                  />
                </div>
              </div>
              <Button onClick={changePassword}>Update password</Button>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", label: "Light", Icon: Sun },
                    { id: "dark", label: "Dark", Icon: Moon },
                    { id: "system", label: "System", Icon: Monitor },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-colors",
                        theme === t.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-accent/40"
                      )}
                    >
                      <t.Icon className="h-5 w-5" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified about mentions and assignments
                    </p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Session info</p>
                    <p className="text-xs text-muted-foreground">
                      Signed in · Chrome on macOS · Last active just now
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
