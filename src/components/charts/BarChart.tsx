/**
 * Columnas de una sola serie (sin JavaScript): barras finas con extremo redondeado,
 * rejilla tenue, etiqueta solo en el valor máximo y tooltip al pasar el ratón o al tocar.
 * Incluye una tabla con los mismos datos para lectores de pantalla y para consultar cifras.
 */
export interface BarDatum {
  label: string;
  longLabel: string;
  value: number;
  display: string;
}

/** Alinea el tooltip hacia dentro en los extremos para que no se salga de la pantalla */
const tipAlign = (i: number, n: number) => (i < n / 3 ? "left-0" : i >= (2 * n) / 3 ? "right-0" : "left-1/2 -translate-x-1/2");

export function BarChart({ data, title, height = 150 }: { data: BarDatum[]; title: string; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = max > 0 ? max : 1;
  const maxIdx = max > 0 ? data.findIndex((d) => d.value === max) : -1;

  return (
    <figure>
      <div className="relative" style={{ height }} role="img" aria-label={`${title}: gráfico de barras por mes`}>
        {/* Rejilla: base y mitad */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-slate-200" />
        <div className="pointer-events-none absolute inset-x-0 border-t border-slate-100" style={{ bottom: height / 2 }} />
        <div className="absolute inset-0 flex items-end gap-0.5">
          {data.map((d, i) => (
            <div key={d.label + i} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none" aria-label={`${d.longLabel}: ${d.display}`}>
              {/* Zona de toque más grande que la barra */}
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-teal-600 transition group-hover:bg-teal-700 group-focus:bg-teal-700"
                style={{ height: d.value > 0 ? Math.max(3, (d.value / top) * (height - 22)) : 0 }}
              />
              {i === maxIdx && (
                <span className="pointer-events-none absolute whitespace-nowrap text-[11px] font-medium text-slate-600 group-hover:opacity-0 group-focus:opacity-0" style={{ bottom: (d.value / top) * (height - 22) + 4 }}>
                  {d.display}
                </span>
              )}
              <span className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap ${tipAlign(i, data.length)} rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block`}>
                <span className="block text-slate-300">{d.longLabel}</span>
                <span className="font-semibold">{d.display}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-0.5">
        {data.map((d, i) => (
          <span key={d.label + i} className="flex-1 text-center text-[11px] text-slate-500">{d.label}</span>
        ))}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">Ver tabla</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">{title}</caption>
          <tbody className="divide-y divide-slate-100">
            {data.map((d, i) => (
              <tr key={d.label + i}><td className="py-1 capitalize text-slate-600">{d.longLabel}</td><td className="py-1 text-right font-medium">{d.display}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
