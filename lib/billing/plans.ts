export const billingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
export const plans = [
  {
    id: "free",
    name: "Free",
    price: "Grátis",
    badge: "Para começar",
    items: [
      "Até 2 viagens",
      "Roteiro e controle de gastos",
      "Documentos privados",
      "Diário e exportação dos seus dados",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "R$ 24,90",
    badge: "Mais popular",
    items: [
      "Viagens ilimitadas",
      "Todos os recursos do Free",
      "Organização de reservas e participantes",
      "Gerenciamento da assinatura",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    price: "R$ 49,90",
    badge: "Para criadores",
    items: [
      "Tudo do Plus",
      "Publicação de roteiros na comunidade",
      "Link público para compartilhar",
      "Atualização e retirada de publicação",
    ],
  },
] as const;
export type PaidPlan = "plus" | "creator";
export type Plan = "free" | PaidPlan;
export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "plus" || value === "creator";
}
export function effectivePlan(
  subscription: { plan: Plan; status: string; current_period_end: string } | null,
): Plan {
  return subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    Date.parse(subscription.current_period_end) > Date.now()
    ? subscription.plan
    : "free";
}
