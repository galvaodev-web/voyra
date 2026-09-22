import { test, expect, type Page } from "@playwright/test";
async function demo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(page.getByRole("heading", { name: "Olá, Guilherme" })).toBeVisible();
}
test("landing, discovery, favorites and route protection", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sua próxima viagem em um só lugar." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/landing-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Salvar Buenos Aires nos favoritos" }).click();
  await expect(
    page.getByRole("button", { name: "Remover Buenos Aires dos favoritos" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remover Buenos Aires dos favoritos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Descobrir destinos" }).click();
  await expect(page.getByText("Total para 1 pessoa").first()).toBeVisible();
  await expect(page.getByText("Preço estimado").first()).toBeVisible();
  await expect(page.getByText(/Confiança da estimativa:/).first()).toBeVisible();
  const planningHref = await page
    .getByRole("link", { name: "Selecionar destino" })
    .first()
    .getAttribute("href");
  const planningUrl = new URL(planningHref!, "http://localhost");
  expect(planningUrl.pathname).toBe("/planejar");
  expect(planningUrl.searchParams.get("origem")).toBe("São Paulo, Brasil");
  expect(planningUrl.searchParams.get("pessoas")).toBe("1");
  expect(planningUrl.searchParams.get("orcamento")).toBe("5000");
  expect(planningUrl.searchParams.get("duracao")).toBe("7");
  await page.screenshot({ path: "test-results/search-comparison-desktop.png", fullPage: true });
  await page.getByLabel("Orçamento", { exact: true }).selectOption("3000");
  await page.getByLabel("Pessoas para orçamento").selectOption("4");
  await page.getByRole("button", { name: "Descobrir destinos" }).click();
  await expect(
    page.getByRole("heading", { name: "Vamos ampliar as possibilidades?" }),
  ).toBeVisible();
  await page.goto("/app/viagens");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/explorar");
  await page.getByLabel("Encontre seu próximo destino").fill("toquio");
  await expect(page.getByRole("heading", { name: "Tóquio", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Roma", exact: true })).toHaveCount(0);
});
test("create a trip, validate dates and persist activity CRUD", async ({ page }) => {
  await demo(page);
  await page.getByRole("link", { name: "Nova viagem", exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Informe sua cidade de origem")).toBeVisible();
  await page.getByLabel("Cidade de origem").fill("Brasília");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Destino", { exact: true }).fill("Lisboa");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Ida", { exact: true }).fill("2027-05-10");
  await page.getByLabel("Volta", { exact: true }).fill("2027-05-05");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("A volta deve ser no mesmo dia ou depois da ida")).toBeVisible();
  await page.getByLabel("Volta", { exact: true }).fill("2027-05-17");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Número de viajantes").fill("2");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Orçamento total da viagem").fill("10000");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gastronomia", exact: true }).click();
  await page.getByRole("button", { name: "Criar minha viagem" }).click();
  await expect(page.getByRole("heading", { name: "Portugal 2027", exact: true })).toBeVisible();
  const tripUrl = page.url();
  await page.goto(`${tripUrl}/roteiro`);
  await page.getByRole("button", { name: "Adicionar atividade" }).first().click();
  await page.getByLabel("Nome da atividade").fill("Visitar Belém");
  await page.getByLabel("Localização", { exact: true }).fill("Belém, Lisboa");
  await page.getByLabel("Valor previsto").fill("50");
  await page.getByRole("button", { name: "Salvar atividade" }).click();
  await expect(page.getByRole("heading", { name: "Visitar Belém" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Visitar Belém" })).toBeVisible();
  await page.getByRole("button", { name: "Editar Visitar Belém" }).click();
  await page.getByLabel("Nome da atividade").fill("Torre de Belém");
  await page.getByRole("button", { name: "Salvar atividade" }).click();
  await expect(page.getByRole("heading", { name: "Torre de Belém" })).toBeVisible();
  await page.getByRole("button", { name: "Excluir Torre de Belém" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir atividade" }).click();
  await expect(page.getByRole("heading", { name: "Torre de Belém" })).toHaveCount(0);
});
test("expenses, documents, participants and AI", async ({ page }) => {
  await demo(page);
  const base = "/app/viagens/italia-2027";
  await page.goto(`${base}/gastos`);
  await page.getByRole("button", { name: "Adicionar gasto" }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Jantar de teste");
  await page.getByLabel("Valor", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Salvar gasto" }).click();
  await expect(page.getByText("Jantar de teste", { exact: true })).toBeVisible();
  await expect(page.locator(".stat-card").filter({ hasText: "Disponível" })).toContainText("1.480");
  await page.reload();
  await expect(page.getByText("Jantar de teste", { exact: true })).toBeVisible();
  await page.goto(`${base}/documentos`);
  await page.getByRole("button", { name: "Adicionar documento" }).click();
  await page.getByLabel("Nome do documento").fill("Seguro de teste");
  await page.getByLabel("Tipo", { exact: true }).selectOption("Seguro");
  await page.getByLabel("Referência ou observação").fill("Apólice TEST-123");
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(page.getByRole("heading", { name: "Seguro de teste" })).toBeVisible();
  await page
    .locator(".document-card")
    .filter({ hasText: "Seguro de teste" })
    .getByRole("button", { name: "Abrir documento" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Apólice TEST-123");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.goto(`${base}/participantes`);
  await page.getByRole("button", { name: "Convidar participante" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Beatriz");
  await page.getByLabel("E-mail", { exact: true }).fill("beatriz@example.com");
  await page.getByRole("button", { name: "Adicionar participante", exact: true }).click();
  await expect(page.locator(".participant-row").filter({ hasText: "Beatriz" })).toBeVisible();
  await page.getByRole("button", { name: "Voyra AI", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "A Voyra AI não está configurada neste ambiente.",
  );
  await expect(page.getByRole("button", { name: "Quero gastar menos hoje" })).toBeDisabled();
  await page.screenshot({ path: "test-results/trip-desktop.png", fullPage: true });
});
test("all pages and mobile layout", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Descobrir destinos" }).click();
  await expect(page.getByText("Total para 1 pessoa").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/search-comparison-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await demo(page);
  await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
  const paths = [
    "/app/perfil",
    "/app/favoritos",
    "/app/configuracoes",
    "/app/documentos",
    "/app/roteiros",
    "/app/explorar",
    ...[
      "",
      "/roteiro",
      "/mapa",
      "/gastos",
      "/documentos",
      "/participantes",
      "/modo-viagem",
      "/tradutor",
      "/emergencia",
      "/diario",
      "/publicar",
      "/reservas",
      "/configuracoes",
    ].map((p) => `/app/viagens/italia-2027${p}`),
  ];
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `overflow: ${path}`,
    ).toBe(true);
  }
  await page.goto("/app/viagens/italia-2027/modo-viagem");
  await page.getByRole("button", { name: "Preciso de ajuda" }).click();
  await expect(page.getByRole("link", { name: "Preciso de um hospital" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.screenshot({ path: "test-results/travel-mode-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("document upload, diary, sharing and translator", async ({ page }) => {
  await demo(page);
  const base = "/app/viagens/italia-2027";
  await page.goto(`${base}/documentos`);
  await page.getByRole("button", { name: "Adicionar documento" }).click();
  await page.getByLabel("Nome do documento").fill("Ingresso com arquivo");
  await page.getByLabel("Referência ou observação").fill("Anexo de verificação");
  await page.getByLabel("Arquivo do documento").setInputFiles({
    name: "ingresso.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await page
    .locator(".document-card")
    .filter({ hasText: "Ingresso com arquivo" })
    .getByRole("button", { name: "Abrir documento" })
    .click();
  const fileDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Abrir arquivo original" }).click();
  expect((await fileDownload).suggestedFilename()).toBe("ingresso.png");
  await page.goto(`${base}/diario`);
  await page.getByRole("button", { name: "Adicionar memória" }).click();
  await page
    .getByLabel("Como foi esse momento?")
    .fill("Uma tarde inesquecível explorando Roma com amigos.");
  await page.getByRole("button", { name: "Guardar memória" }).click();
  await page.reload();
  await expect(
    page.getByText("Uma tarde inesquecível explorando Roma com amigos.", { exact: true }),
  ).toBeVisible();
  await page.goto(`${base}/publicar`);
  await page
    .getByLabel("Suas dicas para outros viajantes")
    .fill("Reserve os ingressos antes e leve uma garrafa de água.");
  await page.getByRole("checkbox", { name: "Revisei meu roteiro" }).check();
  await page.getByRole("checkbox", { name: "Incluir capa ilustrativa" }).check();
  await page.getByRole("button", { name: "Publicar roteiro (prévia)", exact: true }).click();
  const exportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar roteiro sem dados privados" }).click();
  const stream = await (await exportDownload).createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(exported.name).toBe("Itália 2027");
  expect(exported.cover).toContain("images.unsplash.com");
  expect(exported).not.toHaveProperty("documents");
  expect(exported).not.toHaveProperty("members");
  expect(exported).not.toHaveProperty("expenses");
  await page.goto(`${base}/tradutor`);
  await page.getByLabel("Para", { exact: true }).selectOption("Inglês");
  await page.getByRole("button", { name: "Traduzir frase" }).click();
  await expect(page.getByRole("status")).toHaveText("Where is the bathroom?");
});

test("profile persistence and rejecting cross-origin demo requests", async ({ page, request }) => {
  const denied = await request.post("/api/demo", {
    headers: { origin: "https://unrelated.example" },
  });
  expect(denied.status()).toBe(403);
  await demo(page);
  await page.goto("/app/perfil");
  await page.getByLabel("Seu nome", { exact: true }).fill("Pedro Viajante");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil atualizado", { exact: true })).toBeVisible();
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: "Olá, Pedro" })).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("launch endpoints reject anonymous writes and unsigned billing events", async ({
  request,
}) => {
  for (const route of ["/api/billing/checkout", "/api/billing/portal"]) {
    const response = await request.post(route, {
      headers: { origin: "https://unrelated.example" },
      data: { plan: "creator", user_id: "forged" },
    });
    expect([403, 503]).toContain(response.status());
    expect(await response.json()).not.toHaveProperty("url");
  }
  const account = await request.delete("/api/account", {
    headers: { origin: "https://unrelated.example" },
    data: { confirmation: "EXCLUIR" },
  });
  expect([403, 503]).toContain(account.status());
  const webhook = await request.post("/api/billing/webhook", {
    data: {
      type: "customer.subscription.created",
      data: { object: { plan: "creator", status: "active" } },
    },
  });
  expect(webhook.status()).toBe(400);
  expect((await request.get("/api/internal/storage-cleanup")).status()).toBe(401);
  expect([401, 503]).toContain((await request.get("/api/billing/status")).status());
  expect(await (await request.get("/api/routes")).json()).toEqual({ routes: [], hasMore: false });
});

test("pricing displays only delivered plans and invalid public links are unavailable", async ({
  page,
}) => {
  await page.goto("/precos");
  for (const plan of ["Voyra Free", "Voyra Plus", "Voyra Creator"])
    await expect(page.getByRole("heading", { name: plan, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Voyra Business" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Assinar Plus" })).toBeDisabled();
  await page.screenshot({ path: "test-results/pricing-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/pricing-mobile.png", fullPage: true });
  const response = await page.goto("/roteiros/not-a-valid-id");
  // Next.js streams a 200 before notFound resolves; verify the inaccessible UI and noindex.
  expect([200, 404]).toContain(response?.status());
  await expect(
    page.getByRole("heading", { name: "Vamos encontrar um novo caminho?" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page.goto("/auth/callback?code=invalid");
  await expect(page).toHaveURL(/\/login\?error=callback/);
});

test("deleting a trip requires confirmation and persists", async ({ page }) => {
  await demo(page);
  await page.goto("/app/viagens/italia-2027/configuracoes");
  await page.getByRole("button", { name: "Excluir viagem", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("não pode ser desfeita");
  await page.getByRole("button", { name: "Confirmar exclusão da viagem", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/viagens$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Itália 2027", exact: true })).toHaveCount(0);
});
