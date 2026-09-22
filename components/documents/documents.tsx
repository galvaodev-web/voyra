"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Plane, Plus, Ticket, UploadCloud, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Tabs } from "@/components/ui";
import { useVoyra } from "@/hooks/use-voyra";
import { saveFile, getFileUrl, removeFile } from "@/lib/storage";
import { dateLabel, uid } from "@/utils/format";
import type { TravelDocument, Trip } from "@/types";
import { BookingCard } from "@/components/trips/booking-card";
const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  type: z.string().min(1),
  date: z.string().min(1, "Escolha a data"),
  time: z.string().min(1, "Informe o horário"),
  reference: z.string().trim().min(2, "Informe a referência ou observação"),
  company: z.string().trim().max(120).optional(),
  amount: z.number().min(0, "Use um valor positivo").optional(),
  currency: z.enum(["BRL", "EUR", "USD"]),
  externalLink: z
    .union([
      z.literal(""),
      z
        .url("Informe um link válido")
        .refine((value) => value.startsWith("https://"), "Use um link HTTPS"),
    ])
    .optional(),
});
type Values = z.infer<typeof schema>;
export function Documents({ trip, bookingsOnly = false }: { trip: Trip; bookingsOnly?: boolean }) {
  const { saveTrip } = useVoyra();
  const [tab, setTab] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [defaultType, setDefaultType] = useState("Ingresso");
  const [selected, setSelected] = useState<TravelDocument | null>(null);
  const [removing, setRemoving] = useState<TravelDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const docs = trip.documents.filter(
    (d) =>
      (tab === "Todos" || d.type === tab) &&
      (!bookingsOnly ||
        ["Voo", "Hotel", "Trem", "Ingresso", "Seguro", "Restaurante", "Reserva", "Outro"].includes(
          d.type,
        )),
  );
  async function openFile(doc: TravelDocument) {
    if (!doc.file) return;
    setBusy(true);
    try {
      const url = await getFileUrl(doc.file);
      if (url.startsWith("data:")) {
        const [header, payload] = url.split(",", 2);
        if (!header || !payload || !header.includes(";base64"))
          throw new Error("Arquivo local inválido.");
        const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
        const blob = new Blob([bytes], {
          type: header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream",
        });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = doc.fileName ?? doc.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o arquivo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">SUA CARTEIRA DE VIAGEM</span>
          <h1>{bookingsOnly ? "Suas reservas, organizadas." : "Voyra Pass"}</h1>
          <p>O que você precisa, exatamente quando precisa.</p>
        </div>
        <Button
          onClick={() => {
            setDefaultType("Ingresso");
            setOpen(true);
          }}
        >
          <Plus size={16} />
          Adicionar documento
        </Button>
      </div>
      {bookingsOnly && (
        <div style={{ marginBottom: 24 }}>
          <BookingCard
            trip={trip}
            onAdd={() => {
              setDefaultType("Hotel");
              setOpen(true);
            }}
          />
        </div>
      )}
      <Tabs
        items={["Todos", "Voo", "Hotel", "Ingresso", "Trem", "Seguro", "Reserva", "Pessoal"]}
        value={tab}
        onChange={setTab}
      />
      {docs.length ? (
        <div className="document-grid">
          {docs.map((doc) => (
            <DocumentCard
              document={doc}
              key={doc.id}
              onOpen={() => setSelected(doc)}
              onDelete={() => setRemoving(doc)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sua carteira está pronta para receber seus planos"
          description="Adicione uma passagem, ingresso, reserva ou documento pessoal."
        />
      )}
      <div className="notice" style={{ marginTop: 24 }}>
        <Ticket size={19} />
        <span>
          Para embarcar ou entrar em atrações, use sempre o arquivo original do documento.
        </span>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar ao Voyra Pass">
        <DocumentForm
          trip={trip}
          defaultType={defaultType}
          onSave={async (values, file) => {
            let path: string | undefined;
            try {
              if (file) path = await saveFile(file, trip.id);
              if (
                await saveTrip({
                  ...trip,
                  documents: [
                    ...trip.documents,
                    { ...values, id: uid(), file: path, fileName: file?.name },
                  ],
                })
              ) {
                toast.success("Documento salvo");
                setOpen(false);
              } else if (path) {
                await removeFile(path);
              }
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
            }
          }}
        />
      </Modal>
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Documento"}
      >
        {selected && (
          <div className="stack">
            <Badge>{selected.type}</Badge>
            {selected.company && <p>Empresa: {selected.company}</p>}
            {selected.amount !== undefined && (
              <p>
                Valor:{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: selected.currency ?? "BRL",
                }).format(selected.amount)}
              </p>
            )}
            <div>
              <h3>{selected.reference}</h3>
              <p style={{ marginTop: 12 }}>
                {dateLabel(selected.date)} de {selected.date.slice(0, 4)} · {selected.time}
              </p>
            </div>
            {selected.file ? (
              <Button loading={busy} onClick={() => void openFile(selected)}>
                <FileText size={16} />
                Abrir arquivo original
              </Button>
            ) : (
              <div className="notice warning">
                Este cartão contém apenas os dados cadastrados. Nenhum arquivo original foi anexado.
              </div>
            )}
            {selected.externalLink && (
              <a
                className="button button-secondary"
                href={selected.externalLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir link da reserva <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        )}
      </Modal>
      <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remover documento?">
        <div className="stack">
          <p>Remover “{removing?.name}” da carteira desta viagem?</p>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              if (
                await saveTrip({
                  ...trip,
                  documents: trip.documents.filter((d) => d.id !== removing?.id),
                })
              ) {
                setRemoving(null);
                toast.success("Documento removido");
              }
              setBusy(false);
            }}
          >
            Remover documento
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function DocumentCard({
  document: doc,
  onOpen,
  onDelete,
}: {
  document: TravelDocument;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className="document-card">
      <div className="row between">
        <span className="icon-tile">
          {doc.type === "Voo" ? <Plane size={22} /> : <Ticket size={22} />}
        </span>
        <div className="row">
          <Badge>{doc.type}</Badge>
          {onDelete && (
            <button
              className="icon-button"
              aria-label={`Remover documento ${doc.name}`}
              onClick={onDelete}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <h3>{doc.name}</h3>
      <p>{doc.reference}</p>
      {doc.company && <p>{doc.company}</p>}
      <div className="document-details">
        <span>
          <small>DATA</small>
          <strong>
            {dateLabel(doc.date)} {doc.date.slice(0, 4)}
          </strong>
        </span>
        <span>
          <small>HORÁRIO</small>
          <strong>{doc.time}</strong>
        </span>
      </div>
      <Button variant="secondary" onClick={onOpen}>
        Abrir documento
        <ArrowUpRight size={14} />
      </Button>
    </Card>
  );
}
function DocumentForm({
  trip,
  defaultType,
  onSave,
}: {
  trip: Trip;
  defaultType: string;
  onSave: (values: Values, file?: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: defaultType,
      date: trip.start,
      time: "10:00",
      reference: "",
      company: "",
      currency: "BRL",
      externalLink: "",
    },
  });
  return (
    <form className="form-grid" onSubmit={handleSubmit((values) => onSave(values, file))}>
      <div className="full">
        <Input label="Nome do documento" {...register("name")} error={errors.name?.message} />
      </div>
      <Select label="Tipo" {...register("type")}>
        {[
          "Voo",
          "Hotel",
          "Ingresso",
          "Trem",
          "Seguro",
          "Restaurante",
          "Reserva",
          "Outro",
          "Pessoal",
        ].map((t) => (
          <option key={t}>{t}</option>
        ))}
      </Select>
      <Input label="Data" type="date" {...register("date")} error={errors.date?.message} />
      <Input label="Horário" type="time" {...register("time")} error={errors.time?.message} />
      <Input
        label="Referência ou observação"
        {...register("reference")}
        error={errors.reference?.message}
      />
      <Input label="Empresa (opcional)" {...register("company")} error={errors.company?.message} />
      <Input
        label="Valor (opcional)"
        type="number"
        min="0"
        step="0.01"
        {...register("amount", {
          setValueAs: (value) => (value === "" ? undefined : Number(value)),
        })}
        error={errors.amount?.message}
      />
      <div>
        <Select label="Moeda" {...register("currency")}>
          <option value="BRL">BRL</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </Select>
        {errors.currency?.message && (
          <small className="field-error">{errors.currency.message}</small>
        )}
      </div>
      <Input
        label="Link externo (opcional)"
        type="url"
        placeholder="https://"
        {...register("externalLink")}
        error={errors.externalLink?.message}
      />
      <label className="upload-zone full">
        <UploadCloud size={26} style={{ margin: "0 auto 8px" }} />
        Anexar arquivo original (opcional)
        <input
          aria-label="Arquivo do documento"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
        <small>PDF ou imagem · até 3 MB (800 KB na demonstração)</small>
      </label>
      <Button className="full" type="submit" loading={isSubmitting}>
        Salvar documento
      </Button>
    </form>
  );
}
