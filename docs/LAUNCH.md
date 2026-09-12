# Preparar o lançamento do Voyra

O código está preparado para configurar contas, assinaturas e publicação. Sem os serviços abaixo, a aplicação continua uma demonstração. Um build aprovado não comprova entrega de e-mails, cobrança, OAuth, políticas jurídicas ou funcionamento dos serviços hospedados.

## 1. Supabase e contas

1. Em um projeto novo, execute `supabase/schema.sql` e depois `supabase/migrations/20260911_launch.sql`. Em projeto existente com o schema original, execute somente a migração. Faça backup antes de migrar dados existentes.
2. Configure URL e chave pública, e `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no servidor. Use `.env.example` como referência; nunca publique `.env.local`.
3. Ative confirmação de e-mail e configure SMTP do seu domínio. Configure limites de autenticação e proteção contra cadastro abusivo no provedor conforme sua operação.
4. Configure Site URL e redirects exatos para `https://SEU-DOMINIO/auth/callback`. Cadastros e recuperação usam PKCE; teste abrindo o link no mesmo navegador que iniciou o fluxo. Se oferecer Google, configure seu OAuth e o redirect correspondente no Supabase.
5. Contas novas começam vazias. Free permite duas viagens. O limite é aplicado no PostgreSQL com serialização por usuário, incluindo chamadas diretas ao banco. Após downgrade, viagens existentes continuam acessíveis; novas viagens ficam bloqueadas acima do limite.

## 2. Stripe: primeiro homologar, depois ativar

- Crie produtos Plus e Creator com preços recorrentes mensais em BRL, respectivamente **2490** e **4990 centavos**. A API rejeita configuração divergente dos preços exibidos. Para mudar valores, altere `lib/billing/plans.ts`, a validação em checkout e `scripts/check-launch.ts` juntos.
- Defina `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_CREATOR` e `STRIPE_WEBHOOK_SECRET`. Use credenciais e preços de teste na homologação; use valores live somente no ambiente público. Não misture IDs de ambientes.
- Configure o portal padrão de clientes com atualização de pagamento, consulta de faturas e cancelamento ao final do período. Mudança de plano é opcional: se habilitada, permita apenas Plus e Creator e revise o comportamento de proporcionalidade.
- Endpoint: `https://SEU-DOMINIO/api/billing/webhook`. Assine eventos:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- O webhook verifica a assinatura sobre o corpo original e consulta a assinatura atual no Stripe. Gravação do evento e atualização de permissões são uma transação. Eventos repetidos são ignorados e sincronizações antigas não sobrescrevem novas. A URL de sucesso nunca concede acesso sozinha.
- Checkout reutiliza sessões abertas e uma tentativa persistida no banco, evitando cobranças duplicadas por clique ou retry. Uma assinatura existente leva ao portal. O retorno consulta a confirmação por até 30 segundos e permite atualização manual.
- Assinaturas `active` ou `trialing` só concedem acesso até o fim do período registrado. `past_due`, `unpaid`, cancelamento e expiração não concedem acesso pago. Revise essa política comercial antes de divulgar os planos.
- Excluir a conta apaga o cliente Stripe e cancela assinaturas imediatamente. Não emite reembolso automático. Trate solicitações financeiras pelo suporte e painel Stripe.

