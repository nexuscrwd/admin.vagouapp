# Sincronização Unificada da Tríade Vagou (Admin ⇄ Meu Negócio)

Unificação estrutural do banco de dados relacional (Supabase) e espelhamento bidirecional em tempo real entre o painel executivo **Admin-VagouApp (`admvapp`)** e o aplicativo do parceiro **Meu Negócio (`mnvapp`)**, cobrindo catálogo de serviços, galeria de mídias, tema visual, clientes, equipe profissional, conta família/dependentes e ferramentas operacionais (consumo, DRE e estoque).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo foram confirmadas durante a etapa de alinhamento e regem a execução deste plano sem perda de dados ou divergência entre os repositórios da Tríade.

- **Decisão Confirmada 1 — Unificação de Mídias e Dependentes nas Tabelas Relacionais Oficiais**: A galeria de fotos/vídeos (`salon_media_items`) e os familiares vinculados (`public.dependents`) passarão a ler e gravar diretamente nas tabelas relacionais oficiais do Supabase em ambos os sistemas, mantendo espelhamento de compatibilidade no objeto `branding` do salão para leitura imediata.
- **Decisão Confirmada 2 — Persistência de Utilidades Operacionais no Banco de Dados**: As ferramentas de gestão de consumo (medidores e leituras de energia/água, inventário de equipamentos), DRE financeiro e controle de insumos/estoque deixarão de ficar restritas ao armazenamento local do navegador e serão persistidas no Supabase com espelhamento de auditoria no painel executivo do Admin.
- **Decisão Confirmada 3 — Atualização Imediata no Admin + Pacote Oficial de Sincronização para o Meu Negócio**: Implementaremos todas as rotas de API, migrações SQL, painéis de inspeção e sincronizadores neste projeto (`admvapp`) e entregaremos o guia técnico completo com os blocos de código prontos para aplicação direta no repositório `mnvapp`.

---

### 1. Overview & Core Concept

- **What It Does**: Elimina os silos de armazenamento local (`localStorage`) que impediam o painel executivo do **Admin-VagouApp** de enxergar em tempo real os serviços customizados, fotos da galeria, cores do tema camaleão, profissionais da equipe, dependentes de clientes e indicadores de utilidades (energia, água, equipamentos, DRE e estoque) cadastrados no **Meu Negócio**.
- **Target Audience / Persona**: Diretoria executiva e suporte operacional do VagouApp (no `admvapp`) e proprietários, gestores e clientes de estabelecimentos parceiros (no `mnvapp`).
- **Key Value**: Garante uma fonte única da verdade (*Single Source of Truth*) no PostgreSQL/Supabase, permitindo que qualquer alteração feita pelo dono do salão ou cliente no aplicativo reflita instantaneamente na central administrativa — e vice-versa.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Auditoria de Catálogo, Equipe e Galeria no Admin**: Ao abrir a ficha detalhada de um estabelecimento no Admin, o gestor visualiza todos os procedimentos (incluindo serviços personalizados com fotos de portfólio e taxas de comissão), a grade de profissionais (com cargo, nível de acesso, comissões e status) e os slots da galeria de mídias sincronizados em tempo real.
  2. **Inspeção de Identidade Visual & Tema Camaleão**: O Admin exibe e permite ajustar o preset do tema camaleão, cores primária/secundária, logotipo, capa panorâmica e fotos de fachada/interior exatamente como aparecem na vitrine do parceiro.
  3. **Gestão de Clientes & Conta Família (Dependentes)**: Na central de usuários e na ficha do salão, o administrador consulta os clientes vinculados, seu contador de dependentes (`dependents_count`) e a lista detalhada de familiares (nome, grau de parentesco, nascimento e observações de atendimento), podendo cadastrar, editar ou desvincular registros.
  4. **Painel Executivo de Utilidades & Operação do Salão**: Nova visão integrada na ficha do salão no Admin que apresenta os medidores e leituras de Energia (kWh) e Água (m³), inventário de equipamentos elétricos, resumo do DRE/Fluxo de Caixa e alertas de estoque de insumos enviados pelo aplicativo do parceiro.
  5. **Guia Interativo de Sincronização da Tríade**: Acesso rápido ao comunicado técnico oficial e blocos de integração para atualização imediata do repositório irmão (`mnvapp`).

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Painel executivo SaaS de alta densidade informacional em atmosfera Dark Slate (`#0F172A` / `slate-950`), superfícies planas (`slate-900`) com bordas de 1px (`border-slate-800`) e raio de curvatura estrito de `4px`.
  - *Color Palette & Mood*: Contraste rigoroso seguindo a diretriz oficial do Vagou — fundos escuros e frios com tipografia branca/clara (`text-white`, `text-slate-100`), destaques operacionais em Verde Vagou (`#20C933` / `bg-emerald-500`) **sempre acompanhados de texto e ícones brancos (`text-white`)**, e alertas semânticos em âmbar (`text-amber-400`) e rubi (`text-rose-400`).
  - *Typography & Hierarchy*: Tipografia limpa e legível com alinhamento numérico tabular (`tabular-nums` / `font-mono`) obrigatório em todas as colunas financeiras, leituras de medidores (kWh/m³), durações de serviços e contadores.
  - *Component Styling & Layout*: Proibição absoluta de "box dentro de box" (zero aninhamento de cards com borda dentro de containers com borda), rótulos e botões em linha única (`whitespace-nowrap shrink-0`), ícones exclusivos da biblioteca `lucide-react` e rodapés de ação fixos (`sticky bottom-0 z-20`) nos modais de edição.

