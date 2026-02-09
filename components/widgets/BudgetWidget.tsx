"use client";

import Widget from "@/components/ui/Widget";

interface BudgetWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export default function BudgetWidget({ isExpanded, onExpandToggle }: BudgetWidgetProps = {}) {
  return (
    <Widget
      title="Budget"
      expandedContent={<div>Complete budget view coming soon</div>}
      isExpanded={isExpanded}
      onExpandToggle={onExpandToggle}
    >
      <div>Balance loading...</div>
    </Widget>
  );
}
