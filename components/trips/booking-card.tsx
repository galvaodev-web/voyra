import Link from "next/link";
import { ArrowUpRight, Hotel } from "lucide-react";
import { Card } from "@/components/ui";
import { bookingLink } from "@/lib/booking";
import { dateLabel } from "@/utils/format";
import type { Trip } from "@/types";

export function BookingCard({ trip, onAdd }: { trip: Trip; onAdd?: () => void }) {
  const link = bookingLink();
  return (
    <Card className="stack">
      <span className="eyebrow">
        <Hotel size={18} /> HOSPEDAGEM
      </span>
      <h3>Encontre sua estadia em {trip.destination}</h3>
      <p>
        {dateLabel(trip.start)} a {dateLabel(trip.end)} · {trip.travelers}{" "}
        {trip.travelers === 1 ? "viajante" : "viajantes"}
      </p>
      <p>
        Confira destino, datas e hóspedes na Booking.com. Preços, disponibilidade e condições são
        apresentados lá.
      </p>
      <a
        className="button button-primary"
        href={link.href}
        target="_blank"
        rel={link.affiliate ? "sponsored noopener" : "noopener"}
      >
        Buscar hospedagem na Booking.com <ArrowUpRight size={16} />
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
      {link.affiliate && (
        <small>Podemos receber uma comissão por reservas elegíveis feitas por este link.</small>
      )}
      <p>
        Já reservou? Adicione a confirmação ao Voyra para manter tudo junto. A reserva não é
        importada automaticamente.
      </p>
      {onAdd ? (
        <button className="text-link" onClick={onAdd}>
          Adicionar minha hospedagem
        </button>
      ) : (
        <Link className="text-link" href={`/app/viagens/${trip.id}/reservas`}>
          Organizar minhas reservas
        </Link>
      )}
    </Card>
  );
}
