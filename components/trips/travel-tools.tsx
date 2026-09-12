"use client";
import { useState } from "react";
import {
  Languages,
  Mic,
  Camera,
  MessageCircle,
  Phone,
  Hospital,
  ShieldPlus,
  Landmark,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Input, Select, Tabs } from "@/components/ui";
import type { Trip } from "@/types";
import { navigationUrl } from "@/lib/maps";
const phrases: Record<string, Record<string, string>> = {
  Italiano: {
    "Onde fica o banheiro?": "Dove si trova il bagno?",
    "Quanto custa?": "Quanto costa?",
    "Preciso de ajuda": "Ho bisogno di aiuto",
    Obrigado: "Grazie",
    "A conta, por favor": "Il conto, per favore",
  },
  Inglês: {
    "Onde fica o banheiro?": "Where is the bathroom?",
    "Quanto custa?": "How much does it cost?",
    "Preciso de ajuda": "I need help",
    Obrigado: "Thank you",
    "A conta, por favor": "The bill, please",
  },
  Espanhol: {
    "Onde fica o banheiro?": "¿Dónde está el baño?",
    "Quanto custa?": "¿Cuánto cuesta?",
    "Preciso de ajuda": "Necesito ayuda",
    Obrigado: "Gracias",
    "A conta, por favor": "La cuenta, por favor",
  },
};
export function Translator() {
  const [language, setLanguage] = useState("Italiano");
  const [text, setText] = useState("Onde fica o banheiro?");
  const [result, setResult] = useState("Dove si trova il bagno?");
  const [tab, setTab] = useState("Texto");
  function translate(value = text) {
    const key = Object.keys(phrases[language]).find(
      (k) => k.toLowerCase() === value.trim().toLowerCase(),
    );
    setResult(
      key
        ? phrases[language][key]
        : "Esta frase ainda não está na demonstração. Escolha uma das frases rápidas abaixo.",
    );
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">BOAS CONVERSAS, EM QUALQUER LUGAR</span>
          <h1>Tradutor Voyra</h1>
          <p>Pequenas frases para grandes encontros.</p>
        </div>
        <Badge>Simulado</Badge>
      </div>
      <Card className="translator-card">
        <Tabs
          items={["Texto", "Voz", "Câmera", "Frases rápidas"]}
          value={tab}
          onChange={(v) => {
            setTab(v);
            if (v === "Voz" || v === "Câmera")
              toast.info(`${v} é uma prévia. Use o texto ou as frases rápidas nesta versão.`);
          }}
        />
        <div className="form-grid">
          <Select label="De">
            <option>Português</option>
          </Select>
          <Select
            label="Para"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setResult("");
            }}
          >
            {Object.keys(phrases).map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </div>
        {(tab === "Voz" || tab === "Câmera") && (
          <div className="notice" style={{ marginTop: 20 }}>
            {tab === "Voz" ? <Mic size={20} /> : <Camera size={20} />}A captura por{" "}
            {tab.toLowerCase()} estará disponível em uma próxima versão.
          </div>
        )}
        <form
          className="stack"
          style={{ marginTop: 22 }}
          onSubmit={(e) => {
            e.preventDefault();
            translate();
          }}
        >
          <Input
            label="O que você quer dizer?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <Button type="submit">
            <Languages size={17} />
            Traduzir frase
          </Button>
        </form>
        {result && (
          <div className="translation-result" role="status">
            {result}
          </div>
        )}
        <span className="eyebrow">
          <MessageCircle size={14} />
          FRASES RÁPIDAS
        </span>
        <div className="style-options">
          {Object.keys(phrases[language]).map((p) => (
            <button
              onClick={() => {
                setText(p);
                translate(p);
              }}
              key={p}
            >
              {p}
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}
export function Emergency({ trip }: { trip: Trip }) {
  const italy = trip.country === "Itália";
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow" style={{ color: "#b3483e" }}>
            QUANDO VOCÊ MAIS PRECISA
          </span>
          <h1>Você não está sozinho.</h1>
          <p>Informações de apoio para sua viagem a {trip.destination}.</p>
        </div>
        <ShieldPlus size={32} color="#b3483e" />
      </div>
      <div className="notice warning" style={{ marginBottom: 24 }}>
        Em emergências reais, procure imediatamente as autoridades locais. Locais próximos dependem
        da sua posição atual; confirme no mapa externo.
      </div>
      <div className="emergency-grid">
        <div className="emergency-card">
          <Phone size={25} />
          <h3>{italy ? "SOS · 112" : "SOS · serviço local"}</h3>
          <p>
            {italy
              ? "Número europeu de emergência, disponível na Itália."
              : "Consulte o número de emergência oficial do país antes de viajar."}
          </p>
          {italy ? (
            <a href="tel:112" className="button button-secondary">
              <Phone size={16} />
              Ligar 112
            </a>
          ) : (
            <a
              href={`https://www.gov.br/mre/pt-br/assuntos/portal-consular`}
              target="_blank"
              rel="noreferrer"
              className="button button-secondary"
            >
              Orientação consular
              <ArrowUpRight size={15} />
            </a>
          )}
        </div>
        {[
          {
            icon: Hospital,
            title: "Hospital próximo",
            query: `hospital em ${trip.destination}`,
            text: "Encontre serviços de saúde no mapa e confirme a distância.",
          },
          {
            icon: Landmark,
            title: "Consulado do Brasil",
            query: `consulado Brasil ${trip.destination}`,
            text: "Apoio consular e orientações para cidadãos brasileiros.",
          },
          {
            icon: ShieldPlus,
            title: "Polícia local",
            query: `polícia ${trip.destination}`,
            text: "Consulte a unidade mais próxima e os canais oficiais.",
          },
        ].map(({ icon: Icon, title, query, text }) => (
          <div className="emergency-card" key={title}>
            <Icon size={25} />
            <h3>{title}</h3>
            <p>{text}</p>
            <a
              href={navigationUrl(query)}
              target="_blank"
              rel="noreferrer"
              className="button button-secondary"
            >
              Buscar no mapa
              <ArrowUpRight size={15} />
            </a>
          </div>
        ))}
        <div className="emergency-card">
          <ShieldPlus size={25} />
          <h3>Seguro viagem</h3>
          <p>Tenha o número da sua apólice e o telefone da seguradora disponíveis.</p>
          <a href={`/app/viagens/${trip.id}/documentos`} className="button button-secondary">
            Abrir Voyra Pass
          </a>
        </div>
        <EmergencyContact tripId={trip.id} />
      </div>
    </>
  );
}
function EmergencyContact({ tripId }: { tripId: string }) {
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState<{ name: string; phone: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(`voyra-contact-${tripId}`) ?? "null");
    } catch {
      return null;
    }
  });
  return (
    <div className="emergency-card">
      <UserRound size={25} />
      <h3>Contato de emergência</h3>
      {contact && !editing ? (
        <>
          <p>
            {contact.name} · {contact.phone}
          </p>
          <a
            href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
            className="button button-secondary"
          >
            Ligar para contato
          </a>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const next = { name: String(f.get("name")), phone: String(f.get("phone")) };
            try {
              localStorage.setItem(`voyra-contact-${tripId}`, JSON.stringify(next));
              setContact(next);
              setEditing(false);
              toast.success("Contato salvo neste dispositivo");
            } catch {
              toast.error("Não foi possível salvar neste navegador.");
            }
          }}
        >
          <Input label="Nome" name="name" defaultValue={contact?.name} required />
          <Input
            label="Telefone com código do país"
            name="phone"
            type="tel"
            pattern="[+0-9 ()-]{7,25}"
            defaultValue={contact?.phone}
            placeholder="+55 61 99999-9999"
            required
          />
          <Button type="submit">Salvar contato no dispositivo</Button>
        </form>
      )}
    </div>
  );
}
