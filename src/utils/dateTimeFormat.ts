/**
 * Utilitário Oficial de Auditoria Temporal e Origem Cadastral — Tríade VagouApp
 * Fuso Horário Canônico: America/Sao_Paulo (pt-BR)
 * Regra Zero Mocks: Jamais inventa timestamps ("new Date()") na ausência de created_at real no banco.
 */

export interface FormattedCreatedAtParts {
  valid: boolean;
  timestampMs: number;
  dateShort: string;      // dd/mm/aa
  timeShort: string;      // HH:mm
  compactLabel: string;   // dd/mm/aa • HH:mm
  fullLabel: string;      // dd/mm/aaaa às HH:mm:ss
  csvLabel: string;       // dd/mm/aaaa HH:mm:ss
}

export function formatCreatedAtParts(iso?: string | null): FormattedCreatedAtParts {
  const empty: FormattedCreatedAtParts = {
    valid: false,
    timestampMs: 0,
    dateShort: '—',
    timeShort: '—',
    compactLabel: '—',
    fullLabel: 'Sem data registrada no banco',
    csvLabel: '—',
  };

  if (!iso || typeof iso !== 'string' || !iso.trim()) {
    return empty;
  }

  const parsed = new Date(iso.trim());
  const ms = parsed.getTime();
  if (Number.isNaN(ms)) {
    return empty;
  }

  try {
    const tz = 'America/Sao_Paulo';
    const shortFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    const fullDateFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const shortTimeFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const fullTimeFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const dateShort = shortFmt.format(parsed);
    const dateFull = fullDateFmt.format(parsed);
    const timeShort = shortTimeFmt.format(parsed);
    const timeFull = fullTimeFmt.format(parsed);

    return {
      valid: true,
      timestampMs: ms,
      dateShort,
      timeShort,
      compactLabel: `${dateShort} • ${timeShort}`,
      fullLabel: `${dateFull} às ${timeFull}`,
      csvLabel: `${dateFull} ${timeFull}`,
    };
  } catch {
    const d = parsed.toLocaleDateString('pt-BR');
    const t = parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      valid: true,
      timestampMs: ms,
      dateShort: d,
      timeShort: t,
      compactLabel: `${d} • ${t}`,
      fullLabel: `${d} às ${t}`,
      csvLabel: `${d} ${t}`,
    };
  }
}

export interface RecordOriginBadgeInfo {
  code: string;
  label: string;
  badgeClass: string;
}

export function resolveRecordOriginInfo(
  rawOrigin?: string | null,
  fallbackCreatedAt?: string | null
): RecordOriginBadgeInfo {
  const norm = String(rawOrigin || '').trim().toLowerCase();

  if (norm === 'admin' || norm === 'admvapp' || norm === 'admin_master' || norm === 'system_admin') {
    return {
      code: 'admvapp',
      label: 'Admin Master',
      badgeClass:
        'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
    };
  }

  if (norm === 'establishment' || norm === 'mnvapp' || norm === 'salon_pwa' || norm === 'meunegocio') {
    return {
      code: 'mnvapp',
      label: 'Meu Negócio',
      badgeClass:
        'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    };
  }

  if (norm === 'portal' || norm === 'pvapp') {
    return {
      code: 'pvapp',
      label: 'Portal VAPP',
      badgeClass:
        'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
    };
  }

  if (norm === 'marketplace' || norm === 'seed' || norm === 'sql_seed') {
    return {
      code: 'seed',
      label: 'Seed / Legado',
      badgeClass:
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  }

  // Registros históricos sem coluna created_via gravados em outubro/2026 nos primeiros testes SQL
  if (fallbackCreatedAt && String(fallbackCreatedAt).startsWith('2026-10-24T17:21:0')) {
    return {
      code: 'seed',
      label: 'Seed SQL',
      badgeClass:
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  }

  return {
    code: 'supabase',
    label: 'Banco Tríade',
    badgeClass:
      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };
}
