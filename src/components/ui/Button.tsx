import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
  secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 shadow-sm",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
};

// Altura mínima 48px: cómodo con guantes / dedo en la mesa del taller.
const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-medium transition " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/30 disabled:opacity-50 active:scale-[0.98]";

interface Common {
  variant?: Variant;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function Button({ variant = "primary", icon: Icon, children, className = "", ...rest }: Common & ComponentProps<"button">) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {Icon && <Icon className="size-5" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = "primary", icon: Icon, children, className = "", ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {Icon && <Icon className="size-5" />}
      {children}
    </Link>
  );
}
