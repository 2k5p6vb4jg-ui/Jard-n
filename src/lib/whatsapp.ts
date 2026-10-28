/**
 * Enlaces de WhatsApp con el mensaje ya escrito (wa.me): abre WhatsApp en el móvil o WhatsApp Web en el
 * ordenador. No envía nada por su cuenta ni usa servicios externos: el mensaje lo envía la persona.
 */

/** Número en formato internacional sin «+», o null si no parece un móvil (los fijos no tienen WhatsApp). */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^[67]\d{8}$/.test(d)) d = `34${d}`; // móvil español sin prefijo
  else return null;
  if (d.startsWith("34") && !/^34[67]\d{8}$/.test(d)) return null; // fijo español
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export function whatsappLink(phone: string | null | undefined, text: string) {
  const n = whatsappNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

const hello = (firstName?: string | null) => (firstName ? `Hola, ${firstName.split(" ")[0]}.` : "Hola.");

/** Mensajes habituales (se pueden retocar en WhatsApp antes de enviar). */
export const messages = {
  repairReady: (name: string | null, equipment: string, business: string) =>
    `${hello(name)} Le escribimos de ${business}: la reparación de su ${equipment.toLowerCase()} ya está terminada. Puede pasar a recogerla cuando quiera. ¡Gracias!`,
  repairQuote: (name: string | null, equipment: string, business: string) =>
    `${hello(name)} Le escribimos de ${business}: tenemos preparado el presupuesto de la reparación de su ${equipment.toLowerCase()}. ¿Le parece bien que le llamemos para comentarlo?`,
  repairGeneric: (name: string | null, code: string, business: string) => `${hello(name)} Le escribimos de ${business} por su reparación ${code}.`,
  insoleReady: (name: string | null, business: string) => `${hello(name)} Le escribimos de ${business}: sus plantillas ya están listas para recoger. ¡Gracias!`,
  insoleGeneric: (name: string | null, business: string) => `${hello(name)} Le escribimos de ${business} por sus plantillas.`,
  orderArrived: (name: string | null, item: string, business: string) => `${hello(name)} Le escribimos de ${business}: ya ha llegado su pedido (${item}). Puede pasar a recogerlo cuando quiera.`,
  renewal: (name: string | null, what: string, business: string) =>
    `${hello(name)} Le escribimos de ${business}: ya toca revisar o renovar sus ${what.toLowerCase()}. ¿Quiere que le demos cita?`,
  appointment: (name: string | null, what: string, when: string, business: string) =>
    `${hello(name)} Le recordamos su cita en ${business} (${what.toLowerCase()}) el ${when}. Si no puede venir, avísenos por favor.`,
  generic: (name: string | null, business: string) => `${hello(name)} Le escribimos de ${business}.`,
};
