"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, KeyRound, MessageCircle, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { createUser } from "@/lib/admin-api";
import { credentialsMessage, openWhatsApp } from "@/lib/whatsapp";
import { Role } from "@/lib/types";

export function AddMemberModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { refreshMembers } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{
    name: string;
    email: string;
    password: string;
    phone: string;
  } | null>(null);
  const [copied, setCopied] = useState<"email" | "pw" | "both" | null>(null);

  function copy(text: string, which: "email" | "pw" | "both") {
    navigator.clipboard?.writeText(text);
    setCopied(which);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 1500);
  }

  function sendWhatsApp() {
    if (!created) return;
    const message = credentialsMessage({
      name: created.name,
      email: created.email,
      password: created.password,
    });
    if (!openWhatsApp(created.phone, message)) {
      toast.error("No WhatsApp number provided");
    }
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const res = await createUser({ name, email, role, title, phone });
      setCreated({
        name: res.name,
        email: res.email,
        password: res.tempPassword,
        phone,
      });
      refreshMembers();
    } catch (err) {
      toast.error((err as Error).message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setRole("user");
    setCreated(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : reset())}>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
                <Check className="h-5 w-5" />
              </div>
              <DialogTitle>Member added</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <CredentialRow
                label="Email"
                value={created.email}
                onCopy={() => copy(created.email, "email")}
                copied={copied === "email"}
              />
              <CredentialRow
                label="Temporary password"
                value={created.password}
                mono
                onCopy={() => copy(created.password, "pw")}
                copied={copied === "pw"}
              />
            </div>

            {created.phone && (
              <button
                onClick={sendWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1ebe57] active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4" />
                Send credentials via WhatsApp
              </button>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  copy(
                    `Email: ${created.email}\nPassword: ${created.password}`,
                    "both"
                  )
                }
              >
                <Copy className="h-4 w-4" />
                Copy both
              </Button>
              <Button onClick={reset}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="mname">Full name</Label>
                <Input
                  id="mname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="memail">Email</Label>
                <Input
                  id="memail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@teamflow.io"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mphone">WhatsApp number</Label>
                <Input
                  id="mphone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567 (with country code)"
                />
                <p className="text-xs text-muted-foreground">
                  Optional — used to send the login details via WhatsApp.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mtitle">Title</Label>
                  <Input
                    id="mtitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Engineer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Member</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={saving}>
                <KeyRound className="h-4 w-4" />
                Create & Generate
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center justify-between gap-2">
        <code className={mono ? "font-mono text-sm" : "text-sm"}>{value}</code>
        <Button variant="ghost" size="icon-sm" onClick={onCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
