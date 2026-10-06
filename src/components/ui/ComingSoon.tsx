import { Hammer } from "lucide-react";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={Hammer} title="Formulario en construcción (fase 2)" text={text} />
      </Card>
    </>
  );
}
