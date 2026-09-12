"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Luggage,
  Compass,
  Heart,
  Bookmark,
  Ticket,
  UserRound,
  Settings,
  LogOut,
  Sparkles,
  Bell,
  ChevronRight,
  Plus,
  Map,
  CalendarDays,
  Ellipsis,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/navbar";
import { Avatar, Badge, Button, LoadingSkeleton, Modal } from "@/components/ui";
import { useVoyra } from "@/hooks/use-voyra";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/utils/format";
import { navigateWithFreshSession } from "@/lib/session-navigation";
import { endDemoSession } from "@/lib/demo-session";
const nav = [
  { label: "Início", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Minhas viagens", href: "/app/viagens", icon: Luggage },
  { label: "Explorar", href: "/app/explorar", icon: Compass },
  { label: "Favoritos", href: "/app/favoritos", icon: Heart },
  { label: "Roteiros salvos", href: "/app/roteiros", icon: Bookmark },
  { label: "Documentos", href: "/app/documentos", icon: Ticket },
  { label: "Perfil", href: "/app/perfil", icon: UserRound },
  { label: "Configurações", href: "/app/configuracoes", icon: Settings },
];
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data, ready, error, reload } = useVoyra();
  const [more, setMore] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const tripMatch = path.match(/^\/app\/viagens\/([^/]+)/);
  const tripId = tripMatch && tripMatch[1] !== "nova" ? tripMatch[1] : null;
  const base = tripId ? `/app/viagens/${tripId}` : null;
  const active = nav.find(
    (n) => path === n.href || (n.href === "/app/viagens" && path.startsWith("/app/viagens/")),
  );
  async function logout() {
    try {
      if (isSupabaseConfigured) {
        const { error } = await createClient().auth.signOut();
        if (error) throw error;
      } else {
        await endDemoSession();
      }
      navigateWithFreshSession("/");
    } catch {
      toast.error("Não foi possível sair. Tente novamente.");
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <span className="sidebar-section">SEU ESPAÇO DE VIAGEM</span>
        <nav aria-label="Menu da aplicação">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link key={href} className={cn(active?.href === href && "active")} href={href}>
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-promo">
          <Sparkles />
          <strong>Mais mundo com Voyra Plus</strong>
          <p>Novas possibilidades para quem quer ir além.</p>
          <Link href="/precos" className="text-link">
            Conhecer o Plus <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="sidebar-user">
          <Avatar name={data.profile.name} />
          <div>
            <strong>{data.profile.name}</strong>
            <small>{isSupabaseConfigured ? "Minha conta" : "Conta de demonstração"}</small>
          </div>
          <button className="icon-button" aria-label="Sair da conta" onClick={() => void logout()}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="breadcrumb">
            <Link href="/app/dashboard">Meu espaço</Link>
            <ChevronRight size={12} />
            <span>{active?.label ?? "Minha viagem"}</span>
          </div>
          <div className="topbar-actions">
            <Badge>{isSupabaseConfigured ? "Seu mundo, organizado" : "Modo demonstração"}</Badge>
            <button
              className="icon-button"
              aria-label="Notificações"
              onClick={() => setNotifications(true)}
            >
              <Bell size={18} />
            </button>
            <Link href="/app/perfil" aria-label="Meu perfil">
              <Avatar name={data.profile.name} />
            </Link>
          </div>
        </header>
        <main id="main" className="app-content">
          {!ready ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="empty-state">
              <h2>Não conseguimos carregar seus planos.</h2>
              <p>{error}</p>
              <Button onClick={reload}>Tentar novamente</Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <nav className="mobile-bottom" aria-label="Navegação móvel">
        <Link
          className={!base ? "active" : ""}
          href={base ? `${base}/modo-viagem` : "/app/dashboard"}
        >
          <Compass />
          Hoje
        </Link>
        <Link href={base ? `${base}/roteiro` : "/app/viagens"}>
          <CalendarDays />
          Roteiro
        </Link>
        <Link className="add-tab" href={base ? `${base}/roteiro?adicionar=1` : "/app/viagens/nova"}>
          <Plus />
          Adicionar
        </Link>
        <Link href={base ? `${base}/mapa` : "/app/explorar"}>
          <Map />
          Mapa
        </Link>
        <button onClick={() => setMore(true)}>
          <Ellipsis />
          Mais
        </button>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="Seu espaço Voyra">
        <div className="help-options">
          {nav.map(({ label, href }) => (
            <Link onClick={() => setMore(false)} href={href} key={href}>
              {label}
            </Link>
          ))}
          <button onClick={() => void logout()}>Sair da conta</button>
        </div>
      </Modal>
      <Modal open={notifications} onClose={() => setNotifications(false)} title="Suas notificações">
        <div className="stack">
          <span className="icon-tile">
            <Bell />
          </span>
          <h3>Tudo em dia por aqui.</h3>
          <p>
            Alertas de reservas, clima e convites aparecerão aqui quando as integrações estiverem
            disponíveis.
          </p>
        </div>
      </Modal>
    </div>
  );
}
