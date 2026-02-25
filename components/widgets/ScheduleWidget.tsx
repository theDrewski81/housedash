"use client";

import { useEffect, useState } from "react";
import Widget from "@/components/ui/Widget";
import { CalendarEvent, ScheduleData } from "@/lib/api/calendar";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

interface ScheduleWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

function formatEventTimeRange(event: CalendarEvent): string {
  if (event.start.dateTime && event.end.dateTime) {
    return `${format(parseISO(event.start.dateTime), "h:mm a")} – ${format(parseISO(event.end.dateTime), "h:mm a")}`;
  }
  return "All day";
}

function formatUpcomingEvent(event: CalendarEvent): string {
  const date = event.start.dateTime
    ? parseISO(event.start.dateTime)
    : (() => {
        const [y, m, d] = event.start.date!.split("-").map(Number);
        return new Date(y, m - 1, d);
      })();
  const dateLabel = isToday(date)
    ? "Today"
    : isTomorrow(date)
      ? "Tomorrow"
      : format(date, "EEE, MMM d");
  const time = event.start.dateTime
    ? format(parseISO(event.start.dateTime), "h:mm a")
    : "All day";
  return `${event.summary} – ${dateLabel}, ${time}`;
}

export default function ScheduleWidget({ isExpanded, onExpandToggle }: ScheduleWidgetProps = {}) {
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
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(
        `/api/widgets/schedule?timezone=${encodeURIComponent(timezone)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          (data?.error as string) || "Failed to fetch schedule"
        );
      }
      setSchedule(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateString: string) => {
    const [y, m, d] = dateString.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  const currentContent = (() => {
    if (loading) return <div className="text-gray-400">Loading schedule...</div>;
    if (error) return <div className="text-red-400">Error: {error}</div>;
    if (!schedule) return <div className="text-gray-400">No upcoming events</div>;

    const todayKey = format(new Date(), "yyyy-MM-dd");
    const todayData = schedule.weeklyEvents.find((d) => d.date === todayKey);
    const now = new Date();

    const allDayToday = (todayData?.events ?? []).filter(
      (e) => !e.start.dateTime
    );
    const timedToday = (todayData?.events ?? []).filter(
      (e) => e.start.dateTime
    );
    const activeOrRemaining = timedToday.filter((e) => {
      const end = parseISO(e.end.dateTime!);
      return end > now;
    });

    const hasEventsToday = allDayToday.length > 0 || activeOrRemaining.length > 0;

    if (!hasEventsToday) {
      return (
        <div className="flex flex-col min-h-[140px]">
          <div className="text-gray-400 flex-shrink-0">No events today</div>
          {schedule.nextEvent && (
            <div className="flex-1 flex flex-col justify-end">
              <div className="font-semibold text-sm text-gray-300 mb-1">
                Upcoming
              </div>
              <div className="text-sm">
                {formatUpcomingEvent(schedule.nextEvent)}
              </div>
            </div>
          )}
        </div>
      );
    }

    const maxListLines = 3;
    const overflowCount =
      activeOrRemaining.length > maxListLines
        ? activeOrRemaining.length - (maxListLines - 1)
        : 0;
    const displayList = overflowCount > 0
      ? activeOrRemaining.slice(0, maxListLines - 1)
      : activeOrRemaining.slice(0, maxListLines);

    return (
      <div className="flex flex-col min-h-[140px]">
        <div className="flex-shrink-0">
          {allDayToday.map((e) => (
            <div key={e.id} className="font-medium text-sm">
              {e.summary}
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <ul className="list-none space-y-2 text-center w-full">
            {displayList.map((e) => (
              <li key={e.id} className="text-left">
                <div className="font-semibold text-base">{e.summary}</div>
                <div className="text-sm text-gray-400">
                  {formatEventTimeRange(e)}
                </div>
              </li>
            ))}
            {overflowCount > 0 && (
              <li className="text-gray-400 text-sm">
                Plus {overflowCount} more events
              </li>
            )}
          </ul>
        </div>
      </div>
    );
  })();

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
      isExpanded={isExpanded}
      onExpandToggle={onExpandToggle}
    >
      {currentContent}
    </Widget>
  );
}
