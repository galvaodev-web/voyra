# Voyra Web MVP 1.0 - auditoria de status

Auditoria atualizada em 22/09/2026 sobre o App Router, componentes, bibliotecas, migrations, workflows e testes do repositório. O GitHub Pages é uma demonstração estática separada; os estados de produção abaixo se referem ao runtime Next.js com Supabase.

## Funcionando

| Prioridade | Área/arquivos                                                               | Estado, risco e ação                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1         | `components/auth/*`, `proxy.ts`, `app/auth/callback`                        | Cadastro, login, logout, confirmação, recuperação, redefinição, refresh SSR e proteção de `/app/*` implementados. Validar entrega de e-mail e redirects no staging. |
| P1         | `hooks/use-voyra.tsx`, `lib/repository.ts`                                  | Viagens e preferências persistem no Supabase; revisão otimista impede sobrescrita silenciosa. JSONB permanece a unidade atômica do MVP.                             |
| P1         | `components/trips/new-trip.tsx`                                             | Wizard valida origem, destino, datas, pessoas, orçamento e estilos, preserva etapas e impede clique duplicado durante envio.                                        |
| P1         | `components/trips/itinerary.tsx`                                            | CRUD, dia, horário, local, observações, movimento entre dias e reordenação persistente.                                                                             |
| P1         | `components/expenses/*`, `lib/exchange-rate.ts`                             | Planejado/realizado, categoria, moeda, totais, saldo, pagador e divisão. Câmbio registra `FRANKFURTER` ou `FALLBACK` com horário.                                   |
| P1         | `components/documents/*`                                                    | Reservas manuais cobrem voo, hotel, trem, ingresso, seguro, restaurante e outros, com empresa, data, hora, valor, notas e link HTTPS.                               |
| P0         | `app/api/documents`, `lib/server/file-validation.ts`, `lib/storage.ts`      | Upload autenticado valida dono da viagem, limite, MIME, extensão e assinatura binária. Bucket privado e URLs assinadas de 120 s.                                    |
| P0         | `supabase/schema.sql`, migrations, `scripts/check-schema.ts`                | RLS isola dois usuários em viagens, filhos, buscas, billing e Storage. Chave `service_role` fica em módulos server-only.                                            |
| P1         | `app/api/trips/[id]/complete`, `20260918_web_1_0.sql`                       | Conclusão validada no servidor e emissão idempotente de Journey, Country, City e Achievement Tokens.                                                                |
| P1         | `app/social/*`, `publish_trip`                                              | Contratos bearer-auth compartilham apenas projeções permitidas; importação Social é idempotente e não expõe o agregado privado.                                     |
| P1         | `app/api/account/export`, `lib/server/delete-account.ts`                    | Exportação autenticada cobre dados Travel; exclusão remove Stripe, buckets privados, Auth e dados em cascata com job repetível.                                     |
| P1         | `app/api/ai`, `app/api/translate`, `lib/server/openai.ts`                   | IA e tradução livre usam OpenAI no servidor, com autenticação, rate limit, contexto mínimo e `store: false`; frases essenciais seguem disponíveis offline.           |
| P1         | `app/api/maps`, `lib/server/mapbox.ts`                                      | Mapa valida dono da viagem, geocodifica locais via Mapbox Search Box e entrega Static Image sem expor o token ao cliente.                                           |
| P1         | `app/api/weather`, `lib/weather.ts`                                         | Clima consulta WeatherAPI no servidor, identifica fonte e horário e nunca substitui falha por previsão fictícia.                                                     |
| P1         | Modo Viagem e emergência                                                   | Próxima atividade, relógio e saldo diário são calculados; contato de emergência persiste no agregado da viagem.                                                     |
| P1         | `lib/billing/*`, `app/api/billing/*`                                        | Free opera com billing desligado. Checkout/portal/webhook usam Stripe server-side; webhook é a fonte de permissão e trata replay/ordem.                             |
| P1         | `app/api/health`, `lib/server/error-tracking.ts`, `lib/analytics/server.ts` | Health check, Sentry opcional, analytics consentido e logs estruturados sem payloads privados.                                                                      |
| P1         | `.github/workflows/ci.yml`                                                  | Instalação limpa, lint, tipos, unidade, DB/RLS, billing, build e Playwright no CI.                                                                                  |

