import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export async function saveFile(file: File, tripId: string): Promise<string> {
  if (!allowed.includes(file.type)) throw new Error("Use PDF, JPG, PNG ou WebP.");
  if (file.size > 3 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 3 MB.");
  if (isSupabaseConfigured) {
    const form = new FormData();
    form.set("tripId", tripId);
    form.set("file", file);
    const response = await fetch("/api/documents", { method: "POST", body: form });
    const result = (await response.json().catch(() => null)) as {
      path?: string;
      error?: string;
    } | null;
    if (!response.ok || !result?.path)
      throw new Error(result?.error ?? "Não foi possível enviar o arquivo.");
    return result.path;
  }
  if (file.size > 800 * 1024)
    throw new Error(
      "Na demonstração, use arquivos de até 800 KB para preservar o espaço do navegador.",
    );
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}
export async function getFileUrl(path: string): Promise<string> {
  if (
    path.startsWith("data:application/pdf;base64,") ||
    /^data:image\/(png|jpeg|webp);base64,/.test(path)
  )
    return path;
  const { data, error } = await createClient()
    .storage.from("travel-documents")
    .createSignedUrl(path, 120);
  if (error) throw new Error("Não foi possível abrir o arquivo.");
  return data.signedUrl;
}
export async function removeFile(path: string) {
  if (!isSupabaseConfigured || path.startsWith("data:")) return;
  const { error } = await createClient().storage.from("travel-documents").remove([path]);
  if (error) throw new Error("Não foi possível remover o anexo enviado.");
}
