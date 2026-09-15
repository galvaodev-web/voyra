# Voyra

**[Abrir a demonstração online](https://galvaodev-web.github.io/voyra/)** · [Entrar direto na demonstração](https://galvaodev-web.github.io/voyra/#/login)

A versão no GitHub Pages é navegável e salva suas alterações neste navegador. Use **Entrar → Explorar demonstração**. Ela não cria contas reais, não cobra assinaturas e não publica dados pessoais. O projeto Next.js completo está neste repositório para implantação com servidor.

**Sua próxima viagem em um só lugar.** Aplicação de planejamento de viagens em português, com demonstração local e fluxos de contas reais, assinatura e publicação de roteiros preparados para configuração.

Para o lançamento público, siga [docs/LAUNCH.md](docs/LAUNCH.md). O código inclui Checkout e portal Stripe, confirmação de assinatura por webhook, limite de viagens no banco, publicação pública com retirada, exclusão de conta e limpeza de anexos. Contas Free podem abrir com `NEXT_PUBLIC_BILLING_ENABLED=false`, Supabase, hospedagem HTTPS e políticas do operador. Stripe é necessário para ativar novas assinaturas com `NEXT_PUBLIC_BILLING_ENABLED=true`; a instalação local sem credenciais continua em demonstração.

## Executar

Para reproduzir a versão do GitHub Pages: `npm run build:pages`, `npm run preview:pages` e abra `http://127.0.0.1:4173/voyra/`. `npm run test:pages` valida essa versão. O workflow `Publish Voyra demo` testa e atualiza o site automaticamente a cada push em `main`. As rotas usam `#/` para permitir navegação e recarregamento no Pages.

Requisitos: Node.js 22 LTS e npm. Na pasta do projeto:

```bash
npm install
npm run dev
```

Abra [localhost:3000](http://localhost:3000). A página inicial é pública. Em **Entrar → Explorar demonstração**, você acessa o dashboard com viagens para Itália, Japão e Chile. Não é necessário preencher e-mail, senha ou credenciais para a demonstração.

Os dados de exemplo e alterações são salvos no `localStorage` deste navegador. A sessão de demonstração usa um cookie HTTP-only de 24 horas. Limpar os dados do site reinicia a demonstração. Isso não é uma conta real nem armazenamento seguro para documentos pessoais reais.

## Stack

- Next.js 16, App Router, React 19 e TypeScript estrito.
- Tailwind CSS 4 e CSS responsivo; Lucide para ícones.
- React Hook Form e Zod nos formulários principais; Sonner para notificações.
- Supabase Auth, PostgreSQL e Supabase Storage privado.
- Playwright para testes dos fluxos em navegador.

### Backend de busca e preços

`POST /api/travel/search` concentra validação, rate limit, ranking e persistência da busca por orçamento. O `VoyraPriceEngine` não depende de fornecedor específico: adapters implementam um contrato comum e o agregador aplica timeout, retry controlado, cache e circuit breaker por provider.

O catálogo interno produz somente valores `ESTIMATED`, com confiança e composição explícitas. Um resultado só pode ser `LIVE` quando providers reais entregam os componentes primários; apenas ofertas `LIVE` geram `price_snapshots`. Buscas autenticadas são persistidas atomicamente para suportar histórico e alertas futuros.

O `package-lock.json` fixa as versões instaladas. A integração Stripe usa chaves privadas apenas no servidor. Nenhum cartão é armazenado pela aplicação.

## O que funciona

- Landing page com pesquisa de viagem e sugestões por orçamento, duração e quantidade de pessoas.
- Exploração com busca por cidade/país, filtro de região, ordenação e favoritos persistentes.
- Login, cadastro, recuperação de senha e entrada Google quando Supabase estiver configurado.
- Dashboard; criação de viagem em seis etapas com validação; edição do nome, orçamento, progresso e status.
- Roteiro diário com adição, edição e exclusão de atividades.
- Gastos com categorias, gráfico, exclusão, totais e divisão entre participantes cadastrados.
- Voyra Pass: voos, hotéis, ingressos, trem, seguro, reservas e documentos pessoais; cadastro, anexos, abertura e remoção.
- Mapa ilustrativo selecionável com abertura da localização no Google Maps.
- Modo Viagem, ajuda contextual, chat Voyra AI simulado e clima demonstrativo.
- Tradutor de frases predefinidas, contatos de emergência e contato pessoal salvo no dispositivo.
- Diário com texto, foto, local e nota; preparação de roteiro para compartilhar, cópia de texto e exportação sem documentos ou gastos.
- Perfil, exportação de dados, planos e vitrine inicial de roteiros.
- Estados de carregamento, vazio, erro e sucesso; modais com foco nativo e navegação por teclado; menu inferior no celular.

## Conectar o Supabase

1. Crie um projeto no Supabase.
2. Execute **uma vez**, em um projeto novo, o arquivo `supabase/schema.sql` no SQL Editor. Depois aplique, em ordem, `20260911_launch.sql`, `20260912_marketplace.sql` e `20260915_price_engine.sql`. Em projetos existentes, aplique somente as migrations pendentes; não execute o schema inicial novamente.
3. Copie `.env.example` para `.env.local`.
4. Preencha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon
```

5. Em **Authentication → URL Configuration**, configure Site URL e Redirect URLs, incluindo:
   - `http://localhost:3000/auth/callback`
   - a URL equivalente do seu domínio de produção.
6. Para entrada com Google, ative o provedor em **Authentication → Providers**, configure suas credenciais OAuth no Supabase e no console do Google e defina `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` antes do build. Caso contrário, o acesso usa e-mail e senha.
7. Reinicie o servidor Next.js. Crie uma conta pela aplicação e confirme o e-mail se a confirmação estiver ativada.

Quando as duas variáveis Supabase estiverem preenchidas, **a entrada de demonstração é desativada** e a aplicação usa contas reais. Contas novas começam sem viagens; os dados fictícios não são inseridos no banco.

As variáveis `NEXT_PUBLIC_*` são a URL e a chave **pública** do projeto, próprias para o cliente Supabase. A autorização dos dados é feita por Auth e RLS. **Nunca coloque a chave `service_role`, segredos OAuth ou chaves privadas nessas variáveis.** As futuras chaves privadas devem permanecer apenas no servidor.

`NEXT_PUBLIC_DEMO_ENABLED=false` desliga a demonstração mesmo sem Supabase. Para um ambiente de produção, configure o Supabase e não disponibilize documentos reais no modo local.

### Persistência e modelo de dados

O schema contém `profiles`, `trips`, `trip_members`, `trip_days`, `activities`, `expenses`, `documents`, `bookings`, `trip_notes`, `favorites`, `ai_conversations` e `notifications`, com UUID, datas de criação/atualização, foreign keys e RLS.

Nesta versão, a UI persiste cada viagem como **um agregado JSONB atômico em `trips.data`**, acompanhado de nome, destino, datas e orçamento em colunas. As coleções de atividades, gastos, documentos, participantes e diário ficam nesse agregado. As tabelas filhas normalizadas estão preparadas para operações granulares e colaboração futura; a aplicação **não** mantém cópias nessas tabelas. O chat simulado fica em memória e não é gravado em `ai_conversations`.

Perfil e favoritos são persistidos em suas tabelas por uma função transacional com `security invoker`. Cada usuário acessa somente suas próprias viagens. O cadastro visual de participantes **não** concede acesso a outros usuários: convites e colaboração simultânea ainda não foram ativados. Viagens usam revisão incremental: uma gravação antiga é recusada e solicita recarregamento, preservando a edição mais recente. A aplicação não mescla conflitos automaticamente.

### Documentos e fotos

- Bucket `travel-documents` privado, com políticas por usuário e caminho `userId/tripId/arquivo`.
- Supabase: PDF, JPEG, PNG e WebP, até 3 MB; abertura por URL assinada com validade de 120 segundos.
- Demonstração: anexos até 800 KB em `localStorage`; abertura por download local.
- Fotos do diário até 600 KB, armazenadas no agregado da viagem nesta versão.
- Remover um cartão ou viagem agenda seus arquivos em `storage_cleanup`. Configure a tarefa periódica descrita em `docs/LAUNCH.md` para apagá-los do Storage. Se o salvamento após upload falhar, o cliente tenta remover o arquivo; uploads interrompidos por fechamento do navegador ainda podem exigir limpeza administrativa. Excluir a conta remove os arquivos antes de excluir o usuário.
- QR Codes visuais são fictícios. Use sempre o arquivo original para embarque ou ingresso.
- As fotos de destinos vêm de Unsplash via `next/image` e precisam de rede no primeiro carregamento.

## Rotas

Públicas: `/`, `/explorar`, `/planejar`, `/roteiros`, `/roteiros/[id]`, `/precos`, `/login`, `/cadastro`, `/esqueci-senha`, `/auth/callback`. Roteiros públicos requerem publicação explícita e assinatura Creator vigente; páginas retiradas exibem a tela de conteúdo não encontrado com `noindex`. O Next.js pode enviar HTTP 200 em respostas transmitidas antes dessa resolução.

Protegidas por `proxy.ts`:

```text
/app → /app/dashboard
/app/dashboard
/app/viagens
/app/viagens/nova
/app/viagens/[id]
/app/viagens/[id]/roteiro
/app/viagens/[id]/mapa
/app/viagens/[id]/gastos
/app/viagens/[id]/reservas
/app/viagens/[id]/documentos
/app/viagens/[id]/participantes
/app/viagens/[id]/modo-viagem
/app/viagens/[id]/tradutor
/app/viagens/[id]/emergencia
/app/viagens/[id]/diario
/app/viagens/[id]/publicar
/app/viagens/[id]/configuracoes
/app/explorar
/app/favoritos
/app/roteiros
/app/documentos
/app/perfil
/app/configuracoes
/app/redefinir-senha
```

Sem sessão, `/app/*` redireciona para login preservando o destino. Com Supabase, a sessão é verificada no servidor e cookies expirados são renovados pelo Proxy. O callback de recuperação leva à página protegida de redefinição de senha.

## Estrutura

```text
app/                    App Router, layouts, páginas, callback e API de demonstração
components/ui/          Button, Input, Select, Modal, Card, Badge, Avatar, Tabs e estados
components/layout/      Navbar, footer, sidebar e navegação móvel
components/marketing/   Landing, explorar, planos e roteiros
components/auth/        Formulário de autenticação
components/trips/       Wizard, viagem, atividades, participantes, diário e ferramentas
components/ai/          Chat demonstrativo
components/maps/        Mapa ilustrativo
components/documents/   Voyra Pass e upload
components/expenses/    Gastos e gráfico
hooks/                  Estado da aplicação e persistência
lib/supabase/           Clientes SSR e browser
lib/repository.ts       Acesso aos dados remotos
lib/storage.ts          Upload e URLs assinadas
lib/ai.ts               Interface do provedor de IA e implementação mock
lib/maps.ts             Locais e interface para provedor de mapas
lib/integrations.ts     Contratos e status das integrações futuras
data/mock-data.ts       Viagens, destinos, roteiros e dados demonstrativos
types/                  Modelos TypeScript
utils/                  Formatação e conversão demonstrativa
styles/                 Estilos separados por área e tamanho de tela
supabase/schema.sql     PostgreSQL, RLS e Storage
scripts/                Validação do schema e das políticas de acesso
tests/                  Testes de navegação e fluxos com Playwright
```

## Integrações futuras e limites explícitos

- **Booking.com:** links externos no resumo da viagem e em reservas, com cadastro manual da hospedagem. Configure `NEXT_PUBLIC_BOOKING_AFFILIATE_URL` com o link aprovado pela Booking.com/CJ e refaça o build para ativar o link de afiliado e seu aviso. Sem configuração, abre a Booking.com sem comissão. Não importa reservas nem consulta preços; veja [a configuração de lançamento](docs/LAUNCH.md).

- **OpenAI:** substituir `travelAI.reply()` em `lib/ai.ts` por chamada a uma rota de servidor. Nenhuma chamada OpenAI ocorre hoje.
- **Mapbox:** substituir o mapa ilustrativo pelo SDK e coordenadas reais; os marcadores atuais não representam distâncias reais.
- **Clima:** conectar o contrato `WeatherProvider`. O componente usa valores de demonstração, sem previsão real.
- **Voos e reservas:** o cadastro é manual. Não há busca ao vivo, emissão, compra ou confirmação de reservas.
- **Stripe:** Checkout de assinatura mensal Plus/Creator, portal com cancelamento, webhooks assinados e permissões no banco implementados. Requer configuração e homologação no Stripe. Free permite duas viagens; planos pagos permitem viagens ilimitadas. Recursos simulados não são vendidos como benefícios pagos.
- **Comunidade:** com Supabase, “Publicar roteiro” gera uma página pública e inclui o roteiro na busca. Só campos selecionados são copiados; documentos, despesas, participantes, diário e datas de calendário não são publicados. O autor pode atualizar ou retirar a publicação. Sem Supabase, permanece a prévia local. Não há compra e venda de roteiros, repasse a criadores ou marketplace financeiro.
- **Tradutor:** dicionário pequeno de frases; voz e câmera são prévias sem captura real.
- **Modo Viagem:** hora, clima, distância e sugestão diária do exemplo Itália são simulados. Não há localização, notificações push ou modo offline real.
- **Câmbio:** apenas estimativas fixas: EUR 1 = BRL 6; USD 1 = BRL 5,20.
- **Emergência:** 112 somente na viagem da Itália; outros países orientam consulta local. Busca de hospitais abre serviço externo e não afirma proximidade em tempo real.

## Build, qualidade e testes

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run test:billing
npm run build
npm run start
```

`npm run check:launch` valida a configuração para abertura pública e falha se faltarem itens. `npm run check:launch -- --remote` também consulta tabelas, preços, portal e webhook sem criar dados ou cobranças. `npm run build:launch` aplica essa verificação antes do build.

Para testar a demonstração em navegador, deixe as variáveis Supabase vazias:

```bash
npx playwright install chromium
npm run build
npm test
```

O Playwright inicia uma instância exclusiva da versão de produção na porta 3107 (ou `PLAYWRIGHT_PORT`), sem reutilizar servidores de outros projetos. Os testes cobrem entrada de demonstração e proteção de rota, busca e favoritos, validação do wizard, persistência e CRUD de atividades, gastos, documentos, participantes, chat e páginas móveis. As capturas são geradas em `test-results/`.

Para padronizar a formatação, use `npm run format`. Os arquivos `AGENTS.md` e `CLAUDE.md` são instruções locais geradas pelo próprio Next.js 16 ao iniciar o servidor de desenvolvimento.

As integrações de autenticação e Storage exigem seu próprio projeto Supabase para validação ponta a ponta. Após configurar, valide duas contas distintas, recuperação de senha, Google OAuth e envio/abertura de documentos. Não há credenciais privadas incluídas neste repositório.

`npm run test:db` executa o schema em PostgreSQL embarcado (PGlite), com adaptadores locais mínimos para `auth` e `storage`, e verifica triggers, preferências, restrições e RLS com duas contas. Esse teste valida o SQL e as políticas; não substitui a verificação dos serviços hospedados, entrega de e-mails e OAuth no seu projeto Supabase.

## Referências

- [Next.js App Router](https://nextjs.org/docs)
- [Supabase SSR e cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Número europeu de emergência — União Europeia](https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/index_en.htm)
