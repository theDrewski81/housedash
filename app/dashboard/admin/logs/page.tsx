"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

type LogEntry = {
  id: string;
  action: string;
  targetUserId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  adminUser: {
    id: string;
    email: string;
    name: string;
  } | null;
};

type LogsResponse = {
  items: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 20;

export default function AdminLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [auditUserCrud, setAuditUserCrud] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const json = await res.json();
      setAuditUserCrud(json.auditUserCrud ?? false);
    } catch {
      setAuditUserCrud(false);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/logs?page=${page}&pageSize=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("Failed to load logs");
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAuditToggle = async (checked: boolean) => {
    setAuditUserCrud(checked);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditUserCrud: checked }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
    } catch {
      setAuditUserCrud(!checked);
    }
  };

  const formatAction = (action: string): string => {
    return action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Logs</h1>

        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Log settings</h2>
          {settingsLoading ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={auditUserCrud}
                onChange={(e) => handleAuditToggle(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <span className="text-gray-200">
                Log user management actions
              </span>
            </label>
          )}
        </section>

        {loading && <div className="text-gray-400">Loading...</div>}

        {!loading && data && (
          <>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-600 text-gray-300 bg-gray-800">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 px-4 text-center text-gray-500"
                        >
                          No log entries yet. Enable the option above to record
                          actions.
                        </td>
                      </tr>
                    ) : (
                      data.items.map((e) => (
                        <tr
                          key={e.id}
                          className="border-b border-gray-700 hover:bg-gray-700/50"
                        >
                          <td className="py-2 px-4 text-gray-400 whitespace-nowrap">
                            {new Date(e.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 px-4 text-gray-300">
                            {e.adminUser?.name ?? e.adminUser?.email ?? "—"}
                          </td>
                          <td className="py-2 px-4 text-white">
                            {formatAction(e.action)}
                          </td>
                          <td className="py-2 px-4 text-gray-400">
                            {e.targetUserId ? (
                              <span className="text-gray-500 font-mono text-xs">
                                {e.targetUserId}
                              </span>
                            ) : null}
                            {e.details && Object.keys(e.details).length > 0 ? (
                              <>
                                {e.targetUserId ? " — " : null}
                                {Object.entries(e.details).map(([k, v]) => (
                                  <span key={k} className="mr-2">
                                    {k}:{" "}
                                    {typeof v === "object"
                                      ? JSON.stringify(v)
                                      : String(v)}
                                  </span>
                                ))}
                              </>
                            ) : null}
                            {!e.targetUserId &&
                              (!e.details || Object.keys(e.details).length === 0) &&
                              "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center gap-4 text-gray-400">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span>
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  disabled={page >= data.totalPages}
                  className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !data && (
          <div className="text-red-400">Failed to load logs.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
