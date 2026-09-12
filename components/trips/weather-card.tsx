import Link from "next/link";
import { CloudRain, Sun, ArrowRight } from "lucide-react";
import { Badge, Card } from "@/components/ui";
export function WeatherCard({ city = "Roma", tripId }: { city?: string; tripId?: string }) {
  return (
    <Card className="weather-card">
      <div className="row between">
        <h3>O tempo em {city}</h3>
        <Badge className="neutral">Simulado</Badge>
      </div>
      <div className="weather-temp">
        <div>
          <strong>24°</strong>
          <small>Hoje · céu limpo</small>
        </div>
        <Sun />
      </div>
      <div className="notice">
        <CloudRain size={18} />
        <span>Vai chover amanhã. Que tal trocar o passeio externo por uma atividade coberta?</span>
      </div>
      <Link
        className="text-link"
        href={tripId ? `/app/viagens/${tripId}/roteiro?clima=chuva` : "/app/viagens"}
      >
        Ajustar meu roteiro <ArrowRight size={14} />
      </Link>
    </Card>
  );
}
