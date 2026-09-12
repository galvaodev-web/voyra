"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, Star } from "lucide-react";
import type { Destination } from "@/types";
import { useVoyra } from "@/hooks/use-voyra";
import { money, cn } from "@/utils/format";
export function DestinationCard({ destination: d }: { destination: Destination }) {
  const { data, toggleFavorite } = useVoyra();
  const saved = data.favorites.includes(d.id);
  return (
    <article className="destination-card">
      <div className="destination-image">
        <Link
          href={`/planejar?destino=${encodeURIComponent(d.city)}`}
          aria-label={`Planejar viagem para ${d.city}`}
        >
          <Image
            src={d.image}
            alt={`Paisagem de ${d.city}`}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1000px) 45vw, 25vw"
          />
        </Link>
        {d.tag && <span className="photo-tag">{d.tag}</span>}
        <button
          className={cn("favorite-button", saved && "saved")}
          aria-label={saved ? `Remover ${d.city} dos favoritos` : `Salvar ${d.city} nos favoritos`}
          aria-pressed={saved}
          onClick={() => void toggleFavorite(d.id)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="destination-info">
        <div className="row between">
          <h3>{d.city}</h3>
          <span className="rating">
            <Star size={13} fill="currentColor" />
            {d.rating}
          </span>
        </div>
        <p>
          {d.country} <span>·</span> {d.days} dias de viagem
        </p>
        <div className="destination-price">
          <div>
            <small>A partir de</small>
            <strong>
              {money(d.price)} <span>/ pessoa</span>
            </strong>
          </div>
          <Link
            href={`/planejar?destino=${encodeURIComponent(d.city)}`}
            className="round-link"
            aria-label={`Explorar ${d.city}`}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
