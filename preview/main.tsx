import { Component, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { VoyraProvider } from "@/hooks/use-voyra";
import { AppShell } from "@/components/layout/app-shell";
import { Home } from "@/components/marketing/home";
import { Explore } from "@/components/marketing/explore";
import { Pricing } from "@/components/marketing/pricing";
import { Routes } from "@/components/marketing/routes";
import { AuthForm } from "@/components/auth/auth-form";
import { Dashboard } from "@/components/dashboard";
import { AccountPage } from "@/components/account";
import { NewTrip } from "@/components/trips/new-trip";
import { TripWorkspace, tripSections } from "@/components/trips/trip-workspace";
import { Navbar, Footer } from "@/components/layout/navbar";
import { hasDemoSession } from "./demo-session";
import { navigate, useRoute, usePathname, useSearchParams } from "./navigation";
import Link from "./link";
import "@/app/globals.css";
class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main id="main" className="error-screen">
        <h1>Não foi possível abrir a demonstração.</h1>
        <p>Permita o armazenamento de dados neste navegador e tente novamente.</p>
        <button className="button button-primary" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to, true);
  }, [to]);
  return <p role="status">Abrindo seus planos…</p>;
}
function Planning() {
  const params = useSearchParams();
  return (
    <>
      <Navbar />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">DO SONHO AO ROTEIRO</span>
            <h1>
              {params.get("destino")
                ? `${params.get("destino")} está nos seus planos.`
                : "Vamos planejar sua próxima história?"}
            </h1>
            <p>Seus destinos, datas e orçamento em uma viagem organizada.</p>
          </div>
        </section>
        <section className="container section">
          <div className="card wizard stack">
            <h2>Um plano com o seu jeito de viajar.</h2>
            <p>
              Escolha de onde sair, para onde ir e o que mais gosta de fazer. Depois, organize cada
              detalhe no seu espaço de viagem.
            </p>
            <Link className="button button-primary" href={`/app/viagens/nova?${params}`}>
              Começar meu planejamento
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
function NotFound() {
  return (
    <main id="main" className="error-screen">
      <h1>Vamos encontrar um novo caminho?</h1>
      <p>Essa página não está na demonstração.</p>
      <Link className="button button-primary" href="/">
        Voltar para o início
      </Link>
    </main>
  );
}
function PreviewRouter() {
  const route = useRoute();
  const path = usePathname();
  useEffect(() => {
    document.title = "Voyra — Sua próxima viagem em um só lugar";
    window.scrollTo(0, 0);
  }, [path]);
  if (path === "/") return <Home />;
  if (path === "/explorar") return <Explore />;
  if (path === "/precos") return <Pricing />;
  if (path === "/roteiros") return <Routes />;
  if (path === "/planejar") return <Planning />;
  if (path === "/login" || path === "/cadastro" || path === "/esqueci-senha")
    return <AuthForm key={path} mode={path.slice(1) as "login" | "cadastro" | "esqueci-senha"} />;
  if (path === "/app" || path.startsWith("/app/")) {
    if (!hasDemoSession()) return <Redirect to={`/login?next=${encodeURIComponent(route)}`} />;
    if (path === "/app") return <Redirect to="/app/dashboard" />;
    let content: ReactNode;
    if (path === "/app/dashboard") content = <Dashboard />;
    else if (path === "/app/viagens") content = <Dashboard tripsOnly />;
    else if (path === "/app/viagens/nova") content = <NewTrip />;
    else if (path.startsWith("/app/viagens/")) {
      const [, , , id, section = ""] = path.split("/");
      content =
        id && tripSections.includes(section) ? (
          <TripWorkspace id={decodeURIComponent(id)} section={section} />
        ) : (
          <NotFound />
        );
    } else if (
      ["explorar", "favoritos", "roteiros", "documentos", "perfil", "configuracoes"].includes(
        path.slice(5),
      )
    )
      content = <AccountPage section={path.slice(5)} />;
    else content = <NotFound />;
    return (
      <AppShell>
        <div key={path}>{content}</div>
      </AppShell>
    );
  }
  return <NotFound />;
}
createRoot(document.getElementById("root")!).render(
  <PreviewBoundary>
    <a
      className="skip-link"
      href="#main"
      onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById("main");
        main?.setAttribute("tabindex", "-1");
        main?.focus();
        main?.scrollIntoView();
      }}
    >
      Pular para o conteúdo
    </a>
    <VoyraProvider>
      <PreviewRouter />
      <Toaster position="bottom-right" richColors closeButton />
    </VoyraProvider>
  </PreviewBoundary>,
);
