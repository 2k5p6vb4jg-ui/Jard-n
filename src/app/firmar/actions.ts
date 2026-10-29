"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SignatureKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { readSignatureImage, SIGNATURE_KINDS } from "@/lib/signatures";
import { currentSession, requireSection } from "@/lib/session";
import { type ActionState, bool, FormError, handle, required, str } from "@/lib/forms";
import { setQuoteStatus } from "@/app/taller/quotes";
import { setProposalStatus } from "@/app/centros/propuestas";
import { loadSignTarget } from "./target";

export async function saveSignature(kind: SignatureKind, id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let back = "/";
  const res = await handle(async () => {
    if (!(kind in SIGNATURE_KINDS)) throw new FormError("Documento no válido.");
    const t = await loadSignTarget(kind, id);
    if (!t) throw new FormError("El documento ya no existe.");
    if (t.section) await requireSection(t.section);
    back = t.back;
    const image = readSignatureImage(fd);
    const signerName = required(fd, "signerName", "Nombre de quien firma");
    const { user } = await currentSession();
    const h = await headers();
    const data = {
      kind,
      image,
      signerName,
      signerDni: str(fd, "signerDni"),
      text: t.text ?? null,
      collectedBy: user?.name ?? null,
      ip: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
      ...t.ids,
    };
    // El resguardo, el presupuesto y la propuesta llevan una sola firma (se sustituye si se repite);
    // los consentimientos se conservan todos como prueba
    if (kind === "RECEIPT") await prisma.signature.deleteMany({ where: { kind, workOrderId: id } });
    if (kind === "QUOTE") await prisma.signature.deleteMany({ where: { quoteId: id } });
    if (kind === "PROPOSAL") await prisma.signature.deleteMany({ where: { proposalId: id } });
    const sig = await prisma.signature.create({ data });
    await audit("CREATE", "Signature", sig.id, `${SIGNATURE_KINDS[kind].label} · ${signerName}`);

    if (kind === "CONSENT") {
      await prisma.patient.update({ where: { id }, data: { gdprConsent: true, gdprConsentAt: sig.signedAt, marketingOptIn: bool(fd, "marketingOptIn") } });
    }
    if (t.canAccept && bool(fd, "accept")) {
      if (kind === "QUOTE") await setQuoteStatus(t.ids.workOrderId!, id, "ACCEPTED");
      if (kind === "PROPOSAL") await setProposalStatus(id, "ACCEPTED");
    }
  });
  if (res?.error) return res;
  revalidatePath("/", "layout");
  redirect(back);
}
