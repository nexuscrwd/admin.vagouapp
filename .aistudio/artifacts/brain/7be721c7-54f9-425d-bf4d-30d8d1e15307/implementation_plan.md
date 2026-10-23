# Radar Bidirecional de Deslocamento Ao Vivo ("Estou a Caminho"), Traçador de Rota Nativo (Google Maps API) & Implantação na Tríade (`mnvapp` ⇄ `admvapp` ⇄ `pvapp`)

Sistema preditivo de deslocamento (`ETA + 10 min`), **traçador de rotas nativo via Google Maps Routes API**, confirmação inteligente de comparecimento e rastreamento bidirecional (**Cliente ➔ Salão** e **Profissional Delivery ➔ Cliente**) com atualização a cada **10 segundos**, operando em **2 modos de visualização** (**Mapa Ao Vivo** e **Linha de Rastreamento de Ruas estilo Correios/Shopee**) e **Radar de Adversidades de Trânsito (`+X min`)**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Esta revisão responde diretamente **onde a solução deve ser implantada na Tríade** e **como ela funcionará dentro do aplicativo principal `mnvapp` (Visão Cliente e Visão Salão/Meu Negócio)**, além da governança no `admvapp` e suporte no `pvapp`.

- **Decisão Confirmada 1 — Onde Implantar na Tríade (Arquitetura Centralizada no Supabase + Operação Nativa no `mnvapp`)**:
  1. **`mnvapp` (VagouApp Oficial — App Principal do Cliente e do Salão/Profissional)**: É o **palco principal de uso diário (90% da operação)**. Como o `mnvapp` reúne tanto o módulo do **Cliente** quanto o módulo **Meu Negócio (Salão/Profissional)**, toda a experiência interativa de partida, traçado de rota no Google Maps, transmissão de GPS a cada 10s e acompanhamento na Agenda do Salão vive diretamente nele.
  2. **`admvapp` (Admin VagouApp — Este Projeto)**: É a **Torre de Controle, Fonte do Schema Supabase e Homologador Oficial**. Aqui implantamos a evolução da tabela `public.appointments`, o painel global de monitoramento em tempo real (`AdminAppointmentsMonitor`), o **Simulador Interativo Homologado do `mnvapp`** (para você testar na tela do Admin exatamente como o Cliente e o Salão usam no `mnvapp`) e o **Pacote de Código Pronto (`bol-020`)** para plugar no repositório `mnvapp`.
  3. **`pvapp` (Portal Web / PWA Consumidor)**: Recebe o espelhamento leve para clientes que agendam pelo navegador web (permitindo confirmar presença, cancelar/remanejar ou acompanhar a Linha estilo Shopee/Correios de um profissional Delivery).

- **Decisão Confirmada 2 — Como Será Implantado Dentro do `mnvapp` (Visão Cliente vs. Visão Salão)**:
  - **Lado A — Na Visão do Cliente no `mnvapp` (Aba *"Meus Agendamentos"* & Card de Próximo Horário)**:
    1. **Pré-Partida (`ETA + 10 min`)**: 10 minutos antes do horário ideal de saída, abre o modal automático no celular do cliente: *"Faltam X min. Você já está de partida?"* (`Sim` / `Não`).
    2. **Se `NÃO`**: Pergunta se vai **Comparecer** (dispara alerta de pressa com o tempo da rota) ou **Não vai comparecer** (abre botão **Cancelar** com campo obrigatório de motivo ou **Remanejar** abrindo direto a grade de horários livres do salão).
    3. **Se `SIM`**: Abre o **Traçador de Rota Google Maps In-App** (mostrando Rota 1 Recomendada vs. Rota 2 Alternativa com todas as ruas do caminho) e pergunta se deseja **Compartilhar o Trajeto Ao Vivo**.
    4. **Transmissão a cada 10s + Botão de Adversidade**: Um hook nativo (`useLiveRouteTracker`) lê o GPS do celular a cada `10 segundos`, atualiza a rua atual na rota traçada e oferece botões de 1 toque (*"Trânsito inesperado +X min"*, *"Obra na via"*, *"Procurando vaga"*) caso o trânsito pare.
    5. **Quando for Delivery (`home_delivery`)**: Na mesma aba *"Meus Agendamentos"*, o papel se inverte e o cliente vê o botão **"Acompanhar Chegada do Profissional"** (com o Mapa 10s e a Linha do Tempo estilo Shopee/Correios).
  - **Lado B — Na Visão do Salão / Profissional no `mnvapp` (Aba *"Agenda do Dia"* no Meu Negócio)**:
    1. **Selo de Status Ao Vivo no Card do Agendamento**: Sem precisar abrir outra tela, cada horário da agenda do salão mostra uma pílula dinâmica:
       - `🟢 A caminho • Av. Rebouças (ETA 12 min)`
       - `⚠️ Trânsito na rota (+6 min) • Novo ETA 14:41`
       - `🔔 Chegando em 5 min — Prepare a cadeira!`
       - `🚶 A caminho (sem mapa compartilhado)`
       - `🔄 Remanejado pelo cliente` ou `❌ Cancelado (Motivo exibido no card)`
    2. **Gaveta de Rastreamento em 1 Toque (Mapa 10s ⇄ Linha Shopee/Correios)**: Ao tocar no card do agendamento na agenda do salão, abre um *Bottom Sheet* / Modal com o alternador no topo:
       - **Aba 1 (Linha de Trajeto Shopee/Correios)**: Lista todas as ruas da rota traçada pelo cliente, marcando com `✔` as ruas por onde já passou, `●` a rua exata onde está agora, `⚠️` eventual retenção com os minutos acrescidos e `○` as próximas ruas até o salão.
       - **Aba 2 (Mapa Ao Vivo 10s)**: Mostra o mapa Dark com a rota verde, o pino do cliente se movendo a cada 10s e o pino do salão.
    3. **Quando o Profissional atende Delivery (`home_delivery`)**: No card da agenda do profissional aparece o botão **"Iniciar Deslocamento até o Cliente (Traçar Rota)"**, ativando o transmissor de 10s para que o cliente acompanhe de casa.

