"use client";

import { useEffect, useState } from "react";

/** Contador en vivo hh:mm:ss desde `since` (cronómetro del técnico). */
export function Elapsed({ since }: { since: string }) {
  const start = new Date(since).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - start) / 1000));
  const fmt = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono tabular-nums" suppressHydrationWarning>
      {fmt(Math.floor(s / 3600))}:{fmt(Math.floor((s % 3600) / 60))}:{fmt(s % 60)}
    </span>
  );
}
