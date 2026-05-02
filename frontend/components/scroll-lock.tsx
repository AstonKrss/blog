"use client";

import { useEffect } from "react";

/**
 * Prevents browser scroll restoration from pushing the page to an unexpected
 * position on back-navigation. Works once per session.
 */
export default function ScrollLock() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Reset to top on mount (handles any browser scroll restoration quirks)
    window.scrollTo(0, 0);

    return () => {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "auto";
      }
    };
  }, []);

  return null;
}
