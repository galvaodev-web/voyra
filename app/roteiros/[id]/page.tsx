import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { readPublicRoute } from "@/lib/server/public-routes";
import { Navbar, Footer } from "@/components/layout/navbar";
import { Badge, Card } from "@/components/ui";
export const dynamic = "force-dynamic";
const getRoute = cache(async (id: string) =>
  z.uuid().safeParse(id).success ? readPublicRoute(id) : null,
);
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const route = await getRoute((await params).id);
  return route
    ? {
        title: route.title,
        description: `${route.days} dias em ${route.destination}. Roteiro de ${route.author}.`,
      }
    : { title: "Roteiro indisponível", robots: { index: false } };
}
export default async function PublicRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const route = await getRoute((await params).id);
  if (!route) notFound();
  const days = [...new Set(route.activities.map((a) => a.day))].sort((a, b) => a - b);
  return (
    <>
      <Navbar />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <Badge>Roteiro da comunidade · {route.days} dias</Badge>
            <h1>{route.title}</h1>
            <p>
              {route.destination} · por {route.author}
            </p>
          </div>
        </section>
        <section className="container section stack" style={{ maxWidth: 900 }}>
          <Card>
            <h2>Dicas de quem foi</h2>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{route.tips}</p>
          </Card>
          {days.map((day) => (
            <Card key={day}>
              <h2>Dia {day}</h2>
              <div className="stack">
                {route.activities
                  .filter((a) => a.day === day)
                  .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
                  .map((a, index) => (
                    <article key={index}>
                      <Badge>
                        {a.time} · {a.duration}
                      </Badge>
                      <h3>{a.name}</h3>
                      <p>{a.location}</p>
                    </article>
                  ))}
              </div>
            </Card>
          ))}
          {!days.length && <p>O autor compartilhou suas dicas e ainda não incluiu atividades.</p>}
          <p className="small-text">
            Atualizado em {new Date(route.updated_at).toLocaleDateString("pt-BR")}. Confira
            horários, disponibilidade e condições diretamente com cada local antes da viagem.
          </p>
          <Link className="button button-primary" href="/app/viagens/nova">
            Planejar minha viagem
          </Link>
          <Link href="/roteiros">Voltar aos roteiros da comunidade</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
