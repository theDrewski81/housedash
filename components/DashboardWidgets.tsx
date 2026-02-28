"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import ScheduleWidget from "@/components/widgets/ScheduleWidget";
import DinnersWidget from "@/components/widgets/DinnersWidget";
import GroceriesWidget from "@/components/widgets/GroceriesWidget";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import ProjectsWidget from "@/components/widgets/ProjectsWidget";

const WIDGETS = [
  { component: WeatherWidget },
  { component: ScheduleWidget },
  { component: DinnersWidget },
  { component: GroceriesWidget },
  { component: BudgetWidget },
  { component: ProjectsWidget },
] as const;

const SWIPE_THRESHOLD_PX = 50;

const DINNERS_WIDGET_INDEX = 2;
const PROJECTS_WIDGET_INDEX = 5;

export default function DashboardWidgets() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandToView, setExpandToView] = useState<"rotation" | "completions" | null>(null);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goPrev = useCallback(
    () => setExpandedIndex((i) => (i === null ? null : (i - 1 + WIDGETS.length) % WIDGETS.length)),
    []
  );
  const goNext = useCallback(
    () => setExpandedIndex((i) => (i === null ? null : (i + 1) % WIDGETS.length)),
    []
  );

  useEffect(() => {
    if (expandedIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedIndex, goPrev, goNext]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || expandedIndex === null) return;
      const endX = e.changedTouches[0].clientX;
      const delta = endX - touchStartX.current;
      if (delta > SWIPE_THRESHOLD_PX) goPrev();
      else if (delta < -SWIPE_THRESHOLD_PX) goNext();
      touchStartX.current = null;
    },
    [expandedIndex, goPrev, goNext]
  );

  if (expandedIndex !== null) {
    const CurrentWidget = WIDGETS[expandedIndex].component;
    return (
      <div
        ref={containerRef}
        className="relative flex w-full flex-col"
        style={{ minHeight: "calc(100vh - 8rem)" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        data-widget-expanded-view
      >
        {/* Arrow buttons: visible on md and up */}
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gray-700/90 p-2 text-white shadow-lg transition hover:bg-gray-600 md:flex hidden"
          aria-label="Previous widget"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gray-700/90 p-2 text-white shadow-lg transition hover:bg-gray-600 md:flex hidden"
          aria-label="Next widget"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>

        {/* Expanded view: fills full content area below header; horizontal padding so Prev/Next buttons do not overlap content */}
        <div className="flex min-h-0 flex-1 flex-col py-4 md:py-0 md:px-14">
          <div className="min-h-0 flex-1 overflow-auto">
            {expandedIndex === DINNERS_WIDGET_INDEX ? (
              <DinnersWidget
                isExpanded={true}
                onExpandToggle={() => setExpandedIndex(null)}
                expandToView={
                  expandToView === "rotation" ? "rotation" : undefined
                }
                clearExpandToView={() => setExpandToView(null)}
              />
            ) : expandedIndex === PROJECTS_WIDGET_INDEX ? (
              <ProjectsWidget
                isExpanded={true}
                onExpandToggle={() => setExpandedIndex(null)}
                expandToView={
                  expandToView === "completions" ? "completions" : undefined
                }
                clearExpandToView={() => setExpandToView(null)}
              />
            ) : (
              <CurrentWidget
                isExpanded={true}
                onExpandToggle={() => setExpandedIndex(null)}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      data-dashboard-widgets="grid"
    >
      {WIDGETS.map(({ component: WidgetComponent }, i) => (
        <WidgetComponent
          key={i}
          isExpanded={false}
          onExpandToggle={() => setExpandedIndex(i)}
          onExpandToRotation={
            WidgetComponent === DinnersWidget
              ? () => {
                  setExpandToView("rotation");
                  setExpandedIndex(DINNERS_WIDGET_INDEX);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
