/** Grupo de botones tipo "pastilla" basado en radios: táctil y sin JavaScript. */
export function Segmented({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={name} value={o.value} defaultChecked={(defaultValue ?? "") === o.value} className="peer sr-only" />
          <span className="flex min-h-10 min-w-12 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-600 transition peer-checked:bg-white peer-checked:text-teal-700 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export const SIDE_OPTIONS = [
  { value: "BOTH", label: "Ambos" },
  { value: "LEFT", label: "Izq." },
  { value: "RIGHT", label: "Dcha." },
];
