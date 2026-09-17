"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { useVoyra } from "@/hooks/use-voyra";
import type { NormalizedTravelOption } from "@/lib/travel/contracts";
import { cn, money } from "@/utils/format";

const labels = {
  flight: "Voo",
  hotel: "Hotel",
  food: "Alimentação",
  transport: "Transporte",
  activities: "Passeios",
} as const;

type PlanningContext = {
  origin: string;
  maxBudget: number;
  searchId: string | null;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  preferences?: string[];
};

export function TravelComparisonCard({
  option,
  planning,
}: {
  option: NormalizedTravelOption;
  planning: PlanningContext;
}) {
  const { data, toggleFavorite } = useVoyra();
  const saved = data.favorites.includes(option.destinationId);
  const query = new URLSearchParams({
    destino: option.destination,
    origem: planning.origin,
    pessoas: String(option.travelers),
    orcamento: String(planning.maxBudget),
    duracao: String(option.durationDays),
  });
  if (planning.searchId) query.set("busca", planning.searchId);
  if (planning.startDate) query.set("inicio", planning.startDate);
  if (planning.endDate) query.set("fim", planning.endDate);
  if (planning.preferences?.length)
    query.set("preferencias", planning.preferences.join(","));

  return (
    <article className="destination-card comparison-card">
      <div className="destination-image">
        <Image
          src={option.image}
          alt={`Paisagem de ${option.destination}`}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1000px) 45vw, 25vw"
        />
        <span className={cn("photo-tag", option.priceType === "LIVE" && "live-price-tag")}>
          {option.priceType === "LIVE" ? "Preço ao vivo" : "Preço estimado"}
        </span>
        <button
          className={cn("favorite-button", saved && "saved")}
          aria-label={
            saved
              ? `Remover ${option.destination} dos favoritos`
              : `Salvar ${option.destination} nos favoritos`
          }
          aria-pressed={saved}
          onClick={() => void toggleFavorite(option.destinationId)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="destination-info comparison-info">
        <div className="row between comparison-heading">
          <div>
            <h3>{option.destination}</h3>
            <p>
              {option.country} · {option.durationDays} dias
            </p>
          </div>
        </div>
        <div className="comparison-total">
          <small>
            Total para {option.travelers} {option.travelers === 1 ? "pessoa" : "pessoas"}
          </small>
          <strong>{money(option.totalEstimatedPrice)}</strong>
          <span>{money(option.pricePerPerson)} por pessoa</span>
          <span>Confiança da estimativa: {Math.round(option.confidence * 100)}%</span>
        </div>
        <dl className="price-breakdown">
          {Object.entries(option.breakdown).map(([key, value]) => (
            <div key={key}>
              <dt>{labels[key as keyof typeof labels]}</dt>
              <dd>{money(value)}</dd>
            </div>
          ))}
        </dl>
        <div className="comparison-tags">
          {option.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <Link
          href={`/planejar?${query.toString()}`}
          className="button button-primary comparison-select"
        >
          Selecionar destino <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
