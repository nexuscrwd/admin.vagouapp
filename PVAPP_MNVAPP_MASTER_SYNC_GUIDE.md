# 🏛️ Guia Mestre de Sincronização 360º da Tríade — Contrato Soberano v5.0 (`bol-159` & `bol-160`)

> **Documento Oficial de Governança Soberana (7º Mandamento)**
> - **Emitido por:** `admvapp` (`adm.vagouapp.com` — `https://github.com/nexuscrwd/admin.vagouapp.git`)
> - **Sincronizado com:**
>   - `mnvapp` (`meunegocio.vagouapp.com` & `*.vagouapp.com` — `https://github.com/nexuscrwd/vagouapp.git`)
>   - `pvapp` (`portal.vagouapp.com` — `https://github.com/nexuscrwd/Portal-VagouApp.git`)
> - **Script Mestre Oficial (100% Idempotente & Zero `DROP TABLE`):** `/supabase/migrations/20261111_master_convergence_v5_0.sql` (espelhado em `/supabase_schema.sql`)

---

## 🎯 1. O Que Está Unificado na Versão 5.0

1. **Política Estrita Zero Mocks & Zero SQL Destrutivo:**
   - Removidos todos os arquivos e arrays de mocks (`src/data.ts`, `20261019_seed_real_salons.sql`, seeds automáticos em `server.ts`).
   - Proibido executar `DROP TABLE ... CASCADE` em qualquer migração ou guia da Tríade.
   - Único seed oficial permitido: as 3 perguntas secretas em `public.security_questions` (`first_pet`, `city_at_10`, `childhood_friend`).

2. **Paleta Oficial Verde Pastel Clarinho (`bol-158`) & Sincronismo `salon_ui_settings`:**
   - Criação e edição de salões no `admvapp` e `mnvapp` gravam simultaneamente em `public.salons` e `public.salon_ui_settings`:
     - `default_theme = 'light'`, `primary_color = '#10B981'`, `secondary_color = '#065F46'`
     - `nav_bg_style = 'solid'`, `nav_bg_color = '#D1FAE5'`, `nav_icon_border = 'none'`, `nav_active_color = '#10B981'`
     - `section_header_bg_color = '#ECFDF5'`, `section_header_text_color = '#065F46'`, `section_header_icon_color = '#059669'`
   - Vitrines White-Label padronizadas com as 4 seções: **`Início`**, **`Serviços`**, **`Agenda`** e **`Espaço`** (ou **`Atendimento`** para delivery).

3. **Faturamento Unificado por Estabelecimento:**
   - `billing_plan`: `'PER_APPOINTMENT'` (padrão) ou `'SUBSCRIPTION'`.
   - `fee_per_booking` ⇄ `billing_fee_value`: `R$ 2,50` sincronizados bidirecionalmente no backend e pela trigger `trg_sync_salon_fields`.
   - `monthly_subscription_fee`: `R$ 89,90` | `billing_due_day`: `10`.

4. **Agenda Cronológica, Baixa Financeira, Bloqueios, Permuta & Colisão Geotemporal:**
   - Ordenação cronológica crescente (`date_str ASC, start_time ASC`).
   - Status de pagamento real: **Pago** (`is_paid = true` / `payment_status = 'paid'`) vs **À pagar** (`payment_status = 'pending'`).
   - Suporte nativo a **Horário Bloqueado** (`is_blocked_slot = true` / `status = 'BLOQUEADO'` + `block_reason`) e **Permuta em Cascata** (`swap_state` JSONB).
   - Alerta preventivo de **Colisão Geotemporal Inter-Salões** via RPC `public.check_client_inter_salon_collision` e endpoint `POST /api/admin/appointments/check-collision`.

5. **Perguntas Secretas & Suporte Administrativo de Contas:**
   - Tabelas `public.security_questions` e `public.user_security_answers` ativas com RPCs `get_random_security_question()` e `recover_username_by_security_answer()`.
   - Painel `admvapp` exibe indicador de pergunta configurada e disponibiliza reset imediato de respostas secretas e redefinição de senha (`POST /api/admin/users/:kind/:id/reset-security`).

---

## 🛠️ 2. Como Executar / Atualizar o Banco Supabase com Segurança

Nunca utilize scripts antigos com `DROP TABLE`. Caso precise reaplicar ou auditar o schema em qualquer ambiente Supabase:

1. Abra o arquivo `/supabase/migrations/20261111_master_convergence_v5_0.sql` (ou baixe via endpoint `GET /api/admin/triade/master-sql` no `admvapp`).
2. Cole e execute no **SQL Editor** do projeto Supabase (`xemenxdhuoekytyhmgyt`).
3. O script é 100% idempotente (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`), preservando integralmente todos os estabelecimentos, clientes, profissionais e agendamentos reais em produção.
