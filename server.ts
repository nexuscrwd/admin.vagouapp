import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import sharp from 'sharp';
import * as webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  process.env.SUPABASE_SERVICE_ROLE,
  process.env.SERVICE_ROLE_KEY,
].find((k) => typeof k === 'string' && k.trim().startsWith('eyJ'))?.trim() || '';

const SUPABASE_AUTH_KEY = SUPABASE_SERVICE_ROLE_KEY || getSafeSupabaseKey();

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

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY ausente; rotas backend ficarão sujeitas às políticas RLS.');
}

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = (process.env.VAPID_SUBJECT || 'mailto:contato@vagouapp.com').trim();

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn('[WebPush] Aviso ao configurar VAPID:', err);
  }
}

function getAdminDbClient(req?: express.Request) {
  if (SUPABASE_SERVICE_ROLE_KEY) {
    return supabaseAdmin;
  }
  const authHeader = String(req?.headers?.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      return createClient(SUPABASE_URL, getSafeSupabaseKey(), {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }
  return supabaseAdmin;
}

const RECENT_PUSH_DEDUPE = new Map<string, number>();

async function notifyAdminsOnEvent(params: {
  eventType: string;
  title: string;
  body: string;
  url?: string;
  payload?: Record<string, any>;
  dedupeKey?: string;
}): Promise<{ queued: boolean; sent: number; failed: number; subscriptions: number }> {
  const now = Date.now();
  for (const [key, ts] of RECENT_PUSH_DEDUPE.entries()) {
    if (now - ts > 15000) RECENT_PUSH_DEDUPE.delete(key);
  }
  if (params.dedupeKey) {
    const prev = RECENT_PUSH_DEDUPE.get(params.dedupeKey);
    if (prev && now - prev < 10000) {
      return { queued: false, sent: 0, failed: 0, subscriptions: 0 };
    }
    RECENT_PUSH_DEDUPE.set(params.dedupeKey, now);
  }

  let outboxId: string | null = null;
  try {
    const { data: inserted } = await supabaseAdmin
      .from('notification_outbox')
      .insert([
        {
          event_type: params.eventType,
          target_role: 'super_admin',
          title: params.title,
          body: params.body,
          url: params.url || '/',
          payload: params.payload || {},
          status: 'pending',
          attempts: 0,
        },
      ])
      .select('id')
      .maybeSingle();
    outboxId = inserted?.id || null;
  } catch {}

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { queued: Boolean(outboxId), sent: 0, failed: 0, subscriptions: 0 };
  }

  try {
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('is_active', true)
      .eq('app_origin', 'admvapp');

    const activeSubs = subs || [];
    if (activeSubs.length === 0) {
      if (outboxId) {
        await supabaseAdmin
          .from('notification_outbox')
          .update({ status: 'skipped', attempts: 1, sent_at: new Date().toISOString() })
          .eq('id', outboxId);
      }
      return { queued: Boolean(outboxId), sent: 0, failed: 0, subscriptions: 0 };
    }

    const pushPayload = JSON.stringify({
      title: params.title,
      body: params.body,
      url: params.url || '/',
      eventType: params.eventType,
      data: params.payload || {},
    });

    let sent = 0;
    let failed = 0;
    let lastError: string | null = null;

    for (const sub of activeSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        );
        sent++;
      } catch (pushErr: any) {
        failed++;
        lastError = pushErr?.message || 'Push delivery error';
        const statusCode = Number(pushErr?.statusCode);
        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
        }
      }
    }

    if (outboxId) {
      await supabaseAdmin
        .from('notification_outbox')
        .update({
          status: sent > 0 ? 'sent' : 'failed',
          attempts: 1,
          last_error: sent > 0 ? null : lastError,
          sent_at: sent > 0 ? new Date().toISOString() : null,
        })
        .eq('id', outboxId);
    }

    return { queued: Boolean(outboxId), sent, failed, subscriptions: activeSubs.length };
  } catch {
    return { queued: Boolean(outboxId), sent: 0, failed: 1, subscriptions: 0 };
  }
}

function startAdminRealtimePushWatcher() {
  if (!SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    supabaseAdmin
      .channel('admvapp-server-push-watcher')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, (payload: any) => {
        const row = payload?.new || {};
        const name = row.full_name || row.email || 'Novo usuário';
        notifyAdminsOnEvent({
          eventType: 'client_created',
          title: 'Admin-Vapp • Novo Usuário',
          body: `${name} acabou de se cadastrar (${row.created_via || 'portal'}).`,
          url: '/?screen=users',
          payload: { table: 'clients', id: row.id },
          dedupeKey: `client_insert_${row.id || row.email}`,
        }).catch(() => {});
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clients' }, (payload: any) => {
        const row = payload?.new || {};
        const name = row.full_name || row.email || 'Usuário';
        notifyAdminsOnEvent({
          eventType: 'client_updated',
          title: 'Admin-Vapp • Cadastro Alterado',
          body: `Os dados do usuário ${name} foram atualizados.`,
          url: '/?screen=users',
          payload: { table: 'clients', id: row.id },
          dedupeKey: `client_update_${row.id}`,
        }).catch(() => {});
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'salons' }, (payload: any) => {
        const row = payload?.new || {};
        const name = row.trade_name || row.slug || 'Novo estabelecimento';
        notifyAdminsOnEvent({
          eventType: 'salon_created',
          title: 'Admin-Vapp • Novo Estabelecimento',
          body: `${name} foi cadastrado no ecossistema.`,
          url: '/?screen=salons',
          payload: { table: 'salons', id: row.id },
          dedupeKey: `salon_insert_${row.id || row.slug}`,
        }).catch(() => {});
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salons' }, (payload: any) => {
        const row = payload?.new || {};
        const name = row.trade_name || row.slug || 'Estabelecimento';
        notifyAdminsOnEvent({
          eventType: 'salon_updated',
          title: 'Admin-Vapp • Estabelecimento Alterado',
          body: `O estabelecimento ${name} teve o cadastro atualizado.`,
          url: '/?screen=salons',
          payload: { table: 'salons', id: row.id },
          dedupeKey: `salon_update_${row.id}`,
        }).catch(() => {});
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'professionals' }, (payload: any) => {
        const row = payload?.new || {};
        const name = row.full_name || 'Novo profissional';
        notifyAdminsOnEvent({
          eventType: 'professional_created',
          title: 'Admin-Vapp • Novo Profissional',
          body: `${name} foi adicionado à equipe.`,
          url: '/?screen=users',
          payload: { table: 'professionals', id: row.id },
          dedupeKey: `prof_insert_${row.id}`,
        }).catch(() => {});
      })
      .subscribe();
  } catch (err) {
    console.warn('[WebPush Watcher] Aviso ao assinar Realtime:', err);
  }
}

const ALLOWED_MEDIA_BUCKETS = new Set(['avatars', 'branding', 'services', 'salon-media']);
const ALLOWED_OWNER_TYPES = new Set([
  'profile',
  'salon',
  'service',
  'service_offer',
  'professional',
  'admin_preference',
]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);
const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const mediaUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function isSafeMediaUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (/^(data:|javascript:|vbscript:)/i.test(trimmed)) return false;
  return trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/');
}

