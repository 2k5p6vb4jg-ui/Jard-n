import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
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
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-600">
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
