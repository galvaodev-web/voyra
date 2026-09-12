"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useVoyra } from "@/hooks/use-voyra";
import { createClient } from "@/lib/supabase/client";
import { publicRouteSchema, publicRouteColumns, type PublicRoute } from "@/lib/public-routes";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
export function CommunityRoutes({ savedOnly = false }: { savedOnly?: boolean }) {
  const { data, savePreferences } = useVoyra();
  const [routes, setRoutes] = useState<PublicRoute[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState("");
  const savedIds = data.savedRoutes.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).join(",");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let next: PublicRoute[];
        let hasMore = false;
        if (savedOnly) {
          const ids = savedIds ? savedIds.split(",") : [];
          if (!ids.length) next = [];
          else {
            const result = await createClient()
              .from("published_routes")
              .select(publicRouteColumns)
              .eq("published", true)
              .in("id", ids)
              .order("updated_at", { ascending: false })
              .abortSignal(controller.signal);
            if (result.error) throw result.error;
            next = publicRouteSchema.array().parse(result.data);
          }
        } else {
          const response = await fetch(`/api/routes?q=${encodeURIComponent(query)}&page=${page}`, {
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          next = result.routes;
          hasMore = result.hasMore;
        }
        if (!controller.signal.aborted) {
          setRoutes(next);
          setMore(hasMore);
          setError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setError("Não foi possível carregar os roteiros. Tente novamente.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, savedOnly, savedIds, revision]);
  return (
    <div className="stack">
      {!savedOnly && (
        <Input
          label="Buscar roteiros da comunidade"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Busque pelo nome do roteiro"
        />
      )}
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button onClick={() => setRevision((v) => v + 1)}>Tentar novamente</Button>
        </div>
      ) : loading ? (
        <p role="status">Carregando roteiros…</p>
      ) : routes.length ? (
        <div className="route-grid">
          {routes.map((route) => (
            <Card key={route.id}>
              <div className="stack">
                <Badge>
                  {route.days} dias · {route.destination}
                </Badge>
                <h2>{route.title}</h2>
                <p>por {route.author}</p>
                <p>
                  {route.tips.slice(0, 150)}
                  {route.tips.length > 150 ? "…" : ""}
                </p>
                <Link className="button button-primary" href={`/roteiros/${route.id}`}>
                  Ver roteiro
                </Link>
                <Button
                  variant="secondary"
                  loading={busy === route.id}
                  onClick={async () => {
                    setBusy(route.id);
                    await savePreferences({
                      savedRoutes: data.savedRoutes.includes(route.id)
                        ? data.savedRoutes.filter((id) => id !== route.id)
                        : [...data.savedRoutes, route.id],
                    });
                    setBusy("");
                  }}
                >
                  {data.savedRoutes.includes(route.id) ? "Remover dos salvos" : "Salvar roteiro"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={savedOnly ? "Sua coleção começa aqui" : "Novos caminhos estão chegando"}
          description={
            savedOnly
              ? "Salve os roteiros da comunidade para consultar depois. Roteiros retirados pelos autores deixam de aparecer."
              : "Nenhum roteiro publicado encontrado. Explore outro nome ou publique o seu com o plano Creator."
          }
        />
      )}
      {!savedOnly && (
        <div className="row">
          <Button
            variant="secondary"
            disabled={!page || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span>Página {page + 1}</span>
          <Button
            variant="secondary"
            disabled={!more || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
