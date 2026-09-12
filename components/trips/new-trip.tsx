"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Input } from "@/components/ui";
import { useVoyra } from "@/hooks/use-voyra";
import { destinations, photos, travelStyles } from "@/data/mock-data";
import { money, tripDays, uid } from "@/utils/format";
const schema = z
  .object({
    origin: z.string().trim().min(2, "Informe sua cidade de origem"),
    destination: z.string().trim().min(2, "Informe seu destino"),
    start: z.string().min(1, "Escolha a data de ida"),
    end: z.string().min(1, "Escolha a data de volta"),
    travelers: z.number().int().min(1, "Ao menos um viajante").max(30, "Máximo de 30 viajantes"),
    budget: z
      .number()
      .min(100, "Informe um orçamento de ao menos R$ 100")
      .max(10000000, "Informe um orçamento menor"),
  })
  .refine((v) => v.end >= v.start, {
    message: "A volta deve ser no mesmo dia ou depois da ida",
    path: ["end"],
  });
type Values = z.infer<typeof schema>;
const titles = [
  "De onde começa sua aventura?",
  "Qual é o seu próximo destino?",
  "Quando vamos fazer as malas?",
  "Quem vem com você?",
  "Quanto vamos investir nessa história?",
  "O que faz uma viagem ser sua?",
];
const descriptions = [
  "Sua cidade de origem é o nosso ponto de partida.",
  "Pode ser um sonho antigo ou uma ideia de agora.",
  "Escolha as datas para organizar cada dia da viagem.",
  "Viajar sozinho ou acompanhado: todo caminho tem seu encanto.",
  "Um orçamento bem pensado deixa a viagem mais leve.",
  "Selecione os estilos que combinam com você.",
];
export function NewTrip() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, saveTrip } = useVoyra();
  const [step, setStep] = useState(0);
  const [styles, setStyles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const {
    register,
    trigger,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      origin: params.get("origem") ?? "",
      destination: params.get("destino") ?? "",
      start: params.get("inicio") ?? "",
      end: "",
      travelers: Number(params.get("pessoas")) || 1,
      budget: 8000,
    },
  });
  const fields: (keyof Values)[][] = [
    ["origin"],
    ["destination"],
    ["start", "end"],
    ["travelers"],
    ["budget"],
    [],
  ];
  async function next() {
    if (await trigger(fields[step])) setStep(step + 1);
  }
  async function create(values: Values) {
    if (step < 5) {
      await next();
      return;
    }
    if (!styles.length) {
      toast.error("Escolha ao menos um estilo de viagem.");
      return;
    }
    setBusy(true);
    const d = destinations.find((d) => d.city.toLowerCase() === values.destination.toLowerCase());
    const id = uid();
    const success = await saveTrip({
      id,
      ...values,
      name: `${d?.country ?? values.destination} ${values.start.slice(0, 4)}`,
      country: d?.country ?? "",
      image: d?.image ?? photos.hero,
      styles,
      status: "Planejando",
      progress: 15,
      activities: [],
      expenses: [],
      documents: [],
      members: [{ id: uid(), name: data.profile.name, role: "Administrador" }],
      notes: [],
    });
    setBusy(false);
    if (success) {
      toast.success("Viagem criada com sucesso");
      router.push(`/app/viagens/${id}`);
    }
  }
  return (
    <div className="wizard">
      <LinkBack />
      <div className="wizard-progress" aria-label={`Etapa ${step + 1} de 6`}>
        {titles.map((_, i) => (
          <span key={i} className={i <= step ? "active" : ""} />
        ))}
      </div>
      <Card className="wizard-card">
        <span className="eyebrow">PASSO {String(step + 1).padStart(2, "0")} DE 06</span>
        <h1>{titles[step]}</h1>
        <p>{descriptions[step]}</p>
        <form
          onSubmit={(event) => {
            if (step < 5) {
              event.preventDefault();
              void next();
            } else void handleSubmit(create)(event);
          }}
        >
          {step === 0 && (
            <Input
              label="Cidade de origem"
              placeholder="Ex.: Brasília, Brasil"
              {...register("origin")}
              error={errors.origin?.message}
            />
          )}
          {step === 1 && (
            <>
              <Input
                label="Destino"
                placeholder="Ex.: Roma"
                list="destination-options"
                {...register("destination")}
                error={errors.destination?.message}
              />
              <datalist id="destination-options">
                {destinations.map((d) => (
                  <option value={d.city} key={d.id} />
                ))}
              </datalist>
            </>
          )}
          {step === 2 && (
            <div className="form-grid">
              <Input label="Ida" type="date" {...register("start")} error={errors.start?.message} />
              <Input label="Volta" type="date" {...register("end")} error={errors.end?.message} />
            </div>
          )}
          {step === 3 && (
            <>
              <Input
                label="Número de viajantes"
                type="number"
                min={1}
                max={30}
                {...register("travelers", { valueAsNumber: true })}
                error={errors.travelers?.message}
              />
              <div className="notice">
                Você poderá adicionar os nomes dos participantes depois de criar a viagem.
              </div>
            </>
          )}
          {step === 4 && (
            <Input
              label="Orçamento total da viagem (R$)"
              type="number"
              min={100}
              step={100}
              {...register("budget", { valueAsNumber: true })}
              error={errors.budget?.message}
            />
          )}
          {step === 5 && (
            <>
              <div className="style-options">
                {travelStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={styles.includes(style)}
                    className={styles.includes(style) ? "selected" : ""}
                    onClick={() =>
                      setStyles((current) =>
                        current.includes(style)
                          ? current.filter((v) => v !== style)
                          : [...current, style],
                      )
                    }
                  >
                    {styles.includes(style) && <Check size={14} />}
                    {style}
                  </button>
                ))}
              </div>
              <div className="wizard-summary">
                <strong>
                  {getValues("origin")} → {getValues("destination")}
                </strong>
                <br />
                {tripDays(getValues("start"), getValues("end"))} dias · {getValues("travelers")}{" "}
                viajantes · {money(getValues("budget"))}
                <p>
                  Seu espaço será criado para você montar o roteiro com liberdade. A Voyra AI estará
                  disponível para sugestões simuladas.
                </p>
              </div>
            </>
          )}
          <div className="wizard-controls">
            <Button
              type="button"
              variant="secondary"
              disabled={step === 0 || busy}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} />
              Voltar
            </Button>
            <Button type="submit" loading={busy}>
              {step === 5 ? (
                <>
                  <Sparkles size={16} />
                  Gerar minha viagem
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
function LinkBack() {
  return (
    <Link className="auth-back" href="/app/viagens">
      <ArrowLeft size={14} />
      Minhas viagens
    </Link>
  );
}
