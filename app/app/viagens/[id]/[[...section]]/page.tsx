import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TripWorkspace } from "@/components/trips/trip-workspace";
import { LoadingSkeleton } from "@/components/ui";
const allowed = [
  "",
  "roteiro",
  "mapa",
  "gastos",
  "documentos",
  "reservas",
  "participantes",
  "modo-viagem",
  "tradutor",
  "emergencia",
  "diario",
  "publicar",
  "configuracoes",
];
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; section?: string[] }>;
}) {
  const { id, section } = await params;
  const slug = section?.join("/") ?? "";
  if (!allowed.includes(slug)) notFound();
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TripWorkspace key={`${id}/${slug}`} id={id} section={slug} />
    </Suspense>
  );
}