- **Interactive Feedback & Motion**: Estados de carregamento com esqueletos alinhados à geometria das tabelas, transições suaves abaixo de 200ms, confirmação visual instantânea ao sincronizar dados com o Supabase e indicadores claros de conformidade entre os módulos.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Sincronização Híbrida de Serviços, Equipe e Tema (`salon_services` + `professionals` + `salons.branding`)**
  - *Chosen Approach*: Consolidar o CRUD de serviços na tabela `salon_services` (suportando tanto serviços do catálogo mestre quanto serviços 100% customizados pelo salão), profissionais na tabela `professionals` (com campos de cargo, permissão, comissões e portfólio) e espelhar o resumo ativo dentro da coluna estruturada `branding` de `salons`.
  - *Why*: No `mnvapp`, os serviços customizados e membros da equipe ficavam salvos apenas no navegador (`localStorage`). Ao gravar nas tabelas relacionais do Supabase e manter o espelhamento em `branding`, garantimos que tanto as queries relacionais do Admin quanto o carregamento ultrarrápido da vitrine funcionem em total harmonia.
  - *Alternatives Considered*: Manter apenas JSON livre sem tabelas relacionais foi descartado pois inviabiliza relatórios globais de auditoria, busca cruzada de profissionais e integridade referencial nos agendamentos.

- **Decisão 2: Unificação da Galeria de Mídias (`salon_media_items`) e Dependentes (`public.dependents`)**
  - *Chosen Approach*: Conectar o upload e gerenciamento de fotos/vídeos diretamente à tabela `salon_media_items` (respeitando a trava dos slots do Radar e galeria) e unificar o módulo Conta Família na tabela `public.dependents` com atualização automática de `dependents_count` em `public.clients`.
  - *Why*: Permite que a moderação de conteúdo do Admin aprove, substitua ou audite mídias em tempo real e que os dependentes cadastrados pelo titular apareçam tanto no agendamento rápido do app quanto na auditoria de clientes do Admin.

- **Decisão 3: Persistência Relacional e Estruturada das Ferramentas de Utilidades (Energia, Água, Equipamentos, DRE e Estoque)**
  - *Chosen Approach*: Criar suporte dedicado no schema do Supabase e nas rotas do Admin para armazenar e inspecionar os dados operacionais do estabelecimento (`utilities_telemetry`: medidores de energia/água, leituras periódicas, aparelhos cadastrados, lançamentos financeiros/DRE e posição de estoque/insumos).
  - *Why*: Protege o dono do salão contra perda de dados ao trocar de celular ou limpar o cache do navegador, além de fornecer ao Admin-VagouApp inteligência operacional sobre custos fixos e saúde financeira da rede credenciada.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE DADOS UNIFICADA (SUPABASE)                      │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │    salons    │  │  salon_services  │  │ professionals │  │salon_media_items│  │
│  │ (+ branding  │  │ (catálogo +      │  │ (equipe, role,│  │ (5 slots radar  │  │
│  │  & utilities)│  │  customizados)   │  │  comissões)   │  │  + galeria)     │  │
│  └──────┬───────┘  └────────┬─────────┘  └───────┬───────┘  └────────┬────────┘  │
│         │                   │                    │                   │           │
│  ┌──────┴───────┐  ┌────────┴─────────┐  ┌───────┴───────────────────┴────────┐  │
│  │   clients    │  │    dependents    │  │     salon_utilities_records        │  │
│  │ (+ contador  │  │ (parent_client_id│  │ (energia, água, equipamentos,      │  │
│  │  dependentes)│  │  parentesco/obs) │  │  fluxo de caixa DRE e insumos)     │  │
│  └──────────────┘  └──────────────────┘  └────────────────────────────────────┘  │
└─────────▲────────────────────────────────────────────────────────────▲───────────┘
          │ Sincronização Bidirecional (REST / Supabase RPC)           │
          ▼                                                            ▼
