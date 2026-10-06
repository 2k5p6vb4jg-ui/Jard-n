# Jardón Ortopedia · Gestión clínica y de taller

Web App **100 % local** para una ortopedia: historial clínico (plantillas a medida y medias de compresión),
taller de reparaciones con desglose de costes, trazabilidad por número de serie y copias de seguridad.
Funciona en el PC de la tienda y se usa desde tablets y móviles conectados a la misma Wi-Fi.
Ningún dato sale del equipo (sin servicios en la nube, sin telemetría).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · SQLite · lucide-react

![Panel](docs/capturas/panel-escritorio.png)

## Puesta en marcha

```bash
npm install
cp .env.example .env          # DATABASE_URL="file:./dev.db" → prisma/dev.db
npm run setup                 # crea la BD (migración init) y carga datos de prueba
npm run dev                   # desarrollo, escucha en 0.0.0.0:3000
```

Para el uso diario en la tienda (más rápido y estable):

```bash
npm run build && npm start    # producción, escucha en 0.0.0.0:3000
```

Al arrancar se imprimen las direcciones, p. ej. `http://192.168.1.40:3000`: ábrala desde la tablet o el móvil.
Si no conecta, permita el puerto 3000 en el cortafuegos de Windows/macOS **solo para redes privadas**.

| Script | Uso |
| --- | --- |
| `npm run db:seed` | Vuelve a cargar los datos ficticios (borra los existentes) |
| `npm run db:migrate` | Crea una migración tras cambiar `schema.prisma` |
| `npm run db:studio` | Explorador visual de la BD |
| `npm run lint` | Comprobación de tipos |

## Estructura

```
prisma/
  schema.prisma          Modelo de datos completo (4 módulos)
  seed.ts                Datos ficticios con fechas relativas a hoy
  migrations/
scripts/lan-info.mjs     Muestra las IPs de la red local al arrancar
uploads/<pacienteId>/    Estudios de pisada, fotos de huellas, recetas (no versionado)
src/
  app/
    page.tsx             Panel: órdenes por estado + avisos de renovación
    pacientes/           Listado, ficha clínica, alta
    taller/              Órdenes de trabajo por estado, detalle con costes
    trazabilidad/        Productos por nº de serie e histórico de intervenciones
    configuracion/       Datos del negocio y copia de seguridad
    api/backup/          Descarga instantánea consistente de la BD (VACUUM INTO)
    api/uploads/[...]    Sirve adjuntos registrados (protegido contra path traversal)
  components/ui/         Card, Badge, Button (≥48 px táctil), PageHeader, EmptyState
  components/layout/     Barra lateral (escritorio) y barra inferior (móvil)
  lib/
    prisma.ts            Cliente único de Prisma
    labels.ts            Etiquetas en castellano y colores de badge por enumerado
    renewals.ts          Cálculo de avisos (medias 6 meses, plantillas 12 meses)
    money.ts             Importes en céntimos y cálculo de totales de taller
    storage.ts           Guardado de adjuntos por paciente
```

## Modelo de datos (resumen)

- **CRM clínico:** `Patient` → `InsolePrescription` (+ `InsolePathology`, `InsoleCorrection`),
  `CompressionStocking` (perímetros cB…cT y longitudes lA-x, receta / Seguridad Social), `ClinicalDocument`.
  Cada prescripción guarda `deliveredAt` y `nextReviewAt` (indexado) + `renewalStatus` para gestionar el aviso.
- **Taller:** `WorkOrder` (flujo Entrada → Diagnóstico → Presupuestado → En reparación → Listo → Entregado),
  `WorkOrderPart`, `TimeEntry`, `WorkOrderStatusChange`, `Quote` (instantánea de importes para el PDF), `Technician`.
- **Trazabilidad:** `TrackedProduct` (nº de serie único, lote, UDI, garantía) y `ProductIntervention`.
- **Sistema:** `Settings` (datos fiscales, tarifa/hora, IVA, plazos de renovación), `AuditLog`, `BackupRecord`.

Los importes se guardan en **céntimos** (`Int`) para evitar errores de redondeo.

## Privacidad (RGPD)

- La BD y los adjuntos viven solo en este equipo y están excluidos de Git (`.gitignore`).
- Las copias de seguridad contienen datos de salud (art. 9 RGPD): guárdelas en un soporte cifrado y custodiado.
- Se recomienda cifrar el disco del PC (BitLocker / FileVault) y usar una Wi-Fi WPA2/3 sin acceso de invitados.
- `AuditLog` registra exportaciones y copias; el borrado de un paciente elimina en cascada su historial clínico.

## Qué se puede hacer ya

- **Pacientes:** alta y edición (DNI/NIE con letra verificada, consentimiento RGPD con fecha).
- **Plantillas y medias:** alta y edición completas. Al marcarlas como *Entregada* se programa la revisión
  (12 / 6 meses) y se cierran los avisos de prescripciones anteriores del mismo tipo.
- **Taller:** entrada de equipos (con código OT automático y datos rellenados desde trazabilidad),
  avance/retroceso de estado, anulación, piezas con coste y PVP, cronómetro del técnico y tiempo manual,
  desglose de costes en vivo. Al entregar un equipo con nº de serie, la intervención queda en su histórico.
- **Trazabilidad:** alta y edición de productos; la garantía se calcula desde la fecha de entrega.
- **Documentos:** botón «Hacer foto» que abre la cámara trasera del móvil/tablet (`capture="environment"`,
  funciona sin HTTPS) y subida de PDF, imágenes o datos exportados del software de pisada. Las fotos
  grandes se reducen en el propio dispositivo antes de enviarse. Galería con filtros, visor a pantalla
  completa, descarga y borrado. Archivos en `uploads/<paciente>/`, servidos solo si están registrados.
- **Presupuestos en PDF:** se generan desde la orden con copia fija de importes (`PRES-AAAA-NNNN`),
  con datos de la ortopedia, cliente, equipo, desglose, IVA, validez, firma y pie legal en cada página.
  Estados: borrador → entregado → aceptado (la orden pasa a «En reparación») o rechazado; caducan solos.

![Presupuesto](docs/capturas/presupuesto-pdf.png)

## Próxima fase

Gestión de avisos desde el panel (llamado / renovado / no renueva), ajustes editables (datos fiscales,
logo en el PDF, técnicos), copia de seguridad que incluya los adjuntos y restauración, PIN de acceso,
y derechos RGPD (exportar / borrar los datos de un paciente).
