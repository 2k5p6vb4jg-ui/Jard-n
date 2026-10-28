import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-card ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  icon: Icon,
  action,
  subtitle,
}: {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <Icon className="size-[18px]" />
          </span>
        )}
        <div>
          <h2 className="font-semibold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
