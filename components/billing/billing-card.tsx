"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, Card, Badge } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { PaidPlan, Plan } from "@/lib/billing/plans";
import { navigateWithFreshSession } from "@/lib/session-navigation";

export async function openBilling(action: "checkout" | "portal", plan?: PaidPlan) {
  const response = await fetch(`/api/billing/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const result = await response.json();
  if (response.status === 401) {
    navigateWithFreshSession("/login?next=/app/configuracoes");
    return;
  }
  if (!response.ok) throw new Error(result.error ?? "Não foi possível abrir a assinatura.");
  const url = new URL(result.url);
  if (
    url.protocol !== "https:" ||
    !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)
  )
    throw new Error("Endereço de pagamento inválido.");
  window.location.assign(url.href);
}
type BillingStatus = {
  plan: Plan;
  subscription: {
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
};
export function BillingCard() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [returned, setReturned] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const checkoutReturn = new URLSearchParams(location.search).get("checkout") === "success";
    async function load() {
      try {
        const response = await fetch("/api/billing/status", { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        setReturned(checkoutReturn);
        if (!response.ok) throw new Error(result.error);
        setStatus(result);
        setError("");
        if (checkoutReturn && result.plan === "free" && ++attempts < 10)
          timer = setTimeout(load, 3000);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Erro ao carregar assinatura.");
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  async function open(action: "checkout" | "portal", plan?: PaidPlan) {
    setBusy(true);
    try {
      await openBilling(action, plan);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2>Seu plano</h2>
      {!isSupabaseConfigured ? (
        <p>
          Na demonstração não há cobranças. <Link href="/precos">Conheça os planos.</Link>
        </p>
      ) : (
        <div className="stack">
          {error ? (
            <p role="alert">{error}</p>
          ) : !status ? (
            <p role="status">Consultando assinatura…</p>
          ) : (
            <>
              <Badge>
                Voyra{" "}
                {status.plan === "free" ? "Free" : status.plan === "plus" ? "Plus" : "Creator"}
              </Badge>
              {returned && status.plan === "free" && (
                <p role="status">
                  Aguardando a confirmação do pagamento. O plano será liberado após a confirmação.
                </p>
              )}
              {status.subscription?.cancel_at_period_end && (
                <p>
                  Cancelamento agendado. Acesso até{" "}
                  {new Date(status.subscription.current_period_end).toLocaleDateString("pt-BR")}.
                </p>
              )}
              {status.subscription &&
                !["active", "trialing", "canceled"].includes(status.subscription.status) && (
                  <p>Há uma pendência na assinatura. Confira seu pagamento no portal.</p>
                )}
              {status.plan === "free" && (
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <Button loading={busy} onClick={() => void open("checkout", "plus")}>
                    Assinar Plus
                  </Button>
                  <Button
                    loading={busy}
                    variant="secondary"
                    onClick={() => void open("checkout", "creator")}
                  >
                    Assinar Creator
                  </Button>
                </div>
              )}
              {status.subscription && (
                <Button loading={busy} variant="secondary" onClick={() => void open("portal")}>
                  Gerenciar ou cancelar assinatura
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" onClick={() => setRevision((v) => v + 1)}>
            Atualizar assinatura
          </Button>
        </div>
      )}
    </Card>
  );
}