## Funcionando parcialmente

| Prioridade | Área/arquivos                       | Problema, risco e ação                                                                                                                                                                           |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1 externo | Auth/Storage/Supabase               | O código e os testes PGlite estão prontos, mas cadastro, SMTP, refresh e upload precisam de aceite em Supabase hospedado com duas contas reais. Bloqueia a declaração de produção, não o código. |
| P1 externo | Voyra Social                        | Os contratos Travel estão implementados; o teste ponta a ponta depende do repositório Social, suas migrations e um Supabase compartilhado.                                                       |
| P1 externo | Stripe                              | Implementação e testes offline passam. Ativar billing exige produtos, webhook e homologação em modo test/live. Free não depende disso.                                                           |
| P2         | `components/trips/participants.tsx` | Participantes servem para planejamento e divisão, mas não recebem convite nem acesso. Manter a mensagem explícita; colaboração é pós-MVP.                                                        |
| P2         | fotos do diário em `trips.data`     | Fotos pequenas ficam em JSONB e ampliam o agregado. Aceitável no MVP; migrar para Storage antes de elevar limites.                                                                               |
| P2         | Price Engine                        | Timeout, retry, cache, circuit breaker e distinção LIVE/ESTIMATED existem, mas não há adapter live habilitado neste repositório.                                                                 |

## Dependente de configuração externa

| Prioridade  | Área                                   | Configuração necessária                                                                                                |
| ----------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| P1 externo  | Supabase                               | URL, anon key, service role no servidor, migrations até `20260921_mvp_closeout.sql`, bucket privado, SMTP e callbacks. |
| P1 externo  | Hospedagem                             | Vercel/Node 22 em HTTPS, `SITE_URL`, crons, domínios e secrets. GitHub Pages não hospeda o backend.                    |
| P1 externo  | Políticas                              | URLs revisadas de Termos e Privacidade e e-mail de suporte. Revisão humana obrigatória.                                |
| P1 externo  | OpenAI                                 | `OPENAI_API_KEY` e `OPENAI_MODEL`; validar limites, custo e política de dados da conta.                                |
| P1 externo  | WeatherAPI                             | `WEATHER_API_KEY`; validar limites, idioma e precisão no staging.                                                      |
| P1 externo  | Mapbox                                 | `MAPBOX_ACCESS_TOKEN`; habilitar Search Box/Static Images e validar atribuição, custo e rate limits.                   |
| P2 opcional | Stripe/Resend/Sentry/PostHog/parceiros | Configurar apenas os recursos que serão ativados e homologados.                                                        |

## Demonstrativo

| Prioridade | Área                     | Limite e ação                                                                                                                   |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| P3         | `preview/`, GitHub Pages | Demo estática com `localStorage`, sem contas, backend, cobrança ou documentos reais. Deve permanecer separada da produção.      |

## Quebrado

Nenhum defeito P0/P1 reproduzível permaneceu após a correção. Isso não substitui o aceite hospedado com credenciais reais.

## Não implementado / Post-MVP

P3: venda direta de passagens/hotéis, pagamento a criadores, marketplace financeiro, blockchain/NFT, chat complexo, visão/câmera, colaboração realtime, app mobile, offline completo, push e recomendação ampla.

## Bloqueadores de produção

1. P0 operacional: provisionar Supabase staging, aplicar migrations e executar o roteiro com duas contas, inclusive upload/abertura/exclusão e RLS.
2. P0 operacional: publicar Termos, Privacidade e suporte revisados; configurar HTTPS, backups e crons.
3. P1 operacional: validar SMTP, callback, recuperação e exclusão de conta hospedados.
4. P1 operacional: homologar OpenAI, Mapbox e WeatherAPI; homologar Stripe antes de ligar billing e validar Social antes de anunciar o ecossistema.

## Resultado da auditoria

Os itens P0/P1 implementáveis sem credenciais foram corrigidos. O código pode seguir para staging; ainda não deve ser declarado pronto para produção até concluir os bloqueadores operacionais acima.
