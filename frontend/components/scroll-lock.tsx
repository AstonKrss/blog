"use client";

import { useEffect } from "react";

/**
 * Locks body scroll until the page is fully settled (after iframe hydration).
 * This fixes the homepage auto-scroll issue where the browser would restore
 * scroll position or the terminal iframe's scrollToBottom() would push the page down.
 *
 * The lock is permanent once set — no timeout unlock — because the iframe
 * loads asynchronously and we need to stay locked until it's ready.
 */
export default function ScrollLock() {
  useEffect(() => {
    // Immediately reset scroll to top
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";

    // Lock scroll restoration — prevents browser from restoring scroll pos on back-nav
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Unlock after iframe has time to load and settle
    // (terminal loads at /terminal route, isEmbedded=false there, triggers scrollToBottom)
    const unlockTimer = setTimeout(() => {
      document.body.style.removeProperty("overflow");
      // Final safety reset — force back to top in case iframe caused scroll
      window.scrollTo(0, 0);
    }, 1500);

    return () => {
      clearTimeout(unlockTimer);
      document.body.style.removeProperty("overflow");
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "auto";
      }
    };
  }, []);

  return null;
}
