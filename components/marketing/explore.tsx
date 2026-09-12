"use client";
import { useState } from "react";
import { Navbar, Footer } from "@/components/layout/navbar";
import { DestinationCard } from "@/components/trips/destination-card";
import { destinations } from "@/data/mock-data";
import { EmptyState, Input, Select } from "@/components/ui";
export function Explore({
  embedded = false,
  favorites,
}: {
  embedded?: boolean;
  favorites?: string[];
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("Todos");
  const [sort, setSort] = useState("recommended");
  const list = destinations
    .filter(
      (d) =>
        (!favorites || favorites.includes(d.id)) &&
        (region === "Todos" || d.region === region) &&
        `${d.city} ${d.country}`
          .toLocaleLowerCase("pt-BR")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(
            query
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
          ),
    )
    .sort((a, b) => (sort === "price" ? a.price - b.price : sort === "days" ? a.days - b.days : 0));
  const content = (
    <>
      <div className="page-toolbar">
        <Input
          label="Encontre seu próximo destino"
          placeholder="Busque por cidade ou país"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select label="Região" value={region} onChange={(e) => setRegion(e.target.value)}>
          {["Todos", "Brasil", "América do Sul", "Europa", "Ásia"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Select>
        <Select label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recommended">Recomendados</option>
          <option value="price">Menor preço</option>
          <option value="days">Menor duração</option>
        </Select>
      </div>
      {list.length ? (
        <div className="destination-grid">
          {list.map((d) => (
            <DestinationCard key={d.id} destination={d} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Um novo destino espera por você"
          description={
            favorites
              ? "Salve os destinos que você ama tocando no coração dos cards."
              : "Não encontramos destinos para essa busca. Experimente outro nome ou região."
          }
        />
      )}
      <p className="estimate-note">
        Destinos e valores demonstrativos. Preços por pessoa; nenhuma cotação ou reserva é
        realizada.
      </p>
    </>
  );
  return embedded ? (
    content
  ) : (
    <>
      <Navbar />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">SEU PRÓXIMO CAPÍTULO</span>
            <h1>O mundo cabe nos seus planos.</h1>
            <p>
              Da escapada de fim de semana à viagem que você sempre sonhou. Encontre um lugar que
              combine com você.
            </p>
          </div>
        </section>
        <section className="container section">{content}</section>
      </main>
      <Footer />
    </>
  );
}
