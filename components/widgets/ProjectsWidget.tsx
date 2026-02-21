"use client";

import Widget from "@/components/ui/Widget";

interface ProjectsWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export default function ProjectsWidget({ isExpanded, onExpandToggle }: ProjectsWidgetProps = {}) {
  return (
    <Widget
      title="Projects"
      expandedContent={<div>Projects view coming soon</div>}
      isExpanded={isExpanded}
      onExpandToggle={onExpandToggle}
    >
      <div>Projects placeholder</div>
    </Widget>
  );
}
