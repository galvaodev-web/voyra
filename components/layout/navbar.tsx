"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/format";
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={cn("logo", light && "logo-light")} aria-label="Voyra início">
      <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M4 7h9l6 15L26 7h7L20 32h-4L4 7Z" fill="currentColor" />
        <path d="m4 7 13 4 2 11-6-15H4Z" fill="white" fillOpacity=".35" />
        <path d="m22 4 10-2-5 8-5-6Z" fill="#82C5AF" />
      </svg>
      voyra<span className="logo-dot">.</span>
    </Link>
  );
}
export function Navbar() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Logo />
        <nav className={cn("nav-links", open && "nav-open")} aria-label="Navegação principal">
          {[
            ["Explorar", "/explorar"],
            ["Planejar", "/planejar"],
            ["Roteiros", "/roteiros"],
            ["Preços", "/precos"],
          ].map(([title, href]) => (
            <Link
              onClick={() => setOpen(false)}
              className={cn(path === href && "active")}
              key={href}
              href={href}
            >
              {title}
              {title === "Roteiros" && <span className="tiny-badge">NOVO</span>}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="login-link">
            Entrar
          </Link>
          <Link href="/cadastro" className="button button-primary small">
            Criar conta <ArrowUpRight size={16} />
          </Link>
          <button
            className="mobile-menu icon-button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Logo />
            <p>
              Sua próxima viagem em um só lugar.
              <br />
              Feita para quem tem o mundo nos planos.
            </p>
          </div>
          <div>
            <strong>Explore a Voyra</strong>
            <Link href="/explorar">Destinos</Link>
            <Link href="/roteiros">Roteiros da comunidade</Link>
            <Link href="/precos">Nossos planos</Link>
          </div>
          <div>
            <strong>Sua próxima aventura</strong>
            <Link href="/planejar">Planejar uma viagem</Link>
            <Link href="/login">Acessar minha conta</Link>
            <Link href="/cadastro">Começar gratuitamente</Link>
          </div>
          <div className="footer-note">
            <span className="status-dot" /> Mais mundo. Menos preocupação.
            <p>Planeje, organize e viva sua viagem com inteligência.</p>
            {process.env.NEXT_PUBLIC_TERMS_URL && (
              <a href={process.env.NEXT_PUBLIC_TERMS_URL}>Termos de uso</a>
            )}
            {process.env.NEXT_PUBLIC_PRIVACY_URL && (
              <a href={process.env.NEXT_PUBLIC_PRIVACY_URL}>Privacidade</a>
            )}
            {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
              <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}>Fale com a Voyra</a>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Voyra. Todos os caminhos levam a uma história.</span>
          <span>Feito no Brasil, para o mundo. ↗</span>
        </div>
      </div>
    </footer>
  );
}
