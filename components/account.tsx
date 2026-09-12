"use client";
import Link from "next/link";
import { useState } from "react";
import { Bookmark, Check, Download, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useVoyra } from "@/hooks/use-voyra";
import { Avatar, Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { Explore } from "@/components/marketing/explore";
import { Routes } from "@/components/marketing/routes";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BillingCard } from "@/components/billing/billing-card";
import { DeleteAccount } from "@/components/auth/delete-account";
export function AccountPage({ section }: { section: string }) {
  const { data, savePreferences } = useVoyra();
  const [busy, setBusy] = useState(false);
  if (section === "favoritos" || section === "explorar")
    return (
      <>
        <div className="page-title">
          <div>
            <span className="eyebrow">UM MUNDO DE POSSIBILIDADES</span>
            <h1>
              {section === "favoritos" ? "Seus próximos sonhos." : "Para onde o mundo te chama?"}
            </h1>
            <p>
              {section === "favoritos"
                ? "Os destinos que você quer guardar por perto."
                : "Descubra lugares que combinam com seu jeito de viajar."}
            </p>
          </div>
        </div>
        <Explore embedded favorites={section === "favoritos" ? data.favorites : undefined} />
      </>
    );
  if (section === "roteiros")
    return (
      <>
        <div className="page-title">
          <div>
            <h1>Roteiros salvos</h1>
            <p>Inspirações para os caminhos que você ainda vai percorrer.</p>
          </div>
          <Link className="button button-secondary" href="/roteiros">
            <Bookmark size={16} />
            Explorar roteiros
          </Link>
        </div>
        <Routes embedded savedOnly />
      </>
    );
  if (section === "documentos")
    return (
      <>
        <div className="page-title">
          <div>
            <span className="eyebrow">VOYRA PASS</span>
            <h1>Seus documentos, sempre por perto.</h1>
            <p>Escolha uma viagem para acessar passagens, reservas e ingressos.</p>
          </div>
        </div>
        {data.trips.some((t) => t.documents.length) ? (
          <div className="document-grid">
            {data.trips
              .filter((t) => t.documents.length)
              .map((t) => (
                <Card key={t.id}>
                  <Badge>{t.documents.length} documentos</Badge>
                  <h3 style={{ margin: "18px 0 12px" }}>{t.name}</h3>
                  <p className="small-text" style={{ marginBottom: 20 }}>
                    {t.documents
                      .map((d) => d.type)
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(" · ")}
                  </p>
                  <Link className="button button-primary" href={`/app/viagens/${t.id}/documentos`}>
                    Abrir Voyra Pass
                  </Link>
                </Card>
              ))}
          </div>
        ) : (
          <EmptyState
            title="Um lugar para cada documento"
            description="Abra uma viagem para adicionar suas passagens e reservas."
          >
            <Link href="/app/viagens" className="button button-primary">
              Minhas viagens
            </Link>
          </EmptyState>
        )}
      </>
    );
  if (section === "configuracoes")
    return (
      <>
        <div className="page-title">
          <div>
            <h1>Do seu jeito.</h1>
            <p>Configurações e dados da sua experiência Voyra.</p>
          </div>
        </div>
        <div className="stack settings-card">
          <BillingCard />
          <Card>
            <h2>Conta e armazenamento</h2>
            <div className="notice">
              <Check size={17} />
              {isSupabaseConfigured
                ? "Sua conta usa autenticação e armazenamento Supabase."
                : "Demonstração ativa. Suas alterações ficam neste navegador."}
            </div>
            <p className="small-text" style={{ marginTop: 18 }}>
              A Voyra AI, o clima e o mapa interno são demonstrações. Reservas são cadastradas
              manualmente. Convites por e-mail e sincronização offline ainda não estão disponíveis.
            </p>
          </Card>
          <Card>
            <h2>Uma cópia dos seus planos</h2>
            <p>
              Exporte suas viagens, preferências e documentos cadastrados. O arquivo pode conter
              dados pessoais; guarde em um local privado.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "meus-dados-voyra.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast.success("Exportação preparada");
              }}
            >
              <Download size={16} />
              Exportar meus dados
            </Button>
          </Card>
          <Card>
            <h2>Segurança da conta</h2>
            <p>Para redefinir sua senha, solicite um link pelo e-mail da sua conta.</p>
            <Link
              className="button button-secondary"
              style={{ marginTop: 20 }}
              href="/esqueci-senha"
            >
              Redefinir minha senha
            </Link>
          </Card>
          <DeleteAccount />
        </div>
      </>
    );
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">QUEM COLECIONA ESSAS HISTÓRIAS</span>
          <h1>Meu perfil</h1>
          <p>Vamos deixar a Voyra ainda mais sua.</p>
        </div>
        <UserRound size={28} color="#006b67" />
      </div>
      <Card className="settings-card">
        <div className="row" style={{ marginBottom: 28 }}>
          <Avatar name={data.profile.name} className="!h-16 !w-16 !text-2xl" />
          <div>
            <h3>{data.profile.name}</h3>
            <p className="small-text">
              Viajante Voyra · {isSupabaseConfigured ? "Minha conta" : "Demonstração"}
            </p>
          </div>
        </div>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            if (
              await savePreferences({
                profile: {
                  ...data.profile,
                  name: String(f.get("name")).trim(),
                  city: String(f.get("city")).trim(),
                },
              })
            )
              toast.success("Perfil atualizado");
            setBusy(false);
          }}
        >
          <Input
            label="Seu nome"
            name="name"
            defaultValue={data.profile.name}
            required
            minLength={2}
            maxLength={80}
          />
          <Input label="E-mail da conta" type="email" value={data.profile.email} readOnly />
          <Input
            label="Cidade onde você mora"
            name="city"
            defaultValue={data.profile.city}
            placeholder="Ex.: Brasília, Brasil"
          />
          <Button type="submit" loading={busy}>
            Salvar perfil
          </Button>
        </form>
      </Card>
    </>
  );
}
