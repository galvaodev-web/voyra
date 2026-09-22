import "server-only";

import { HttpError } from "@/lib/server/http";

const extensions: Record<string, Set<string>> = {
  "application/pdf": new Set(["pdf"]),
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function matchesSignature(type: string, bytes: Uint8Array) {
  switch (type) {
    case "application/pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
      );
    default:
      return false;
  }
}

export async function validateTravelFile(file: File) {
  if (file.size <= 0 || file.size > 3 * 1024 * 1024)
    throw new HttpError(413, "O arquivo deve ter no máximo 3 MB.");
  const allowedExtensions = extensions[file.type];
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (!allowedExtensions?.has(extension))
    throw new HttpError(415, "A extensão do arquivo não corresponde ao formato permitido.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesSignature(file.type, bytes))
    throw new HttpError(415, "O conteúdo do arquivo não corresponde ao formato informado.");
  return extension === "jpeg" ? "jpg" : extension;
}
