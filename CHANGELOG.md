# VagouApp — Correções 2026-10-24

## 🔧 Triggers Corrigidos

### 1. `sync_dependents_to_family_members`
- **Bug:** Referenciava colunas `parent_client_id`, `full_name`, `salon_id`, `is_unlinked` na tabela `client_family_members` — que não possui essas colunas.
- **Fix:** Inserção agora usa apenas colunas reais: `guardian_client_id`, `name`, `relationship`, `birth_date`, `avatar_url`, `notes`, `autonomy_level`, `phone`, `email`.

### 2. `sync_family_members_to_dependents`
- **Bug:** Mesmo problema — referenciava `parent_client_id` em `client_family_members`.
- **Fix:** Usa `guardian_client_id` e remove referências a colunas inexistentes.

### 3. `normalize_client_family_member_fields`
- **Bug:** Tentava acessar `NEW.full_name` e `NEW.parent_client_id` na tabela `client_family_members`.
- **Fix:** Removidas referências inválidas. Apenas `NEW.name` é normalizado.

### 4. `handle_appointment_defaults`
- **Bug:** FK `appointments_client_user_id_fkey` quebrada — `service_role` sem permissão de leitura em `auth.users`.
- **Fix:** `client_user_id` setado como NULL temporariamente (FK será recriada quando permissões forem ajustadas).

## 👤 Login da Ana Beatriz Lima

- `auth_user_id` vinculado: `76a4f2d7-bfd7-43ba-91c0-823c81cbd7c1`
- `username` definido: `analima`
- **Agora aceita login por:**
  - Username: `analima`
  - Telefone: `(11) 98888-7777` ou `98888-7777`
  - Email: `ana.lima@email.com.br`

## 📊 Dados da Simulação

- Salão: Barbearia Navalha Real (Vila Matilde, SP)
- Profissionais: Marcos Silva + Rafael Costa
- Serviços: Corte Navalhado, Barba Terapia, Combo Degradê+Barba
- Vagas no Radar: 6 ofertas ativas
- Cliente: Ana Beatriz Lima + 2 dependentes (Lucas + Pedro)
- Agendamentos: 2 criados com sucesso

## 🐛 Correções de Schema

- FK `appointments_client_user_id_fkey` temporariamente removida
- `client_user_id` na tabela `appointments` agora nullable
