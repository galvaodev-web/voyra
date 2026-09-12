"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button, Card, Input } from "@/components/ui";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { navigateWithFreshSession } from "@/lib/session-navigation";
const schema = z
  .object({ password: z.string().min(8, "Use pelo menos 8 caracteres"), confirmation: z.string() })
  .refine((v) => v.password === v.confirmation, {
    path: ["confirmation"],
    message: "As senhas precisam ser iguais",
  });
type Values = z.infer<typeof schema>;
export function ResetPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Escolha uma nova senha.</h1>
          <p>Uma senha forte ajuda a proteger suas próximas viagens.</p>
        </div>
      </div>
      <Card className="settings-card">
        <form
          className="stack"
          onSubmit={handleSubmit(async (values) => {
            if (!isSupabaseConfigured) {
              toast.info("A conta de demonstração não possui senha.");
              return;
            }
            try {
              const { error } = await createClient().auth.updateUser({ password: values.password });
              if (error) throw error;
              toast.success("Senha atualizada");
              navigateWithFreshSession("/app/dashboard");
            } catch {
              toast.error(
                "Não foi possível atualizar a senha. Solicite um novo link de recuperação.",
              );
            }
          })}
        >
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
          <Input
            label="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            {...register("confirmation")}
            error={errors.confirmation?.message}
          />
          <Button type="submit" loading={isSubmitting}>
            Salvar nova senha
          </Button>
        </form>
      </Card>
    </>
  );
}
