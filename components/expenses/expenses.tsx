"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyState, Input, Modal, Select } from "@/components/ui";
import { BudgetStats } from "@/components/trips/overview";
import { useVoyra } from "@/hooks/use-voyra";
import { expenseCategories } from "@/data/mock-data";
import { dateLabel, expenseBRL, money, uid } from "@/utils/format";
import type { Expense, Trip } from "@/types";
const schema = z.object({
  description: z.string().trim().min(2, "Descreva o gasto"),
  amount: z.number().positive("Informe um valor maior que zero"),
  currency: z.enum(["BRL", "EUR", "USD"]),
  category: z.string().min(1),
  date: z.string().min(1, "Escolha a data"),
  paidBy: z.string().min(1, "Escolha quem pagou"),
  status: z.enum(["PLANNED", "ACTUAL"]),
});
type Values = z.infer<typeof schema>;
export function Expenses({ trip }: { trip: Trip }) {
  const { saveTrip } = useVoyra();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const total = trip.expenses.reduce(
    (n, e) => n + expenseBRL(e.amount, e.currency, e.exchangeRate),
    0,
  );
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Mais experiências. Contas em dia.</h1>
          <p>Acompanhe o orçamento e aproveite com tranquilidade.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Adicionar gasto
        </Button>
      </div>
      <BudgetStats trip={trip} />
      <div className="expense-layout">
        <div>
          <div className="section-row" style={{ marginTop: 0 }}>
            <h2>Despesas da viagem</h2>
            <span className="small-text muted">{trip.expenses.length} registros</span>
          </div>
          {trip.expenses.length ? (
            <Card className="expense-list">
              {[...trip.expenses]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((e) => (
                  <ExpenseCard expense={e} key={e.id} onDelete={() => setRemoving(e)} />
                ))}
            </Card>
          ) : (
            <EmptyState
              title="Tudo pronto para organizar seus gastos"
              description="Registre despesas previstas e realizadas para acompanhar seu orçamento."
            />
          )}
        </div>
        <Card>
          <h3>Para onde vai seu orçamento</h3>
          {expenseCategories.map((category, i) => {
            const value = trip.expenses
              .filter((e) => e.category === category)
              .reduce((n, e) => n + expenseBRL(e.amount, e.currency, e.exchangeRate), 0);
            return (
              <div className="chart-bar" key={category}>
                <div className="row between">
                  <span>{category}</span>
                  <strong>{money(value)}</strong>
                </div>
                <div className="progress" aria-label={`${category}: ${money(value)}`}>
                  <span
                    style={{
                      width: `${total ? (value / total) * 100 : 0}%`,
                      background: [
                        "#006b67",
                        "#4f9d88",
                        "#91bca5",
                        "#d0b384",
                        "#6a889c",
                        "#b9c4a0",
                        "#b6c5c1",
                      ][i],
                    }}
                  />
                </div>
              </div>
            );
          })}
          <p className="small-text muted" style={{ marginTop: 17 }}>
            Gastos em outra moeda usam a cotação registrada no momento do cadastro. Referências
            offline são identificadas como estimativas.
          </p>
        </Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar gasto">
        <ExpenseForm
          trip={trip}
          onSave={async (values) => {
            let conversion: Pick<Expense, "baseAmount" | "exchangeRate" | "exchangeRateSource" | "exchangeRateObservedAt"> = {
              baseAmount: values.amount,
              exchangeRate: 1,
              exchangeRateSource: "FRANKFURTER",
              exchangeRateObservedAt: new Date().toISOString(),
            };
            if (values.currency !== "BRL") {
              const response = await fetch(`/api/exchange-rate?base=${values.currency}&quote=BRL`);
              const rate = (await response.json()) as {
                rate?: number;
                source?: "FRANKFURTER" | "FALLBACK";
                observedAt?: string | null;
                error?: string;
              };
              if (!response.ok || !rate.rate)
                throw new Error(rate.error || "Não foi possível obter a cotação.");
              conversion = {
                baseAmount: values.amount * rate.rate,
                exchangeRate: rate.rate,
                exchangeRateSource: rate.source,
                exchangeRateObservedAt: rate.observedAt ?? null,
              };
              if (rate.source === "FALLBACK")
                toast.warning("Cotação ao vivo indisponível. O gasto foi salvo com referência offline identificada.");
            }
            if (
              await saveTrip({
                ...trip,
                expenses: [...trip.expenses, { ...values, ...conversion, id: uid() }],
              })
            ) {
              toast.success("Gasto adicionado");
              setOpen(false);
            }
          }}
        />
      </Modal>
      <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title="Excluir gasto?">
        <div className="stack">
          <p>Remover “{removing?.description}” do orçamento?</p>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              if (
                await saveTrip({
                  ...trip,
                  expenses: trip.expenses.filter((e) => e.id !== removing?.id),
                })
              ) {
                setRemoving(null);
                toast.success("Gasto excluído");
              }
              setBusy(false);
            }}
          >
            Excluir gasto
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function ExpenseCard({ expense: e, onDelete }: { expense: Expense; onDelete: () => void }) {
  return (
    <div className="expense-row">
      <span className="icon-tile">
        <Wallet />
      </span>
      <div>
        <strong>{e.description}</strong>
        <p>
          {e.category} · {dateLabel(e.date)} · {e.paidBy} · {e.status === "ACTUAL" ? "Realizado" : "Planejado"}
        </p>
      </div>
      <div className="expense-amount">
        <strong>{money(e.amount, e.currency)}</strong>
        {e.currency !== "BRL" && (
          <p>
            ≈ {money(expenseBRL(e.amount, e.currency, e.exchangeRate))}
            {e.exchangeRateSource === "FALLBACK" ? " · referência offline" : ""}
          </p>
        )}
      </div>
      <button
        className="icon-button"
        aria-label={`Excluir gasto ${e.description}`}
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
function ExpenseForm({ trip, onSave }: { trip: Trip; onSave: (values: Values) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      amount: 0,
      currency: "BRL",
      category: "Alimentação",
      date: trip.start,
      paidBy: trip.members[0]?.name ?? "Eu",
      status: "PLANNED",
    },
  });
  return (
    <form className="form-grid" onSubmit={handleSubmit(onSave)}>
      <div className="full">
        <Input label="Descrição" {...register("description")} error={errors.description?.message} />
      </div>
      <Input
        label="Valor"
        type="number"
        min="0.01"
        step="0.01"
        {...register("amount", { valueAsNumber: true })}
        error={errors.amount?.message}
      />
      <Select label="Moeda" {...register("currency")}>
        <option value="BRL">Real (R$)</option>
        <option value="EUR">Euro (€)</option>
        <option value="USD">Dólar (US$)</option>
      </Select>
      <Select label="Categoria" {...register("category")}>
        {expenseCategories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>
      <Select label="Situação" {...register("status")}>
        <option value="PLANNED">Planejado</option>
        <option value="ACTUAL">Realizado</option>
      </Select>
      <Input label="Data" type="date" {...register("date")} error={errors.date?.message} />
      <div className="full">
        <Select label="Quem pagou?" {...register("paidBy")}>
          {trip.members.map((m) => (
            <option key={m.id}>{m.name}</option>
          ))}
        </Select>
      </div>
      <Button className="full" loading={isSubmitting} type="submit">
        Salvar gasto
      </Button>
    </form>
  );
}
