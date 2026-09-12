"use client";
import Image from "next/image";
import { useState } from "react";
import { Plus, MapPin, Star, UploadCloud, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from "@/components/ui";
import { useVoyra } from "@/hooks/use-voyra";
import type { Trip } from "@/types";
import { dateLabel, uid } from "@/utils/format";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { PublicTripEditor } from "@/components/trips/publish-trip";
export function Diary({ trip }: { trip: Trip }) {
  const { saveTrip } = useVoyra();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">O QUE FICA DEPOIS DO CAMINHO</span>
          <h1>Meu diário</h1>
          <p>Guarde os pequenos momentos que fizeram a viagem.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Adicionar memória
        </Button>
      </div>
      {trip.notes.length ? (
        <div className="diary-grid">
          {[...trip.notes]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((n) => (
              <Card className="diary-card" key={n.id}>
                {n.photo && (
                  <Image
                    unoptimized={n.photo.startsWith("data:")}
                    src={n.photo}
                    alt={`Memória em ${n.location}`}
                    width={550}
                    height={250}
                  />
                )}
                <div>
                  <span className="eyebrow">{dateLabel(n.date)}</span>
                  <div className="row between">
                    <h3>{n.location || trip.destination}</h3>
                    <span className="rating">
                      <Star size={13} fill="currentColor" />
                      {n.rating}
                    </span>
                  </div>
                  <p>{n.text}</p>
                  <small className="row" style={{ marginTop: 17 }}>
                    <MapPin size={13} />
                    {trip.name}
                  </small>
                </div>
              </Card>
            ))}
        </div>
      ) : (
        <EmptyState
          title="Toda viagem merece ser lembrada"
          description="Escreva sua primeira memória e adicione uma foto especial."
        />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Uma memória para guardar">
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const file = f.get("photo") as File;
            setBusy(true);
            try {
              let photo: string | undefined;
              if (file?.size) {
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                  file.size > 600 * 1024
                )
                  throw new Error("Escolha uma imagem JPG, PNG ou WebP de até 600 KB.");
                photo = await new Promise<string>((resolve, reject) => {
                  const r = new FileReader();
                  r.onload = () => resolve(String(r.result));
                  r.onerror = () => reject(new Error("Erro ao ler imagem"));
                  r.readAsDataURL(file);
                });
              }
              if (
                await saveTrip({
                  ...trip,
                  notes: [
                    ...trip.notes,
                    {
                      id: uid(),
                      date: String(f.get("date")),
                      text: String(f.get("text")),
                      location: String(f.get("location")),
                      rating: Number(f.get("rating")),
                      photo,
                    },
                  ],
                })
              ) {
                toast.success("Memória salva no diário");
                setOpen(false);
              }
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <Input label="Data" name="date" type="date" defaultValue={trip.start} required />
            <Input label="Local" name="location" defaultValue={trip.destination} required />
          </div>
          <label className="field">
            <span>Como foi esse momento?</span>
            <textarea
              name="text"
              required
              minLength={3}
              maxLength={5000}
              placeholder="Conte sua história…"
            />
          </label>
          <Select label="Sua nota" name="rating">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} estrelas
              </option>
            ))}
          </Select>
          <label className="upload-zone">
            <UploadCloud size={22} style={{ margin: "0 auto" }} />
            Adicionar foto · até 600 KB
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Foto da memória"
            />
          </label>
          <Button type="submit" loading={busy}>
            Guardar memória
          </Button>
        </form>
      </Modal>
    </>
  );
}
export function PublishTrip({ trip }: { trip: Trip }) {
  const { saveTrip } = useVoyra();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(trip.published ?? false);
  if (isSupabaseConfigured) return <PublicTripEditor trip={trip} />;
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">SUA HISTÓRIA PODE INSPIRAR OUTRAS</span>
          <h1>Transforme sua viagem em um roteiro.</h1>
          <p>Revise os detalhes e prepare uma inspiração para compartilhar.</p>
        </div>
      </div>
      <Card className="settings-card">
        <div className="publish-preview">
          <Image src={trip.image} alt={trip.name} fill sizes="700px" />
        </div>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            const tips = String(f.get("tips"));
            if (
              await saveTrip({
                ...trip,
                published: true,
                tips,
                includeCover: f.get("photos") === "on",
              })
            ) {
              setPublished(true);
              toast.success("Roteiro preparado para compartilhar");
            }
            setBusy(false);
          }}
        >
          <h2>{trip.name}</h2>
          <p>
            {trip.activities.length} atividades · {trip.notes.length} memórias. Compartilhamento por
            arquivo disponível; publicação na comunidade em breve.
          </p>
          <label className="field">
            <span>Suas dicas para outros viajantes</span>
            <textarea
              name="tips"
              defaultValue={trip.tips ?? ""}
              placeholder="O que você gostaria de ter sabido antes de ir?"
              required
              minLength={10}
            />
          </label>
          <label className="check-field">
            <input name="review" type="checkbox" required />
            Revisei meu roteiro e removi informações privadas das dicas.
          </label>
          <label className="check-field">
            <input name="photos" type="checkbox" defaultChecked={trip.includeCover ?? false} />
            Incluir capa ilustrativa no arquivo de compartilhamento.
          </label>
          <Badge>Publicação na comunidade · em breve</Badge>
          <Button loading={busy} type="submit">
            <Share2 size={16} />
            Publicar roteiro (prévia)
          </Button>
        </form>
        {published && (
          <div className="stack" style={{ marginTop: 20 }}>
            <div className="notice">
              <Check size={18} />
              Roteiro marcado como pronto. Ele ainda não está público na internet.
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                const text = `${trip.name}\n${trip.destination}\n${trip.start} a ${trip.end}\n\n${trip.activities.map((a) => `Dia ${a.day} · ${a.time} — ${a.name} (${a.duration})`).join("\n")}\n\nDicas: ${trip.tips ?? ""}`;
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  toast.success("Roteiro copiado para compartilhar");
                } catch {
                  toast.error("Não foi possível copiar. Baixe o arquivo abaixo.");
                }
              }}
            >
              {copied ? "Copiado!" : "Copiar roteiro para compartilhar"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const publicData = {
                  name: trip.name,
                  destination: trip.destination,
                  start: trip.start,
                  end: trip.end,
                  activities: trip.activities.map(
                    ({ day, time, name, category, duration, location }) => ({
                      day,
                      time,
                      name,
                      category,
                      duration,
                      location,
                    }),
                  ),
                  tips: trip.tips ?? "",
                  ...(trip.includeCover ? { cover: trip.image } : {}),
                };
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(publicData, null, 2)], { type: "application/json" }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = "roteiro-voyra.json";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Baixar roteiro sem dados privados
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
