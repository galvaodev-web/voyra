"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, BedDouble, Plane } from "lucide-react";
import { Button, Card, Input, Select } from "@/components/ui";

type ReferralResponse = { url?: string; error?: string; disclosure?: string };

async function requestReferral(payload: Record<string, unknown>) {
  const response = await fetch("/api/marketplace/referral", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ReferralResponse;
  if (!response.ok || !data.url) throw new Error(data.error || "Não foi possível abrir a oferta.");
  return data;
}

export function Marketplace() {
  const [busy, setBusy] = useState<"flights" | "hotels" | null>(null);
  const [message, setMessage] = useState("");
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let active = true;
    void fetch("/api/marketplace/referral", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { available?: boolean }) => {
        if (active) setAvailable(result.available === true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="form-grid">
        <Card className="settings-card">
          <div className="stack">
            <span className="icon-tile">
              <Plane />
            </span>
            <div>
              <h2>Passagens aéreas</h2>
              <p>Compare opções e siga para a reserva com um parceiro de viagem da Voyra.</p>
            </div>
            <form
              className="form-grid"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy("flights");
                setMessage("");
                try {
                  const form = new FormData(event.currentTarget);
                  const data = await requestReferral({
                    vertical: "flights",
                    origin: String(form.get("origin") || ""),
                    destination: String(form.get("destination") || ""),
                    outboundDate: String(form.get("outboundDate") || ""),
                    inboundDate: String(form.get("inboundDate") || "") || undefined,
                    adults: Number(form.get("adults") || 1),
                    cabinclass: String(form.get("cabinclass") || "economy"),
                  });
                  window.location.assign(data.url!);
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Não foi possível buscar.");
                } finally {
                  setBusy(null);
                }
              }}
            >
              <Input label="Origem (IATA)" name="origin" placeholder="BSB" maxLength={3} required />
              <Input
                label="Destino (IATA)"
                name="destination"
                placeholder="LIS"
                maxLength={3}
                required
              />
              <Input label="Ida" name="outboundDate" type="date" min={today} required />
              <Input label="Volta" name="inboundDate" type="date" min={today} />
              <Input
                label="Adultos"
                name="adults"
                type="number"
                min={1}
                max={9}
                defaultValue={1}
                required
              />
              <Select label="Cabine" name="cabinclass" defaultValue="economy">
                <option value="economy">Econômica</option>
                <option value="premiumeconomy">Econômica premium</option>
                <option value="business">Executiva</option>
                <option value="first">Primeira classe</option>
              </Select>
              <Button
                className="full"
                type="submit"
                loading={busy === "flights"}
                disabled={!available}
              >
                {checking
                  ? "Verificando parceiro"
                  : available
                    ? "Comparar passagens"
                    : "Parceiro indisponível"}{" "}
                <ArrowUpRight size={16} />
              </Button>
            </form>
          </div>
        </Card>

        <Card className="settings-card">
          <div className="stack">
            <span className="icon-tile">
              <BedDouble />
            </span>
            <div>
              <h2>Hospedagem</h2>
              <p>Encontre hotéis para as datas da viagem e conclua a reserva com o parceiro.</p>
            </div>
            <form
              className="form-grid"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy("hotels");
                setMessage("");
                try {
                  const form = new FormData(event.currentTarget);
                  const data = await requestReferral({
                    vertical: "hotels",
                    destinationCode: String(form.get("destinationCode") || ""),
                    checkin: String(form.get("checkin") || ""),
                    checkout: String(form.get("checkout") || ""),
                    adults: Number(form.get("adults") || 2),
                    rooms: Number(form.get("rooms") || 1),
                  });
                  window.location.assign(data.url!);
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Não foi possível buscar.");
                } finally {
                  setBusy(null);
                }
              }}
            >
              <div className="full">
                <Input
                  label="Destino (código de cidade/aeroporto)"
                  name="destinationCode"
                  placeholder="LIS"
                  maxLength={32}
                  required
                />
              </div>
              <Input label="Check-in" name="checkin" type="date" min={today} required />
              <Input label="Check-out" name="checkout" type="date" min={today} required />
              <Input
                label="Adultos"
                name="adults"
                type="number"
                min={1}
                max={20}
                defaultValue={2}
                required
              />
              <Input
                label="Quartos"
                name="rooms"
                type="number"
                min={1}
                max={10}
                defaultValue={1}
                required
              />
              <Button
                className="full"
                type="submit"
                loading={busy === "hotels"}
                disabled={!available}
              >
                {checking
                  ? "Verificando parceiro"
                  : available
                    ? "Buscar hospedagem"
                    : "Parceiro indisponível"}{" "}
                <ArrowUpRight size={16} />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <p className={`notice${available ? "" : " warning"}`}>
        <strong>Intermediação Voyra:</strong> a busca começa na Voyra e a contratação é concluída
        com o parceiro responsável pela oferta. A Voyra pode receber comissão pela indicação, sem
        cobrar uma taxa adicional nesta etapa. Preço, disponibilidade, emissão, alteração e
        reembolso são confirmados pelo parceiro antes da compra.
        {!available && !checking && " Nenhum parceiro está configurado neste ambiente."}
      </p>
      {message && (
        <p role="alert" className="field-error">
          {message}
        </p>
      )}
    </div>
  );
}
