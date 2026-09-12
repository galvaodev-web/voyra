"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Navbar, Footer } from "@/components/layout/navbar";
import { Badge, Button, Card } from "@/components/ui";
import { plans, type PaidPlan } from "@/lib/billing/plans";
import { openBilling } from "@/components/billing/billing-card";
import { isSupabaseConfigured } from "@/lib/supabase/client";
export function Pricing() {
  const [busy, setBusy] = useState("");
  async function subscribe(plan: PaidPlan) {
    setBusy(plan);
    try {
      await openBilling("checkout", plan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <Navbar />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">MAIS POSSIBILIDADES PARA SEUS PLANOS</span>
            <h1>Um plano para cada viajante.</h1>
            <p>Comece de graça. Amplie seus planos quando estiver pronto.</p>
          </div>
        </section>
        <section className="container section">
          <div
            className="pricing-grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))" }}
          >
            {plans.map((plan) => (
              <Card className={`pricing-card ${plan.id === "plus" ? "popular" : ""}`} key={plan.id}>
                <Badge>
                  {plan.id === "plus" && <Sparkles size={12} />}
                  {plan.badge}
                </Badge>
                <h3>Voyra {plan.name}</h3>
                <div className="plan-price">
                  {plan.price}
                  {plan.id !== "free" && <small> / mês</small>}
                </div>
                <ul>
                  {plan.items.map((item) => (
                    <li key={item}>
                      <Check />
                      {item}
                    </li>
                  ))}
                </ul>
                {plan.id === "free" ? (
                  <Link className="button button-secondary" href="/cadastro">
                    Começar gratuitamente
                  </Link>
                ) : (
                  <Button
                    loading={busy === plan.id}
                    disabled={Boolean(busy) || !isSupabaseConfigured}
                    variant={plan.id === "plus" ? "primary" : "secondary"}
                    onClick={() => void subscribe(plan.id as PaidPlan)}
                  >
                    Assinar {plan.name}
                  </Button>
                )}
              </Card>
            ))}
          </div>
          <p className="estimate-note">
            Assinaturas mensais com renovação automática. Gerencie ou cancele em Configurações.
            Roteiros publicados ficam disponíveis enquanto o plano Creator estiver ativo. Publicação
            gratuita para leitores, sem venda de roteiros.
          </p>
          {!isSupabaseConfigured && (
            <p className="notice">
              Você está conhecendo a demonstração. A contratação será disponibilizada na abertura
              das contas reais.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
