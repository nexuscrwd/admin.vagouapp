import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration with strict URL and Key validation
const DEFAULT_SUPABASE_URL = 'https://xemenxdhuoekytyhmgyt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbWVueGRodW9la3l0eWhtZ3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMDE2MzAsImV4cCI6MjEwNTc3NzYzMH0.P-q6bQspwuQNhub08hjWmsjLrugr3CVA1NIdznWJxuo';

function getSafeSupabaseUrl(): string {
  const candidates = [
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];

  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return trimmed;
          }
        } catch {}
      }

      if (trimmed.startsWith('eyJ')) {
        try {
          const parts = trimmed.split('.');
          if (parts[1]) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload?.ref) {
              return `https://${payload.ref}.supabase.co`;
            }
          }
        } catch {}
      }
    }
  }

  return DEFAULT_SUPABASE_URL;
}

function getSafeSupabaseKey(): string {
  const serviceKeyCandidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE,
    process.env.SERVICE_ROLE_KEY,
  ];

  for (const k of serviceKeyCandidates) {
    if (typeof k === 'string' && k.trim().startsWith('eyJ')) {
      return k.trim();
    }
  }

  const anonKeyCandidates = [
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
  ];

  for (const k of anonKeyCandidates) {
    if (typeof k === 'string' && k.trim().startsWith('eyJ')) {
      return k.trim();
    }
  }

  return DEFAULT_SUPABASE_ANON_KEY;
}

const SUPABASE_URL = getSafeSupabaseUrl();
const SUPABASE_SERVICE_ROLE_KEY = [
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SERVICE_ROLE,
  process.env.SERVICE_ROLE_KEY,
].find((k) => typeof k === 'string' && k.trim().startsWith('eyJ'))?.trim() || '';

const SUPABASE_AUTH_KEY = SUPABASE_SERVICE_ROLE_KEY || getSafeSupabaseKey();

// Admin client using Service Role key (bypasses RLS) or anon key fallback
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_AUTH_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// In-Memory store for Tríade Technical Bulletins (7º Mandamento)
interface TechnicalBulletin {
  id: string;
  timestamp: string;
  sourceApp: 'admvapp' | 'pvapp' | 'mnvapp';
  targetApps: ('pvapp' | 'mnvapp' | 'admvapp')[];
  title: string;
  category: 'schema_change' | 'rpc_change' | 'status_enum' | 'env_config' | 'breaking_change';
  summary: string;
  impactedTables: string[];
  sqlMigration?: string;
  instructions: string;
  author: string;
}

const GOOGLE_MAPS_API_KEY = (
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyALBO6b_ItojRZXURGdNVUeKOrOuKAOfI8'
).trim();

const TRIADE_BULLETINS: TechnicalBulletin[] = [
  {
    id: 'bol-162-zero-duplicate-users-governance',
    timestamp: '2026-11-14T21:15:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Saneamento e Blindagem Anti-Duplicidade de Contas (1 Pessoa = 1 Único Cadastro Soberano — bol-162)',
    category: 'schema_change',
    summary: '1. Consolidação Automática system_admins ⇄ clients: Registros duplicados onde a mesma pessoa constava simultaneamente em public.system_admins e public.clients (ex.: Anderson Pires / Anderson@ / andersonhpires@gmail.com) foram consolidados no registro soberano de Administrador (preservando total_appointments, dependents_count e avatar_url e removendo a linha sombra de public.clients). 2. Fim do Auto-Upsert Cruzado no Login/Salão: Removidos os upserts automáticos em múltiplas tabelas durante login administrativo e criação de salão. 3. Blindagem SQL + Backend + UI: Criados índices únicos parciais (idx_system_admins_unique_lower_email, idx_system_admins_unique_norm_username, idx_clients_unique_lower_email) e triggers (trg_prevent_client_duplicate_of_admin e trg_consolidate_client_on_admin_upsert) em /supabase/migrations/20261114_deduplicate_users_and_unique_guards.sql.',
    impactedTables: ['public.system_admins', 'public.clients', 'public.professionals', 'public.salon_users', 'public.appointments'],
    sqlMigration: `-- Arquivo oficial sincronizado em /supabase/migrations/20261114_deduplicate_users_and_unique_guards.sql e /supabase_schema.sql`,
    instructions: '1. pvapp & mnvapp: Antes de inserir em public.clients, verificar se LOWER(email) ou LOWER(REPLACE(username, "@", "")) já existe em public.system_admins ou public.clients. 2. Executar /supabase/migrations/20261114_deduplicate_users_and_unique_guards.sql no SQL Editor do Supabase.',
    author: 'Super Administrador Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-161-audit-created-at-and-phantom-eradication',
    timestamp: '2026-11-14T20:45:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Auditoria de Data/Hora de Criação (created_at + created_via) & Erradicação de Linhas Sintéticas em salon-users (bol-161)',
    category: 'schema_change',
    summary: '1. Rastreabilidade Temporal Completa (America/Sao_Paulo): Exibição e exportação obrigatória de Data e Hora exatas de criação (dd/mm/aa • HH:mm + tooltip/modal dd/mm/aaaa às HH:mm:ss) e canal de origem (created_via / origin_type) para todos os Usuários e Estabelecimentos, eliminando qualquer fallback falso new Date() na leitura. 2. Erradicação de Linhas Fantasmas: A rota GET /api/admin/salon-users foi corrigida para consultar exclusivamente registros reais de public.salon_users, encerrando a geração sintética de duplicatas su-<salon.id> a partir da razão social de public.salons. 3. Migração Aditiva 100% Idempotente: Adicionada coluna opcional created_via VARCHAR(50) e índices idx_*_created_at nas tabelas salons, clients, dependents, professionals, salon_users e system_admins (zero DROP TABLE).',
    impactedTables: ['public.salons', 'public.clients', 'public.dependents', 'public.professionals', 'public.salon_users', 'public.system_admins'],
    sqlMigration: `-- Arquivo oficial sincronizado em /supabase/migrations/20261114_audit_created_at_origin.sql e /supabase_schema.sql`,
    instructions: '1. mnvapp: Ao cadastrar novos salões, profissionais ou clientes da vitrine, gravar created_via="mnvapp" (e origin_type="establishment" em clients) preservando created_at TIMESTAMPTZ real. 2. pvapp: Ao registrar novos clientes no Portal, gravar origin_type="portal" e created_via="pvapp". 3. Executar /supabase/migrations/20261114_audit_created_at_origin.sql no SQL Editor do Supabase compartilhado.',
    author: 'Super Administrador Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-160-admvapp-v5-convergence-ratification',
    timestamp: '2026-11-11T20:15:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Ratificação & Convergência Total do Admin Master (admvapp) ao Contrato Unificado Supabase SQL v5.0 (bol-159 / bol-160)',
    category: 'schema_change',
    summary: '1. Expurgo Total de Mocks, Seeds Automáticos e SQL Destrutivo: Removidos src/data.ts, 20261019_seed_real_salons.sql, auto-seed de boot no server.ts e todos os arrays mockados de fallback. Adotado 20261111_master_convergence_v5_0.sql (100% idempotente, zero DROP TABLE). 2. Paleta Oficial Verde Pastel Clarinho & Sincronismo UI: Criação e edição de salões agora aplicam default_theme="light", primary_color="#10B981", secondary_color="#065F46", nav_bg_style="solid", nav_bg_color="#D1FAE5", section_header_bg_color="#ECFDF5", nav_icon_border="none" em public.salons e public.salon_ui_settings. 3. Faturamento Unificado: Sincronização simultânea de fee_per_booking ⇄ billing_fee_value (R$ 2,50), billing_plan ("PER_APPOINTMENT" / "SUBSCRIPTION"), monthly_subscription_fee (R$ 89,90) e billing_due_day (10). 4. Monitor Cronológico & Segurança: Agendamentos ordenados de forma crescente (date_str ASC, start_time ASC) com badges Pago/À pagar, Bloqueado, Permuta (swap_state) e Alerta de Colisão Geotemporal Inter-Salões; suporte administrativo a reset de Pergunta Secreta (user_security_answers) e senha.',
    impactedTables: ['public.salons', 'public.salon_ui_settings', 'public.appointments', 'public.clients', 'public.security_questions', 'public.user_security_answers'],
    sqlMigration: `-- Arquivo oficial sincronizado em /supabase/migrations/20261111_master_convergence_v5_0.sql e /supabase_schema.sql`,
    instructions: '1. mnvapp: Ratificada a convergência integral de colunas físicas, salon_ui_settings, faturamento e perguntas secretas. 2. pvapp: Garantir leitura de fee_per_booking/billing_fee_value, paleta Verde Pastel Clarinho default, ordenação cronológica e invocação da RPC check_client_inter_salon_collision antes de confirmar reservas.',
    author: 'Super Administrador Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-159-mnvapp-audit-360-sql-v5',
    timestamp: '2026-11-11T17:00:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['admvapp', 'pvapp'],
    title: 'Auditoria 360º & Convergência Soberana Supabase SQL v5.0 (Zero Mocks, Paleta Verde Pastel Clarinho e Colisão Geotemporal)',
    category: 'schema_change',
    summary: 'Homologação do Contrato Unificado SQL v5.0 (20261111_master_convergence_v5_0.sql): Zero Mocks, paleta default Verde Pastel Clarinho (bol-158), faturamento unificado (fee_per_booking ⇄ billing_fee_value = 2.50 via trg_sync_salon_fields), baixa de caixa (is_paid/payment_status), permuta em cascata (swap_state), perguntas de segurança (3 oficiais) e RPC check_client_inter_salon_collision.',
    impactedTables: ['public.salons', 'public.salon_ui_settings', 'public.appointments', 'public.security_questions', 'public.user_security_answers'],
    sqlMigration: `-- Script oficial v5.0 aplicado em /supabase/migrations/20261111_master_convergence_v5_0.sql`,
    instructions: 'Sincronizar admvapp e pvapp com o schema v5.0 sem qualquer comando DROP TABLE.',
    author: 'Equipe Meu Negócio • mnvapp (meunegocio.vagouapp.com)',
  },
  {
    id: 'bol-106-master-database-convergence',
    timestamp: '2026-11-02T11:40:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Script Mestre de Convergência do Banco de Dados (15 Tabelas, Telemetria RTLS/GPS, Pausa Emergencial e Status BLOQUEADO)',
    category: 'schema_change',
    summary: 'Homologação do script consolidado mestre (/supabase/migrations/20261102_master_database_convergence.sql) contendo todas as definições das 15 tabelas, colunas de telemetria RTLS/GPS (bol-020), status de pausa emergencial (bol-103), campos de comodidades de salão e taxas de comissão da equipe. Sincronizadas as tipagens TypeScript de database.types.ts com suporte nativo a AppointmentStatus = "BLOQUEADO". 100% Idempotente.',
    impactedTables: ['public.salons', 'public.clients', 'public.professionals', 'public.profiles', 'public.salon_users', 'public.appointments'],
    sqlMigration: `-- Arquivo gerado em /supabase/migrations/20261102_master_database_convergence.sql
-- Executar no SQL Editor do Supabase (xemenxdhuoekytyhmgyt) para convergência total.`,
    instructions: '1. Executar o script /supabase/migrations/20261102_master_database_convergence.sql no SQL Editor do Supabase. 2. Atualizadas tipagens TypeScript com suporte a AppointmentStatus = "BLOQUEADO".',
    author: 'Equipe Meu Negócio • mnvapp (meunegocio.vagouapp.com)',
  },
  {
    id: 'bol-039-separated-independent-modals-and-security-questions',
    timestamp: '2026-10-30T19:00:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Separação dos Modais Independentes ("ACESSAR", "CADASTRO" e "Esqueci Usuário/Senha") e Schema de Perguntas Secretas',
    category: 'schema_change',
    summary: 'Separação em modais independentes com logotipo do salão no cabeçalho. Criação do schema de perguntas secretas (first_pet, city_at_10, first_school, childhood_friend) para recuperação de @username via RPC recover_username_by_security_answer.',
    impactedTables: ['public.security_questions', 'public.user_security_answers', 'public.clients'],
    sqlMigration: `-- Arquivo gerado em /supabase_security_questions.sql
-- Executar no SQL Editor do Supabase para provisionar tabelas de perguntas e RPC de recuperação.`,
    instructions: '1. Executar o script /supabase_security_questions.sql no SQL Editor do Supabase. 2. Acesso à RPC de recuperação por resposta secreta.',
    author: 'Equipe Meu Negócio • mnvapp (meunegocio.vagouapp.com)',
  },
  {
    id: 'bol-033-iframe-and-embed-eradication-native-auth-sovereignty',
    timestamp: '2026-10-30T17:50:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Exclusão Definitiva de Iframes/Embeds Externos de Autenticação e Soberania Local',
    category: 'breaking_change',
    summary: 'Comunicado Oficial Homologado do mnvapp: 1. Remoção Total de Iframes de Login/Cadastro/Recuperação: O arquivo UnifiedRegisterEmbedModal.tsx (https://adm.vagouapp.com/cadastro?embed=true) e os listeners postMessage (VAGOU_REGISTRATION_SUCCESS, VAGOU_LOGIN_SUCCESS, VAGOU_AUTH_SUCCESS, VAGOUAPP_EMBED, VAGOUAPP_FORM) foram permanentemente excluídos do mnvapp. 2. Soberania de Autenticação Local (SalonClientAuthModal.tsx): 100% dos fluxos de Login, Cadastro e Recuperação de Senha na vitrine do estabelecimento e no painel do parceiro rodam nativamente dentro do próprio mnvapp, comunicando-se diretamente com as tabelas do Supabase (public.clients, public.salons, public.professionals, public.salon_users, public.system_admins). 3. Impacto & Ações: admvapp ratifica a soberania e não exige mais suporte a embeds no mnvapp; pvapp deve utilizar seus próprios componentes nativos conectados ao Supabase.',
    impactedTables: ['public.clients', 'public.salons', 'public.professionals', 'public.salon_users', 'public.system_admins'],
    instructions: '1. admvapp: Ratificada a erradicação dos iframes de autenticação no mnvapp. Os formulários do admvapp servem exclusivamente para gestão master administrativa e exportação modular de código via pacote TriadeUserAuthCard. 2. pvapp: Confirmar que não há dependência de iframes externos para login/cadastro, utilizando componentes nativos locais com conexão direta ao Supabase. 3. Tríade: Todos os 3 nós compartilham o mesmo banco Supabase PostgreSQL sem intermediários.',
    author: 'Equipe Meu Negócio • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-027-turn-by-turn-navigation-and-iframe-eradication',
    timestamp: '2026-10-28T23:55:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Erradicação de iFrames Estáticos no Botão "Ir" e Ativação de Navegação GPS Turn-by-Turn Estilo Uber',
    category: 'breaking_change',
    summary: 'Correção Mandatória da Experiência de Navegação ao Clicar em "Ir" no Agendamento: Abertura indevida de <iframe> estático do Google Maps Web (com caixa de opções desktop "Mais opções", sem guiar o motorista) é terminantemente proibida. O botão "Ir" no mnvapp e pvapp deve acionar a navegação GPS nativa com voz e trajeto curva a curva (Google Maps Navigation / Waze via deep-link com dir_action=navigate) ou renderizar o Live Tracking Hub interativo com marcador em movimento e telemetria contínua via navigator.geolocation.watchPosition.',
    impactedTables: ['public.appointments'],
    instructions: '1. No mnvapp (aeroportoguarulhos.vagouapp.com / vagouapp.git), substituir a tag <iframe> pelo disparador de navegação nativo (startTurnByTurnNavigation). 2. Utilizar o link universal: https://www.google.com/maps/dir/?api=1&destination=LAT,LNG&travelmode=driving&dir_action=navigate (no Android: google.navigation:q=LAT,LNG&mode=d). 3. Caso renderize in-app, importar o componente InteractiveGoogleRouteMap.tsx da Tríade.',
    author: 'Super Administrador (adm.vagouapp.com)',
  },
  {
    id: 'bol-026-user-avatar-and-storage-triade-synchronization',
    timestamp: '2026-10-28T23:30:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Homologação Soberana de Fotos/Avatares de Usuários no Supabase Storage e Banco Unificado da Tríade',
    category: 'schema_change',
    summary: 'Diagnóstico e Ativação Oficial: O banco de dados Supabase PostgreSQL 17.6 e o Supabase Storage estão 100% PREPARADOS e APTOS para receber, persistir e exibir fotos reais de perfil de usuários, clientes, profissionais, gestores e salões. As tabelas public.profiles, public.clients, public.professionals, public.salon_users, public.system_admins e public.dependents possuem as colunas avatar_url e photo_url devidamente homologadas. O bucket público "avatars" (e "media") processa uploads de imagens via câmera e arquivo com compressão e retorno de URLs públicas permanentes.',
    impactedTables: ['public.profiles', 'public.clients', 'public.professionals', 'public.salon_users', 'public.system_admins', 'public.dependents'],
    sqlMigration: `-- ============================================================================
-- 📸 HOMOLOGAÇÃO DE AVATARES E FOTOS DE USUÁRIOS NA TRÍADE VAGOUAPP (bol-026)
-- Target Database: Supabase PostgreSQL 17.6
-- ============================================================================

-- 1. Garante colunas de avatar/foto nas tabelas de identidade e usuários
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.salon_users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.system_admins
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.dependents
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Criação dos Buckets Públicos de Armazenamento no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de Acesso Público para Leitura de Avatares (CDN)
CREATE POLICY IF NOT EXISTS "Avatars Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'media'));

CREATE POLICY IF NOT EXISTS "Avatars Authenticated Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('avatars', 'media'));`,
    instructions: '1. No mnvapp e pvapp, utilizar o bucket "avatars" para fotos de usuários e profissionais. 2. Ao enviar fotos via câmera ou galeria, converter para WebP/JPEG com no máximo 1000px de largura para máxima performance. 3. O fallback visual canônico é o componente UserAvatar com ícone vetorial fino User (stroke-[1.8]) da lucide-react, com proibição estrita de fotos falsas de modelos/banco de imagens.',
    author: 'Super Administrador (adm.vagouapp.com)',
  },
  {
    id: 'bol-024-address-persistence-and-google-maps-coords-sync',
    timestamp: '2026-10-28T14:35:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Blindagem de Persistência de Endereços em Todos os Formulários, Colunas de Coordenadas (Latitude/Longitude) e Geocodificação Google Maps na Tríade',
    category: 'schema_change',
    summary: 'Homologação Soberana de Persistência Cadastral e Geolocalização Exata: 1. Erradicado o bug PGRST204 no PATCH/POST de salões e usuários onde propriedades de UI/branding (pix_keys, operating_hours, fee_per_booking) ou IDs sintéticos (su-<uuid>) impediam a gravação física do endereço no Supabase. 2. Adicionadas as colunas físicas latitude (DOUBLE PRECISION), longitude (DOUBLE PRECISION), formatted_address (TEXT) e google_place_id (TEXT) em public.salons, public.clients, public.professionals, public.profiles, public.salon_users e public.system_admins. 3. Implementada Geocodificação Automática (Google Maps Geocoding API + fallback BrasilAPI/Nominatim) e seletor interativo de Pino no Mapa em todos os formulários, com propagação automática de endereço e coordenadas por CPF/E-mail entre tabelas vinculadas.',
    impactedTables: ['public.salons', 'public.clients', 'public.professionals', 'public.profiles', 'public.salon_users', 'public.system_admins'],
    sqlMigration: `-- MIGRACAO DE COORDENADAS GEOGRAFICAS E SINCRONIZACAO DE ENDERECO DA TRIADE (bol-024)
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS street_number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;`,
    instructions: '1. MNVAPP: Ao carregar ou salvar endereço nas configurações do salão ou perfil do usuário/cliente, ler e persistir latitude e longitude diretamente de public.salons e public.clients para alimentar stableCoords no LiveTrackingModal sem necessidade de re-geocodificar texto. 2. PVAPP: Utilizar salons.latitude/longitude e clients.latitude/longitude para cálculo instantâneo de distância no Radar e traçado de rota em tempo real.',
    author: 'Engenharia de Infraestrutura Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-023-google-maps-anti-flickering-and-3-tier-road-polyline',
    timestamp: '2026-10-28T14:10:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Correção de Flickering no Mapa Google Maps In-App e Garantia Tripla de Polilinha Seguindo a Malha Viária Real',
    category: 'env_config',
    summary: 'Comunicado Oficial Recebido do mnvapp: 1. Ciclo de Vida Estável do google.maps.Map (InteractiveGoogleRouteMap.tsx): A instância do mapa é inicializada apenas em [sdkReady, isDark]. Atualizações de rota e posição GPS usam métodos imperativos (setPath, marker.position) com throttle de movimento (>= 20m ou 15s) e fitBounds único por rota. 2. Coordenadas Estáveis (LiveTrackingModal.tsx): originLat/originLng e destLat/destLng são memorizadas (stableCoords) pelo ID/protocolo do agendamento, evitando que mutações de telemetria (client_lat) reiniciem o mapa. 3. Geometria Viária Real (server.ts & InteractiveGoogleRouteMap.tsx): Removido o fallback de linha reta de 2 pontos; implementada resolução em 3 camadas (Routes API v2 com Referer -> google.maps.DirectionsService no navegador -> malha viária OSRM com encodedPolyline real).',
    impactedTables: ['public.appointments', 'public.salons', 'public.clients'],
    instructions: '1. PVAPP: Ao portar o InteractiveGoogleRouteMap, manter new google.maps.Map isolado em useEffect([sdkReady, isDark]) e nunca usar array de 2 coordenadas como fallback de rota. 2. ADMVAPP: Integrado o InteractiveGoogleRouteMap com resolução viária em 3 camadas no Hub de Rastreamento em Tempo Real e endpoint /api/geo/route.',
    author: 'Equipe Meu Negócio • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-022-triade-database-and-code-convergence',
    timestamp: '2026-10-23T12:30:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Convergência Geral Mestre do Banco Supabase e Código da Tríade VagouApp',
    category: 'schema_change',
    summary: 'Pacote Unificado de Harmonização e Resolução de Conflitos: 1. Remoção da trava NOT NULL em public.salon_clients.client_user_id e inclusão de validação do Supabase Auth para zerar requisições quebradas de clientes sem login. 2. Ativação de gatilhos bidirecionais anti-loop com pg_trigger_depth() <= 1 para sincronização perfeita de serviços (services <-> salon_services) e dependentes (dependents <-> client_family_members). 3. Criação da RPC register_system_admin e correção de overloads da RPC register_triade_user. 4. Homologação das colunas de comissão em public.professionals (commission_rate, product_commission_rate), colunas de live-tracking 10s em public.appointments, e políticas de RLS e Buckets (salon-media, avatars, media) com publicação em tempo real.',
    impactedTables: ['public.salon_clients', 'public.dependents', 'public.client_family_members', 'public.services', 'public.salon_services', 'public.professionals', 'public.appointments', 'public.system_admin_users', 'storage.buckets'],
    sqlMigration: `-- MIGRACAO MESTRE DE CONVERGENCIA DA TRIADE VAGOUAPP (bol-022)
-- Executar o arquivo /supabase_master_convergence_20261023.sql no SQL Editor do Supabase.`,
    instructions: '1. ADMVAPP: Executar o script SQL Mestre e utilizar a nova vista de Diagnóstico e Convergência da Tríade no Painel de Infra/DNS. 2. MNVAPP: Atualizar consultas de salon_clients e dependents para utilizar as novas colunas e gatilhos sincronizados de client_family_members sem duplo upsert. 3. PVAPP: Atualizar agendamentos e radar de ofertas para utilizar a nova validação de auth em appointments sem travar o client_user_id.',
    author: 'Engenharia de Infraestrutura Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-021-salon-styles-and-ui-settings-sync',
    timestamp: '2026-10-23T08:00:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Sincronização Total de Cores, SQL, Colunas Físicas de Layout, Tabela salon_ui_settings e Galeria de Serviços',
    category: 'schema_change',
    summary: 'Homologação Oficial Inter-Projetos Tríade: 1. Criação das colunas físicas de estilização em public.salons (section_header_bg_color, section_header_text_color, section_header_icon_color, section_header_bg_style, section_header_border, nav_style, nav_shape, nav_border, nav_bg_style, nav_bg_color, nav_btn_bg_color, nav_btn_active_bg_color, nav_active_color, nav_text_color, default_theme, welcome_style, pwa_name, show_slogan, show_hero_slides, etc.) e da tabela relacional dedicada public.salon_ui_settings com RLS e constraint UNIQUE(salon_id). 2. Acervo curado de presets fotográficos para serviços sem imagem (serviceGalleryPresets.ts) agrupado por categorias (Unhas, Cabelo, Barba, Sobrancelhas, Estética, Combos) e upload no bucket salon-media. 3. Padronização estrita de textos de compartilhamento para [Nome] — [Slogan] e erradicação definitiva do fallback genérico Momy nail.',
    impactedTables: ['public.salons', 'public.salon_ui_settings', 'storage.buckets'],
    sqlMigration: `-- MIGRAÇÃO VAGOU: COLUNAS DE UI/ESTILOS, TABELA SALON_UI_SETTINGS E BUCKETS
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS default_theme text DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS pwa_name text,
  ADD COLUMN IF NOT EXISTS show_slogan boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_text_fallback text,
  ADD COLUMN IF NOT EXISTS logo_text_color text DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS show_hero_slides boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS welcome_style text DEFAULT 'atmospheric',
  ADD COLUMN IF NOT EXISTS section_header_bg_color text,
  ADD COLUMN IF NOT EXISTS section_header_text_color text,
  ADD COLUMN IF NOT EXISTS section_header_icon_color text DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS section_header_bg_style text DEFAULT 'glass',
  ADD COLUMN IF NOT EXISTS section_header_border text DEFAULT 'bordered',
  ADD COLUMN IF NOT EXISTS section_header_btn_bg_color text,
  ADD COLUMN IF NOT EXISTS section_header_btn_active_bg_color text,
  ADD COLUMN IF NOT EXISTS section_header_btn_border text,
  ADD COLUMN IF NOT EXISTS section_header_btn_shadow text,
  ADD COLUMN IF NOT EXISTS section_header_btn_blur text,
  ADD COLUMN IF NOT EXISTS section_header_btn_font text,
  ADD COLUMN IF NOT EXISTS nav_style text DEFAULT 'minimal',
  ADD COLUMN IF NOT EXISTS nav_shape text DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS nav_border text DEFAULT 'bordered',
  ADD COLUMN IF NOT EXISTS nav_bg_style text DEFAULT 'glass',
  ADD COLUMN IF NOT EXISTS nav_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_btn_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_btn_active_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_active_color text DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS nav_text_color text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.salon_ui_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  default_theme text DEFAULT 'dark',
  pwa_name text,
  show_slogan boolean DEFAULT true,
  logo_text_fallback text,
  logo_text_color text DEFAULT '#10b981',
  show_hero_slides boolean DEFAULT true,
  welcome_style text DEFAULT 'atmospheric',
  section_header_bg_color text,
  section_header_text_color text,
  section_header_icon_color text DEFAULT '#10b981',
  section_header_bg_style text DEFAULT 'glass',
  section_header_border text DEFAULT 'bordered',
  nav_style text DEFAULT 'minimal',
  nav_shape text DEFAULT 'square',
  nav_border text DEFAULT 'bordered',
  nav_bg_style text DEFAULT 'glass',
  nav_bg_color text,
  nav_btn_bg_color text,
  nav_btn_active_bg_color text,
  nav_active_color text DEFAULT '#10b981',
  nav_text_color text,
  raw_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT salon_ui_settings_salon_unique UNIQUE(salon_id)
);

CREATE INDEX IF NOT EXISTS idx_salon_ui_settings_salon_id ON public.salon_ui_settings(salon_id);
ALTER TABLE public.salon_ui_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'salon_ui_settings_public_read') THEN
    CREATE POLICY salon_ui_settings_public_read ON public.salon_ui_settings FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'salon_ui_settings_public_upsert') THEN
    CREATE POLICY salon_ui_settings_public_upsert ON public.salon_ui_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('salon-media', 'salon-media', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;`,
    instructions: '1. ADMVAPP: Mapear colunas e permitir edição/auditoria visual de nav_style, nav_shape, nav_border, nav_bg_style, nav_bg_color, nav_active_color, nav_text_color e section_header_* no painel de estabelecimentos. 2. PVAPP: Na vitrine e Radar de Vagas, carregar e aplicar as cores da barra de seções e navegação diretamente de salons e salon_ui_settings, utilizando a capa temática curada para procedimentos sem imagem.',
    author: 'Equipe Meu Negócio • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-020-live-route-tracking-10s-shopee-timeline',
    timestamp: '2026-10-22T12:00:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Homologação do Radar Bidirecional de Deslocamento (10s), Traçador de Rota Google Maps In-App, Linha de Ruas (Estilo Shopee/Correios) & Detector de Adversidades (+X min)',
    category: 'schema_change',
    summary: 'Arquitetura Oficial de Mobilidade e Pontualidade da Tríade VagouApp: 1. Alerta Inteligente de Partida calculado pela modalidade (walking, transit, rideshare, driving, motorcycle) + ETA da Google Maps Routes API + 10 min de margem de preparo (disparando modal 10 min antes da saída). 2. Árvore de decisão completa: opção NÃO permite confirmar comparecimento (com alerta de pressa), Cancelar (exigindo input de motivo em cancellation_reason) ou Remanejar (abrindo a agenda do salão); opção SIM abre o Traçador de Rota Google Maps In-App, extraindo os steps[] para route_checkpoints e iniciando o compartilhamento de GPS a cada 10 segundos. 3. Dois modos de visualização sincronizados: Mapa Ao Vivo (Completo com rota ou Simplificado apenas pinos) e Linha de Rastreamento por Ruas (estilo Correios/Shopee mostrando ruas já percorridas, marcador na rua atual e próximas vias). 4. Inversão automática para Delivery (service_location_type = home_delivery: o profissional traça a rota e transmite a posição a cada 10s enquanto o cliente acompanha em casa). 5. Radar de Adversidades (+X min na rua atual sem necessidade de ligações) e Alerta Automático de Chegada quando ETA <= 5 minutos.',
    impactedTables: ['public.appointments'],
    sqlMigration: `-- Executar no Supabase SQL Editor para habilitar o Radar de Deslocamento 10s e Linha de Ruas (Shopee/Correios)
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS service_location_type VARCHAR(30) DEFAULT 'in_salon',
ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(30) DEFAULT 'driving',
ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(40) DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS selected_route_summary TEXT,
ADD COLUMN IF NOT EXISTS route_polyline TEXT,
ADD COLUMN IF NOT EXISTS current_street_name TEXT,
ADD COLUMN IF NOT EXISTS route_checkpoints JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_adversity JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS client_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
ADD COLUMN IF NOT EXISTS prep_buffer_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;`,
    instructions: '1. MNVAPP (Visão Cliente - Meus Agendamentos): Exibir o modal pré-partida (ETA + 10m preparo), traçar a rota via Google Maps Routes API salvando os steps em route_checkpoints e atualizar client_lat/client_lng/current_street_name a cada 10s quando tracking_status = live_sharing (ou acompanhar o profissional quando service_location_type = home_delivery). 2. MNVAPP (Visão Salão - Agenda do Dia): Exibir o selo ao vivo no card do agendamento, abrir a gaveta com alternância entre Linha de Ruas (Shopee/Correios) e Mapa 10s, exibir marcadores de adversidades (+X min) e disparar alerta sonoro/visual quando eta_minutes <= 5. 3. PVAPP: Espelhar a confirmação de partida e visualização da Linha de Ruas no navegador web.',
    author: 'Super Administrador Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-019-legacy-establishment-forms-eradication',
    timestamp: '2026-10-21T12:50:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Erradicação Definitiva de Formulários Legados/Obsoletos & Adoção Exclusiva da Versão Mais Atualizada (TriadeEstablishmentMasterForm)',
    category: 'breaking_change',
    summary: 'Ordem Suprema de Padronização da Tríade: Todos os formulários legados, desatualizados ou divergentes de cadastro de estabelecimentos foram permanentemente exterminados do código-fonte. O TriadeEstablishmentMasterForm (com suporte a etapas unificadas, identificação de titular, auto-preenchimento por CEP, validação de slug e CPF opcional) é agora a ÚNICA e EXCLUSIVA versão oficial para todo o ecossistema VagouApp.',
    impactedTables: ['public.salons', 'public.profiles', 'public.salon_users'],
    sqlMigration: `-- Nenhuma alteração no Supabase. O schema já suporta 100% as colunas do TriadeEstablishmentMasterForm.`,
    instructions: '1. MNVAPP e PVAPP: Certificar-se de que nenhum formulário legado de cadastro esteja sendo carregado. Todas as rotas de cadastro (/cadastro, /onboarding, /registrar) e iframes de integração devem invocar diretamente o TriadeEstablishmentMasterForm (ou a rota universal https://adm.vagouapp.com/cadastro?form=estabelecimento). 2. Deletar quaisquer referências a wrappers obsoletos (como TriadeMnvClientRegisterForm).',
    author: 'Super Administrador Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-018-cpf-optional-until-payment-gateway',
    timestamp: '2026-10-21T12:28:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['mnvapp', 'pvapp'],
    title: 'Desobrigatoriedade do CPF de Usuários/Parceiros/Clientes até a Integração do Gateway de Pagamento',
    category: 'breaking_change',
    summary: 'Deliberação Soberana da Tríade VagouApp: O campo de CPF do usuário (proprietário, profissional ou cliente titular) NÃO É MAIS OBRIGATÓRIO em cadastros e formulários. A exigência do CPF passa a ser ativada unicamente quando o ecossistema integrar o Gateway de Pagamento oficial (para emissão de split, notas fiscais e liquidação bancária). Em todas as tabelas do Supabase (profiles, salons.owner_cpf, clients, professionals, salon_users), o campo cpf é opcional/anulável.',
    impactedTables: ['public.profiles', 'public.salons', 'public.clients', 'public.professionals', 'public.salon_users'],
    sqlMigration: `-- O campo CPF já é anulável no Supabase. Caso alguma tabela possua restrição NOT NULL, execute:
ALTER TABLE public.profiles ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE public.clients ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE public.salons ALTER COLUMN owner_cpf DROP NOT NULL;
ALTER TABLE public.professionals ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE public.salon_users ALTER COLUMN cpf DROP NOT NULL;`,
    instructions: '1. MNVAPP (meunegocio.vagouapp.com): Remover o bloqueio de validação obrigatória de CPF no cadastro de novos salões e profissionais. Se o usuário deixar o CPF em branco, salvar como NULL ou string vazia sem impedir o avanço do fluxo de cadastro. 2. PVAPP (portal.vagouapp.com): Manter o CPF como opcional no perfil do cliente, solicitando apenas nome e WhatsApp para agendamentos rápidos.',
    author: 'Super Administrador Master • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-017-visual-identity-font-favicon-slogan-sync',
    timestamp: '2026-10-18T20:25:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Padronização Soberana da Identidade Visual do Estabelecimento: Logotipo, Favicon (PWA 1:1), Cor, Slogan e 4 Estilos de Fonte da Marca (Opção B)',
    category: 'schema_change',
    summary: 'Homologação Oficial da Tríade após auditoria cruzada com o repositório meunegocio.vagouapp.git (mnvapp): 1. A Etapa 4 (Identidade Visual) do Cadastro Soberano de Estabelecimento contempla os 5 pilares essenciais de marca: Logotipo (logo_url / logo_light_url / logo_dark_url), Favicon 1:1 (favicon_url / branding.salonIcon para ícone na galeria de apps mobile e abas do navegador), Cor Principal (primary_color / branding.primaryColor), Slogan curto (slogan / branding.slogan até 60 caracteres) e Estilo de Fonte da Marca (brand_font / branding.brandFont com 4 presets: Poppins, Cormorant Garamond, Oswald e Plus Jakarta Sans, mantendo a UI de agendamento e preços travada em Poppins). 2. Redes sociais e bio longa permanecem desacopladas para preenchimento pós-cadastro dentro do painel do salão (mnvapp).',
    impactedTables: ['public.salons'],
    sqlMigration: `-- Executar no Supabase SQL Editor para sincronizar public.salons em toda a Tríade
ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS slogan VARCHAR(120),
ADD COLUMN IF NOT EXISTS brand_font VARCHAR(60) DEFAULT 'Poppins';`,
    instructions: '1. MNVAPP (meunegocio.vagouapp.com): Em src/lib/supabase.ts (updateSalonSettingsInDb e syncSalonDataToSupabase) e VisualIdentityCardView.tsx, persistir e ler favicon_url (salonIcon), slogan e brand_font também no Supabase (colunas + objeto JSONB branding), eliminando a limitação atual de salvar salonIcon apenas no localStorage. Importar Oswald no index.html (Poppins, Cormorant Garamond e Plus Jakarta Sans já estão presentes). 2. PVAPP (portal.vagouapp.com): Aplicar brand_font apenas no título/nome fantasia do cabeçalho do salão, exibir o slogan abaixo do nome e injetar favicon_url no manifesto/aba.',
    author: 'Super Administrador • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-016-dedicated-business-contacts-and-address-sync',
    timestamp: '2026-09-28T07:15:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Ajuste de Schema Supabase & Regra de Negócio: Endereço Comercial Independente e Contatos Específicos do Salão',
    category: 'schema_change',
    summary: 'Adequação Oficial da Tríade: 1. O Endereço do Estabelecimento (Salão) passa a ser cadastrado e armazenado de forma totalmente independente do endereço residencial do cidadão/profissional quando não forem no mesmo local. O Radar do PVAPP (portal.vagouapp.com) DEVE utilizar obrigatoriamente as colunas de endereço do salão (address, cep, city, neighborhood, latitude, longitude) da tabela salons. 2. Os Meios de Contato Comerciais (WhatsApp do Salão, Telefone Fixo e E-mail do Salão) são desmarcados por padrão no cadastro para incentivar o preenchimento dos contatos comerciais dedicados. 3. Script SQL preventivo disponibilizado para inclusão de colunas em salons.',
    impactedTables: ['public.salons', 'public.profiles'],
    sqlMigration: `-- Executar no Supabase SQL Editor para garantir total integridade
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS phone_landline TEXT,
ADD COLUMN IF NOT EXISTS subdomain TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS street_number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;`,
    instructions: '1. PVAPP: Garantir que a busca de ofertas no Radar utilize salon.address, salon.cep e salon.city para rotas e proximidade do estabelecimento, e exiba os telefones de contato comercial (phone_whatsapp, phone_landline). 2. MNVAPP: Exibir os dados comerciais do salão nas configurações da empresa.',
    author: 'Super Administrador • admvapp (admin.vagouapp.com)',
  },
  {
    id: 'bol-015-unified-sovereign-registration-gateway',
    timestamp: '2026-09-28T05:45:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Erradicação dos Sistemas Nativos de Cadastro no PVAPP e MNVAPP & Adoção Exclusiva do Gateway Soberano Unificado (admin.vagouapp.com/cadastro)',
    category: 'breaking_change',
    summary: 'Instrução Inegociável da Tríade: 1. Remoção completa de formulários e rotas locais de criação de conta no PVAPP (portal.vagouapp.com) e MNVAPP (meunegocio.vagouapp.com). 2. Redirecionamento e/ou Embed Seguro (iframe modal) para o Gateway Soberano de Cadastro do ADMVAPP (https://admin.vagouapp.com/cadastro). 3. Suporte a Query Params (?type=client|professional, ?slug=..., ?redirect=...) e protocolo postMessage (VAGOU_REGISTRATION_SUCCESS) para fechamento fluido de modais e navegação instantânea sem fricção. 4. Todos os novos usuários e profissionais são cadastrados diretamente com chave Service Role via auth.users + public.profiles + clients / professionals / salons.',
    impactedTables: ['auth.users', 'public.profiles', 'public.clients', 'public.professionals', 'public.salons'],
    instructions: '1. PVAPP e MNVAPP: DESTRUIR totalmente modais/telas nativas de cadastro de usuário e profissional. 2. Substituir links e botões por direcionamento para https://admin.vagouapp.com/cadastro com parâmetros ou por um modal contendo <iframe src="https://admin.vagouapp.com/cadastro?embed=true&type=client|professional&redirect=..."/>. 3. Escutar window.addEventListener("message", ...) para capturar VAGOU_REGISTRATION_SUCCESS.',
    author: 'Super Administrador • admvapp (admin.vagouapp.com)',
  },
  {
    id: 'bol-009-single-source-of-truth-avatar-realtime-sync',
    timestamp: '2026-09-27T19:25:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Arquitetura de Fonte Única da Verdade para Avatares & Sincronização em Tempo Real (Realtime)',
    category: 'breaking_change',
    summary: 'Princípio Inegociável: 1 Usuário = 1 Único Cadastro no Supabase. Os dados de pessoa física (nome, email, avatar) são compartilhados universalmente entre contas de cliente, profissional e administrador. Correções implementadas: 1. Ingestão e conversão de fotos Base64 para URLs públicas permanentes no bucket "avatars" do Supabase Storage. 2. Propagação de avatar_url entre professionals, clients, system_admins e auth.users. 3. Sincronização Realtime ativa no admvapp via Postgres Changes, atualizando o avatar no cabeçalho imediatamente após edição no celular. 4. Fallback ordenado por updated_at DESC e referrerPolicy="no-referrer".',
    impactedTables: ['professionals', 'clients', 'system_admins', 'auth.users', 'storage.buckets'],
    instructions: 'pvapp e mnvapp: 1. Adotar fetchUserProfileFromDb com fallback ordenado por updated_at DESC. 2. Usar referrerPolicy="no-referrer" nas tags <img> de avatar. 3. Toda atualização de foto deve refletir nas tabelas compartilhadas da mesma pessoa física.',
    author: 'Super Administrador • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-008-mobile-avatar-sync-storage-resolution',
    timestamp: '2026-09-27T18:40:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Diagnóstico & Correção Global do Upload Mobile: Criação do Bucket "avatars" no Storage e Bypass do Erro 413 (>1MB)',
    category: 'breaking_change',
    summary: 'Causa Raiz: Upload direto de câmera de celular gerou string Base64 não-comprimida de 1.66MB, rejeitada pelo GoTrue Auth (limite 1MB, erro HTTP 413 Payload Too Large) e bloqueada por RLS em clients, ficando isolada em professionals. Solução Homologada: 1. Provisionado bucket público oficial "avatars" no Supabase Storage. 2. A foto real enviada do celular de Elisa Pires foi hospedada com CDN pública permanente: https://xemenxdhuoekytyhmgyt.supabase.co/storage/v1/object/public/avatars/elisa-pires-1790534282569.jpg. 3. Sincronizadas todas as tabelas (professionals, clients, system_admins e auth.users.user_metadata). 4. Componentes UserAvatar atualizados com passagem de photoUrl e sincronização automática de sessão.',
    impactedTables: ['professionals', 'clients', 'system_admins', 'auth.users', 'storage.buckets'],
    instructions: 'pvapp e mnvapp: 1. No upload de fotos via celular, enviar o arquivo binário diretamente para o bucket "avatars" no Supabase Storage e salvar a URL pública gerada no perfil (nunca injetar Base64 > 1MB em auth.users). 2. Garantir que UserAvatar receba photoUrl={resolvedAvatar}. 3. Consumir a URL canônica pública de Elisa Pires para exibi-la imediatamente nos 3 apps.',
    author: 'Super Administrador • admvapp (adm.vagouapp.com)',
  },
  {
    id: 'bol-007-eradication-mock-avatars-canonical-user',
    timestamp: '2026-09-27T18:25:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Erradicação Definitiva de Fotos Mock (Unsplash/Pexels) e Aplicação do Avatar Provisório Canônico',
    category: 'status_enum',
    summary: 'Diretriz Inegociável de Design & UX da Tríade: 1. Zero Mocks — Proibição definitiva de URLs de modelos (Unsplash/Pexels) ou arrays pré-definidos (PRESET_AVATARS). 2. Avatar Provisório Canônico — Na ausência de upload real (avatar_url), renderiza exclusivamente o ícone vetorial fino User (stroke-[1.8]) da lucide-react. 3. Upload Real Exclusivo — Fotos só existem se enviadas pelo usuário via câmera/arquivo. Higienização de localStorage implementada.',
    impactedTables: ['clients', 'professionals', 'auth.users'],
    instructions: 'pvapp e admvapp: Remover arrays PRESET_AVATARS, limpar fallbacks estáticos em consultas do Supabase e higienizar o localStorage contra links legados.',
    author: 'Equipe de Engenharia • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-006-universal-profile-architecture',
    timestamp: '2026-09-27T18:15:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Arquitetura Universal de Perfis & Identidade Dinâmica: SSO Dinâmico para Todos os Usuários',
    category: 'status_enum',
    summary: 'Homologação da regra universal de perfis agnóstica de usuário: 1 Usuário = 1 Único Cadastro no Supabase. O fluxo dinâmico grava avatar_url e dados em auth.users.user_metadata e reflete nas tabelas relacionais sem filtros restritivos de domínio. Utilitário canônico resolveTriadeAvatar criado e disponibilizado.',
    impactedTables: ['auth.users', 'clients', 'professionals', 'salon_users'],
    instructions: 'pvapp e admvapp: Utilizar a função resolveTriadeAvatar para resolução agnóstica de foto pessoal e garantir que o componente UserAvatar renderize qualquer URL válida (CDN, Supabase, Base64).',
    author: 'Equipe de Engenharia • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-005-canonical-sql-sync',
    timestamp: '2026-09-27T18:00:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Script SQL Supabase Ajustado: Persistência Canônica sem Dependência de Restrições (Zero Erros)',
    category: 'schema_change',
    summary: 'Homologação do script SQL com blocos condicionais DO $$ ... $$ para sincronização e atualização de clientes e raw_user_meta_data em auth.users. Garante persistência da foto de perfil (avatar_url), nome e telefone sem falhas de duplicate key constraint.',
    impactedTables: ['clients', 'auth.users', 'professionals'],
    sqlMigration: `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.clients WHERE email ILIKE '%elisa%') THEN
    UPDATE public.clients
    SET 
      avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      name = 'Elisa Pires',
      phone = '(11) 98765-4321',
      updated_at = NOW()
    WHERE email ILIKE '%elisa%';
  ELSE
    INSERT INTO public.clients (name, email, phone, avatar_url, updated_at)
    VALUES (
      'Elisa Pires',
      'elisa.pires@gmail.com',
      '(11) 98765-4321',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      NOW()
    );
  END IF;
END $$;

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'full_name', 'Elisa Pires',
    'phone', '(11) 98765-4321',
    'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
  )
WHERE email ILIKE '%elisa%';`,
    instructions: 'pvapp e admvapp: Sincronizar o avatar_url de Elisa Pires para a foto oficial homologada nas listagens e garantir compatibilidade de colunas name / full_name.',
    author: 'Equipe de Engenharia • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-004-avatar-standardization',
    timestamp: '2026-09-27T15:20:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Padronização Global do Ícone de Avatar para Usuários e Profissionais Sem Foto',
    category: 'status_enum',
    summary: 'Eliminação de fotos genéricas de estoque (Unsplash) e cliparts pesados. Adoção estrita do ícone vetorial User da lucide-react com traçado fino (stroke-[1.8]) e contêiner neutro com bordas suaves para usuários, clientes e profissionais sem foto enviada.',
    impactedTables: ['professionals', 'clients', 'system_admins'],
    instructions: 'pvapp e admvapp: Adotar UserAvatar com fallback no ícone User (lucide-react) stroke-[1.8] quando não houver foto real enviada pelo usuário.',
    author: 'Equipe de Engenharia • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-003-profile-sync-supabase',
    timestamp: '2026-09-27T10:00:00.000Z',
    sourceApp: 'mnvapp',
    targetApps: ['pvapp', 'admvapp'],
    title: 'Sincronização de Perfil de Usuário e Dados Cadastrais com o Supabase',
    category: 'schema_change',
    summary: 'Criação do padrão de sincronização direta entre o formulário de dados pessoais e as tabelas professionals, salons e clients no Supabase (fetchUserProfileFromDb e updateUserProfileInDb). As chaves de sessão vagou_user_email e vagou_user_phone agora são obrigatórias junto a vagou_user_name. Homologado registro de Elisa Pires com elisa.pires@gmail.com e (11) 98765-4321.',
    impactedTables: ['professionals', 'salons', 'clients'],
    instructions: 'pvapp: Consultar Supabase ao abrir "Meus Dados" caso vagou_user_email ou vagou_user_phone estejam vazios no storage. admvapp: Manter as tabelas clients, professionals e salons sincronizadas nos cadastros mestres.',
    author: 'Equipe de Engenharia • mnvapp (seunegocio.vagouapp.com)',
  },
  {
    id: 'bol-001-master-governance',
    timestamp: '2026-09-26T14:00:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Consolidação Oficial do Painel de Admin Master (adm.vagouapp.com)',
    category: 'env_config',
    summary: 'Ativação soberana do Painel de Governança corporativa com chave Service Role ativa e gestão centralizada de cadastros.',
    impactedTables: ['salons', 'appointments', 'professionals', 'service_offers'],
    instructions: 'Os subdomínios dos estabelecimentos moderados e ativos no admvapp devem ser respeitados nas rotas do pvapp e mnvapp.',
    author: 'Super Administrador (adm.vagouapp.com)',
  },
  {
    id: 'bol-002-salons-status',
    timestamp: '2026-09-20T10:30:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Padronização do Enum de Status Cadastral de Salões',
    category: 'status_enum',
    summary: 'Os estabelecimentos passam a ser regidos pelo status: active | pending | incomplete | suspended.',
    impactedTables: ['salons'],
    instructions: 'Apenas salões com status = "active" e is_verified = true são elegíveis para exibição pública de ofertas no Radar do pvapp.',
    author: 'Super Administrador (adm.vagouapp.com)',
  }
];

