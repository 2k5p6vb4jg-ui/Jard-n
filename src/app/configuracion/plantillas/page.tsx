import { redirect } from "next/navigation";

/** Dirección antigua de las opciones de plantillas. */
export default function OldInsoleOptionsPage() {
  redirect("/configuracion/opciones?pestana=plantillas");
}
