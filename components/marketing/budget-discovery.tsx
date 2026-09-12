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
import { destinations } from "@/data/mock-data";
export function BudgetDiscovery() {
  const [budget, setBudget] = useState("5000");
  const [people, setPeople] = useState("1");
  const [days, setDays] = useState("7");
  const [filtered, setFiltered] = useState(false);
  const [region, setRegion] = useState("Todos");
  const results = destinations
    .filter(
      (d) =>
        (region === "Todos" || d.region === region) &&
        (!filtered || (d.price / d.days) * Number(days) * Number(people) <= Number(budget)),
    )
    .map((d) =>
      filtered
        ? { ...d, days: Number(days), price: Math.round((d.price / d.days) * Number(days)) }
        : d,
    );
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
          onSubmit={(event) => {
            event.preventDefault();
            setFiltered(true);
          }}
        >
          <label>
            <MapPin size={18} />
            <span>
              <small>Saindo de</small>
              <input
                aria-label="Cidade de origem para orçamento"
                defaultValue="São Paulo, Brasil"
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
          <Button type="submit">
            <Sparkles size={17} /> Descobrir destinos
          </Button>
        </form>
        <div className="destination-filters">
          <div className="filter-pills">
            {["Todos", "Brasil", "América do Sul", "Europa", "Ásia"].map((r) => (
              <button className={region === r ? "active" : ""} onClick={() => setRegion(r)} key={r}>
                {r === "Todos" && <Globe2 size={14} />}
                {r}
              </button>
            ))}
          </div>
          <span>Uma nova história está te esperando</span>
        </div>
        {results.length ? (
          <div className="destination-grid">
            {results.slice(0, 4).map((d) => (
              <DestinationCard destination={d} key={d.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Vamos ampliar as possibilidades?</h3>
            <p>Aumente o orçamento ou reduza os dias para encontrar destinos.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setFiltered(false);
                setRegion("Todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
        <p className="estimate-note">
          Valores ilustrativos por pessoa, sem cotação em tempo real. A busca estima o total pelo
          número de dias e viajantes.
        </p>
      </div>
    </section>
  );
}
