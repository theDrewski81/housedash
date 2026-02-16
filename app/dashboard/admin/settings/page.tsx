"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

type SettingsResponse = {
  allowAccountCreation?: boolean;
  auditUserCrud?: boolean;
  weatherLat?: number | null;
  weatherLon?: number | null;
  weatherLocationName?: string | null;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data: SettingsResponse = await res.json();
      setWeatherLocation(
        data.weatherLocationName != null && data.weatherLocationName !== ""
          ? data.weatherLocationName
          : ""
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const value = weatherLocation.trim() || null;
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weatherLocation: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.details ?? data.error ?? "Failed to update settings"
        );
      }
      setSuccess(true);
      setWeatherLocation(
        data.weatherLocationName != null && data.weatherLocationName !== ""
          ? data.weatherLocationName
          : ""
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              Weather location
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Enter city and state (e.g. Seattle, WA) or ZIP code (e.g. 98101).
              Leave empty for default (New York City).
            </p>
            <form onSubmit={handleSave} className="space-y-4 max-w-md">
              {error && (
                <p className="text-red-400 text-sm" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-green-400 text-sm" role="status">
                  Settings saved.
                </p>
              )}
              <div>
                <label
                  htmlFor="weather-location"
                  className="block text-sm text-gray-300 mb-1"
                >
                  Location
                </label>
                <input
                  id="weather-location"
                  type="text"
                  value={weatherLocation}
                  onChange={(e) => setWeatherLocation(e.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500"
                  placeholder="e.g. Seattle, WA or 98101"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </form>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
