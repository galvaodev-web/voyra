export async function startDemoSession() {
  const response = await fetch("/api/demo", { method: "POST" });
  if (!response.ok) throw new Error("Não foi possível abrir a demonstração.");
}
export async function endDemoSession() {
  const response = await fetch("/api/demo", { method: "DELETE" });
  if (!response.ok) throw new Error("Não foi possível sair da demonstração.");
}
