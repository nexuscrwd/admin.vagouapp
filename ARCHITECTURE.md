# 🗺️ Arquitetura e Visão Técnica — Vagou

O **Vagou** é um aplicativo mobile-first de agendamento de vagas imediatas e horários ociosos em salões de beleza, barbearias, estética e bem-estar.

---

## 🏗️ 1. Visão Geral da Pilha Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend UI** | React 19 + TypeScript | Interface declarativa, modular e orientada a componentes. |
| **Estilização** | Tailwind CSS v4 | Estilização utility-first com tema Dark Slate + Emerald. |
| **Ícones** | Lucide React | Biblioteca padronizada de ícones vetoriais. |
| **Animações** | Motion (`motion/react`) | Transições de tela, gavetas, modais e feedback de toque. |
| **Build & Dev Server** | Vite 6 + Express + TSX | Servidor Full-Stack com suporte a rotas API e SPA. |
| **IA Generativa** | `@google/genai` (Gemini SDK) | Análise arquitetural e extração estruturada de telas. |
| **Persistência / Cloud** | Firebase Firestore (Configurado) | Base de dados em tempo real para sincronização de vagas. |

---

## 🏛️ 2. A Tríade VagouApp & Pacote Oficial de Formulários (`src/triade-export`)

O ecossistema oficial é composto por 3 aplicações independentes conectadas ao mesmo banco Supabase:
1. `pvapp` (`portal.vagouapp.com`) — Marketplace do Consumidor: `https://github.com/nexuscrwd/Portal-VagouApp.git`
2. `vapp` / `mnvapp` (`seunegocio.vagouapp.com` / `vagouapp.com`) — App Consumidor / Gestão Parceiro: `https://github.com/nexuscrwd/vagouapp.git`
3. `admvapp` (`adm.vagouapp.com`) — ESTE PROJETO: Governança Master Soberana: `https://github.com/nexuscrwd/admin.vagouapp.git`

### 🔗 Matriz de Repositórios Git Oficiais da Tríade:
| Aplicação | Identificador | Repositório Oficial no GitHub |
|---|---|---|
| **Admin VagouApp** | `admvapp` | `https://github.com/nexuscrwd/admin.vagouapp.git` |
| **VagouApp Oficial** | `vapp` / `mnvapp` | `https://github.com/nexuscrwd/vagouapp.git` |
| **Portal VagouApp** | `pvapp` | `https://github.com/nexuscrwd/Portal-VagouApp.git` |

### 📦 Central Unificada de Formulários da Tríade (`src/triade-export/`):
Todos os formulários legados foram eliminados (`UnifiedRegistrationForm`, `AdminCreateSalonModal`), dando lugar aos componentes canônicos e soberanos:
- **`TriadeEstablishmentMasterForm` / `TriadeEstablishmentModal`**: Cadastro completo de estabelecimento com verificação de proprietário e modal de **"Mesmo Endereço do Usuário"** (garagens, sobrados e estúdios residenciais).
- **`TriadeMnvClientRegisterForm`**: Cadastro progressivo em 3 etapas de clientes com suporte a white-label do parceiro.
- **`TriadeMnvClientLoginForm`**: Acesso simplificado multi-identificador (usuário, celular ou e-mail).
- **`UniversalFormEmbedView`**: Hub de embed com URLs parametrizadas (`/embed/estabelecimento`, `/embed/mnv-cadastro`, `/embed/mnv-acesso`) para carregamento direto em iframes no `mnvapp` e `pvapp`.

---

## 📱 3. Modos de Operação do Aplicativo

O aplicativo possui dois modos operacionais principais controlados pelo estado global `appMode`:

### A. Modo Cliente (`AppMode: 'client'`)
Focado na experiência do usuário final que busca atendimento rápido por proximidade:
- **`HomeScreen`**: Feed principal com barra de stories do Radar, busca rápida, filtro por categorias e cards de vagas ativas ordenadas por urgência e distância.
- **`SalonProfileView`**: Micro-app do salão / estabelecimento com navegação em 4 abas 100% isoladas (`Início`, `Serviços`, `Agenda`, `Espaço/Equipe`), cabeçalho de marca e enquadramento total de tela.
- **`MapScreen`**: Visualização geoespacial (GIS) de salões próximos com raio de distância, filtros e cards flutuantes.
- **`OfferDetailScreen`**: Detalhe da oferta com fotos/vídeo, serviços inclusos, tempo de expiração e botão de reserva imediata.
- **`ConfirmationScreen`**: Tela de sucesso pós-reserva com protocolo de atendimento, mapa estático, QR code e rota.
- **`AgendaScreen`**: Histórico e lista de agendamentos confirmados do cliente com opção de cancelamento.
- **`ProfileScreen`**: Dados do usuário, preferências e configurações.

