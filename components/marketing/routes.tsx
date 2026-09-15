"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Bookmark, Clock, ArrowRight } from "lucide-react";
import { routeTemplates } from "@/data/mock-data";
import { useVoyra } from "@/hooks/use-voyra";
import { Navbar, Footer } from "@/components/layout/navbar";
import { Badge, Button, Modal, EmptyState } from "@/components/ui";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { CommunityRoutes } from "@/components/marketing/community-routes";
export function Routes({
  embedded = false,
  savedOnly = false,
}: {
  embedded?: boolean;
  savedOnly?: boolean;
}) {
  const { data, savePreferences } = useVoyra();
  const [selected, setSelected] = useState<(typeof routeTemplates)[number] | null>(null);
  const routes = routeTemplates.filter((r) => !savedOnly || data.savedRoutes.includes(r.id));
  async function save(id: string) {
    const exists = data.savedRoutes.includes(id);
    if (
      await savePreferences({
        savedRoutes: exists ? data.savedRoutes.filter((r) => r !== id) : [...data.savedRoutes, id],
      })
    )
      toast.success(exists ? "Roteiro removido dos salvos" : "Roteiro salvo");
  }
  const content = isSupabaseConfigured ? (
    <CommunityRoutes savedOnly={savedOnly} />
  ) : (
    <>
      <div className="route-grid">
        {routes.map((r) => (
          <article className="card route-card" key={r.id}>
            <div className="route-photo">
              <Image src={r.image} alt={r.name} fill sizes="(max-width:640px) 90vw, 25vw" />
              <Badge>
                <Clock size={12} />
                {r.days} dias
              </Badge>
              <button
                onClick={() => void save(r.id)}
                aria-label={`Salvar roteiro ${r.name}`}
                aria-pressed={data.savedRoutes.includes(r.id)}
                className="favorite-button"
              >
                <Bookmark
                  size={17}
                  fill={data.savedRoutes.includes(r.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <div className="route-info">
              <h3>{r.name}</h3>
              <p>Inspiração de roteiro · exemplo demonstrativo</p>
              <Button variant="secondary" onClick={() => setSelected(r)}>
                Conhecer roteiro <ArrowRight size={15} />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!routes.length && (
        <EmptyState
          title="Sua coleção começa aqui"
          description="Explore roteiros e toque no marcador para salvar seus favoritos."
        >
          <Link href="/roteiros" className="button button-primary">
            Explorar roteiros
          </Link>
        </EmptyState>
      )}
      <p className="estimate-note">
        Roteiros de exemplo para inspirar seu planejamento. Não há compra e venda de roteiros.
      </p>
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Roteiro"}
      >
        {selected && (
          <div className="stack">
            <Image
              src={selected.image}
              alt={selected.name}
              width={480}
              height={220}
              style={{ width: "100%", borderRadius: 12 }}
            />
            <p>
              {selected.days} dias para explorar com calma, descobrir a cultura local e colecionar
              boas histórias. Este é um exemplo para inspirar sua própria viagem.
            </p>
            <div className="notice">
              Salve esta inspiração na sua coleção e use as ideias ao montar sua viagem.
            </div>
            <Button onClick={() => void save(selected.id)}>
              <Bookmark size={16} />
              {data.savedRoutes.includes(selected.id) ? "Remover dos salvos" : "Salvar inspiração"}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
  return embedded ? (
    content
  ) : (
    <>
      <Navbar />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">CAMINHOS QUE VALEM SER COMPARTILHADOS</span>
            <h1>Encontre inspiração para partir.</h1>
            <p>Explore roteiros e descubra ideias para sua próxima viagem.</p>
          </div>
        </section>
        <section className="container section">{content}</section>
      </main>
      <Footer />
    </>
  );
}
