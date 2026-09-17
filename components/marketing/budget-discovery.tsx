"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Globe2,
  MapPin,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui";
import { DestinationCard } from "@/components/trips/destination-card";
import { TravelComparisonCard } from "@/components/trips/travel-comparison-card";
import { destinations } from "@/data/mock-data";
import type { TravelSearchResponse } from "@/lib/travel/contracts";
import { travelSearchSchema } from "@/lib/travel/contracts";
import { VoyraPriceEngine } from "@/lib/travel/price-engine";
export function BudgetDiscovery() {
  const [origin, setOrigin] = useState("São Paulo, Brasil");
  const [budget, setBudget] = useState("5000");
  const [people, setPeople] = useState("1");
  const [days, setDays] = useState("7");
  const [search, setSearch] = useState<TravelSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("Todos");
  const initialResults = destinations.filter((d) => region === "Todos" || d.region === region);
  const results = search?.options ?? initialResults;
  return (
    <section className="section destinations-section" id="destinos">
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GRANDES VIAGENS COMEÇAM COM UMA IDEIA</span>
            <h2>
              Até onde seu orçamento
              <br className="desktop-break" /> pode te levar?
            </h2>
            <p>Você escolhe o valor. A gente te ajuda a encontrar o destino.</p>
          </div>
          <Link className="text-link" href="/explorar">
            Explorar todos os destinos <ArrowUpRight size={18} />
          </Link>
        </div>
        <form
          className="budget-search"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError("");
            try {
              if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") {
                const input = travelSearchSchema.parse({
                  origin,
                  maxBudget: Number(budget),
                  travelers: Number(people),
                  durationDays: Number(days),
                  region,
                  currency: "BRL",
                  sort: "VALUE",
                });
                const demoResult = await new VoyraPriceEngine().search(input);
                setSearch({
                  searchId: null,
                  persisted: false,
                  generatedAt: new Date().toISOString(),
                  options: demoResult.options,
                  providers: demoResult.providerResults,
                });
                return;
              }
              const response = await fetch("/api/travel/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  origin,
                  maxBudget: Number(budget),
                  travelers: Number(people),
                  durationDays: Number(days),
                  region,
                  currency: "BRL",
                  sort: "VALUE",
                  analyticsConsent: false,
                }),
              });
              const payload = (await response.json()) as TravelSearchResponse & { error?: string };
              if (!response.ok)
                throw new Error(payload.error || "Não foi possível buscar destinos.");
              setSearch(payload);
            } catch (reason) {
              setError(
                reason instanceof Error ? reason.message : "Não foi possível buscar destinos.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <label>
            <MapPin size={18} />
            <span>
              <small>Saindo de</small>
              <input
                aria-label="Cidade de origem para orçamento"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                required
              />
            </span>
            <ChevronDown size={14} />
          </label>
          <label>
            <Wallet size={18} />
            <span>
              <small>Meu orçamento total</small>
              <select
                aria-label="Orçamento"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                {[3000, 5000, 8000, 12000, 20000, 40000].map((n) => (
                  <option key={n} value={n}>
                    Até R$ {n.toLocaleString("pt-BR")}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            <Users size={18} />
            <span>
              <small>Quem vai?</small>
              <select
                aria-label="Pessoas para orçamento"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "pessoa" : "pessoas"}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            <CalendarDays size={18} />
            <span>
              <small>Por quanto tempo?</small>
              <select
                aria-label="Duração da viagem"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              >
                {[3, 5, 7, 10, 15].map((n) => (
                  <option key={n} value={n}>
                    {n} dias
                  </option>
                ))}
              </select>
            </span>
          </label>
          <Button type="submit" disabled={loading}>
            <Sparkles size={17} /> {loading ? "Buscando..." : "Descobrir destinos"}
          </Button>
        </form>
        <div className="destination-filters">
          <div className="filter-pills">
            {["Todos", "Brasil", "América do Sul", "Europa", "Ásia"].map((r) => (
              <button
                className={region === r ? "active" : ""}
                onClick={() => {
                  setRegion(r);
                  setSearch(null);
                }}
                key={r}
              >
                {r === "Todos" && <Globe2 size={14} />}
                {r}
              </button>
            ))}
          </div>
          <span>Uma nova história está te esperando</span>
        </div>
        {error ? (
          <div className="empty-state" role="alert">
            <h3>A busca não foi concluída</h3>
            <p>{error}</p>
          </div>
        ) : results.length ? (
          <div className={`destination-grid${search ? " comparison-grid" : ""}`}>
            {search
              ? search.options
                  .slice(0, 4)
                  .map((option) => (
                    <TravelComparisonCard
                      option={option}
                      planning={{
                        origin,
                        maxBudget: Number(budget),
                        searchId: search.searchId,
                      }}
                      key={option.destinationId}
                    />
                  ))
              : initialResults
                  .slice(0, 4)
                  .map((destination) => (
                    <DestinationCard destination={destination} key={destination.id} />
                  ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Vamos ampliar as possibilidades?</h3>
            <p>Aumente o orçamento ou reduza os dias para encontrar destinos.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch(null);
                setRegion("Todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
        <p className="estimate-note">
          {search?.persisted
            ? "Busca salva na sua conta. Estimativas e ofertas ao vivo são identificadas separadamente."
            : "Valores estimados usam o catálogo Voyra e não representam disponibilidade para compra."}
        </p>
      </div>
    </section>
  );
}
