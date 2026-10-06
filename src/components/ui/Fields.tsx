import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Bloque de formulario con título (tarjeta) */
export function FormSection({ title, icon: Icon, description, children }: { title: string; icon?: LucideIcon; description?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 flex items-center gap-3">
        {Icon && (
          <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-600">
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

interface Base {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

function Label({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={name} className="field-label">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

export function TextField({
  name,
  label,
  hint,
  required,
  className = "",
  defaultValue,
  type = "text",
  placeholder,
  inputMode,
  suffix,
  autoComplete = "off",
}: Base & {
  defaultValue?: string | number | null;
  type?: "text" | "email" | "tel" | "date" | "number";
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email";
  suffix?: string;
  autoComplete?: string;
}) {
  return (
    <div className={className}>
      <Label name={name} label={label} required={required} />
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={`field ${suffix ? "pr-14" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Campo numérico que acepta coma decimal (teclado numérico en móvil) */
export function NumberField(props: Omit<Parameters<typeof TextField>[0], "type" | "inputMode">) {
  return <TextField {...props} type="text" inputMode="decimal" />;
}

export function MoneyField(props: Omit<Parameters<typeof TextField>[0], "type" | "inputMode" | "suffix">) {
  return <TextField {...props} type="text" inputMode="decimal" suffix="€" placeholder={props.placeholder ?? "0,00"} />;
}

export function SelectField({
  name,
  label,
  hint,
  required,
  className = "",
  defaultValue,
  options,
  placeholder,
}: Base & {
  defaultValue?: string | null;
  options: { value: string; label: string }[] | Record<string, string>;
  placeholder?: string;
}) {
  const opts = Array.isArray(options) ? options : Object.entries(options).map(([value, label]) => ({ value, label }));
  return (
    <div className={className}>
      <Label name={name} label={label} required={required} />
      <select id={name} name={name} required={required} defaultValue={defaultValue ?? ""} className="field appearance-auto">
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function TextAreaField({ name, label, hint, required, className = "sm:col-span-2 lg:col-span-3", defaultValue, rows = 3, placeholder }: Base & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  return (
    <div className={className}>
      <Label name={name} label={label} required={required} />
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="field min-h-24 py-3"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function CheckboxField({ name, label, hint, defaultChecked, className = "" }: Base & { defaultChecked?: boolean }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 ${className}`}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-6 shrink-0 accent-teal-600" />
      <span>
        <span className="font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-sm text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
