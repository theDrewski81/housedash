"use client";

import { useEffect, useState } from "react";
import Widget from "@/components/ui/Widget";
import { ScheduleData } from "@/lib/api/calendar";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

export default function ScheduleWidget() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedule();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/widgets/schedule");
      if (!response.ok) throw new Error("Failed to fetch schedule");
      const data = await response.json();
      setSchedule(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (event: ScheduleData["nextEvent"]) => {
    if (!event) return "";
    if (event.start.dateTime) {
      return format(parseISO(event.start.dateTime), "h:mm a");
    }
    return "All day";
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  const currentContent = schedule?.nextEvent ? (
    <div className="space-y-2">
      <div className="font-semibold text-lg">{schedule.nextEvent.summary}</div>
      <div className="text-sm text-gray-400">
        {formatEventTime(schedule.nextEvent)}
      </div>
      {schedule.nextEvent.location && (
        <div className="text-sm text-gray-400">
          📍 {schedule.nextEvent.location}
        </div>
      )}
      {schedule.nextEvent.description && (
        <div className="text-sm text-gray-300 mt-2 line-clamp-2">
          {schedule.nextEvent.description}
        </div>
      )}
    </div>
  ) : loading ? (
    <div className="text-gray-400">Loading schedule...</div>
  ) : error ? (
    <div className="text-red-400">Error: {error}</div>
  ) : (
    <div className="text-gray-400">No upcoming events</div>
  );

  const weeklyContent = schedule ? (
    <div className="space-y-4">
      {schedule.weeklyEvents.length > 0 ? (
        schedule.weeklyEvents.map((day) => (
          <div key={day.date} className="border-b border-gray-700 pb-3 last:border-0">
            <div className="font-semibold text-sm mb-2 text-gray-300">
              {formatEventDate(day.date)}
            </div>
            <div className="space-y-2">
              {day.events.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-700 rounded p-2 text-sm"
                >
                  <div className="font-medium">{event.summary}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {event.start.dateTime
                      ? format(parseISO(event.start.dateTime), "h:mm a")
                      : "All day"}
                    {event.location && ` • ${event.location}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-gray-400 text-sm">No events this week</div>
      )}
    </div>
  ) : null;

  return (
    <Widget
      title="Schedule"
      expandedContent={weeklyContent}
      className="lg:col-span-1"
    >
      {currentContent}
    </Widget>
  );
}
