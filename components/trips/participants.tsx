"use client";
import { useState } from "react";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge, Button, Card, Input, Modal } from "@/components/ui";
import { useVoyra } from "@/hooks/use-voyra";
import type { Trip } from "@/types";
import { expenseBRL, money, uid } from "@/utils/format";
export function Participants({ trip }: { trip: Trip }) {
  const { saveTrip } = useVoyra();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hotel = trip.expenses.find((e) => e.category === "Hospedagem");
  const memberCount = trip.members.length;
  const total = trip.expenses.reduce((n, e) => n + expenseBRL(e.amount, e.currency), 0);
  const share = memberCount ? total / memberCount : 0;
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Melhor quando é compartilhado.</h1>
          <p>Quem faz parte da sua próxima história.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Convidar participante
        </Button>
      </div>
      <div className="trip-overview-grid">
        <Card>
          <div className="row between">
            <h3>Companheiros de viagem</h3>
            <Badge>
              <Users size={12} />
              {memberCount} pessoas
            </Badge>
          </div>
          {trip.members.map((m) => (
            <div className="participant-row" key={m.id}>
              <Avatar name={m.name} />
              <div>
                <strong>{m.name}</strong>
                <p>{m.email ?? m.role}</p>
              </div>
              <Badge className={m.role === "Administrador" ? "" : "neutral"}>{m.role}</Badge>
            </div>
          ))}
          <p className="small-text muted" style={{ marginTop: 18 }}>
            Os participantes cadastrados aqui organizam a divisão de gastos. Convites por e-mail e
            acesso colaborativo ainda não são enviados.
          </p>
        </Card>
        <div className="stack">
          <Card>
            <h3>Divisão de gastos</h3>
            {hotel ? (
              <>
                <p style={{ margin: "15px 0", fontSize: 12 }}>
                  {hotel.description} · {money(expenseBRL(hotel.amount, hotel.currency))}
                  <br />
                  Pago por {hotel.paidBy}. Dividido igualmente entre {memberCount} pessoas.
                </p>
                {trip.members
                  .filter((m) => m.name !== hotel.paidBy)
                  .map((m) => (
                    <div className="split-row" key={m.id}>
                      <span>
                        {m.name} deve a {hotel.paidBy}
                      </span>
                      <strong>
                        {money(expenseBRL(hotel.amount, hotel.currency) / memberCount)}
                      </strong>
                    </div>
                  ))}
              </>
            ) : (
              <p style={{ marginTop: 15 }}>
                Cadastre uma despesa de hospedagem para visualizar a divisão.
              </p>
            )}
          </Card>
          <Card>
            <h3>Balanço de todas as despesas</h3>
            <p className="small-text" style={{ marginTop: 12 }}>
              Parte igual por pessoa: {money(share)}. Valores convertidos com câmbio demonstrativo.
            </p>
            {trip.members.map((m) => {
              const paid = trip.expenses
                .filter((e) => e.paidBy === m.name)
                .reduce((n, e) => n + expenseBRL(e.amount, e.currency), 0);
              const balance = paid - share;
              return (
                <div className="split-row" key={m.id}>
                  <span>{m.name}</span>
                  <strong style={{ color: balance >= 0 ? "#006b67" : "#a06a42" }}>
                    {balance >= 0 ? "Recebe" : "Deve"} {money(Math.abs(balance))}
                  </strong>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar companheiro de viagem">
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("name")).trim();
            if (trip.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
              toast.error(
                "Já existe um participante com esse nome. Use um nome diferente para distinguir as despesas.",
              );
              return;
            }
            setBusy(true);
            if (
              await saveTrip({
                ...trip,
                members: [
                  ...trip.members,
                  { id: uid(), name, email: String(f.get("email")), role: "Participante" },
                ],
                travelers: Math.max(trip.travelers, memberCount + 1),
              })
            ) {
              toast.success("Participante adicionado ao planejamento");
              setOpen(false);
            }
            setBusy(false);
          }}
        >
          <Input label="Nome" name="name" required minLength={2} />
          <Input label="E-mail" type="email" name="email" required />
          <div className="notice">
            Esta versão salva o participante no planejamento, mas não envia e-mails nem concede
            acesso à conta.
          </div>
          <Button type="submit" loading={busy}>
            Adicionar participante
          </Button>
        </form>
      </Modal>
    </>
  );
}
