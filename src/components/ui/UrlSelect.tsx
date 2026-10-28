"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Desplegable de filtro que cambia un parámetro de la dirección (p. ej. ?centro=…) conservando los demás. */
export function UrlSelect({ param, options, placeholder, label }: { param: string; options: { value: string; label: string }[]; placeholder: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label={label}
      value={params.get(param) ?? ""}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        router.push(`${pathname}${next.size ? `?${next}` : ""}`);
      }}
      className="field appearance-auto lg:max-w-xs"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
