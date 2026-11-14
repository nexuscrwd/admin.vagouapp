# 🗺️ Arquitetura e Visão Técnica — Admin Master VagouApp (`admvapp`)

O **Admin VagouApp (`admvapp` — `adm.vagouapp.com`)** é o painel soberano de governança executiva, moderação cadastral, auditoria financeira, suporte de segurança e sincronização de dados da **Tríade VagouApp**.

---

## 🏗️ 1. Visão Geral da Pilha Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend UI** | React 19 + TypeScript | Interface modular para governança multi-tenant, tabelas de cabeçalho fixo (`sticky top-0`) e modais em portal. |
| **Estilização** | Tailwind CSS v4 | Design System plano (Zero Box-in-Box), suporte a Light/Dark e trava de contraste (`#10B981` / `#20C933` = `text-white`). |
| **Ícones** | `lucide-react` | Biblioteca estrita de ícones vetoriais (proibido SVG manual inline). |
| **Backend & API** | Node.js + Express + TSX (`server.ts`) | Rotas administrativas `/api/admin/*` operando com `SUPABASE_SERVICE_ROLE_KEY` (bypass seguro de RLS no servidor). |
| **Banco & Auth** | Supabase PostgreSQL + Auth + Storage + Realtime | Banco relacional único compartilhado pela Tríade (**Contrato Soberano SQL v5.0**). |
| **GIS & Geocoding** | Google Maps Platform / Nominatim / ViaCEP | Geocodificação reversa/direta, ajuste fino de pino (`GoogleAddressPinPicker`) e colisão geotemporal inter-salões. |

---

## 🏛️ 2. A Tríade VagouApp & Repositórios Oficiais

As 3 aplicações operam conectadas em tempo real (`supabase_realtime`) ao mesmo projeto Supabase (`xemenxdhuoekytyhmgyt`):

| Sigla Oficial | Aplicação | Domínio Oficial | Repositório GitHub |
|---|---|---|---|
| **`admvapp`** | **Admin VagouApp** *(Este Projeto)* | `adm.vagouapp.com` | `https://github.com/nexuscrwd/admin.vagouapp.git` |
| **`mnvapp`** | **Meu Negócio & Vitrines White-Label** | `meunegocio.vagouapp.com` & `*.vagouapp.com` | `https://github.com/nexuscrwd/vagouapp.git` |
| **`pvapp`** | **Portal VagouApp (Marketplace & Radar)** | `portal.vagouapp.com` | `https://github.com/nexuscrwd/Portal-VagouApp.git` |

---

## 🛡️ 3. Regras Soberanas do Contrato SQL v5.0 (`bol-159` & `bol-160`)

1. **Zero Mocks & Zero SQL Destrutivo:**
   - Proibição absoluta de arrays fictícios em memória, seeds automáticos no boot ou comandos `DROP TABLE ... CASCADE`.
   - Único seed permitido no banco: as 3 perguntas oficiais de segurança em `public.security_questions` (`first_pet`, `city_at_10`, `childhood_friend`).
2. **Paleta Default Verde Pastel Clarinho (`bol-158`):**
   - Novos estabelecimentos nascem com `default_theme = 'light'`, `primary_color = '#10B981'`, `secondary_color = '#065F46'`, `nav_bg_style = 'solid'`, `nav_bg_color = '#D1FAE5'`, `section_header_bg_color = '#ECFDF5'`, `section_header_text_color = '#065F46'`, `section_header_icon_color = '#059669'`, `nav_icon_border = 'none'`.
   - Sincronização dupla entre `public.salons` (`branding` JSONB + colunas planas) e `public.salon_ui_settings` (`branding_snapshot`).
3. **Padrão Financeiro Unificado:**
   - `billing_plan` (`'PER_APPOINTMENT'` | `'SUBSCRIPTION'`), `fee_per_booking` ⇄ `billing_fee_value` (`R$ 2,50`, espelhados por trigger `trg_sync_salon_fields`), `monthly_subscription_fee` (`R$ 89,90`) e `billing_due_day` (`10`).
4. **Agenda Cronológica, Baixa Financeira, Bloqueios, Permuta & Colisão Geotemporal:**
   - Listagem cronológica crescente (`date_str ASC, start_time ASC`).
   - Status real de caixa (`is_paid` / `payment_status`: **Pago** vs **À pagar**), bloqueios de agenda (`is_blocked_slot` / `status = 'BLOQUEADO'` + `block_reason`), permuta em cascata (`swap_state` JSONB) e detecção de conflito geotemporal entre salões distintos via RPC `public.check_client_inter_salon_collision`.
5. **Perguntas Secretas & Suporte Administrativo:**
   - Tabelas `public.security_questions` e `public.user_security_answers` + colunas `security_question_code` e `security_answer_normalized` em `public.clients`.
   - Rota administrativa `POST /api/admin/users/:kind/:id/reset-security` para limpeza de perguntas secretas e redefinição direta de senha.
6. **Nomenclatura Oficial das Vitrines White-Label:**
   - Abas padronizadas: **`Início`**, **`Serviços`**, **`Agenda`** e **`Espaço`** (ou **`Atendimento`** para operação delivery).

---

## 📂 4. Estrutura Principal de Diretórios

```text
/
├── AGENTS.md / GEMINI.md                          # Protocolo dos 7 Mandamentos e regras visuais
├── ARCHITECTURE.md                                # Arquitetura técnica do admvapp (SQL v5.0)
├── ECOSYSTEM_CONTRACT.md                          # Contrato compartilhado da Tríade VagouApp
├── PVAPP_MNVAPP_MASTER_SYNC_GUIDE.md              # Guia oficial de sincronização inter-projetos (v5.0)
├── CHANGELOG.md                                   # Histórico auditável de modificações
├── server.ts                                      # Backend Express + APIs Service Role + proxy Vite
├── supabase_schema.sql                            # Schema consolidado idempotente SQL v5.0
├── supabase_security_questions.sql                # Schema idempotente das 3 perguntas secretas oficiais
├── supabase/migrations/
│   └── 20261111_master_convergence_v5_0.sql       # Script Mestre Soberano SQL v5.0 (Zero DROP TABLE)
└── src/
    ├── App.tsx                                    # Entrada principal do Admin Master e rotas de formulários
    ├── types/
    │   ├── database.types.ts                      # Tipagem relacional sincronizada com SQL v5.0
    │   └── admin.ts                               # Interfaces de governança administrativa
    ├── services/
    │   ├── supabase.ts                            # Clientes Supabase (Anon + Service Role fallback)
    │   └── supabaseApi.ts                         # Camada de integração sem mocks com API/Supabase
    └── components/admin/                          # Módulos soberanos (Salões, Usuários, Monitor Agenda, Portal)
```
