import { test, expect } from "@playwright/test";
test("Pages preview: navigation, local trip creation, reload and sign out", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Sua próxima viagem em um só lugar." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Guilherme" })).toBeVisible();
  await page.getByRole("link", { name: "Nova viagem", exact: true }).click();
  await page.getByLabel("Cidade de origem").fill("Brasília");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Destino", { exact: true }).fill("Lisboa");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Ida", { exact: true }).fill("2027-05-10");
  await page.getByLabel("Volta", { exact: true }).fill("2027-05-17");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Número de viajantes").fill("2");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Orçamento total da viagem").fill("10000");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gastronomia", exact: true }).click();
  await page.getByRole("button", { name: "Criar minha viagem" }).click();
  await expect(page.getByRole("heading", { name: "Portugal 2027", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Portugal 2027", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Roteiro", exact: true }).first().click();
  await page.getByRole("button", { name: "Adicionar atividade" }).first().click();
  await page.getByLabel("Nome da atividade").fill("Visitar Belém");
  await page.getByLabel("Localização", { exact: true }).fill("Belém, Lisboa");
  await page.getByLabel("Valor previsto").fill("50");
  await page.getByRole("button", { name: "Salvar atividade" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Visitar Belém" })).toBeVisible();
  await page.getByRole("link", { name: "Reservas", exact: true }).first().click();
  const booking = page.getByRole("link", { name: "Buscar hospedagem na Booking.com" });
  await expect(booking).toHaveAttribute("href", "https://www.booking.com/");
  await expect(booking).toHaveAttribute("target", "_blank");
  await page.getByRole("button", { name: "Adicionar minha hospedagem" }).click();
  await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue("Hotel");
  await page.getByLabel("Nome do documento").fill("Hotel em Lisboa");
  await page.getByLabel("Referência ou observação").fill("Confirmação cadastrada manualmente");
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hotel em Lisboa" })).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua próxima viagem em um só lugar." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("Pages preview: mobile, deep links, return destination and all workspace sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#/app/viagens/italia-2027/gastos");
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  await expect(page).toHaveURL(/#\/app\/viagens\/italia-2027\/gastos/);
  for (const section of [
    "",
    "roteiro",
    "mapa",
    "gastos",
    "documentos",
    "participantes",
    "modo-viagem",
    "tradutor",
    "emergencia",
    "diario",
    "publicar",
    "reservas",
    "configuracoes",
  ]) {
    await page.goto(`./#/app/viagens/italia-2027${section ? `/${section}` : ""}`);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      section,
    ).toBe(true);
  }
  await page.goto("./");
  await page.screenshot({ path: "test-results/pages/landing-mobile.png", fullPage: true });
  await page.goto("./#/precos");
  await expect(page.getByRole("button", { name: "Assinar Plus" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
