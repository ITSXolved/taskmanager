"use client";

import { Role } from "@/lib/types";

// Admin actions run through Next.js server routes that use the service-role key
// server-side (never exposed to the browser) and verify the caller is an admin.

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function createUser(input: {
  name: string;
  email: string;
  role: Role;
  title?: string;
  phone?: string;
}): Promise<{ user_id: string; email: string; name: string; tempPassword: string }> {
  return post("/api/admin/create-user", input);
}

export function resetPassword(
  userId: string
): Promise<{ user_id: string; tempPassword: string }> {
  return post("/api/admin/reset-password", { user_id: userId });
}

export function setUserActive(
  userId: string,
  isActive: boolean
): Promise<{ user_id: string; is_active: boolean }> {
  return post("/api/admin/deactivate-user", {
    user_id: userId,
    is_active: isActive,
  });
}
