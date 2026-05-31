"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Building2, Plus, ShieldAlert, Users } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function OrganizationsPage() {
  const { isSuperAdmin, organizations, members, createOrganization } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isSuperAdmin) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Super admin access required"
        />
      </Card>
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    setSaving(true);
    try {
      await createOrganization(name.trim());
      toast.success("Organization created");
      setName("");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Failed to create organization");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Organization</span>
          </Button>
        }
      />

      {organizations.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                New Organization
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {organizations.map((org) => {
            const orgMembers = members.filter((m) => m.orgId === org.id);
            const admins = orgMembers.filter(
              (m) => m.role === "admin" || m.role === "super_admin"
            );
            const users = orgMembers.filter((m) => m.role === "user");
            return (
              <Card key={org.id} className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chart-5/20 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">
                    {orgMembers.length} member{orgMembers.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <h3 className="font-semibold">{org.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(org.createdAt), "MMM d, yyyy")}
                </p>

                <div className="mt-4 space-y-3 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Admins ({admins.length})
                    </span>
                    <AvatarGroup members={admins} size="xs" max={4} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Users ({users.length})
                    </span>
                    <AvatarGroup members={users} size="xs" max={4} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <DialogTitle>New Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="orgname">Organization name</Label>
            <Input
              id="orgname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayadi Directors"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
