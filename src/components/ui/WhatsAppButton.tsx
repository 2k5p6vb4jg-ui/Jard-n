import { whatsappLink } from "@/lib/whatsapp";

/** Logotipo simplificado de WhatsApp (lucide no lo incluye) */
function WaIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3Z" />
    </svg>
  );
}

/**
 * Botón «WhatsApp» con el mensaje ya escrito. No se muestra si el teléfono no es un móvil.
 * `compact`: solo el icono (para filas de listados).
 */
export function WhatsAppButton({ phone, text, label = "WhatsApp", compact = false, className = "" }: { phone: string | null | undefined; text: string; label?: string; compact?: boolean; className?: string }) {
  const href = whatsappLink(phone, text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={compact ? `${label} (${phone})` : undefined}
      title="Abre WhatsApp con el mensaje escrito; revíselo y pulse enviar"
      className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 font-medium text-[#128C4A] ring-1 ring-inset ring-[#25D366]/40 transition hover:bg-[#25D366]/20 ${
        compact ? "size-11 lg:size-10" : "min-h-11 px-3 text-sm lg:min-h-10"
      } ${className}`}
    >
      <WaIcon className={compact ? "size-5" : "size-4"} />
      {!compact && label}
    </a>
  );
}
