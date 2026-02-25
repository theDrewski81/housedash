"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

type CalendarConfig = { id: string; color?: string };

type SettingsResponse = {
  allowAccountCreation?: boolean;
  auditUserCrud?: boolean;
  weatherLat?: number | null;
  weatherLon?: number | null;
  weatherLocationName?: string | null;
  calendarConfigs?: CalendarConfig[] | null;
};

type SchemaStatusResponse = {
  weatherLocationSupported?: boolean;
  calendarConfigsSupported?: boolean;
};

const DEFAULT_CALENDAR_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCalendars, setSavingCalendars] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<string>("");
  const [weatherLocationSupported, setWeatherLocationSupported] =
    useState<boolean>(true);
  const [calendarConfigsSupported, setCalendarConfigsSupported] =
    useState<boolean>(true);
  const [calendarConfigs, setCalendarConfigs] = useState<CalendarConfig[]>([]);
  const [newCalendarId, setNewCalendarId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, schemaRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/settings/schema-status"),
      ]);
      if (!settingsRes.ok) throw new Error("Failed to load settings");
      const data: SettingsResponse = await settingsRes.json();
      setWeatherLocation(
        data.weatherLocationName != null && data.weatherLocationName !== ""
          ? data.weatherLocationName
          : ""
      );
      setCalendarConfigs(
        Array.isArray(data.calendarConfigs) ? data.calendarConfigs : []
      );
      if (schemaRes.ok) {
        const schemaData: SchemaStatusResponse = await schemaRes.json();
        setWeatherLocationSupported(
          schemaData.weatherLocationSupported !== false
        );
        setCalendarConfigsSupported(
          schemaData.calendarConfigsSupported !== false
        );
      }
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
          data.error ?? data.details ?? "Failed to update settings"
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

  const handleAddCalendar = () => {
    const id = newCalendarId.trim();
    if (!id) return;
    if (calendarConfigs.some((c) => c.id === id)) return;
    const color =
      DEFAULT_CALENDAR_COLORS[
        calendarConfigs.length % DEFAULT_CALENDAR_COLORS.length
      ];
    setCalendarConfigs([...calendarConfigs, { id, color }]);
    setNewCalendarId("");
  };

  const handleRemoveCalendar = (index: number) => {
    setCalendarConfigs(calendarConfigs.filter((_, i) => i !== index));
  };

  const handleCalendarColorChange = (index: number, color: string) => {
    setCalendarConfigs(
      calendarConfigs.map((c, i) => (i === index ? { ...c, color } : c))
    );
  };

  const handleSaveCalendars = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCalendars(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarConfigs:
            calendarConfigs.length > 0 ? calendarConfigs : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ?? data.details ?? "Failed to update calendars"
        );
      }
      setSuccess(true);
      setCalendarConfigs(
        Array.isArray(data.calendarConfigs) ? data.calendarConfigs : []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save calendars");
    } finally {
      setSavingCalendars(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                Weather location
              </h2>
              {!weatherLocationSupported && (
                <div className="mb-4 rounded border border-amber-600/50 bg-amber-900/20 px-3 py-2 text-sm text-amber-200">
                  Migrations required to save weather location. See README Docker
                  section to run migrations.
                </div>
              )}
              <p className="text-gray-400 text-sm mb-4">
                Enter city and state (e.g. Seattle, WA) or ZIP code (e.g.
                98101). Leave empty for default (New York City).
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

            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                Calendars
              </h2>
              {!calendarConfigsSupported && (
                <div className="mb-4 rounded border border-amber-600/50 bg-amber-900/20 px-3 py-2 text-sm text-amber-200">
                  Migrations required to manage calendars. Run{" "}
                  <code className="bg-gray-800 px-1 rounded">
                    npx prisma migrate dev
                  </code>{" "}
                  or see README Docker section.
                </div>
              )}
              <p className="text-gray-400 text-sm mb-4">
                Add public Google Calendar IDs. Get the ID from calendar
                Settings → Integrate calendar (e.g.{" "}
                <code className="bg-gray-700 px-1 rounded text-gray-300">
                  xxx@group.calendar.google.com
                </code>
                ). Assign a color to each calendar for the Schedule widget.
              </p>
              <form onSubmit={handleSaveCalendars} className="space-y-4">
                <div className="space-y-3">
                  {calendarConfigs.map((cal, index) => (
                    <div
                      key={`${cal.id}-${index}`}
                      className="flex items-center gap-3 rounded border border-gray-600 bg-gray-700/50 p-3"
                    >
                      <input
                        type="color"
                        value={cal.color ?? DEFAULT_CALENDAR_COLORS[0]}
                        onChange={(e) =>
                          handleCalendarColorChange(index, e.target.value)
                        }
                        className="h-9 w-9 cursor-pointer rounded border border-gray-600 bg-transparent p-0"
                        title="Calendar color"
                      />
                      <input
                        type="text"
                        value={cal.id}
                        readOnly
                        className="flex-1 rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCalendar(index)}
                        className="rounded p-2 text-gray-400 hover:bg-gray-600 hover:text-red-400"
                        aria-label="Remove calendar"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newCalendarId}
                    onChange={(e) => setNewCalendarId(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddCalendar())
                    }
                    placeholder="Calendar ID (e.g. xxx@group.calendar.google.com)"
                    className="flex-1 min-w-[200px] rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCalendar}
                    disabled={!newCalendarId.trim()}
                    className="inline-flex items-center gap-1 rounded bg-gray-600 px-3 py-2 text-white hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={savingCalendars || !calendarConfigsSupported}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCalendars ? "Saving..." : "Save calendars"}
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
