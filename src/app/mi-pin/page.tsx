import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ROLES } from "@/lib/permissions";
import { currentSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/Form";
import { FormSection } from "@/components/ui/Fields";
import { changeOwnPin } from "./actions";

export const metadata = { title: "Mi PIN" };

export default async function MyPinPage() {
  const { user } = await currentSession();
  if (!user) redirect("/");
  const pin = { type: "password", inputMode: "numeric" as const, minLength: 4, maxLength: 8, pattern: "\\d{4,8}", required: true, className: "field" };
  return (
    <>
      <PageHeader title="Mi PIN" description={`${user.name} · ${ROLES[user.role].label}`} />
      <div className="max-w-2xl">
        <ActionForm action={changeOwnPin} submitLabel="Cambiar mi PIN" submitIcon={<KeyRound className="size-5" />} successMessage="PIN cambiado. Se ha cerrado su sesión en los demás dispositivos.">
          <FormSection title="Cambiar mi PIN" icon={KeyRound} description="Es personal: no lo comparta. Lo que haga con él queda a su nombre en el registro.">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="currentPin">PIN actual</label>
              <input id="currentPin" name="currentPin" autoComplete="current-password" {...pin} />
            </div>
            <div>
              <label className="field-label" htmlFor="pin">PIN nuevo (4-8 cifras)</label>
              <input id="pin" name="pin" autoComplete="new-password" {...pin} />
            </div>
            <div>
              <label className="field-label" htmlFor="confirmPin">Repetir PIN nuevo</label>
              <input id="confirmPin" name="confirmPin" autoComplete="new-password" {...pin} />
            </div>
          </FormSection>
        </ActionForm>
      </div>
    </>
  );
}
