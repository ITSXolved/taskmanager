"use client";

import { useState } from "react";
import {
  MoreVertical,
  Plus,
  KeyRound,
  Power,
  Eye,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/shared/page-header";
import { Column, DataTable } from "@/components/shared/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddMemberModal } from "@/components/team/add-member-modal";
import { MemberDetailPanel } from "@/components/team/member-detail-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Member } from "@/lib/types";
import {
  resetPassword,
  setUserActive,
  setUserRole,
  deleteUser,
} from "@/lib/admin-api";
import { credentialsMessage, whatsappUrl } from "@/lib/whatsapp";
import { toast } from "sonner";

export default function TeamPage() {
  const { members, isAdmin, isSuperAdmin, organizations, tasks, refreshMembers } =
    useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [waBusy, setWaBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [orgFilter, setOrgFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const orgName = (id?: string | null) =>
    organizations.find((o) => o.id === id)?.name ?? "—";

  const visibleMembers = members.filter((m) => {
    if (orgFilter !== "all" && m.orgId !== orgFilter) return false;
    if (roleFilter === "admin" && !(m.role === "admin" || m.role === "super_admin"))
      return false;
    if (roleFilter === "user" && m.role !== "user") return false;
    return true;
  });

  // Resets the member's password to a fresh temp one and opens WhatsApp with
  // the credentials + login URL. The tab is opened synchronously (before the
  // await) so popup blockers don't intercept it.
  async function sendWhatsApp(m: Member) {
    if (!m.phone) {
      toast.error("No WhatsApp number on file for this member");
      return;
    }
    const win = window.open("", "_blank");
    setWaBusy(m.id);
    try {
      const res = await resetPassword(m.id);
      const url = whatsappUrl(
        m.phone,
        credentialsMessage({
          name: m.name,
          email: m.email,
          password: res.tempPassword,
        })
      );
      if (url && win) win.location.href = url;
      else if (url) window.open(url, "_blank");
      toast.success(`New credentials sent to ${m.name} via WhatsApp`);
    } catch (err) {
      win?.close();
      toast.error((err as Error).message || "Failed to send");
    } finally {
      setWaBusy(null);
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Admin access required"
        />
      </Card>
    );
  }

  function open(m: Member) {
    setSelected(m);
    setDetailOpen(true);
  }

  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Member",
      sortable: true,
      sortValue: (m) => m.name,
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} color={m.avatarColor} size="sm" />
          <div className="min-w-0">
            <p className="font-medium">{m.name}</p>
            <p className="text-xs text-muted-foreground">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (m) => m.title,
      render: (m) => <span className="text-sm">{m.title}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (m) => (
        <Badge
          variant={
            m.role === "super_admin"
              ? "warning"
              : m.role === "admin"
                ? "default"
                : "secondary"
          }
        >
          {m.role === "super_admin"
            ? "Super Admin"
            : m.role === "admin"
              ? "Admin"
              : "Member"}
        </Badge>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "org",
            header: "Organization",
            sortable: true,
            sortValue: (m: Member) => orgName(m.orgId),
            render: (m: Member) => (
              <span className="text-sm">{orgName(m.orgId)}</span>
            ),
          } as Column<Member>,
        ]
      : []),
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (m) => (m.active ? 0 : 1),
      render: (m) => (
        <Badge variant={m.active ? "success" : "destructive"}>
          {m.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "tasks",
      header: "Tasks",
      sortable: true,
      sortValue: (m) =>
        tasks.filter((t) => t.assigneeIds.includes(m.id)).length,
      render: (m) => (
        <span className="font-medium tabular-nums">
          {tasks.filter((t) => t.assigneeIds.includes(m.id)).length}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          title={
            m.phone
              ? "Send login details via WhatsApp"
              : "No WhatsApp number on file"
          }
          loading={waBusy === m.id}
          disabled={!m.phone}
          className="text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#1ebe57] disabled:text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            sendWhatsApp(m);
          }}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => open(m)}>
              <Eye /> View details
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!m.phone}
              onSelect={() => sendWhatsApp(m)}
            >
              <MessageCircle /> Send login via WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  const res = await resetPassword(m.id);
                  toast.success(`New temp password: ${res.tempPassword}`, {
                    duration: 10000,
                  });
                } catch (err) {
                  toast.error((err as Error).message || "Reset failed");
                }
              }}
            >
              <KeyRound /> Reset password
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                const nextRole = m.role === "admin" ? "user" : "admin";
                try {
                  await setUserRole(m.id, nextRole);
                  refreshMembers();
                  toast.success(
                    nextRole === "admin"
                      ? `${m.name} is now an Administrator`
                      : `${m.name} is now a Member`
                  );
                } catch (err) {
                  toast.error((err as Error).message || "Role update failed");
                }
              }}
            >
              {m.role === "admin" ? <UserCog /> : <ShieldCheck />}
              {m.role === "admin" ? "Make member" : "Make admin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={async () => {
                try {
                  await setUserActive(m.id, !m.active);
                  refreshMembers();
                  toast.success(
                    m.active ? "Member deactivated" : "Member reactivated"
                  );
                } catch (err) {
                  toast.error((err as Error).message || "Update failed");
                }
              }}
            >
              <Power /> {m.active ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => setToDelete(m)}>
              <Trash2 /> Delete member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Team"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Member</span>
          </Button>
        }
      />

      {isSuperAdmin && (
        <Card className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="user">Members</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground sm:ml-auto">
            {visibleMembers.length} member{visibleMembers.length === 1 ? "" : "s"}
          </span>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={visibleMembers}
        onRowClick={open}
        pageSize={10}
      />

      <AddMemberModal open={addOpen} onOpenChange={setAddOpen} />
      <MemberDetailPanel
        member={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "member"}?`}
        description="This permanently deletes the account and revokes access. Tasks they created remain, but their assignments are removed. This cannot be undone."
        confirmLabel="Delete member"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteUser(toDelete.id);
            refreshMembers();
            toast.success(`${toDelete.name} deleted`);
            setToDelete(null);
          } catch (err) {
            toast.error((err as Error).message || "Delete failed");
          }
        }}
      />
    </div>
  );
}
