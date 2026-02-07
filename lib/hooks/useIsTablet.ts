"use client";

import { useState, useEffect } from "react";

/** Breakpoint (px) above which we treat the device as tablet for kiosk mode. */
const TABLET_MIN_WIDTH = 768;

/**
 * True when viewport width is at least TABLET_MIN_WIDTH.
 * Used to show kiosk option only on tablet; phones get standard mobile web.
 * Returns false until mounted to avoid hydration mismatch.
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= TABLET_MIN_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isTablet;
}
