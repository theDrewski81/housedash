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
    load();
  }, [load]);

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
                          No log entries yet. Enable &quot;Log user management
                          actions&quot; in User management to record actions.
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
