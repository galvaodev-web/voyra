"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { Logo } from "@/components/layout/navbar";
import { Button, Input } from "@/components/ui";
import { photos } from "@/data/mock-data";
import { createClient, demoEnabled, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeNext } from "@/utils/format";
import { navigateWithFreshSession, getNavigationSearch } from "@/lib/session-navigation";
import { startDemoSession } from "@/lib/demo-session";
const schema = z.object({
  name: z.string().optional(),
  email: z.email("Digite um e-mail válido"),
  password: z.string().optional(),
});
type Values = z.infer<typeof schema>;
export function AuthForm({ mode }: { mode: "login" | "cadastro" | "esqueci-senha" }) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const registerMode = mode === "cadastro";
  const reset = mode === "esqueci-senha";
  useEffect(() => {
    const params = getNavigationSearch();
    if (params.get("error") === "callback")
      toast.error(
        "O link de acesso é inválido ou expirou. Solicite um novo link ou entre novamente.",
      );
    if (params.get("account") === "deleted") toast.success("Sua conta foi excluída.");
  }, []);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const title = registerMode
    ? "O mundo espera por você."
    : reset
      ? "Vamos recuperar seu acesso."
      : "Bom ter você de volta.";
  async function submit(values: Values) {
    if (!reset && (!values.password || values.password.length < 8)) {
      setError("password", { message: "Use pelo menos 8 caracteres" });
      return;
    }
    if (registerMode && !values.name?.trim()) {
      setError("name", { message: "Como podemos chamar você?" });
      return;
    }
    if (!isSupabaseConfigured) {
      toast.info(
        "Autenticação ainda não conectada. Use a demonstração abaixo ou configure o Supabase.",
      );
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const next = safeNext(getNavigationSearch().get("next"));
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: `${origin}/auth/callback?next=/app/redefinir-senha`,
        });
        if (error) throw error;
        setSuccess(true);
      } else if (registerMode) {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password!,
          options: {
            data: { name: values.name },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (data.session) navigateWithFreshSession(next);
        else setSuccess(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password!,
        });
        if (error) throw error;
        navigateWithFreshSession(next);
      }
    } catch {
      toast.error("Não foi possível concluir. Confira seus dados e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    try {
      await startDemoSession();
      navigateWithFreshSession(safeNext(getNavigationSearch().get("next")));
    } catch {
      toast.error("Não foi possível abrir a demonstração.");
      setBusy(false);
    }
  }
  async function google() {
    if (
      registerMode &&
      process.env.NEXT_PUBLIC_TERMS_URL &&
      process.env.NEXT_PUBLIC_PRIVACY_URL &&
      !acceptedTerms
    ) {
      toast.info("Leia e aceite os termos antes de criar sua conta com Google.");
      return;
    }
    if (!isSupabaseConfigured) {
      toast.info("Configure o Supabase e o provedor Google para usar esta opção.");
      return;
    }
    setBusy(true);
    const next = safeNext(getNavigationSearch().get("next"));
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) toast.error("Não foi possível conectar ao Google.");
    } catch {
      toast.error("Não foi possível conectar ao Google. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-layout">
      <div className="auth-image">
        <Image src={photos.hero} alt="Cinque Terre, Itália" fill priority sizes="50vw" />
        <Logo light />
        <div>
          <span className="eyebrow" style={{ color: "#c4e9d6" }}>
            MAIS MUNDO. MENOS PREOCUPAÇÃO.
          </span>
          <h2>Sua próxima grande história começa aqui.</h2>
          <p>Planeje, organize e viva sua viagem com inteligência.</p>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <Logo />
          <Link href="/" className="auth-back">
            <ArrowLeft size={14} /> Voltar para o início
          </Link>
          <h1>{title}</h1>
          <p>
            {registerMode
              ? "Crie sua conta gratuita e dê o primeiro passo."
              : reset
                ? "Enviaremos um link para redefinir sua senha."
                : "Seus planos e suas próximas aventuras estão aqui."}
          </p>
          {success ? (
            <div role="status" className="stack">
              <div className="notice">
                Confira seu e-mail para {reset ? "redefinir a senha" : "confirmar sua conta"}. Se
                não encontrar, verifique a caixa de spam.
              </div>
              <Link className="button button-secondary" href="/login">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit(submit)}>
                {registerMode && (
                  <Input
                    label="Seu nome"
                    placeholder="Como podemos chamar você?"
                    autoComplete="name"
                    {...register("name")}
                    error={errors.name?.message}
                  />
                )}
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  {...register("email")}
                  error={errors.email?.message}
                />
                {!reset && (
                  <Input
                    label="Senha"
                    type="password"
                    placeholder="Pelo menos 8 caracteres"
                    autoComplete={registerMode ? "new-password" : "current-password"}
                    {...register("password")}
                    error={errors.password?.message}
                  />
                )}
                {mode === "login" && (
                  <Link
                    className="text-link"
                    style={{ justifyContent: "flex-end", fontSize: 11 }}
                    href="/esqueci-senha"
                  >
                    Esqueci minha senha
                  </Link>
                )}
                {registerMode &&
                  process.env.NEXT_PUBLIC_TERMS_URL &&
                  process.env.NEXT_PUBLIC_PRIVACY_URL && (
                    <label className="check-field">
                      <input
                        type="checkbox"
                        required
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                      />
                      <span>
                        Li e aceito os{" "}
                        <a
                          href={process.env.NEXT_PUBLIC_TERMS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Termos de uso
                        </a>{" "}
                        e a{" "}
                        <a
                          href={process.env.NEXT_PUBLIC_PRIVACY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Política de privacidade
                        </a>
                        .
                      </span>
                    </label>
                  )}
                <Button loading={busy} type="submit">
                  {registerMode
                    ? "Criar minha conta"
                    : reset
                      ? "Enviar link de recuperação"
                      : "Entrar na minha conta"}
                  <ArrowRight size={16} />
                </Button>
              </form>
              {!reset && (
                <>
                  <div className="divider">ou continue com</div>
                  <Button variant="secondary" onClick={() => void google()} loading={busy}>
                    <span style={{ fontSize: 17, fontWeight: 700 }}>G</span> Google
                  </Button>
                  <div className="auth-switch">
                    {registerMode ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
                    <Link href={registerMode ? "/login" : "/cadastro"}>
                      {registerMode ? "Entrar" : "Criar conta grátis"}
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
          {demoEnabled && (
            <div className="auth-demo">
              <p>
                Quer conhecer primeiro? Explore viagens de exemplo. Os dados da demonstração ficam
                neste navegador.
              </p>
              <Button variant="secondary" loading={busy} onClick={() => void demo()}>
                <Compass size={17} /> Explorar demonstração
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
