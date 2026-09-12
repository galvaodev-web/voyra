"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useVoyra } from "@/hooks/use-voyra";
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Tabs } from "@/components/ui";
import type { Activity, Trip } from "@/types";
import { money, tripDays, uid } from "@/utils/format";
const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da atividade"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Informe um horário"),
  category: z.string().min(1),
  duration: z.string().min(1, "Informe a duração"),
  cost: z.number().min(0, "Use um valor positivo"),
  location: z.string().trim().min(2, "Informe o local"),
});
type Values = z.infer<typeof schema>;
export function Itinerary({ trip }: { trip: Trip }) {
  const { saveTrip } = useVoyra();
  const params = useSearchParams();
  const [day, setDay] = useState("Dia 1");
  const [open, setOpen] = useState(params.get("adicionar") === "1");
  const [editing, setEditing] = useState<Activity | null>(null);
  const [removing, setRemoving] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const currentDay = Number(day.split(" ")[1]);
  const activities = trip.activities
    .filter((a) => a.day === currentDay)
    .sort((a, b) => a.time.localeCompare(b.time));
  const count = tripDays(trip.start, trip.end);
  async function remove() {
    if (!removing) return;
    setBusy(true);
    if (
      await saveTrip({ ...trip, activities: trip.activities.filter((a) => a.id !== removing.id) })
    ) {
      toast.success("Atividade excluída");
      setRemoving(null);
    }
    setBusy(false);
  }
  return (
    <>
      {params.get("clima") === "chuva" && (
        <div className="notice warning" style={{ marginBottom: 20 }}>
          Previsão simulada de chuva. Edite os horários ou substitua uma atividade por uma opção
          coberta. Seu roteiro não foi alterado automaticamente.
        </div>
      )}
      <div className="page-title">
        <div>
          <h1>Um dia de cada vez.</h1>
          <p>Organize seus planos e deixe espaço para o inesperado.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={16} />
          Adicionar atividade
        </Button>
      </div>
      <Tabs
        items={Array.from({ length: Math.min(count, 365) }, (_, i) => `Dia ${i + 1}`)}
        value={day}
        onChange={setDay}
      />
      <div className="section-row">
        <h2>
          {day} — {trip.destination}
        </h2>
        <span className="muted small-text">
          {activities.length} atividades · {money(activities.reduce((n, a) => n + a.cost, 0))}
        </span>
      </div>
      {activities.length ? (
        <div className="timeline">
          {activities.map((a) => (
            <div className="activity-row" key={a.id}>
              <span className="activity-time">{a.time}</span>
              <ActivityCard
                activity={a}
                tripId={trip.id}
                onEdit={() => {
                  setEditing(a);
                  setOpen(true);
                }}
                onDelete={() => setRemoving(a)}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Um dia para escrever do seu jeito"
          description="Adicione seu primeiro passeio, restaurante ou momento de descanso."
        >
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Adicionar atividade
          </Button>
        </EmptyState>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar atividade" : "Uma nova experiência"}
      >
        <ActivityForm
          key={editing?.id ?? "new"}
          activity={editing}
          onSave={async (values) => {
            const activity: Activity = {
              ...values,
              id: editing?.id ?? uid(),
              day: currentDay,
              image: editing?.image ?? trip.image,
              source: editing?.source,
            };
            const next = editing
              ? trip.activities.map((a) => (a.id === editing.id ? activity : a))
              : [...trip.activities, activity];
            if (
              await saveTrip({ ...trip, activities: next, progress: Math.max(trip.progress, 35) })
            ) {
              toast.success("Roteiro atualizado");
              setOpen(false);
            }
          }}
        />
      </Modal>
      <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title="Excluir atividade?">
        <div className="stack">
          <p>“{removing?.name}” será removida do seu roteiro.</p>
          <Button variant="danger" loading={busy} onClick={() => void remove()}>
            Excluir atividade
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function ActivityCard({
  activity: a,
  tripId,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  tripId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="activity-card">
      <Image src={a.image} alt={a.name} width={85} height={83} />
      <div className="activity-info">
        <Badge>{a.category}</Badge>
        <h3>{a.name}</h3>
        <p>
          <MapPin size={11} />
          {a.location}
        </p>
        <small className="row" style={{ marginTop: 6 }}>
          <Clock size={11} />
          {a.duration}
        </small>
      </div>
      <span className="activity-price">{a.cost ? money(a.cost) : "Gratuito"}</span>
      <div className="activity-actions">
        <button className="icon-button" aria-label={`Editar ${a.name}`} onClick={onEdit}>
          <Pencil />
        </button>
        <button className="icon-button" aria-label={`Excluir ${a.name}`} onClick={onDelete}>
          <Trash2 />
        </button>
        <Link
          href={`/app/viagens/${tripId}/mapa?local=${encodeURIComponent(a.name)}`}
          className="icon-button"
          aria-label={`Ver ${a.name} no mapa`}
        >
          <MapPin />
        </Link>
      </div>
    </Card>
  );
}
function ActivityForm({
  activity,
  onSave,
}: {
  activity: Activity | null;
  onSave: (values: Values) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: activity ?? {
      name: "",
      time: "09:00",
      category: "Passeio",
      duration: "1 hora",
      cost: 0,
      location: "",
    },
  });
  return (
    <form className="form-grid" onSubmit={handleSubmit(onSave)}>
      <div className="full">
        <Input label="Nome da atividade" {...register("name")} error={errors.name?.message} />
      </div>
      <Input label="Horário" type="time" {...register("time")} error={errors.time?.message} />
      <Input label="Duração" {...register("duration")} error={errors.duration?.message} />
      <Select label="Categoria" {...register("category")}>
        {[
          "Passeio",
          "História",
          "Gastronomia",
          "Cultura",
          "Natureza",
          "Transporte",
          "Descanso",
        ].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>
      <Input
        label="Valor previsto (R$)"
        type="number"
        step="0.01"
        min="0"
        {...register("cost", { valueAsNumber: true })}
        error={errors.cost?.message}
      />
      <div className="full">
        <Input label="Localização" {...register("location")} error={errors.location?.message} />
      </div>
      <Button className="full" type="submit" loading={isSubmitting}>
        Salvar atividade
      </Button>
    </form>
  );
}
