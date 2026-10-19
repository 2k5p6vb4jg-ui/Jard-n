/**
 * Reduce una foto en el propio dispositivo antes de enviarla por la Wi-Fi (lado de cliente).
 * Si el navegador no puede decodificarla (p. ej. HEIC fuera de Safari) devuelve la original.
 * `minBytes`: por debajo de ese tamaño se envía tal cual.
 */
export async function shrinkImage(file: File, name: string, maxSide: number, minBytes = 0): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || file.size < minBytes) return new File([file], name, { type: file.type });
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || (blob.size >= file.size && scale === 1 && file.type !== "image/heic")) return new File([file], name, { type: file.type });
    return new File([blob], name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return new File([file], name, { type: file.type });
  }
}