Referências da implementação: [Checkout](https://docs.stripe.com/api/checkout/sessions/create), [webhooks](https://docs.stripe.com/webhooks), [portal](https://docs.stripe.com/customer-management/integrate-customer-portal), [exclusão de cliente](https://docs.stripe.com/api/customers/delete).

## 3. Publicação de roteiros

Creator ativo pode publicar uma fotografia do roteiro através de `publish_trip`. A função confirma autenticação e propriedade da viagem, valida o plano e copia somente nome de perfil, título, destino, duração, dicas e campos de atividade selecionados. Textos são renderizados pelo React, sem HTML fornecido pelo autor.

Não são publicados documentos, imagens privadas, referências de reserva, despesas, participantes, diário ou datas exatas. Nomes e locais das atividades podem conter informações pessoais digitadas pelo usuário: o formulário exige revisão antes da publicação. A vitrine real substitui avaliações, preços e criadores fictícios usados apenas na demonstração.

Alterações privadas não modificam automaticamente o roteiro público. Atualizar publicação mantém o mesmo link. Retirada bloqueia imediatamente leitura anônima; exclusão da viagem também exclui a publicação. Fim da assinatura oculta os roteiros; a reativação de Creator volta a disponibilizar os que não foram retirados. Cópias feitas por terceiros não podem ser revogadas.

Defina suporte, rotina de análise de denúncias e remoção de conteúdo no painel administrativo do Supabase. Nesta entrega não há console próprio de moderação, remuneração de criadores ou venda de roteiros.

## 4. Arquivos e exclusão

`travel-documents` permanece privado, com caminhos por usuário/viagem. Remover cartões ou viagens cria uma fila `storage_cleanup`, restrita ao servidor. `GET /api/internal/storage-cleanup` apaga até 100 arquivos e confirma a fila apenas após sucesso no Storage. Exige `Authorization: Bearer CRON_SECRET` com segredo aleatório de pelo menos 32 caracteres.

`vercel.json` agenda execução diária às 03:00 UTC. Na Vercel, configure `CRON_SECRET`; em outra hospedagem, configure um agendador que envie esse header. Para volumes maiores, aumente frequência conforme o plano da hospedagem. Monitore falhas e tamanho da fila. URLs assinadas já emitidas valem até 120 segundos; o objeto só deixa de existir após limpeza.

Excluir a conta exige sessão e confirmação digitada, encerra a assinatura, remove arquivos via Storage e apaga o usuário com cascata dos dados. Falhas parciais são repetíveis, mas não há transação distribuída entre Stripe e Supabase. Não prometa reversão de uma exclusão. Arquivos órfãos de uploads interrompidos antes do salvamento podem exigir limpeza administrativa; eles também são removidos na exclusão da conta.

## 5. Domínio, políticas e deploy

- Defina `SITE_URL` como a origem HTTPS canônica e `NEXT_PUBLIC_DEMO_ENABLED=false` no build e em execução.
- Publique os termos e a política de privacidade do operador e preencha `NEXT_PUBLIC_TERMS_URL`, `NEXT_PUBLIC_PRIVACY_URL` e `NEXT_PUBLIC_SUPPORT_EMAIL`. Os links aparecem no rodapé e no cadastro. Defina identificação do responsável, atendimento, condições comerciais, reembolsos e tratamento de dados nesses documentos. Este repositório não inventa essas informações.
- Hospede em Node.js 22 ou Vercel. Configure todas as variáveis antes do build; `NEXT_PUBLIC_*` é incorporado ao bundle. `SITE_URL` precisa corresponder à origem usada pelo navegador, inclusive para o checkout e exclusão de conta.
- Na configuração do projeto Vercel, use `npm run build:launch` como comando de build público. A CI valida a demonstração separadamente, sem segredos.

```bash
npm ci
npm run lint
npm run typecheck
npm run test:db
npm run test:billing
npm run build
npm test
npm run check:launch
npm run check:launch -- --remote
npm run build:launch
npm run start
```

A verificação local de lançamento exige live e HTTPS. Para homologação com chaves de teste, use `npm run build` e siga os testes abaixo. Não existe deploy automático para produção neste repositório. Configure backups, retenção e acompanhamento de erros na hospedagem/Supabase/Stripe.

## 6. Aceite no ambiente hospedado

1. Com duas contas, confirme cadastro, e-mail, login/logout, recuperação e Google quando habilitado. Verifique que documentos e viagens de A não podem ser consultados por B nem anonimamente.
2. No Stripe de teste, assine Plus e Creator, teste dois cliques/abas, cancelamento do checkout, pagamento recusado, renovação, atraso, downgrade e cancelamento. Reenvie um webhook e um evento antigo. Confirme que alterar a URL de retorno não concede plano.
3. Publique um roteiro Creator, abra o link em janela anônima, busque na comunidade, atualize e retire a publicação. Inspecione a resposta pública para confirmar ausência de campos privados. Teste o link após expiração.
4. Envie um documento, abra, remova e execute a limpeza. Verifique fila e bucket. Teste exclusão da conta com e sem assinatura, inclusive repetindo após uma falha induzida em homologação.
5. Confirme preços finais, portal, suporte, políticas e domínio. Faça a verificação remota com as credenciais live e só então abra ao público.

## Escopo que continua demonstrativo

Voyra AI, previsão de clima, mapa ilustrativo, câmbio fixo e tradutor de frases não se tornam integrações ao preencher as chaves opcionais. Não há reserva de voos/hotéis, colaboração entre contas, push, offline real ou marketplace financeiro. Esses recursos continuam identificados na interface e não compõem a promessa dos planos pagos. Integrações adicionais exigem outro ciclo de implementação e homologação.
