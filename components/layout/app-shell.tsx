"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  { label: "Alertas", href: "/app/alertas", icon: Bell },
  { label: "Documentos", href: "/app/documentos", icon: Ticket },
  { label: "Perfil", href: "/app/perfil", icon: UserRound },
  { label: "Configurações", href: "/app/configuracoes", icon: Settings },
];
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data, ready, error, reload } = useVoyra();
  const [more, setMore] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [notificationItems, setNotificationItems] = useState<
    Array<{ id: string; title: string; body: string; read_at: string | null; created_at: string }>
  >([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const tripMatch = path.match(/^\/app\/viagens\/([^/]+)/);
  const tripId = tripMatch && tripMatch[1] !== "nova" ? tripMatch[1] : null;
  const base = tripId ? `/app/viagens/${tripId}` : null;
  const active = nav.find(
    (n) => path === n.href || (n.href === "/app/viagens" && path.startsWith("/app/viagens/")),
  );
  useEffect(() => {
    if (!notifications || !isSupabaseConfigured) return;
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setNotificationItems(payload);
      })
      .catch(() => toast.error("Não foi possível carregar as notificações."))
      .finally(() => setNotificationsLoading(false));
  }, [notifications]);
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
              onClick={() => {
                setNotificationsLoading(true);
                setNotifications(true);
              }}
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
          {notificationsLoading ? (
            <p role="status">Carregando notificações…</p>
          ) : notificationItems.length ? (
            notificationItems.map((item) => (
              <button
                className="collection-option"
                key={item.id}
                onClick={async () => {
                  if (!item.read_at) {
                    await fetch("/api/notifications", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: item.id }),
                    });
                    setNotificationItems((current) =>
                      current.map((value) =>
                        value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value,
                      ),
                    );
                  }
                }}
              >
                <span><strong>{item.title}</strong><small>{item.body}</small></span>
                {!item.read_at && <Badge>Nova</Badge>}
              </button>
            ))
          ) : (
            <>
              <h3>Tudo em dia por aqui.</h3>
              <p>Seus alertas de preço e atualizações importantes aparecerão aqui.</p>
            </>
          )}
          <Link className="button button-secondary" href="/app/alertas" onClick={() => setNotifications(false)}>
            Gerenciar alertas
          </Link>
        </div>
      </Modal>
    </div>
  );
}
