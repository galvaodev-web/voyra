# Voyra ecosystem staging

## Provisionamento

1. Crie um Supabase exclusivo de staging e projetos Vercel separados para Travel e Social em HTTPS.
2. Execute as migrations Travel em ordem, começando por `00000000000000_schema.sql` e terminando em `20260921_mvp_closeout.sql`; depois aplique todas as migrations Social em ordem. `supabase/schema.sql` é apenas uma referência consolidada.
3. Mantenha `travel-documents`, `social-images`, `social-videos` e `avatars` privados. Configure `CRON_SECRET` e os três crons de `vercel.json`.
4. Configure as mesmas URL/anon key Supabase nos dois produtos. Use `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.voyra.com` somente se ambos os hosts forem subdomínios controlados; deixe vazio em hosts `vercel.app` distintos.
5. Aponte `VOYRA_TRAVEL_API_URL` do Social para a origem Travel. Use Stripe test e contas sintéticas. Configure OpenAI, Mapbox e WeatherAPI com credenciais de staging antes do aceite funcional.

## Gate automatizado

Execute em checkout limpo:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run test:billing
npm run build
npm test
npm run check:launch
```

Depois do deploy, execute `npm run check:launch -- --remote`. Em staging com Stripe test, use o build normal, pois o gate de lançamento público exige chaves live quando billing está ligado.

## Aceite manual obrigatório

1. Com usuários A e B, teste cadastro, confirmação, login, refresh, logout, recuperação e redefinição.
2. A cria uma viagem, atividade, gasto, reserva e documento. B não pode ler, editar, assinar URL nem excluir nenhum item de A.
3. Valide upload, abertura, expiração da URL assinada, remoção e cron de limpeza com PDF/JPEG/PNG/WebP válidos e arquivos disfarçados inválidos.
4. Conclua uma viagem elegível e confirme Tokens idempotentes, Passport/Recap e página pública sem dados privados.
5. Publique, atualize, importe com B e retire um roteiro; inspecione a resposta para excluir documentos, gastos, participantes, diário e datas exatas.
6. Exporte a conta e confirme viagens, Tokens, publicações, buscas, alertas e assinatura. Exclua uma conta descartável e verifique Auth, banco e todos os buckets.
7. Teste OpenAI, tradução, Mapbox e WeatherAPI com credenciais de staging. Se habilitados, teste também Stripe, e-mail de alertas e parceiros. Confirme estados indisponíveis quando cada chave é removida.
8. Execute também a lista completa de `voyra-social/docs/STAGING.md`, incluindo sessão compartilhada, moderação e exclusão do ecossistema.

## Promoção e rollback

Registre os dois SHAs, migrations, IDs de deploy, endpoint Stripe, evidências do aceite e horário do backup. Promova o mesmo SHA aprovado. Reverta código redeployando o build imutável anterior; corrija banco com migration aditiva. Restaure backup primeiro em projeto isolado quando a recuperação for inevitável.
