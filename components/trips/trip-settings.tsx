"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Input, Select, Modal } from "@/components/ui";
import { useVoyra } from "@/hooks/use-voyra";
import type { Trip } from "@/types";
export function TripSettings({ trip }: { trip: Trip }) {
  const { saveTrip, deleteTrip } = useVoyra();
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Os detalhes fazem a viagem.</h1>
          <p>Ajuste o nome, orçamento e status do seu planejamento.</p>
        </div>
      </div>
      <Card className="settings-card">
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            if (
              await saveTrip({
                ...trip,
                name: String(f.get("name")).trim(),
                budget: Number(f.get("budget")),
                status: String(f.get("status")),
                progress: Number(f.get("progress")),
              })
            ) {
              toast.success("Viagem atualizada");
            }
            setBusy(false);
          }}
        >
          <Input
            label="Nome da viagem"
            name="name"
            defaultValue={trip.name}
            minLength={2}
            required
          />
          <div className="form-grid">
            <Input
              label="Orçamento total (R$)"
              type="number"
              min={100}
              name="budget"
              defaultValue={trip.budget}
              required
            />
            <Select label="Status" name="status" defaultValue={trip.status}>
              {["Planejando", "Em viagem", "Concluída"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Planejamento concluído (%)"
            type="number"
            name="progress"
            min={0}
            max={100}
            defaultValue={trip.progress}
            required
          />
          <Button type="submit" loading={busy}>
            Salvar alterações
          </Button>
        </form>
      </Card>
      <Card className="settings-card mt-6">
        <h2>Excluir viagem</h2>
        <p>
          Remove o planejamento e sua publicação. Os anexos privados serão encaminhados para
          exclusão.
        </p>
        <Button variant="danger" onClick={() => setRemoving(true)}>
          Excluir viagem
        </Button>
      </Card>
      <Modal
        open={removing}
        onClose={() => {
          if (!busy) setRemoving(false);
        }}
        title="Excluir esta viagem?"
      >
        <div className="stack">
          <p>
            “{trip.name}” será excluída com atividades, gastos, documentos e diário. Esta ação não
            pode ser desfeita.
          </p>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              if (await deleteTrip(trip)) {
                toast.success("Viagem excluída");
                router.push("/app/viagens");
              }
              setBusy(false);
            }}
          >
            Confirmar exclusão da viagem
          </Button>
        </div>
      </Modal>
    </>
  );
}
