"use client";

import { useEffect, useState } from "react";
import { BellRing, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";

type Alert = {
  id: string;
  origin: string;
  destination: string;
  target_price: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  last_notified_at: string | null;
};

const empty = {
  origin: "",
  destination: "",
  targetPrice: "",
  currency: "BRL",
  startDate: "",
  endDate: "",
};

export function PriceAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/price-alerts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os alertas.");
      setAlerts(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os alertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/price-alerts", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar os alertas.");
        if (active) setAlerts(data);
      })
      .catch((error: unknown) => {
        if (active)
          toast.error(error instanceof Error ? error.message : "Não foi possível carregar os alertas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function edit(alert: Alert) {
    setEditing(alert.id);
    setForm({
      origin: alert.origin,
      destination: alert.destination,
      targetPrice: String(alert.target_price),
      currency: alert.currency,
      startDate: alert.start_date ?? "",
      endDate: alert.end_date ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function mutate(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
    const response = await fetch("/api/price-alerts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error || "Não foi possível alterar o alerta.");
  }

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <h1>Alertas de preço</h1>
          <p>Acompanhe ofertas reais e revise os detalhes diretamente com o parceiro.</p>
        </div>
      </div>

      <Card>
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const body = {
                ...(editing && { id: editing }),
                origin: form.origin,
                destination: form.destination,
                targetPrice: Number(form.targetPrice),
                currency: form.currency,
                startDate: form.startDate || null,
                endDate: form.endDate || null,
              };
              const response = await fetch("/api/price-alerts", {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || "Não foi possível salvar o alerta.");
              toast.success(editing ? "Alerta atualizado" : "Alerta criado");
              setEditing(null);
              setForm(empty);
              await load();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Não foi possível salvar o alerta.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input label="Origem" required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
          <Input label="Destino" required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          <Input label="Preço máximo" required type="number" min="1" step="0.01" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} />
          <Select label="Moeda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
          <Input label="Data de ida (opcional)" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="Data de volta (opcional)" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <div className="full row" style={{ gap: 10 }}>
            <Button type="submit" loading={busy}>{editing ? "Salvar alterações" : "Criar alerta"}</Button>
            {editing && <Button type="button" variant="secondary" onClick={() => { setEditing(null); setForm(empty); }}>Cancelar</Button>}
          </div>
        </form>
      </Card>

      {loading ? (
        <p role="status">Carregando alertas…</p>
      ) : alerts.length === 0 ? (
        <EmptyState title="Nenhum alerta criado" description="Crie um alerta para receber avisos quando uma oferta ao vivo alcançar sua meta." />
      ) : (
        <div className="settings-grid">
          {alerts.map((alert) => (
            <Card className="settings-card" key={alert.id}>
              <div className="row between">
                <span className="icon-tile"><BellRing /></span>
                <label className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={alert.active}
                    aria-label={alert.active ? "Desativar alerta" : "Ativar alerta"}
                    onChange={async () => {
                      try {
                        await mutate("PATCH", { id: alert.id, active: !alert.active });
                        setAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, active: !item.active } : item));
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Não foi possível alterar o alerta.");
                      }
                    }}
                  />
                  {alert.active ? "Ativo" : "Pausado"}
                </label>
              </div>
              <h2>{alert.origin} → {alert.destination}</h2>
              <p>Meta: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: alert.currency }).format(alert.target_price)}</p>
              {alert.start_date && <p className="muted">{alert.start_date}{alert.end_date ? ` até ${alert.end_date}` : ""}</p>}
              <div className="row" style={{ gap: 8 }}>
                <Button variant="secondary" onClick={() => edit(alert)}><Pencil size={15} /> Editar</Button>
                <button
                  className="icon-button"
                  aria-label={`Excluir alerta para ${alert.destination}`}
                  onClick={async () => {
                    if (!window.confirm("Excluir este alerta?")) return;
                    try {
                      await mutate("DELETE", { id: alert.id });
                      setAlerts((current) => current.filter((item) => item.id !== alert.id));
                      toast.success("Alerta excluído");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o alerta.");
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
