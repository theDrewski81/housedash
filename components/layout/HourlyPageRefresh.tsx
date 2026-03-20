"use client";

import { useEffect } from "react";
import { getMsUntilNextHour } from "@/lib/hour-boundary";

/**
 * Full page reload at the start of each local clock hour (dashboard only).
 */
export default function HourlyPageRefresh() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      window.location.reload();
    }, getMsUntilNextHour());
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