async function verifyAdminAccess(req: express.Request): Promise<{ ok: boolean; userId?: string }> {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false };

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return { ok: false };
    const role = String(data.user.app_metadata?.role || '').toLowerCase();
    if (role === 'super_admin' || role === 'admin') {
      return { ok: true, userId: data.user.id };
    }
    const { data: sysAdmin } = await supabaseAdmin
      .from('system_admins')
      .select('id, is_active')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (sysAdmin) {
      return { ok: true, userId: data.user.id };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

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
    summary: '1. Consolidação Automática system_admins ⇄ clients: Registros duplicados onde a mesma pessoa constava simultaneamente em public.system_admins e public.clients foram consolidados no registro soberano de Administrador (preservando total_appointments, dependents_count e avatar_url e removendo a linha sombra de public.clients). 2. Fim do Auto-Upsert Cruzado no Login/Salão: Removidos os upserts automáticos em múltiplas tabelas durante login administrativo e criação de salão. 3. Blindagem SQL + Backend + UI com índices únicos parciais e triggers.',
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

  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  const apiKey = process.env.GEMINI_API_KEY;

  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    return res.sendFile(swPath);
  });

  app.get('/manifest.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    return res.sendFile(manifestPath);
  });

  app.get('/api/health', (_req, res) => {
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

  const KNOWN_MISSING_COLUMNS: Record<string, Set<string>> = {};

  const normalizeV6SalonStatus = (raw: unknown): 'active' | 'pending' | 'suspended' | 'archived' => {
    const val = String(raw || 'active').trim().toLowerCase();
    if (val === 'active' || val === 'ativo' || val === 'approved') return 'active';
    if (val === 'suspended' || val === 'suspenso' || val === 'blocked' || val === 'inactive') return 'suspended';
    if (val === 'archived' || val === 'arquivado') return 'archived';
    if (val === 'pending' || val === 'pendente' || val === 'incomplete' || val === 'incompleto') return 'pending';
    return 'active';
  };

  const normalizeV6BillingPlan = (raw: unknown): 'per_booking' | 'monthly_subscription' | 'enterprise' | 'trial' => {
    const val = String(raw || 'per_booking').trim().toLowerCase();
    if (val === 'monthly_subscription' || val === 'monthly' || val === 'mensal' || val === 'subscription') {
      return 'monthly_subscription';
    }
    if (val === 'enterprise' || val === 'corporate') return 'enterprise';
    if (val === 'trial' || val === 'free' || val === 'teste') return 'trial';
    return 'per_booking';
  };

  const normalizeV6CreatedVia = (raw: unknown): 'admvapp' | 'mnvapp' | 'pvapp' | 'system' => {
    const val = String(raw || 'admvapp').trim().toLowerCase();
    if (val === 'admvapp' || val === 'admin') return 'admvapp';
    if (val === 'mnvapp' || val === 'establishment' || val === 'salon') return 'mnvapp';
    if (val === 'pvapp' || val === 'portal' || val === 'client') return 'pvapp';
    if (val === 'system') return 'system';
    return 'admvapp';
  };

  const normalizeV6ProfAccessLevel = (raw: unknown): 'admin' | 'manager' | 'professional' | 'receptionist' => {
    const val = String(raw || 'professional').trim().toLowerCase();
    if (val.includes('propriet') || val.includes('dono') || val.includes('owner') || val === 'admin') return 'admin';
    if (val.includes('gerent') || val.includes('manager')) return 'manager';
    if (val.includes('recep') || val.includes('receptionist')) return 'receptionist';
    return 'professional';
  };

  const normalizeV6DependentRel = (
    raw: unknown
  ): 'son' | 'daughter' | 'child' | 'spouse' | 'parent' | 'sibling' | 'other' => {
    const val = String(raw || 'other').trim().toLowerCase();
    if (val === 'son' || val === 'filho') return 'son';
    if (val === 'daughter' || val === 'filha') return 'daughter';
    if (val === 'child' || val.includes('filh') || val.includes('crian')) return 'child';
    if (val === 'spouse' || val.includes('cônjug') || val.includes('conjug') || val.includes('espos') || val.includes('marid')) return 'spouse';
    if (val === 'parent' || val === 'pai' || val === 'mãe' || val === 'mae') return 'parent';
    if (val === 'sibling' || val.includes('irmã') || val.includes('irma')) return 'sibling';
    return 'other';
  };

  const toUiBool = (val: unknown, fallback = false): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') {
      const low = val.trim().toLowerCase();
      if (!low || low === 'none' || low === 'false' || low === '0' || low === 'off' || low === 'no') return false;
      return true;
    }
    return fallback;
  };

  const clampBillingDueDay = (raw: unknown): number => {
    const n = Math.round(Number(raw ?? 10));
    if (!Number.isFinite(n)) return 10;
    return Math.min(28, Math.max(1, n));
  };

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

    for (const knownMissing of KNOWN_MISSING_COLUMNS[table]) {
      if (workingPayload[knownMissing] !== undefined) {
        strippedColumns.push(knownMissing);
        delete workingPayload[knownMissing];
      }
    }

    for (let attempt = 0; attempt < 40; attempt++) {
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
        delete workingPayload[missingCol];
        continue;
      }

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

  async function uploadBase64MediaIfNeeded(
    rawUrl: string | undefined | null,
    prefix: string,
    targetBucket: 'salon-media' | 'avatars' | 'media' = 'salon-media'
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
        const primaryBucket = targetBucket === 'avatars' ? 'avatars' : 'salon-media';
        const fallbackBucket = primaryBucket === 'avatars' ? 'salon-media' : 'avatars';
        const folder = primaryBucket === 'avatars' ? 'avatars' : 'salons';
        const fileName = `${folder}/${cleanPrefix}-${Date.now()}.${ext}`;

        for (const bucket of [primaryBucket, fallbackBucket]) {
          const { error: upErr } = await supabaseAdmin.storage
            .from(bucket)
            .upload(fileName, buffer, { contentType, cacheControl: '31536000', upsert: true });

          if (!upErr) {
            const { data: pubData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
            if (pubData?.publicUrl) return pubData.publicUrl;
          }
        }
      }
    } catch (e) {
      console.warn('[uploadBase64MediaIfNeeded] Falha no upload para storage, mantendo original:', e);
    }
    return trimmed;
  }

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

    try {
      if (isUuid(params.userId)) {
        await safeSupabaseWrite('profiles', 'update', commonAddressFields, { eqCol: 'id', eqVal: params.userId });
      }
      if (cleanEmail) {
        await safeSupabaseWrite('profiles', 'update', commonAddressFields, { eqCol: 'email', eqVal: cleanEmail });
      }
    } catch {}

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

  app.get('/api/geo/config', (_req, res) => {
    res.json({
      success: true,
      apiKey: GOOGLE_MAPS_API_KEY,
      hasKey: Boolean(GOOGLE_MAPS_API_KEY),
    });
  });

  app.post('/api/geo/geocode', async (req, res) => {
    try {
      const body = req.body || {};
      const referer = req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/';

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

  app.all('/api/admin/sync-avatars', async (_req, res) => {
    try {
      let convertedCount = 0;
      let syncedTablesCount = 0;

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

                await supabaseAdmin.from('professionals').update({ avatar_url: publicUrl, updated_at: now }).eq('id', p.id);

                if (p.email) {
                  await supabaseAdmin.from('clients').update({ avatar_url: publicUrl, updated_at: now }).eq('email', p.email);
                } else if (p.name) {
                  await supabaseAdmin.from('clients').update({ avatar_url: publicUrl, updated_at: now }).ilike('name', `%${p.name}%`);
                }

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

  app.get('/api/admin/triade-status', async (_req, res) => {
    try {

      const { error } = await supabaseAdmin.from('salons').select('id', { count: 'exact', head: true });
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

      const { data, error } = await supabaseAdmin
        .from('admin_preferences')
        .select('logo_dark_url, logo_light_url, mobile_app_icon_url, favicon_url, preferences, updated_at')
        .eq('id', 'global')
        .maybeSingle();

      if (!error && data) {
        const basePrefs = data.preferences && typeof data.preferences === 'object' ? data.preferences : {};
        const merged = {
          ...basePrefs,
          logoDarkUrl: data.logo_dark_url || basePrefs.logoDarkUrl || '',
          logoLightUrl: data.logo_light_url || basePrefs.logoLightUrl || '',
          mobileAppIconUrl: data.mobile_app_icon_url || basePrefs.mobileAppIconUrl || '',
          faviconUrl: data.favicon_url || basePrefs.faviconUrl || '',
          updatedAt: data.updated_at || basePrefs.updatedAt,
        };
        return res.json({
          success: true,
          preferences: merged,
        });
      }

      const stored = readAdminPreferencesFromDisk();
      return res.json({
        success: true,
        preferences: stored || null,
      });
    } catch {
      const stored = readAdminPreferencesFromDisk();
      return res.json({ success: true, preferences: stored || null });
    }
  });

  app.post('/api/admin/preferences', async (req, res) => {
    try {
      const body = req.body || {};
      const logoDarkUrl = typeof body.logoDarkUrl === 'string' ? body.logoDarkUrl.trim() : '';
      const logoLightUrl = typeof body.logoLightUrl === 'string' ? body.logoLightUrl.trim() : '';
      const mobileAppIconUrl = typeof body.mobileAppIconUrl === 'string' ? body.mobileAppIconUrl.trim() : '';
      const faviconUrl = typeof body.faviconUrl === 'string' ? body.faviconUrl.trim() : '';

      const urlFields = [logoDarkUrl, logoLightUrl, mobileAppIconUrl, faviconUrl];
      if (urlFields.some((u) => u && !isSafeMediaUrl(u))) {
        return res.status(400).json({
          success: false,
          error: 'Persistência de imagens Base64 proibida no v6.0. Faça upload binário via POST /api/media/upload.',
        });
      }

      const nowIso = new Date().toISOString();
      const savedPrefs = {
        logoDarkUrl,
        logoLightUrl,
        mobileAppIconUrl,
        faviconUrl,
        dark: body.dark || {},
        light: body.light || {},
        updatedAt: nowIso,
      };

      writeAdminPreferencesToDisk(savedPrefs);

      try {
        await supabaseAdmin
          .from('admin_preferences')
          .upsert(
            {
              id: 'global',
              logo_dark_url: logoDarkUrl || null,
              logo_light_url: logoLightUrl || null,
              mobile_app_icon_url: mobileAppIconUrl || null,
              favicon_url: faviconUrl || null,
              preferences: savedPrefs,
              updated_at: nowIso,
            },
            { onConflict: 'id' }
          );
      } catch (dbErr) {
        console.warn('[preferences] Aviso ao persistir admin_preferences no Supabase:', dbErr);
      }

      return res.json({
        success: true,
        preferences: savedPrefs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  const localAdmins: any[] = [];

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
      { data: profileRows },
      { data: professionals },
      { data: clients },
    ] = await Promise.all([
      supabaseAdmin.from('system_admins').select('id, full_name, username, email, phone_whatsapp, cpf'),
      supabaseAdmin.from('profiles').select('id, full_name, username, email, phone, cpf'),
      supabaseAdmin.from('professionals').select('id, full_name, email, phone, cpf, role'),
      supabaseAdmin.from('clients').select('id, full_name, email, phone, cpf'),
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
        name: r.full_name || r.username || 'Administrador',
        username: r.username || '',
        email: r.email || '',
        phone: r.phone_whatsapp || '',
        cpf: r.cpf || '',
      })),
      ...(profileRows || []).map((r: any) => ({
        roleLabel: 'Usuário',
        name: r.full_name || r.username || 'Usuário',
        username: r.username || '',
        email: r.email || '',
        phone: r.phone || '',
        cpf: r.cpf || '',
      })),
      ...(professionals || []).map((r: any) => ({
        roleLabel: String(r.role || '').toLowerCase().includes('propriet') ? 'Proprietário' : 'Profissional',
        name: r.full_name || r.name || r.username || 'Profissional',
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

  consolidateDuplicateUsersInSupabase();

  app.get('/api/admin/bootstrap/status', async (_req, res) => {
    try {
      const { count, error } = await supabaseAdmin
        .from('system_admins')
        .select('id', { count: 'exact', head: true });

      if (error) {
        return res.json({ success: true, needsBootstrap: false });
      }
      return res.json({ success: true, needsBootstrap: (count ?? 0) === 0 });
    } catch {
      return res.json({ success: true, needsBootstrap: false });
    }
  });

  app.post('/api/admin/bootstrap', async (req, res) => {
    try {
      const { count } = await supabaseAdmin
        .from('system_admins')
        .select('id', { count: 'exact', head: true });

      if ((count ?? 0) > 0) {
        return res.status(409).json({
          success: false,
          error: 'O Super Admin inicial já foi configurado. Faça login normalmente.',
        });
      }

      const { full_name, username, email, phone_whatsapp = '', password } = req.body || {};
      const cleanName = String(full_name || '').trim();
      const cleanUsername = String(username || '').replace(/^@+/, '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = String(phone_whatsapp || '').trim();
      const cleanPassword = String(password || '');

      if (!cleanName || !cleanUsername || !cleanEmail || cleanPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Preencha nome, usuário, e-mail e senha (mínimo 8 caracteres).',
        });
      }

      if (!/[A-Z]/.test(cleanUsername) || !/[a-z]/.test(cleanUsername) || !/[^A-Za-z0-9\s]/.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          error: 'O nome de usuário deve conter 1 letra maiúscula, 1 minúscula e 1 caractere especial.',
        });
      }

      let authUserId: string | null = null;
      if (SUPABASE_SERVICE_ROLE_KEY) {
        const { data: createdAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          app_metadata: { role: 'super_admin' },
          user_metadata: {
            full_name: cleanName,
            username: cleanUsername,
            phone: cleanPhone,
            created_via: 'admvapp',
          },
        });
        if (!authErr && createdAuth?.user?.id) {
          authUserId = createdAuth.user.id;
        } else {
          const { data: listed } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuth = (listed?.users || []).find(
            (u: any) => String(u.email || '').toLowerCase() === cleanEmail
          );
          if (existingAuth?.id) {
            authUserId = existingAuth.id;
            await supabaseAdmin.auth.admin.updateUserById(existingAuth.id, {
              password: cleanPassword,
              app_metadata: { role: 'super_admin' },
              user_metadata: { full_name: cleanName, username: cleanUsername, phone: cleanPhone },
            });
          }
        }
      }

      const { data: rpcAdminId, error: rpcErr } = await supabaseAdmin.rpc('bootstrap_initial_super_admin', {
        p_email: cleanEmail,
        p_full_name: cleanName,
        p_username: cleanUsername,
        p_password: cleanPassword,
        p_user_id: authUserId,
      });

      if (rpcErr) {
        return res.status(400).json({
          success: false,
          error: rpcErr.message || 'Falha ao executar bootstrap_initial_super_admin.',
        });
      }

      if (cleanPhone && rpcAdminId) {
        await supabaseAdmin
          .from('system_admins')
          .update({ phone_whatsapp: cleanPhone })
          .eq('id', rpcAdminId);
      }

      const { data: adminRow } = await supabaseAdmin
        .from('system_admins')
        .select('id, user_id, full_name, username, email, phone_whatsapp, role, access_level, is_active, avatar_url, created_at')
        .eq('email', cleanEmail)
        .maybeSingle();

      return res.json({
        success: true,
        admin: adminRow || {
          id: rpcAdminId || authUserId || crypto.randomUUID(),
          full_name: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          phone_whatsapp: cleanPhone,
          role: 'super_admin',
          is_active: true,
        },
        message: '1º Super Admin criado com sucesso!',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/auth/register', async (req, res) => {
    try {
      const { full_name, username, email, email_confirmation, phone_whatsapp, password, role: reqRole } = req.body;

      if (!full_name || !username || !email || !phone_whatsapp || !password) {
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
      }

      if (email.trim().toLowerCase() !== (email_confirmation || '').trim().toLowerCase()) {
        return res.status(400).json({ success: false, error: 'A confirmação de e-mail não confere.' });
      }

      const cleanUsername = username.replace(/^@+/, '').trim();
      const cleanEmail = email.trim().toLowerCase();
      const normalizedReqRole = String(reqRole || '').toLowerCase();
      const resolvedRole =
        normalizedReqRole === 'support'
          ? 'support'
          : normalizedReqRole === 'admin' || normalizedReqRole === 'moderator'
          ? 'admin'
          : 'super_admin';
      const resolvedAccessLevel = resolvedRole === 'super_admin' ? 100 : resolvedRole === 'admin' ? 70 : 40;

      const hasUppercase = /[A-Z]/.test(cleanUsername);
      const hasLowercase = /[a-z]/.test(cleanUsername);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUsername);

      if (!hasUppercase || !hasLowercase || !hasSpecialChar) {
        return res.status(400).json({
          success: false,
          error: 'O nome de usuário deve conter ao menos uma letra maiúscula, uma minúscula e um caractere especial (Ex: Anderson@, jOse#, pauLa**).',
        });
      }

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

      let authUserId: string | null = null;
      if (SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { data: authCreated } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
            app_metadata: { role: resolvedRole },
            user_metadata: {
              full_name: full_name.trim(),
              username: cleanUsername,
              phone: phone_whatsapp.trim(),
              created_via: 'admvapp',
            },
          });
          if (authCreated?.user?.id) authUserId = authCreated.user.id;
        } catch {}
      }

      try {
        const nowAdminIso = new Date().toISOString();
        const { data: dbAdmin, error: dbError } = await safeSupabaseWrite('system_admins', 'insert', {
          user_id: authUserId,
          full_name: full_name.trim(),
          username: cleanUsername,
          email: cleanEmail,
          phone_whatsapp: phone_whatsapp.trim(),
          password_hash: password,
          role: resolvedRole,
          access_level: resolvedAccessLevel,
          is_active: true,
          created_via: 'admvapp',
          created_at: nowAdminIso,
          updated_at: nowAdminIso,
        });

        if (!dbError && dbAdmin) {
          await consolidateDuplicateUsersInSupabase();
          const { password_hash, ...safeAdmin } = dbAdmin;
          return res.json({
            success: true,
            admin: safeAdmin,
            message: 'Administrador cadastrado com sucesso!',
          });
        }
      } catch {}

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
        password,
        role: resolvedRole,
        access_level: resolvedAccessLevel,
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

  app.post('/api/admin/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'Informe o Nome de Usuário / E-mail e a Senha.' });
      }

      const rawIdentifier = String(identifier).trim();
      const query = rawIdentifier.toLowerCase();
      const strippedQuery = query.replace(/^@+/, '');

      try {
        const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc('verify_admin_login', {
          p_identifier: strippedQuery,
          p_password: String(password),
        });

        if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
          const verified = rpcRows[0];
          try {
            await supabaseAdmin
              .from('system_admins')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', verified.id);
          } catch {}

          const { data: fullAdmin } = await supabaseAdmin
            .from('system_admins')
            .select('id, user_id, full_name, username, email, phone_whatsapp, role, access_level, is_active, avatar_url, last_login_at, created_at')
            .eq('id', verified.id)
            .maybeSingle();

          return res.json({
            success: true,
            admin: fullAdmin || {
              id: verified.id,
              user_id: verified.user_id,
              full_name: verified.full_name,
              username: verified.username,
              email: verified.email,
              role: verified.role || 'super_admin',
              access_level: verified.access_level ?? 100,
              avatar_url: verified.avatar_url || '',
              is_active: true,
            },
          });
        }
      } catch (rpcCatch) {
        console.warn('[login] verify_admin_login RPC notice:', rpcCatch);
      }

      try {
        const { data: admins, error: dbError } = await supabaseAdmin
          .from('system_admins')
          .select('*')
          .or(`email.ilike.${query},username.ilike.${strippedQuery}`)
          .limit(1);

        if (!dbError && admins && admins.length > 0) {
          const admin = admins[0];
          if (!admin.is_active) {
            return res.status(403).json({ success: false, error: 'Conta de administrador inativa ou suspensa.' });
          }
          if (admin.password_hash && !String(admin.password_hash).startsWith('$2') && admin.password_hash === password) {
            try {
              await supabaseAdmin
                .from('system_admins')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', admin.id);
            } catch {}
            const { password_hash, ...safeAdmin } = admin;
            return res.json({ success: true, admin: safeAdmin });
          }
          return res.status(401).json({ success: false, error: 'Senha incorreta.' });
        }
      } catch (dbErr) {
        console.warn('[login] Erro na consulta ao banco:', dbErr);
      }

      const match = localAdmins.find(
        (a) => a.username.toLowerCase() === query || a.email.toLowerCase() === query
      );

      if (match) {
        if (match.password && match.password === password) {
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

  app.post('/api/admin/auth/recovery', async (req, res) => {
    try {
      const { type, query, new_password } = req.body;
      if (!query || !query.trim()) {
        return res.status(400).json({ success: false, error: 'Informe seu usuário, e-mail ou telefone para recuperação.' });
      }

      const cleanQuery = query.trim().toLowerCase();

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

      if (!matchedAdmin) {
        matchedAdmin = localAdmins.find(
          (a) =>
            a.username.toLowerCase().includes(cleanQuery) ||
            a.email.toLowerCase().includes(cleanQuery) ||
            (a.phone_whatsapp && a.phone_whatsapp.includes(cleanQuery))
        );
      }

      if (type === 'access_data') {

        if (matchedAdmin) {
          const maskedEmail = matchedAdmin.email
            ? matchedAdmin.email.replace(/^(.)(.*)(@.*)$/, (_, a, _b, c) => a + '***' + c)
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

        if (!matchedAdmin) {
          return res.status(404).json({
            success: false,
            error: `Nenhum administrador encontrado com o identificador "${query}". Verifique se digitou corretamente o usuário (ex: Anderson@) ou e-mail corporativo.`,
          });
        }

        if (new_password) {
          if (typeof new_password !== 'string' || new_password.length < 6) {
            return res.status(400).json({
              success: false,
              error: 'A nova senha deve ter no mínimo 6 caracteres.',
            });
          }

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

  app.get('/api/admin/system-admins', async (req, res) => {
    try {
      await consolidateDuplicateUsersInSupabase();
      const db = getAdminDbClient(req);
      const { data, error } = await db
        .from('system_admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      const adminsWithPassword = (data || []).map((a: any) => ({
        ...a,
        password: a.password_hash || a.password || '',
      }));

      return res.json({ success: true, admins: adminsWithPassword });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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
        password: data.password_hash || payload.password || '',
      };

      notifyAdminsOnEvent({
        eventType: 'admin_updated',
        title: 'Admin-Vapp • Admin Alterado',
        body: `Os dados de ${data.full_name || data.username || 'Administrador'} foram atualizados.`,
        url: '/?screen=users',
        payload: { table: 'system_admins', id: data.id },
        dedupeKey: `admin_update_${data.id}`,
      }).catch(() => {});

      return res.json({ success: true, admin: adminWithPassword });
    } catch (err: any) {
      console.error('[server] Exceção em PUT /api/admin/system-admins/:id:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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

  app.put('/api/admin/users/:kind/:id', async (req, res) => {
    try {
      const { kind, id } = req.params;
      const body = req.body || {};
      const referer = String(req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/');

      const resolveTableByKind = (k: string) => {
        if (k === 'professional') return 'professionals';
        if (k === 'salon_user') return 'salon_members';
        if (k === 'admin') return 'system_admins';
        if (k === 'dependent') return 'dependents';
        return 'clients';
      };

      const sourceKind = String(body.sourceKind || kind);
      const targetKind = String(body.targetKind || kind);
      let sourceTable = resolveTableByKind(sourceKind);
      const targetTable = resolveTableByKind(targetKind);

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

      let existingRecord: any = null;
      const candidateTables = Array.from(
        new Set([sourceTable, targetTable, 'clients', 'system_admins', 'professionals', 'salon_members'])
      );
      for (const tbl of candidateTables) {
        try {
          const { data: found } = await supabaseAdmin.from(tbl).select('*').eq('id', id).maybeSingle();
          if (found) {
            existingRecord = found;
            sourceTable = tbl;
            break;
          }
        } catch {}
      }

      const resolvedName =
        body.name !== undefined
          ? String(body.name).trim()
          : existingRecord?.full_name || existingRecord?.name || 'Usuário';
      const resolvedUsername =
        body.username !== undefined
          ? String(body.username).trim().replace(/^@+/, '')
          : (existingRecord?.username || '').replace(/^@+/, '');
      const resolvedEmail =
        body.email !== undefined && body.email !== '—'
          ? String(body.email).trim().toLowerCase()
          : existingRecord?.email || '';
      const resolvedPhone =
        body.phone !== undefined && body.phone !== '—'
          ? String(body.phone).trim()
          : existingRecord?.phone_whatsapp || existingRecord?.phone || '';
      const resolvedCpf =
        body.cpf !== undefined ? String(body.cpf).trim() : existingRecord?.cpf || '';
      const resolvedPassword =
        body.password !== undefined && String(body.password).trim() !== '' && body.password !== '—'
          ? String(body.password).trim()
          : existingRecord?.password_hash || existingRecord?.password || '';

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (targetTable === 'clients') {
        updatePayload.full_name = resolvedName;
        updatePayload.phone = resolvedPhone || null;
        if (resolvedEmail) updatePayload.email = resolvedEmail;
        if (resolvedCpf !== undefined) updatePayload.cpf = resolvedCpf || null;
      } else if (targetTable === 'professionals') {
        updatePayload.full_name = resolvedName;
        updatePayload.phone = resolvedPhone || null;
        if (resolvedEmail) updatePayload.email = resolvedEmail;
        if (resolvedCpf !== undefined) updatePayload.cpf = resolvedCpf || null;
      } else {
        updatePayload.full_name = resolvedName;
        updatePayload.phone_whatsapp = resolvedPhone || null;
        if (resolvedUsername) updatePayload.username = resolvedUsername;
        if (resolvedEmail) updatePayload.email = resolvedEmail;
        if (resolvedCpf !== undefined) updatePayload.cpf = resolvedCpf || null;
        if (resolvedPassword) updatePayload.password_hash = resolvedPassword;
      }

      const resolvedAccessLevel =
        body.accessLevel ||
        existingRecord?.access_level ||
        (targetTable === 'system_admins'
          ? 100
          : targetTable === 'professionals'
          ? 'professional'
          : targetTable === 'salon_members'
          ? 'owner'
          : 'client');

      if (targetTable === 'system_admins') {
        const lower = String(resolvedAccessLevel).toLowerCase();
        if (lower.includes('super') || resolvedAccessLevel === 100) {
          updatePayload.role = 'super_admin';
          updatePayload.access_level = 100;
        } else if (lower.includes('moder') || lower.includes('admin') || resolvedAccessLevel === 70) {
          updatePayload.role = 'admin';
          updatePayload.access_level = 70;
        } else {
          updatePayload.role = 'support';
          updatePayload.access_level = 40;
        }
      } else if (targetTable === 'professionals') {
        updatePayload.role = existingRecord?.role || 'Especialista';
        updatePayload.access_level = normalizeV6ProfAccessLevel(resolvedAccessLevel);
      } else if (targetTable === 'salon_members') {
        updatePayload.role = existingRecord?.role || 'owner';
      }

      if (targetTable === 'clients' || targetTable === 'professionals') {
        updatePayload.address = body.address !== undefined ? body.address : existingRecord?.address || null;
        updatePayload.street_number =
          streetNumberVal !== undefined ? streetNumberVal : existingRecord?.street_number || null;
        updatePayload.complement =
          body.complement !== undefined ? body.complement : existingRecord?.complement || null;
        updatePayload.neighborhood =
          body.neighborhood !== undefined ? body.neighborhood : existingRecord?.neighborhood || null;
        updatePayload.city = body.city !== undefined ? body.city : existingRecord?.city || 'São Paulo';
        updatePayload.state = body.state !== undefined ? body.state : existingRecord?.state || 'SP';
        updatePayload.cep = body.cep !== undefined ? body.cep : existingRecord?.cep || null;

        if (resolvedGeo.latitude !== null && Number.isFinite(resolvedGeo.latitude)) {
          updatePayload.latitude = resolvedGeo.latitude;
        } else if (existingRecord?.latitude !== undefined && existingRecord?.latitude !== null) {
          updatePayload.latitude = existingRecord.latitude;
        }
        if (resolvedGeo.longitude !== null && Number.isFinite(resolvedGeo.longitude)) {
          updatePayload.longitude = resolvedGeo.longitude;
        } else if (existingRecord?.longitude !== undefined && existingRecord?.longitude !== null) {
          updatePayload.longitude = existingRecord.longitude;
        }
        if (targetTable === 'clients') {
          if (resolvedGeo.formatted_address) {
            updatePayload.formatted_address = resolvedGeo.formatted_address;
          }
          if (resolvedGeo.google_place_id) {
            updatePayload.google_place_id = resolvedGeo.google_place_id;
          }
        }
      }

      const resolvedIsActive =
        body.isActive !== undefined ? !!body.isActive : existingRecord?.is_active !== false;
      updatePayload.is_active = resolvedIsActive;

      const profileSyncId =
        existingRecord?.user_id ||
        (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null);
      if (profileSyncId && (resolvedUsername || resolvedName || resolvedPhone || resolvedEmail)) {
        try {
          await safeSupabaseWrite(
            'profiles',
            'update',
            {
              full_name: resolvedName,
              ...(resolvedUsername ? { username: resolvedUsername } : {}),
              ...(resolvedEmail ? { email: resolvedEmail } : {}),
              ...(resolvedPhone ? { phone: resolvedPhone } : {}),
              ...(resolvedCpf ? { cpf: resolvedCpf } : {}),
              is_active: resolvedIsActive,
              updated_at: new Date().toISOString(),
            },
            { eqCol: 'id', eqVal: profileSyncId }
          );
        } catch {}
      }

      if (body.avatarUrl !== undefined || body.avatar_url !== undefined) {
        const rawAv = body.avatarUrl !== undefined ? body.avatarUrl : body.avatar_url;
        let resolvedAvatar = rawAv && typeof rawAv === 'string' ? rawAv.trim() : null;
        if (resolvedAvatar && resolvedAvatar.startsWith('data:image/')) {
          resolvedAvatar = await uploadBase64MediaIfNeeded(resolvedAvatar, `avatar-${id}`, 'avatars');
        }
        updatePayload.avatar_url = resolvedAvatar;
      } else if (existingRecord?.avatar_url) {
        updatePayload.avatar_url = existingRecord.avatar_url;
      }

      if (existingRecord?.total_appointments !== undefined) {
        updatePayload.total_appointments = Number(existingRecord.total_appointments) || 0;
      }
      if (existingRecord?.dependents_count !== undefined) {
        updatePayload.dependents_count = Number(existingRecord.dependents_count) || 0;
      }

      let data: any = null;
      let error: any = null;

      if (sourceTable !== targetTable) {
        const upsertPayload: Record<string, any> = {
          id,
          ...updatePayload,
          created_at: existingRecord?.created_at || new Date().toISOString(),
          created_via: existingRecord?.created_via || existingRecord?.origin_type || 'admvapp',
        };
        const writeRes = await safeSupabaseWrite(targetTable, 'upsert', upsertPayload, {
          onConflict: 'id',
        });
        data = writeRes.data;
        error = writeRes.error;

        if (!error) {

          try {
            if (sourceTable === 'clients') {
              await supabaseAdmin.from('appointments').update({ client_id: null }).eq('client_id', id);
              await supabaseAdmin.from('user_security_answers').delete().eq('client_id', String(id));
              await supabaseAdmin.from('dependents').delete().eq('parent_client_id', id);
            } else if (sourceTable === 'professionals') {
              await supabaseAdmin.from('appointments').update({ professional_id: null }).eq('professional_id', id);
            }
            await supabaseAdmin.from(sourceTable).delete().eq('id', id);
          } catch (cleanupErr) {
            console.warn(`[PUT /api/admin/users] Aviso ao limpar tabela antiga (${sourceTable}):`, cleanupErr);
          }
        }
      } else {
        const writeRes = await safeSupabaseWrite(targetTable, 'update', updatePayload, {
          eqCol: 'id',
          eqVal: id,
        });
        data = writeRes.data;
        error = writeRes.error;

        if (!error && !data) {
          const upsertRes = await safeSupabaseWrite(
            targetTable,
            'upsert',
            { id, ...updatePayload, created_at: new Date().toISOString() },
            { onConflict: 'id' }
          );
          data = upsertRes.data;
          error = upsertRes.error;
        }
      }

      if (error) {
        console.error(`[PUT /api/admin/users/${kind}/${id}] Supabase error:`, error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      if (resolvedPassword && resolvedPassword.length >= 4) {
        try {
          let authTargetId =
            existingRecord?.user_id ||
            existingRecord?.auth_user_id ||
            (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : '');
          if (authTargetId) {
            const { error: authUpdErr } = await supabaseAdmin.auth.admin.updateUserById(authTargetId, {
              password: resolvedPassword,
              ...(resolvedEmail ? { email: resolvedEmail, email_confirm: true } : {}),
            });
            if (authUpdErr && resolvedEmail) {
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const matchedAuth = (listData?.users || []).find(
                (u: any) => u.email?.toLowerCase() === resolvedEmail.toLowerCase()
              );
              if (matchedAuth?.id) {
                await supabaseAdmin.auth.admin.updateUserById(matchedAuth.id, {
                  password: resolvedPassword,
                });
              }
            }
          }
        } catch (authSyncErr) {
          console.warn('[PUT /api/admin/users] Aviso sync senha no Auth:', authSyncErr);
        }
      }

      if (updatePayload.avatar_url !== undefined) {
        try {
          const profId = (data as any)?.user_id || id;
          if (profId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profId)) {
            await safeSupabaseWrite(
              'profiles',
              'update',
              {
                avatar_url: updatePayload.avatar_url,
                updated_at: new Date().toISOString(),
              },
              { eqCol: 'id', eqVal: profId }
            );
          }
        } catch {}
      }

      if (hasAddressFields) {
        await syncAddressAndCoordsAcrossCpfTables({
          cpf: resolvedCpf || data?.cpf,
          email: resolvedEmail || data?.email,
          userId: id,
          salonId: data?.salon_id || data?.origin_salon_id,
          cep: updatePayload.cep,
          address: updatePayload.address,
          street_number: updatePayload.street_number,
          complement: updatePayload.complement,
          neighborhood: updatePayload.neighborhood,
          city: updatePayload.city,
          state: updatePayload.state,
          latitude: resolvedGeo.latitude,
          longitude: resolvedGeo.longitude,
          formatted_address: resolvedGeo.formatted_address,
          google_place_id: resolvedGeo.google_place_id,
          syncSalons: targetKind === 'salon_user',
        });
      }

      notifyAdminsOnEvent({
        eventType: 'user_updated',
        title: 'Admin-Vapp • Cadastro Alterado',
        body: `O cadastro de ${updatePayload.full_name || data?.full_name || data?.email || 'usuário'} foi atualizado.`,
        url: '/?screen=users',
        payload: { kind: targetKind, id },
        dedupeKey: `client_update_${id}`,
      }).catch(() => {});

      return res.json({
        success: true,
        migratedFrom: sourceTable !== targetTable ? sourceKind : undefined,
        migratedTo: sourceTable !== targetTable ? targetKind : undefined,
        user: {
          ...(data || { id, ...updatePayload }),
          kind: targetKind,
          password: resolvedPassword,
          street_number: updatePayload.street_number,
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
          const { data: member } = await supabaseAdmin.from('salon_members').select('id, user_id, salon_id').eq('id', cleanId).maybeSingle();
          if (member?.user_id) authTargetId = member.user_id;
          const { data: sal } = await supabaseAdmin.from('salons').select('id, owner_id, email').eq('id', member?.salon_id || cleanId).maybeSingle();
          if (!authTargetId && sal?.owner_id) authTargetId = sal.owner_id;
          targetEmail = String(sal?.email || '').toLowerCase();
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

      if (userId && kind) {
        let table = 'clients';
        if (kind === 'professional') table = 'professionals';
        else if (kind === 'salon_user') table = 'profiles';
        else if (kind === 'admin') table = 'system_admins';

        const updateData: Record<string, any> = {
          avatar_url: uploadedUrl,
          updated_at: new Date().toISOString(),
        };

        await safeSupabaseWrite(table, 'update', updateData, { eqCol: 'id', eqVal: userId });

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

  app.get('/api/admin/clients', async (req, res) => {
    try {
      await consolidateDuplicateUsersInSupabase();
      const db = getAdminDbClient(req);

      const [{ data, error }, { data: sysAdmins }, { data: profileRows }] = await Promise.all([
        db.from('clients').select('*').order('created_at', { ascending: false }),
        db.from('system_admins').select('id, email, username, cpf'),
        db.from('profiles').select('id, username, email'),
      ]);

      const profileUsernameById = new Map<string, string>();
      const profileUsernameByEmail = new Map<string, string>();
      (profileRows || []).forEach((pr: any) => {
        if (pr?.username) {
          if (pr.id) profileUsernameById.set(String(pr.id), String(pr.username).trim());
          if (pr.email) profileUsernameByEmail.set(normalizeEmailKey(pr.email), String(pr.username).trim());
        }
      });

      if (error) {
        console.warn('[GET /api/admin/clients] Supabase error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      const adminEmails = new Set((sysAdmins || []).map((a: any) => normalizeEmailKey(a.email)).filter(Boolean));
      const adminUsers = new Set((sysAdmins || []).map((a: any) => normalizeUsernameKey(a.username)).filter(Boolean));
      const adminCpfs = new Set((sysAdmins || []).map((a: any) => normalizeCpfKey(a.cpf)).filter(Boolean));

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

          const resolvedProfileUsername =
            (c.user_id && profileUsernameById.get(String(c.user_id))) ||
            profileUsernameById.get(String(c.id)) ||
            (c.email && profileUsernameByEmail.get(normalizeEmailKey(c.email))) ||
            '';

          return {
            ...c,
            full_name: c.full_name || c.name || 'Cliente',
            username: (
              c.username ||
              resolvedProfileUsername ||
              (c.email ? c.email.split('@')[0] : (c.full_name || c.name || 'cliente').toLowerCase().replace(/\s+/g, ''))
            ).replace(/^@+/, ''),
            phone: c.phone || c.phone_whatsapp || '—',
            phone_secondary: c.phone_secondary || '',
            password: c.password_hash || c.password || '',
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

  app.get('/api/admin/professionals', async (_req, res) => {
    try {
      const [{ data, error }, { data: profileRows }] = await Promise.all([
        supabaseAdmin
          .from('professionals')
          .select('*, salons(trade_name, slug)')
          .order('created_at', { ascending: false }),
        supabaseAdmin.from('profiles').select('id, username, email'),
      ]);

      if (error) {
        console.warn('[GET /api/admin/professionals] Supabase error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      const profUsernameById = new Map<string, string>();
      const profUsernameByEmail = new Map<string, string>();
      (profileRows || []).forEach((pr: any) => {
        if (pr?.username) {
          if (pr.id) profUsernameById.set(String(pr.id), String(pr.username).trim());
          if (pr.email) profUsernameByEmail.set(normalizeEmailKey(pr.email), String(pr.username).trim());
        }
      });

      const professionals = (data || []).map((p: any) => {
        const resolvedUsername =
          p.username ||
          (p.user_id && profUsernameById.get(String(p.user_id))) ||
          (p.email && profUsernameByEmail.get(normalizeEmailKey(p.email))) ||
          (p.email ? p.email.split('@')[0] : (p.full_name || p.name || 'prof').toLowerCase().replace(/\s+/g, ''));

        return {
          ...p,
          full_name: p.full_name || p.name || 'Profissional',
          username: String(resolvedUsername || 'prof').replace(/^@+/, ''),
          phone_whatsapp: p.phone || p.phone_whatsapp || '—',
          phone_secondary: p.phone_secondary || '',
          password: p.password_hash || p.password || '',
          current_salon_name: p.salons?.trade_name || p.current_salon_name || 'Sem Salão Ativo',
          current_salon_slug: p.salons?.slug || p.current_salon_slug || '',
          status: p.status || (p.is_active === false ? 'suspended' : 'active'),
          access_level: p.access_level || 'professional',
        };
      });

      return res.json({ success: true, professionals });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/admin/salon-users', async (_req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('salon_members')
        .select('*, salons(trade_name, slug), profiles:user_id(full_name, username, email, phone, cpf, avatar_url, created_via)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GET /api/admin/salon-users] Supabase notice:', error.message);
        return res.json({ success: true, salonUsers: [] });
      }

      const salonUsers = (data || []).map((su: any) => {
        const profile = su.profiles || {};
        const fullName = profile.full_name || 'Gestor de Salão';
        const cleanEmail = profile.email || '';
        const rawUsername = profile.username || (cleanEmail ? cleanEmail.split('@')[0] : fullName.toLowerCase().replace(/\s+/g, ''));
        return {
          ...su,
          salon_name: su.salons?.trade_name || 'Salão Parceiro',
          salon_slug: su.salons?.slug || 'parceiro',
          full_name: fullName,
          username: String(rawUsername || 'gestor').replace(/^@+/, ''),
          email: cleanEmail,
          phone_whatsapp: profile.phone || '—',
          phone_secondary: '',
          password: '',
          cpf: profile.cpf || '',
          avatar_url: profile.avatar_url || '',
          role: su.role || 'owner',
          access_level:
            su.role === 'owner'
              ? 'Proprietário (Dono)'
              : su.role === 'manager'
              ? 'Gerente Geral'
              : 'Recepção & Atendimento',
          is_active: su.is_active !== false,
          can_manage_financial: su.role === 'owner' || su.role === 'manager',
          can_manage_professionals: su.role === 'owner' || su.role === 'manager',
          total_appointments: 0,
          dependents_count: 0,
          created_via: profile.created_via || 'mnvapp',
          created_at: su.created_at || '',
        };
      });

      return res.json({ success: true, salonUsers });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/admin/users/:kind/:id', async (req, res) => {
    try {
      const { kind, id } = req.params;
      if (!kind || !id) {
        return res.status(400).json({ success: false, error: 'Kind e ID são obrigatórios.' });
      }

      if (kind === 'client') {
        const { data: clientSnapshot } = await supabaseAdmin
          .from('clients')
          .select('id, user_id, email')
          .eq('id', id)
          .maybeSingle();

        try {
          await supabaseAdmin.from('dependents').delete().eq('parent_client_id', id);
          await supabaseAdmin.from('salon_clients').delete().eq('client_id', id);
          await supabaseAdmin.from('user_security_answers').delete().eq('client_id', String(id));
        } catch (depErr) {
          console.warn('[DELETE /api/admin/users/client] Aviso dependentes:', depErr);
        }

        try {
          await supabaseAdmin.from('appointments').update({ client_id: null }).eq('client_id', id);
        } catch {}

        const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }

        const linkedUserId = clientSnapshot?.user_id || id;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(linkedUserId))) {
          try {
            await supabaseAdmin.from('profiles').delete().eq('id', linkedUserId);
            await supabaseAdmin.auth.admin.deleteUser(String(linkedUserId));
          } catch {}
        } else if (clientSnapshot?.email) {
          try {
            await supabaseAdmin.from('profiles').delete().ilike('email', clientSnapshot.email);
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
          await supabaseAdmin.from('salon_members').delete().eq('id', cleanId);
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
        const { data: clientsToPurge } = await supabaseAdmin
          .from('clients')
          .select('id, user_id')
          .in('id', clientIds);
        try {
          await supabaseAdmin.from('dependents').delete().in('parent_client_id', clientIds);
          await supabaseAdmin.from('salon_clients').delete().in('client_id', clientIds);
          await supabaseAdmin.from('appointments').update({ client_id: null }).in('client_id', clientIds);
        } catch {}
        await supabaseAdmin.from('clients').delete().in('id', clientIds);
        const linkedAuthIds = (clientsToPurge || [])
          .map((c: any) => c.user_id)
          .filter((uid: any) => typeof uid === 'string' && uid.length > 0);
        if (linkedAuthIds.length > 0) {
          try {
            await supabaseAdmin.from('profiles').delete().in('id', linkedAuthIds);
            for (const uid of linkedAuthIds) {
              await supabaseAdmin.auth.admin.deleteUser(uid);
            }
          } catch {}
        }
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
          await supabaseAdmin.from('salon_members').delete().in('id', salonUserIds);
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

  app.patch('/api/admin/users/:kind/:id/status', async (req, res) => {
    try {
      const { kind, id } = req.params;
      const { is_active } = req.body;
      const activeBool = is_active !== false;

      if (kind === 'client') {
        await supabaseAdmin.from('clients').update({ is_active: activeBool }).eq('id', id);
      } else if (kind === 'professional') {
        await supabaseAdmin.from('professionals').update({ is_active: activeBool }).eq('id', id);
      } else if (kind === 'salon_user') {
        const cleanId = id.replace(/^su-/, '');
        await supabaseAdmin.from('salon_members').update({ is_active: activeBool }).eq('id', cleanId);
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

  app.get('/api/admin/salons', async (_req, res) => {
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

  app.get('/api/public/salons', async (_req, res) => {
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

  app.get('/api/public/services', async (_req, res) => {
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

  app.options('/api/admin/salons', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  });

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

      const { data: existingSlugSalon } = await supabaseAdmin
        .from('salons')
        .select('id, email, trade_name')
        .ilike('slug', cleanSlug)
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
      const resolvedSlogan = payload.slogan?.trim() || null;
      const resolvedBrandFont = payload.brand_font?.trim() || 'Poppins';
      const resolvedStatus = normalizeV6SalonStatus(payload.status);

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
      const resolvedWhatsapp = String(payload.whatsapp || payload.phone_whatsapp || payload.phone || '').trim() || null;
      const resolvedPhone = String(payload.phone_landline || payload.phone || resolvedWhatsapp || '').trim() || null;
      const resolvedOwnerCpf = String(payload.owner_cpf || payload.responsibleCpf || '').trim() || null;
      const resolvedCnpj =
        String(payload.cnpj || (payload.document_type !== 'CPF' ? payload.document_number : '') || '').trim() || null;
      const resolvedFee = Number.isFinite(Number(payload.fee_per_booking ?? payload.billing_fee_value))
        ? Number(payload.fee_per_booking ?? payload.billing_fee_value ?? 2.5)
        : 2.5;
      const resolvedBillingPlan = normalizeV6BillingPlan(payload.billing_plan);
      const resolvedMonthlyFee = Number.isFinite(Number(payload.monthly_subscription_fee))
        ? Number(payload.monthly_subscription_fee ?? 89.9)
        : 89.9;
      const resolvedDueDay = clampBillingDueDay(payload.billing_due_day);
      const resolvedPrimaryColor = payload.primary_color || '#10B981';
      const resolvedSecondaryColor = payload.secondary_color || '#065F46';
      const resolvedDefaultTheme: 'light' | 'dark' =
        String(payload.default_theme || 'light').toLowerCase() === 'dark' ? 'dark' : 'light';
      const resolvedHomeDelivery =
        payload.home_delivery_enabled === true ||
        payload.operating_model === 'delivery' ||
        payload.operating_model === 'home_only' ||
        payload.operating_model === 'hybrid';

      const nowIso = new Date().toISOString();
      const resolvedCreatedVia = normalizeV6CreatedVia(payload.created_via || 'admvapp');

      const dbInsert: Record<string, any> = {
        trade_name: resolvedTradeName,
        legal_name: payload.legal_name?.trim() || resolvedTradeName,
        slug: cleanSlug,
        cnpj: resolvedCnpj,
        owner_cpf: resolvedOwnerCpf,
        category: payload.category || 'Barbearia',
        description: payload.description?.trim() || null,
        slogan: resolvedSlogan,
        phone: resolvedPhone,
        whatsapp: resolvedWhatsapp,
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
        home_delivery_enabled: resolvedHomeDelivery,
        pix_key: payload.pix_key?.trim() || null,
        pix_keys: Array.isArray(payload.pix_keys) ? payload.pix_keys : [],
        billing_plan: resolvedBillingPlan,
        fee_per_booking: resolvedFee,
        monthly_subscription_fee: resolvedMonthlyFee,
        billing_due_day: resolvedDueDay,
        status: resolvedStatus,
        is_active: resolvedStatus === 'active',
        created_via: resolvedCreatedVia,
        ...(existingSlugSalon ? {} : { created_at: nowIso }),
        updated_at: nowIso,
      };

      const { data, error } = existingSlugSalon?.id
        ? await safeSupabaseWrite('salons', 'update', dbInsert, { eqCol: 'id', eqVal: existingSlugSalon.id })
        : await safeSupabaseWrite('salons', 'insert', dbInsert);

      if (error) {
        console.error('[POST /api/admin/salons Supabase Error]:', error);
        return res.status(400).json({ success: false, error: `Erro no banco: ${error.message}` });
      }

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
              brand_font: resolvedBrandFont,
              pwa_name: resolvedTradeName,
              section_header_bg_color: payload.section_header_bg_color || '#ECFDF5',
              section_header_text_color: payload.section_header_text_color || '#065F46',
              section_header_icon_color: payload.section_header_icon_color || '#059669',
              section_header_bg_style: payload.section_header_bg_style || 'solid',
              nav_bg_style: payload.nav_bg_style || 'solid',
              nav_bg_color: payload.nav_bg_color || '#D1FAE5',
              nav_icon_border: toUiBool(payload.nav_icon_border, false),
              nav_active_color: payload.nav_active_color || '#10B981',
              updated_at: nowIso,
            },
            { onConflict: 'salon_id' }
          );
        } catch (uiSyncErr) {
          console.warn('[POST /api/admin/salons] Aviso ao criar salon_ui_settings:', uiSyncErr);
        }
      }

      if (data?.id && (payload.email || payload.owner_name || payload.legal_name)) {
        try {
          const ownerName = (payload.owner_name || payload.legal_name || payload.trade_name || 'Proprietário').trim();
          const ownerEmail = (payload.email || `${cleanSlug}@vagouapp.com`).trim().toLowerCase();
          const ownerPhone = resolvedWhatsapp || '';
          const ownerUsername = ownerEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || cleanSlug;

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

          const { data: existingAdmin } = await supabaseAdmin
            .from('system_admins')
            .select('id, email, password_hash')
            .ilike('email', ownerEmail)
            .maybeSingle();

          let existingClientRow: any = null;
          if (!existingAdmin) {
            const { data: existingClient } = await supabaseAdmin
              .from('clients')
              .select('id, user_id')
              .ilike('email', ownerEmail)
              .maybeSingle();
            existingClientRow = existingClient;
          }

          if (!verifiedAuthUserId && ownerEmail.includes('@')) {
            const candidatePassword = existingAdmin?.password_hash || crypto.randomUUID();
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
                    created_via: resolvedCreatedVia,
                  },
                });
              if (!createAuthErr && createdAuth?.user?.id) {
                verifiedAuthUserId = createdAuth.user.id;
              }
            } catch {}
          }

          if (verifiedAuthUserId) {
            await safeSupabaseWrite(
              'profiles',
              'upsert',
              {
                id: verifiedAuthUserId,
                full_name: ownerName,
                username: ownerUsername,
                email: ownerEmail,
                phone: ownerPhone || null,
                cpf: resolvedOwnerCpf,
                role: existingAdmin ? 'super_admin' : 'salon_owner',
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
                google_place_id: resolvedGeo.google_place_id,
                is_active: true,
                created_via: resolvedCreatedVia,
                updated_at: nowIso,
              },
              { onConflict: 'id' }
            );
          }

          if (!existingAdmin) {
            const ownerClientData: Record<string, any> = {
              full_name: ownerName,
              email: ownerEmail,
              phone: ownerPhone || null,
              cpf: resolvedOwnerCpf,
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
              google_place_id: resolvedGeo.google_place_id,
              is_active: true,
              created_via: resolvedCreatedVia,
              updated_at: nowIso,
            };

            if (verifiedAuthUserId) {
              await safeSupabaseWrite(
                'clients',
                'upsert',
                { user_id: verifiedAuthUserId, ...ownerClientData },
                { onConflict: 'user_id' }
              );
            } else if (existingClientRow?.id) {
              await safeSupabaseWrite('clients', 'update', ownerClientData, {
                eqCol: 'id',
                eqVal: existingClientRow.id,
              });
            } else {
              await safeSupabaseWrite('clients', 'insert', ownerClientData);
            }
          }

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
              full_name: ownerName,
              role: 'Proprietário',
              access_level: 'admin',
              phone: ownerPhone || null,
              email: ownerEmail,
              cpf: resolvedOwnerCpf,
              is_active: true,
              cep: dbInsert.cep,
              address: dbInsert.address,
              street_number: dbInsert.street_number,
              complement: dbInsert.complement,
              neighborhood: dbInsert.neighborhood,
              city: dbInsert.city,
              state: dbInsert.state,
              latitude: resolvedGeo.latitude,
              longitude: resolvedGeo.longitude,
              created_via: resolvedCreatedVia,
              updated_at: nowIso,
            });
          }

          if (verifiedAuthUserId) {
            await safeSupabaseWrite(
              'salons',
              'update',
              { owner_id: verifiedAuthUserId },
              { eqCol: 'id', eqVal: data.id }
            );

            await safeSupabaseWrite(
              'salon_members',
              'upsert',
              {
                salon_id: data.id,
                user_id: verifiedAuthUserId,
                role: 'owner',
                is_active: true,
                created_via: resolvedCreatedVia,
                updated_at: nowIso,
              },
              { onConflict: 'salon_id,user_id' }
            );
          }
        } catch (ownerSyncErr) {
          console.warn('[POST /api/admin/salons] Aviso ao sincronizar proprietário:', ownerSyncErr);
        }
      }

      notifyAdminsOnEvent({
        eventType: 'salon_created',
        title: 'Admin-Vapp • Novo Estabelecimento',
        body: `${data?.trade_name || resolvedTradeName} foi cadastrado.`,
        url: '/?screen=salons',
        payload: { table: 'salons', id: data?.id },
        dedupeKey: `salon_insert_${data?.id || cleanSlug}`,
      }).catch(() => {});

      return res.json({
        success: true,
        salon: {
          ...data,
          phone_whatsapp: data?.whatsapp || data?.phone || resolvedWhatsapp || '',
          billing_fee_value: Number(data?.fee_per_booking ?? resolvedFee),
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

  app.patch('/api/admin/salons/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const incoming = { ...req.body };
      const referer = String(req.headers.referer || process.env.APP_URL || 'https://adm.vagouapp.com/');

      const { data: currentSalon } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('id', id)
        .maybeSingle();

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

      const addressChanged =
        (incoming.cep !== undefined && incoming.cep !== currentSalon?.cep) ||
        (incoming.address !== undefined && incoming.address !== currentSalon?.address) ||
        (effectiveStreetNumber !== undefined && effectiveStreetNumber !== currentSalon?.street_number) ||
        (incoming.city !== undefined && incoming.city !== currentSalon?.city);

      let resolvedGeo = {
        latitude:
          incoming.latitude !== undefined && incoming.latitude !== null
            ? Number(incoming.latitude)
            : (currentSalon?.latitude ?? null),
        longitude:
          incoming.longitude !== undefined && incoming.longitude !== null
            ? Number(incoming.longitude)
            : (currentSalon?.longitude ?? null),
        formatted_address: incoming.formatted_address || currentSalon?.formatted_address || null,
        google_place_id: incoming.google_place_id || currentSalon?.google_place_id || null,
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

      const nowIso = new Date().toISOString();
      const physicalUpdates: Record<string, any> = {
        updated_at: nowIso,
      };

      if (incoming.trade_name !== undefined) physicalUpdates.trade_name = incoming.trade_name;
      if (incoming.legal_name !== undefined) physicalUpdates.legal_name = incoming.legal_name;
      if (incoming.slug !== undefined) physicalUpdates.slug = incoming.slug;
      if (incoming.category !== undefined) physicalUpdates.category = incoming.category;
      if (incoming.description !== undefined) physicalUpdates.description = incoming.description;
      if (incoming.slogan !== undefined) physicalUpdates.slogan = incoming.slogan;
      if (incoming.status !== undefined) {
        const normalizedSt = normalizeV6SalonStatus(incoming.status);
        physicalUpdates.status = normalizedSt;
        physicalUpdates.is_active = normalizedSt === 'active';
      }
      if (incoming.is_active !== undefined && incoming.status === undefined) {
        physicalUpdates.is_active = Boolean(incoming.is_active);
      }
      if (incoming.phone_whatsapp !== undefined || incoming.whatsapp !== undefined) {
        const w = String(incoming.whatsapp ?? incoming.phone_whatsapp ?? '').trim() || null;
        physicalUpdates.whatsapp = w;
        if (incoming.phone === undefined && incoming.phone_landline === undefined) {
          physicalUpdates.phone = w;
        }
      }
      if (incoming.phone !== undefined || incoming.phone_landline !== undefined) {
        physicalUpdates.phone = String(incoming.phone ?? incoming.phone_landline ?? '').trim() || null;
      }
      if (incoming.email !== undefined) physicalUpdates.email = incoming.email;
      if (incoming.instagram !== undefined) physicalUpdates.instagram = incoming.instagram;
      if (incoming.facebook !== undefined) physicalUpdates.facebook = incoming.facebook;
      if (incoming.website !== undefined) physicalUpdates.website = incoming.website;
      if (incoming.cnpj !== undefined) {
        physicalUpdates.cnpj = incoming.cnpj;
      } else if (incoming.document_number !== undefined && incoming.document_type !== 'CPF') {
        physicalUpdates.cnpj = incoming.document_number;
      }
      if (incoming.owner_cpf !== undefined) physicalUpdates.owner_cpf = incoming.owner_cpf;
      if (incoming.home_delivery_enabled !== undefined) {
        physicalUpdates.home_delivery_enabled = Boolean(incoming.home_delivery_enabled);
      } else if (incoming.operating_model !== undefined) {
        physicalUpdates.home_delivery_enabled =
          incoming.operating_model === 'delivery' ||
          incoming.operating_model === 'home_only' ||
          incoming.operating_model === 'hybrid';
      }
      if (incoming.billing_plan !== undefined) {
        physicalUpdates.billing_plan = normalizeV6BillingPlan(incoming.billing_plan);
      }
      if (incoming.fee_per_booking !== undefined || incoming.billing_fee_value !== undefined) {
        const syncedFee = Number(incoming.fee_per_booking ?? incoming.billing_fee_value ?? 2.5);
        if (Number.isFinite(syncedFee)) physicalUpdates.fee_per_booking = syncedFee;
      }
      if (incoming.monthly_subscription_fee !== undefined) {
        const mFee = Number(incoming.monthly_subscription_fee);
        if (Number.isFinite(mFee)) physicalUpdates.monthly_subscription_fee = mFee;
      }
      if (incoming.billing_due_day !== undefined) {
        physicalUpdates.billing_due_day = clampBillingDueDay(incoming.billing_due_day);
      }
      if (incoming.pix_key !== undefined) physicalUpdates.pix_key = incoming.pix_key;
      if (incoming.pix_keys !== undefined) physicalUpdates.pix_keys = incoming.pix_keys;
      if (incoming.business_hours !== undefined || incoming.operating_hours !== undefined) {
        physicalUpdates.business_hours = incoming.business_hours ?? incoming.operating_hours;
      }

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

      const salonMediaFields = [
        'logo_url',
        'logo_dark_url',
        'logo_light_url',
        'favicon_url',
        'cover_url',
        'facade_photo_url',
        'interior_photo_url',
      ];
      salonMediaFields.forEach((f) => {
        if (incoming[f] !== undefined) physicalUpdates[f] = incoming[f];
      });
      if (incoming.cover_image_url !== undefined && incoming.cover_url === undefined) {
        physicalUpdates.cover_url = incoming.cover_image_url;
      }

      const uiBooleanFields = new Set([
        'show_slogan',
        'show_hero_slides',
        'nav_border',
        'nav_icon_border',
        'nav_btn_shadow',
        'nav_btn_blur',
        'section_header_border',
        'section_header_btn_border',
        'section_header_btn_shadow',
        'section_header_btn_blur',
      ]);
      const uiFields = [
        'default_theme',
        'theme_preset_id',
        'primary_color',
        'secondary_color',
        'brand_font',
        'pwa_name',
        'show_slogan',
        'show_hero_slides',
        'welcome_style',
        'logo_text_fallback',
        'logo_text_color',
        'section_header_bg_color',
        'section_header_text_color',
        'section_header_icon_color',
        'section_header_bg_style',
        'section_header_border',
        'section_header_btn_bg_color',
        'section_header_btn_active_bg_color',
        'section_header_btn_border',
        'section_header_btn_shadow',
        'section_header_btn_blur',
        'section_header_btn_font',
        'nav_style',
        'nav_shape',
        'nav_border',
        'nav_icon_border',
        'nav_bg_style',
        'nav_bg_color',
        'nav_btn_bg_color',
        'nav_btn_active_bg_color',
        'nav_active_color',
        'nav_text_color',
        'nav_btn_shadow',
        'nav_btn_blur',
        'nav_btn_font',
      ];
      const uiPayload: Record<string, any> = {};
      const uiSource = {
        ...incoming,
        ...(incoming.ui_settings && typeof incoming.ui_settings === 'object' ? incoming.ui_settings : {}),
      };
      uiFields.forEach((field) => {
        if (uiSource[field] !== undefined) {
          if (field === 'default_theme') {
            uiPayload[field] = String(uiSource[field]).toLowerCase() === 'dark' ? 'dark' : 'light';
          } else if (uiBooleanFields.has(field)) {
            uiPayload[field] = toUiBool(uiSource[field], false);
          } else {
            uiPayload[field] = uiSource[field];
          }
        }
      });

      const { data, error } = await safeSupabaseWrite('salons', 'update', physicalUpdates, {
        eqCol: 'id',
        eqVal: id,
      });

      if (error) {
        console.error('[PATCH /api/admin/salons/:id] Erro no Supabase:', error);
        return res.status(400).json({ success: false, error: error.message });
      }

      if (Object.keys(uiPayload).length > 0) {
        try {
          await safeSupabaseWrite(
            'salon_ui_settings',
            'upsert',
            {
              salon_id: id,
              ...uiPayload,
              updated_at: nowIso,
            },
            { onConflict: 'salon_id' }
          );
        } catch (uiSyncErr) {
          console.warn('[PATCH /api/admin/salons/:id] Aviso ao sincronizar salon_ui_settings:', uiSyncErr);
        }
      }

      if (hasAddressInPayload) {
        await syncAddressAndCoordsAcrossCpfTables({
          cpf: incoming.owner_cpf || data?.owner_cpf || currentSalon?.owner_cpf || currentSalon?.cnpj,
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

      notifyAdminsOnEvent({
        eventType: 'salon_updated',
        title: 'Admin-Vapp • Estabelecimento Alterado',
        body: `${data?.trade_name || currentSalon?.trade_name || 'Estabelecimento'} teve o cadastro atualizado.`,
        url: '/?screen=salons',
        payload: { table: 'salons', id },
        dedupeKey: `salon_update_${id}`,
      }).catch(() => {});

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

  app.delete('/api/admin/salons/:id', async (req, res) => {
    try {
      const { id } = req.params;

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

  app.post('/api/admin/salons/bulk-action', async (req, res) => {
    try {
      const { ids, action, targetStatus } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de IDs vazia ou inválida' });
      }

      if (action === 'update_status' && targetStatus) {
        const normalizedSt = normalizeV6SalonStatus(targetStatus);
        const { error } = await supabaseAdmin
          .from('salons')
          .update({
            status: normalizedSt,
            is_active: normalizedSt === 'active',
            updated_at: new Date().toISOString(),
          })
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

  app.get('/api/admin/tables-summary', async (_req, res) => {
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

  app.get('/api/admin/metrics', async (_req, res) => {
    try {
      const { data: salonsData } = await supabaseAdmin
        .from('salons')
        .select('id, status, is_active');

      const salons = salonsData || [];
      const totalSalons = salons.length;
      const activeSalons = salons.filter((s: any) => s.status === 'active' || s.is_active === true).length;
      const pendingSalons = salons.filter((s: any) => s.status === 'pending').length;
      const incompleteSalons = salons.filter((s: any) => s.status === 'archived').length;
      const suspendedSalons = salons.filter((s: any) => s.status === 'suspended' || s.is_active === false).length;

      let todayAppointments = 0;
      try {
        const { count } = await supabaseAdmin
          .from('appointments')
          .select('*', { count: 'exact', head: true });
        todayAppointments = count || 0;
      } catch {}

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

  app.get('/api/admin/appointments', async (_req, res) => {
    try {
      const [{ data: dbAppointments, error }, { data: salonsRows }] = await Promise.all([
        supabaseAdmin
          .from('appointments')
          .select('*')
          .order('date_str', { ascending: true })
          .order('start_time', { ascending: true }),
        supabaseAdmin
          .from('salons')
          .select('id, trade_name, slug, fee_per_booking, latitude, longitude'),
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

  app.get('/api/admin/bulletins', (_req, res) => {
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

  app.get('/api/admin/categories', (_req, res) => {
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

  app.options('/api/public/check-user-availability', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  });

  app.post('/api/public/check-user-availability', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

  app.options('/api/public/register-user', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  });

  app.post('/api/public/register-user', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    try {
      const body = req.body || {};
      const {
        type = 'client',
        email,
        password,
        phone = '',
        documentCpf = '',
        username = '',
        avatarUrl = '',
        origin = 'portal',
        salonId = undefined,

        dependents = [],

        tradeName = '',
        slug = '',
        category = 'Barbearia',
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Informe um endereço de e-mail válido.' });
      }

      const cleanName = resolvedName;
      const cleanCpf = String(documentCpf || body.cpf || '').trim() || null;
      const cleanPhone = String(phone || '').trim() || null;
      const cleanUsername = (username || cleanEmail.split('@')[0] || 'usuario').trim().replace(/^@+/, '');
      if (
        username &&
        (!/[A-Z]/.test(cleanUsername) ||
          !/[a-z]/.test(cleanUsername) ||
          !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUsername))
      ) {
        return res.status(400).json({
          success: false,
          error:
            'O nome de usuário deve conter ao menos 1 letra maiúscula, 1 letra minúscula e 1 caractere especial (Ex: Anderson@, Ana#1).',
        });
      }
      const cleanSlug = String(slug || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 30);

      const preConflict = await checkUserConflictInSupabase({
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone || undefined,
        cpf: cleanCpf || undefined,
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
        'app', 'dashboard', 'status', 'auth', 'login', 'signup', 'checkout',
      ];

      if (type === 'professional' && (!tradeName?.trim() || !cleanSlug)) {
        return res.status(400).json({
          success: false,
          error: 'Nome do Estabelecimento e Subdomínio são obrigatórios para profissionais.',
        });
      }

      if (type === 'professional' && RESERVED_SUBDOMAINS.includes(cleanSlug)) {
        return res.status(400).json({ success: false, error: `O subdomínio "${cleanSlug}" é reservado pelo sistema.` });
      }

      const nowUserIso = new Date().toISOString();
      const resolvedCreatedVia = normalizeV6CreatedVia(origin || 'pvapp');

      let authUserId: string | null = null;
      const { data: authUserResp, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          phone: cleanPhone || undefined,
          avatar_url: avatarUrl || undefined,
          username: cleanUsername || undefined,
          cpf: cleanCpf || undefined,
          created_via: resolvedCreatedVia,
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
            await supabaseAdmin.auth.admin.updateUserById(matched.id, {
              password: String(password),
              email_confirm: true,
              user_metadata: {
                full_name: cleanName,
                phone: cleanPhone || undefined,
                avatar_url: avatarUrl || undefined,
                username: cleanUsername || undefined,
                cpf: cleanCpf || undefined,
                created_via: resolvedCreatedVia,
              },
            });
          }
        } catch {}
      }

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
        await safeSupabaseWrite(
          'profiles',
          'upsert',
          {
            id: authUserId,
            email: cleanEmail,
            full_name: cleanName,
            username: cleanUsername,
            cpf: cleanCpf,
            phone: cleanPhone,
            avatar_url: avatarUrl || null,
            role: type === 'professional' ? 'salon_owner' : 'client',
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
            is_active: true,
            created_via: resolvedCreatedVia,
            updated_at: nowUserIso,
          },
          { onConflict: 'id' }
        );
      }

      const isUuid = (val: any) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

      const clientPayload: Record<string, any> = {
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        cpf: cleanCpf,
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
        is_active: true,
        created_via: resolvedCreatedVia,
        updated_at: nowUserIso,
      };

      let savedClient: any = null;
      if (authUserId) {
        const upsertRes = await safeSupabaseWrite(
          'clients',
          'upsert',
          { user_id: authUserId, ...clientPayload },
          { onConflict: 'user_id' }
        );
        if (upsertRes.error) {
          console.error('[register-user] Erro ao salvar client via upsert(user_id):', upsertRes.error);
          return res.status(400).json({ success: false, error: upsertRes.error.message });
        }
        savedClient = upsertRes.data;
      } else {
        const insRes = await safeSupabaseWrite('clients', 'insert', clientPayload);
        if (insRes.error) {
          console.error('[register-user] Erro ao inserir client:', insRes.error);
          return res.status(400).json({ success: false, error: insRes.error.message });
        }
        savedClient = insRes.data;
      }

      if (isUuid(salonId) && savedClient?.id) {
        try {
          await safeSupabaseWrite(
            'salon_clients',
            'upsert',
            {
              salon_id: salonId,
              client_id: savedClient.id,
              updated_at: nowUserIso,
            },
            { onConflict: 'salon_id,client_id' }
          );
        } catch {}
      }

      const effectiveClientId = savedClient?.id || authUserId || `usr-${Date.now()}`;

      if (Array.isArray(dependents) && dependents.length > 0 && isUuid(savedClient?.id)) {
        for (const dep of dependents) {
          if (dep.fullName && dep.fullName.trim()) {
            try {
              await safeSupabaseWrite('dependents', 'insert', {
                parent_client_id: savedClient.id,
                full_name: dep.fullName.trim(),
                relationship: normalizeV6DependentRel(dep.relationship),
                notes: dep.notes || (dep.nickname ? `Apelido: ${dep.nickname}` : null),
                avatar_url: dep.avatarUrl || null,
                created_via: resolvedCreatedVia,
              });
            } catch (depErr) {
              console.warn('Aviso ao inserir dependente:', depErr);
            }
          }
        }
      }

      let createdSalon = null;
      if (type === 'professional') {
        const homeDeliveryEnabled = attendanceType === 'home_only' || attendanceType === 'hybrid';
        const effSalonCep = !salonSameAsPersonalAddress && salonCep ? salonCep : cep;
        const effSalonStreet = !salonSameAsPersonalAddress && salonStreet ? salonStreet : street;
        const effSalonNumber = !salonSameAsPersonalAddress && salonNumber ? salonNumber : number;
        const effSalonComplement = !salonSameAsPersonalAddress && salonComplement ? salonComplement : complement;
        const effSalonNeighborhood = !salonSameAsPersonalAddress && salonNeighborhood ? salonNeighborhood : neighborhood;
        const effSalonCity = !salonSameAsPersonalAddress && salonCity ? salonCity : city;
        const effSalonState = !salonSameAsPersonalAddress && salonState ? salonState : state;

        const effSalonPhoneWhatsapp = !salonSameAsPersonalAddress && salonPhoneWhatsapp ? salonPhoneWhatsapp : cleanPhone;
        const effSalonEmail = !salonSameAsPersonalAddress && salonEmail ? salonEmail.trim().toLowerCase() : cleanEmail;

        const { data: existingProSalon } = await supabaseAdmin
          .from('salons')
          .select('id')
          .ilike('slug', cleanSlug)
          .maybeSingle();

        const proSalonPayload: Record<string, any> = {
          trade_name: tradeName.trim(),
          legal_name: cleanName,
          slug: cleanSlug,
          ...(authUserId ? { owner_id: authUserId } : {}),
          owner_cpf: cleanCpf,
          category: category || 'Barbearia',
          phone: salonPhoneLandline || effSalonPhoneWhatsapp || null,
          whatsapp: effSalonPhoneWhatsapp || null,
          email: effSalonEmail,
          status: 'active',
          is_active: true,
          home_delivery_enabled: homeDeliveryEnabled,
          address: effSalonStreet || null,
          cep: effSalonCep || null,
          street_number: effSalonNumber || null,
          complement: effSalonComplement || null,
          neighborhood: effSalonNeighborhood || null,
          city: effSalonCity || 'São Paulo',
          state: effSalonState || 'SP',
          latitude: userGeo.latitude,
          longitude: userGeo.longitude,
          formatted_address: userGeo.formatted_address,
          google_place_id: userGeo.google_place_id,
          billing_plan: 'per_booking',
          fee_per_booking: 2.5,
          monthly_subscription_fee: 89.9,
          billing_due_day: 10,
          created_via: resolvedCreatedVia,
          updated_at: nowUserIso,
        };

        const { data: salonData, error: salonErr } = existingProSalon?.id
          ? await safeSupabaseWrite('salons', 'update', proSalonPayload, { eqCol: 'id', eqVal: existingProSalon.id })
          : await safeSupabaseWrite('salons', 'insert', proSalonPayload);

        if (salonErr) {
          console.warn('Aviso no upsert do salão:', salonErr);
        } else if (salonData?.id) {
          createdSalon = salonData;

          await safeSupabaseWrite(
            'salon_ui_settings',
            'upsert',
            {
              salon_id: salonData.id,
              default_theme: 'dark',
              primary_color: '#20C933',
              pwa_name: tradeName.trim(),
              updated_at: nowUserIso,
            },
            { onConflict: 'salon_id' }
          );

          await safeSupabaseWrite('professionals', 'insert', {
            salon_id: salonData.id,
            ...(authUserId ? { user_id: authUserId } : {}),
            full_name: cleanName,
            role: 'Proprietário',
            access_level: 'admin',
            email: cleanEmail,
            phone: cleanPhone,
            cpf: cleanCpf,
            avatar_url: avatarUrl || null,
            is_active: true,
            created_via: resolvedCreatedVia,
            updated_at: nowUserIso,
          });

          if (authUserId) {
            await safeSupabaseWrite(
              'salon_members',
              'upsert',
              {
                salon_id: salonData.id,
                user_id: authUserId,
                role: 'owner',
                is_active: true,
                created_via: resolvedCreatedVia,
                updated_at: nowUserIso,
              },
              { onConflict: 'salon_id,user_id' }
            );
          }
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

      notifyAdminsOnEvent({
        eventType: type === 'professional' ? 'salon_and_user_created' : 'client_created',
        title:
          type === 'professional'
            ? 'Admin-Vapp • Novo Estabelecimento'
            : 'Admin-Vapp • Novo Usuário',
        body:
          type === 'professional'
            ? `${tradeName || cleanName} foi cadastrado via ${resolvedCreatedVia}.`
            : `${cleanName} (@${cleanUsername}) foi cadastrado via ${resolvedCreatedVia}.`,
        url: type === 'professional' ? '/?screen=salons' : '/?screen=users',
        payload: {
          clientId: savedClient?.id || effectiveClientId,
          salonId: createdSalon?.id || null,
          origin: resolvedCreatedVia,
        },
        dedupeKey: `client_insert_${savedClient?.id || cleanEmail}`,
      }).catch(() => {});

      return res.json({
        success: true,
        message:
          type === 'professional'
            ? 'Estabelecimento e conta criados com sucesso!'
            : 'Conta de usuário criada com sucesso!',
        user: {
          id: authUserId || effectiveClientId,
          clientId: savedClient?.id || effectiveClientId,
          name: cleanName,
          email: cleanEmail,
          username: cleanUsername,
          phone: cleanPhone || '',
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

  app.get('/api/admin/salons/:salonId/full-sync', async (req, res) => {
    try {
      const { salonId } = req.params;

      const [{ data: salonRow }, { data: uiSettingsRow }] = await Promise.all([
        supabaseAdmin.from('salons').select('*').eq('id', salonId).maybeSingle(),
        supabaseAdmin.from('salon_ui_settings').select('*').eq('salon_id', salonId).maybeSingle(),
      ]);

      const branding = salonRow?.branding && typeof salonRow.branding === 'object' ? salonRow.branding : {};

      const { data: masterServices } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false });

      const unifiedServicesMap = new Map<string, any>();

      (masterServices || []).forEach((s: any) => {
        unifiedServicesMap.set(s.id, {
          id: s.id,
          salon_id: salonId,
          name: s.name || 'Procedimento',
          category: s.category || 'Geral',
          price: Number(s.price) || 0,
          promotional_price: s.promo_price !== null && s.promo_price !== undefined ? Number(s.promo_price) : null,
          duration_minutes: Number(s.duration_minutes) || 30,
          duration_estimated: `${Number(s.duration_minutes) || 30} min`,
          commission_rate: Number(s.commission_rate ?? 50),
          description: s.description || '',
          is_active: s.is_active ?? true,
          target_audience: 'all',
          image_url: s.image_url || null,
          video_url: s.video_url || null,
          photos: Array.isArray(s.gallery_urls) ? s.gallery_urls : [],
          videos: s.video_url ? [s.video_url] : [],
          slides: [],
          source_table: 'services',
        });
      });

      const { data: dbMediaItems } = await supabaseAdmin
        .from('media_assets')
        .select('*')
        .eq('owner_type', 'salon')
        .eq('owner_id', salonId)
        .order('created_at', { ascending: false });

      const normalizedMedia = (dbMediaItems || []).map((m: any) => {
        const isVideo = String(m.mime_type || '').startsWith('video/');
        return {
          id: m.id,
          title: m.metadata?.title || m.storage_path?.split('/').pop() || 'Mídia do Salão',
          url: m.public_url || '',
          type: isVideo ? 'video' : 'image',
          media_group: isVideo ? 'videos' : m.purpose === 'cover' || m.purpose === 'logo' ? 'imagens' : 'fotos',
          category: m.purpose || 'gallery',
          duration_seconds: m.duration_seconds || 5,
          slot_index: m.sort_order ?? 0,
          is_cover: m.purpose === 'cover',
          created_at: m.created_at ? String(m.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
        };
      }).filter((m: any) => Boolean(m.url));

      const existingUrls = new Set(normalizedMedia.map((m: any) => m.url));
      if (Array.isArray(branding.galleryUrls)) {
        branding.galleryUrls.forEach((gUrl: string, idx: number) => {
          if (gUrl && isSafeMediaUrl(gUrl) && !existingUrls.has(gUrl)) {
            existingUrls.add(gUrl);
            normalizedMedia.push({
              id: `brd-gal-${idx}`,
              title: `Foto Galeria Meu Negócio #${idx + 1}`,
              url: gUrl,
              type: gUrl.endsWith('.mp4') ? 'video' : 'image',
              media_group: gUrl.endsWith('.mp4') ? 'videos' : 'fotos',
              category: 'gallery',
              duration_seconds: 5,
              slot_index: idx + 1,
              is_cover: false,
              created_at: new Date().toISOString().slice(0, 10),
            });
          }
        });
      }

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

      const { data: uiData, error: uiErr } = await supabaseAdmin
        .from('salon_ui_settings')
        .upsert({ salon_id: salonId, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'salon_id' })
        .select()
        .single();

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

  app.post('/api/admin/salons/:salonId/services', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { action, service } = req.body;

      if (action === 'delete' && service?.id) {
        await supabaseAdmin.from('services').delete().eq('id', service.id).eq('salon_id', salonId);
        return res.json({ success: true });
      }

      const durationMin = Number(service.duration_minutes) || 30;
      const promoPrice =
        service.promotional_price !== undefined && service.promotional_price !== null && service.promotional_price !== ''
          ? Number(service.promotional_price)
          : service.promo_price !== undefined && service.promo_price !== null && service.promo_price !== ''
          ? Number(service.promo_price)
          : null;
      const photosArr = (Array.isArray(service.photos) ? service.photos : Array.isArray(service.gallery_urls) ? service.gallery_urls : [])
        .filter((u: any) => typeof u === 'string' && isSafeMediaUrl(u));
      const videosArr = Array.isArray(service.videos) ? service.videos : [];
      const primaryVideoUrl =
        service.video_url ||
        (videosArr.length > 0 ? (typeof videosArr[0] === 'string' ? videosArr[0] : videosArr[0]?.url) : null) ||
        null;
      const primaryImageUrl = service.image_url || photosArr[0] || null;

      const payload = {
        salon_id: salonId,
        name: service.name || service.title || 'Procedimento',
        category: service.category || 'cabelo',
        price: Number(service.price) || 0,
        promo_price: promoPrice,
        duration_minutes: durationMin,
        description: service.description || '',
        is_active: service.is_active ?? true,
        image_url: primaryImageUrl && isSafeMediaUrl(primaryImageUrl) ? primaryImageUrl : null,
        video_url: primaryVideoUrl && isSafeMediaUrl(primaryVideoUrl) ? primaryVideoUrl : null,
        gallery_urls: photosArr,
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
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', offerId || offer.id);
        return res.json({ success: true });
      }

      const offerPrice = Number(offer.offer_price ?? offer.price) || 0;
      const originalPrice = Number(offer.original_price || offer.originalPrice) || Math.round(offerPrice * 1.25 * 100) / 100;
      const gallery = (Array.isArray(offer.gallery_images || offer.galleryImages)
        ? (offer.gallery_images || offer.galleryImages)
        : []).filter((u: any) => typeof u === 'string' && isSafeMediaUrl(u));
      const videoUrl = offer.video_url || offer.videoUrl || null;
      const coverUrl = offer.cover_image_url || gallery[0] || null;
      const mediaLevel = videoUrl ? 3 : gallery.length > 0 || coverUrl ? 2 : Number(offer.media_level) || 1;
      const expiresHours = Number(offer.expires_in_hours || offer.expiresInHours) || 6;
      const rawStatus = String(offer.status || 'active').toLowerCase();
      const v6Status = ['active', 'booked', 'expired', 'cancelled'].includes(rawStatus)
        ? rawStatus
        : rawStatus === 'available'
        ? 'active'
        : 'active';

      const offerPayload: Record<string, any> = {
        salon_id: salonId,
        professional_id: offer.professional_id || offer.professionalId || null,
        service_id: offer.service_id || offer.serviceId || null,
        title: offer.title || offer.service_title || offer.serviceTitle || offer.name || 'Cadeira Vazia Promocional',
        description: offer.description || '',
        offer_price: offerPrice,
        original_price: originalPrice,
        slot_date: offer.slot_date || offer.date_str || new Date().toISOString().slice(0, 10),
        slot_time: offer.slot_time || offer.start_time || offer.startTime || '14:30:00',
        duration_minutes: Number(offer.duration_minutes) || 45,
        status: v6Status,
        media_level: mediaLevel,
        cover_image_url: coverUrl && isSafeMediaUrl(coverUrl) ? coverUrl : null,
        video_url: videoUrl && isSafeMediaUrl(videoUrl) ? videoUrl : null,
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

  app.post('/api/admin/salons/:salonId/media', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { action, mediaItem, mediaId } = req.body;

      if (action === 'delete' && mediaId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId)) {
          const { data: asset } = await supabaseAdmin
            .from('media_assets')
            .select('id, bucket_id, storage_path')
            .eq('id', mediaId)
            .maybeSingle();
          if (asset?.bucket_id && asset?.storage_path) {
            await supabaseAdmin.storage.from(asset.bucket_id).remove([asset.storage_path]);
          }
          await supabaseAdmin.from('media_assets').delete().eq('id', mediaId);
        }
        return res.json({ success: true });
      }

      if (!mediaItem?.url || !isSafeMediaUrl(mediaItem.url)) {
        return res.status(400).json({
          success: false,
          error: 'URL de mídia inválida ou em Base64. Use POST /api/media/upload para enviar o arquivo.',
        });
      }

      const purpose = mediaItem.is_cover || mediaItem.category === 'banner'
        ? 'cover'
        : mediaItem.category === 'logotipo'
        ? 'logo'
        : mediaItem.type === 'video'
        ? 'video'
        : 'gallery';

      const storagePath = `salons/${salonId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const rowToInsert: Record<string, any> = {
        owner_type: 'salon',
        owner_id: salonId,
        bucket_id: 'salon-media',
        storage_path: mediaItem.storage_path || storagePath,
        public_url: mediaItem.url,
        mime_type: mediaItem.mime_type || (mediaItem.type === 'video' ? 'video/mp4' : 'image/webp'),
        size_bytes: Number(mediaItem.size_bytes) || 0,
        purpose,
        metadata: {
          title: mediaItem.title || 'Mídia do Estabelecimento',
          category: mediaItem.category || 'gallery',
        },
      };

      const { data: inserted } = await supabaseAdmin
        .from('media_assets')
        .insert(rowToInsert)
        .select()
        .maybeSingle();

      const { data: salonRow } = await supabaseAdmin
        .from('salons')
        .select('branding, cover_url, logo_url')
        .eq('id', salonId)
        .maybeSingle();

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
        if (purpose === 'cover') {
          updates.cover_url = mediaItem.url;
        }
        if (purpose === 'logo') {
          updates.logo_url = mediaItem.url;
        }
        await supabaseAdmin.from('salons').update(updates).eq('id', salonId);
      }

      return res.json({ success: true, mediaItem: inserted || { ...rowToInsert, id: `med-${Date.now()}` } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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

      delete salonUpdatePayload.branding;
      delete salonUpdatePayload.theme_preset_id;
      delete salonUpdatePayload.primary_color;
      delete salonUpdatePayload.secondary_color;
      delete salonUpdatePayload.brand_font;

      const { data: updatedSalon, error: upErr } = await safeSupabaseWrite('salons', 'update', salonUpdatePayload, {
        eqCol: 'id',
        eqVal: salonId,
      });

      if (upErr) {
        return res.status(400).json({ success: false, error: upErr.message });
      }

      const uiRowPayload: Record<string, any> = {
        salon_id: salonId,
        updated_at: new Date().toISOString(),
      };
      if (defaultTheme !== undefined) {
        uiRowPayload.default_theme = String(defaultTheme).toLowerCase() === 'dark' ? 'dark' : 'light';
      }
      if (primaryColor !== undefined) uiRowPayload.primary_color = primaryColor;
      if (secondaryColor !== undefined) uiRowPayload.secondary_color = secondaryColor;
      if (pwaName !== undefined) uiRowPayload.pwa_name = pwaName;
      if (showSlogan !== undefined) uiRowPayload.show_slogan = toUiBool(showSlogan, true);
      if (logoTextFallback !== undefined) uiRowPayload.logo_text_fallback = logoTextFallback;
      if (logoTextColor !== undefined) uiRowPayload.logo_text_color = logoTextColor;
      if (showHeroSlides !== undefined) uiRowPayload.show_hero_slides = toUiBool(showHeroSlides, true);
      if (welcomeStyle !== undefined) uiRowPayload.welcome_style = welcomeStyle;
      if (sectionHeaderBgColor !== undefined) uiRowPayload.section_header_bg_color = sectionHeaderBgColor;
      if (sectionHeaderTextColor !== undefined) uiRowPayload.section_header_text_color = sectionHeaderTextColor;
      if (sectionHeaderIconColor !== undefined) uiRowPayload.section_header_icon_color = sectionHeaderIconColor;
      if (sectionHeaderBgStyle !== undefined) uiRowPayload.section_header_bg_style = sectionHeaderBgStyle;
      if (sectionHeaderBorder !== undefined) uiRowPayload.section_header_border = toUiBool(sectionHeaderBorder, false);
      if (sectionHeaderBtnBgColor !== undefined) uiRowPayload.section_header_btn_bg_color = sectionHeaderBtnBgColor;
      if (sectionHeaderBtnActiveBgColor !== undefined) uiRowPayload.section_header_btn_active_bg_color = sectionHeaderBtnActiveBgColor;
      if (sectionHeaderBtnBorder !== undefined) uiRowPayload.section_header_btn_border = toUiBool(sectionHeaderBtnBorder, false);
      if (sectionHeaderBtnShadow !== undefined) uiRowPayload.section_header_btn_shadow = toUiBool(sectionHeaderBtnShadow, false);
      if (sectionHeaderBtnBlur !== undefined) uiRowPayload.section_header_btn_blur = toUiBool(sectionHeaderBtnBlur, false);
      if (sectionHeaderBtnFont !== undefined) uiRowPayload.section_header_btn_font = sectionHeaderBtnFont;
      if (navStyle !== undefined) uiRowPayload.nav_style = navStyle;
      if (navShape !== undefined) uiRowPayload.nav_shape = navShape;
      if (navBorder !== undefined) uiRowPayload.nav_border = toUiBool(navBorder, false);
      if (navIconBorder !== undefined) uiRowPayload.nav_icon_border = toUiBool(navIconBorder, false);
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
        full_name: professional.full_name || professional.name,
        role: professional.role || 'Especialista',
        access_level: normalizeV6ProfAccessLevel(professional.access_level),
        phone: professional.phone || null,
        email: professional.email || null,
        avatar_url: professional.avatar_url || null,
        commission_rate: Number(professional.commission_rate ?? 50),
        product_commission_rate: Number(professional.product_commission_rate ?? 10),
        specialties: Array.isArray(professional.specialties) ? professional.specialties : [],
        is_active: professional.is_active ?? true,
        updated_at: new Date().toISOString(),
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(professional.id || ''));

      let savedPro: any = null;
      if (isUuid && action === 'update') {
        const { data } = await safeSupabaseWrite('professionals', 'update', rowPayload, {
          eqCol: 'id',
          eqVal: professional.id,
        });
        savedPro = data;
      } else {
        const { data } = await safeSupabaseWrite('professionals', 'insert', rowPayload);
        savedPro = data;
      }

      notifyAdminsOnEvent({
        eventType: action === 'update' ? 'professional_updated' : 'professional_created',
        title: action === 'update' ? 'Admin-Vapp • Profissional Alterado' : 'Admin-Vapp • Novo Profissional',
        body: `${rowPayload.full_name} foi ${action === 'update' ? 'atualizado' : 'cadastrado'}.`,
        url: '/?screen=users',
        payload: { table: 'professionals', id: savedPro?.id || professional.id },
        dedupeKey: `prof_${action || 'insert'}_${savedPro?.id || professional.id || rowPayload.full_name}`,
      }).catch(() => {});

      return res.json({ success: true, professional: savedPro || { ...rowPayload, id: professional.id || `pro-${Date.now()}` } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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

  app.post('/api/admin/salons/:salonId/utilities', async (req, res) => {
    try {
      const { salonId } = req.params;
      const { utilities } = req.body;

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

  app.post('/api/media/upload', mediaUploadMiddleware.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file || !file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
      }

      const rawBucket = String(req.body?.bucket || 'salon-media').trim();
      const bucket = ALLOWED_MEDIA_BUCKETS.has(rawBucket) ? rawBucket : 'salon-media';
      const rawOwnerType = String(req.body?.owner_type || 'admin_preference').trim();
      const ownerType = ALLOWED_OWNER_TYPES.has(rawOwnerType) ? rawOwnerType : 'admin_preference';
      const rawOwnerId = String(req.body?.owner_id || '').trim();
      const ownerId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawOwnerId)
        ? rawOwnerId
        : crypto.randomUUID();
      const purpose = String(req.body?.purpose || 'gallery').trim().slice(0, 40);
      const mimeType = String(file.mimetype || '').toLowerCase();

      const isImage = ALLOWED_IMAGE_MIME_TYPES.has(mimeType);
      const isVideo = ALLOWED_VIDEO_MIME_TYPES.has(mimeType);
      if (!isImage && !isVideo) {
        return res.status(400).json({
          success: false,
          error: `Tipo de arquivo não permitido (${mimeType || 'desconhecido'}).`,
        });
      }

      let uploadBuffer: Buffer = file.buffer;
      let finalMime = mimeType;
      let ext = mimeType.split('/')[1]?.replace('+xml', '').replace('quicktime', 'mov') || 'bin';
      let width: number | null = null;
      let height: number | null = null;

      if (isImage && !mimeType.includes('svg') && !mimeType.includes('icon')) {
        const maxDim = bucket === 'avatars' ? 512 : bucket === 'branding' ? 1200 : 1600;
        const pipeline = sharp(file.buffer).rotate().resize(maxDim, maxDim, {
          fit: 'inside',
          withoutEnlargement: true,
        });
        const transformed = await pipeline.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
        uploadBuffer = transformed.data;
        finalMime = 'image/webp';
        ext = 'webp';
        width = transformed.info.width || null;
        height = transformed.info.height || null;
      }

      const safePrefix = purpose.replace(/[^a-z0-9_-]/gi, '_');
      const storagePath = `${ownerType}/${ownerId}/${safePrefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, uploadBuffer, {
          contentType: finalMime,
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadErr) {
        return res.status(500).json({
          success: false,
          error: `Falha no upload para o bucket "${bucket}": ${uploadErr.message}`,
        });
      }

      const { data: pubData } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = pubData.publicUrl;

      let assetRecord: any = null;
      try {
        const { data: insertedAsset } = await supabaseAdmin
          .from('media_assets')
          .insert({
            owner_type: ownerType,
            owner_id: ownerId,
            bucket_id: bucket,
            storage_path: storagePath,
            public_url: publicUrl,
            mime_type: finalMime,
            size_bytes: uploadBuffer.length,
            width,
            height,
            purpose,
          })
          .select()
          .maybeSingle();
        assetRecord = insertedAsset;
      } catch (metaErr) {
        console.warn('[POST /api/media/upload] Aviso ao registrar media_assets:', metaErr);
      }

      return res.json({
        success: true,
        url: publicUrl,
        bucket,
        storage_path: storagePath,
        asset: assetRecord,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/media/:id', async (req, res) => {
    try {
      const auth = await verifyAdminAccess(req);
      if (!auth.ok && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ success: false, error: 'Autenticação administrativa necessária.' });
      }

      const { id } = req.params;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(400).json({ success: false, error: 'ID de mídia inválido.' });
      }

      const { data: asset, error: fetchErr } = await supabaseAdmin
        .from('media_assets')
        .select('id, bucket_id, storage_path')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !asset) {
        return res.status(404).json({ success: false, error: 'Asset não encontrado.' });
      }

      const { error: rmErr } = await supabaseAdmin.storage
        .from(asset.bucket_id)
        .remove([asset.storage_path]);

      if (rmErr) {
        return res.status(500).json({ success: false, error: `Falha ao remover do Storage: ${rmErr.message}` });
      }

      await supabaseAdmin.from('media_assets').delete().eq('id', id);
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/storage/cleanup', async (req, res) => {
    try {
      const auth = await verifyAdminAccess(req);
      if (!auth.ok && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ success: false, error: 'Autenticação administrativa necessária.' });
      }

      const { data: queue, error } = await supabaseAdmin
        .from('storage_cleanup_queue')
        .select('id, bucket_id, storage_path, attempts')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      let deletedCount = 0;
      let failedCount = 0;

      for (const item of queue || []) {
        const { error: rmErr } = await supabaseAdmin.storage
          .from(item.bucket_id)
          .remove([item.storage_path]);

        if (!rmErr) {
          deletedCount++;
          await supabaseAdmin
            .from('storage_cleanup_queue')
            .update({ status: 'deleted', processed_at: new Date().toISOString() })
            .eq('id', item.id);
        } else {
          failedCount++;
          await supabaseAdmin
            .from('storage_cleanup_queue')
            .update({
              status: 'failed',
              attempts: (Number(item.attempts) || 0) + 1,
              last_error: rmErr.message,
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }
      }

      return res.json({
        success: true,
        processed: (queue || []).length,
        deleted: deletedCount,
        failed: failedCount,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/push/vapid-public-key', (_req, res) => {
    return res.json({
      success: Boolean(VAPID_PUBLIC_KEY),
      publicKey: VAPID_PUBLIC_KEY || null,
    });
  });

  app.post('/api/push/subscribe', async (req, res) => {
    try {
      const { subscription, app_origin = 'admvapp', role = 'super_admin', admin_id } = req.body || {};
      const endpoint = String(subscription?.endpoint || '').trim();
      const p256dh = String(subscription?.keys?.p256dh || '').trim();
      const authKey = String(subscription?.keys?.auth || '').trim();

      if (!endpoint.startsWith('https://') || !p256dh || !authKey) {
        return res.status(400).json({ success: false, error: 'Assinatura Web Push inválida.' });
      }

      const authCheck = await verifyAdminAccess(req);
      let resolvedUserId = authCheck.userId || null;

      if (!resolvedUserId && admin_id) {
        const { data: admRow } = await supabaseAdmin
          .from('system_admins')
          .select('user_id')
          .eq('id', String(admin_id))
          .maybeSingle();
        if (admRow?.user_id) resolvedUserId = admRow.user_id;
      }

      if (!resolvedUserId) {
        const { data: activeAdm } = await supabaseAdmin
          .from('system_admins')
          .select('user_id')
          .eq('is_active', true)
          .not('user_id', 'is', null)
          .limit(1)
          .maybeSingle();
        if (activeAdm?.user_id) resolvedUserId = activeAdm.user_id;
      }

      if (!resolvedUserId) {
        return res.status(400).json({
          success: false,
          error: 'Sessão de administrador sem vínculo em auth.users para assinar notificações Push.',
        });
      }

      const validOrigin = ['admvapp', 'mnvapp', 'pvapp'].includes(app_origin) ? app_origin : 'admvapp';

      const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
        {
          user_id: resolvedUserId,
          app_origin: validOrigin,
          role: String(role || 'super_admin'),
          endpoint,
          p256dh,
          auth: authKey,
          user_agent: String(req.headers['user-agent'] || '').slice(0, 250),
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/push/unsubscribe', async (req, res) => {
    try {
      const endpoint = String(req.body?.endpoint || '').trim();
      if (!endpoint) {
        return res.status(400).json({ success: false, error: 'Endpoint obrigatório.' });
      }

      await supabaseAdmin
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('endpoint', endpoint);

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/push/test', async (_req, res) => {
    try {
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(503).json({
          success: false,
          error: 'Chaves VAPID não configuradas no ambiente do servidor.',
        });
      }

      const result = await notifyAdminsOnEvent({
        eventType: 'admin_push_test',
        title: 'Admin-Vapp • Push Ativo!',
        body: 'Você receberá alertas automáticos sempre que um cadastro for criado ou alterado.',
        url: '/',
        payload: { test: true, timestamp: new Date().toISOString() },
      });

      if (result.subscriptions === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum dispositivo Admin inscrito ainda. Ative as notificações primeiro.',
        });
      }

      return res.json({
        success: result.sent > 0,
        sent: result.sent,
        failed: result.failed,
        subscriptions: result.subscriptions,
        error: result.sent === 0 ? 'Falha ao entregar push para o navegador.' : undefined,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/push/dispatch', async (req, res) => {
    try {
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(503).json({
          success: false,
          error: 'Chaves VAPID não configuradas no ambiente do servidor.',
        });
      }

      const auth = await verifyAdminAccess(req);
      if (!auth.ok && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ success: false, error: 'Autenticação administrativa necessária.' });
      }

      const { data: outbox, error } = await supabaseAdmin
        .from('notification_outbox')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      let sentCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const notif of outbox || []) {
        let query = supabaseAdmin
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('is_active', true);

        if (notif.target_user_id) {
          query = query.eq('user_id', notif.target_user_id);
        } else if (notif.target_role) {
          query = query.eq('app_origin', 'admvapp');
        }

        const { data: subs } = await query;
        if (!subs || subs.length === 0) {
          skippedCount++;
          await supabaseAdmin
            .from('notification_outbox')
            .update({ status: 'skipped', attempts: (notif.attempts || 0) + 1, sent_at: new Date().toISOString() })
            .eq('id', notif.id);
          continue;
        }

        const payload = JSON.stringify({
          title: notif.title || 'Admin-Vapp',
          body: notif.body || '',
          url: notif.url || '/',
          eventType: notif.event_type,
          data: notif.payload || {},
        });

        let delivered = false;
        let lastError: string | null = null;

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            delivered = true;
          } catch (pushErr: any) {
            lastError = pushErr?.message || 'Push delivery error';
            const statusCode = Number(pushErr?.statusCode);
            if (statusCode === 404 || statusCode === 410) {
              await supabaseAdmin
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', sub.id);
            }
          }
        }

        if (delivered) {
          sentCount++;
          await supabaseAdmin
            .from('notification_outbox')
            .update({ status: 'sent', attempts: (notif.attempts || 0) + 1, last_error: null, sent_at: new Date().toISOString() })
            .eq('id', notif.id);
        } else {
          failedCount++;
          await supabaseAdmin
            .from('notification_outbox')
            .update({ status: 'failed', attempts: (notif.attempts || 0) + 1, last_error: lastError })
            .eq('id', notif.id);
        }
      }

      return res.json({
        success: true,
        processed: (outbox || []).length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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
    app.use(express.static(distPath, { index: false }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Admin Master admvapp] Server running on http://localhost:${PORT}`);
    console.log(`[Admin Master admvapp] Service Role: ${SUPABASE_SERVICE_ROLE_KEY ? 'ACTIVE (Server-Only)' : 'NOT SET (Anon Fallback)'} | SQL Contract: v6.0 (Zero Base64 & Zero Mirror Tables)`);
    startAdminRealtimePushWatcher();
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
