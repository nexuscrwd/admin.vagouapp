# 🏛️ Plano de Execução: Persistência Absoluta de Endereços, Coordenadas Geográficas na Tríade & Google Maps In-App (Rotas em 3 Camadas)

## 1. Diagnóstico & Correção Definitiva da Persistência de Formulários (`server.ts` & `supabaseApi.ts`)

### 1.1. Sanitização e Whitelist de Colunas no `PATCH /api/admin/salons/:id` e `POST /api/admin/salons` (`server.ts`)
- **Problema Raiz:** O modal `AdminEditSalonModal.tsx` enviava propriedades de configuração (`pix_keys` como array, `operating_hours`, `fee_per_booking`, `monthly_subscription_fee`, `billing_due_day`) misturadas às colunas físicas de `public.salons`. O PostgREST rejeitava todo o `UPDATE` com erro `PGRST204 (Column not found)` se qualquer propriedade do objeto não existisse como coluna física.
- **Solução:**
  - Separar estritamente no `server.ts` os **campos físicos** da tabela `public.salons` (`name`, `nome_fantasia`, `slogan`, `description`, `category`, `categories`, `cep`, `address`, `street_number`, `complement`, `neighborhood`, `city`, `state`, `latitude`, `longitude`, `formatted_address`, `google_place_id`, `phone`, `whatsapp`, `phone_landline`, `email`, `instagram`, `facebook`, `website`, `cnpj`, `cpf_cnpj`, `owner_name`, `owner_cpf`, `owner_email`, `owner_phone`, `plan`, `subscription_status`, `kyc_status`, `is_verified`, `verified_badge`, `accepts_online_booking`, `auto_confirm_appointment`, `pix_key`, `pix_key_type`, `cancellation_policy`, `commission_rate`, e colunas físicas de estilo/UI) dos **metadados de `branding` JSONB** (`pix_keys`, `operating_hours`, `fee_per_booking`, `monthly_subscription_fee`, `billing_due_day`, `navBgStyle`, etc.).
  - Implementar **fallback resiliente de schema**: caso o banco Supabase ainda não tenha rodado alguma coluna nova recém-adicionada, o backend detecta `PGRST204`, preserva os dados dentro de `branding` JSONB e reexecuta o `UPDATE` das colunas de endereço (`cep`, `address`, `street_number`, `complement`, `neighborhood`, `city`, `state`, `latitude`, `longitude`) garantindo **100% de gravação física**.
  - Eliminar todos os falsos positivos (`return { success: true }` em blocos de erro) tanto em `server.ts` quanto em `src/services/supabaseApi.ts`.

### 1.2. Resolução de ID Sintético (`su-<uuid>`) e Propagação Automática por CPF (`server.ts`)
- **Problema Raiz:** Na edição de usuários gestores (`salon_user`), o ID `su-<id_do_salao>` falhava no PostgreSQL (`22P02 invalid input syntax for type uuid`) e não atualizava o endereço real.
- **Solução:**
  - Em `PUT /api/admin/users/:type/:id`, detectar prefixos `su-`, resolver o estabelecimento/CPF subjacente e **propagar automaticamente o endereço e as coordenadas (`cep`, `address`, `street_number`, `complement`, `neighborhood`, `city`, `state`, `latitude`, `longitude`)** para todas as tabelas vinculadas ao mesmo CPF/usuário:
    - `public.salons` (quando for proprietário/gestor e usar o mesmo endereço ou editar dados do salão)
    - `public.clients`
    - `public.professionals`
    - `public.profiles`
    - `public.salon_users`
    - `public.system_admins`

### 1.3. Mapeamento Completo na Leitura (`mapSalonRow` em `src/services/supabaseApi.ts` & `src/types/admin.ts`)
- Mapear integralmente `street_number`, `complement`, `phone_landline`, `owner_cpf`, `latitude`, `longitude`, `formatted_address` e `google_place_id` em `mapSalonRow` e na interface `AdminSalonItem`, impedindo que a leitura do banco apague número, complemento ou coordenadas na tela.

---

## 2. Geocodificação Automática + Ajuste Fino de Pino no Mapa nos Formulários

### 2.1. Serviços de Geocodificação e Rotas no Backend (`server.ts`)
- Configurar suporte nativo à chave Google Maps (`GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY`):
  - **`GET /api/geo/config`**: Retorna o status da chave e expõe a configuração segura para o SDK JS do navegador.
  - **`POST /api/geo/geocode`**: Recebe `{ cep, address, street_number, neighborhood, city, state }` (ou `{ lat, lng }` para geocodificação reversa) e consulta a **Google Maps Geocoding API** (com fallback automático para Nominatim/BrasilAPI) retornando `{ latitude, longitude, formatted_address, place_id, precision }`.
  - **Auto-Geocode Transparente no Salvamento**: Sempre que `POST /api/admin/salons`, `PATCH /api/admin/salons/:id`, `POST /api/admin/users/register` ou `PUT /api/admin/users/:type/:id` receberem um endereço sem `latitude`/`longitude` (ou quando o endereço mudar), o próprio backend resolve as coordenadas antes do `UPDATE`/`INSERT` no Supabase.

