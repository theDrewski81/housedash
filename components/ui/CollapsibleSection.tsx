"use client";

import { useState, ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export default function CollapsibleSection({
  title,
  children,
  defaultCollapsed = true,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-6 py-4 text-left hover:bg-gray-700/50 transition-colors"
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRightIcon className="h-5 w-5 text-gray-400 shrink-0" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400 shrink-0" />
        )}
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </button>
      {!collapsed && <div className="px-6 pb-6 pt-0">{children}</div>}
    </section>
  );
}
