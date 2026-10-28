/** Logo de la ortopedia o, mientras no haya, sus iniciales en dorado sobre el color principal. */
export function BrandMark({ name, logoUrl, size = "md" }: { name: string; logoUrl: string | null; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "size-8 rounded-lg text-xs", md: "size-10 rounded-xl text-sm", lg: "size-16 rounded-2xl text-xl" }[size];
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className={`${box} shrink-0 bg-white object-contain p-0.5`} />;
  }
  const initials = name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span className={`${box} grid shrink-0 place-items-center bg-teal-600 font-semibold tracking-wide text-gold-400 ring-1 ring-inset ring-gold-500/40`} aria-hidden>
      {initials || "·"}
    </span>
  );
}
