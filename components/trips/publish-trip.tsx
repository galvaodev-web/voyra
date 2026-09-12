"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Trip } from "@/types";
export function PublicTripEditor({ trip }: { trip: Trip }) {
  const [route, setRoute] = useState<{ id: string; published: boolean } | null>(null);
  const [tips, setTips] = useState(trip.tips ?? "");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await createClient()
        .from("published_routes")
        .select("id,published,tips")
        .eq("trip_id", trip.id)
        .maybeSingle();
      if (!active) return;
      if (error) setError("Não foi possível consultar a publicação. Tente novamente.");
      else {
        setRoute(data);
        if (data) setTips(data.tips);
        setError("");
      }
      setReady(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, [trip.id, revision]);
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">COMPARTILHE SEUS CAMINHOS</span>
          <h1>Publicar roteiro</h1>
          <p>Transforme seu planejamento em inspiração para outros viajantes.</p>
        </div>
      </div>
      <Card className="settings-card">
        <div className="stack">
          <h2>{trip.name}</h2>
          {!ready ? (
            <p role="status">Consultando publicação…</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <Button onClick={() => setRevision((v) => v + 1)}>Tentar novamente</Button>
            </div>
          ) : (
            <>
              <p>
                Serão públicos: seu nome de perfil, o nome e o destino da viagem, duração,
                atividades e dicas abaixo. Documentos, gastos, participantes, diário e datas da
                viagem ficam privados.
              </p>
              <details>
                <summary>
                  Revisar as {trip.activities.length} atividades que serão publicadas
                </summary>
                <div className="stack" style={{ marginTop: 16 }}>
                  {trip.activities.map((a) => (
                    <p key={a.id}>
                      Dia {a.day} · {a.time} · {a.name} · {a.location} · {a.duration} · {a.category}
                    </p>
                  ))}
                </div>
              </details>
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    const { data, error } = await createClient().rpc("publish_trip", {
                      target_trip: trip.id,
                      public_tips: tips.trim(),
                    });
                    if (error) throw error;
                    setRoute({ id: data, published: true });
                    toast.success("Roteiro publicado na comunidade");
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : typeof err === "object" && err && "message" in err
                          ? String(err.message)
                          : "Não foi possível publicar.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="field">
                  <span>Suas dicas para outros viajantes</span>
                  <textarea
                    value={tips}
                    onChange={(e) => setTips(e.target.value)}
                    required
                    minLength={10}
                    maxLength={5000}
                  />
                </label>
                <label className="check-field">
                  <input type="checkbox" required />
                  Revisei os nomes e locais das atividades e as dicas, removi informações privadas e
                  autorizo a publicação na internet.
                </label>
                <Button type="submit" loading={busy}>
                  {route?.published ? "Atualizar publicação" : "Publicar na comunidade"}
                </Button>
              </form>
              <p className="small-text">
                Requer Creator ativo. Alterações na viagem só entram no roteiro público quando você
                atualiza a publicação. Ao terminar a assinatura, o link deixa de ficar público.
              </p>
              <Link href="/app/configuracoes">Consultar meu plano</Link>
              {route?.published && (
                <div className="stack">
                  <Link className="button button-secondary" href={`/roteiros/${route.id}`}>
                    Abrir página pública
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${location.origin}/roteiros/${route.id}`,
                        );
                        toast.success("Link copiado");
                      } catch {
                        toast.error(
                          "Não foi possível copiar. Abra a página pública e copie o endereço.",
                        );
                      }
                    }}
                  >
                    Copiar link público
                  </Button>
                  <Button
                    variant="danger"
                    loading={busy}
                    onClick={async () => {
                      setBusy(true);
                      const { error } = await createClient().rpc("unpublish_trip", {
                        target_trip: trip.id,
                      });
                      if (error) toast.error("Não foi possível retirar a publicação.");
                      else {
                        setRoute({ ...route, published: false });
                        toast.success("Publicação retirada");
                      }
                      setBusy(false);
                    }}
                  >
                    Retirar publicação
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </>
  );
}
