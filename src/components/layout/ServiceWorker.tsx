"use client";

import { useEffect } from "react";

/** Registra el service worker (solo funciona en https o en el propio ordenador: localhost). */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
