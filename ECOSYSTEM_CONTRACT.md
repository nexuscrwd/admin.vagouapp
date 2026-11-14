# 🏛️ ECOSYSTEM_CONTRACT.md — Contrato Soberano da Tríade VagouApp (v5.0)

> **FONTE ÚNICA DA VERDADE (`admvapp` ⇄ `mnvapp` ⇄ `pvapp`)**  
> Este documento consolida o contrato de arquitetura, design system, regras financeiras, segurança e banco de dados compartilhado (**Supabase SQL v5.0 — `20261111_master_convergence_v5_0.sql`**) entre os três repositórios oficiais do ecossistema VagouApp.

---

## 🔗 1. Matriz Oficial da Tríade VagouApp

| Sigla | Aplicação | Domínio Principal | Papel no Ecossistema | Repositório Oficial |
|---|---|---|---|---|
| **`admvapp`** | **Admin VagouApp** | `adm.vagouapp.com` | Governança Soberana, Moderação, Financeiro, Segurança & DNS | `https://github.com/nexuscrwd/admin.vagouapp.git` |
| **`mnvapp`** | **Meu Negócio & Vitrines** | `meunegocio.vagouapp.com` & `*.vagouapp.com` | Painel Operacional do Salão + Micro-App White-Label & GPS Ao Vivo | `https://github.com/nexuscrwd/vagouapp.git` |
| **`pvapp`** | **Portal VagouApp** | `portal.vagouapp.com` | Marketplace Consumidor, Descoberta GIS & Radar de Vagas Relâmpago | `https://github.com/nexuscrwd/Portal-VagouApp.git` |

---

## 🛡️ 2. Cláusulas Inegociáveis (Contrato v5.0 — `bol-159` & `bol-160`)

1. **Zero Mocks & Zero `DROP TABLE`:**
   - Nenhum projeto da Tríade pode manter registros fictícios em código ou seeds SQL destrutivos.
   - Único seed permitido no banco: as 3 perguntas oficiais em `public.security_questions` (`first_pet`, `city_at_10`, `childhood_friend`).
2. **Paleta Default Verde Pastel Clarinho (`bol-158`):**
   - Valores default em `public.salons` e `public.salon_ui_settings`:
     - `default_theme = 'light'`
     - `primary_color = '#10B981'`
     - `secondary_color = '#065F46'`
     - `nav_bg_style = 'solid'`
     - `nav_bg_color = '#D1FAE5'`
     - `nav_icon_border = 'none'`
     - `nav_active_color = '#10B981'`
     - `section_header_bg_color = '#ECFDF5'`
     - `section_header_text_color = '#065F46'`
     - `section_header_icon_color = '#059669'`
3. **Trava Inegociável de Contraste:**
   - Qualquer elemento com fundo verde sólido (`#10B981`, `#20C933`, `bg-emerald-500`, `bg-emerald-600`) **DEVE OBRIGATORIAMENTE** exibir texto e ícones em branco puro (`#FFFFFF` / `text-white`).
   - No `BottomNav` da vitrine white-label, o botão ativo com fundo branco (`#FFFFFF`) assume obrigatoriamente a cor primária do tema (`primary_color`).
4. **Abas Padronizadas da Vitrine White-Label (`*.vagouapp.com`):**
   - Estritamente **`Início`**, **`Serviços`**, **`Agenda`** e **`Espaço`** (ou **`Atendimento`** para negócios delivery/domicílio).
5. **Padrão Financeiro Unificado (`public.salons`):**
   - `billing_plan`: `'PER_APPOINTMENT'` (padrão) ou `'SUBSCRIPTION'`.
   - `fee_per_booking` ⇄ `billing_fee_value`: `2.50` (espelhados automaticamente por `trg_sync_salon_fields`).
   - `monthly_subscription_fee`: `89.90` | `billing_due_day`: `10`.

---

## 🗄️ 3. Tabelas e RPCs Críticas Sincronizadas (SQL v5.0)

| Entidade / RPC | Colunas / Assinatura Chave | Uso na Tríade |
|---|---|---|
| **`public.salons`** | `trade_name`, `slug`, `subdomain`, `default_theme`, `primary_color`, `secondary_color`, `nav_bg_color`, `nav_icon_border`, `section_header_bg_color`, `billing_plan`, `fee_per_booking`, `billing_fee_value`, `monthly_subscription_fee`, `billing_due_day`, `branding` | Identidade cadastral, white-label e regras de cobrança individual do parceiro. |
| **`public.salon_ui_settings`** | `salon_id` (UNIQUE), `default_theme`, `primary_color`, `secondary_color`, `nav_bg_style`, `nav_bg_color`, `nav_icon_border`, `nav_active_color`, `section_header_*`, `branding_snapshot` | Persistência dedicada de personalização visual da vitrine white-label. |
| **`public.appointments`** | `date_str`, `start_time`, `end_time`, `status` (incl. `'BLOQUEADO'`), `is_blocked_slot`, `block_reason`, `is_paid`, `paid_at`, `payment_status` (`'pending'` \| `'paid'`), `swap_state` (JSONB), `tracking_status`, `eta_minutes`, `distance_meters` | Agenda cronológica (`date_str ASC, start_time ASC`), baixa de caixa, bloqueio de horários, permuta em cascata e telemetria RTLS/GPS. |
| **`public.security_questions`** & **`public.user_security_answers`** | `code` (`first_pet`, `city_at_10`, `childhood_friend`), `user_id`, `client_id`, `question_code`, `answer_hash` | Recuperação nativa de `@username`/acesso e reset de suporte pelo `admvapp`. |
| **RPC `check_client_inter_salon_collision`** | `(p_client_id, p_client_phone, p_date_str, p_start_time, p_duration_minutes, p_target_salon_id, p_exclude_appointment_id)` | Alerta preventivo de sobreposição de horário + deslocamento Haversiano entre dois salões distintos no mesmo dia. |

---

## 🔄 4. Protocolo do 7º Mandamento (Sincronização Obrigatória)

Qualquer alteração de schema, coluna, status, trigger ou contrato de API em um projeto exige:
1. Atualização de `20261111_master_convergence_v5_0.sql` (sempre idempotente com `IF NOT EXISTS`, sem `DROP TABLE`).
2. Registro em `CHANGELOG.md` e `TRIADE_BULLETINS` (`server.ts`).
3. Emissão imediata do **Comunicado Técnico Inter-Projetos** formal para os outros dois repositórios irmãos.
