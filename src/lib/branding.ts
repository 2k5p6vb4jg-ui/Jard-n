import "server-only";
import { readUpload } from "./storage";

/** Logo de Ajustes listo para incrustar en un PDF (null si no hay o no se puede leer). */
export async function loadLogo(logoPath: string | null | undefined): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  if (!logoPath) return null;
  try {
    return { bytes: await readUpload(logoPath), type: logoPath.endsWith(".png") ? "png" : "jpg" };
  } catch {
    return null; // archivo borrado a mano: el PDF se genera sin logo
  }
}