┌─────────────────────────────────────────┐  ┌─────────────────────────────────────┐
│       ADMIN-VAGOUAPP (admvapp)          │  │        MEU NEGÓCIO (mnvapp)         │
│                                         │  │                                     │
│ • Ficha 360º do Salão:                  │  │ • Catálogo de Serviços:             │
│   - Serviços (Mestre + Customizados)    │  │   - Sync direto em salon_services   │
│   - Equipe & Permissões (CRUD completo) │  │ • Galeria & Espaço Físico:          │
│   - Galeria de Mídias (Moderação/Slots) │  │   - Sync em salon_media_items       │
│   - Identidade Visual & Tema Camaleão   │  │ • Tema Camaleão & Cores:            │
│   - Painel de Utilidades (Energia, Água,│  │   - Sync em salons.branding         │
│     Equipamentos, DRE e Estoque)        │  │ • Equipe & Profissionais:           │
│ • Gestão Global de Usuários & Clientes: │  │   - Sync em professionals           │
│   - Clientes + Conta Família/Dependentes│  │ • Clientes & Dependentes:           │
│ • Central de Sincronismo da Tríade:     │  │   - Sync em clients + dependents    │
│   - Diagnóstico & Guia de Código mnvapp │  │ • Utilidades (Consumo/DRE/Estoque): │
│                                         │  │   - Sync em salon_utilities_records │
└─────────────────────────────────────────┘  └─────────────────────────────────────┘
```

- **Data Model & State**:
  1. **Serviços do Estabelecimento (`salon_services`)**: Suporte a `service_id` (opcional para serviços criados do zero pelo parceiro), `custom_name`, `category`, `price`, `duration_minutes`, `commission_rate`, `description`, `photos` (JSONB) e `is_active`.
  2. **Profissionais & Equipe (`professionals`)**: Armazena `salon_id`, `name`, `role`, `access_level` (`admin`, `professional`, `reception`), `phone`, `email`, `avatar_url`, `bio`, `specialties`, `service_commissions`, `product_commissions`, `work_schedule` e `is_active`.
  3. **Galeria de Mídias (`salon_media_items`)**: Armazena `salon_id`, `slot_index` (1 a 5 para stories/radar ou índice de galeria), `media_type` (`image` | `video`), `media_url`, `caption` e `is_active`, mantendo sincronia com `salons.branding.galleryUrls` e `ambientPhotos`.
  4. **Tema Camaleão & Identidade (`salons.branding`)**: Objeto padronizado contendo `themePresetId`, `primaryColor`, `secondaryColor`, `logoUrl`, `bannerUrl`, `facadePhotoUrl`, `interiorPhotoUrl`, `operatingHours` e configurações de vitrine.
  5. **Usuários & Dependentes (`clients` e `dependents`)**: Tabela `clients` com `dependents_count` sincronizado e vínculo opcional `origin_salon_id`; tabela `dependents` com `parent_client_id`, `full_name`, `relationship` (`son`, `daughter`, `spouse`, `parent`, `other`), `birth_date`, `notes` e `is_unlinked`.
  6. **Utilidades Operacionais (`salon_utilities` / `salons.branding.utilities`)**: Estrutura persistente para medidores e leituras de Energia (`energyMeters`, `energyReadings`), Água (`waterMeters`, `waterReadings`), Equipamentos (`appliances`), Fluxo Financeiro/DRE (`financialTransactions`, `dreConfig`) e Insumos (`inventoryItems`).

- **Interactive Component & State Mapping**:
  - **Ficha Detalhada do Salão no Admin**:
    - *Aba Serviços*: Lista tanto serviços vinculados ao catálogo padrão quanto serviços personalizados criados no `mnvapp`, permitindo criar, editar preço/duração/comissão e ativar/desativar.
    - *Aba Equipe*: Exibe e edita todos os campos do profissional (incluindo cargo, nível de acesso, telefone, e-mail e comissões por serviço/produto).
    - *Aba Galeria & Identidade Visual*: Gerencia os 5 slots de mídia do Radar, fotos de fachada/interior e aplica presets do Tema Camaleão (`themePresetId`, cor primária e secundária) com pré-visualização.
    - *Nova Aba Utilidades & Operação (Energia, Água, DRE e Estoque)*: Permite ao administrador visualizar e auditar os medidores de consumo, leituras em kWh/m³, equipamentos cadastrados, balanço financeiro (DRE) e nível de insumos do salão, além de registrar ou ajustar dados quando necessário.
    - *Aba Sincronismo & Guia `mnvapp`*: Exibe o checklist de paridade em tempo real entre `admvapp` e `mnvapp` e fornece o script SQL unificado e o módulo conector pronto para colar no repositório `mnvapp`.
  - **Gestão de Usuários e Dependentes**:
    - Expansão da visualização de clientes e usuários para exibir e gerenciar dependentes vinculados (`public.dependents`) e salão de origem, garantindo paridade total com o `ProfileDrawer` e `SalonClientAuthModal` do `mnvapp`.