### B. Modo Parceiro / Estabelecimento (`AppMode: 'partner'`)
Focado na gestão de horários e publicação de vagas relâmpago:
- **`PartnerAgendaScreen`**: Visão diária da agenda por profissional, status dos atendimentos e publicação de vagas ociosas.
- **`PartnerScheduleConfigScreen`**: Configuração de horários de funcionamento, intervalos de almoço e escala por dia da semana.
- **`PartnerProfileScreen`**: Cadastro do salão, profissionais da equipe e configurações da conta.
- **`PartnerPublishModal`**: Modal ágil para lançar uma vaga imediata com desconto no feed e mapa.

---

## 🌐 3. Tecnologias GIS, Geolocalização & Mapas

1. **Cálculo de Proximidade:**
   - As ofertas possuem latitude e longitude (`lat`, `lng`).
   - A distância é calculada em relação à posição do usuário ou bairro central selecionado (ex: Itaquera - SP).
   - O app suporta ordenação por menor distância e exibição em formato amigável (`500m`, `1.2 km`).

2. **Visualização em Mapa (`MapScreen`):**
   - Renderização dos estabelecimentos com pins estilizados que destacam vagas ativas.
   - Drawer inferior sincronizado com o pin selecionado no mapa.

---

## ⚡ 4. Mecânica do "Radar de Vagas Imediatas"

As ofertas possuem um sistema dinâmico de mídia estruturado em 3 níveis:
1. **Nível 1 (Fallback Animado):** Utilizado quando o estabelecimento não enviou mídias reais. Exibe cartões gerados visualmente com gradientes da marca, badges dinâmicos e tipografia forte (`MediaFallbackCard`).
2. **Nível 2 (Carrossel de Fotos):** Galeria horizontal navegável com fotos do ambiente e cortes/serviços reais com contadores de imagem.
3. **Nível 3 (Vídeo Vertical / Story):** Vídeo imersivo com reprodução automática, controle de mudo e experiência estilo reels/stories (`RadarStoryModal`).

---

## 🏛️ 6. Arquitetura Distribuída & Ecossistema Vagou (Dossiê 3.8)

O Vagou opera sob um modelo de **Single Sign-On (SSO)** descentralizado que integra o **Portal Vagou (Marketplace / Radar)** com os **Apps PWAs White-Label dos Salões**:

### A. Princípios Fundamentais:
1. **Identidade Única (`auth.users`):** Uma pessoa física é única. Os mesmos login e senha servem para o Portal e para os PWAs de todos os salões parceiros.
2. **"Efeito UAU":** Clientes que agendam pelo link de um salão têm seus dados sincronizados no portal ao fazer login, revelando seus salões frequentes e histórico unificado.
3. **Dupla Cidadania (Cliente ⇄ Profissional):** Um usuário consumidor pode ativar o "Modo Profissional" aproveitando seus dados já existentes e obtendo seu próprio link PWA (`vagou.app/sua-marca`).
4. **Vínculo Automático por Trigger (`handle_auto_link_salon_client`):** Cada agendamento criado em `appointments` vincula o cliente à tabela `salon_clients` sem intervenção manual.
5. **Anti-Double Booking (`unique_professional_time`):** Trava de unicidade no banco por `(salon_id, professional_id, scheduled_date, start_time)` para impedir agendamentos sobrepostos.

