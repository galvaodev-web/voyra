# Voyra Web MVP 1.0 - release candidate

## 1. Completamente funcional no código

Auth Supabase, persistência de viagem em JSONB com revisão, wizard, roteiro CRUD/reordenação, gastos e câmbio identificado, reservas manuais, documentos privados, mapa Mapbox, clima WeatherAPI, Voyra AI, tradução livre, Modo Viagem calculado, contato de emergência persistido, conclusão server-side, Tokens idempotentes, publicação sanitizada, contratos Social, exportação Travel, exclusão de conta, Free sem Stripe, health check e CI.

## 2. Dependente apenas de credenciais/configuração

Supabase hospedado/SMTP, Vercel/domínio, OpenAI, Mapbox, WeatherAPI, Voyra Social, Stripe, Skyscanner/Booking, Resend, Sentry e PostHog. Integrações ausentes ficam explicitamente indisponíveis.

## 3. Ainda demonstrativo

Somente o build separado do GitHub Pages. O catálogo editorial de descoberta é identificado como `ESTIMATED`; não há provider de preço live ativo por padrão.

## 4. Adiado para pós-MVP

Colaboração realtime, convites com acesso, rastreamento GPS, push/offline, venda direta, pagamentos a criadores, marketplace financeiro, vídeo social avançado, visão/câmera e app mobile.

## 5. Variáveis necessárias

Obrigatórias para o produto hospedado: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DEMO_ENABLED=false`, `NEXT_PUBLIC_BILLING_ENABLED=false`, `SITE_URL`, `NEXT_PUBLIC_SOCIAL_URL`, `CRON_SECRET`, `RATE_LIMIT_SECRET`, `OPENAI_API_KEY`, `MAPBOX_ACCESS_TOKEN`, `WEATHER_API_KEY`, `NEXT_PUBLIC_TERMS_URL`, `NEXT_PUBLIC_PRIVACY_URL` e `NEXT_PUBLIC_SUPPORT_EMAIL`.

Opcionais e condicionais: `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`, `STRIPE_*`, `SKYSCANNER_MEDIA_PARTNER_ID`, `NEXT_PUBLIC_BOOKING_AFFILIATE_URL`, `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `OPENAI_MODEL`, `SENTRY_DSN` e `POSTHOG_*`.

## 6. Migrations necessárias

Em projeto novo, executar as migrations em ordem:

1. `00000000000000_schema.sql`
2. `20260911_launch.sql`
3. `20260912_marketplace.sql`
4. `20260915_price_engine.sql`
5. `20260918_web_1_0.sql`
6. `20260921_mvp_closeout.sql`

Depois aplicar as migrations do Voyra Social em ordem. Em banco existente, aplicar apenas as pendentes após backup. `supabase/schema.sql` é uma referência consolidada e não deve ser executado separadamente pela CLI.

## 7. Testes executados

`npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:db`, `npm run test:billing`, `npm run build`, `npm test`, `npm run build:pages`, `npm run test:pages`, `npm audit --omit=dev`.

## 8. Resultados

Lint, tipos, 12 testes unitários/providers, DB/RLS, billing, build, 9 E2E Next e 2 E2E Pages passaram. Auditoria npm de dependências de produção: 0 vulnerabilidades conhecidas. `npm run check:launch` recusou corretamente o ambiente local por falta das credenciais, políticas, secrets e `NEXT_PUBLIC_DEMO_ENABLED=false`; o check remoto não foi executado sem credenciais.

## 9. Riscos conhecidos

Falta aceite com Supabase/SMTP/Storage reais; integração Social depende de outro repositório; providers externos podem falhar ou mudar contrato; JSONB exige gravação do agregado inteiro e rejeita conflitos sem merge; fotos de diário ampliam o agregado; exclusão entre Stripe/Storage/Auth é repetível, mas não transacional.

## 10. Colocar staging no ar

1. Criar projetos Supabase e Vercel exclusivos de staging e configurar HTTPS.
2. Aplicar schema/migrations Travel e Social; manter buckets privados.
3. Configurar variáveis com Stripe test e providers opcionais de teste; nunca reutilizar secrets de produção.
4. Configurar callbacks, SMTP, webhook e crons.
5. Executar `npm ci`, toda a matriz de testes, `npm run check:launch` e build.
6. Fazer deploy imutável e rodar o aceite de `docs/STAGING.md` com dois usuários.
7. Registrar SHAs, migrations, IDs de deploy, backup e evidências.

## 11. Promover staging para produção

1. Fechar todos os bloqueadores de `docs/MVP_STATUS.md` e `PRODUCTION_CHECKLIST.md`.
2. Fazer backup, aplicar migrations pendentes e executar `npm run check:launch -- --remote`.
3. Trocar apenas secrets/domínios para produção; ativar billing/providers somente quando homologados.
4. Implantar o mesmo SHA aprovado em staging.
5. Repetir smoke tests de Auth, RLS, Storage, viagem, conclusão/Token, exportação e exclusão.
6. Monitorar `/api/health`, webhooks, crons e jobs de exclusão; manter rollback do app e restauração documentados.