- **Decisão Confirmada 3 — Traçador de Rota In-App (Google Maps API) + Alerta de Chegada (`ETA <= 5 min`)**:
  - Ao traçar a rota na partida via Google Maps Routes API, o app extrai a polilinha e o vetor `steps[]` (todas as ruas da rota), garantindo precisão de rua atual a cada 10s, alerta automático aos **5 minutos restantes** e desligamento automático do GPS no check-in (privacidade LGPD).

---

### 1. Mapa Arquitetural de Implantação na Tríade VagouApp

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                     BANCO DE DADOS UNIFICADO SUPABASE (REALTIME 10s)                     │
│        Tabela `public.appointments` + Canal Realtime `appointment_live_tracking`         │
└──────────────▲─────────────────────────────────────▲─────────────────────────────────────┘
               │                                     │
               │ (90% da Operação Diária Ao Vivo)    │ (Governança, Monitor Global & Sync)
               ▼                                     ▼
┌─────────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│  1. APP PRINCIPAL: `mnvapp`             │   │  2. GOVERNANÇA MASTER: `admvapp` (Aqui)    │
│  (Cliente + Meu Negócio / Salão)        │   │  (Torre de Controle & Homologação)         │
├─────────────────────────────────────────┤   ├────────────────────────────────────────────┤
│ 📱 MÓDULO CLIENTE ("Meus Agendamentos"):│   │ 🖥️ CENTRAL `AdminAppointmentsMonitor`:     │
│ • Modal Inteligente (ETA + 10m preparo) │   │ • Monitora todos os trajetos da rede 10s   │
│ • Fluxo Sim/Não (Comparecer, Cancelar   │   │ • Alterna Mapa Ao Vivo ⇄ Linha Shopee      │
│   c/ motivo ou Remanejar na agenda)     │   │ • Simulador Interativo Homologado do       │
│ • Traçador de Rota Google Maps In-App   │   │   `mnvapp` (Testa Visão Cliente + Salão)   │
│ • Transmissor GPS 10s + Adversidades    │   │ • Auditoria de Atrasos e Cancelamentos     │
│ • Visão Inversa: Acompanha Delivery     │   │ • Emite Script SQL + Código Pronto (`bol-20`)│
│                                         │   └─────────────────────▲──────────────────────┘
│ 💈 MÓDULO MEU NEGÓCIO ("Agenda Salão"): │                         │
│ • Badge Ao Vivo no Card da Agenda       │   ┌─────────────────────┴──────────────────────┐
│ • Gaveta: Mapa 10s ⇄ Linha Shopee/Ruas  │   │  3. PORTAL WEB / PWA: `pvapp`              │
│ • Alerta Visual/Sonoro: "Chega em 5m!"  │   │  • Permite ao cliente web confirmar saída, │
│ • Modo Delivery: Profissional traça rota│   │    remanejar ou ver chegada de Delivery    │
└─────────────────────────────────────────┘   └────────────────────────────────────────────┘
```

---

### 2. User Experience & Visual Design (No `mnvapp` e no Monitor `admvapp`)

- **Como o Dono do Salão / Profissional vê na Agenda do `mnvapp` (e o Admin no `admvapp`)**:

```
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│ 💈 AGENDA DO SALÃO (`mnvapp` - Meu Negócio)  │ │ 📦 GAVETA: LINHA DE RUAS (ESTILO SHOPEE)     │
├──────────────────────────────────────────────┤ ├──────────────────────────────────────────────┤
│ 15:00 • Corte Degradê & Barba                │ │ [📦 Linha de Ruas]  [🗺️ Mapa Ao Vivo (10s)]  │
│ Cliente: Carlos Mendes • 🚗 Carro (4,2 km)   │ │ Rota Traçada: Via Av. Rebouças • Ciclo: 10s  │
│ ┌──────────────────────────────────────────┐ │ ├──────────────────────────────────────────────┤
│ │ 🟢 EM TRÂNSITO • Agora: Av. Rebouças     │ │ │  ✔ 14:15 • Partida: Rua dos Pinheiros, 410   │
│ │ ⚠️ +6 min (Trânsito lento na via)        │ │ │  │  (Rota traçada pelo cliente no Google)    │
│ │ ⏱️ Chegada estimada (ETA): 12 min        │ │ │  ✔ 14:22 • Passou por Av. Henrique Schaumann │
│ └──────────────────────────────────────────┘ │ │  │                                           │
│ ┌────────────────────┐ ┌───────────────────┐ │ │  ● 14:29 • AGORA: Av. Rebouças, alt. nº 1900 │
│ │ 📦 Ver Linha Ruas  │ │ 🗺️ Ver Mapa 10s   │ │ │  │  ⚠️ Retenção na via (+6 min acrescidos)   │
│ └────────────────────┘ └───────────────────┘ │ │  │     "Sem precisar ligar: novo ETA 14:41"  │
├──────────────────────────────────────────────┤ │  ○ Próxima rua: Rua Oscar Freire (1,1 km)    │
│ 🔔 Quando ETA = 5 min: Dispara banner verde  │ │  │                                           │
│    "Cliente a 5 min! Prepare a cadeira!"     │ │  🏁 Chegada: Studio Prime (faltam 12 min)    │
└──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
```

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Atmosfera Dark Mode Executiva (`slate-950` / `#0F172A` e superfícies `slate-900` / `#1E293B`), layout plano sem caixas aninhadas (*Zero Box-inside-Box*) e síntese mobile com ícones exclusivos da biblioteca `lucide-react`.
  - *Color Palette & Mood*:
    - Destaques primários, rota principal traçada e botões de confirmação em **Verde Vagou (`#20C933` / `bg-emerald-500`)** respeitando a regra inegociável: **qualquer fundo verde sólido possui texto e ícones obrigatoriamente brancos (`text-white`)**.
    - Marcadores de Adversidade/Retenção (`+X min`) em Âmbar (`text-amber-400`) e Cancelamentos em Rubi (`text-rose-400`).
  - *Typography & Hierarchy*: Números de distância (`km`), cronômetro de atualização (`10s`), acréscimo de atraso (`+X min`) e contagem regressiva (`ETA`) com alinhamento numérico tabular (`tabular-nums` / `font-mono`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Implantação Dupla Sincronizada (`admvapp` Agora + Pacote Plug-and-Play para `mnvapp`)**
  - *Chosen Approach*: Construímos imediatamente no `admvapp` toda a infraestrutura de banco de dados (`supabase_schema.sql` e `supabase_safe_migration.sql`), a Central de Monitoramento Ao Vivo (`AdminAppointmentsMonitor.tsx`) com o **Simulador Fiel do `mnvapp` (Visão Cliente + Visão Salão)** e geramos no Boletim Técnico `bol-020` os componentes prontos para o repositório `mnvapp`.
  - *Why*: Assim você já valida e interage com 100% da solução funcionando aqui no painel agora mesmo, e o banco de dados Supabase já fica pronto para o `mnvapp` consumir as mesmas colunas e eventos de 10 segundos sem retrabalho.

- **Decisão 2: Traçado de Rota In-App via Google Maps Routes API (`computeRoutes` / `DirectionsService`)**
  - *Chosen Approach*: Ao confirmar a partida no `mnvapp`, o usuário/profissional seleciona a rota sugerida pelo Google Maps dentro do próprio app. O sistema salva a `route_polyline` e converte os `steps[]` da rota em `route_checkpoints` (lista ordenada de ruas).
  - *Why*: É o que permite que a **Linha de Rastreamento estilo Shopee/Correios** mostre todas as ruas pelas quais a pessoa já passou, a rua exata atual e as próximas ruas que faltam até o destino, além de identificar automaticamente atrasos (`+X min`) em qualquer trecho.

- **Decisão 3: Ciclo de 10 Segundos com Inversão Automática (`No Salão` vs. `Delivery`)**
  - *Chosen Approach*: O pacote de telemetria é enviado a cada `10 segundos` apenas enquanto `tracking_status` estiver ativo (`live_sharing` ou `arriving_5min`), invertendo automaticamente quem transmite e quem assiste conforme o tipo de serviço (`in_salon` vs. `home_delivery`).
  - *Why*: Equilibra fluidez em tempo real (padrão Uber/Shopee), economia de bateria no celular e privacidade total (desligamento automático na chegada).

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Data Model & Schema Evolution (`supabase_schema.sql` & `supabase_safe_migration.sql`)**:
  - Novas colunas na tabela `public.appointments` compartilhada entre `mnvapp`, `pvapp` e `admvapp`:
    - `service_location_type TEXT DEFAULT 'in_salon'` (`'in_salon'`, `'home_delivery'`)
    - `transport_mode TEXT DEFAULT 'driving'` (`'walking'`, `'transit'`, `'rideshare'`, `'driving'`, `'motorcycle'`)
    - `tracking_status TEXT DEFAULT 'idle'` (`'idle'`, `'alerted'`, `'hurry_confirmed'`, `'on_way_no_map'`, `'live_sharing'`, `'arriving_5min'`, `'arrived'`, `'rescheduled'`, `'cancelled'`)
    - `selected_route_summary TEXT` (Ex.: `'Rota 1 • Via Av. Rebouças e Rua Oscar Freire'`)
    - `route_polyline TEXT` (Polilinha codificada oficial da Google Maps API)
    - `current_street_name TEXT` (Rua onde está no momento, atualizada a cada 10s)
    - `route_checkpoints JSONB DEFAULT '[]'::jsonb` (Vetor de ruas extraído dos `steps` do Google Maps com `street`, `status: 'passed'|'current'|'upcoming'`, `timestamp` e `adversity`)
    - `active_adversity JSONB DEFAULT NULL` (`{ type, label, street, addedMinutes, reportedAt }`)
    - `delay_minutes INTEGER DEFAULT 0`
    - `client_lat DOUBLE PRECISION`, `client_lng DOUBLE PRECISION`, `distance_km NUMERIC(6,2)`, `eta_minutes INTEGER`, `prep_buffer_minutes INTEGER DEFAULT 10`
    - `cancellation_reason TEXT`, `last_location_update TIMESTAMPTZ`

- **O Que Será Construído e Entregue na Execução Deste Plano**:
  1. **Evolução do Banco de Dados (`supabase_schema.sql` & `supabase_safe_migration.sql`)**:
     - Inclusão de todas as colunas de rota Google Maps, checkpoints de ruas estilo Shopee/Correios, adversidades e suporte Delivery na tabela `public.appointments`.
  2. **Central de Rastreamento & Simulador `mnvapp` em `AdminAppointmentsMonitor.tsx`**:
     - **Visão Executiva & Agenda do Salão (`mnvapp` Preview)**: Lista agendamentos presenciais (`No Salão`) e domiciliares (`Delivery`) com status ao vivo, rua atual, contador de 10 segundos e alertas de adversidades (`+X min`).
     - **Visualizador Duplo de Rastreamento (Mapa 10s + Linha de Ruas Shopee/Correios)**:
       - Alternância instantânea entre o **Mapa Ao Vivo (10s)** com a rota traçada no Google Maps e a **Linha de Rastreamento por Ruas (Estilo Shopee/Correios)** mostrando as ruas já percorridas (`✔`), o marcador na rua atual (`●`), o card de retenção/adversidade (`⚠️ +X min`) e as próximas ruas (`○`).
       - Gatilho automático do **Alerta de 5 Minutos (`ETA <= 5 min`)** (*"Prepare a cadeira!"* ou *"Profissional chegando na sua casa!"*).
     - **Simulador Interativo da Partida e Traçador de Rota (`mnvapp` Cliente / Profissional Delivery)**:
       - Permite testar na prática o modal de `ETA + 10 min`, a escolha do meio de transporte, o **Traçador de Rota Google Maps In-App** (escolhendo entre opções de rota e vendo as ruas extraídas), a árvore de decisão `Sim / Não` (Comparecer com alerta de pressa, Cancelar com motivo obrigatório ou Remanejar na agenda) e o disparo de adversidades em 1 toque.
  3. **Comunicado Técnico Oficial da Tríade (`server.ts` Boletim `bol-020` & `CHANGELOG.md`)**:
     - Instruções passo a passo e código de integração para o `mnvapp` (módulos Cliente e Meu Negócio) e `pvapp`.
