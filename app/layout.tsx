import type { Metadata } from "next";
import { Toaster } from "sonner";
import { VoyraProvider } from "@/hooks/use-voyra";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Voyra — Sua próxima viagem em um só lugar", template: "%s | Voyra" },
  description:
    "Organize roteiro, gastos e reservas da sua próxima viagem em um só lugar. Explore destinos e planeje cada dia com a Voyra.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main">
          Pular para o conteúdo
        </a>
        <VoyraProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </VoyraProvider>
      </body>
    </html>
  );
}