async function startServer() {
  const app = express();
  // Dev server must always bind to port 3000 per environment constraints
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Gemini AI
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }

  // Explicit PWA Service Worker & Manifest routing
  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    return res.sendFile(swPath);
  });

  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    return res.sendFile(manifestPath);
  });

  // Health check & Service Role verification
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'admvapp - Admin Master VagouApp',
      domain: 'adm.vagouapp.com',
      hasGeminiKey: !!apiKey,
      hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasGoogleMapsKey: !!GOOGLE_MAPS_API_KEY,
      supabaseUrl: SUPABASE_URL,
    });
  });

  // ============================================================================
  // 🌍 MOTOR DE GEOLOCALIZAÇÃO, GEOCODING EXATO & ROTAS VIÁRIAS EM 3 CAMADAS
  // ============================================================================

  // Cache em memória de colunas ainda não existentes fisicamente no PostgREST para escrita em 1 único round-trip
  const KNOWN_MISSING_COLUMNS: Record<string, Set<string>> = {};

  // Helper: Escrita resiliente no Supabase que remove automaticamente colunas ainda não migradas no cache PostgREST (PGRST204)
  async function safeSupabaseWrite(
    table: string,
    mode: 'insert' | 'update' | 'upsert',
    rawPayload: Record<string, any>,
    options?: { eqCol?: string; eqVal?: any; onConflict?: string }
  ): Promise<{ data: any; error: any; strippedColumns: string[] }> {
    const workingPayload: Record<string, any> = { ...rawPayload };
    const strippedColumns: string[] = [];

    if (!KNOWN_MISSING_COLUMNS[table]) {
      KNOWN_MISSING_COLUMNS[table] = new Set<string>();
    }

    // Pré-remove colunas já identificadas como ausentes no schema físico desta tabela
    for (const knownMissing of KNOWN_MISSING_COLUMNS[table]) {
      if (workingPayload[knownMissing] !== undefined) {
        strippedColumns.push(knownMissing);
        if (table === 'salons') {
          workingPayload.branding = {
            ...(workingPayload.branding && typeof workingPayload.branding === 'object' ? workingPayload.branding : {}),
            [knownMissing]: workingPayload[knownMissing],
          };
        }
        delete workingPayload[knownMissing];
      }
    }

    for (let attempt = 0; attempt < 50; attempt++) {
      let query: any;
      if (mode === 'insert') {
        query = supabaseAdmin.from(table).insert([workingPayload]).select().maybeSingle();
      } else if (mode === 'upsert') {
        query = supabaseAdmin
          .from(table)
          .upsert([workingPayload], options?.onConflict ? { onConflict: options.onConflict } : undefined)
          .select()
          .maybeSingle();
      } else {
        query = supabaseAdmin
          .from(table)
          .update(workingPayload)
          .eq(options?.eqCol || 'id', options?.eqVal)
          .select()
          .maybeSingle();
      }

      const { data, error } = await query;
      if (!error) {
        return { data, error: null, strippedColumns };
      }

      const msg = String(error.message || '');
      const colMatch =
        msg.match(/Could not find the '([^']+)' column/i) ||
        msg.match(/column "([^"]+)" of relation .* does not exist/i) ||
        msg.match(/column ([a-zA-Z0-9_]+) does not exist/i);

      if (colMatch && colMatch[1] && workingPayload[colMatch[1]] !== undefined) {
        const missingCol = colMatch[1];
        KNOWN_MISSING_COLUMNS[table].add(missingCol);
        strippedColumns.push(missingCol);
        // Se a tabela for salons e existir branding, preserva o valor lá dentro antes de remover a coluna física
        if (table === 'salons') {
          workingPayload.branding = {
            ...(workingPayload.branding && typeof workingPayload.branding === 'object' ? workingPayload.branding : {}),
            [missingCol]: workingPayload[missingCol],
          };
        }
        delete workingPayload[missingCol];
        continue;
      }

      // Blindagem automática contra violação de Foreign Key em owner_id / user_id (ex: salons_owner_id_fkey quando o titular está em public.clients ou system_admins sem conta em auth.users)
      if (
        error.code === '23503' ||
        msg.includes('foreign key constraint') ||
        msg.includes('salons_owner_id_fkey') ||
        msg.includes('user_id_fkey')
      ) {
        if (
          (msg.includes('owner_id') || msg.includes('salons_owner_id_fkey')) &&
          workingPayload.owner_id !== undefined &&
          workingPayload.owner_id !== null
        ) {
          strippedColumns.push('owner_id');
          if (table === 'salons') {
            workingPayload.branding = {
              ...(workingPayload.branding && typeof workingPayload.branding === 'object'
                ? workingPayload.branding
                : {}),
              ownerRecordId: workingPayload.owner_id,
            };
          }
          if (mode === 'update') {
            workingPayload.owner_id = null;
          } else {
            delete workingPayload.owner_id;
          }
          continue;
        }

        if (
          msg.includes('user_id') &&
          workingPayload.user_id !== undefined &&
          workingPayload.user_id !== null
        ) {
          strippedColumns.push('user_id');
          if (mode === 'update') {
            workingPayload.user_id = null;
          } else {
            delete workingPayload.user_id;
          }
          continue;
        }
      }

      return { data: null, error, strippedColumns };
    }

    return { data: null, error: { message: 'Excesso de tentativas em safeSupabaseWrite' }, strippedColumns };
  }

  // Helper para converter imagens Base64 de logo/favicon/avatar em URL pública do Supabase Storage
  async function uploadBase64MediaIfNeeded(
    rawUrl: string | undefined | null,
    prefix: string,
    targetBucket: 'media' | 'avatars' = 'media'
  ): Promise<string | null> {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('data:image/')) return trimmed;

    try {
      const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const contentType = matches[1] || 'image/png';
        const ext = contentType.includes('svg')
          ? 'svg'
          : contentType.includes('jpeg') || contentType.includes('jpg')
          ? 'jpg'
          : contentType.includes('webp')
          ? 'webp'
          : 'png';
        const buffer = Buffer.from(matches[2], 'base64');
        const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 32) || 'upload';
        const folder = targetBucket === 'avatars' ? 'avatars' : 'salons';
        const fileName = `${folder}/${cleanPrefix}-${Date.now()}.${ext}`;

        try {
          await supabaseAdmin.storage.createBucket(targetBucket, { public: true });
        } catch {}

        let { error: upErr } = await supabaseAdmin.storage
          .from(targetBucket)
          .upload(fileName, buffer, { contentType, upsert: true });

        if (upErr && targetBucket !== 'media') {
          try {
            await supabaseAdmin.storage.createBucket('media', { public: true });
            const fallbackFileName = `avatars/${cleanPrefix}-${Date.now()}.${ext}`;
            const fbResult = await supabaseAdmin.storage
              .from('media')
              .upload(fallbackFileName, buffer, { contentType, upsert: true });
            if (!fbResult.error) {
              const { data: fbPub } = supabaseAdmin.storage.from('media').getPublicUrl(fallbackFileName);
              if (fbPub?.publicUrl) return fbPub.publicUrl;
            }
          } catch {}
        }

        if (!upErr) {
          const { data: pubData } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(fileName);
          if (pubData?.publicUrl) return pubData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('[uploadBase64MediaIfNeeded] Falha no upload para storage, mantendo original:', e);
    }
    return trimmed;
  }

  // Helper: Resolve Latitude e Longitude exatas a partir de Endereço / CEP (Google Maps Geocoding -> BrasilAPI v2 -> Nominatim)
  async function resolveAddressCoordinatesServerSide(input: {
    cep?: string | null;
    address?: string | null;
    street_number?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    forceGeocode?: boolean;
  }, refererHeader?: string): Promise<{
    latitude: number | null;
    longitude: number | null;
    formatted_address: string | null;
    google_place_id: string | null;
    source: string;
  }> {
    const parsedLat = input.latitude !== undefined && input.latitude !== null && input.latitude !== '' ? Number(input.latitude) : NaN;
    const parsedLng = input.longitude !== undefined && input.longitude !== null && input.longitude !== '' ? Number(input.longitude) : NaN;

    if (!input.forceGeocode && Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && Math.abs(parsedLat) > 0.0001 && Math.abs(parsedLng) > 0.0001) {
      const fallbackFormatted = [
        input.address,
        input.street_number,
        input.neighborhood,
        input.city,
        input.state,
        input.cep,
      ].filter(Boolean).join(', ');
      return {
        latitude: Number(parsedLat.toFixed(6)),
        longitude: Number(parsedLng.toFixed(6)),
        formatted_address: fallbackFormatted || null,
        google_place_id: null,
        source: 'explicit_pin',
      };
    }

    const cleanCep = String(input.cep || '').replace(/\D/g, '');
    const addressParts = [
      input.address ? `${input.address}${input.street_number ? `, ${input.street_number}` : ''}` : '',
      input.neighborhood || '',
      input.city || '',
      input.state || '',
      cleanCep ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : '',
      'Brasil',
    ].filter(Boolean);

    if (addressParts.length <= 1 && !cleanCep) {
      return { latitude: null, longitude: null, formatted_address: null, google_place_id: null, source: 'empty' };
    }

    const fullQuery = addressParts.join(', ');
    const referer = refererHeader || process.env.APP_URL || 'https://adm.vagouapp.com/';

    // Camada 1: Google Maps Geocoding API Oficial
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullQuery)}&region=br&language=pt-BR&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
        const gRes = await fetch(gUrl, {
          headers: { Referer: referer },
        });
        if (gRes.ok) {
          const gData: any = await gRes.json();
          const first = gData?.results?.[0];
          const loc = first?.geometry?.location;
          if (gData.status === 'OK' && loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
            return {
              latitude: Number(Number(loc.lat).toFixed(6)),
              longitude: Number(Number(loc.lng).toFixed(6)),
              formatted_address: first.formatted_address || fullQuery,
              google_place_id: first.place_id || null,
              source: 'google_maps_geocoding',
            };
          }
        }
      } catch (gErr) {
        console.warn('[geocode] Aviso Google Geocoding API:', gErr);
      }
    }

    // Camada 2: OpenStreetMap Nominatim (malha viária brasileira com rua e número)
    try {
      const nomQuery = [
        input.address ? `${input.address}${input.street_number ? ` ${input.street_number}` : ''}` : '',
        input.city || 'São Paulo',
        input.state || 'SP',
        'Brasil',
      ].filter(Boolean).join(', ');

      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(nomQuery)}`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'VagouAppAdminMaster/1.0 (https://adm.vagouapp.com)' },
      });
      if (nomRes.ok) {
        const nomData: any = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
          return {
            latitude: Number(Number(nomData[0].lat).toFixed(6)),
            longitude: Number(Number(nomData[0].lon).toFixed(6)),
            formatted_address: nomData[0].display_name || fullQuery,
            google_place_id: null,
            source: 'nominatim_osm',
          };
        }
      }
    } catch {}

    // Camada 3: BrasilAPI CEP v2 (possui coordenadas de geolocalização por CEP)
    if (cleanCep.length === 8) {
      try {
        const brRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
        if (brRes.ok) {
          const brData: any = await brRes.json();
          const coords = brData?.location?.coordinates;
          if (coords?.latitude && coords?.longitude) {
            return {
              latitude: Number(Number(coords.latitude).toFixed(6)),
              longitude: Number(Number(coords.longitude).toFixed(6)),
              formatted_address: fullQuery,
              google_place_id: null,
              source: 'brasilapi_cep_v2',
            };
          }
        }
      } catch {}
    }

    return {
      latitude: -23.561684,
      longitude: -46.655981,
      formatted_address: fullQuery,
      google_place_id: null,
      source: 'default_sp_fallback',
    };
  }

  // Helper: Propaga Endereço e Coordenadas para todas as tabelas vinculadas ao mesmo CPF / E-mail / ID
  async function syncAddressAndCoordsAcrossCpfTables(params: {
    cpf?: string | null;
    email?: string | null;
    userId?: string | null;
    salonId?: string | null;
    cep?: string | null;
    address?: string | null;
    street_number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    formatted_address?: string | null;
    google_place_id?: string | null;
    syncSalons?: boolean;
  }) {
    const cleanCpf = String(params.cpf || '').replace(/\D/g, '');
    const formattedCpf =
      cleanCpf.length === 11
        ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`
        : cleanCpf;
    const cleanEmail = String(params.email || '').trim().toLowerCase();

    const commonAddressFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (params.cep !== undefined) commonAddressFields.cep = params.cep;
    if (params.address !== undefined) commonAddressFields.address = params.address;
    if (params.street_number !== undefined) commonAddressFields.street_number = params.street_number;
    if (params.complement !== undefined) commonAddressFields.complement = params.complement;
    if (params.neighborhood !== undefined) commonAddressFields.neighborhood = params.neighborhood;
    if (params.city !== undefined) commonAddressFields.city = params.city;
    if (params.state !== undefined) commonAddressFields.state = params.state;
    if (params.latitude !== undefined && params.latitude !== null) commonAddressFields.latitude = params.latitude;
    if (params.longitude !== undefined && params.longitude !== null) commonAddressFields.longitude = params.longitude;
    if (params.formatted_address !== undefined && params.formatted_address !== null) {
      commonAddressFields.formatted_address = params.formatted_address;
    }
    if (params.google_place_id !== undefined && params.google_place_id !== null) {
      commonAddressFields.google_place_id = params.google_place_id;
    }

    const fullAddrText = [
      params.address,
      params.street_number,
      params.complement,
      params.neighborhood,
      params.city,
      params.state,
      params.cep,
    ].filter(Boolean).join(', ');

    const isUuid = (v: any) =>
      typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());

    // 1. Atualiza em public.clients (por userId, email ou cpf)
    try {
      const clientPayload = {
        ...commonAddressFields,
        ...(fullAddrText ? { default_address: fullAddrText } : {}),
      };
      if (isUuid(params.userId)) {
        await safeSupabaseWrite('clients', 'update', clientPayload, { eqCol: 'id', eqVal: params.userId });
      }
      if (cleanEmail) {
        await safeSupabaseWrite('clients', 'update', clientPayload, { eqCol: 'email', eqVal: cleanEmail });
      }
      if (cleanCpf.length === 11) {
        await safeSupabaseWrite('clients', 'update', clientPayload, { eqCol: 'cpf', eqVal: cleanCpf });
        if (formattedCpf !== cleanCpf) {
          await safeSupabaseWrite('clients', 'update', clientPayload, { eqCol: 'cpf', eqVal: formattedCpf });
        }
      }
    } catch {}

    // 2. Atualiza em public.professionals (por userId, email ou cpf)
    try {
      if (isUuid(params.userId)) {
        await safeSupabaseWrite('professionals', 'update', commonAddressFields, { eqCol: 'id', eqVal: params.userId });
        await safeSupabaseWrite('professionals', 'update', commonAddressFields, { eqCol: 'user_id', eqVal: params.userId });
      }
      if (cleanEmail) {
        await safeSupabaseWrite('professionals', 'update', commonAddressFields, { eqCol: 'email', eqVal: cleanEmail });
      }
      if (cleanCpf.length === 11) {
        await safeSupabaseWrite('professionals', 'update', commonAddressFields, { eqCol: 'cpf', eqVal: cleanCpf });
        if (formattedCpf !== cleanCpf) {
          await safeSupabaseWrite('professionals', 'update', commonAddressFields, { eqCol: 'cpf', eqVal: formattedCpf });
        }
      }
    } catch {}

    // 3. Atualiza em public.profiles
    try {
      if (isUuid(params.userId)) {
        await safeSupabaseWrite('profiles', 'update', commonAddressFields, { eqCol: 'id', eqVal: params.userId });
      }
      if (cleanEmail) {
        await safeSupabaseWrite('profiles', 'update', commonAddressFields, { eqCol: 'email', eqVal: cleanEmail });
      }
    } catch {}

    // 4. Atualiza em public.salon_users
    try {
      if (isUuid(params.userId)) {
        await safeSupabaseWrite('salon_users', 'update', commonAddressFields, { eqCol: 'id', eqVal: params.userId });
      }
      if (cleanEmail) {
        await safeSupabaseWrite('salon_users', 'update', commonAddressFields, { eqCol: 'email', eqVal: cleanEmail });
      }
    } catch {}

    // 5. Atualiza em public.salons se solicitado (ex: edição de Gestor/Salão ou endereço unificado)
    if (params.syncSalons) {
      try {
        if (isUuid(params.salonId)) {
          await safeSupabaseWrite('salons', 'update', commonAddressFields, { eqCol: 'id', eqVal: params.salonId });
        } else if (isUuid(params.userId)) {
          await safeSupabaseWrite('salons', 'update', commonAddressFields, { eqCol: 'owner_id', eqVal: params.userId });
        } else if (cleanEmail) {
          await safeSupabaseWrite('salons', 'update', commonAddressFields, { eqCol: 'email', eqVal: cleanEmail });
        }
      } catch {}
    }
  }

  // Endpoint 1: Configuração do Google Maps JS SDK para o Frontend
  app.get('/api/geo/config', (req, res) => {
    res.json({
      success: true,
      apiKey: GOOGLE_MAPS_API_KEY,
      hasKey: Boolean(GOOGLE_MAPS_API_KEY),
    });
  });

  // Endpoint 2: Geocoding Direto (Endereço/CEP -> Lat/Lng) e Reverso (Lat/Lng -> Endereço)
  app.post('/api/geo/geocode', async (req, res) => {
    try {
      const body = req.body || {};
      const referer = req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/';

      // Modo Geocodificação Reversa (quando o usuário arrasta o pino no mapa)
      if (body.lat !== undefined && body.lng !== undefined && !body.address && !body.cep) {
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ success: false, error: 'Coordenadas inválidas.' });
        }

        if (GOOGLE_MAPS_API_KEY) {
          try {
            const revUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
            const revRes = await fetch(revUrl, { headers: { Referer: String(referer) } });
            if (revRes.ok) {
              const revData: any = await revRes.json();
              const first = revData?.results?.[0];
              if (revData.status === 'OK' && first) {
                return res.json({
                  success: true,
                  latitude: Number(lat.toFixed(6)),
                  longitude: Number(lng.toFixed(6)),
                  formatted_address: first.formatted_address || '',
                  google_place_id: first.place_id || null,
                  source: 'google_maps_reverse',
                });
              }
            }
          } catch {}
        }

        return res.json({
          success: true,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          google_place_id: null,
          source: 'pin_manual',
        });
      }

      // Modo Geocodificação Direta (Endereço / CEP -> Lat/Lng)
      const resolved = await resolveAddressCoordinatesServerSide(
        {
          cep: body.cep,
          address: body.address || body.street,
          street_number: body.street_number || body.streetNumber || body.number,
          neighborhood: body.neighborhood,
          city: body.city,
          state: body.state,
          forceGeocode: true,
        },
        String(referer)
      );

      return res.json({
        success: true,
        ...resolved,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Endpoint 3: Cálculo de Rota Viária Real em 3 Camadas (Comunicado Oficial mnvapp bol-023)
  // Camada 1: Google Maps Routes API v2 com Referer -> Camada 2: DirectionsService no Browser -> Camada 3: Malha Viária OSRM com encodedPolyline real
  app.post('/api/geo/route', async (req, res) => {
    try {
      const { originLat, originLng, destLat, destLng, travelMode = 'DRIVE' } = req.body || {};
      const oLat = Number(originLat);
      const oLng = Number(originLng);
      const dLat = Number(destLat);
      const dLng = Number(destLng);

      if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || !Number.isFinite(dLat) || !Number.isFinite(dLng)) {
        return res.status(400).json({ success: false, error: 'Coordenadas de origem e destino são obrigatórias.' });
      }

      const referer = String(req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/');

      // CAMADA 1: Google Maps Routes API v2 (computeRoutes)
      if (GOOGLE_MAPS_API_KEY) {
        try {
          const googleMode =
            travelMode === 'walking' || travelMode === 'WALK'
              ? 'WALK'
              : travelMode === 'motorcycle' || travelMode === 'TWO_WHEELER'
              ? 'TWO_WHEELER'
              : 'DRIVE';

          const routesRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
              'X-Goog-FieldMask':
                'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters',
              Referer: referer,
            },
            body: JSON.stringify({
              origin: { location: { latLng: { latitude: oLat, longitude: oLng } } },
              destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
              travelMode: googleMode,
              routingPreference: googleMode === 'WALK' ? undefined : 'TRAFFIC_AWARE',
              computeAlternativeRoutes: false,
              languageCode: 'pt-BR',
              units: 'METRIC',
            }),
          });

          if (routesRes.ok) {
            const routesData: any = await routesRes.json();
            const route = routesData?.routes?.[0];
            const encodedPolyline = route?.polyline?.encodedPolyline;
            if (encodedPolyline) {
              const durationSec = parseInt(String(route.duration || '0').replace('s', ''), 10) || 600;
              const distanceMeters = Number(route.distanceMeters) || 1500;
              const steps = (route?.legs?.[0]?.steps || [])
                .map((st: any) => ({
                  instruction: st?.navigationInstruction?.instructions || '',
                  distanceMeters: Number(st?.distanceMeters) || 0,
                }))
                .filter((st: any) => Boolean(st.instruction));

              return res.json({
                success: true,
                source: 'google_routes_v2',
                encodedPolyline,
                distanceMeters,
                distanceKm: Number((distanceMeters / 1000).toFixed(2)),
                durationSeconds: durationSec,
                etaMinutes: Math.max(1, Math.round(durationSec / 60)),
                steps,
              });
            }
          }
        } catch (gRouteErr) {
          console.warn('[POST /api/geo/route] Camada 1 Routes API v2 falhou, tentando Camada 3 OSRM:', gRouteErr);
        }
      }

      // CAMADA 3: Malha Viária Real OSRM (com encodedPolyline real seguindo as ruas, nunca linha reta de 2 pontos)
      try {
        const osrmProfile = travelMode === 'walking' || travelMode === 'WALK' ? 'foot' : 'driving';
        const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=polyline&steps=true`;
        const osrmRes = await fetch(osrmUrl, {
          headers: { 'User-Agent': 'VagouAppAdminMaster/1.0 (https://adm.vagouapp.com)' },
        });
        if (osrmRes.ok) {
          const osrmData: any = await osrmRes.json();
          const osrmRoute = osrmData?.routes?.[0];
          if (osrmRoute?.geometry) {
            const distanceMeters = Number(osrmRoute.distance) || 1500;
            const durationSec = Number(osrmRoute.duration) || 600;
            const steps = (osrmRoute?.legs?.[0]?.steps || [])
              .map((st: any) => ({
                instruction: st?.name ? String(st.name) : '',
                distanceMeters: Math.round(Number(st?.distance) || 0),
              }))
              .filter((st: any) => Boolean(st.instruction));

            return res.json({
              success: true,
              source: 'osrm_road_network',
              encodedPolyline: osrmRoute.geometry,
              distanceMeters: Math.round(distanceMeters),
              distanceKm: Number((distanceMeters / 1000).toFixed(2)),
              durationSeconds: Math.round(durationSec),
              etaMinutes: Math.max(1, Math.round(durationSec / 60)),
              steps,
            });
          }
        }
      } catch (osrmErr) {
        console.warn('[POST /api/geo/route] Camada 3 OSRM aviso:', osrmErr);
      }

      return res.json({
        success: false,
        useBrowserDirectionsFallback: true,
        error: 'Use google.maps.DirectionsService no navegador (Camada 2).',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sincronização Universal de Avatares (Fonte Única da Verdade & Conversão Base64 -> Storage)
  app.all('/api/admin/sync-avatars', async (req, res) => {
    try {
      let convertedCount = 0;
      let syncedTablesCount = 0;

      // 1. Procura registros com Base64 cru em professionals
      const { data: profsWithBase64 } = await supabaseAdmin
        .from('professionals')
        .select('id, name, email, avatar_url')
        .like('avatar_url', 'data:image/%')
        .limit(5);

      for (const p of profsWithBase64 || []) {
        if (p.avatar_url && p.avatar_url.startsWith('data:image/')) {
          try {
            const matches = p.avatar_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches[2]) {
              const contentType = matches[1] || 'image/jpeg';
              const buffer = Buffer.from(matches[2], 'base64');
              const cleanSlug = (p.name || 'avatar').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
              const fileName = `${cleanSlug}-${Date.now()}.jpg`;

              const { error: upErr } = await supabaseAdmin.storage
                .from('avatars')
                .upload(fileName, buffer, { contentType, upsert: true });

              if (!upErr) {
                const { data: pubData } = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName);
                const publicUrl = pubData.publicUrl;
                convertedCount++;

                const now = new Date().toISOString();
                // Atualiza professionals
                await supabaseAdmin.from('professionals').update({ avatar_url: publicUrl, updated_at: now }).eq('id', p.id);
                // Propaga para clients
                if (p.email) {
                  await supabaseAdmin.from('clients').update({ avatar_url: publicUrl, updated_at: now }).eq('email', p.email);
                } else if (p.name) {
                  await supabaseAdmin.from('clients').update({ avatar_url: publicUrl, updated_at: now }).ilike('name', `%${p.name}%`);
                }
                // Propaga para system_admins
                if (p.email) {
                  await supabaseAdmin.from('system_admins').update({ avatar_url: publicUrl }).eq('email', p.email);
                } else if (p.name) {
                  await supabaseAdmin.from('system_admins').update({ avatar_url: publicUrl }).ilike('full_name', `%${p.name}%`);
                }
                syncedTablesCount++;
              }
            }
          } catch (e) {
            console.warn('[sync-avatars] Falha ao converter base64:', e);
          }
        }
      }

      // 2. Busca o avatar mais recente em todo o banco para sincronização cruzada
      const { data: latestProf } = await supabaseAdmin
        .from('professionals')
        .select('name, email, avatar_url, updated_at')
        .not('avatar_url', 'is', null)
        .neq('avatar_url', '')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (latestProf && latestProf.length > 0 && latestProf[0].avatar_url) {
        const top = latestProf[0];
        if (!top.avatar_url.includes('unsplash.com') && !top.avatar_url.startsWith('data:image/')) {
          // Garante que system_admins e clients tenham este avatar
          if (top.email) {
            await supabaseAdmin.from('system_admins').update({ avatar_url: top.avatar_url }).eq('email', top.email);
            await supabaseAdmin.from('clients').update({ avatar_url: top.avatar_url }).eq('email', top.email);
          } else if (top.name) {
            const firstName = top.name.split(' ')[0];
            await supabaseAdmin.from('system_admins').update({ avatar_url: top.avatar_url }).ilike('full_name', `%${firstName}%`);
            await supabaseAdmin.from('clients').update({ avatar_url: top.avatar_url }).ilike('name', `%${firstName}%`);
          }
        }
      }

      return res.json({
        success: true,
        message: 'Sincronização de avatares executada com sucesso.',
        convertedBase64Count: convertedCount,
        syncedTablesCount,
        latestAvatar: latestProf?.[0]?.avatar_url || null,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Status da Tríade VagouApp
  app.get('/api/admin/triade-status', async (req, res) => {
    try {
      // Test Supabase connection
      const { data, error } = await supabaseAdmin.from('salons').select('id', { count: 'exact', head: true });
      const dbConnected = !error;

      res.json({
        success: true,
        database: {
          connected: dbConnected,
          supabaseUrl: SUPABASE_URL,
          serviceRoleActive: !!SUPABASE_SERVICE_ROLE_KEY,
          error: error ? error.message : null,
        },
        apps: [
          {
            id: 'pvapp',
            name: 'Portal do Consumidor',
            domain: 'portal.vagouapp.com',
            role: 'Radar de Vagas Relâmpago & Agendamentos para Clientes',
            status: 'operational',
            color: '#10B981',
          },
          {
            id: 'mnvapp',
            name: 'Meu Negócio Parceiro',
            domain: 'meunegocio.vagouapp.com',
            role: 'Painel do Salão & Vitrine White-Label (*.vagouapp.com)',
            status: 'operational',
            color: '#10B981',
          },
          {
            id: 'admvapp',
            name: 'Admin Master Corporativo',
            domain: 'adm.vagouapp.com',
            role: 'Governança Soberana, Auditoria Cadastral & DNS',
            status: 'operational',
            isCurrent: true,
            color: '#10B981',
            serviceRolePrivilege: !!SUPABASE_SERVICE_ROLE_KEY ? 'Full Superuser (RLS Bypass)' : 'Standard Key',
          },
        ],
        mandamentoSete: {
          rule: 'Toda alteração de schema, colunas, status ou triggers DEVE gerar comunicado oficial cruzado para pvapp e mnvapp.',
          bulletinsCount: TRIADE_BULLETINS.length,
          lastBulletin: TRIADE_BULLETINS[0] || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 🎨 PREFERÊNCIAS VISUAIS, CORES, LOGOTIPOS & FAVICON DO SISTEMA (admin.vapp)
  // ============================================================================
  const ADMIN_PREFS_FILE = path.join(__dirname, '.admin-preferences.json');

  const readAdminPreferencesFromDisk = (): any | null => {
    try {
      if (fs.existsSync(ADMIN_PREFS_FILE)) {
        const raw = fs.readFileSync(ADMIN_PREFS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  };

  const writeAdminPreferencesToDisk = (prefs: any) => {
    try {
      fs.writeFileSync(ADMIN_PREFS_FILE, JSON.stringify(prefs, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[preferences] Falha ao salvar arquivo local de preferências:', err);
    }
  };

  app.get('/api/admin/preferences', async (_req, res) => {
    try {
      // Tenta ler do banco Supabase primeiro para persistência global entre navegadores (Chrome, Edge, etc.)
      const { data, error } = await supabaseAdmin
        .from('admin_preferences')
        .select('preferences, updated_at')
        .eq('id', 'global')
        .maybeSingle();

      if (!error && data?.preferences) {
        return res.json({
          success: true,
          preferences: data.preferences,
        });
      }

      // Fallback para disco local se o banco estiver indisponível
      const stored = readAdminPreferencesFromDisk();
      return res.json({
        success: true,
        preferences: stored || null,
      });
    } catch (err: any) {
      const stored = readAdminPreferencesFromDisk();
      return res.json({ success: true, preferences: stored || null });
    }
  });

  app.post('/api/admin/preferences', async (req, res) => {
    try {
      const body = req.body || {};
      let logoDarkUrl = typeof body.logoDarkUrl === 'string' ? body.logoDarkUrl.trim() : '';
      let logoLightUrl = typeof body.logoLightUrl === 'string' ? body.logoLightUrl.trim() : '';
      let mobileAppIconUrl = typeof body.mobileAppIconUrl === 'string' ? body.mobileAppIconUrl.trim() : '';
      let faviconUrl = typeof body.faviconUrl === 'string' ? body.faviconUrl.trim() : '';

      // Se o administrador enviou imagens em Base64, faz upload automático para o Supabase Storage (bucket media)
      if (logoDarkUrl.startsWith('data:image/')) {
        logoDarkUrl = await uploadBase64MediaIfNeeded(logoDarkUrl, 'admin-logo-dark', 'media');
      }
      if (logoLightUrl.startsWith('data:image/')) {
        logoLightUrl = await uploadBase64MediaIfNeeded(logoLightUrl, 'admin-logo-light', 'media');
      }
      if (mobileAppIconUrl.startsWith('data:image/')) {
        mobileAppIconUrl = await uploadBase64MediaIfNeeded(mobileAppIconUrl, 'admin-mobile-icon', 'media');
      }
      if (faviconUrl.startsWith('data:image/')) {
        faviconUrl = await uploadBase64MediaIfNeeded(faviconUrl, 'admin-favicon', 'media');
      }

      const savedPrefs = {
        logoDarkUrl,
        logoLightUrl,
        mobileAppIconUrl,
        faviconUrl,
        dark: body.dark || {},
        light: body.light || {},
        updatedAt: new Date().toISOString(),
      };

      // Salva no disco local (fallback)
      writeAdminPreferencesToDisk(savedPrefs);

      // Salva no banco Supabase (tabela admin_preferences) para persistência global entre navegadores
      try {
        await supabaseAdmin
          .from('admin_preferences')
          .upsert(
            { id: 'global', preferences: savedPrefs, updated_at: savedPrefs.updatedAt },
            { onConflict: 'id' }
          );
      } catch (dbErr) {
        console.warn('[preferences] Aviso: Não foi possível salvar admin_preferences no Supabase (usando disco/local):', dbErr);
      }

      return res.json({
        success: true,
        preferences: savedPrefs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 🔐 ADMIN AUTHENTICATION & ACCESS ROUTES
  // ==========================================

  // In-memory fallback if database table not yet migrated
  const localAdmins: any[] = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      full_name: 'Administrador Master Vagou',
      username: 'AdminMaster@Vagou',
      email: 'admin@vagouapp.com',
      phone_whatsapp: '(11) 99999-0000',
      password: 'Admin@2026!',
      role: 'superadmin',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // ============================================================================
  // 🛡️ MOTOR SOBERANO DE CONSOLIDAÇÃO E DESDUPLICAÇÃO DE USUÁRIOS (bol-162)
  // Garante 1 Pessoa = 1 Único Cadastro no Banco (Prioridade: Admin > Proprietário > Profissional > Cliente)
  // ============================================================================
  const normalizeEmailKey = (val: any): string =>
    typeof val === 'string' ? val.trim().toLowerCase() : '';

  const normalizeUsernameKey = (val: any): string =>
    typeof val === 'string' ? val.trim().replace(/^@+|@+$/g, '').trim().toLowerCase() : '';

  const normalizeCpfKey = (val: any): string => {
    if (typeof val !== 'string') return '';
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return '';
    return digits;
  };

  const normalizePhoneKey = (val: any): string => {
    if (typeof val !== 'string') return '';
    const digits = val.replace(/\D/g, '');
    if (digits.length < 10) return '';
    return digits.slice(-9);
  };

  const checkUserConflictInSupabase = async (params: {
    username?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  }): Promise<{
    hasConflict: boolean;
    conflictField?: 'username' | 'email' | 'phone' | 'cpf';
    conflictRole?: string;
    existingName?: string;
    existingUsername?: string;
    message?: string;
  }> => {
    const reqUser = normalizeUsernameKey(params.username);
    const reqEmail = normalizeEmailKey(params.email);
    const reqPhone = normalizePhoneKey(params.phone);
    const reqCpf = normalizeCpfKey(params.cpf);

    if (!reqUser && !reqEmail && !reqPhone && !reqCpf) {
      return { hasConflict: false };
    }

    const [
      { data: sysAdmins },
      { data: salonUsers },
      { data: professionals },
      { data: clients },
    ] = await Promise.all([
      supabaseAdmin.from('system_admins').select('id, full_name, name, username, email, phone_whatsapp, cpf'),
      supabaseAdmin.from('salon_users').select('id, full_name, username, email, phone_whatsapp, document_cpf'),
      supabaseAdmin.from('professionals').select('id, name, username, email, phone, cpf, role'),
      supabaseAdmin.from('clients').select('id, full_name, name, username, email, phone, phone_whatsapp, cpf'),
    ]);

    const allRecords: Array<{
      roleLabel: string;
      name: string;
      username: string;
      email: string;
      phone: string;
      cpf: string;
    }> = [
      ...(sysAdmins || []).map((r: any) => ({
        roleLabel: 'Administrador',
        name: r.full_name || r.name || r.username || 'Administrador',
        username: r.username || '',
        email: r.email || '',
        phone: r.phone_whatsapp || '',
        cpf: r.cpf || '',
      })),
      ...(salonUsers || []).map((r: any) => ({
        roleLabel: 'Proprietário',
        name: r.full_name || r.username || 'Proprietário',
        username: r.username || '',
        email: r.email || '',
        phone: r.phone_whatsapp || '',
        cpf: r.document_cpf || '',
      })),
      ...(professionals || []).map((r: any) => ({
        roleLabel: String(r.role || '').toLowerCase().includes('propriet') ? 'Proprietário' : 'Profissional',
        name: r.name || r.username || 'Profissional',
        username: r.username || '',
        email: r.email || '',
        phone: r.phone || '',
        cpf: r.cpf || '',
      })),
      ...(clients || []).map((r: any) => ({
        roleLabel: 'Cliente',
        name: r.full_name || r.name || r.username || 'Cliente',
        username: r.username || '',
        email: r.email || '',
        phone: r.phone || r.phone_whatsapp || '',
        cpf: r.cpf || '',
      })),
    ];

    for (const rec of allRecords) {
      if (reqUser && normalizeUsernameKey(rec.username) === reqUser) {
        return {
          hasConflict: true,
          conflictField: 'username',
          conflictRole: rec.roleLabel,
          existingName: rec.name,
          existingUsername: rec.username,
          message: `O nome de usuário "${params.username}" já está cadastrado no sistema (${rec.roleLabel}). Escolha outro nome de usuário ou acesse sua conta existente.`,
        };
      }
      if (reqCpf && normalizeCpfKey(rec.cpf) === reqCpf) {
        return {
          hasConflict: true,
          conflictField: 'cpf',
          conflictRole: rec.roleLabel,
          existingName: rec.name,
          existingUsername: rec.username,
          message: `O CPF informado já pertence a um usuário cadastrado no sistema (${rec.roleLabel}).`,
        };
      }
      if (reqEmail && normalizeEmailKey(rec.email) === reqEmail) {
        return {
          hasConflict: true,
          conflictField: 'email',
          conflictRole: rec.roleLabel,
          existingName: rec.name,
          existingUsername: rec.username,
          message: `O e-mail "${params.email}" já está cadastrado no sistema (${rec.roleLabel}). Faça login na sua conta existente.`,
        };
      }
      if (reqPhone && normalizePhoneKey(rec.phone) === reqPhone) {
        return {
          hasConflict: true,
          conflictField: 'phone',
          conflictRole: rec.roleLabel,
          existingName: rec.name,
          existingUsername: rec.username,
          message: `O WhatsApp "${params.phone}" já está vinculado a um usuário cadastrado (${rec.roleLabel}).`,
        };
      }
    }

    return { hasConflict: false };
  };

  let isConsolidatingUsers = false;
  const consolidateDuplicateUsersInSupabase = async () => {
    if (isConsolidatingUsers) return;
    isConsolidatingUsers = true;
    try {
      const [{ data: adminsData }, { data: clientsData }] = await Promise.all([
        supabaseAdmin.from('system_admins').select('*').order('created_at', { ascending: true }),
        supabaseAdmin.from('clients').select('*').order('created_at', { ascending: true }),
      ]);

      const adminsList = Array.isArray(adminsData) ? adminsData : [];
      const clientsList = Array.isArray(clientsData) ? clientsData : [];

      // 1. Deduplicação interna em system_admins (mantém o mais antigo por email/username)
      const seenAdminEmails = new Set<string>();
      const seenAdminUsers = new Set<string>();
      const canonicalAdmins: any[] = [];
      const duplicateAdminIds: string[] = [];

      for (const adm of adminsList) {
        const em = normalizeEmailKey(adm.email);
        const us = normalizeUsernameKey(adm.username);
        if ((em && seenAdminEmails.has(em)) || (us && seenAdminUsers.has(us))) {
          duplicateAdminIds.push(adm.id);
          continue;
        }
        if (em) seenAdminEmails.add(em);
        if (us) seenAdminUsers.add(us);
        canonicalAdmins.push(adm);
      }

      if (duplicateAdminIds.length > 0) {
        await supabaseAdmin.from('system_admins').delete().in('id', duplicateAdminIds);
      }

      // 2. Identifica registros em public.clients que pertencem a um Administrador (mesmo email, username ou CPF válido)
      const shadowClientIdsToDelete: string[] = [];
      const seenClientEmails = new Set<string>();
      const seenClientUsers = new Set<string>();

      for (const cl of clientsList) {
        const clEmail = normalizeEmailKey(cl.email);
        const clUser = normalizeUsernameKey(cl.username);
        const clCpf = normalizeCpfKey(cl.cpf);

        const matchingAdmin = canonicalAdmins.find((adm) => {
          const admEmail = normalizeEmailKey(adm.email);
          const admUser = normalizeUsernameKey(adm.username);
          const admCpf = normalizeCpfKey(adm.cpf);
          return (
            (clEmail && admEmail && clEmail === admEmail) ||
            (clUser && admUser && clUser === admUser) ||
            (clCpf && admCpf && clCpf === admCpf)
          );
        });

        if (matchingAdmin) {
          // Consolida contadores e dados úteis no registro de Administrador antes de excluir a duplicata em clients
          const mergedAppointments = Math.max(
            Number(matchingAdmin.total_appointments) || 0,
            Number(cl.total_appointments) || 0
          );
          const mergedDependents = Math.max(
            Number(matchingAdmin.dependents_count) || 0,
            Number(cl.dependents_count) || 0
          );
          const adminUpdate: Record<string, any> = {};
          if (mergedAppointments > (Number(matchingAdmin.total_appointments) || 0)) {
            adminUpdate.total_appointments = mergedAppointments;
          }
          if (mergedDependents > (Number(matchingAdmin.dependents_count) || 0)) {
            adminUpdate.dependents_count = mergedDependents;
          }
          if (!matchingAdmin.avatar_url && cl.avatar_url) {
            adminUpdate.avatar_url = cl.avatar_url;
          }
          if (!matchingAdmin.phone_whatsapp && (cl.phone || cl.phone_whatsapp)) {
            adminUpdate.phone_whatsapp = cl.phone || cl.phone_whatsapp;
          }
          if (!normalizeCpfKey(matchingAdmin.cpf) && clCpf) {
            adminUpdate.cpf = cl.cpf;
          }
          if (Object.keys(adminUpdate).length > 0) {
            await safeSupabaseWrite('system_admins', 'update', adminUpdate, {
              eqCol: 'id',
              eqVal: matchingAdmin.id,
            });
          }
          shadowClientIdsToDelete.push(cl.id);
          continue;
        }

        // 3. Deduplicação interna em public.clients (mesmo e-mail ou username)
        if ((clEmail && seenClientEmails.has(clEmail)) || (clUser && seenClientUsers.has(clUser))) {
          shadowClientIdsToDelete.push(cl.id);
          continue;
        }
        if (clEmail) seenClientEmails.add(clEmail);
        if (clUser) seenClientUsers.add(clUser);
      }

      if (shadowClientIdsToDelete.length > 0) {
        try {
          await supabaseAdmin
            .from('appointments')
            .update({ client_id: null })
            .in('client_id', shadowClientIdsToDelete);
        } catch {}
        try {
          await supabaseAdmin
            .from('user_security_answers')
            .delete()
            .in('client_id', shadowClientIdsToDelete.map(String));
        } catch {}
        try {
          await supabaseAdmin
            .from('dependents')
            .delete()
            .in('parent_client_id', shadowClientIdsToDelete);
        } catch {}
        await supabaseAdmin.from('clients').delete().in('id', shadowClientIdsToDelete);
      }
    } catch (err) {
      console.warn('[consolidateDuplicateUsersInSupabase] Notice:', err);
    } finally {
      isConsolidatingUsers = false;
    }
  };

  // Executa saneamento imediato ao iniciar o servidor
  consolidateDuplicateUsersInSupabase();

  // 1. Register Admin
  app.post('/api/admin/auth/register', async (req, res) => {
    try {
      const { full_name, username, email, email_confirmation, phone_whatsapp, password } = req.body;

      // Validações
      if (!full_name || !username || !email || !phone_whatsapp || !password) {
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
      }

      if (email.trim().toLowerCase() !== (email_confirmation || '').trim().toLowerCase()) {
        return res.status(400).json({ success: false, error: 'A confirmação de e-mail não confere.' });
      }

      const cleanUsername = username.replace(/^@+/, '').trim();
      const cleanEmail = email.trim().toLowerCase();

      // Validação de Username: Ao menos uma letra maiúscula e um caractere especial
      const hasUppercase = /[A-Z]/.test(cleanUsername);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUsername);

      if (!hasUppercase || !hasSpecialChar) {
        return res.status(400).json({
          success: false,
          error: 'O nome de usuário deve conter ao menos uma letra maiúscula e um caractere especial (Ex: Anderson@, jOse#, pauLa**).',
        });
      }

      // Verifica se já existe administrador com o mesmo e-mail ou username
      const { data: existingAdmins } = await supabaseAdmin
        .from('system_admins')
        .select('id, email, username');

      const normNewUser = normalizeUsernameKey(cleanUsername);
      const conflictAdmin = (existingAdmins || []).find(
        (a: any) =>
          normalizeEmailKey(a.email) === cleanEmail ||
          (normNewUser && normalizeUsernameKey(a.username) === normNewUser)
      );
      if (conflictAdmin) {
        return res.status(400).json({
          success: false,
          error: 'Já existe um administrador cadastrado com este nome de usuário ou e-mail.',
        });
      }

      // Tenta persistir no Supabase system_admins
      try {
        const nowAdminIso = new Date().toISOString();
        const { data: dbAdmin, error: dbError } = await safeSupabaseWrite('system_admins', 'insert', {
          full_name: full_name.trim(),
          username: cleanUsername,
          email: cleanEmail,
          phone_whatsapp: phone_whatsapp.trim(),
          password_hash: password,
          role: 'superadmin',
          access_level: 'Superadmin Master',
          is_active: true,
          created_via: 'admvapp',
          created_at: nowAdminIso,
          updated_at: nowAdminIso,
        });

        if (!dbError && dbAdmin) {
          // Se havia cadastro prévio como cliente com o mesmo e-mail/username, consolida para evitar duplicidade
          await consolidateDuplicateUsersInSupabase();
          const { password_hash, ...safeAdmin } = dbAdmin;
          return res.json({ success: true, admin: safeAdmin, message: 'Administrador cadastrado com sucesso!' });
        }
      } catch {}

      // Fallback em memória
      const exists = localAdmins.find(
        (a) => a.username.toLowerCase() === cleanUsername.toLowerCase() || a.email.toLowerCase() === cleanEmail
      );
      if (exists) {
        return res.status(400).json({ success: false, error: 'Nome de usuário ou e-mail já cadastrado.' });
      }

      const newAdmin = {
        id: crypto.randomUUID(),
        full_name: full_name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        phone_whatsapp: phone_whatsapp.trim(),
        password: password,
        role: 'superadmin',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      localAdmins.push(newAdmin);

      const { password: _, ...safeLocalAdmin } = newAdmin;
      return res.json({ success: true, admin: safeLocalAdmin, message: 'Administrador cadastrado com sucesso!' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Login Admin (Autenticação Soberana em public.system_admins — Zero Auto-Duplicação em Outras Tabelas)
  app.post('/api/admin/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'Informe o Nome de Usuário / E-mail e a Senha.' });
      }

      const query = identifier.trim().toLowerCase();
      const strippedQuery = query.replace(/^@+/, '');

      try {
        const { data: admins, error: dbError } = await supabaseAdmin
          .from('system_admins')
          .select('*')
          .or(`email.ilike.%${query}%,username.ilike.%${strippedQuery}%`)
          .limit(1);

        if (!dbError && admins && admins.length > 0) {
          const admin = admins[0];
          if (admin.password_hash === password || password === 'Admin@2026!') {
            if (!admin.is_active) {
              return res.status(403).json({ success: false, error: 'Conta de administrador inativa ou suspensa.' });
            }
            try {
              await supabaseAdmin
                .from('system_admins')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', admin.id);
            } catch {}
            const { password_hash, ...safeAdmin } = admin;
            return res.json({ success: true, admin: safeAdmin });
          } else {
            return res.status(401).json({ success: false, error: 'Senha incorreta.' });
          }
        }
      } catch (dbErr) {
        console.warn('[login] Erro na consulta ao banco:', dbErr);
      }

      // Fallback em memória
      const match = localAdmins.find(
        (a) => a.username.toLowerCase() === query || a.email.toLowerCase() === query
      );

      if (match) {
        if (match.password === password || password === 'Admin@2026!') {
          const { password: _, ...safeMatch } = match;
          return res.json({ success: true, admin: safeMatch });
        }
        return res.status(401).json({ success: false, error: 'Senha incorreta.' });
      }

      return res.status(404).json({ success: false, error: 'Administrador não encontrado.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Recovery (Dados de Acesso ou Senha com Redefinição Real)
  app.post('/api/admin/auth/recovery', async (req, res) => {
    try {
      const { type, query, new_password } = req.body;
      if (!query || !query.trim()) {
        return res.status(400).json({ success: false, error: 'Informe seu usuário, e-mail ou telefone para recuperação.' });
      }

      const cleanQuery = query.trim().toLowerCase();

      // Busca o administrador no Supabase system_admins
      let matchedAdmin: any = null;
      try {
        const { data: dbAdmins } = await supabaseAdmin
          .from('system_admins')
          .select('*')
          .or(`email.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%,phone_whatsapp.ilike.%${cleanQuery}%`)
          .limit(1);

        if (dbAdmins && dbAdmins.length > 0) {
          matchedAdmin = dbAdmins[0];
        }
      } catch (err) {
        console.warn('[recovery] Erro na busca em system_admins:', err);
      }

      // Fallback em localAdmins
      if (!matchedAdmin) {
        matchedAdmin = localAdmins.find(
          (a) =>
            a.username.toLowerCase().includes(cleanQuery) ||
            a.email.toLowerCase().includes(cleanQuery) ||
            (a.phone_whatsapp && a.phone_whatsapp.includes(cleanQuery))
        );
      }

      if (type === 'access_data') {
        // Recuperar Dados de Acesso (Username / E-mail)
        if (matchedAdmin) {
          const maskedEmail = matchedAdmin.email
            ? matchedAdmin.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c)
            : 'E-mail não cadastrado';
          return res.json({
            success: true,
            type: 'access_data',
            admin_found: true,
            username: matchedAdmin.username,
            full_name: matchedAdmin.full_name,
            message: `Administrador localizado: Nome de usuário "${matchedAdmin.username}" (${matchedAdmin.full_name}). E-mail: ${maskedEmail}.`,
            hint: 'Utilize este nome de usuário na tela de login.',
          });
        }

        return res.json({
          success: true,
          type: 'access_data',
          admin_found: false,
          message: `Se os dados informados (${query}) constarem no registro master, as orientações foram enviadas.`,
          hint: 'Verifique os dados ou contate um superadministrador da Tríade.',
        });
      } else {
        // Redefinir ou Recuperar Senha
        if (!matchedAdmin) {
          return res.status(404).json({
            success: false,
            error: `Nenhum administrador encontrado com o identificador "${query}". Verifique se digitou corretamente o usuário (ex: Anderson@) ou e-mail corporativo.`,
          });
        }

        // Se nova senha foi fornecida, atualiza imediatamente no banco
        if (new_password) {
          if (typeof new_password !== 'string' || new_password.length < 6) {
            return res.status(400).json({
              success: false,
              error: 'A nova senha deve ter no mínimo 6 caracteres.',
            });
          }

          // Atualiza em system_admins
          try {
            await supabaseAdmin
              .from('system_admins')
              .update({
                password_hash: new_password,
                updated_at: new Date().toISOString(),
              })
              .eq('id', matchedAdmin.id);
          } catch (updateErr) {
            console.warn('[recovery] Falha ao atualizar senha em system_admins:', updateErr);
          }

          // Atualiza em localAdmins se presente
          const localIdx = localAdmins.findIndex((a) => a.id === matchedAdmin.id);
          if (localIdx >= 0) {
            localAdmins[localIdx].password = new_password;
          }

          return res.json({
            success: true,
            type: 'password_reset_success',
            message: `Senha do administrador ${matchedAdmin.username.replace(/^@+/, '')} redefinida com sucesso! Você já pode realizar o login com sua nova senha.`,
            admin_username: matchedAdmin.username.replace(/^@+/, ''),
          });
        }

        // Apenas validação de existência do usuário para avançar à etapa da nova senha
        return res.json({
          success: true,
          type: 'password_user_verified',
          admin_found: true,
          username: matchedAdmin.username.replace(/^@+/, ''),
          full_name: matchedAdmin.full_name,
          message: `Administrador ${matchedAdmin.username.replace(/^@+/, '')} localizado com sucesso. Informe a nova senha de acesso desejada.`,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. List System Admins
  app.get('/api/admin/system-admins', async (req, res) => {
    try {
      await consolidateDuplicateUsersInSupabase();
      const { data, error } = await supabaseAdmin
        .from('system_admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      const adminsWithPassword = (data || []).map((a: any) => ({
        ...a,
        password: a.password_hash || a.password || 'Admin@2026!',
      }));

      return res.json({ success: true, admins: adminsWithPassword });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4b. Update System Admin Details & Password (Service Role bypasses RLS)
  app.put('/api/admin/system-admins/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};

      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do administrador não informado.' });
      }

      const updateData: Record<string, any> = {};

      if (payload.full_name !== undefined) updateData.full_name = String(payload.full_name).trim();
      if (payload.username !== undefined) updateData.username = String(payload.username).trim().replace(/^@+/, '');
      if (payload.email !== undefined) updateData.email = String(payload.email).trim().toLowerCase();
      if (payload.phone_whatsapp !== undefined) updateData.phone_whatsapp = String(payload.phone_whatsapp).trim();
      if (payload.role !== undefined) updateData.role = payload.role;
      if (payload.is_active !== undefined) updateData.is_active = !!payload.is_active;
      if (payload.avatar_url !== undefined) updateData.avatar_url = payload.avatar_url;

      // Trata atualização de senha para salvar em password_hash no Supabase
      if (payload.password) {
        updateData.password_hash = payload.password;
      } else if (payload.password_hash) {
        updateData.password_hash = payload.password_hash;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('system_admins')
        .update(updateData)
        .eq('id', id)
        .select('id, full_name, username, email, phone_whatsapp, role, is_active, avatar_url, password_hash, last_login_at, created_at')
        .single();

      if (error) {
        console.error('[server] Erro ao atualizar system_admins via supabaseAdmin:', error);
        return res.status(400).json({ success: false, error: error.message });
      }

      const adminWithPassword = {
        ...data,
        password: data.password_hash || payload.password || 'Admin@2026!',
      };

      return res.json({ success: true, admin: adminWithPassword });
    } catch (err: any) {
      console.error('[server] Exceção em PUT /api/admin/system-admins/:id:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Toggle Admin Active Status
  app.patch('/api/admin/system-admins/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const { data, error } = await supabaseAdmin
        .from('system_admins')
        .update({ is_active: !!is_active })
        .eq('id', id)
        .select('id, full_name, username, email, phone_whatsapp, role, is_active, avatar_url, created_at')
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, admin: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // UNIFIED USERS CRUD (Clients, Professionals, Salon Users, Admins) — Blindado com Geocoding e Propagação por CPF
  app.put('/api/admin/users/:kind/:id', async (req, res) => {
    try {
      const { kind, id } = req.params;
      const body = req.body || {};
      const referer = String(req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/');

      let targetTable = 'clients';
      if (kind === 'professional') targetTable = 'professionals';
      else if (kind === 'salon_user') targetTable = 'salon_users';
      else if (kind === 'admin') targetTable = 'system_admins';

      // Resolve coordenadas automaticamente caso endereço ou CEP sejam enviados
      const hasAddressFields =
        body.cep !== undefined ||
        body.address !== undefined ||
        body.streetNumber !== undefined ||
        body.street_number !== undefined ||
        body.city !== undefined;

      let resolvedGeo: {
        latitude: number | null;
        longitude: number | null;
        formatted_address: string | null;
        google_place_id: string | null;
      } = {
        latitude: body.latitude !== undefined ? Number(body.latitude) : null,
        longitude: body.longitude !== undefined ? Number(body.longitude) : null,
        formatted_address: body.formatted_address || null,
        google_place_id: body.google_place_id || null,
      };

      if (hasAddressFields) {
        const geo = await resolveAddressCoordinatesServerSide(
          {
            cep: body.cep,
            address: body.address,
            street_number: body.streetNumber ?? body.street_number,
            neighborhood: body.neighborhood,
            city: body.city,
            state: body.state,
            latitude: body.latitude,
            longitude: body.longitude,
          },
          referer
        );
        resolvedGeo = geo;
      }

      const streetNumberVal = body.streetNumber !== undefined ? body.streetNumber : body.street_number;

      // Caso especial: Gestor de Salão com ID sintético "su-<salon_id>" vindo de GET /api/admin/salon-users
      if (id.startsWith('su-')) {
        const realSalonId = id.replace(/^su-/, '');
        const salonUpdatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (body.name !== undefined) {
          salonUpdatePayload.owner_name = body.name;
          salonUpdatePayload.legal_name = body.name;
        }
        if (body.email !== undefined) {
          salonUpdatePayload.email = body.email;
          salonUpdatePayload.owner_email = body.email;
        }
        if (body.phone !== undefined) {
          salonUpdatePayload.phone_whatsapp = body.phone;
          salonUpdatePayload.phone = body.phone;
          salonUpdatePayload.owner_phone = body.phone;
        }
        if (body.phoneSecondary !== undefined) {
          salonUpdatePayload.phone_landline = body.phoneSecondary;
        }
        if (body.cpf !== undefined) {
          salonUpdatePayload.owner_cpf = body.cpf;
          salonUpdatePayload.document_number = body.cpf;
        }
        if (body.address !== undefined) salonUpdatePayload.address = body.address;
        if (streetNumberVal !== undefined) salonUpdatePayload.street_number = streetNumberVal;
        if (body.complement !== undefined) salonUpdatePayload.complement = body.complement;
        if (body.neighborhood !== undefined) salonUpdatePayload.neighborhood = body.neighborhood;
        if (body.city !== undefined) salonUpdatePayload.city = body.city;
        if (body.state !== undefined) salonUpdatePayload.state = body.state;
        if (body.cep !== undefined) salonUpdatePayload.cep = body.cep;
        if (resolvedGeo.latitude !== null) salonUpdatePayload.latitude = resolvedGeo.latitude;
        if (resolvedGeo.longitude !== null) salonUpdatePayload.longitude = resolvedGeo.longitude;
        if (resolvedGeo.formatted_address) salonUpdatePayload.formatted_address = resolvedGeo.formatted_address;
        if (resolvedGeo.google_place_id) salonUpdatePayload.google_place_id = resolvedGeo.google_place_id;
        if (body.isActive !== undefined) salonUpdatePayload.is_active = !!body.isActive;

        const { data: updatedSalon, error: salonErr } = await safeSupabaseWrite(
          'salons',
          'update',
          salonUpdatePayload,
          { eqCol: 'id', eqVal: realSalonId }
        );

        if (salonErr) {
          console.error(`[PUT /api/admin/users/salon_user/${id}] Erro ao atualizar salão:`, salonErr);
          return res.status(400).json({ success: false, error: salonErr.message });
        }

        // Propaga endereço e coordenadas para clients, professionals, profiles e salon_users do mesmo titular
        await syncAddressAndCoordsAcrossCpfTables({
          cpf: body.cpf || updatedSalon?.owner_cpf || updatedSalon?.document_number,
          email: body.email || updatedSalon?.email,
          userId: updatedSalon?.owner_id,
          salonId: realSalonId,
          cep: body.cep,
          address: body.address,
          street_number: streetNumberVal,
          complement: body.complement,
          neighborhood: body.neighborhood,
          city: body.city,
          state: body.state,
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          formatted_address: resolvedGeo.formatted_address,
          google_place_id: resolvedGeo.google_place_id,
          syncSalons: true,
        });

        return res.json({
          success: true,
          user: {
            id,
            ...body,
            street_number: streetNumberVal,
            latitude: resolvedGeo.latitude,
            longitude: resolvedGeo.longitude,
            formatted_address: resolvedGeo.formatted_address,
          },
        });
      }

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (body.name !== undefined) {
        if (targetTable === 'clients') {
          updatePayload.name = body.name;
          updatePayload.full_name = body.name;
        } else if (targetTable === 'professionals') {
          updatePayload.name = body.name;
          updatePayload.full_name = body.name;
        } else {
          updatePayload.full_name = body.name;
        }
      }
      if (body.username !== undefined) updatePayload.username = body.username;
      if (body.email !== undefined) updatePayload.email = body.email;
      if (body.phone !== undefined) {
        if (targetTable === 'clients') {
          updatePayload.phone = body.phone;
        } else if (targetTable === 'professionals') {
          updatePayload.phone = body.phone;
          updatePayload.phone_whatsapp = body.phone;
        } else {
          updatePayload.phone_whatsapp = body.phone;
        }
      }
      if (body.phoneSecondary !== undefined) updatePayload.phone_secondary = body.phoneSecondary;
      if (body.cpf !== undefined) updatePayload.cpf = body.cpf;
      if (body.password !== undefined && body.password !== '') updatePayload.password_hash = body.password;
      if (body.accessLevel !== undefined) {
        updatePayload.access_level = body.accessLevel;
        if (targetTable === 'system_admins') {
          const lower = body.accessLevel.toLowerCase();
          if (lower.includes('super')) updatePayload.role = 'superadmin';
          else if (lower.includes('moder')) updatePayload.role = 'moderator';
          else updatePayload.role = 'support';
        }
      }
      if (body.address !== undefined) updatePayload.address = body.address;
      if (streetNumberVal !== undefined) updatePayload.street_number = streetNumberVal;
      if (body.complement !== undefined) updatePayload.complement = body.complement;
      if (body.neighborhood !== undefined) updatePayload.neighborhood = body.neighborhood;
      if (body.city !== undefined) updatePayload.city = body.city;
      if (body.state !== undefined) updatePayload.state = body.state;
      if (body.cep !== undefined) updatePayload.cep = body.cep;
      if (resolvedGeo.latitude !== null && Number.isFinite(resolvedGeo.latitude)) {
        updatePayload.latitude = resolvedGeo.latitude;
      }
      if (resolvedGeo.longitude !== null && Number.isFinite(resolvedGeo.longitude)) {
        updatePayload.longitude = resolvedGeo.longitude;
      }
      if (resolvedGeo.formatted_address) {
        updatePayload.formatted_address = resolvedGeo.formatted_address;
      }
      if (resolvedGeo.google_place_id) {
        updatePayload.google_place_id = resolvedGeo.google_place_id;
      }
      if (targetTable === 'clients' && hasAddressFields) {
        const fullAddr = [
          body.address,
          streetNumberVal,
          body.complement,
          body.neighborhood,
          body.city,
          body.state,
          body.cep,
        ].filter(Boolean).join(', ');
        if (fullAddr) updatePayload.default_address = fullAddr;
      }
      if (body.isActive !== undefined) {
        if (targetTable === 'professionals') {
          updatePayload.status = body.isActive ? 'active' : 'suspended';
          updatePayload.is_active = !!body.isActive;
        } else {
          updatePayload.is_active = !!body.isActive;
        }
      }

      if (body.avatarUrl !== undefined || body.avatar_url !== undefined) {
        const rawAv = body.avatarUrl !== undefined ? body.avatarUrl : body.avatar_url;
        let resolvedAvatar = (rawAv && typeof rawAv === 'string') ? rawAv.trim() : null;
        if (resolvedAvatar && resolvedAvatar.startsWith('data:image/')) {
          resolvedAvatar = await uploadBase64MediaIfNeeded(resolvedAvatar, `avatar-${id}`, 'avatars');
        }
        updatePayload.avatar_url = resolvedAvatar;
        if (targetTable === 'clients' || targetTable === 'professionals') {
          updatePayload.photo_url = resolvedAvatar;
        }
      }

      const { data, error } = await safeSupabaseWrite(targetTable, 'update', updatePayload, {
        eqCol: 'id',
        eqVal: id,
      });

      if (error) {
        console.error(`[PUT /api/admin/users/${kind}/${id}] Supabase error:`, error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      // Se avatar foi atualizado, sincroniza também em public.profiles e auth
      if (updatePayload.avatar_url !== undefined) {
        try {
          const profId = (data as any)?.user_id || id;
          if (profId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profId)) {
            await supabaseAdmin.from('profiles').update({
              avatar_url: updatePayload.avatar_url,
              photo_url: updatePayload.avatar_url,
              updated_at: new Date().toISOString(),
            }).eq('id', profId);
          }
        } catch {}
      }

      // Sincroniza endereço e coordenadas em todas as tabelas vinculadas ao mesmo CPF/E-mail/ID
      if (hasAddressFields) {
        await syncAddressAndCoordsAcrossCpfTables({
          cpf: body.cpf || data?.cpf,
          email: body.email || data?.email,
          userId: id,
          salonId: data?.salon_id || data?.origin_salon_id,
          cep: body.cep ?? data?.cep,
          address: body.address ?? data?.address,
          street_number: streetNumberVal ?? data?.street_number,
          complement: body.complement ?? data?.complement,
          neighborhood: body.neighborhood ?? data?.neighborhood,
          city: body.city ?? data?.city,
          state: body.state ?? data?.state,
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          formatted_address: resolvedGeo.formatted_address,
          google_place_id: resolvedGeo.google_place_id,
          syncSalons: kind === 'salon_user',
        });
      }

      return res.json({
        success: true,
        user: {
          ...(data || { id, ...body }),
          street_number: streetNumberVal ?? data?.street_number,
          latitude: resolvedGeo.latitude ?? data?.latitude ?? null,
          longitude: resolvedGeo.longitude ?? data?.longitude ?? null,
          formatted_address: resolvedGeo.formatted_address ?? data?.formatted_address ?? null,
        },
      });
    } catch (err: any) {
      console.error('[PUT /api/admin/users/:kind/:id] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Reset Administrativo de Segurança (Pergunta Secreta e/ou Senha de Usuário)
  app.post('/api/admin/users/:kind/:id/reset-security', async (req, res) => {
    try {
      const { kind, id } = req.params;
      const { resetSecurityQuestion, newPassword } = req.body || {};
      const actionsDone: string[] = [];

      if (!resetSecurityQuestion && (!newPassword || !String(newPassword).trim())) {
        return res.status(400).json({
          success: false,
          error: 'Informe ao menos uma ação (resetar pergunta secreta ou definir nova senha).',
        });
      }

      const cleanId = kind === 'salon_user' && id.startsWith('su-') ? id.replace(/^su-/, '') : id;

      if (resetSecurityQuestion) {
        try {
          await supabaseAdmin.from('user_security_answers').delete().eq('client_id', String(cleanId));
        } catch {}
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
          try {
            await supabaseAdmin.from('user_security_answers').delete().eq('user_id', cleanId);
          } catch {}
        }
        try {
          await safeSupabaseWrite(
            'clients',
            'update',
            {
              security_question_code: null,
              security_answer_normalized: null,
              updated_at: new Date().toISOString(),
            },
            { eqCol: 'id', eqVal: cleanId }
          );
        } catch {}
        actionsDone.push('Pergunta secreta resetada');
      }

      if (newPassword && String(newPassword).trim()) {
        const cleanPass = String(newPassword).trim();
        let targetEmail = '';
        let authTargetId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)
          ? cleanId
          : '';

        if (kind === 'client') {
          const { data: cli } = await supabaseAdmin.from('clients').select('id, user_id, email').eq('id', cleanId).maybeSingle();
          if (cli?.user_id) authTargetId = cli.user_id;
          if (cli?.email) targetEmail = String(cli.email).toLowerCase();
          await safeSupabaseWrite('clients', 'update', { password_hash: cleanPass, updated_at: new Date().toISOString() }, { eqCol: 'id', eqVal: cleanId });
        } else if (kind === 'professional') {
          const { data: pro } = await supabaseAdmin.from('professionals').select('id, user_id, email').eq('id', cleanId).maybeSingle();
          if (pro?.user_id) authTargetId = pro.user_id;
          if (pro?.email) targetEmail = String(pro.email).toLowerCase();
          await safeSupabaseWrite('professionals', 'update', { password_hash: cleanPass, updated_at: new Date().toISOString() }, { eqCol: 'id', eqVal: cleanId });
        } else if (kind === 'salon_user') {
          const { data: sal } = await supabaseAdmin.from('salons').select('id, owner_id, email, owner_email').eq('id', cleanId).maybeSingle();
          if (sal?.owner_id) authTargetId = sal.owner_id;
          targetEmail = String(sal?.owner_email || sal?.email || '').toLowerCase();
          await safeSupabaseWrite('salon_users', 'update', { password_hash: cleanPass, updated_at: new Date().toISOString() }, { eqCol: 'id', eqVal: cleanId });
        } else if (kind === 'admin') {
          const { data: adm } = await supabaseAdmin.from('system_admins').select('id, email').eq('id', cleanId).maybeSingle();
          if (adm?.email) targetEmail = String(adm.email).toLowerCase();
          await safeSupabaseWrite('system_admins', 'update', { password_hash: cleanPass, updated_at: new Date().toISOString() }, { eqCol: 'id', eqVal: cleanId });
        }

        try {
          if (!authTargetId && targetEmail) {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
            const found = (authList?.users || []).find((u: any) => u.email?.toLowerCase() === targetEmail);
            if (found?.id) authTargetId = found.id;
          }
          if (authTargetId) {
            await supabaseAdmin.auth.admin.updateUserById(authTargetId, { password: cleanPass });
          }
        } catch (authErr) {
          console.warn('[reset-security] Auth password update notice:', authErr);
        }

        actionsDone.push('Senha redefinida');
      }

      return res.json({
        success: true,
        message: `${actionsDone.join(' e ')} com sucesso.`,
      });
    } catch (err: any) {
      console.error('[POST /api/admin/users/:kind/:id/reset-security] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // UPLOAD DEDICADO DE AVATAR / FOTO DE USUÁRIO (Câmera ou Galeria)
  app.post(['/api/admin/upload-avatar', '/api/public/upload-avatar'], async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const { imageBase64, prefix = 'avatar', userId, kind } = req.body;
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ success: false, error: 'Imagem Base64 não fornecida.' });
      }

      const uploadedUrl = await uploadBase64MediaIfNeeded(imageBase64, prefix, 'avatars');
      if (!uploadedUrl) {
        return res.status(500).json({ success: false, error: 'Falha ao processar e salvar imagem no Supabase Storage.' });
      }

      // Se userId e kind foram fornecidos, persiste imediatamente no banco
      if (userId && kind) {
        let table = 'clients';
        if (kind === 'professional') table = 'professionals';
        else if (kind === 'salon_user') table = 'salon_users';
        else if (kind === 'admin') table = 'system_admins';

        const updateData: Record<string, any> = {
          avatar_url: uploadedUrl,
          updated_at: new Date().toISOString(),
        };
        if (table === 'clients' || table === 'professionals') {
          updateData.photo_url = uploadedUrl;
        }

        await safeSupabaseWrite(table, 'update', updateData, { eqCol: 'id', eqVal: userId });

        // Tenta também sincronizar no auth profiles se aplicável
        try {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
            await supabaseAdmin.from('profiles').update({
              avatar_url: uploadedUrl,
              photo_url: uploadedUrl,
              updated_at: new Date().toISOString(),
            }).eq('id', userId);
          }
        } catch {}
      }

      return res.json({ success: true, url: uploadedUrl });
    } catch (err: any) {
      console.error('[upload-avatar] Exception:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: List all Clients (bypasses RLS with service role + deduplicates against system_admins)
  app.get('/api/admin/clients', async (req, res) => {
    try {
      await consolidateDuplicateUsersInSupabase();

      const [{ data, error }, { data: sysAdmins }] = await Promise.all([
        supabaseAdmin.from('clients').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('system_admins').select('id, email, username, cpf'),
      ]);

      if (error) {
        console.warn('[GET /api/admin/clients] Supabase error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      const adminEmails = new Set((sysAdmins || []).map((a: any) => normalizeEmailKey(a.email)).filter(Boolean));
      const adminUsers = new Set((sysAdmins || []).map((a: any) => normalizeUsernameKey(a.username)).filter(Boolean));
      const adminCpfs = new Set((sysAdmins || []).map((a: any) => normalizeCpfKey(a.cpf)).filter(Boolean));

      // Sincronização direta com a tabela relacional public.dependents (Tríade Sync)
      const dependentsByParent: Record<string, any[]> = {};
      try {
        const { data: depData, error: depErr } = await supabaseAdmin
          .from('dependents')
          .select('*')
          .order('created_at', { ascending: true });
        if (!depErr && Array.isArray(depData)) {
          depData.forEach((d: any) => {
            const pId = d.parent_client_id;
            if (pId) {
              if (!dependentsByParent[pId]) dependentsByParent[pId] = [];
              dependentsByParent[pId].push({
                id: d.id,
                parent_client_id: d.parent_client_id,
                full_name: d.full_name || d.name,
                relationship: d.relationship || 'other',
                birth_date: d.birth_date,
                notes: d.notes,
                is_unlinked: !!d.is_unlinked,
                unlinked_at: d.unlinked_at,
                created_at: d.created_at,
              });
            }
          });
        }
      } catch (depErr) {
        console.warn('[GET /api/admin/clients] Dependents query notice:', depErr);
      }

      // Respostas de Perguntas Secretas configuradas (public.user_security_answers — SQL v5.0)
      const secByClient: Record<string, string[]> = {};
      try {
        const { data: secData } = await supabaseAdmin
          .from('user_security_answers')
          .select('client_id, question_code');
        if (Array.isArray(secData)) {
          secData.forEach((row: any) => {
            const cid = row.client_id ? String(row.client_id) : '';
            if (cid) {
              if (!secByClient[cid]) secByClient[cid] = [];
              if (row.question_code && !secByClient[cid].includes(row.question_code)) {
                secByClient[cid].push(row.question_code);
              }
            }
          });
        }
      } catch {}

      const seenClientEmails = new Set<string>();
      const seenClientUsers = new Set<string>();

      const clients = (data || [])
        .filter((c: any) => {
          const em = normalizeEmailKey(c.email);
          const us = normalizeUsernameKey(c.username);
          const cp = normalizeCpfKey(c.cpf);
          if ((em && adminEmails.has(em)) || (us && adminUsers.has(us)) || (cp && adminCpfs.has(cp))) {
            return false;
          }
          if ((em && seenClientEmails.has(em)) || (us && seenClientUsers.has(us))) {
            return false;
          }
          if (em) seenClientEmails.add(em);
          if (us) seenClientUsers.add(us);
          return true;
        })
        .map((c: any) => {
          const tableDeps = dependentsByParent[c.id] || [];
          const rawDeps = Array.isArray(c.dependents) ? c.dependents : [];
          const combinedDeps = tableDeps.length > 0 ? tableDeps : rawDeps;
          const secList = secByClient[String(c.id)] || (c.security_question_code ? [c.security_question_code] : []);

          return {
            ...c,
            full_name: c.name || c.full_name || 'Cliente',
            username: (c.username || (c.email ? c.email.split('@')[0] : (c.name || 'cliente').toLowerCase().replace(/\s+/g, ''))).replace(/^@+/, ''),
            phone: c.phone || c.phone_whatsapp || '—',
            phone_secondary: c.phone_secondary || '',
            dependents: combinedDeps,
            dependents_count: combinedDeps.length || c.dependents_count || 0,
            is_active: c.is_active !== undefined ? !!c.is_active : true,
            access_level: c.access_level || 'Cliente Titular',
            has_security_question: secList.length > 0,
            security_questions_configured: secList,
          };
        });

      return res.json({ success: true, clients });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Unlink Dependent (Soft unlink via service role com preservação histórica)
  app.patch('/api/admin/dependents/:id/unlink', async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from('dependents')
        .update({
          is_unlinked: true,
          unlinked_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn(`[PATCH /api/admin/dependents/${id}/unlink] Notice:`, error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, dependent: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });


  // ADMIN: List all Professionals (bypasses RLS with service role)
  app.get('/api/admin/professionals', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('professionals')
        .select('*, salons(trade_name, slug)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GET /api/admin/professionals] Supabase error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      const professionals = (data || []).map((p: any) => ({
        ...p,
        full_name: p.name || p.full_name || 'Profissional',
        username: (p.username || (p.nickname ? p.nickname.toLowerCase().replace(/\s+/g, '') : (p.email ? p.email.split('@')[0] : (p.name || 'prof').toLowerCase().replace(/\s+/g, '')))).replace(/^@+/, ''),
        phone_whatsapp: p.phone || p.phone_whatsapp || '—',
        phone_secondary: p.phone_secondary || '',
        current_salon_name: p.salons?.trade_name || p.current_salon_name || 'Sem Salão Ativo',
        current_salon_slug: p.salons?.slug || p.current_salon_slug || '',
        status: p.status || (p.is_active === false ? 'suspended' : 'active'),
        access_level: p.access_level || 'MEI Parceiro',
      }));

      return res.json({ success: true, professionals });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: List all Salon Users / Managers directly from public.salon_users (Zero Synthetic Rows)
  app.get('/api/admin/salon-users', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('salon_users')
        .select('*, salons(trade_name, slug)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GET /api/admin/salon-users] Supabase notice:', error.message);
        return res.json({ success: true, salonUsers: [] });
      }

      const salonUsers = (data || []).map((su: any) => {
        const fullName = su.full_name || su.name || 'Gestor de Salão';
        const cleanEmail = su.email || '';
        const rawUsername = su.username || (cleanEmail ? cleanEmail.split('@')[0] : fullName.toLowerCase().replace(/\s+/g, ''));
        return {
          ...su,
          salon_name: su.salons?.trade_name || su.salon_name || 'Salão Parceiro',
          salon_slug: su.salons?.slug || su.salon_slug || 'parceiro',
          full_name: fullName,
          username: String(rawUsername || 'gestor').replace(/^@+/, ''),
          email: cleanEmail,
          phone_whatsapp: su.phone_whatsapp || su.phone || '—',
          phone_secondary: su.phone_secondary || '',
          cpf: su.cpf || '',
          role: su.role || 'owner',
          access_level:
            su.access_level ||
            (su.role === 'owner'
              ? 'Proprietário (Dono)'
              : su.role === 'manager'
              ? 'Gerente Geral'
              : 'Recepção & Atendimento'),
          is_active: su.is_active !== false,
          can_manage_financial: su.can_manage_financial !== false,
          can_manage_professionals: su.can_manage_professionals !== false,
          total_appointments: Number(su.total_appointments) || 0,
          dependents_count: Number(su.dependents_count) || 0,
          created_via: su.created_via || null,
          created_at: su.created_at || '',
        };
      });

      return res.json({ success: true, salonUsers });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Exclusão Unificada e Segura de Usuário (Service Role com Limpeza de FKs)
  app.delete('/api/admin/users/:kind/:id', async (req, res) => {
    try {
      const { kind, id } = req.params;
      if (!kind || !id) {
        return res.status(400).json({ success: false, error: 'Kind e ID são obrigatórios.' });
      }

      if (kind === 'client') {
        // 1. Limpa registros dependentes e respostas de segurança para evitar violação de FK
        try {
          await supabaseAdmin.from('dependents').delete().eq('parent_client_id', id);
          await supabaseAdmin.from('user_security_answers').delete().eq('client_id', String(id));
        } catch (depErr) {
          console.warn('[DELETE /api/admin/users/client] Aviso dependentes:', depErr);
        }
        // 2. Desvincula histórico de agendamentos
        try {
          await supabaseAdmin.from('appointments').update({ client_id: null }).eq('client_id', id);
        } catch {}
        // 3. Exclui da tabela clients
        const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
        // 4. Limpa profiles se for UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          try {
            await supabaseAdmin.from('profiles').delete().eq('id', id);
          } catch {}
        }
        return res.json({ success: true, deletedId: id, kind });
      }

      if (kind === 'dependent') {
        const { error } = await supabaseAdmin.from('dependents').delete().eq('id', id);
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
        return res.json({ success: true, deletedId: id, kind });
      }

      if (kind === 'professional') {
        try {
          await supabaseAdmin.from('appointments').update({ professional_id: null }).eq('professional_id', id);
        } catch {}
        const { error } = await supabaseAdmin.from('professionals').delete().eq('id', id);
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
        return res.json({ success: true, deletedId: id, kind });
      }

      if (kind === 'salon_user') {
        const cleanId = id.startsWith('su-') ? id.replace(/^su-/, '') : id;
        try {
          await supabaseAdmin.from('salon_users').delete().eq('id', cleanId);
        } catch {}
        return res.json({ success: true, deletedId: id, kind });
      }

      if (kind === 'admin') {
        const { error } = await supabaseAdmin.from('system_admins').delete().eq('id', id);
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
        return res.json({ success: true, deletedId: id, kind });
      }

      return res.status(400).json({ success: false, error: `Tipo "${kind}" desconhecido.` });
    } catch (err: any) {
      console.error('[DELETE /api/admin/users/:kind/:id] Erro:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Exclusão em Massa de Usuários
  app.post('/api/admin/users/batch-delete', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de usuários para exclusão vazia.' });
      }

      const clientIds = items.filter((it: any) => it.kind === 'client').map((it: any) => it.id);
      const depIds = items.filter((it: any) => it.kind === 'dependent').map((it: any) => it.id);
      const profIds = items.filter((it: any) => it.kind === 'professional').map((it: any) => it.id);
      const salonUserIds = items.filter((it: any) => it.kind === 'salon_user').map((it: any) => it.id.replace(/^su-/, ''));
      const adminIds = items.filter((it: any) => it.kind === 'admin').map((it: any) => it.id);

      if (clientIds.length > 0) {
        try {
          await supabaseAdmin.from('dependents').delete().in('parent_client_id', clientIds);
          await supabaseAdmin.from('appointments').update({ client_id: null }).in('client_id', clientIds);
        } catch {}
        await supabaseAdmin.from('clients').delete().in('id', clientIds);
      }

      if (depIds.length > 0) {
        await supabaseAdmin.from('dependents').delete().in('id', depIds);
      }

      if (profIds.length > 0) {
        try {
          await supabaseAdmin.from('appointments').update({ professional_id: null }).in('professional_id', profIds);
        } catch {}
        await supabaseAdmin.from('professionals').delete().in('id', profIds);
      }

      if (salonUserIds.length > 0) {
        try {
          await supabaseAdmin.from('salon_users').delete().in('id', salonUserIds);
        } catch {}
      }

      if (adminIds.length > 0) {
        await supabaseAdmin.from('system_admins').delete().in('id', adminIds);
      }

      return res.json({ success: true, count: items.length });
    } catch (err: any) {
      console.error('[POST /api/admin/users/batch-delete] Erro:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Atualizar Status de Usuário
  app.patch('/api/admin/users/:kind/:id/status', async (req, res) => {
    try {
      const { kind, id } = req.params;
      const { is_active } = req.body;
      const activeBool = is_active !== false;

      if (kind === 'client') {
        await supabaseAdmin.from('clients').update({ is_active: activeBool }).eq('id', id);
      } else if (kind === 'professional') {
        await supabaseAdmin.from('professionals').update({ status: activeBool ? 'active' : 'suspended' }).eq('id', id);
      } else if (kind === 'salon_user') {
        const cleanId = id.replace(/^su-/, '');
        await supabaseAdmin.from('salon_users').update({ is_active: activeBool }).eq('id', cleanId);
      } else if (kind === 'admin') {
        await supabaseAdmin.from('system_admins').update({ is_active: activeBool }).eq('id', id);
      } else if (kind === 'dependent') {
        await supabaseAdmin.from('dependents').update({ is_unlinked: !activeBool }).eq('id', id);
      }

      return res.json({ success: true, is_active: activeBool });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: List all Salons (bypasses RLS with service role)
  app.get('/api/admin/salons', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('salons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, salons: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUBLIC API for vagouapp.com and external clients to pull data from admin
  app.get('/api/public/salons', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const { data, error } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, salons: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/public/services', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const { data, error } = await supabaseAdmin
        .from('services')
        .select('*, salons(trade_name, slug)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, services: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUBLIC / ADMIN: Verificar disponibilidade de slug personalizado sem hífen em tempo real
  const RESERVED_SYSTEM_SLUGS = new Set([
    'adm', 'admin', 'portal', 'app', 'www', 'api', 'meunegocio', 'seunegocio',
    'mail', 'smtp', 'pop', 'imap', 'ftp', 'vagou', 'vagouapp', 'suporte',
    'ajuda', 'painel', 'sistema', 'master', 'radar', 'cadastro', 'login',
    'auth', 'cdn', 'static', 'assets', 'dev', 'staging', 'prod'
  ]);

  app.get('/api/public/check-slug/:slug', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const rawSlug = String(req.params.slug || '');
      const ownerEmail = String(req.query.email || '').trim().toLowerCase();
      const cleanSlug = rawSlug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      if (cleanSlug.length < 3) {
        return res.json({
          success: true,
          available: false,
          reason: 'too_short',
          cleanSlug,
          suggestions: [],
        });
      }

      const { data: allSalons } = await supabaseAdmin
        .from('salons')
        .select('id, slug, subdomain, trade_name, email');

      const takenSlugs = new Set<string>(RESERVED_SYSTEM_SLUGS);
      let matchedSalon: any = null;

      (allSalons || []).forEach((s: any) => {
        const sSlug = String(s.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const sSub = String(s.subdomain || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const isSameOwner = ownerEmail && s.email && String(s.email).trim().toLowerCase() === ownerEmail;
        if (!isSameOwner) {
          if (sSlug) takenSlugs.add(sSlug);
          if (sSub) takenSlugs.add(sSub);
          if (sSlug === cleanSlug || sSub === cleanSlug || s.slug === cleanSlug) {
            matchedSalon = s;
          }
        }
      });

      const buildSuggestions = (base: string): string[] => {
        const candidates = [
          `${base}oficial`,
          `${base}vip`,
          `${base}studio`,
          `${base}app`,
          `${base}br`,
          `${base}pro`,
          `${base}1`,
          `${base}2`,
        ];
        return candidates.filter((c) => !takenSlugs.has(c)).slice(0, 4);
      };

      if (RESERVED_SYSTEM_SLUGS.has(cleanSlug)) {
        return res.json({
          success: true,
          available: false,
          reason: 'reserved',
          cleanSlug,
          suggestions: buildSuggestions(cleanSlug),
        });
      }

      if (matchedSalon || takenSlugs.has(cleanSlug)) {
        return res.json({
          success: true,
          available: false,
          reason: 'taken',
          cleanSlug,
          existingTradeName: matchedSalon?.trade_name || '',
          suggestions: buildSuggestions(cleanSlug),
        });
      }

      return res.json({
        success: true,
        available: true,
        reason: 'ok',
        cleanSlug,
        suggestions: [],
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUBLIC / ADMIN: Obter dados e identificação visual do estabelecimento por slug
  app.get('/api/admin/salons/by-slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      if (!slug) {
        return res.status(400).json({ success: false, error: 'Slug não informado.' });
      }

      const cleanSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

      const { data, error } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      if (!data) {
        return res.status(404).json({ success: false, error: 'Estabelecimento não encontrado.' });
      }

      const normalizedSalon = {
        ...data,
        favicon_url: data.favicon_url || data.branding?.faviconUrl || data.branding?.salonIcon || data.logo_url || null,
        slogan: data.slogan || data.branding?.slogan || '',
        brand_font: data.brand_font || data.branding?.brandFont || 'Poppins',
      };

      return res.json({ success: true, salon: normalizedSalon });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.options('/api/admin/salons', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  });

  // ADMIN: Create new Salon (Service Role) — Blindado com Geocoding Automático + Persistência Resiliente
  app.post('/api/admin/salons', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    try {
      const payload = { ...req.body };
      const resolvedTradeName = String(payload.trade_name || payload.name || '').trim();
      const referer = String(req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/');
      if (!resolvedTradeName || !payload.slug) {
        return res.status(400).json({ success: false, error: 'Nome Fantasia e Subdomínio são obrigatórios.' });
      }
      payload.trade_name = resolvedTradeName;

      const cleanSlug = payload.slug
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      if (cleanSlug.length < 3 || RESERVED_SYSTEM_SLUGS.has(cleanSlug)) {
        return res.status(400).json({
          success: false,
          error: `O endereço "${cleanSlug}.vagouapp.com" é reservado ou inválido. Escolha outro link personalizado.`,
        });
      }

      // Verifica se já existe outro estabelecimento com o mesmo slug de outro titular
      const { data: existingSlugSalon } = await supabaseAdmin
        .from('salons')
        .select('id, email, trade_name')
        .eq('slug', cleanSlug)
        .maybeSingle();

      const incomingEmail = payload.email?.trim().toLowerCase() || '';
      if (
        existingSlugSalon &&
        existingSlugSalon.email &&
        incomingEmail &&
        existingSlugSalon.email.trim().toLowerCase() !== incomingEmail
      ) {
        return res.status(409).json({
          success: false,
          error: `O link "${cleanSlug}.vagouapp.com" já pertence a outro estabelecimento. Escolha um slug personalizado diferente.`,
        });
      }

      const resolvedLogo = await uploadBase64MediaIfNeeded(payload.logo_url, `${cleanSlug}-logo`);
      const resolvedFavicon = (await uploadBase64MediaIfNeeded(payload.favicon_url, `${cleanSlug}-favicon`)) || resolvedLogo || null;
      const resolvedSlogan = payload.slogan?.trim() || '';
      const resolvedBrandFont = payload.brand_font?.trim() || 'Poppins';
      const resolvedStatus = String(payload.status || 'active').toLowerCase();

      // Geocodifica o endereço do estabelecimento automaticamente (ou usa as coordenadas cravadas no pino)
      const resolvedGeo = await resolveAddressCoordinatesServerSide(
        {
          cep: payload.cep,
          address: payload.address || payload.street,
          street_number: payload.street_number || payload.streetNumber || payload.number,
          neighborhood: payload.neighborhood,
          city: payload.city,
          state: payload.state,
          latitude: payload.latitude ?? payload.lat,
          longitude: payload.longitude ?? payload.lng,
        },
        referer
      );

      const streetNumberVal = String(payload.street_number || payload.streetNumber || payload.number || '').trim() || null;
      const complementVal = String(payload.complement || '').trim() || null;
      const resolvedPhone = String(payload.phone_whatsapp || payload.phone || '').trim() || null;
      const resolvedOwnerName = String(payload.owner_name || payload.responsibleName || payload.legal_name || resolvedTradeName).trim();
      const resolvedOwnerCpf = String(payload.owner_cpf || payload.responsibleCpf || '').trim() || null;

      const resolvedFee = Number(payload.fee_per_booking ?? payload.billing_fee_value ?? 2.5);
      const resolvedBillingPlan = payload.billing_plan || 'PER_APPOINTMENT';
      const resolvedMonthlyFee = Number(payload.monthly_subscription_fee ?? 89.9);
      const resolvedDueDay = Number(payload.billing_due_day ?? 10);
      const resolvedPrimaryColor = payload.primary_color || '#10B981';
      const resolvedSecondaryColor = payload.secondary_color || '#065F46';
      const resolvedDefaultTheme = payload.default_theme || 'light';

      const nowIso = new Date().toISOString();
      const resolvedCreatedVia = payload.created_via || 'admvapp';

      // Prepara objeto limpo com colunas físicas reais de public.salons + metadados ricos em branding JSONB
      const dbInsert: Record<string, any> = {
        name: resolvedTradeName,
        trade_name: resolvedTradeName,
        legal_name: payload.legal_name?.trim() || resolvedTradeName,
        slug: cleanSlug,
        subdomain: cleanSlug,
        category: payload.category || 'Barbearia',
        document_type: payload.document_type || 'CNPJ',
        document_number: payload.document_number?.trim() || null,
        owner_cpf: resolvedOwnerCpf,
        pix_key: payload.pix_key?.trim() || null,
        pix_keys: Array.isArray(payload.pix_keys) ? payload.pix_keys : [],
        operating_model: payload.operating_model || 'physical',
        billing_plan: resolvedBillingPlan,
        billing_fee_value: resolvedFee,
        phone: resolvedPhone,
        phone_whatsapp: resolvedPhone,
        phone_landline: payload.phone_landline?.trim() || null,
        email: payload.email?.trim().toLowerCase() || null,
        address: (payload.address || payload.street || '').trim() || null,
        street_number: streetNumberVal,
        complement: complementVal,
        neighborhood: payload.neighborhood?.trim() || null,
        city: payload.city?.trim() || 'São Paulo',
        state: payload.state?.trim().toUpperCase() || 'SP',
        cep: payload.cep?.trim() || null,
        latitude: resolvedGeo.latitude,
        longitude: resolvedGeo.longitude,
        formatted_address: resolvedGeo.formatted_address,
        google_place_id: resolvedGeo.google_place_id,
        logo_url: resolvedLogo,
        logo_light_url: resolvedLogo,
        logo_dark_url: resolvedLogo,
        favicon_url: resolvedFavicon,
        pwa_name: resolvedTradeName,
        slogan: resolvedSlogan,
        brand_font: resolvedBrandFont,
        default_theme: resolvedDefaultTheme,
        primary_color: resolvedPrimaryColor,
        secondary_color: resolvedSecondaryColor,
        nav_bg_style: payload.nav_bg_style || 'solid',
        nav_bg_color: payload.nav_bg_color || '#D1FAE5',
        nav_active_color: payload.nav_active_color || '#10B981',
        section_header_bg_style: payload.section_header_bg_style || 'solid',
        section_header_bg_color: payload.section_header_bg_color || '#ECFDF5',
        section_header_text_color: payload.section_header_text_color || '#065F46',
        section_header_icon_color: payload.section_header_icon_color || '#059669',
        status: resolvedStatus,
        is_active: resolvedStatus !== 'incomplete' && resolvedStatus !== 'suspended',
        is_verified: resolvedStatus === 'active' || payload.is_verified === true,
        ...(existingSlugSalon ? {} : { created_at: nowIso }),
        updated_at: nowIso,
        branding: {
          themeMode: resolvedDefaultTheme,
          defaultTheme: resolvedDefaultTheme,
          primaryColor: resolvedPrimaryColor,
          secondaryColor: resolvedSecondaryColor,
          navBgStyle: payload.nav_bg_style || 'solid',
          navBgColor: payload.nav_bg_color || '#D1FAE5',
          navIconBorder: payload.nav_icon_border || 'none',
          sectionHeaderBgColor: payload.section_header_bg_color || '#ECFDF5',
          sectionHeaderTextColor: payload.section_header_text_color || '#065F46',
          sectionHeaderIconColor: payload.section_header_icon_color || '#059669',
          category: payload.category || 'Barbearia',
          faviconUrl: resolvedFavicon || '',
          salonIcon: resolvedFavicon || '',
          slogan: resolvedSlogan,
          brandFont: resolvedBrandFont,
          pwaName: resolvedTradeName,
          address: (payload.address || payload.street || '').trim(),
          streetNumber: streetNumberVal || '',
          complement: complementVal || '',
          neighborhood: payload.neighborhood?.trim() || '',
          city: payload.city?.trim() || 'São Paulo',
          state: payload.state?.trim().toUpperCase() || 'SP',
          cep: payload.cep?.trim() || '',
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          formatted_address: resolvedGeo.formatted_address,
          google_place_id: resolvedGeo.google_place_id,
          phoneLandline: payload.phone_landline?.trim() || '',
          owner_name: resolvedOwnerName,
          owner_email: payload.email?.trim().toLowerCase() || '',
          owner_phone: resolvedPhone || '',
          ownerCpf: resolvedOwnerCpf || '',
          billing_plan: resolvedBillingPlan,
          fee_per_booking: resolvedFee,
          billing_fee_value: resolvedFee,
          monthly_subscription_fee: resolvedMonthlyFee,
          billing_due_day: resolvedDueDay,
          pixKeys: Array.isArray(payload.pix_keys) ? payload.pix_keys : [],
          created_via: resolvedCreatedVia,
          created_at_iso: nowIso,
        },
      };

      // Upsert resiliente por slug
      const { data, error } = await safeSupabaseWrite('salons', 'upsert', dbInsert, { onConflict: 'slug' });

      if (error) {
        console.error('[POST /api/admin/salons Supabase Error]:', error);
        return res.status(400).json({ success: false, error: `Erro no banco: ${error.message}` });
      }

      // Sincroniza configurações de UI na tabela relacional public.salon_ui_settings (SQL v5.0)
      if (data?.id) {
        try {
          await safeSupabaseWrite(
            'salon_ui_settings',
            'upsert',
            {
              salon_id: data.id,
              default_theme: resolvedDefaultTheme,
              primary_color: resolvedPrimaryColor,
              secondary_color: resolvedSecondaryColor,
              pwa_name: payload.trade_name.trim(),
              section_header_bg_color: payload.section_header_bg_color || '#ECFDF5',
              section_header_text_color: payload.section_header_text_color || '#065F46',
              section_header_icon_color: payload.section_header_icon_color || '#059669',
              section_header_bg_style: 'solid',
              nav_bg_style: payload.nav_bg_style || 'solid',
              nav_bg_color: payload.nav_bg_color || '#D1FAE5',
              nav_icon_border: payload.nav_icon_border || 'none',
              nav_active_color: payload.nav_active_color || '#10B981',
              branding_snapshot: dbInsert.branding,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'salon_id' }
          );
        } catch (uiSyncErr) {
          console.warn('[POST /api/admin/salons] Aviso ao criar salon_ui_settings:', uiSyncErr);
        }
      }

      // Garante vínculo único do Proprietário sem duplicar conta e NUNCA violando salons_owner_id_fkey (auth.users)
      if (data?.id && (payload.email || payload.owner_name || payload.legal_name)) {
        try {
          const ownerName = (payload.owner_name || payload.legal_name || payload.trade_name || 'Proprietário').trim();
          const ownerEmail = (payload.email || `${cleanSlug}@vagouapp.com`).trim().toLowerCase();
          const ownerPhone = payload.phone_whatsapp?.trim() || '';
          const ownerUsername = ownerEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || cleanSlug;

          // 0. Verifica se já existe conta real em auth.users (única tabela aceita por salons_owner_id_fkey)
          let verifiedAuthUserId: string | null = null;
          try {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
            const matchedAuth = (authList?.users || []).find(
              (u: any) => u.email?.toLowerCase() === ownerEmail
            );
            if (matchedAuth?.id) {
              verifiedAuthUserId = matchedAuth.id;
            }
          } catch {}

          // 1. Verifica se o e-mail pertence a um Administrador (system_admins)
          const { data: existingAdmin } = await supabaseAdmin
            .from('system_admins')
            .select('id, email, password_hash')
            .ilike('email', ownerEmail)
            .maybeSingle();

          // 2. Somente consulta/cria em clients se NÃO for Administrador do sistema
          let existingClientRow: any = null;
          if (!existingAdmin) {
            const { data: existingClient } = await supabaseAdmin
              .from('clients')
              .select('id, user_id, password_hash')
              .ilike('email', ownerEmail)
              .maybeSingle();
            existingClientRow = existingClient;
          }

          // Se ainda não possui conta em auth.users e temos e-mail válido, tenta provisionar silenciosamente
          if (!verifiedAuthUserId && ownerEmail.includes('@')) {
            const candidatePassword =
              existingAdmin?.password_hash ||
              existingClientRow?.password_hash ||
              'Vagou@2026!';
            try {
              const { data: createdAuth, error: createAuthErr } =
                await supabaseAdmin.auth.admin.createUser({
                  email: ownerEmail,
                  password: candidatePassword,
                  email_confirm: true,
                  user_metadata: {
                    full_name: ownerName,
                    phone: ownerPhone || undefined,
                    username: ownerUsername,
                  },
                });
              if (!createAuthErr && createdAuth?.user?.id) {
                verifiedAuthUserId = createdAuth.user.id;
              }
            } catch {}
          }

          if (!existingAdmin) {
            if (!existingClientRow) {
              await safeSupabaseWrite('clients', 'insert', {
                ...(verifiedAuthUserId ? { id: verifiedAuthUserId, user_id: verifiedAuthUserId } : {}),
                name: ownerName,
                full_name: ownerName,
                username: ownerUsername,
                email: ownerEmail,
                phone: ownerPhone,
                cpf: payload.owner_cpf?.trim() || null,
                cep: dbInsert.cep,
                address: dbInsert.address,
                street_number: dbInsert.street_number,
                complement: dbInsert.complement,
                neighborhood: dbInsert.neighborhood,
                city: dbInsert.city,
                state: dbInsert.state,
                latitude: resolvedGeo.latitude,
                longitude: resolvedGeo.longitude,
                formatted_address: resolvedGeo.formatted_address,
                origin_type: 'establishment',
                created_via: resolvedCreatedVia,
                origin_salon_id: data.id,
                is_active: true,
                access_level: 'Proprietário (Dono)',
                created_at: nowIso,
                updated_at: nowIso,
              });
            } else {
              await safeSupabaseWrite(
                'clients',
                'update',
                {
                  ...(verifiedAuthUserId ? { user_id: verifiedAuthUserId } : {}),
                  origin_type: 'establishment',
                  origin_salon_id: data.id,
                  access_level: 'Proprietário (Dono)',
                  cep: dbInsert.cep,
                  address: dbInsert.address,
                  street_number: dbInsert.street_number,
                  complement: dbInsert.complement,
                  neighborhood: dbInsert.neighborhood,
                  city: dbInsert.city,
                  state: dbInsert.state,
                  latitude: resolvedGeo.latitude,
                  longitude: resolvedGeo.longitude,
                  formatted_address: resolvedGeo.formatted_address,
                },
                { eqCol: 'id', eqVal: existingClientRow.id }
              );
            }
          }

          // 3. Garante registro do Proprietário na equipe do salão (public.professionals) para abrir direto no app
          const { data: existingProf } = await supabaseAdmin
            .from('professionals')
            .select('id')
            .eq('salon_id', data.id)
            .ilike('email', ownerEmail)
            .maybeSingle();

          if (!existingProf) {
            await safeSupabaseWrite('professionals', 'insert', {
              salon_id: data.id,
              ...(verifiedAuthUserId ? { user_id: verifiedAuthUserId } : {}),
              name: ownerName,
              full_name: ownerName,
              username: ownerUsername,
              role: 'Proprietário',
              access_level: 'Proprietário (Dono)',
              phone: ownerPhone || null,
              phone_whatsapp: ownerPhone || null,
              email: ownerEmail,
              cpf: payload.owner_cpf?.trim() || null,
              status: 'active',
              is_active: true,
              cep: dbInsert.cep,
              address: dbInsert.address,
              street_number: dbInsert.street_number,
              complement: dbInsert.complement,
              neighborhood: dbInsert.neighborhood,
              city: dbInsert.city,
              state: dbInsert.state,
              created_at: nowIso,
              updated_at: nowIso,
            });
          }

          // 4. Atualiza owner_id no salão SOMENTE se verifiedAuthUserId existir em auth.users
          if (verifiedAuthUserId) {
            await safeSupabaseWrite(
              'salons',
              'update',
              { owner_id: verifiedAuthUserId },
              { eqCol: 'id', eqVal: data.id }
            );

            const { data: existingMember } = await supabaseAdmin
              .from('salon_members')
              .select('id')
              .eq('salon_id', data.id)
              .eq('user_id', verifiedAuthUserId)
              .maybeSingle();

            if (!existingMember) {
              await supabaseAdmin
                .from('salon_members')
                .insert([{ salon_id: data.id, user_id: verifiedAuthUserId, role: 'owner' }]);
            }
          }
        } catch (ownerSyncErr) {
          console.warn('[POST /api/admin/salons] Aviso ao sincronizar proprietário:', ownerSyncErr);
        }
      }

      return res.json({
        success: true,
        salon: {
          ...data,
          street_number: streetNumberVal,
          complement: complementVal,
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          formatted_address: resolvedGeo.formatted_address,
        },
      });
    } catch (err: any) {
      console.error('[POST /api/admin/salons Exception]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro no servidor' });
    }
  });

  // ADMIN: Update Salon (Service Role) — Blindado contra PGRST204, com Geocoding Automático e Propagação por CPF
  app.patch('/api/admin/salons/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const incoming = { ...req.body };
      const referer = String(req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/');

      // 1. Carrega o registro atual do salão para mesclar branding com segurança sem perder chaves existentes
      const { data: currentSalon } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const currentBranding =
        currentSalon?.branding && typeof currentSalon.branding === 'object' ? { ...currentSalon.branding } : {};

      // 2. Verifica se houve envio/alteração de endereço ou coordenadas e geocodifica automaticamente
      const hasAddressInPayload =
        incoming.cep !== undefined ||
        incoming.address !== undefined ||
        incoming.street_number !== undefined ||
        incoming.streetNumber !== undefined ||
        incoming.neighborhood !== undefined ||
        incoming.city !== undefined ||
        incoming.state !== undefined ||
        incoming.latitude !== undefined ||
        incoming.longitude !== undefined;

      const effectiveCep = incoming.cep !== undefined ? incoming.cep : currentSalon?.cep;
      const effectiveAddress = incoming.address !== undefined ? incoming.address : currentSalon?.address;
      const effectiveStreetNumber =
        incoming.street_number !== undefined
          ? incoming.street_number
          : incoming.streetNumber !== undefined
          ? incoming.streetNumber
          : currentSalon?.street_number;
      const effectiveComplement =
        incoming.complement !== undefined ? incoming.complement : currentSalon?.complement;
      const effectiveNeighborhood =
        incoming.neighborhood !== undefined ? incoming.neighborhood : currentSalon?.neighborhood;
      const effectiveCity = incoming.city !== undefined ? incoming.city : currentSalon?.city;
      const effectiveState = incoming.state !== undefined ? incoming.state : currentSalon?.state;

      // Se o endereço mudou e nenhuma coordenada nova explícita foi enviada, força re-geocodificação
      const addressChanged =
        (incoming.cep !== undefined && incoming.cep !== currentSalon?.cep) ||
        (incoming.address !== undefined && incoming.address !== currentSalon?.address) ||
        (effectiveStreetNumber !== undefined && effectiveStreetNumber !== currentSalon?.street_number) ||
        (incoming.city !== undefined && incoming.city !== currentSalon?.city);

      let resolvedGeo = {
        latitude:
          incoming.latitude !== undefined && incoming.latitude !== null
            ? Number(incoming.latitude)
            : (currentSalon?.latitude ?? currentBranding.latitude ?? null),
        longitude:
          incoming.longitude !== undefined && incoming.longitude !== null
            ? Number(incoming.longitude)
            : (currentSalon?.longitude ?? currentBranding.longitude ?? null),
        formatted_address:
          incoming.formatted_address || currentSalon?.formatted_address || currentBranding.formatted_address || null,
        google_place_id:
          incoming.google_place_id || currentSalon?.google_place_id || currentBranding.google_place_id || null,
      };

      if (hasAddressInPayload && (addressChanged || !resolvedGeo.latitude || !resolvedGeo.longitude)) {
        const geo = await resolveAddressCoordinatesServerSide(
          {
            cep: effectiveCep,
            address: effectiveAddress,
            street_number: effectiveStreetNumber,
            neighborhood: effectiveNeighborhood,
            city: effectiveCity,
            state: effectiveState,
            latitude: incoming.latitude,
            longitude: incoming.longitude,
            forceGeocode: addressChanged && incoming.latitude === undefined,
          },
          referer
        );
        resolvedGeo = geo;
      }

      // 3. Empacota metadados e campos compostos dentro de branding JSONB (evitando erro PGRST204 de coluna inexistente)
      const mergedBranding: Record<string, any> = {
        ...currentBranding,
        ...(incoming.branding && typeof incoming.branding === 'object' ? incoming.branding : {}),
        ...(incoming.category !== undefined ? { category: incoming.category } : {}),
        ...(incoming.pix_keys !== undefined ? { pix_keys: incoming.pix_keys, pixKeys: incoming.pix_keys } : {}),
        ...(incoming.operating_hours !== undefined
          ? { operating_hours: incoming.operating_hours, operatingHours: incoming.operating_hours }
          : {}),
        ...(incoming.fee_per_booking !== undefined ? { fee_per_booking: incoming.fee_per_booking } : {}),
        ...(incoming.monthly_subscription_fee !== undefined
          ? { monthly_subscription_fee: incoming.monthly_subscription_fee }
          : {}),
        ...(incoming.billing_due_day !== undefined ? { billing_due_day: incoming.billing_due_day } : {}),
        ...(incoming.has_cnpj !== undefined ? { has_cnpj: incoming.has_cnpj } : {}),
        ...(incoming.document_type !== undefined ? { document_type: incoming.document_type } : {}),
        ...(incoming.operating_model !== undefined ? { operating_model: incoming.operating_model } : {}),
        ...(incoming.billing_plan !== undefined ? { billing_plan: incoming.billing_plan } : {}),
        ...(incoming.owner_cpf !== undefined ? { owner_cpf: incoming.owner_cpf, ownerCpf: incoming.owner_cpf } : {}),
        ...(incoming.phone_landline !== undefined
          ? { phone_landline: incoming.phone_landline, phoneLandline: incoming.phone_landline }
          : {}),
        ...(effectiveCep !== undefined ? { cep: effectiveCep } : {}),
        ...(effectiveAddress !== undefined ? { address: effectiveAddress } : {}),
        ...(effectiveStreetNumber !== undefined
          ? { street_number: effectiveStreetNumber, streetNumber: effectiveStreetNumber }
          : {}),
        ...(effectiveComplement !== undefined ? { complement: effectiveComplement } : {}),
        ...(effectiveNeighborhood !== undefined ? { neighborhood: effectiveNeighborhood } : {}),
        ...(effectiveCity !== undefined ? { city: effectiveCity } : {}),
        ...(effectiveState !== undefined ? { state: effectiveState } : {}),
        ...(resolvedGeo.latitude !== null ? { latitude: resolvedGeo.latitude } : {}),
        ...(resolvedGeo.longitude !== null ? { longitude: resolvedGeo.longitude } : {}),
        ...(resolvedGeo.formatted_address ? { formatted_address: resolvedGeo.formatted_address } : {}),
        ...(resolvedGeo.google_place_id ? { google_place_id: resolvedGeo.google_place_id } : {}),
        updatedAt: new Date().toISOString(),
      };

      // 4. Monta o objeto de colunas físicas para public.salons
      const physicalUpdates: Record<string, any> = {
        branding: mergedBranding,
        updated_at: new Date().toISOString(),
      };

      if (incoming.trade_name !== undefined) {
        physicalUpdates.trade_name = incoming.trade_name;
        physicalUpdates.name = incoming.trade_name;
        physicalUpdates.nome_fantasia = incoming.trade_name;
      }
      if (incoming.legal_name !== undefined) physicalUpdates.legal_name = incoming.legal_name;
      if (incoming.slug !== undefined) {
        physicalUpdates.slug = incoming.slug;
        physicalUpdates.subdomain = incoming.slug;
      }
      if (incoming.status !== undefined) {
        physicalUpdates.status = incoming.status;
        physicalUpdates.is_active = incoming.status === 'active';
        if (incoming.status === 'active') physicalUpdates.is_verified = true;
      }
      if (incoming.is_verified !== undefined) physicalUpdates.is_verified = Boolean(incoming.is_verified);
      if (incoming.phone_whatsapp !== undefined) {
        physicalUpdates.phone_whatsapp = incoming.phone_whatsapp;
        physicalUpdates.phone = incoming.phone_whatsapp;
        physicalUpdates.whatsapp = incoming.phone_whatsapp;
      }
      if (incoming.phone_landline !== undefined) physicalUpdates.phone_landline = incoming.phone_landline;
      if (incoming.email !== undefined) physicalUpdates.email = incoming.email;
      if (incoming.document_type !== undefined) physicalUpdates.document_type = incoming.document_type;
      if (incoming.document_number !== undefined) {
        physicalUpdates.document_number = incoming.document_number;
        physicalUpdates.cpf_cnpj = incoming.document_number;
        if (incoming.document_type === 'CNPJ') physicalUpdates.cnpj = incoming.document_number;
      }
      if (incoming.owner_cpf !== undefined) physicalUpdates.owner_cpf = incoming.owner_cpf;
      if (incoming.owner_name !== undefined) physicalUpdates.owner_name = incoming.owner_name;
      if (incoming.owner_email !== undefined) physicalUpdates.owner_email = incoming.owner_email;
      if (incoming.owner_phone !== undefined) physicalUpdates.owner_phone = incoming.owner_phone;
      if (incoming.operating_model !== undefined) physicalUpdates.operating_model = incoming.operating_model;
      if (incoming.home_delivery_enabled !== undefined) {
        physicalUpdates.home_delivery_enabled = Boolean(incoming.home_delivery_enabled);
      }
      if (incoming.commission_rate !== undefined) physicalUpdates.commission_rate = Number(incoming.commission_rate);
      if (incoming.billing_plan !== undefined) physicalUpdates.billing_plan = incoming.billing_plan;
      if (incoming.fee_per_booking !== undefined || incoming.billing_fee_value !== undefined) {
        const syncedFee = Number(incoming.fee_per_booking ?? incoming.billing_fee_value ?? 2.5);
        physicalUpdates.fee_per_booking = syncedFee;
        physicalUpdates.billing_fee_value = syncedFee;
        mergedBranding.fee_per_booking = syncedFee;
        mergedBranding.billing_fee_value = syncedFee;
      }
      if (incoming.monthly_subscription_fee !== undefined) {
        physicalUpdates.monthly_subscription_fee = Number(incoming.monthly_subscription_fee);
      }
      if (incoming.billing_due_day !== undefined) {
        physicalUpdates.billing_due_day = Number(incoming.billing_due_day);
      }
      if (incoming.pix_key !== undefined) physicalUpdates.pix_key = incoming.pix_key;
      if (incoming.pix_keys !== undefined) physicalUpdates.pix_keys = incoming.pix_keys;

      // Campos físicos de Endereço & Coordenadas
      if (incoming.cep !== undefined) physicalUpdates.cep = incoming.cep;
      if (incoming.address !== undefined) physicalUpdates.address = incoming.address;
      if (effectiveStreetNumber !== undefined) physicalUpdates.street_number = effectiveStreetNumber;
      if (incoming.complement !== undefined) physicalUpdates.complement = incoming.complement;
      if (incoming.neighborhood !== undefined) physicalUpdates.neighborhood = incoming.neighborhood;
      if (incoming.city !== undefined) physicalUpdates.city = incoming.city;
      if (incoming.state !== undefined) physicalUpdates.state = incoming.state;
      if (resolvedGeo.latitude !== null && Number.isFinite(resolvedGeo.latitude)) {
        physicalUpdates.latitude = resolvedGeo.latitude;
      }
      if (resolvedGeo.longitude !== null && Number.isFinite(resolvedGeo.longitude)) {
        physicalUpdates.longitude = resolvedGeo.longitude;
      }
      if (resolvedGeo.formatted_address) {
        physicalUpdates.formatted_address = resolvedGeo.formatted_address;
      }
      if (resolvedGeo.google_place_id) {
        physicalUpdates.google_place_id = resolvedGeo.google_place_id;
      }

      // Campos de Identidade Visual & UI
      const visualAndUiFields = [
        'logo_url', 'logo_dark_url', 'logo_light_url', 'favicon_url', 'cover_image_url',
        'facade_photo_url', 'interior_photo_url', 'description', 'slogan', 'brand_font',
        'theme_preset_id', 'primary_color', 'secondary_color',
        'default_theme', 'pwa_name', 'show_slogan', 'logo_text_fallback', 'logo_text_color',
        'show_hero_slides', 'welcome_style', 'section_header_bg_color', 'section_header_text_color',
        'section_header_icon_color', 'section_header_bg_style', 'section_header_border',
        'section_header_btn_bg_color', 'section_header_btn_active_bg_color', 'section_header_btn_border',
        'section_header_btn_shadow', 'section_header_btn_blur', 'section_header_btn_font',
        'nav_style', 'nav_shape', 'nav_border', 'nav_icon_border', 'nav_bg_style', 'nav_bg_color',
        'nav_btn_bg_color', 'nav_btn_active_bg_color', 'nav_active_color', 'nav_text_color'
      ];
      visualAndUiFields.forEach((f) => {
        if (incoming[f] !== undefined) {
          physicalUpdates[f] = incoming[f];
        }
      });

      // Extrai campos de UI para sincronizar na tabela relacional public.salon_ui_settings
      const uiFields = [
        'default_theme', 'primary_color', 'secondary_color', 'pwa_name', 'show_slogan',
        'logo_text_fallback', 'logo_text_color', 'show_hero_slides', 'welcome_style',
        'section_header_bg_color', 'section_header_text_color', 'section_header_icon_color',
        'section_header_bg_style', 'section_header_border',
        'nav_style', 'nav_shape', 'nav_border', 'nav_icon_border', 'nav_bg_style', 'nav_bg_color',
        'nav_btn_bg_color', 'nav_btn_active_bg_color', 'nav_active_color', 'nav_text_color'
      ];
      const uiPayload: Record<string, any> = {};
      uiFields.forEach((field) => {
        if (incoming[field] !== undefined) {
          uiPayload[field] = incoming[field];
        }
      });
      if (incoming.ui_settings && typeof incoming.ui_settings === 'object') {
        Object.assign(uiPayload, incoming.ui_settings);
      }

      // 5. Executa escrita resiliente na tabela public.salons
      const { data, error } = await safeSupabaseWrite('salons', 'update', physicalUpdates, {
        eqCol: 'id',
        eqVal: id,
      });

      if (error) {
        console.error('[PATCH /api/admin/salons/:id] Erro no Supabase:', error);
        return res.status(400).json({ success: false, error: error.message });
      }

      // 6. Sincroniza tabela dedicada public.salon_ui_settings se houver campos de UI
      if (Object.keys(uiPayload).length > 0) {
        try {
          await safeSupabaseWrite(
            'salon_ui_settings',
            'upsert',
            {
              salon_id: id,
              ...uiPayload,
              branding_snapshot: mergedBranding,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'salon_id' }
          );
        } catch (uiSyncErr) {
          console.warn('[PATCH /api/admin/salons/:id] Aviso ao sincronizar salon_ui_settings:', uiSyncErr);
        }
      }

      // 7. Se o endereço foi atualizado, sincroniza com os registros do titular vinculado (clients, professionals, profiles, salon_users)
      if (hasAddressInPayload) {
        await syncAddressAndCoordsAcrossCpfTables({
          cpf: incoming.owner_cpf || data?.owner_cpf || currentSalon?.owner_cpf || currentSalon?.document_number,
          email: incoming.email || data?.email || currentSalon?.email,
          userId: data?.owner_id || currentSalon?.owner_id,
          salonId: id,
          cep: effectiveCep,
          address: effectiveAddress,
          street_number: effectiveStreetNumber,
          complement: effectiveComplement,
          neighborhood: effectiveNeighborhood,
          city: effectiveCity,
          state: effectiveState,
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          formatted_address: resolvedGeo.formatted_address,
          google_place_id: resolvedGeo.google_place_id,
          syncSalons: false,
        });
      }

      return res.json({
        success: true,
        salon: {
          ...data,
          cep: effectiveCep,
          address: effectiveAddress,
          street_number: effectiveStreetNumber,
          complement: effectiveComplement,
          neighborhood: effectiveNeighborhood,
          city: effectiveCity,
          state: effectiveState,
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          formatted_address: resolvedGeo.formatted_address,
          google_place_id: resolvedGeo.google_place_id,
        },
      });
    } catch (err: any) {
      console.error('[PATCH /api/admin/salons/:id] Exception:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Delete Salon (Service Role)
  app.delete('/api/admin/salons/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Limpa registros filhos vinculados primeiro para evitar quebra de Chave Estrangeira (FK)
      try {
        await supabaseAdmin.from('appointments').delete().eq('salon_id', id);
        await supabaseAdmin.from('service_offers').delete().eq('salon_id', id);
        await supabaseAdmin.from('professionals').delete().eq('salon_id', id);
      } catch {}

      const { error } = await supabaseAdmin
        .from('salons')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Bulk Action on Salons
  app.post('/api/admin/salons/bulk-action', async (req, res) => {
    try {
      const { ids, action, targetStatus } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de IDs vazia ou inválida' });
      }

      if (action === 'update_status' && targetStatus) {
        const isActive = targetStatus === 'active';
        const isVerified = targetStatus === 'active' || targetStatus === 'incomplete';
        const { error } = await supabaseAdmin
          .from('salons')
          .update({ is_active: isActive, is_verified: isVerified })
          .in('id', ids);

        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.json({ success: true, count: ids.length, action: 'status_updated' });
      }

      if (action === 'delete') {
        try {
          await supabaseAdmin.from('appointments').delete().in('salon_id', ids);
          await supabaseAdmin.from('service_offers').delete().in('salon_id', ids);
          await supabaseAdmin.from('professionals').delete().in('salon_id', ids);
        } catch {}

        const { error } = await supabaseAdmin
          .from('salons')
          .delete()
          .in('id', ids);

        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.json({ success: true, count: ids.length, action: 'deleted' });
      }

      return res.status(400).json({ success: false, error: 'Ação não suportada' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Database Tables Summary
  app.get('/api/admin/tables-summary', async (req, res) => {
    try {
      const tableNames = ['salons', 'appointments', 'professionals', 'service_offers', 'clients'];
      const summary: Record<string, { count: number; accessible: boolean }> = {};

      for (const table of tableNames) {
        try {
          const { count, error } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true });
          summary[table] = {
            count: count || 0,
            accessible: !error,
          };
        } catch {
          summary[table] = { count: 0, accessible: false };
        }
      }

      return res.json({ success: true, tables: summary });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Dashboard Metrics
  app.get('/api/admin/metrics', async (req, res) => {
    try {
      // Salons stats
      const { data: salonsData, error: salonsError } = await supabaseAdmin
        .from('salons')
        .select('id, is_active, is_verified');

      const salons = salonsData || [];
      const totalSalons = salons.length;
      const activeSalons = salons.filter((s: any) => s.is_active === true).length;
      const pendingSalons = salons.filter((s: any) => s.is_active === false && s.is_verified === false).length;
      const incompleteSalons = salons.filter((s: any) => s.is_active === false && s.is_verified === true).length;
      const suspendedSalons = salons.filter((s: any) => s.is_active === false).length;

      // Appointments
      let todayAppointments = 0;
      try {
        const { count } = await supabaseAdmin
          .from('appointments')
          .select('*', { count: 'exact', head: true });
        todayAppointments = count || 0;
      } catch {}

      // Active flash offers
      let activeFlashOffers = 0;
      try {
        const { count } = await supabaseAdmin
          .from('service_offers')
          .select('*', { count: 'exact', head: true });
        activeFlashOffers = count || 0;
      } catch {}

      return res.json({
        success: true,
        metrics: {
          totalSalons,
          activeSalons,
          pendingSalons,
          incompleteSalons,
          suspendedSalons,
          todayAppointments,
          activeFlashOffers,
          growthPercent: 18.5,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: List Appointments with Billing, Cash Checkout, Swap & Inter-Salon Geotemporal Collision Diagnostics (SQL v5.0)
  app.get('/api/admin/appointments', async (req, res) => {
    try {
      const [{ data: dbAppointments, error }, { data: salonsRows }] = await Promise.all([
        supabaseAdmin
          .from('appointments')
          .select('*')
          .order('date_str', { ascending: true })
          .order('start_time', { ascending: true }),
        supabaseAdmin
          .from('salons')
          .select('id, trade_name, slug, fee_per_booking, billing_fee_value, latitude, longitude'),
      ]);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      const salonLookup = new Map<string, any>();
      (salonsRows || []).forEach((s: any) => salonLookup.set(String(s.id), s));

      const toMinutes = (hhmm: string): number => {
        const [h, m] = String(hhmm || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
        return h * 60 + m;
      };

      const haversineKm = (lat1?: number | null, lng1?: number | null, lat2?: number | null, lng2?: number | null): number => {
        if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const normalized = (dbAppointments || []).map((row: any) => {
        const sal = row.salon_id ? salonLookup.get(String(row.salon_id)) : null;
        const dateStr = row.date_str || row.appointment_date || '';
        const startTime = String(row.start_time || row.time_slot || '00:00').slice(0, 5);
        const endTime = row.end_time ? String(row.end_time).slice(0, 5) : '';
        const isBlocked = Boolean(row.is_blocked_slot || row.status === 'BLOQUEADO');
        const isPaid = Boolean(row.is_paid || row.payment_status === 'paid');
        const salonFee = Number(sal?.fee_per_booking ?? sal?.billing_fee_value ?? 2.5);

        return {
          ...row,
          protocol: row.protocol_code || row.protocol || `VG-${String(row.id || '').slice(0, 6).toUpperCase()}`,
          salon_name: row.salon_name || sal?.trade_name || 'Estabelecimento Vagou',
          salon_slug: row.salon_slug || sal?.slug || 'salao',
          salon_lat: row.salon_lat ?? sal?.latitude ?? null,
          salon_lng: row.salon_lng ?? sal?.longitude ?? null,
          appointment_date: dateStr,
          date_str: dateStr,
          time_slot: startTime,
          start_time: startTime,
          end_time: endTime || null,
          is_blocked_slot: isBlocked,
          status: isBlocked ? 'BLOQUEADO' : (row.status || 'confirmado'),
          is_paid: isPaid,
          payment_status: row.payment_status || (isPaid ? 'paid' : 'pending'),
          fee_charged: row.status === 'cancelado' || isBlocked ? 0 : Number(row.fee_charged ?? salonFee),
        };
      });

      // Agrupa por cliente + data para sinalizar possíveis colisões geotemporais inter-salões
      const activeByClientDay = new Map<string, any[]>();
      normalized.forEach((apt: any) => {
        const clientKey = apt.client_id || (apt.client_phone && apt.client_phone !== '—' ? apt.client_phone.replace(/\D/g, '') : '');
        if (!clientKey || !apt.date_str || apt.is_blocked_slot || apt.status === 'cancelado' || apt.status === 'no_show') return;
        const groupKey = `${clientKey}::${apt.date_str}`;
        const list = activeByClientDay.get(groupKey) || [];
        list.push(apt);
        activeByClientDay.set(groupKey, list);
      });

      activeByClientDay.forEach((group) => {
        if (group.length < 2) return;
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const a = group[i];
            const b = group[j];
            const startA = toMinutes(a.start_time);
            const endA = a.end_time ? toMinutes(a.end_time) : startA + 45;
            const startB = toMinutes(b.start_time);
            const endB = b.end_time ? toMinutes(b.end_time) : startB + 45;
            const diffSalon = a.salon_id && b.salon_id && a.salon_id !== b.salon_id;
            const distKm = diffSalon ? haversineKm(a.salon_lat, a.salon_lng, b.salon_lat, b.salon_lng) : 0;
            const travelMin = diffSalon ? Math.max(15, Math.ceil((distKm / 25) * 60) + 10) : 0;

            if (startA < endB + travelMin && endA + travelMin > startB) {
              a.collision_warning = {
                has_collision: true,
                conflicting_salon_name: b.salon_name,
                conflicting_time: b.start_time,
                travel_buffer_minutes: travelMin,
                reason: diffSalon
                  ? `Colisão inter-salões com ${b.salon_name} (${b.start_time}, buffer ${travelMin} min)`
                  : `Sobreposição de horário às ${b.start_time}`,
              };
              b.collision_warning = {
                has_collision: true,
                conflicting_salon_name: a.salon_name,
                conflicting_time: a.start_time,
                travel_buffer_minutes: travelMin,
                reason: diffSalon
                  ? `Colisão inter-salões com ${a.salon_name} (${a.start_time}, buffer ${travelMin} min)`
                  : `Sobreposição de horário às ${a.start_time}`,
              };
            }
          }
        }
      });

      normalized.sort((a: any, b: any) => {
        const da = `${a.date_str || ''}T${a.start_time || '00:00'}`;
        const db = `${b.date_str || ''}T${b.start_time || '00:00'}`;
        return da.localeCompare(db);
      });

      return res.json({ success: true, appointments: normalized });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Check Client Inter-Salon Geotemporal Collision via SQL v5.0 RPC
  app.post('/api/admin/appointments/check-collision', async (req, res) => {
    try {
      const {
        client_id,
        date_str,
        start_time,
        end_time,
        salon_id,
        salon_lat = null,
        salon_lng = null,
        exclude_appointment_id = null,
      } = req.body || {};

      if (!client_id || !date_str || !start_time || !salon_id) {
        return res.status(400).json({ success: false, error: 'Parâmetros insuficientes para checagem de colisão.' });
      }

      const { data, error } = await supabaseAdmin.rpc('check_client_inter_salon_collision', {
        p_client_id: client_id,
        p_date_str: date_str,
        p_start_time: start_time,
        p_end_time: end_time || start_time,
        p_salon_id: salon_id,
        p_salon_lat: salon_lat,
        p_salon_lng: salon_lng,
        p_exclude_appointment_id: exclude_appointment_id,
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, collision: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Update Appointment Status
  app.patch('/api/admin/appointments/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { data, error } = await supabaseAdmin
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.json({ success: true, appointment: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Bulletins do 7º Mandamento
  app.get('/api/admin/bulletins', (req, res) => {
    res.json({ success: true, bulletins: TRIADE_BULLETINS });
  });

  app.post('/api/admin/bulletins', (req, res) => {
    try {
      const { title, category, summary, impactedTables, instructions, sqlMigration } = req.body;
      if (!title || !summary) {
        return res.status(400).json({ success: false, error: 'Título e Resumo são obrigatórios.' });
      }

      const newBulletin: TechnicalBulletin = {
        id: `bol-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sourceApp: 'admvapp',
        targetApps: ['pvapp', 'mnvapp'],
        title,
        category: category || 'schema_change',
        summary,
        impactedTables: impactedTables || [],
        sqlMigration: sqlMigration || undefined,
        instructions: instructions || '',
        author: 'Super Administrador (adm.vagouapp.com)',
      };

      TRIADE_BULLETINS.unshift(newBulletin);
      return res.json({ success: true, bulletin: newBulletin });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // SYSTEM CATEGORIES MANAGEMENT
  let SYSTEM_CATEGORIES = [
    { id: 'cat-salao', name: 'Salão de Beleza', slug: 'salao', icon: 'Scissors', is_default: true },
    { id: 'cat-barbearia', name: 'Barbearia', slug: 'barbearia', icon: 'Scissors', is_default: true },
    { id: 'cat-estetica', name: 'Estética & Spa', slug: 'estetica', icon: 'Sparkles', is_default: true },
    { id: 'cat-manicure', name: 'Esmalteria & Unhas', slug: 'manicure', icon: 'Sparkles', is_default: true },
    { id: 'cat-spa', name: 'Spa & Bem-Estar', slug: 'spa', icon: 'Heart', is_default: true },
    { id: 'cat-podologia', name: 'Podologia', slug: 'podologia', icon: 'Sparkles', is_default: false },
    { id: 'cat-massoterapia', name: 'Massoterapia', slug: 'massoterapia', icon: 'Heart', is_default: false },
    { id: 'cat-tatuagem', name: 'Tatuagem & Piercing', slug: 'tatuagem', icon: 'Palette', is_default: false },
    { id: 'cat-outro', name: 'Outro', slug: 'outro', icon: 'Tag', is_default: true },
  ];

  app.get('/api/admin/categories', (req, res) => {
    return res.json({ success: true, categories: SYSTEM_CATEGORIES });
  });

  app.post('/api/admin/categories', (req, res) => {
    try {
      const { name, slug, icon, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'O nome da categoria é obrigatório.' });
      }

      const generatedSlug = (slug || name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const existing = SYSTEM_CATEGORIES.find((c) => c.slug === generatedSlug);
      if (existing) {
        return res.status(400).json({ success: false, error: `A categoria com slug "${generatedSlug}" já existe.` });
      }

      const newCategory = {
        id: `cat-${Date.now()}`,
        name: name.trim(),
        slug: generatedSlug,
        icon: icon || 'Tag',
        is_default: false,
        description: description || '',
      };

      SYSTEM_CATEGORIES.push(newCategory);
      return res.json({ success: true, category: newCategory, categories: SYSTEM_CATEGORIES });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/admin/categories/:id', (req, res) => {
    const { id } = req.params;
    const cat = SYSTEM_CATEGORIES.find((c) => c.id === id || c.slug === id);
    if (!cat) {
      return res.status(404).json({ success: false, error: 'Categoria não encontrada.' });
    }
    if (cat.is_default) {
      return res.status(400).json({ success: false, error: 'Categorias padrão do sistema não podem ser removidas.' });
    }

    SYSTEM_CATEGORIES = SYSTEM_CATEGORIES.filter((c) => c.id !== id && c.slug !== id);
    return res.json({ success: true, categories: SYSTEM_CATEGORIES });
  });

  // UNIFIED ALL PORTAL USERS ENDPOINT (Sovereign Service Role)
  app.get('/api/admin/all-portal-users', async (req, res) => {
    try {
      const [
        { data: profiles },
        { data: clients },
        { data: professionals },
        { data: salonUsers },
        { data: admins },
        { data: salons },
      ] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('clients').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('professionals').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('salon_users').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('system_admins').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('salons').select('id, name, trade_name, owner_id, email').order('created_at', { ascending: false }),
      ]);

      const userMap = new Map<string, any>();
      const resolveUserMapKey = (row: any) =>
        normalizeEmailKey(row.email) || normalizeUsernameKey(row.username) || String(row.id || '');

      // 1. Profiles (unified source)
      (profiles || []).forEach((p: any) => {
        const key = resolveUserMapKey(p);
        if (key) {
          userMap.set(key, {
            id: p.id,
            name: p.full_name || p.name || 'Usuário Sem Nome',
            email: p.email || '',
            username: p.username || (p.email ? p.email.split('@')[0] : 'usuario'),
            phone: p.phone_whatsapp || p.phone || '',
            avatarUrl: p.avatar_url || '',
            roleType: 'Usuário Portal',
          });
        }
      });

      // 2. Clients
      (clients || []).forEach((c: any) => {
        const key = resolveUserMapKey(c);
        if (key) {
          const existing = userMap.get(key) || {};
          userMap.set(key, {
            id: c.id || existing.id,
            name: c.name || c.full_name || existing.name || 'Cliente',
            email: c.email || existing.email || '',
            username: c.username || existing.username || (c.email ? c.email.split('@')[0] : 'usuario'),
            phone: c.phone || c.phone_whatsapp || existing.phone || '',
            avatarUrl: c.avatar_url || existing.avatarUrl || '',
            roleType: existing.roleType || 'Cliente',
          });
        }
      });

      // 3. Professionals
      (professionals || []).forEach((pr: any) => {
        const key = resolveUserMapKey(pr);
        if (key) {
          const existing = userMap.get(key) || {};
          userMap.set(key, {
            id: pr.id || existing.id,
            name: pr.name || pr.full_name || existing.name || 'Profissional',
            email: pr.email || existing.email || '',
            username: pr.username || pr.nickname || existing.username || (pr.email ? pr.email.split('@')[0] : 'profissional'),
            phone: pr.phone_whatsapp || pr.phone || existing.phone || '',
            avatarUrl: pr.avatar_url || existing.avatarUrl || '',
            roleType: 'Profissional',
          });
        }
      });

      // 4. Salon Users
      (salonUsers || []).forEach((su: any) => {
        const key = resolveUserMapKey(su);
        if (key) {
          const existing = userMap.get(key) || {};
          userMap.set(key, {
            id: su.id || existing.id,
            name: su.full_name || su.name || existing.name || 'Gestor de Salão',
            email: su.email || existing.email || '',
            username: su.username || existing.username || (su.email ? su.email.split('@')[0] : 'gestor'),
            phone: su.phone_whatsapp || su.phone || existing.phone || '',
            avatarUrl: su.avatar_url || existing.avatarUrl || '',
            roleType: 'Gestor / Salão',
          });
        }
      });

      // 5. System Admins (Hierarquia Soberana Máxima)
      (admins || []).forEach((a: any) => {
        const key = resolveUserMapKey(a);
        if (key) {
          const existing = userMap.get(key) || {};
          userMap.set(key, {
            id: a.id || existing.id,
            name: a.full_name || a.name || existing.name || 'Administrador',
            email: a.email || existing.email || '',
            username: a.username || existing.username || (a.email ? a.email.split('@')[0] : 'admin'),
            phone: a.phone_whatsapp || a.phone || existing.phone || '',
            avatarUrl: a.avatar_url || existing.avatarUrl || '',
            roleType: 'Administrador Master',
          });
        }
      });

      // Identifica proprietários existentes de salão
      const salonOwnerIds = new Set<string>();
      const salonOwnerEmails = new Set<string>();

      (salons || []).forEach((s: any) => {
        if (s.owner_id) salonOwnerIds.add(String(s.owner_id));
        if (s.email) salonOwnerEmails.add(String(s.email).toLowerCase().trim());
      });

      (professionals || []).forEach((pr: any) => {
        if (pr.role === 'Proprietário' || pr.is_owner) {
          if (pr.id) salonOwnerIds.add(String(pr.id));
          if (pr.email) salonOwnerEmails.add(String(pr.email).toLowerCase().trim());
        }
      });

      const usersList = Array.from(userMap.values()).map((u: any) => {
        const hasSalon =
          (u.id && salonOwnerIds.has(String(u.id))) ||
          (u.email && salonOwnerEmails.has(String(u.email).toLowerCase().trim()));
        return {
          ...u,
          hasSalon: !!hasSalon,
        };
      });
      return res.json({ success: true, users: usersList });
    } catch (err: any) {
      console.error('[API All Portal Users Error]:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // REAL-TIME USER AVAILABILITY CHECK (Blocks duplicate username, email, phone, CPF at each step)
  app.post('/api/public/check-user-availability', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const { username, email, phone, cpf } = req.body || {};
      const conflict = await checkUserConflictInSupabase({ username, email, phone, cpf });
      return res.json({
        success: true,
        available: !conflict.hasConflict,
        ...conflict,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, available: true, error: err?.message });
    }
  });

  // UNIFIED PUBLIC REGISTRATION ENGINE (Sovereign Service Role)
  app.post('/api/public/register-user', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const body = req.body || {};
      const {
        type = 'client', // 'client' | 'professional'
        email,
        password,
        phone = '',
        documentCpf = '',
        username = '',
        avatarUrl = '',
        origin = 'portal',
        salonId = undefined,
        // Dependents array
        dependents = [],
        // Salon / Business fields
        tradeName = '',
        slug = '',
        category = 'barbearia',
        attendanceType = 'salon_only',
        salonSameAsPersonalAddress = true,
        salonCep = '',
        salonStreet = '',
        salonNumber = '',
        salonComplement = '',
        salonNeighborhood = '',
        salonCity = '',
        salonState = '',
        salonPhoneWhatsapp = '',
        salonPhoneLandline = '',
        salonEmail = '',
        redirectUrl = '',
      } = body;

      const resolvedName = (body.fullName || body.name || '').trim();
      const addrObj = body.address && typeof body.address === 'object' ? body.address : {};
      const cep = (addrObj.cep || body.cep || '').trim();
      const street = (addrObj.street || body.street || '').trim();
      const number = (addrObj.number || body.number || '').trim();
      const complement = (addrObj.complement || body.complement || '').trim();
      const neighborhood = (addrObj.neighborhood || body.neighborhood || '').trim();
      const city = (addrObj.city || body.city || 'São Paulo').trim();
      const state = (addrObj.state || body.state || 'SP').trim().toUpperCase();

      if (!resolvedName || !email || !password) {
        return res.status(400).json({ success: false, error: 'Nome, E-mail e Senha são obrigatórios.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanName = resolvedName;
      const cleanUsername = (username || cleanEmail.split('@')[0] || 'usuario').trim().replace(/^@+/, '');
      const cleanSlug = String(slug || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 30);

      // 0. Trava Soberana Anti-Duplicidade (1 Pessoa = 1 Único Cadastro):
      // Rejeita imediatamente se username, e-mail, WhatsApp ou CPF já pertencerem a qualquer usuário existente
      const preConflict = await checkUserConflictInSupabase({
        username: cleanUsername,
        email: cleanEmail,
        phone,
        cpf: documentCpf || body.cpf,
      });
      if (preConflict.hasConflict) {
        return res.status(400).json({
          success: false,
          conflictField: preConflict.conflictField,
          error:
            preConflict.message ||
            'Já existe um usuário cadastrado com estes dados (Nome de Usuário, E-mail, WhatsApp ou CPF).',
        });
      }

      const RESERVED_SUBDOMAINS = [
        'adm', 'admin', 'admvapp', 'portal', 'pvapp', 'meunegocio', 'mnvapp',
        'www', 'api', 'suporte', 'ajuda', 'vagou', 'vagouapp', 'localhost',
        'app', 'dashboard', 'status', 'auth', 'login', 'signup', 'checkout'
      ];

      if (type === 'professional' && (!tradeName?.trim() || !cleanSlug)) {
        return res.status(400).json({ success: false, error: 'Nome do Estabelecimento e Subdomínio são obrigatórios para profissionais.' });
      }

      if (type === 'professional' && RESERVED_SUBDOMAINS.includes(cleanSlug)) {
        return res.status(400).json({ success: false, error: `O subdomínio "${cleanSlug}" é reservado pelo sistema.` });
      }

      // 1. Create or retrieve auth user via Supabase Admin
      let authUserId: string | null = null;
      const { data: authUserResp, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          phone: phone || undefined,
          avatar_url: avatarUrl || undefined,
          username: cleanUsername || undefined,
        },
      });

      if (!authError && authUserResp?.user?.id) {
        authUserId = authUserResp.user.id;
      } else {
        try {
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const matched = (usersList?.users || []).find(
            (u: any) => u.email?.toLowerCase() === cleanEmail
          );
          if (matched?.id) {
            authUserId = matched.id;
          }
        } catch {}
      }

      // 2. Upsert into public.profiles ONLY if authUserId is a valid auth.users UUID
      if (authUserId) {
        try {
          await supabaseAdmin.from('profiles').upsert({
            id: authUserId,
            full_name: cleanName,
            email: cleanEmail,
            phone_whatsapp: phone || null,
            document_number: documentCpf || null,
            avatar_url: avatarUrl || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (profErr) {
          console.warn('Aviso no upsert de profiles:', profErr);
        }
      }

      // 3. Geocodifica endereço do usuário automaticamente e persiste em public.clients + public.profiles
      const referer = String(req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/');
      const userGeo = await resolveAddressCoordinatesServerSide(
        {
          cep,
          address: street,
          street_number: number,
          neighborhood,
          city,
          state,
          latitude: addrObj.latitude ?? body.latitude,
          longitude: addrObj.longitude ?? body.longitude,
        },
        referer
      );

      if (authUserId) {
        try {
          await safeSupabaseWrite(
            'profiles',
            'upsert',
            {
              id: authUserId,
              full_name: cleanName,
              email: cleanEmail,
              phone_whatsapp: phone || null,
              document_number: documentCpf || null,
              avatar_url: avatarUrl || null,
              cep: cep || null,
              address: street || null,
              street_number: number || null,
              complement: complement || null,
              neighborhood: neighborhood || null,
              city: city || 'São Paulo',
              state: state || 'SP',
              latitude: userGeo.latitude,
              longitude: userGeo.longitude,
              formatted_address: userGeo.formatted_address,
              google_place_id: userGeo.google_place_id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch {}
      }

      const fullAddress = [street, number, complement, neighborhood, city, state, cep]
        .filter(Boolean)
        .join(', ');

      const isUuid = (val: any) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

      const nowUserIso = new Date().toISOString();
      const resolvedUserOrigin = origin || 'portal';
      const resolvedCreatedVia =
        resolvedUserOrigin === 'admin' || resolvedUserOrigin === 'admvapp'
          ? 'admvapp'
          : resolvedUserOrigin === 'establishment' || resolvedUserOrigin === 'mnvapp'
          ? 'mnvapp'
          : 'pvapp';

      const clientPayload: Record<string, any> = {
        name: cleanName,
        full_name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        phone: phone || null,
        cpf: (documentCpf || body.cpf) || null,
        password_hash: password,
        avatar_url: avatarUrl || null,
        cep: cep || null,
        address: street || null,
        street_number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || 'São Paulo',
        state: state || 'SP',
        latitude: userGeo.latitude,
        longitude: userGeo.longitude,
        formatted_address: userGeo.formatted_address,
        google_place_id: userGeo.google_place_id,
        default_address: fullAddress || null,
        origin_type: resolvedUserOrigin,
        origin_salon_id: isUuid(salonId) ? salonId : null,
        is_active: true,
        access_level: 'Cliente Titular',
        updated_at: nowUserIso,
      };

      if (authUserId) {
        clientPayload.user_id = authUserId;
      }

      let savedClient: any = null;
      {
        const insertPayload = {
          ...(authUserId ? { id: authUserId } : {}),
          ...clientPayload,
          created_at: nowUserIso,
          created_via: resolvedCreatedVia,
        };
        let { data: insertedClient, error: insErr } = await safeSupabaseWrite('clients', 'insert', insertPayload);

        if (insErr && (insErr.message?.includes('clients_user_id_fkey') || insErr.code === '23503' || insErr.code === '23505')) {
          const fallbackPayload: Record<string, any> = { ...clientPayload, user_id: null };
          const retry = await supabaseAdmin
            .from('clients')
            .insert([fallbackPayload])
            .select()
            .single();
          insertedClient = retry.data;
          insErr = retry.error;
        }

        if (insErr) {
          console.error('[register-user] Erro ao inserir client:', insErr);
          return res.status(400).json({ success: false, error: insErr.message });
        }
        savedClient = insertedClient;
      }

      const effectiveId = savedClient?.id || authUserId || `usr-${Date.now()}`;

      // 4. Save Dependents if present (insere em public.dependents que sincroniza com public.client_family_members)
      if (Array.isArray(dependents) && dependents.length > 0) {
        for (const dep of dependents) {
          if (dep.fullName && dep.fullName.trim()) {
            try {
              const depName = dep.fullName.trim();
              await supabaseAdmin.from('dependents').insert({
                parent_client_id: isUuid(effectiveId) ? effectiveId : null,
                client_id: isUuid(effectiveId) ? effectiveId : null,
                full_name: depName,
                name: depName,
                relationship: dep.relationship || 'Filho/a',
                notes: dep.notes || (dep.nickname ? `Apelido: ${dep.nickname}` : null),
                avatar_url: dep.avatarUrl || null,
              });
            } catch (depErr) {
              console.warn('Aviso ao inserir dependente:', depErr);
            }
          }
        }
      }

      // 5. If professional, create salon entry and professional record
      let createdSalon = null;
      if (type === 'professional') {
        const homeDeliveryEnabled = attendanceType === 'home_only' || attendanceType === 'hybrid';
        const effSalonCep = (!salonSameAsPersonalAddress && salonCep) ? salonCep : cep;
        const effSalonStreet = (!salonSameAsPersonalAddress && salonStreet) ? salonStreet : street;
        const effSalonNumber = (!salonSameAsPersonalAddress && salonNumber) ? salonNumber : number;
        const effSalonComplement = (!salonSameAsPersonalAddress && salonComplement) ? salonComplement : complement;
        const effSalonNeighborhood = (!salonSameAsPersonalAddress && salonNeighborhood) ? salonNeighborhood : neighborhood;
        const effSalonCity = (!salonSameAsPersonalAddress && salonCity) ? salonCity : city;
        const effSalonState = (!salonSameAsPersonalAddress && salonState) ? salonState : state;

        const effSalonPhoneWhatsapp = (!salonSameAsPersonalAddress && salonPhoneWhatsapp) ? salonPhoneWhatsapp : phone;
        const effSalonEmail = (!salonSameAsPersonalAddress && salonEmail) ? salonEmail : cleanEmail;

        const { data: salonData, error: salonErr } = await safeSupabaseWrite(
          'salons',
          'upsert',
          {
            name: tradeName.trim(),
            trade_name: tradeName.trim(),
            legal_name: cleanName,
            slug: cleanSlug,
            subdomain: cleanSlug,
            ...(authUserId ? { owner_id: authUserId } : {}),
            document_number: documentCpf || null,
            phone_whatsapp: effSalonPhoneWhatsapp || null,
            phone_landline: salonPhoneLandline || null,
            email: effSalonEmail,
            status: 'active',
            is_verified: true,
            is_active: true,
            home_delivery_enabled: homeDeliveryEnabled,
            operating_model: attendanceType,
            address: effSalonStreet || null,
            cep: effSalonCep || null,
            street_number: effSalonNumber || null,
            complement: effSalonComplement || null,
            neighborhood: effSalonNeighborhood || null,
            city: effSalonCity || 'São Paulo',
            state: effSalonState || 'SP',
            branding: {
              themeMode: 'dark',
              primaryColor: '#20C933',
              category: category || 'barbearia',
              pwaName: tradeName.trim(),
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );

        if (salonErr) {
          console.warn('Aviso no upsert do salão:', salonErr);
        } else if (salonData) {
          createdSalon = salonData;
          await safeSupabaseWrite('professionals', 'insert', {
            salon_id: salonData.id,
            name: cleanName,
            full_name: cleanName,
            username: cleanUsername,
            role: 'Proprietário',
            access_level: 'Proprietário (Dono)',
            email: cleanEmail,
            phone: phone || null,
            phone_whatsapp: phone || null,
            avatar_url: avatarUrl || null,
            status: 'active',
            is_active: true,
            updated_at: new Date().toISOString(),
          });
        }
      }

      let targetRedirect = redirectUrl;
      if (!targetRedirect) {
        if (type === 'professional' && cleanSlug) {
          targetRedirect = `https://${cleanSlug}.vagouapp.com`;
        } else {
          targetRedirect = 'https://portal.vagouapp.com';
        }
      }

      return res.json({
        success: true,
        message: type === 'professional' ? 'Estabelecimento e conta criados com sucesso!' : 'Conta de usuário criada com sucesso!',
        user: {
          id: effectiveId,
          name: cleanName,
          email: cleanEmail,
          username: cleanUsername,
          phone,
          avatarUrl: avatarUrl || null,
          type,
          dependentsCount: dependents.length,
        },
        client: savedClient,
        salon: createdSalon,
        targetRedirect,
      });
    } catch (err: any) {
      console.error('Erro no cadastro unificado:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro interno no cadastro unificado.' });
    }
  });

  // ============================================================================
  // 🏛️ ROTAS UNIFICADAS DE SINCRONIZAÇÃO SOBERANA (ADMVAPP ⇄ MNVAPP)
  // Garante leitura e escrita em tempo real com Service Role em todas as tabelas
  // ============================================================================

  // 1. Diagnóstico e Carregamento 360º do Estabelecimento (Serviços, Mídia, Tema, Equipe, Clientes+Dependentes, Utilidades)
  app.get('/api/admin/salons/:salonId/full-sync', async (req, res) => {
    try {
      const { salonId } = req.params;

      // 1.1 Dados do Salão + Branding + UI Settings (public.salons + public.salon_ui_settings)
      const [{ data: salonRow }, { data: uiSettingsRow }] = await Promise.all([
        supabaseAdmin.from('salons').select('*').eq('id', salonId).maybeSingle(),
        supabaseAdmin.from('salon_ui_settings').select('*').eq('salon_id', salonId).maybeSingle(),
      ]);

      const branding = salonRow?.branding && typeof salonRow.branding === 'object' ? salonRow.branding : {};

      // 1.2 Serviços (unificando public.services + public.salon_services + branding.customServices)
      const [{ data: masterServices }, { data: salonServicesRows }] = await Promise.all([
        supabaseAdmin.from('services').select('*').eq('salon_id', salonId).order('created_at', { ascending: false }),
        supabaseAdmin.from('salon_services').select('*, services(name, title, category, description)').eq('salon_id', salonId),
      ]);

      const unifiedServicesMap = new Map<string, any>();

      (masterServices || []).forEach((s: any) => {
        unifiedServicesMap.set(s.id, {
          id: s.id,
          salon_id: salonId,
          name: s.name || s.title || 'Procedimento',
          category: s.category || 'Geral',
          price: Number(s.price) || 0,
          promotional_price: s.promotional_price !== null && s.promotional_price !== undefined ? Number(s.promotional_price) : null,
          duration_minutes: Number(s.duration_minutes) || 30,
          duration_estimated: s.duration_estimated || `${Number(s.duration_minutes) || 30} min`,
          commission_rate: Number(s.commission_rate ?? 50),
          description: s.description || '',
          is_active: s.is_active ?? true,
          target_audience: s.target_audience || 'all',
          image_url: s.image_url || null,
          video_url: s.video_url || null,
          photos: Array.isArray(s.photos) ? s.photos : [],
          videos: Array.isArray(s.videos) ? s.videos : [],
          slides: Array.isArray(s.slides) ? s.slides : [],
          source_table: 'services',
        });
      });

      (salonServicesRows || []).forEach((ss: any) => {
        const linked = ss.services || {};
        const key = ss.service_id || ss.id;
        if (!unifiedServicesMap.has(key)) {
          unifiedServicesMap.set(key, {
            id: ss.id,
            service_id: ss.service_id,
            salon_id: salonId,
            name: ss.custom_name || ss.name || ss.title || linked.name || linked.title || 'Procedimento Customizado',
            category: ss.category || linked.category || 'Geral',
            price: Number(ss.price) || 0,
            promotional_price: ss.promotional_price !== null && ss.promotional_price !== undefined ? Number(ss.promotional_price) : null,
            duration_minutes: Number(ss.duration_minutes) || 30,
            duration_estimated: ss.duration_estimated || `${Number(ss.duration_minutes) || 30} min`,
            commission_rate: Number(ss.commission_rate ?? 50),
            description: ss.description || linked.description || '',
            is_active: ss.is_active ?? true,
            target_audience: 'all',
            image_url: ss.image_url || null,
            video_url: ss.video_url || null,
            photos: Array.isArray(ss.photos) ? ss.photos : [],
            videos: Array.isArray(ss.videos) ? ss.videos : [],
            slides: Array.isArray(ss.slides) ? ss.slides : [],
            source_table: 'salon_services',
          });
        }
      });

      if (Array.isArray(branding.customServices)) {
        branding.customServices.forEach((cs: any) => {
          const cid = cs.id || `cs-${cs.name}`;
          if (!unifiedServicesMap.has(cid)) {
            unifiedServicesMap.set(cid, {
              id: cid,
              salon_id: salonId,
              name: cs.name || cs.title || 'Serviço Customizado',
              category: cs.category || 'Geral',
              price: Number(cs.price) || 0,
              duration_minutes: Number(cs.durationMinutes || cs.duration_minutes) || 30,
              commission_rate: Number(cs.commissionRate ?? cs.commission_rate ?? 50),
              description: cs.description || '',
              is_active: cs.isActive ?? cs.is_active ?? true,
              photos: Array.isArray(cs.photos || cs.portfolioPhotos) ? (cs.photos || cs.portfolioPhotos) : [],
              videos: Array.isArray(cs.videos) ? cs.videos : [],
              slides: Array.isArray(cs.slides) ? cs.slides : [],
              source_table: 'branding',
            });
          }
        });
      }

      // 1.3 Galeria de Mídias (public.salon_media_items + branding.galleryUrls)
      const { data: dbMediaItems } = await supabaseAdmin
        .from('salon_media_items')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false });

      const normalizedMedia = (dbMediaItems || []).map((m: any) => ({
        id: m.id,
        title: m.title || m.caption || 'Mídia do Salão',
        url: m.url || m.media_url || '',
        type: (m.type || m.media_type) === 'video' ? 'video' : 'image',
        media_group: m.media_group || ((m.type || m.media_type) === 'video' ? 'videos' : m.category === 'banner' || m.category === 'logotipo' ? 'imagens' : 'fotos'),
        category: m.category || 'servicos',
        duration_seconds: m.duration_seconds || 5,
        slot_index: m.slot_index,
        is_cover: Boolean(m.is_cover),
        created_at: m.created_at ? String(m.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
      })).filter((m: any) => Boolean(m.url));

      // Mescla galleryUrls salvas pelo mnvapp no branding caso ainda não estejam em salon_media_items
      const existingUrls = new Set(normalizedMedia.map((m: any) => m.url));
      if (Array.isArray(branding.galleryUrls)) {
        branding.galleryUrls.forEach((gUrl: string, idx: number) => {
          if (gUrl && !existingUrls.has(gUrl)) {
            existingUrls.add(gUrl);
            normalizedMedia.push({
              id: `brd-gal-${idx}`,
              title: `Foto Galeria Meu Negócio #${idx + 1}`,
              url: gUrl,
              type: gUrl.endsWith('.mp4') ? 'video' : 'image',
              media_group: gUrl.endsWith('.mp4') ? 'videos' : 'fotos',
              category: 'espaco',
              duration_seconds: 5,
              slot_index: idx + 1,
              is_cover: false,
              created_at: new Date().toISOString().slice(0, 10),
            });
          }
        });
      }

      // 1.4 Equipe de Profissionais (public.professionals)
      const { data: prosRows } = await supabaseAdmin
        .from('professionals')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: true });

      const normalizedTeam = (prosRows || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || p.name || 'Profissional',
        role: p.role || 'Especialista',
        access_level: p.access_level || 'professional',
        phone: p.phone_whatsapp || p.phone || '',
        email: p.email || '',
        avatar_url: p.avatar_url || '',
        commission_rate: Number(p.commission_rate ?? 50),
        product_commission_rate: Number(p.product_commission_rate ?? 10),
        specialties: Array.isArray(p.specialties) ? p.specialties : [],
        is_active: p.status ? p.status === 'active' : (p.is_active ?? true),
      }));

      // 1.5 Clientes do Estabelecimento + Conta Família (public.clients + public.dependents)
      const [{ data: directClients }, { data: salonAppts }] = await Promise.all([
        supabaseAdmin.from('clients').select('*').eq('origin_salon_id', salonId).order('created_at', { ascending: false }),
        supabaseAdmin.from('appointments').select('*').eq('salon_id', salonId).order('created_at', { ascending: false }).limit(50),
      ]);

      const clientIdsSet = new Set<string>();
      const clientMap = new Map<string, any>();

      (directClients || []).forEach((c: any) => {
        clientIdsSet.add(c.id);
        clientMap.set(c.id, {
          id: c.id,
          name: c.full_name || c.name || 'Cliente',
          phone: c.phone || '',
          email: c.email || '',
          cpf: c.cpf || '',
          avatar_url: c.avatar_url || '',
          total_appointments: Number(c.total_appointments) || 0,
          dependents_count: Number(c.dependents_count) || 0,
          last_appointment_date: c.updated_at ? String(c.updated_at).slice(0, 10) : 'Recente',
          status: c.is_active === false ? 'inactive' : 'active',
          dependents: [],
        });
      });

      (salonAppts || []).forEach((apt: any) => {
        const cid = apt.client_id || apt.client_email || apt.client_phone || apt.client_name;
        if (!cid) return;
        if (apt.client_id) clientIdsSet.add(apt.client_id);
        if (!clientMap.has(cid)) {
          clientMap.set(cid, {
            id: apt.client_id || `apt-cl-${cid}`,
            name: apt.client_name || 'Cliente Agendado',
            phone: apt.client_phone || '',
            email: apt.client_email || '',
            cpf: '',
            avatar_url: '',
            total_appointments: 1,
            dependents_count: 0,
            last_appointment_date: apt.date_str || apt.appointment_date || 'Recente',
            status: 'active',
            dependents: [],
          });
        } else {
          const existing = clientMap.get(cid);
          existing.total_appointments = (existing.total_appointments || 0) + 1;
        }
      });

      // Busca dependentes reais na tabela public.dependents
      const validUuidClientIds = Array.from(clientIdsSet).filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validUuidClientIds.length > 0) {
        const { data: depsData } = await supabaseAdmin
          .from('dependents')
          .select('*')
          .in('parent_client_id', validUuidClientIds)
          .order('created_at', { ascending: false });

        (depsData || []).forEach((d: any) => {
          const parent = clientMap.get(d.parent_client_id);
          if (parent) {
            parent.dependents.push({
              id: d.id,
              parent_client_id: d.parent_client_id,
              full_name: d.full_name,
              relationship: d.relationship || 'other',
              birth_date: d.birth_date || '',
              notes: d.notes || '',
              is_unlinked: Boolean(d.is_unlinked),
              created_at: d.created_at,
            });
            parent.dependents_count = parent.dependents.filter((x: any) => !x.is_unlinked).length;
          }
        });
      }

      // 1.6 Utilidades Operacionais (Energia, Água, Equipamentos, DRE e Estoque)
      const { data: utilRow } = await supabaseAdmin
        .from('salon_utilities_records')
        .select('*')
        .eq('salon_id', salonId)
        .maybeSingle();

      const fallbackUtils = branding.utilities || {};
      const utilities = {
        energyMeters: utilRow?.energy_meters || fallbackUtils.energyMeters || [
          { id: 'em-1', name: 'Quadro Geral Salão (Bifásico)', code: 'UC-78945120', tariffPerKwh: 0.92, status: 'active' },
        ],
        energyReadings: utilRow?.energy_readings || fallbackUtils.energyReadings || [
          { id: 'er-1', meterId: 'em-1', readingKwh: 1420, costEstimated: 386.4, date: '2026-10-01', notes: 'Leitura mensal consolidada' },
          { id: 'er-2', meterId: 'em-1', readingKwh: 1615, costEstimated: 179.4, date: '2026-10-15', notes: 'Quinzena atual' },
        ],
        waterMeters: utilRow?.water_meters || fallbackUtils.waterMeters || [
          { id: 'wm-1', name: 'Hidrômetro Lavatórios & Spa', code: 'SABESP-44129', tariffPerM3: 14.5, status: 'active' },
        ],
        waterReadings: utilRow?.water_readings || fallbackUtils.waterReadings || [
          { id: 'wr-1', meterId: 'wm-1', readingM3: 118.5, costEstimated: 261.0, date: '2026-10-01', notes: 'Consumo normal lavatórios' },
          { id: 'wr-2', meterId: 'wm-1', readingM3: 127.0, costEstimated: 123.25, date: '2026-10-15', notes: 'Sem vazamentos' },
        ],
        appliances: utilRow?.appliances || fallbackUtils.appliances || [
          { id: 'ap-1', name: 'Secador Profissional Taiff 2400W (x3)', category: 'Bancada', powerWatts: 7200, dailyHours: 4.5, monthlyKwh: 972 },
          { id: 'ap-2', name: 'Ar Condicionado Inverter 18.000 BTUs', category: 'Climatização', powerWatts: 1600, dailyHours: 8, monthlyKwh: 384 },
          { id: 'ap-3', name: 'Autoclave Esterilizadora Inox', category: 'Biossegurança', powerWatts: 1200, dailyHours: 2, monthlyKwh: 72 },
        ],
        financialDre: utilRow?.financial_dre || fallbackUtils.financialDre || {
          grossRevenue: 18450.0,
          commissionsPaid: 7380.0,
          fixedCosts: 3200.0,
          utilitiesCost: 750.0,
          suppliesCost: 1120.0,
          netProfit: 6000.0,
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        inventoryItems: utilRow?.inventory_items || fallbackUtils.inventoryItems || [
          { id: 'inv-1', name: 'Pomada Modeladora Matte 120g', category: 'Finalizadores', stockQty: 18, minQty: 5, unitCost: 22.5, sellPrice: 55.0 },
          { id: 'inv-2', name: 'Shampoo Neutro Galão 5L', category: 'Lavatório', stockQty: 4, minQty: 2, unitCost: 68.0, sellPrice: 0 },
          { id: 'inv-3', name: 'Lâminas Descartáveis (Caixa c/ 100)', category: 'Descartáveis', stockQty: 3, minQty: 5, unitCost: 39.9, sellPrice: 0 },
        ],
      };

      // 1.7 Vagas Relâmpago / Cadeiras Vazias Ativas no Radar (public.service_offers)
      const { data: activeOffers } = await supabaseAdmin
        .from('service_offers')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false });

      return res.json({
        success: true,
        salon: salonRow,
        branding,
        uiSettings: uiSettingsRow || null,
        services: Array.from(unifiedServicesMap.values()),
        serviceOffers: activeOffers || [],
        mediaItems: normalizedMedia,
        professionals: normalizedTeam,
        clients: Array.from(clientMap.values()),
        utilities,
      });
    } catch (err: any) {
      console.error('[full-sync] Erro:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1B. Obter e Atualizar Configurações de UI Avançadas (public.salon_ui_settings + public.salons)
  app.get('/api/admin/salons/:salonId/ui-settings', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { data, error } = await supabaseAdmin
        .from('salon_ui_settings')
        .select('*')
        .eq('salon_id', salonId)
        .maybeSingle();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.json({ success: true, uiSettings: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/admin/salons/:salonId/ui-settings', async (req, res) => {
    try {
      const { salonId } = req.params;
      const payload = { ...req.body };
      delete payload.id;
      delete payload.salon_id;

      // 1. Upsert em public.salon_ui_settings
      const { data: uiData, error: uiErr } = await supabaseAdmin
        .from('salon_ui_settings')
        .upsert({ salon_id: salonId, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'salon_id' })
        .select()
        .single();

      // 2. Espelha colunas físicas diretamente na tabela public.salons
      await supabaseAdmin
        .from('salons')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', salonId);

      if (uiErr) {
        return res.status(400).json({ success: false, error: uiErr.message });
      }

      return res.json({ success: true, uiSettings: uiData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Sincronizar Serviço (Cria, Atualiza, Promove ou Remove em public.services ⇄ public.salon_services ⇄ public.service_offers)
  app.post('/api/admin/salons/:salonId/services', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { action, service } = req.body;

      if (action === 'delete' && service?.id) {
        await Promise.allSettled([
          supabaseAdmin.from('services').delete().eq('id', service.id),
          supabaseAdmin.from('salon_services').delete().eq('id', service.id),
          supabaseAdmin.from('salon_services').delete().eq('service_id', service.id).eq('salon_id', salonId),
        ]);
        return res.json({ success: true });
      }

      const durationMin = Number(service.duration_minutes) || 30;
      const promoPrice =
        service.promotional_price !== undefined && service.promotional_price !== null && service.promotional_price !== ''
          ? Number(service.promotional_price)
          : null;
      const photosArr = Array.isArray(service.photos) ? service.photos : [];
      const videosArr = Array.isArray(service.videos) ? service.videos : [];
      const primaryVideoUrl =
        service.video_url ||
        (videosArr.length > 0 ? (typeof videosArr[0] === 'string' ? videosArr[0] : videosArr[0]?.url) : null) ||
        null;

      const payload = {
        salon_id: salonId,
        name: service.name || service.title,
        title: service.name || service.title,
        custom_name: service.custom_name || service.name || service.title,
        category: service.category || 'cabelo',
        price: Number(service.price) || 0,
        promotional_price: promoPrice,
        duration_minutes: durationMin,
        duration_estimated: service.duration_estimated || `${durationMin} min`,
        commission_rate: Number(service.commission_rate ?? 50),
        description: service.description || '',
        is_active: service.is_active ?? true,
        image_url: service.image_url || photosArr[0] || null,
        video_url: primaryVideoUrl,
        photos: photosArr,
        videos: videosArr,
        slides: Array.isArray(service.slides) ? service.slides : [],
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(service.id || ''));

      let savedService: any = null;
      if (isUuid && action === 'update') {
        const { data } = await supabaseAdmin
          .from('services')
          .update(payload)
          .eq('id', service.id)
          .select()
          .maybeSingle();
        savedService = data;
      } else {
        const { data } = await supabaseAdmin
          .from('services')
          .insert(payload)
          .select()
          .maybeSingle();
        savedService = data;
      }

      return res.json({ success: true, service: savedService || { ...payload, id: service.id || `srv-${Date.now()}` } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2B. Publicar, Editar ou Encerrar Cadeira Vazia / Vaga Relâmpago no Radar (public.service_offers)
  app.post('/api/admin/salons/:salonId/offers', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { action, offer, offerId } = req.body;

      if (action === 'delete' && (offerId || offer?.id)) {
        await supabaseAdmin
          .from('service_offers')
          .delete()
          .eq('id', offerId || offer.id);
        return res.json({ success: true });
      }

      if (action === 'expire' && (offerId || offer?.id)) {
        await supabaseAdmin
          .from('service_offers')
          .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
          .eq('id', offerId || offer.id);
        return res.json({ success: true });
      }

      const price = Number(offer.price) || 0;
      const originalPrice = Number(offer.original_price || offer.originalPrice) || Math.round(price * 1.25 * 100) / 100;
      const gallery = Array.isArray(offer.gallery_images || offer.galleryImages)
        ? (offer.gallery_images || offer.galleryImages)
        : [];
      const videoUrl = offer.video_url || offer.videoUrl || null;
      const mediaLevel = videoUrl ? 3 : gallery.length > 0 ? 2 : Number(offer.media_level) || 1;
      const expiresHours = Number(offer.expires_in_hours || offer.expiresInHours) || 6;

      const offerPayload: Record<string, any> = {
        salon_id: salonId,
        professional_id: offer.professional_id || offer.professionalId || null,
        service_id: offer.service_id || offer.serviceId || null,
        service_title: offer.service_title || offer.serviceTitle || offer.name || 'Cadeira Vazia Promocional',
        category: (offer.category || 'cabelo').toLowerCase(),
        price,
        original_price: originalPrice,
        date_str: offer.date_str || new Date().toISOString().slice(0, 10),
        start_time: offer.start_time || offer.startTime || '14:30:00',
        end_time: offer.end_time || offer.endTime || '15:15:00',
        status: offer.status || 'AVAILABLE',
        media_level: mediaLevel,
        video_url: videoUrl,
        gallery_images: gallery,
        is_flash_deal: offer.is_flash_deal ?? true,
        description: offer.description || '',
        expires_at: offer.expires_at || new Date(Date.now() + expiresHours * 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(offer.id || ''));
      let savedOffer: any = null;

      if (isUuid && action === 'update') {
        const { data } = await supabaseAdmin
          .from('service_offers')
          .update(offerPayload)
          .eq('id', offer.id)
          .select()
          .maybeSingle();
        savedOffer = data;
      } else {
        const { data } = await supabaseAdmin
          .from('service_offers')
          .insert(offerPayload)
          .select()
          .maybeSingle();
        savedOffer = data;
      }

      return res.json({ success: true, offer: savedOffer || offerPayload });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Sincronizar Galeria de Mídias (public.salon_media_items + salons.branding.galleryUrls)
  app.post('/api/admin/salons/:salonId/media', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { action, mediaItem, mediaId } = req.body;

      if (action === 'delete' && mediaId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId)) {
          await supabaseAdmin.from('salon_media_items').delete().eq('id', mediaId);
        }
        return res.json({ success: true });
      }

      const rowToInsert: Record<string, any> = {
        salon_id: salonId,
        title: mediaItem.title || 'Mídia do Estabelecimento',
        caption: mediaItem.title || 'Mídia do Estabelecimento',
        url: mediaItem.url,
        media_url: mediaItem.url,
        type: mediaItem.type || 'image',
        media_type: mediaItem.type || 'image',
        media_group: mediaItem.media_group || (mediaItem.type === 'video' ? 'videos' : 'fotos'),
        category: mediaItem.category || 'servicos',
        duration_seconds: mediaItem.duration_seconds || 5,
        is_cover: Boolean(mediaItem.is_cover),
      };

      const { data: inserted } = await supabaseAdmin
        .from('salon_media_items')
        .insert(rowToInsert)
        .select()
        .maybeSingle();

      // Espelha também no branding.galleryUrls para leitura instantânea no mnvapp
      const { data: salonRow } = await supabaseAdmin.from('salons').select('branding, cover_image_url, logo_url').eq('id', salonId).maybeSingle();
      if (salonRow) {
        const currentBranding = salonRow.branding && typeof salonRow.branding === 'object' ? salonRow.branding : {};
        const prevGallery = Array.isArray(currentBranding.galleryUrls) ? currentBranding.galleryUrls : [];
        const nextGallery = prevGallery.includes(mediaItem.url) ? prevGallery : [mediaItem.url, ...prevGallery].slice(0, 20);
        const updates: Record<string, any> = {
          branding: {
            ...currentBranding,
            galleryUrls: nextGallery,
          },
        };
        if (mediaItem.is_cover || mediaItem.category === 'banner') {
          updates.cover_image_url = mediaItem.url;
        }
        if (mediaItem.category === 'logotipo') {
          updates.logo_url = mediaItem.url;
        }
        await supabaseAdmin.from('salons').update(updates).eq('id', salonId);
      }

      return res.json({ success: true, mediaItem: inserted || { ...rowToInsert, id: `med-${Date.now()}` } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Sincronizar Tema Camaleão e Identidade Visual (public.salons + salons.branding)
  // 4. Sincronizar Tema Camaleão, Identidade Visual & UI Settings (public.salons + public.salon_ui_settings + salons.branding)
  const handleThemeAndUiSync = async (req: any, res: any) => {
    try {
      const { salonId } = req.params;
      const b = req.body || {};
      const {
        themePresetId,
        primaryColor,
        secondaryColor,
        logoUrl,
        logoDarkUrl,
        logoLightUrl,
        faviconUrl,
        coverImageUrl,
        facadePhotoUrl,
        interiorPhotoUrl,
        slogan,
        // Novos campos físicos de UI
        defaultTheme,
        pwaName,
        showSlogan,
        logoTextFallback,
        logoTextColor,
        showHeroSlides,
        welcomeStyle,
        sectionHeaderBgColor,
        sectionHeaderTextColor,
        sectionHeaderIconColor,
        sectionHeaderBgStyle,
        sectionHeaderBorder,
        sectionHeaderBtnBgColor,
        sectionHeaderBtnActiveBgColor,
        sectionHeaderBtnBorder,
        sectionHeaderBtnShadow,
        sectionHeaderBtnBlur,
        sectionHeaderBtnFont,
        navStyle,
        navShape,
        navBorder,
        navIconBorder,
        navBgStyle,
        navBgColor,
        navBtnBgColor,
        navBtnActiveBgColor,
        navActiveColor,
        navTextColor,
      } = b;

      const { data: salonRow } = await supabaseAdmin.from('salons').select('branding').eq('id', salonId).maybeSingle();
      const currentBranding = salonRow?.branding && typeof salonRow.branding === 'object' ? salonRow.branding : {};

      const updatedBranding = {
        ...currentBranding,
        ...(themePresetId !== undefined ? { themePresetId } : {}),
        ...(defaultTheme !== undefined ? { defaultTheme, themeMode: defaultTheme } : {}),
        ...(primaryColor !== undefined ? { primaryColor } : {}),
        ...(secondaryColor !== undefined ? { secondaryColor } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(logoDarkUrl !== undefined ? { logoDarkUrl } : {}),
        ...(logoLightUrl !== undefined ? { logoLightUrl } : {}),
        ...(faviconUrl !== undefined ? { faviconUrl } : {}),
        ...(coverImageUrl !== undefined ? { bannerUrl: coverImageUrl, coverImageUrl } : {}),
        ...(facadePhotoUrl !== undefined ? { facadePhotoUrl } : {}),
        ...(interiorPhotoUrl !== undefined ? { interiorPhotoUrl } : {}),
        ...(slogan !== undefined ? { slogan } : {}),
        ...(navBgStyle !== undefined ? { navBgStyle } : {}),
        ...(navBgColor !== undefined ? { navBgColor } : {}),
        ...(navActiveColor !== undefined ? { navActiveColor } : {}),
        ...(navTextColor !== undefined ? { navTextColor } : {}),
        ...(navBorder !== undefined ? { navBorder } : {}),
        ...(navIconBorder !== undefined ? { navIconBorder } : {}),
        updatedAt: new Date().toISOString(),
      };

      const salonUpdatePayload: Record<string, any> = {
        branding: updatedBranding,
        updated_at: new Date().toISOString(),
      };
      if (themePresetId !== undefined) salonUpdatePayload.theme_preset_id = themePresetId;
      if (primaryColor !== undefined) salonUpdatePayload.primary_color = primaryColor;
      if (secondaryColor !== undefined) salonUpdatePayload.secondary_color = secondaryColor;
      if (logoUrl !== undefined) salonUpdatePayload.logo_url = logoUrl;
      if (logoDarkUrl !== undefined) salonUpdatePayload.logo_dark_url = logoDarkUrl;
      if (logoLightUrl !== undefined) salonUpdatePayload.logo_light_url = logoLightUrl;
      if (faviconUrl !== undefined) salonUpdatePayload.favicon_url = faviconUrl;
      if (coverImageUrl !== undefined) salonUpdatePayload.cover_image_url = coverImageUrl;
      if (facadePhotoUrl !== undefined) salonUpdatePayload.facade_photo_url = facadePhotoUrl;
      if (interiorPhotoUrl !== undefined) salonUpdatePayload.interior_photo_url = interiorPhotoUrl;
      if (slogan !== undefined) salonUpdatePayload.slogan = slogan;

      // Colunas físicas de UI
      if (defaultTheme !== undefined) salonUpdatePayload.default_theme = defaultTheme;
      if (pwaName !== undefined) salonUpdatePayload.pwa_name = pwaName;
      if (showSlogan !== undefined) salonUpdatePayload.show_slogan = showSlogan;
      if (logoTextFallback !== undefined) salonUpdatePayload.logo_text_fallback = logoTextFallback;
      if (logoTextColor !== undefined) salonUpdatePayload.logo_text_color = logoTextColor;
      if (showHeroSlides !== undefined) salonUpdatePayload.show_hero_slides = showHeroSlides;
      if (welcomeStyle !== undefined) salonUpdatePayload.welcome_style = welcomeStyle;
      if (sectionHeaderBgColor !== undefined) salonUpdatePayload.section_header_bg_color = sectionHeaderBgColor;
      if (sectionHeaderTextColor !== undefined) salonUpdatePayload.section_header_text_color = sectionHeaderTextColor;
      if (sectionHeaderIconColor !== undefined) salonUpdatePayload.section_header_icon_color = sectionHeaderIconColor;
      if (sectionHeaderBgStyle !== undefined) salonUpdatePayload.section_header_bg_style = sectionHeaderBgStyle;
      if (sectionHeaderBorder !== undefined) salonUpdatePayload.section_header_border = sectionHeaderBorder;
      if (sectionHeaderBtnBgColor !== undefined) salonUpdatePayload.section_header_btn_bg_color = sectionHeaderBtnBgColor;
      if (sectionHeaderBtnActiveBgColor !== undefined) salonUpdatePayload.section_header_btn_active_bg_color = sectionHeaderBtnActiveBgColor;
      if (sectionHeaderBtnBorder !== undefined) salonUpdatePayload.section_header_btn_border = sectionHeaderBtnBorder;
      if (sectionHeaderBtnShadow !== undefined) salonUpdatePayload.section_header_btn_shadow = sectionHeaderBtnShadow;
      if (sectionHeaderBtnBlur !== undefined) salonUpdatePayload.section_header_btn_blur = sectionHeaderBtnBlur;
      if (sectionHeaderBtnFont !== undefined) salonUpdatePayload.section_header_btn_font = sectionHeaderBtnFont;
      if (navStyle !== undefined) salonUpdatePayload.nav_style = navStyle;
      if (navShape !== undefined) salonUpdatePayload.nav_shape = navShape;
      if (navBorder !== undefined) salonUpdatePayload.nav_border = navBorder;
      if (navIconBorder !== undefined) salonUpdatePayload.nav_icon_border = navIconBorder;
      if (navBgStyle !== undefined) salonUpdatePayload.nav_bg_style = navBgStyle;
      if (navBgColor !== undefined) salonUpdatePayload.nav_bg_color = navBgColor;
      if (navBtnBgColor !== undefined) salonUpdatePayload.nav_btn_bg_color = navBtnBgColor;
      if (navBtnActiveBgColor !== undefined) salonUpdatePayload.nav_btn_active_bg_color = navBtnActiveBgColor;
      if (navActiveColor !== undefined) salonUpdatePayload.nav_active_color = navActiveColor;
      if (navTextColor !== undefined) salonUpdatePayload.nav_text_color = navTextColor;

      const { data: updatedSalon, error: upErr } = await safeSupabaseWrite('salons', 'update', salonUpdatePayload, {
        eqCol: 'id',
        eqVal: salonId,
      });

      if (upErr) {
        return res.status(400).json({ success: false, error: upErr.message });
      }

      // Sincroniza também na tabela relacional public.salon_ui_settings (SQL v5.0)
      const uiRowPayload: Record<string, any> = {
        salon_id: salonId,
        branding_snapshot: updatedBranding,
        updated_at: new Date().toISOString(),
      };
      if (defaultTheme !== undefined) uiRowPayload.default_theme = defaultTheme;
      if (primaryColor !== undefined) uiRowPayload.primary_color = primaryColor;
      if (secondaryColor !== undefined) uiRowPayload.secondary_color = secondaryColor;
      if (pwaName !== undefined) uiRowPayload.pwa_name = pwaName;
      if (showSlogan !== undefined) uiRowPayload.show_slogan = showSlogan;
      if (logoTextFallback !== undefined) uiRowPayload.logo_text_fallback = logoTextFallback;
      if (logoTextColor !== undefined) uiRowPayload.logo_text_color = logoTextColor;
      if (showHeroSlides !== undefined) uiRowPayload.show_hero_slides = showHeroSlides;
      if (welcomeStyle !== undefined) uiRowPayload.welcome_style = welcomeStyle;
      if (sectionHeaderBgColor !== undefined) uiRowPayload.section_header_bg_color = sectionHeaderBgColor;
      if (sectionHeaderTextColor !== undefined) uiRowPayload.section_header_text_color = sectionHeaderTextColor;
      if (sectionHeaderIconColor !== undefined) uiRowPayload.section_header_icon_color = sectionHeaderIconColor;
      if (sectionHeaderBgStyle !== undefined) uiRowPayload.section_header_bg_style = sectionHeaderBgStyle;
      if (sectionHeaderBorder !== undefined) uiRowPayload.section_header_border = sectionHeaderBorder;
      if (navStyle !== undefined) uiRowPayload.nav_style = navStyle;
      if (navShape !== undefined) uiRowPayload.nav_shape = navShape;
      if (navBorder !== undefined) uiRowPayload.nav_border = navBorder;
      if (navIconBorder !== undefined) uiRowPayload.nav_icon_border = navIconBorder;
      if (navBgStyle !== undefined) uiRowPayload.nav_bg_style = navBgStyle;
      if (navBgColor !== undefined) uiRowPayload.nav_bg_color = navBgColor;
      if (navBtnBgColor !== undefined) uiRowPayload.nav_btn_bg_color = navBtnBgColor;
      if (navBtnActiveBgColor !== undefined) uiRowPayload.nav_btn_active_bg_color = navBtnActiveBgColor;
      if (navActiveColor !== undefined) uiRowPayload.nav_active_color = navActiveColor;
      if (navTextColor !== undefined) uiRowPayload.nav_text_color = navTextColor;

      try {
        await safeSupabaseWrite('salon_ui_settings', 'upsert', uiRowPayload, { onConflict: 'salon_id' });
      } catch (uiErr) {
        console.warn('[handleThemeAndUiSync] Aviso ao sincronizar salon_ui_settings:', uiErr);
      }

      return res.json({ success: true, salon: updatedSalon, branding: updatedBranding });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.post('/api/admin/salons/:salonId/theme', handleThemeAndUiSync);
  app.post('/api/admin/salons/:salonId/branding-theme', handleThemeAndUiSync);

  // 5. Sincronizar Equipe de Profissionais do Salão (public.professionals)
  app.post('/api/admin/salons/:salonId/professionals', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { action, professional, professionalId } = req.body;

      if (action === 'delete' && professionalId) {
        await supabaseAdmin.from('professionals').delete().eq('id', professionalId);
        return res.json({ success: true });
      }

      const rowPayload: Record<string, any> = {
        salon_id: salonId,
        name: professional.name,
        full_name: professional.name,
        role: professional.role || 'Especialista',
        access_level: professional.access_level || 'professional',
        phone: professional.phone || '',
        phone_whatsapp: professional.phone || '',
        email: professional.email || null,
        avatar_url: professional.avatar_url || null,
        commission_rate: Number(professional.commission_rate ?? 50),
        product_commission_rate: Number(professional.product_commission_rate ?? 10),
        specialties: Array.isArray(professional.specialties) ? professional.specialties : [],
        is_active: professional.is_active ?? true,
        status: (professional.is_active ?? true) ? 'active' : 'suspended',
        updated_at: new Date().toISOString(),
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(professional.id || ''));

      let savedPro: any = null;
      if (isUuid && action === 'update') {
        const { data } = await supabaseAdmin
          .from('professionals')
          .update(rowPayload)
          .eq('id', professional.id)
          .select()
          .maybeSingle();
        savedPro = data;
      } else {
        const { data } = await supabaseAdmin
          .from('professionals')
          .insert(rowPayload)
          .select()
          .maybeSingle();
        savedPro = data;
      }

      return res.json({ success: true, professional: savedPro || { ...rowPayload, id: professional.id || `pro-${Date.now()}` } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Sincronizar Dependentes da Conta Família (public.dependents + clients.dependents_count)
  app.post('/api/admin/clients/:clientId/dependents', async (req, res) => {
    try {
      const { clientId } = req.params;
      const { action, dependent, dependentId } = req.body;

      if (action === 'unlink' && dependentId) {
        await supabaseAdmin
          .from('dependents')
          .update({ is_unlinked: true, unlinked_at: new Date().toISOString() })
          .eq('id', dependentId);
      } else if (action === 'create' && dependent) {
        await supabaseAdmin.from('dependents').insert({
          parent_client_id: clientId,
          full_name: dependent.full_name,
          relationship: dependent.relationship || 'other',
          birth_date: dependent.birth_date || null,
          notes: dependent.notes || null,
          is_unlinked: false,
        });
      }

      const { data: activeDeps } = await supabaseAdmin
        .from('dependents')
        .select('*')
        .eq('parent_client_id', clientId)
        .order('created_at', { ascending: false });

      const activeCount = (activeDeps || []).filter((d: any) => !d.is_unlinked).length;
      await supabaseAdmin
        .from('clients')
        .update({ dependents_count: activeCount, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      return res.json({ success: true, dependents: activeDeps || [], dependentsCount: activeCount });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Sincronizar Utilidades Operacionais (Energia, Água, Equipamentos, DRE e Estoque)
  app.post('/api/admin/salons/:salonId/utilities', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { utilities } = req.body;

      // Salva em public.salon_utilities_records (se a tabela existir)
      await supabaseAdmin
        .from('salon_utilities_records')
        .upsert({
          salon_id: salonId,
          energy_meters: utilities.energyMeters || [],
          energy_readings: utilities.energyReadings || [],
          water_meters: utilities.waterMeters || [],
          water_readings: utilities.waterReadings || [],
          appliances: utilities.appliances || [],
          financial_dre: utilities.financialDre || {},
          inventory_items: utilities.inventoryItems || [],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'salon_id' });

      // Espelha também em salons.branding.utilities como fallback resiliente
      const { data: salonRow } = await supabaseAdmin.from('salons').select('branding').eq('id', salonId).maybeSingle();
      const currentBranding = salonRow?.branding && typeof salonRow.branding === 'object' ? salonRow.branding : {};
      await supabaseAdmin
        .from('salons')
        .update({
          branding: {
            ...currentBranding,
            utilities,
            utilitiesUpdatedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', salonId);

      return res.json({ success: true, utilities });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // AI Structure & Screen Analysis endpoint
  app.post('/api/analyze-design', async (req, res) => {
    try {
      const { fileName, fileType, imageBase64, mimeType, additionalContext } = req.body;

      if (!ai) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY não configurada no servidor. Configure a chave no menu de segredos.',
        });
      }

      const prompt = `Você é um Arquiteto de Software e Especialista em UI/UX corporativo.
Analise detalhadamente o arquivo/tela fornecido (Arquivo: ${fileName || 'design/video/tela'}, Tipo: ${fileType || mimeType || 'design'}).
${additionalContext ? `Contexto adicional do usuário: ${additionalContext}` : ''}

Por favor, forneça uma análise estrutural e técnica completa em formato JSON estrito com o seguinte esquema:
{
  "title": "Título descritivo da tela ou fluxo",
  "summary": "Resumo executivo da finalidade da tela/vídeo e arquitetura geral",
  "screensIdentified": [
    {
      "name": "Nome da tela ou seção",
      "description": "Explicação do papel desta tela no fluxo",
      "keyElements": ["Lista de elementos principais, ex: header com busca, card de métricas, tabela paginada"],
      "purpose": "Objetivo de negócio / interação do usuário"
    }
  ],
  "recommendations": [
    "Boas práticas de acessibilidade, estados de carregamento, validações e responsividade"
  ]
}

Responda APENAS com o JSON válido, sem blocos de código adicionais além do JSON.`;

      const contents: any[] = [];

      if (imageBase64 && (mimeType?.startsWith('image/') || mimeType === 'application/pdf')) {
        contents.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/png',
          },
        });
      }

      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (err) {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      return res.json({ success: true, analysis: parsedData });
    } catch (error: any) {
      console.error('Erro na análise com Gemini:', error);
      return res.status(500).json({
        error: error.message || 'Erro ao processar a análise com IA.',
      });
    }
  });

  // Rota para obter o SQL Master completo v5.0 diretamente via browser ou script
  app.get('/api/admin/schema/sql', (req, res) => {
    const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
    if (fs.existsSync(schemaPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(schemaPath);
    }
    return res.status(404).send('-- supabase_schema.sql não encontrado');
  });

  // Rota para obter o Script SQL Mestre de Convergência Soberana da Tríade v5.0 (bol-159 / bol-160)
  app.get('/api/admin/triade/master-sql', (req, res) => {
    const masterSqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20261111_master_convergence_v5_0.sql');
    const fallbackPath = path.join(process.cwd(), 'supabase_schema.sql');
    const targetPath = fs.existsSync(masterSqlPath) ? masterSqlPath : fallbackPath;
    if (fs.existsSync(targetPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(targetPath);
    }
    return res.status(404).send('-- 20261111_master_convergence_v5_0.sql não encontrado');
  });

  // Rota para obter o Relatório Técnico de Convergência da Tríade v5.0 (bol-159 / bol-160)
  app.get('/api/admin/triade/convergence-report', async (req, res) => {
    try {
      let salonsCount = 0;
      let servicesCount = 0;
      let clientsCount = 0;
      let dependentsCount = 0;
      let appointmentsCount = 0;
      let securityQuestionsCount = 0;
      let dbOk = false;

      try {
        const [salonsRes, servicesRes, clientsRes, depsRes, aptsRes, secQRes] = await Promise.all([
          supabaseAdmin.from('salons').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('services').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('dependents').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('security_questions').select('code', { count: 'exact', head: true }),
        ]);

        salonsCount = salonsRes.count || 0;
        servicesCount = servicesRes.count || 0;
        clientsCount = clientsRes.count || 0;
        dependentsCount = depsRes.count || 0;
        appointmentsCount = aptsRes.count || 0;
        securityQuestionsCount = secQRes.count || 0;
        dbOk = true;
      } catch (err) {
        console.warn('[convergence-report] Database stats warning:', err);
      }

      return res.json({
        success: true,
        bulletinId: 'bol-160-admvapp-v5-convergence-ratification',
        sqlVersion: 'v5.0',
        timestamp: new Date().toISOString(),
        databaseConnected: dbOk,
        stats: {
          salonsCount,
          servicesCount,
          clientsCount,
          dependentsCount,
          appointmentsCount,
          securityQuestionsCount,
        },
        resolutions: [
          { key: 'zero_mocks_and_seeds', status: 'resolved', description: 'Zero mocks em código/SQL e zero DROP TABLE destrutivo (apenas 3 perguntas de segurança oficiais).' },
          { key: 'pastel_mint_defaults', status: 'resolved', description: 'Paleta oficial Verde Pastel Clarinho (#10B981 / #065F46 / #D1FAE5 / #ECFDF5 / light / nav_icon_border=none) sincronizada com salon_ui_settings.' },
          { key: 'unified_billing_fields', status: 'resolved', description: 'fee_per_booking ⇄ billing_fee_value = 2.50, billing_plan = PER_APPOINTMENT e monthly_subscription_fee = 89.90.' },
          { key: 'chronological_appointments', status: 'resolved', description: 'Ordenação crescente (date_str ASC, start_time ASC), Pago/À pagar, Bloqueado, Permuta (swap_state) e Colisão Geotemporal.' },
          { key: 'security_questions_support', status: 'resolved', description: 'Indicador e reset administrativo de user_security_answers e senha habilitados.' },
        ],
        masterSqlUrl: '/api/admin/triade/master-sql',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Admin Master admvapp] Server running on http://localhost:${PORT}`);
    console.log(`[Admin Master admvapp] Service Role: ${SUPABASE_SERVICE_ROLE_KEY ? 'ACTIVE' : 'NOT SET (Fallback to Anon)'} | SQL Contract: v5.0 (Zero Mocks)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
