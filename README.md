# Desafio Full-stack - Crash Game 🎮

## Início Rápido

### Pré-requisitos

- [Bun](https://bun.sh) >= 1.x
- Docker e Docker Compose

### 1. Subir o projeto

```bash
git clone <repo-url>
cd fullstack-challenge
bun install
bun run docker:up
```

Aguarde todos os serviços ficarem `healthy` (cerca de 60s na primeira vez). Você pode acompanhar com:

```bash
docker compose ps
```

Quando todos os 7 serviços estiverem `healthy`, acesse **http://localhost:3000**.

### 2. Fazer login

| Campo    | Valor        |
| -------- | ------------ |
| Usuário  | `player`     |
| Senha    | `player123`  |

Clique em **Entrar** na tela de login — você será redirecionado ao Keycloak e de volta ao jogo automaticamente.

> A carteira é criada automaticamente no primeiro acesso. Saldo inicial: R$1.000,00.

### 3. Rodar os testes

> Os testes E2E de serviços e Playwright requerem `docker:up` rodando.

```bash
# Todos os testes de uma vez
bun test

# Individuais
bun run test:unit:games        # unit — game service
bun run test:unit:wallets      # unit — wallet service
bun run test:e2e:games         # e2e API — requer docker:up
bun run test:e2e:frontend      # Playwright — requer docker:up + http://localhost:3000
```

Para instalar o browser do Playwright na primeira vez:

```bash
cd frontend && npx playwright install chromium
```

---

## Decisões de Arquitetura e Trade-offs

### Round Engine — singleton in-process

O `RoundEngineService` roda dentro do próprio processo do Game Service, controlando os timers de cada fase (BETTING → RUNNING → CRASHED) via `setTimeout`.

**Por quê:** precisão de timing sub-segundo sem overhead de rede. Um broker externo (ex: delayed message) introduz latência e complexidade desnecessária para um único nó.

**Trade-off:** escala horizontal limitada a 1 instância do Game Service. Para múltiplas instâncias seria necessário coordenação distribuída (Redis para estado da rodada + pub/sub para WebSocket broadcast). Aceitável para o escopo do desafio.

---

### Saga coreografada via RabbitMQ (sem orquestrador)

O fluxo de aposta usa eventos assíncronos entre serviços:

```
Game                     Wallets
 |--wallet.debit.requested-->|
 |                           | (debita saldo)
 |                           |
 | (round inicia, bets → ACTIVE)
 |
 | (player saca)
 |--wallet.credit.requested-->|
                              | (credita payout)
```

**Por quê:** desacoplamento total entre serviços. Cada serviço reage a eventos sem conhecer o outro.

**Trade-off:** consistência eventual — há uma janela onde o débito ocorreu mas a aposta ainda está PENDING. Mitigado com **Outbox Pattern**: o evento `wallet.debit.requested` é gravado na mesma transação da aposta, garantindo at-least-once delivery mesmo com RabbitMQ offline.

---

### Outbox + Inbox (idempotência)

- **Outbox** (Game Service): eventos são persistidos no banco junto com a entidade de negócio, publicados por um poller assíncrono. Garante que nenhum evento se perde mesmo com falha do broker.
- **Inbox** (Wallet Service): cada mensagem tem `idempotencyKey` único. O handler verifica o inbox antes de processar — reprocessamentos são ignorados sem efeito colateral.

**Trade-off:** latência adicional de até 5s (intervalo do poller) entre a aposta e o débito efetivo. Aceitável porque o débito ocorre antes do início da rodada.

---

### Multiplicador computado no cliente

O servidor emite apenas `startTimestamp` e `growthRate` no evento `round:started`. O frontend calcula `M(t) = e^(t × 0.06)` localmente via `requestAnimationFrame`.

**Por quê:** elimina o custo de broadcast tick-by-tick para todos os clientes conectados. O servidor não precisa emitir 60 eventos/segundo.

**Trade-off:** pequeno drift entre clientes por diferença de clock local. Mitigado usando `Date.now()` relativo ao `startTimestamp` do servidor (não ao clock local do cliente).

---

### Auto cashout server-side

O multiplicador alvo (`autoCashoutAt`) é enviado com a aposta e armazenado no banco. No início de cada rodada RUNNING, o round engine agenda `setTimeout` para cada aposta com auto cashout.

**Por quê:** o saque automático precisa ser garantido pelo servidor — o cliente pode fechar a aba ou perder a conexão WebSocket.

**Trade-off:** a query `find(bets, { status: ACTIVE, autoCashoutAt: { $ne: null } })` no início de cada rodada cresce com o número de apostas. Em alta concorrência, índice em `(round_id, status, auto_cashout_at)` seria necessário.

---

### WebSocket servidor → cliente apenas

Todas as ações do jogador (apostar, sacar) são feitas via REST. O WebSocket é usado exclusivamente para push de eventos do servidor.

**Por quê:** REST facilita autenticação (JWT no header), idempotência e retry de cliente. Ações via WebSocket complicam o tratamento de erros e requerem protocolo de request/response customizado.

**Trade-off:** latência levemente maior por ação (TCP handshake adicional), irrelevante para o ritmo do jogo (ações humanas, não HFT).

---

### Kong DB-less

Kong configurado via `kong.yml` estático, sem banco de dados.

**Por quê:** zero dependência extra, configuração declarativa versionada em git, startup instantâneo.

**Trade-off:** hot reload de rotas requer restart do container (`docker compose restart kong`). Aceitável para desenvolvimento.

---

### Precisão monetária — centavos inteiros (BIGINT)

Todos os valores são armazenados e trafegados em centavos (`BIGINT`). Nenhuma operação usa ponto flutuante.

**Por quê:** `0.1 + 0.2 !== 0.3` em IEEE 754. Cassinos não toleram erros de arredondamento.

**Trade-off:** toda a UI precisa converter `/100` para exibição e `×100` para entrada. Erro de UX se o desenvolvedor esquecer a conversão.