"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Plane,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { photos } from "@/data/mock-data";
import { Button } from "@/components/ui";
export function HomeHero() {
  const router = useRouter();
  return (
    <section className="hero">
      <Image
        src={photos.hero}
        alt="Casas coloridas de Cinque Terre à beira do mar, Itália"
        fill
        priority
        sizes="100vw"
        className="hero-photo"
      />
      <div className="hero-shade" />
      <div className="container hero-content">
        <div className="hero-pill">
          <span className="status-dot" /> SEU MUNDO, COM MAIS POSSIBILIDADES
        </div>
        <h1>
          Sua próxima viagem
          <br />
          em um só lugar<span>.</span>
        </h1>
        <p>
          Menos abas abertas. Mais mundo para descobrir.
          <br />
          Planeje, organize e viva sua viagem com inteligência.
        </p>
        <div className="hero-social">
          <div className="avatar-stack">
            {["M", "R", "A", "G"].map((letter, i) => (
              <span
                style={{ background: ["#d8b9a0", "#6b8978", "#ceb291", "#a3b8b3"][i] }}
                key={letter}
              >
                {letter}
              </span>
            ))}
          </div>
          <div>
            <div className="stars">★★★★★</div>
            <span>Para quem tem o mundo nos planos</span>
          </div>
        </div>
      </div>
      <div className="hero-location">
        <MapPin size={16} />
        <span>Cinque Terre, Itália</span>
        <span className="location-line" />
        44°07′ N 9°42′ E
      </div>
      <div className="container hero-search-wrap">
        <div className="search-panel">
          <div className="search-top">
            <span>
              <Plane size={17} /> Vamos tirar sua viagem do papel?
            </span>
            <span className="powered">
              <Sparkles size={13} /> Um toque de inteligência em cada plano
            </span>
          </div>
          <form
            className="travel-search"
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              router.push(
                `/planejar?${new URLSearchParams(Object.fromEntries(fields) as Record<string, string>)}`,
              );
            }}
          >
            <label>
              <MapPin size={19} />
              <div>
                <span>DE ONDE VOCÊ SAI?</span>
                <input
                  name="origem"
                  aria-label="De onde você sai?"
                  placeholder="Sua cidade"
                  required
                />
              </div>
            </label>
            <label>
              <Search size={19} />
              <div>
                <span>PARA ONDE QUER IR?</span>
                <input
                  name="destino"
                  aria-label="Para onde quer ir?"
                  placeholder="Escolha um destino"
                />
              </div>
            </label>
            <label>
              <CalendarDays size={19} />
              <div>
                <span>QUANDO?</span>
                <input name="inicio" type="date" aria-label="Data de início" />
              </div>
            </label>
            <label>
              <Users size={19} />
              <div>
                <span>VIAJANTES</span>
                <select name="pessoas" aria-label="Quantidade de viajantes">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "pessoa" : "pessoas"}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <Button type="submit">
              Planejar minha viagem <ArrowRight size={18} />
            </Button>
          </form>
        </div>
        <Link className="undecided" href="/explorar">
          <Compass size={15} /> Ainda não sei para onde ir <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
