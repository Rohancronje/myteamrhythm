"use client";

import { useEffect } from "react";

// Registers the service worker so Rhythm installs as a PWA and launches instantly.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
