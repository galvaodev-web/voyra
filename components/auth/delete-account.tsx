"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, Modal } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { navigateWithFreshSession } from "@/lib/session-navigation";
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isSupabaseConfigured) return null;
  return (
    <>
      <Card>
        <h2>Excluir minha conta</h2>
        <p>Apague suas viagens, documentos e roteiros públicos e encerre sua assinatura.</p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Excluir minha conta
        </Button>
      </Card>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="Excluir conta permanentemente"
      >
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const response = await fetch("/api/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              navigateWithFreshSession("/login?account=deleted");
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Não foi possível excluir a conta.",
              );
              setBusy(false);
            }
          }}
        >
          <p>
            Esta ação não pode ser desfeita. Exporte seus dados antes de continuar. A assinatura
            será cancelada imediatamente e seus arquivos serão apagados. A exclusão não emite
            reembolso automaticamente.
          </p>
          <p>
            Se houver uma falha durante a exclusão, parte dos dados pode já ter sido removida. Tente
            novamente para concluir.
          </p>
          <Input
            label="Digite EXCLUIR para confirmar"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            required
            pattern="EXCLUIR"
          />
          <Button
            type="submit"
            variant="danger"
            loading={busy}
            disabled={confirmation !== "EXCLUIR"}
          >
            Excluir conta permanentemente
          </Button>
        </form>
      </Modal>
    </>
  );
}