### 2.2. Componente de Mapa com Pino Arrastável (`src/components/admin/GoogleAddressPinPicker.tsx`)
- Componente visual compacto integrado aos formulários de endereço:
  - Geocodifica automaticamente assim que o CEP + Número (ou endereço) são preenchidos.
  - Exibe as coordenadas resolvidas (`Lat / Lng`) com selo de precisão e botão **"Ajustar Pino no Mapa"**.
  - Permite arrastar o marcador (`marker`) ou clicar no mapa Google Maps para cravar a posição exata da fachada do estabelecimento ou residência do usuário, atualizando `latitude` e `longitude` instantaneamente.

### 2.3. Revisão Completa dos 4 Formulários do Sistema
1. **`AdminEditSalonModal.tsx` (Edição de Estabelecimento):**
   - Adicionar campos `street_number` (Número), `complement` (Complemento), busca automática ViaCEP ao digitar o CEP e o seletor `GoogleAddressPinPicker` com `latitude` e `longitude`.
2. **`TriadeEstablishmentMasterForm.tsx` (Cadastro Master de Estabelecimento):**
   - Integrar geocodificação automática + `GoogleAddressPinPicker` tanto no passo do Proprietário quanto no passo do Estabelecimento, sincronizando endereço e coordenadas do proprietário existente no Supabase.
3. **`TriadeUserRegisterForm.tsx` (Cadastro Master de Usuário):**
   - Integrar geocodificação automática + `GoogleAddressPinPicker` para Clientes, Profissionais e Administradores.
4. **`AdminUserGeneralDataModal.tsx` (Ficha Cadastral / Edição de Usuário):**
   - Integrar busca automática por CEP, geocodificação automática + `GoogleAddressPinPicker` e salvamento sincronizado em todas as tabelas do CPF.

---

## 3. Integração do Comunicado `mnvapp` (`bol-023`): `InteractiveGoogleRouteMap` e Rota Viária em 3 Camadas

### 3.1. Resolução de Geometria Viária em 3 Camadas (`POST /api/geo/route` + Frontend)
- Implementar exatamente a arquitetura do comunicado do `mnvapp`:
  - **Camada 1 (Backend `POST /api/geo/route`):** Consulta `https://routes.googleapis.com/directions/v2:computeRoutes` com cabeçalho `Referer` e `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline`.
  - **Camada 2 (Browser SDK `google.maps.DirectionsService`):** Se a Routes API v2 tiver restrição de HTTP Referrer no servidor, o componente resolve diretamente no navegador via `DirectionsService`.
  - **Camada 3 (Fallback Viário Real OSRM):** Consulta `router.project-osrm.org/route/v1/driving/...` retornando a `encodedPolyline` real da malha viária (eliminando qualquer linha reta de 2 pontos).

### 3.2. Componente `InteractiveGoogleRouteMap.tsx` e Integração no `LiveAppointmentTrackingHub.tsx`
- Criar `src/components/admin/InteractiveGoogleRouteMap.tsx` seguindo as travas anti-flickering:
  - Instância `new google.maps.Map` isolada em `useEffect([sdkReady, isDark])`.
  - Atualizações imperativas de polilinha (`polylineRef.current.setPath(...)`) e marcadores (`setPosition`) com throttle de movimento (`>= 20m` ou `15s`) e `fitBounds` único por rota.
  - Memorização de `stableCoords` (`originLat/originLng` e `destLat/destLng`) por protocolo/ID do agendamento no `LiveAppointmentTrackingHub.tsx`.

---

## 4. Script SQL Master & Governança da Tríade (`supabase_master_convergence_20261023.sql` & `AdminTriadeGovernance.tsx`)
- Atualizar `supabase_master_convergence_20261023.sql` garantindo as colunas físicas `latitude DOUBLE PRECISION`, `longitude DOUBLE PRECISION`, `formatted_address TEXT` e `google_place_id TEXT` em `public.salons`, `public.clients`, `public.professionals`, `public.profiles`, `public.salon_users` e `public.system_admins`, além de índices espaciais rápidos e trigger de sincronização de endereço/coordenadas por CPF.
- Registrar o Comunicado Recebido do `mnvapp` (`bol-023`) e emitir o Comunicado Oficial Cruzado do `admvapp` (`bol-024`) para `mnvapp` e `pvapp` em `AdminTriadeGovernance.tsx` e `CHANGELOG.md`.
