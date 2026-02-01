"use client";

import { ReactNode, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface WidgetProps {
  title: string;
  children: ReactNode;
  expandedContent?: ReactNode;
  className?: string;
}

export default function Widget({
  title,
  children,
  expandedContent,
  className = "",
}: WidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-gray-800 rounded-lg p-6 shadow-lg transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {expandedContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-6 w-6" />
            ) : (
              <ChevronDownIcon className="h-6 w-6" />
            )}
          </button>
        )}
      </div>
      <div className="text-gray-200">{children}</div>
      {expandedContent && isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
          {expandedContent}
        </div>
      )}
    </div>
  );
}
