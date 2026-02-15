"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  TrashIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { UserRole, UserStatus } from "@prisma/client";

type UserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  status: UserStatus | null;
  role: UserRole | null;
  createdAt: string;
};

type ApprovalRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  action: "approve" | "reject" | "";
  role: UserRole | null;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "super_user", label: "Super user" },
  { value: "user", label: "User" },
  { value: "read_only", label: "Read-only" },
];

const STATUS_OPTIONS: { value: "active" | "inactive"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full mx-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type AddUserForm = {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: "active" | "inactive";
};

function AddUserModal({
  form,
  setForm,
  error,
  saving,
  onSave,
  onCancel,
}: {
  form: AddUserForm;
  setForm: (f: AddUserForm | ((prev: AddUserForm) => AddUserForm)) => void;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full mx-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Add New User</h3>
        {error && (
          <p className="text-red-400 text-sm mb-4" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">First name</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) =>
                setForm((p) => ({ ...p, firstName: e.target.value }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Last name</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) =>
                setForm((p) => ({ ...p, lastName: e.target.value }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((p) => ({ ...p, role: e.target.value as UserRole }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  status: e.target.value as "active" | "inactive",
                }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [allowAccountCreation, setAllowAccountCreation] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [approvalRows, setApprovalRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{
    kind: "delete" | "signout";
    userId: string;
    email: string;
  } | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>({
    email: "",
    firstName: "",
    lastName: "",
    role: "user",
    status: "active",
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSaving, setAddUserSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, usersRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/users"),
      ]);
      if (!settingsRes.ok || !usersRes.ok) throw new Error("Failed to load");
      const settings = await settingsRes.json();
      const { users: userList } = await usersRes.json();
      setAllowAccountCreation(settings.allowAccountCreation ?? false);
      setUsers(userList ?? []);
      const pending = (userList ?? []).filter(
        (u: UserRow) => u.status === "pending_approval"
      );
      setApprovalRows(
        pending.map((u: UserRow) => ({
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          action: "" as const,
          role: u.role ?? "user",
        }))
      );
    } catch (e) {
      setMessage({ type: "err", text: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const userUpdates = users
        .filter((u) => u.status !== "pending_approval")
        .map((u) => ({
          id: u.id,
          firstName: u.firstName ?? undefined,
          lastName: u.lastName ?? undefined,
          status: u.status ?? undefined,
          role: u.role ?? undefined,
        }));
      const approvalQueue = approvalRows
        .filter((r) => r.action !== "")
        .map((r) => ({
          userId: r.userId,
          action: r.action as "approve" | "reject",
          role: r.action === "approve" ? r.role ?? undefined : undefined,
        }));
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowAccountCreation,
          users: userUpdates,
          approvalQueue,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      setMessage({
        type: "ok",
        text: "Changes saved. They will take effect on next sign-in.",
      });
      await load();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    setConfirm(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
      setMessage({ type: "ok", text: "User deactivated and settings removed." });
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Delete failed",
      });
    }
  };

  const handleSignOut = async (userId: string) => {
    setConfirm(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sign-out`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Sign out failed");
      await load();
      setMessage({ type: "ok", text: "User signed out." });
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Sign out failed",
      });
    }
  };

  const updateUser = (id: string, patch: Partial<UserRow>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  };

  const updateApprovalRow = (userId: string, patch: Partial<ApprovalRow>) => {
    setApprovalRows((prev) =>
      prev.map((r) => (r.userId === userId ? { ...r, ...patch } : r))
    );
  };

  const openAddUser = () => {
    setAddUserForm({
      email: "",
      firstName: "",
      lastName: "",
      role: "user",
      status: "active",
    });
    setAddUserError(null);
    setAddUserOpen(true);
  };

  const handleAddUser = async () => {
    const email = addUserForm.email.trim();
    const firstName = addUserForm.firstName.trim();
    const lastName = addUserForm.lastName.trim();
    if (!email || !firstName || !lastName) {
      setAddUserError("Email, first name, and last name are required.");
      return;
    }
    setAddUserSaving(true);
    setAddUserError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          role: addUserForm.role,
          status: addUserForm.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create user");
      }
      setAddUserOpen(false);
      setMessage({ type: "ok", text: "User added. They can sign in with Google using that email." });
      await load();
    } catch (e) {
      setAddUserError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setAddUserSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-gray-400">Loading...</div>
      </DashboardLayout>
    );
  }

  const existingUsers = users.filter((u) => u.status !== "pending_approval");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-white">User management</h1>

        {message && (
          <div
            className={
              message.type === "ok"
                ? "text-green-400 bg-green-900/30 border border-green-700 rounded p-3"
                : "text-red-400 bg-red-900/30 border border-red-700 rounded p-3"
            }
          >
            {message.text}
          </div>
        )}

        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAccountCreation}
                onChange={(e) => setAllowAccountCreation(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <span className="text-gray-200">
                Allow new account sign-ups (new accounts go to approval queue)
              </span>
            </label>
          </div>
        </section>

        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">
              Existing users
            </h2>
            <button
              type="button"
              onClick={openAddUser}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              Add New User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-600 text-gray-300">
                  <th className="py-2 pr-4">First name</th>
                  <th className="py-2 pr-4">Last name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {existingUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700">
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={u.firstName ?? ""}
                        onChange={(e) =>
                          updateUser(u.id, { firstName: e.target.value || null })
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={u.lastName ?? ""}
                        onChange={(e) =>
                          updateUser(u.id, { lastName: e.target.value || null })
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                      />
                    </td>
                    <td className="py-2 pr-4 text-gray-300">{u.email}</td>
                    <td className="py-2 pr-4">
                      <select
                        value={u.status ?? "active"}
                        onChange={(e) =>
                          updateUser(u.id, {
                            status: e.target.value as "active" | "inactive",
                          })
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={u.role ?? "user"}
                        onChange={(e) =>
                          updateUser(u.id, {
                            role: e.target.value as UserRole,
                          })
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            kind: "signout",
                            userId: u.id,
                            email: u.email,
                          })
                        }
                        className="text-gray-400 hover:text-white"
                        title="Sign out"
                        aria-label="Sign out user"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            kind: "delete",
                            userId: u.id,
                            email: u.email,
                          })
                        }
                        className="text-gray-400 hover:text-red-400"
                        title="Delete"
                        aria-label="Delete user"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {approvalRows.length > 0 && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              Approval queue
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-600 text-gray-300">
                    <th className="py-2 pr-4">First name</th>
                    <th className="py-2 pr-4">Last name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Approval</th>
                    <th className="py-2 pr-4">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalRows.map((r) => (
                    <tr key={r.userId} className="border-b border-gray-700">
                      <td className="py-2 pr-4 text-gray-300">
                        {r.firstName ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-gray-300">
                        {r.lastName ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-gray-300">{r.email}</td>
                      <td className="py-2 pr-4">
                        <select
                          value={r.action}
                          onChange={(e) =>
                            updateApprovalRow(r.userId, {
                              action: e.target.value as ApprovalRow["action"],
                            })
                          }
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                        >
                          <option value="">—</option>
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={r.role ?? "user"}
                          onChange={(e) =>
                            updateApprovalRow(r.userId, {
                              role: e.target.value as UserRole,
                            })
                          }
                          disabled={r.action !== "approve"}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={
            confirm.kind === "delete"
              ? "Delete user"
              : "Sign out user"
          }
          message={
            confirm.kind === "delete"
              ? `Deactivate this user and delete their settings? They will not be able to sign in. (${confirm.email})`
              : `Sign out this user immediately? (${confirm.email})`
          }
          confirmLabel={confirm.kind === "delete" ? "Delete" : "Sign out"}
          onConfirm={() =>
            confirm.kind === "delete"
              ? handleDelete(confirm.userId)
              : handleSignOut(confirm.userId)
          }
          onCancel={() => setConfirm(null)}
        />
      )}

      {addUserOpen && (
        <AddUserModal
          form={addUserForm}
          setForm={setAddUserForm}
          error={addUserError}
          saving={addUserSaving}
          onSave={handleAddUser}
          onCancel={() => setAddUserOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}
