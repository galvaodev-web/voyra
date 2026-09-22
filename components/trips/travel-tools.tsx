"use client";

import { useEffect, useState } from "react";
import {
  Languages,
  MessageCircle,
  Phone,
  Hospital,
  ShieldPlus,
  Landmark,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { useVoyra } from "@/hooks/use-voyra";
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

const languages = [
  "Português",
  "Inglês",
  "Espanhol",
  "Italiano",
  "Francês",
  "Alemão",
  "Japonês",
  "Coreano",
  "Mandarim",
];

export function Translator() {
  const [sourceLanguage, setSourceLanguage] = useState("Português");
  const [targetLanguage, setTargetLanguage] = useState("Italiano");
  const [text, setText] = useState("Onde fica o banheiro?");
  const [result, setResult] = useState("Dove si trova il bagno?");
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(process.env.NEXT_PUBLIC_STATIC_DEMO !== "true");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") return;
    void fetch("/api/translate", { cache: "no-store" })
      .then(async (response) => (await response.json()) as { available?: boolean })
      .then((payload) => {
        if (active) setAvailable(payload.available === true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function offlineTranslation(value: string) {
    if (sourceLanguage !== "Português" || !phrases[targetLanguage]) return null;
    const key = Object.keys(phrases[targetLanguage]).find(
      (phrase) => phrase.toLowerCase() === value.trim().toLowerCase(),
    );
    return key ? phrases[targetLanguage][key] : null;
  }

  async function translate(value = text) {
    const offline = offlineTranslation(value);
    if (offline) {
      setResult(offline);
      return;
    }
    if (!available) {
      toast.error("A tradução livre não está disponível neste ambiente.");
      return;
    }
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, sourceLanguage, targetLanguage }),
      });
      const payload = (await response.json()) as { translation?: string; error?: string };
      if (!response.ok || !payload.translation)
        throw new Error(payload.error || "Não foi possível traduzir agora.");
      setResult(payload.translation);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível traduzir agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">BOAS CONVERSAS, EM QUALQUER LUGAR</span>
          <h1>Tradutor Voyra</h1>
          <p>Tradução livre quando o provider está conectado e frases essenciais offline.</p>
        </div>
        <Badge className="neutral">
          {checking ? "Verificando" : available ? "OpenAI" : "Frases offline"}
        </Badge>
      </div>
      <Card className="translator-card">
        <div className="form-grid">
          <Select
            label="De"
            value={sourceLanguage}
            onChange={(event) => {
              setSourceLanguage(event.target.value);
              setResult("");
            }}
          >
            {languages.map((language) => (
              <option key={language}>{language}</option>
            ))}
          </Select>
          <Select
            label="Para"
            value={targetLanguage}
            onChange={(event) => {
              setTargetLanguage(event.target.value);
              setResult("");
            }}
          >
            {languages.map((language) => (
              <option key={language}>{language}</option>
            ))}
          </Select>
        </div>
        <form
          className="stack"
          style={{ marginTop: 22 }}
          onSubmit={(event) => {
            event.preventDefault();
            void translate();
          }}
        >
          <Input
            label="O que você quer dizer?"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={1500}
            required
          />
          <Button type="submit" loading={busy}>
            <Languages size={17} />
            Traduzir frase
          </Button>
        </form>
        {result && (
          <div className="translation-result" role="status">
            {result}
          </div>
        )}
        {sourceLanguage === "Português" && phrases[targetLanguage] && (
          <>
            <span className="eyebrow">
              <MessageCircle size={14} />
              FRASES OFFLINE
            </span>
            <div className="style-options">
              {Object.keys(phrases[targetLanguage]).map((phrase) => (
                <button
                  type="button"
                  onClick={() => {
                    setText(phrase);
                    void translate(phrase);
                  }}
                  key={phrase}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </>
        )}
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
              href="https://www.gov.br/mre/pt-br/assuntos/portal-consular"
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
        <EmergencyContact trip={trip} />
      </div>
    </>
  );
}

function EmergencyContact({ trip }: { trip: Trip }) {
  const { saveTrip } = useVoyra();
  const [editing, setEditing] = useState(!trip.emergencyContact);
  const [busy, setBusy] = useState(false);
  const contact = trip.emergencyContact;
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
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const next = { name: String(form.get("name")), phone: String(form.get("phone")) };
            setBusy(true);
            if (await saveTrip({ ...trip, emergencyContact: next })) {
              setEditing(false);
              toast.success("Contato salvo na viagem");
            }
            setBusy(false);
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
          <Button type="submit" loading={busy}>
            Salvar contato
          </Button>
        </form>
      )}
    </div>
  );
}
