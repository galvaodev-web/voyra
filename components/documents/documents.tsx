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
});
type Values = z.infer<typeof schema>;
export function DemoQR() {
  return (
    <svg className="qr" viewBox="0 0 29 29" role="img" aria-label="QR Code fictício, sem validade">
      <rect width="29" height="29" fill="white" />
      {[
        [1, 1],
        [21, 1],
        [1, 21],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="currentColor" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="white" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
        </g>
      ))}
      {Array.from({ length: 100 }, (_, i) => {
        const x = 9 + ((i * 7) % 19);
        const y = 9 + ((i * 11) % 19);
        return i % 3 !== 0 ? (
          <rect key={i} x={x} y={y} width={i % 2 ? 1 : 2} height="1" fill="currentColor" />
        ) : null;
      })}
    </svg>
  );
}
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
      (!bookingsOnly || ["Voo", "Hotel", "Trem", "Reserva"].includes(d.type)),
  );
  async function openFile(doc: TravelDocument) {
    if (!doc.file) return;
    setBusy(true);
    try {
      const url = await getFileUrl(doc.file);
      if (url.startsWith("data:")) {
        const response = await fetch(url);
        const blob = await response.blob();
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
          Os QR Codes de exemplo são fictícios. Para embarcar ou entrar em atrações, abra o arquivo
          original do seu ingresso.
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
            <div className="row between">
              <div>
                <h3>{selected.reference}</h3>
                <p style={{ marginTop: 12 }}>
                  {dateLabel(selected.date)} de {selected.date.slice(0, 4)} · {selected.time}
                </p>
              </div>
              <DemoQR />
            </div>
            {selected.file ? (
              <Button loading={busy} onClick={() => void openFile(selected)}>
                <FileText size={16} />
                Abrir arquivo original
              </Button>
            ) : (
              <div className="notice warning">
                Este cartão contém apenas os dados cadastrados. Nenhum arquivo original foi anexado;
                o QR Code não tem validade.
              </div>
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
      <div className="row">
        <DemoQR />
        <Button variant="secondary" onClick={onOpen}>
          Abrir documento
          <ArrowUpRight size={14} />
        </Button>
      </div>
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
    defaultValues: { name: "", type: defaultType, date: trip.start, time: "10:00", reference: "" },
  });
  return (
    <form className="form-grid" onSubmit={handleSubmit((values) => onSave(values, file))}>
      <div className="full">
        <Input label="Nome do documento" {...register("name")} error={errors.name?.message} />
      </div>
      <Select label="Tipo" {...register("type")}>
        {["Voo", "Hotel", "Ingresso", "Trem", "Seguro", "Reserva", "Pessoal"].map((t) => (
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