### B. Esquema de Tabelas do Ecossistema & Governança SQL:
- `auth.users`: Cadastro global de pessoa física.
- `salons`: Estabelecimentos e marcas parceiras (`status`, `cover_image_url`, `pix_key`, `operating_hours`, `branding`).
- `salon_media_items`: Acervo Central de Mídias estruturado em **3 Abas Principais** (`fotos`, `videos`, `imagens`) e sub-abas (`servicos`, `profissionais`, `espaco`, `banner`, `logotipo`).
- `professionals`: Cadeiras / membros da equipe.
- `services`: Procedimentos e catálogo completo com suporte nativo a `photos TEXT[]`, `videos JSONB` e `slides TEXT[]`.
- `appointments`: Agendamentos unificados com suporte a `origin` (`portal`, `salon_pwa`, `radar_flash`), `service_type` (`IN_SALON`, `HOME_DELIVERY`) e dependentes (`is_dependent`, `dependent_name`).
- `system_admins` & `admin_access_logs`: Governança corporativa de acesso do Admin Master (`admvapp`).
- `salon_clients`: Tabela de fidelidade, contagem de visitas e estabelecimentos favoritados.

#### 📦 Duas Opções de Deploy SQL:
1. **Opção 1 (Migração Incremental):** `/supabase/migrations/20261012_media_gallery_and_services.sql` — Para clusters de produção existentes com dados em andamento.
2. **Opção 2 (Schema Consolidado v2.2.0):** `/supabase_schema.sql` — Para novos ambientes ou reset de banco.

---

## 👥 7. Perfis de Consumidores e Modelos de Negócio Suportados

### A. Os 4 Perfis de Clientes do Ecossistema:
1. **Homem:** Foco em barbearias, corte fade/degradê, barba e agilidade.
2. **Mulher:** Foco em mechas, manicure/alongamento em gel, lash lifting e estética.
3. **Não-Binário / Prefere não declarar:** Estética contemporânea, design de sobrancelha e atendimento inclusivo.
4. **Infantil / Dependente:** Agendamentos vinculados ao responsável com opção *"Agendar para mim"* ou *"Agendar para dependente"* (`is_dependent: true`, `dependent_name`).

### B. Os 4 Modelos de Prestadores de Serviço:
1. **A Domicílio (Home Care / Delivery):** Sem endereço fixo aberto ao público; exibe taxa de deslocamento e bairros atendidos; exige endereço do cliente no agendamento.
2. **Autônomo com Ponto Físico (Studio Solo):** 1 profissional proprietário da sua própria cadeira/estúdio.
3. **Salão com Equipe (Dono + Colaboradores):** Múltiplos profissionais com especialidades e comissões independentes.
4. **Rede / Multi-Unidades:** Múltiplas filiais sob a mesma titularidade com endereços e equipes distintos.

---

## 🎨 8. Diretriz Arquitetural de Design: Formulários Planos & Transparentes

Para preservar a leveza e evitar aninhamento claustrofóbico de contêineres:
- **Zero Box-in-Box:** Formulários não devem utilizar cards escuros envolventes com bordas duplicadas (`bg-slate-900 border border-slate-800 rounded-2xl`).
- **Superfície Plana:** O contêiner de todo formulário adota `bg-transparent border-0 p-0 shadow-none`.
- **Destaque Funcional:** Apenas o logo, tipografia, inputs e botões de ação povoam a área visual.
- **Embeds Limpos:** Em iframes ou modais de terceiros, a raiz ativa transparência síncrona para integração 100% nativa.

---

## 📂 9. Estrutura de Arquivos e Diretórios
/
├── AGENTS.md                  # Diretrizes mestras da IA e protocolo dos 6 mandamentos
├── ARCHITECTURE.md            # Este arquivo - Arquitetura e fluxos do sistema
├── KNOWLEDGE_BASE.md          # Padrões validados, z-index e soluções consolidadas
├── CHANGELOG.md               # Histórico cronológico de modificações
├── metadata.json              # Configurações do AI Studio (nome, permissões)
├── server.ts                  # Servidor Express com API Gemini e proxy Vite
├── src/
│   ├── App.tsx                # Roteamento de telas, estado de cliente/parceiro e modais
│   ├── types.ts               # Tipos TypeScript compartilhados (Ofertas, Agenda, Telas)
│   ├── data.ts                # Mocks ricos de ofertas, salões e profissionais
│   ├── index.css              # Configuração global de Tailwind CSS v4
│   ├── components/            # Componentes modulares de tela e UI
│   ├── services/              # Serviços de integração (Gemini, Firebase)
│   └── utils/                 # Funções utilitárias (formatação, cálculos GIS)
```
