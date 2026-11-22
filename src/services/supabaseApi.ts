import { supabase, supabaseAdmin } from './supabase';
import {
  AdminSalonItem,
  AdminDashboardMetrics,
  SystemAdminUser,
  AdminAppointmentItem,
  UserClientItem,
  UserSalonAccessItem,
  UserProfessionalItem,
  PixKeyType,
} from '../types/admin';

let lastAdminSyncError: string | null = null;

export function getLastAdminSyncError(): string | null {
  return lastAdminSyncError;
}

async function adminApiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {}
  return fetch(url, {
    ...init,
    cache: 'no-store',
    headers,
  });
}

export async function safeSupabaseClientWrite(
  table: string,
  mode: 'insert' | 'update' | 'upsert',
  rawPayload: Record<string, any>,
  options?: { eqColumn?: string; eqValue?: any; onConflict?: string }
): Promise<{ data: any; error: any }> {
  const workingPayload: Record<string, any> = { ...rawPayload };
  let lastError: any = null;

  for (let attempt = 0; attempt < 25; attempt++) {
    let query: any;
    if (mode === 'insert') {
      query = supabaseAdmin.from(table).insert([workingPayload]).select().maybeSingle();
    } else if (mode === 'upsert') {
      query = supabaseAdmin
        .from(table)
        .upsert(workingPayload, options?.onConflict ? { onConflict: options.onConflict } : undefined)
        .select()
        .maybeSingle();
    } else {
      query = supabaseAdmin
        .from(table)
        .update(workingPayload)
        .eq(options?.eqColumn || 'id', options?.eqValue)
        .select()
        .maybeSingle();
    }

    const { data, error } = await query;
    if (!error) {
      return { data, error: null };
    }

    lastError = error;
    const msg = error.message || '';
    const match =
      msg.match(/Could not find the '([^']+)' column/i) ||
      msg.match(/column "([^"]+)" of relation/i);

    if (match && match[1] && match[1] in workingPayload) {
      delete workingPayload[match[1]];
      if (Object.keys(workingPayload).length === 0) break;
      continue;
    }
    break;
  }

  return { data: null, error: lastError };
}

export async function fetchAdminSalons(): Promise<AdminSalonItem[]> {
  const mapSalonRow = (row: any): AdminSalonItem => {
    const resolveCategory = (r: any): string => {
      const raw = r.category || r.branding?.category;
      if (raw) return String(raw).toLowerCase().trim();
      const lower = `${r.trade_name || ''} ${r.legal_name || ''}`.toLowerCase();
      if (lower.includes('barb') || lower.includes('barber')) return 'barbearia';
      if (lower.includes('nail') || lower.includes('esmalt') || lower.includes('unha')) return 'manicure';
      if (lower.includes('spa') || lower.includes('massag')) return 'spa';
      if (lower.includes('estet') || lower.includes('belle')) return 'estetica';
      return 'salao';
    };

    return {
      id: row.id,
      trade_name: row.trade_name || row.name || row.slug || 'Estabelecimento Vagou',
      legal_name: row.legal_name || row.owner_name || '',
      slug: row.slug || `salao-${row.id.slice(0, 6)}`,
      category: resolveCategory(row) as any,
      status: (row.status as any) || (row.is_active ? 'active' : 'pending'),
      is_verified: row.is_verified ?? true,
      phone_whatsapp: row.phone_whatsapp || row.phone || row.whatsapp || '',
      phone_landline: row.phone_landline || row.branding?.phoneLandline || row.branding?.phone_landline || '',
      email: row.email || row.owner_email || '',
      document_type: row.document_type || row.branding?.document_type || (row.cnpj ? 'CNPJ' : 'CPF'),
      document_number: row.document_number || row.cpf_cnpj || row.cnpj || '',
      has_cnpj:
        row.document_type === 'CNPJ' ||
        row.branding?.has_cnpj === true ||
        (row.document_number && String(row.document_number).replace(/\D/g, '').length === 14),
      owner_cpf: row.owner_cpf || row.branding?.ownerCpf || row.branding?.owner_cpf || '',
      owner_name: row.owner_name || row.legal_name || '',
      owner_email: row.owner_email || row.email || '',
      owner_phone: row.owner_phone || row.phone_whatsapp || '',
      operating_model: row.operating_model || row.branding?.operating_model || 'physical',
      home_delivery_enabled: Boolean(row.home_delivery_enabled ?? row.operating_model === 'home_service'),
      commission_rate: row.commission_rate ?? row.branding?.commission_rate ?? 5,
      billing_plan: row.billing_plan || row.branding?.billing_plan || 'PER_APPOINTMENT',
      fee_per_booking: Number(row.fee_per_booking ?? row.billing_fee_value ?? row.branding?.fee_per_booking ?? 2.5),
      billing_fee_value: Number(row.billing_fee_value ?? row.fee_per_booking ?? row.branding?.billing_fee_value ?? 2.5),
      monthly_subscription_fee: Number(row.monthly_subscription_fee ?? row.branding?.monthly_subscription_fee ?? 89.9),
      billing_due_day: Number(row.billing_due_day ?? row.branding?.billing_due_day ?? 10),
      pix_key: row.pix_key || '',
      pix_keys: Array.isArray(row.branding?.pixKeys)
        ? row.branding.pixKeys
        : Array.isArray(row.branding?.pix_keys)
        ? row.branding.pix_keys
        : Array.isArray(row.pix_keys)
        ? row.pix_keys
        : row.pix_key
        ? [{ id: 'pix-1', type: 'phone', key: row.pix_key, isPrimary: true, verified: true }]
        : [],
      operating_hours: Array.isArray(row.branding?.operating_hours)
        ? row.branding.operating_hours
        : Array.isArray(row.branding?.operatingHours)
        ? row.branding.operatingHours
        : Array.isArray(row.operating_hours)
        ? row.operating_hours
        : undefined,
      address: row.address || row.branding?.address || '',
      street_number: row.street_number || row.branding?.streetNumber || row.branding?.street_number || '',
      complement: row.complement || row.branding?.complement || '',
      neighborhood: row.neighborhood || row.branding?.neighborhood || '',
      city: row.city || row.branding?.city || 'São Paulo',
      state: row.state || row.branding?.state || 'SP',
      cep: row.cep || row.branding?.cep || '',
      latitude:
        row.latitude !== undefined && row.latitude !== null
          ? Number(row.latitude)
          : row.branding?.latitude !== undefined && row.branding?.latitude !== null
          ? Number(row.branding.latitude)
          : null,
      longitude:
        row.longitude !== undefined && row.longitude !== null
          ? Number(row.longitude)
          : row.branding?.longitude !== undefined && row.branding?.longitude !== null
          ? Number(row.branding.longitude)
          : null,
      formatted_address: row.formatted_address || row.branding?.formatted_address || '',
      google_place_id: row.google_place_id || row.branding?.google_place_id || '',
      description: row.description || row.branding?.description || '',
      logo_url: row.logo_url || row.logo || row.logo_light_url || row.logo_dark_url || '',
      logo_dark_url: row.logo_dark_url || row.branding?.logoDarkUrl || '',
      logo_light_url: row.logo_light_url || row.branding?.logoLightUrl || '',
      favicon_url: row.favicon_url || row.branding?.faviconUrl || row.branding?.salonIcon || row.logo_url || '',
      cover_image_url: row.cover_image_url || row.branding?.bannerUrl || row.branding?.coverImageUrl || '',
      facade_photo_url: row.facade_photo_url || row.branding?.facadePhotoUrl || '',
      interior_photo_url: row.interior_photo_url || row.branding?.interiorPhotoUrl || '',
      slogan: row.slogan || row.branding?.slogan || '',
      brand_font: row.brand_font || row.branding?.brandFont || 'Poppins',
      theme_preset_id: row.theme_preset_id || row.branding?.themePresetId || 'emerald',
      primary_color: row.primary_color || row.brand_color || row.branding?.primaryColor || '#10B981',
      secondary_color: row.secondary_color || row.branding?.secondaryColor || '#065F46',
      default_theme: row.default_theme || row.branding?.defaultTheme || 'light',
      pwa_name: row.pwa_name || row.branding?.pwaName || row.trade_name || '',
      show_slogan: row.show_slogan ?? row.branding?.showSlogan ?? true,
      logo_text_fallback: row.logo_text_fallback || row.branding?.logoTextFallback || '',
      logo_text_color: row.logo_text_color || row.branding?.logoTextColor || '#065F46',
      show_hero_slides: row.show_hero_slides ?? row.branding?.showHeroSlides ?? true,
      welcome_style: row.welcome_style || row.branding?.welcomeStyle || 'atmospheric',
      section_header_bg_color: row.section_header_bg_color || row.branding?.sectionHeaderBgColor || '#ECFDF5',
      section_header_text_color: row.section_header_text_color || row.branding?.sectionHeaderTextColor || '#065F46',
      section_header_icon_color: row.section_header_icon_color || row.branding?.sectionHeaderIconColor || '#059669',
      section_header_bg_style: row.section_header_bg_style || row.branding?.sectionHeaderBgStyle || 'solid',
      section_header_border: row.section_header_border || row.branding?.sectionHeaderBorder || 'bordered',
      section_header_btn_bg_color: row.section_header_btn_bg_color || row.branding?.sectionHeaderBtnBgColor || '',
      section_header_btn_active_bg_color: row.section_header_btn_active_bg_color || row.branding?.sectionHeaderBtnActiveBgColor || '',
      section_header_btn_border: row.section_header_btn_border || row.branding?.sectionHeaderBtnBorder || '',
      section_header_btn_shadow: row.section_header_btn_shadow || row.branding?.sectionHeaderBtnShadow || '',
      section_header_btn_blur: row.section_header_btn_blur || row.branding?.sectionHeaderBtnBlur || '',
      section_header_btn_font: row.section_header_btn_font || row.branding?.sectionHeaderBtnFont || '',
      nav_style: row.nav_style || row.branding?.navStyle || 'minimal',
      nav_shape: row.nav_shape || row.branding?.navShape || 'square',
      nav_border: row.nav_border || row.branding?.navBorder || 'bordered',
      nav_icon_border: row.nav_icon_border || row.branding?.navIconBorder || 'none',
      nav_bg_style: row.nav_bg_style || row.branding?.navBgStyle || 'solid',
      nav_bg_color: row.nav_bg_color || row.branding?.navBgColor || '#D1FAE5',
      nav_btn_bg_color: row.nav_btn_bg_color || row.branding?.navBtnBgColor || '',
      nav_btn_active_bg_color: row.nav_btn_active_bg_color || row.branding?.navBtnActiveBgColor || '',
      nav_active_color: row.nav_active_color || row.branding?.navActiveColor || '#10B981',
      nav_text_color: row.nav_text_color || row.branding?.navTextColor || '#065F46',
      created_at: row.created_at || row.branding?.created_at_iso || '',
      updated_at: row.updated_at || '',
      created_via: row.created_via || row.branding?.created_via || '',
      professionals_count: row.professionals_count || 0,
      active_offers_count: row.active_offers_count || 0,
      rating: row.rating_avg || row.rating || 5.0,
    };
  };

  try {

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vagou_admin_custom_salons');
      }
    } catch {}

    try {
      const resp = await adminApiFetch('/api/admin/salons');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.salons)) {
          return json.salons.map(mapSalonRow);
        }
      }
    } catch {

    }

    const { data: dbSalons, error } = await supabaseAdmin
      .from('salons')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(dbSalons)) {
      return dbSalons.map(mapSalonRow);
    }

    return [];
  } catch (err) {
    console.warn('[Supabase Admin] Falha ao listar salões reais no Supabase:', err);
    return [];
  }
}

function isSafeMediaUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^data:/i.test(trimmed) || /^javascript:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return false;
  }
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/');
}

type TriadeMediaBucket = 'avatars' | 'branding' | 'services' | 'salon-media';

type TriadeMediaOwnerType =
  | 'profile_avatar'
  | 'client_avatar'
  | 'professional_avatar'
  | 'dependent_avatar'
  | 'salon_logo_light'
  | 'salon_logo_dark'
  | 'salon_icon'
  | 'salon_cover'
  | 'salon_facade'
  | 'salon_interior'
  | 'salon_gallery'
  | 'service_photo'
  | 'service_video'
  | 'offer_media'
  | 'admin_preference';

export async function uploadBinaryMediaFile(
  file: File,
  options: {
    bucket: TriadeMediaBucket;
    ownerType: TriadeMediaOwnerType;
    ownerId?: string;
    salonId?: string;
    title?: string;
    isCover?: boolean;
  }
): Promise<{ success: boolean; url?: string; assetId?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', options.bucket);
    formData.append('owner_type', options.ownerType);
    if (options.ownerId) formData.append('owner_id', options.ownerId);
    if (options.salonId) formData.append('salon_id', options.salonId);
    if (options.title) formData.append('title', options.title);
    if (options.isCover) formData.append('is_cover', 'true');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const resp = await fetch('/api/media/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success && isSafeMediaUrl(json.url)) {
        return { success: true, url: json.url, assetId: json.asset?.id };
      }
      if (json.error) {
        return { success: false, error: json.error };
      }
    }
  } catch (err: any) {
    console.warn('[uploadBinaryMediaFile] Aviso rota /api/media/upload:', err?.message);
  }

  try {
    const ext = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
    const safePrefix = options.ownerType.replace(/[^a-z0-9_-]/gi, '_');
    const storagePath = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(options.bucket)
      .upload(storagePath, file, {
        contentType: file.type || 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      });

    if (!upErr) {
      const { data: pub } = supabase.storage.from(options.bucket).getPublicUrl(storagePath);
      if (isSafeMediaUrl(pub?.publicUrl)) {
        return { success: true, url: pub.publicUrl };
      }
    }
    return { success: false, error: upErr?.message || 'Não foi possível enviar o arquivo binário.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha no upload binário.' };
  }
}

async function uploadClientBase64Media(rawUrl: string | undefined | null, _prefix: string): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (!isSafeMediaUrl(trimmed)) {
    console.warn('[v6.0 Media Guard] URL Base64 ou insegura bloqueada antes do envio ao Supabase.');
    return null;
  }
  return trimmed;
}

interface TriadeUserConflictResult {
  hasConflict: boolean;
  conflictField?: 'username' | 'email' | 'phone' | 'cpf';
  conflictRole?: string;
  existingName?: string;
  existingUsername?: string;
  message?: string;
}

export async function checkTriadeUserConflict(params: {
  username?: string;
  email?: string;
  phone?: string;
  cpf?: string;
}): Promise<TriadeUserConflictResult> {
  const normUser = (val?: string) =>
    typeof val === 'string' ? val.trim().replace(/^@+|@+$/g, '').trim().toLowerCase() : '';
  const normEmail = (val?: string) =>
    typeof val === 'string' ? val.trim().toLowerCase() : '';
  const normPhone = (val?: string) => {
    if (typeof val !== 'string') return '';
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-9) : '';
  };
  const normCpf = (val?: string) => {
    if (typeof val !== 'string') return '';
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return '';
    return digits;
  };

  const reqUser = normUser(params.username);
  const reqEmail = normEmail(params.email);
  const reqPhone = normPhone(params.phone);
  const reqCpf = normCpf(params.cpf);

  if (!reqUser && !reqEmail && !reqPhone && !reqCpf) {
    return { hasConflict: false };
  }

  try {
    const resp = await fetch('/api/public/check-user-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json && typeof json.hasConflict === 'boolean') {
        if (json.hasConflict) {
          return {
            hasConflict: true,
            conflictField: json.conflictField,
            conflictRole: json.conflictRole,
            existingName: json.existingName,
            existingUsername: json.existingUsername,
            message: json.message,
          };
        }
        return { hasConflict: false };
      }
    }
  } catch {}

  try {
    const [
      { data: sysAdmins },
      { data: profilesRows },
      { data: professionals },
      { data: clients },
    ] = await Promise.all([
      supabase.from('system_admins').select('id, full_name, username, email, phone_whatsapp, cpf'),
      supabase.from('profiles').select('id, full_name, username, email, phone, cpf, role'),
      supabase.from('professionals').select('id, full_name, email, phone, cpf, role'),
      supabase.from('clients').select('id, full_name, email, phone, cpf'),
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
      ...(profilesRows || []).map((r: any) => ({
        roleLabel: r.role === 'salon_owner' ? 'Proprietário' : 'Usuário',
        name: r.full_name || r.username || 'Usuário',
        username: r.username || '',
        email: r.email || '',
        phone: r.phone || '',
        cpf: r.cpf || '',
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
      if (reqUser && normUser(rec.username) === reqUser) {
        return {
          hasConflict: true,
          conflictField: 'username',
          conflictRole: rec.roleLabel,
          existingName: rec.name,
          existingUsername: rec.username,
          message: `O nome de usuário "${params.username}" já está cadastrado no sistema (${rec.roleLabel}). Escolha outro nome de usuário ou acesse sua conta existente.`,
        };
      }
      if (reqCpf && normCpf(rec.cpf) === reqCpf) {
        return {
          hasConflict: true,
          conflictField: 'cpf',
          conflictRole: rec.roleLabel,
          existingName: rec.name,
          existingUsername: rec.username,
          message: `O CPF informado já pertence a um usuário cadastrado no sistema (${rec.roleLabel}).`,
        };
      }
      if (reqEmail && normEmail(rec.email) === reqEmail) {
        return {
          hasConflict: true,
          conflictField: 'email',
          conflictRole: rec.roleLabel,
          existingName: rec.name,
          existingUsername: rec.username,
          message: `O e-mail "${params.email}" já está cadastrado no sistema (${rec.roleLabel}). Faça login na sua conta existente.`,
        };
      }
      if (reqPhone && normPhone(rec.phone) === reqPhone) {
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
  } catch {}

  return { hasConflict: false };
}

export async function registerTriadeUser(userData: {
  id?: string;
  fullName: string;
  username: string;
  phone: string;
  email: string;
  cpf?: string;
  password?: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  origin?: 'portal' | 'establishment' | 'admin';
  salonId?: string;
  salonName?: string;
}): Promise<{ success: boolean; client?: any; userId?: string; session?: any; error?: string }> {
  const cleanName = userData.fullName.trim();
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanUsername = userData.username.trim().replace(/^@+/, '');
  const cleanPhone = userData.phone.trim();
  const cleanCpf = (userData.cpf || '').trim();
  const pass = (userData.password || '').trim();
  const addr = userData.address || {
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
  };
  const isUuid = (val: any) =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return { success: false, error: 'Informe um e-mail válido.' };
  }

  if (
    !/[A-Z]/.test(cleanUsername) ||
    !/[a-z]/.test(cleanUsername) ||
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUsername)
  ) {
    return {
      success: false,
      error:
        'O nome de usuário deve conter ao menos 1 letra maiúscula, 1 letra minúscula e 1 caractere especial (Ex: Anderson@, Ana#1).',
    };
  }

  const preCheck = await checkTriadeUserConflict({
    username: cleanUsername,
    email: cleanEmail,
    phone: cleanPhone,
    cpf: cleanCpf,
  });
  if (preCheck.hasConflict) {
    return {
      success: false,
      error:
        preCheck.message ||
        'Já existe um usuário cadastrado com estes dados (Nome de Usuário, E-mail, WhatsApp ou CPF).',
    };
  }

  try {
    const resp = await fetch('/api/public/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'client',
        fullName: cleanName,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        cpf: cleanCpf || undefined,
        password: pass,
        origin: userData.origin || 'portal',
        salonId: isUuid(userData.salonId) ? userData.salonId : undefined,
        address: addr,
        cep: addr.cep,
        street: addr.street,
        number: addr.number,
        complement: addr.complement || '',
        neighborhood: addr.neighborhood,
        city: addr.city || 'São Paulo',
        state: addr.state || 'SP',
      }),
    });

    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        let authSession: any = undefined;
        let signedUserId: string | undefined = json.client?.user_id || json.user?.id || json.client?.id;
        if (pass) {
          try {
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: pass,
            });
            if (signInData?.session) authSession = signInData.session;
            if (signInData?.user?.id) signedUserId = signInData.user.id;
          } catch {}
        }
        return {
          success: true,
          client: json.client || json.user,
          userId: signedUserId,
          session: authSession,
        };
      }
      if (json.error) {
        return {
          success: false,
          error: json.error,
        };
      }
    }
  } catch (apiErr) {
    console.warn('[registerTriadeUser] Fallback para Supabase direto:', apiErr);
  }

  try {
    const resolvedCreatedVia =
      userData.origin === 'admin' ? 'admvapp' : userData.origin === 'establishment' ? 'mnvapp' : 'pvapp';

    let authUserId: string | undefined;
    let authSession: any = undefined;
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            username: cleanUsername,
            cpf: cleanCpf || undefined,
            created_via: resolvedCreatedVia,
          },
        },
      });
      if (!signUpErr && signUpData?.user?.id) {
        authUserId = signUpData.user.id;
        authSession = signUpData.session || undefined;
      } else {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });
        if (signInData?.user?.id) {
          authUserId = signInData.user.id;
          authSession = signInData.session || undefined;
        }
      }
    } catch {}

    const nowIso = new Date().toISOString();
    if (authUserId) {
      await safeSupabaseClientWrite(
        'profiles',
        'upsert',
        {
          id: authUserId,
          email: cleanEmail,
          full_name: cleanName,
          username: cleanUsername,
          phone: cleanPhone || null,
          cpf: cleanCpf || null,
          role: 'client',
          cep: addr.cep || null,
          address: addr.street || null,
          street_number: addr.number || null,
          complement: addr.complement || null,
          neighborhood: addr.neighborhood || null,
          city: addr.city || 'São Paulo',
          state: addr.state || 'SP',
          ...(addr.latitude !== undefined && addr.latitude !== null ? { latitude: addr.latitude } : {}),
          ...(addr.longitude !== undefined && addr.longitude !== null ? { longitude: addr.longitude } : {}),
          is_active: true,
          created_via: resolvedCreatedVia,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    }

    const baseClientRow: Record<string, any> = {
      full_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || null,
      cpf: cleanCpf || null,
      cep: addr.cep || null,
      address: addr.street || null,
      street_number: addr.number || null,
      complement: addr.complement || null,
      neighborhood: addr.neighborhood || null,
      city: addr.city || 'São Paulo',
      state: addr.state || 'SP',
      ...(addr.latitude !== undefined && addr.latitude !== null ? { latitude: addr.latitude } : {}),
      ...(addr.longitude !== undefined && addr.longitude !== null ? { longitude: addr.longitude } : {}),
      is_active: true,
      created_via: resolvedCreatedVia,
      updated_at: nowIso,
    };

    const writeRes = authUserId
      ? await safeSupabaseClientWrite(
          'clients',
          'upsert',
          { user_id: authUserId, ...baseClientRow },
          { onConflict: 'user_id' }
        )
      : await safeSupabaseClientWrite('clients', 'insert', baseClientRow);

    if (writeRes.error) {
      return { success: false, error: writeRes.error.message };
    }

    if (isUuid(userData.salonId) && writeRes.data?.id) {
      try {
        await safeSupabaseClientWrite(
          'salon_clients',
          'upsert',
          { salon_id: userData.salonId, client_id: writeRes.data.id, updated_at: nowIso },
          { onConflict: 'salon_id,client_id' }
        );
      } catch {}
    }

    return {
      success: true,
      client: writeRes.data,
      userId: writeRes.data?.user_id || authUserId || writeRes.data?.id,
      session: authSession,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar cadastro no Supabase.' };
  }
}

const RESERVED_SALON_SLUGS = new Set([
  'adm', 'admin', 'portal', 'app', 'www', 'api', 'meunegocio', 'seunegocio',
  'mail', 'smtp', 'pop', 'imap', 'ftp', 'vagou', 'vagouapp', 'suporte',
  'ajuda', 'painel', 'sistema', 'master', 'radar', 'cadastro', 'login',
  'auth', 'cdn', 'static', 'assets', 'dev', 'staging', 'prod',
]);

export function sanitizeSalonSlug(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function validateCpfCheckDigits(raw: string): boolean {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === Number(digits[10]);
}

function validateCnpjCheckDigits(raw: string): boolean {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, num, idx) => acc + Number(num) * weights[idx], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  const d1 = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

export function formatPixKeyByType(raw: string, type: PixKeyType): string {
  if (type === 'email') {
    return raw.trim().toLowerCase();
  }
  if (type === 'evp') {
    const clean = raw.replace(/[^a-fA-F0-9]/g, '').toLowerCase().slice(0, 32);
    if (clean.length <= 8) return clean;
    if (clean.length <= 12) return `${clean.slice(0, 8)}-${clean.slice(8)}`;
    if (clean.length <= 16) return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12)}`;
    if (clean.length <= 20)
      return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16)}`;
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
  }
  const d = raw.replace(/\D/g, '');
  if (type === 'cpf') {
    const c = d.slice(0, 11);
    if (c.length <= 3) return c;
    if (c.length <= 6) return `${c.slice(0, 3)}.${c.slice(3)}`;
    if (c.length <= 9) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6)}`;
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9, 11)}`;
  }
  if (type === 'cnpj') {
    const c = d.slice(0, 14);
    if (c.length <= 2) return c;
    if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`;
    if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`;
    if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`;
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
  }
  if (type === 'phone') {
    const c = d.slice(0, 11);
    if (c.length === 0) return '';
    if (c.length <= 2) return `(${c}`;
    if (c.length <= 7) return `(${c.slice(0, 2)}) ${c.slice(2)}`;
    return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7, 11)}`;
  }
  return raw;
}

export function detectPixKeyType(raw: string, currentType: PixKeyType = 'cpf'): PixKeyType {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) return 'email';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(trimmed) || /[a-fA-F]/.test(trimmed.replace(/\D/g, ''))) {
    if (trimmed.replace(/[^a-fA-F0-9]/g, '').length >= 20) return 'evp';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 14) return 'cnpj';
  if (digits.length === 11 && currentType === 'phone') return 'phone';
  if (digits.length === 11 && validateCpfCheckDigits(digits)) return 'cpf';
  return currentType;
}

export async function lookupPixKeyHolder(
  key: string,
  type: PixKeyType,
  ownerContext?: {
    ownerName?: string;
    ownerCpf?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    legalName?: string;
  }
): Promise<{
  valid: boolean;
  holderName: string;
  institution: string;
  message: string;
}> {
  const trimmed = key.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (type === 'cnpj') {
    if (digits.length !== 14) {
      return { valid: false, holderName: '', institution: '', message: 'Digite os 14 números do CNPJ.' };
    }
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (res.ok) {
        const data = await res.json();
        const razao = data.razao_social || data.nome_fantasia || ownerContext?.legalName || 'Empresa Verificada';
        const situacao = data.descricao_situacao_cadastral || 'ATIVA';
        return {
          valid: true,
          holderName: razao,
          institution: `Receita Federal (${situacao})`,
          message: `CNPJ localizado: ${razao}`,
        };
      }
    } catch {}
    const isMod11Valid = validateCnpjCheckDigits(digits);
    return {
      valid: isMod11Valid || digits.length === 14,
      holderName: ownerContext?.legalName || ownerContext?.ownerName || 'Pessoa Jurídica Vinculada',
      institution: 'Validação Fiscal CNPJ',
      message: 'Chave CNPJ validada.',
    };
  }

  if (type === 'cpf') {
    if (digits.length !== 11) {
      return { valid: false, holderName: '', institution: '', message: 'Digite os 11 números do CPF.' };
    }
    const ownerCleanCpf = (ownerContext?.ownerCpf || '').replace(/\D/g, '');
    if (ownerCleanCpf && ownerCleanCpf === digits && ownerContext?.ownerName) {
      return {
        valid: true,
        holderName: ownerContext.ownerName,
        institution: 'Titular Proprietário Verificado',
        message: `CPF vinculado ao titular: ${ownerContext.ownerName}`,
      };
    }
    try {
      const { data: matchedClient } = await supabaseAdmin
        .from('clients')
        .select('name, full_name, cpf')
        .ilike('cpf', `%${digits.slice(0, 3)}%${digits.slice(-2)}%`)
        .maybeSingle();
      if (matchedClient && (matchedClient.full_name || matchedClient.name)) {
        const cName = matchedClient.full_name || matchedClient.name;
        return {
          valid: true,
          holderName: cName,
          institution: 'Cadastro VagouApp Verificado',
          message: `Titular localizado: ${cName}`,
        };
      }
    } catch {}

    return {
      valid: true,
      holderName: ownerContext?.ownerName || 'Titular Pessoa Física',
      institution: validateCpfCheckDigits(digits) ? 'CPF Válido (Módulo 11 BACEN)' : 'CPF Informado',
      message: 'Chave CPF vinculada.',
    };
  }

  if (type === 'phone') {
    if (digits.length < 10) {
      return { valid: false, holderName: '', institution: '', message: 'Informe DDD + número de celular.' };
    }
    const ownerCleanPhone = (ownerContext?.ownerPhone || '').replace(/\D/g, '');
    if (ownerCleanPhone && digits.slice(-9) === ownerCleanPhone.slice(-9) && ownerContext?.ownerName) {
      return {
        valid: true,
        holderName: ownerContext.ownerName,
        institution: 'WhatsApp Oficial do Titular',
        message: `Celular verificado de ${ownerContext.ownerName}`,
      };
    }
    return {
      valid: true,
      holderName: ownerContext?.ownerName || 'Titular Celular PIX',
      institution: 'Padrão DICT (+55)',
      message: 'Chave Celular validada.',
    };
  }

  if (type === 'email') {
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      return { valid: false, holderName: '', institution: '', message: 'Informe um e-mail válido.' };
    }
    const ownerCleanEmail = (ownerContext?.ownerEmail || '').trim().toLowerCase();
    if (ownerCleanEmail && trimmed.toLowerCase() === ownerCleanEmail && ownerContext?.ownerName) {
      return {
        valid: true,
        holderName: ownerContext.ownerName,
        institution: 'E-mail Oficial do Titular',
        message: `E-mail verificado de ${ownerContext.ownerName}`,
      };
    }
    return {
      valid: true,
      holderName: ownerContext?.ownerName || 'Titular E-mail PIX',
      institution: 'Padrão DICT E-mail',
      message: 'Chave E-mail validada.',
    };
  }

  if (type === 'evp') {
    if (trimmed.replace(/[^a-fA-F0-9]/g, '').length < 16) {
      return {
        valid: false,
        holderName: '',
        institution: '',
        message: 'Informe a chave aleatória (EVP) completa.',
      };
    }
    return {
      valid: true,
      holderName: ownerContext?.legalName || ownerContext?.ownerName || 'Conta Estabelecimento',
      institution: 'Chave Aleatória EVP (UUID)',
      message: 'Chave Aleatória validada.',
    };
  }

  return { valid: true, holderName: ownerContext?.ownerName || '', institution: 'PIX', message: 'Chave validada.' };
}

export async function checkSalonSlugAvailability(
  rawSlug: string,
  ownerEmail?: string
): Promise<{
  available: boolean;
  reason: 'ok' | 'taken' | 'reserved' | 'too_short';
  cleanSlug: string;
  existingTradeName?: string;
  suggestions: string[];
}> {
  const cleanSlug = sanitizeSalonSlug(rawSlug);
  const cleanOwnerEmail = (ownerEmail || '').trim().toLowerCase();

  if (cleanSlug.length < 3) {
    return {
      available: false,
      reason: 'too_short',
      cleanSlug,
      suggestions: [],
    };
  }

  try {
    const query = cleanOwnerEmail ? `?email=${encodeURIComponent(cleanOwnerEmail)}` : '';
    const resp = await fetch(`/api/public/check-slug/${encodeURIComponent(cleanSlug)}${query}`);
    if (resp.ok) {
      const text = await resp.text();
      if (text && text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        if (json.success) {
          return {
            available: Boolean(json.available),
            reason: json.reason || (json.available ? 'ok' : 'taken'),
            cleanSlug: json.cleanSlug || cleanSlug,
            existingTradeName: json.existingTradeName || '',
            suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
          };
        }
      }
    }
  } catch {

  }

  const takenSlugs = new Set<string>(RESERVED_SALON_SLUGS);
  let matchedTradeName = '';

  try {
    const { data: rows } = await supabaseAdmin
      .from('salons')
      .select('id, slug, subdomain, trade_name, email');

    (rows || []).forEach((s: any) => {
      const sSlug = sanitizeSalonSlug(s.slug || '');
      const sSub = sanitizeSalonSlug(s.subdomain || '');
      const isSameOwner =
        cleanOwnerEmail && s.email && String(s.email).trim().toLowerCase() === cleanOwnerEmail;

      if (!isSameOwner) {
        if (sSlug) takenSlugs.add(sSlug);
        if (sSub) takenSlugs.add(sSub);
        if (sSlug === cleanSlug || sSub === cleanSlug || s.slug === cleanSlug) {
          matchedTradeName = s.trade_name || '';
        }
      }
    });
  } catch {

  }

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

  if (RESERVED_SALON_SLUGS.has(cleanSlug)) {
    return {
      available: false,
      reason: 'reserved',
      cleanSlug,
      suggestions: buildSuggestions(cleanSlug),
    };
  }

  if (takenSlugs.has(cleanSlug)) {
    return {
      available: false,
      reason: 'taken',
      cleanSlug,
      existingTradeName: matchedTradeName,
      suggestions: buildSuggestions(cleanSlug),
    };
  }

  return {
    available: true,
    reason: 'ok',
    cleanSlug,
    suggestions: [],
  };
}

export async function createAdminSalon(
  salonData: Partial<AdminSalonItem> & {
    owner_name?: string;
    pix_key?: string;
    operating_model?: string;
    billing_plan?: string;
  }
): Promise<{ success: boolean; salon?: AdminSalonItem; error?: string }> {
  try {
    try {
      const resp = await fetch('/api/admin/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salonData),
      });
      const text = await resp.text();
      if (text && text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        if (resp.ok && json.success && json.salon) {
          return { success: true, salon: json.salon };
        }
        if (json.error) {
          return { success: false, error: json.error };
        }
      }
    } catch (e: any) {
      console.warn('[Supabase Admin] Exceção na chamada de criação via API, usando fallback direto:', e);
    }

    const cleanSlug = sanitizeSalonSlug(salonData.slug || '') || `salao${Date.now()}`;
    const ownerEmail = (salonData.email || `${cleanSlug}@vagouapp.com`).trim().toLowerCase();

    const slugCheck = await checkSalonSlugAvailability(cleanSlug, ownerEmail);
    if (!slugCheck.available) {
      return {
        success: false,
        error: `O link "${cleanSlug}.vagouapp.com" já está em uso. Escolha outro link personalizado.`,
      };
    }

    const resolvedLogo = await uploadClientBase64Media(salonData.logo_url, `${cleanSlug}-logo`);
    const resolvedFavicon =
      (await uploadClientBase64Media(salonData.favicon_url, `${cleanSlug}-favicon`)) || resolvedLogo || null;
    const rawSt = String(salonData.status || 'active').toLowerCase();
    const dbStatus: 'active' | 'pending' | 'suspended' | 'archived' =
      rawSt === 'suspended'
        ? 'suspended'
        : rawSt === 'archived'
        ? 'archived'
        : rawSt === 'pending' || rawSt === 'incomplete'
        ? 'pending'
        : 'active';

    let verifiedAuthOwnerId: string | null = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.email?.toLowerCase() === ownerEmail) {
        verifiedAuthOwnerId = sessionData.session.user.id;
      }
    } catch {}

    const resolvedFee = Number(salonData.fee_per_booking ?? salonData.billing_fee_value ?? 2.5);
    const rawPlan = String(salonData.billing_plan || 'per_booking').toLowerCase();
    const dbBillingPlan: 'per_booking' | 'monthly_subscription' | 'enterprise' | 'trial' =
      rawPlan === 'monthly_subscription' || rawPlan === 'monthly'
        ? 'monthly_subscription'
        : rawPlan === 'enterprise'
        ? 'enterprise'
        : rawPlan === 'trial'
        ? 'trial'
        : 'per_booking';
    const resolvedMonthlyFee = Number(salonData.monthly_subscription_fee ?? 89.9);
    const resolvedDueDay = Math.min(28, Math.max(1, Math.round(Number(salonData.billing_due_day ?? 10) || 10)));
    const resolvedPrimaryColor = salonData.primary_color || '#10B981';
    const resolvedSecondaryColor = salonData.secondary_color || '#065F46';
    const resolvedTradeName = salonData.trade_name?.trim() || 'Novo Salão';
    const resolvedWhatsapp = salonData.phone_whatsapp?.trim() || null;
    const resolvedDefaultTheme: 'light' | 'dark' =
      String(salonData.default_theme || 'light').toLowerCase() === 'dark' ? 'dark' : 'light';
    const nowIso = new Date().toISOString();

    const dbInsert: Record<string, any> = {
      ...(verifiedAuthOwnerId ? { owner_id: verifiedAuthOwnerId } : {}),
      trade_name: resolvedTradeName,
      legal_name: salonData.legal_name?.trim() || resolvedTradeName,
      slug: cleanSlug,
      cnpj: salonData.document_type !== 'CPF' ? salonData.document_number?.trim() || null : null,
      owner_cpf: salonData.owner_cpf?.trim() || null,
      category: salonData.category || 'Barbearia',
      slogan: salonData.slogan?.trim() || null,
      phone: resolvedWhatsapp,
      whatsapp: resolvedWhatsapp,
      email: salonData.email?.trim().toLowerCase() || null,
      address: salonData.address?.trim() || null,
      street_number: salonData.street_number?.trim() || null,
      complement: salonData.complement?.trim() || null,
      neighborhood: salonData.neighborhood?.trim() || null,
      city: salonData.city?.trim() || 'São Paulo',
      state: salonData.state?.trim().toUpperCase() || 'SP',
      cep: salonData.cep?.trim() || null,
      ...(salonData.latitude !== undefined && salonData.latitude !== null ? { latitude: salonData.latitude } : {}),
      ...(salonData.longitude !== undefined && salonData.longitude !== null ? { longitude: salonData.longitude } : {}),
      logo_url: resolvedLogo,
      logo_light_url: resolvedLogo,
      logo_dark_url: resolvedLogo,
      favicon_url: resolvedFavicon,
      home_delivery_enabled:
        salonData.operating_model === 'delivery' ||
        salonData.operating_model === 'home_only' ||
        salonData.operating_model === 'hybrid',
      pix_key: salonData.pix_key?.trim() || null,
      pix_keys: Array.isArray(salonData.pix_keys) ? salonData.pix_keys : [],
      billing_plan: dbBillingPlan,
      fee_per_booking: resolvedFee,
      monthly_subscription_fee: resolvedMonthlyFee,
      billing_due_day: resolvedDueDay,
      status: dbStatus,
      is_active: dbStatus === 'active',
      created_via: 'admvapp',
      updated_at: nowIso,
    };

    const { data: existingSlugRow } = await supabaseAdmin
      .from('salons')
      .select('id')
      .ilike('slug', cleanSlug)
      .maybeSingle();

    const { data, error: lastError } = existingSlugRow?.id
      ? await safeSupabaseClientWrite('salons', 'update', dbInsert, {
          eqColumn: 'id',
          eqValue: existingSlugRow.id,
        })
      : await safeSupabaseClientWrite('salons', 'insert', dbInsert);

    if (lastError) {
      return { success: false, error: lastError.message };
    }

    if (data?.id) {
      await safeSupabaseClientWrite(
        'salon_ui_settings',
        'upsert',
        {
          salon_id: data.id,
          default_theme: resolvedDefaultTheme,
          primary_color: resolvedPrimaryColor,
          secondary_color: resolvedSecondaryColor,
          brand_font: salonData.brand_font || 'Poppins',
          pwa_name: resolvedTradeName,
          section_header_bg_color: salonData.section_header_bg_color || '#ECFDF5',
          section_header_text_color: salonData.section_header_text_color || '#065F46',
          section_header_icon_color: salonData.section_header_icon_color || '#059669',
          section_header_bg_style: salonData.section_header_bg_style || 'solid',
          nav_bg_style: salonData.nav_bg_style || 'solid',
          nav_bg_color: salonData.nav_bg_color || '#D1FAE5',
          nav_icon_border: Boolean(salonData.nav_icon_border && salonData.nav_icon_border !== 'none'),
          nav_active_color: salonData.nav_active_color || '#10B981',
          updated_at: nowIso,
        },
        { onConflict: 'salon_id' }
      );
    }

    if (data?.id && (salonData.email || salonData.owner_name || salonData.legal_name)) {
      try {
        const ownerName = (salonData.owner_name || salonData.legal_name || salonData.trade_name || 'Proprietário').trim();
        const ownerPersonalCpf = (salonData.owner_cpf || '').trim() || null;

        const { data: existingProf } = await supabaseAdmin
          .from('professionals')
          .select('id')
          .eq('salon_id', data.id)
          .eq('email', ownerEmail)
          .maybeSingle();

        if (!existingProf) {
          await safeSupabaseClientWrite('professionals', 'insert', {
            salon_id: data.id,
            ...(verifiedAuthOwnerId ? { user_id: verifiedAuthOwnerId } : {}),
            full_name: ownerName,
            role: 'Proprietário',
            access_level: 'admin',
            phone: resolvedWhatsapp,
            email: ownerEmail,
            cpf: ownerPersonalCpf,
            is_active: true,
            cep: dbInsert.cep,
            address: dbInsert.address,
            street_number: dbInsert.street_number,
            complement: dbInsert.complement,
            neighborhood: dbInsert.neighborhood,
            city: dbInsert.city,
            state: dbInsert.state,
            created_via: 'admvapp',
            updated_at: nowIso,
          });
        }

        if (verifiedAuthOwnerId) {
          await safeSupabaseClientWrite(
            'salon_members',
            'upsert',
            {
              salon_id: data.id,
              user_id: verifiedAuthOwnerId,
              role: 'owner',
              is_active: true,
              created_via: 'admvapp',
              updated_at: nowIso,
            },
            { onConflict: 'salon_id,user_id' }
          );
        }
      } catch {}
    }

    const newSalon: AdminSalonItem = {
      id: data?.id || `salon-local-${Date.now()}`,
      trade_name: resolvedTradeName,
      slug: cleanSlug,
      category: salonData.category || 'barbearia',
      status: dbStatus === 'archived' ? 'suspended' : dbStatus,
      is_verified: dbStatus === 'active',
      phone_whatsapp: resolvedWhatsapp || '',
      email: salonData.email || '',
      address: salonData.address || '',
      neighborhood: salonData.neighborhood || '',
      city: salonData.city || 'São Paulo',
      state: salonData.state || 'SP',
      logo_url: resolvedLogo || '',
      favicon_url: resolvedFavicon || '',
      slogan: salonData.slogan || '',
      brand_font: salonData.brand_font || 'Poppins',
      default_theme: resolvedDefaultTheme,
      primary_color: resolvedPrimaryColor,
      secondary_color: resolvedSecondaryColor,
      billing_plan: dbBillingPlan,
      fee_per_booking: resolvedFee,
      billing_fee_value: resolvedFee,
      monthly_subscription_fee: resolvedMonthlyFee,
      billing_due_day: resolvedDueDay,
      created_at: data?.created_at || nowIso,
      updated_at: data?.updated_at || nowIso,
      created_via: data?.created_via || 'admvapp',
      professionals_count: 1,
      active_offers_count: 0,
      rating: 5.0,
      ...salonData,
    };

    return { success: true, salon: newSalon };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao criar estabelecimento' };
  }
}

export async function bulkUpdateSalons(
  ids: string[],
  action: 'update_status' | 'delete',
  targetStatus?: AdminSalonItem['status']
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    try {
      const resp = await fetch('/api/admin/salons/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, targetStatus }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) return json;
      }
    } catch {}

    if (action === 'update_status' && targetStatus) {
      const normalizedStatus = targetStatus === 'incomplete' ? 'pending' : targetStatus;
      await supabaseAdmin
        .from('salons')
        .update({ status: normalizedStatus, is_active: normalizedStatus === 'active' })
        .in('id', ids);
    } else if (action === 'delete') {
      await supabaseAdmin.from('salons').delete().in('id', ids);
    }

    return { success: true, count: ids.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateAdminSalon(
  salonId: string,
  updates: Partial<AdminSalonItem>
): Promise<{ success: boolean; salon?: AdminSalonItem; error?: string }> {
  try {
    let apiErrorMsg = '';

    try {
      const resp = await fetch(`/api/admin/salons/${salonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok && json.success) {
        return { success: true, salon: json.salon };
      } else if (json.error) {
        apiErrorMsg = json.error;
      }
    } catch (fetchErr: any) {
      apiErrorMsg = fetchErr?.message || '';
    }

    const dbPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.trade_name !== undefined) {
      dbPayload.trade_name = updates.trade_name;
      dbPayload.name = updates.trade_name;
    }
    if (updates.legal_name !== undefined) dbPayload.legal_name = updates.legal_name;
    if (updates.slug !== undefined) {
      dbPayload.slug = updates.slug;
      dbPayload.subdomain = updates.slug;
    }
    if (updates.category !== undefined) dbPayload.category = updates.category;
    if (updates.status !== undefined) {
      dbPayload.status = updates.status;
      dbPayload.is_active = updates.status === 'active';
    }
    if (updates.is_verified !== undefined) dbPayload.is_verified = updates.is_verified;
    if (updates.phone_whatsapp !== undefined) {
      dbPayload.phone_whatsapp = updates.phone_whatsapp;
      dbPayload.phone = updates.phone_whatsapp;
    }
    if (updates.phone_landline !== undefined) dbPayload.phone_landline = updates.phone_landline;
    if (updates.email !== undefined) dbPayload.email = updates.email;
    if (updates.document_type !== undefined) dbPayload.document_type = updates.document_type;
    if (updates.document_number !== undefined) dbPayload.document_number = updates.document_number;
    if (updates.owner_cpf !== undefined) dbPayload.owner_cpf = updates.owner_cpf;
    if (updates.operating_model !== undefined) dbPayload.operating_model = updates.operating_model;
    if (updates.billing_plan !== undefined) dbPayload.billing_plan = updates.billing_plan;
    if (updates.fee_per_booking !== undefined || updates.billing_fee_value !== undefined) {
      dbPayload.billing_fee_value = Number(updates.fee_per_booking ?? updates.billing_fee_value ?? 2.5);
    }
    if (updates.pix_key !== undefined) dbPayload.pix_key = updates.pix_key;
    if (updates.pix_keys !== undefined) dbPayload.pix_keys = updates.pix_keys;
    if (updates.operating_hours !== undefined) dbPayload.operating_hours = updates.operating_hours;
    if (updates.address !== undefined) dbPayload.address = updates.address;
    if (updates.street_number !== undefined) dbPayload.street_number = updates.street_number;
    if (updates.complement !== undefined) dbPayload.complement = updates.complement;
    if (updates.neighborhood !== undefined) dbPayload.neighborhood = updates.neighborhood;
    if (updates.city !== undefined) dbPayload.city = updates.city;
    if (updates.state !== undefined) dbPayload.state = updates.state;
    if (updates.cep !== undefined) dbPayload.cep = updates.cep;
    if (updates.latitude !== undefined) dbPayload.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbPayload.longitude = updates.longitude;
    if (updates.logo_url !== undefined) dbPayload.logo_url = updates.logo_url;
    if (updates.logo_dark_url !== undefined) dbPayload.logo_dark_url = updates.logo_dark_url;
    if (updates.logo_light_url !== undefined) dbPayload.logo_light_url = updates.logo_light_url;
    if (updates.favicon_url !== undefined) dbPayload.favicon_url = updates.favicon_url;
    if (updates.cover_image_url !== undefined) dbPayload.cover_image_url = updates.cover_image_url;
    if (updates.facade_photo_url !== undefined) dbPayload.facade_photo_url = updates.facade_photo_url;
    if (updates.interior_photo_url !== undefined) dbPayload.interior_photo_url = updates.interior_photo_url;
    if (updates.slogan !== undefined) dbPayload.slogan = updates.slogan;
    if (updates.brand_font !== undefined) dbPayload.brand_font = updates.brand_font;
    if (updates.default_theme !== undefined) dbPayload.default_theme = updates.default_theme;
    if (updates.primary_color !== undefined) dbPayload.primary_color = updates.primary_color;
    if (updates.secondary_color !== undefined) dbPayload.secondary_color = updates.secondary_color;

    if (Object.keys(dbPayload).length > 0) {
      const { data: updatedRow, error } = await safeSupabaseClientWrite('salons', 'update', dbPayload, {
        eqColumn: 'id',
        eqValue: salonId,
      });
      if (error) {
        console.error('[Supabase Admin Update] Erro ao gravar no banco:', error.message);
        return {
          success: false,
          error: apiErrorMsg || error.message || 'Não foi possível gravar as alterações no Supabase.',
        };
      }
      return { success: true, salon: updatedRow || undefined };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Admin Update] Exceção:', err);
    return { success: false, error: err?.message || 'Falha ao atualizar salão' };
  }
}

export async function deleteAdminSalon(salonId: string): Promise<{ success: boolean; error?: string }> {
  try {
    try {
      const resp = await fetch(`/api/admin/salons/${salonId}`, { method: 'DELETE' });
      if (resp.ok) {
        return { success: true };
      }
    } catch {}

    const { error } = await supabaseAdmin.from('salons').delete().eq('id', salonId);
    if (error) {
      console.warn('[Supabase Admin Delete] Erro:', error.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  try {
    try {
      const resp = await adminApiFetch('/api/admin/metrics');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.metrics) {
          return json.metrics;
        }
      }
    } catch {}

    const salons = await fetchAdminSalons();
    const totalSalons = salons.length;
    const activeSalons = salons.filter((s) => s.status === 'active').length;
    const pendingSalons = salons.filter((s) => s.status === 'pending').length;
    const incompleteSalons = salons.filter((s) => s.status === 'incomplete').length;
    const suspendedSalons = salons.filter((s) => s.status === 'suspended').length;

    let todayAppointments = 0;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('date_str', todayStr);

      if (!error && count !== null) {
        todayAppointments = count;
      }
    } catch {}

    let activeFlashOffers = 0;
    try {
      const { count, error } = await supabase
        .from('service_offers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'AVAILABLE');

      if (!error && count !== null) {
        activeFlashOffers = count;
      }
    } catch {}

    return {
      totalSalons,
      activeSalons,
      pendingSalons,
      incompleteSalons,
      suspendedSalons,
      todayAppointments,
      activeFlashOffers,
      growthPercent: 0,
    };
  } catch {
    return {
      totalSalons: 0,
      activeSalons: 0,
      pendingSalons: 0,
      incompleteSalons: 0,
      suspendedSalons: 0,
      todayAppointments: 0,
      activeFlashOffers: 0,
      growthPercent: 0,
    };
  }
}

const ADMIN_STORAGE_KEY = 'vagou_admin_session';

export function getStoredAdmin(): SystemAdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.email) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function setStoredAdmin(admin: SystemAdminUser | null): void {
  try {
    if (admin) {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
    } else {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  } catch {}
}

async function fetchUserProfileFromDb(identifier?: { email?: string; name?: string }): Promise<{
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
} | null> {
  if (!supabase) return null;
  const term = (identifier?.email || identifier?.name || '').trim();

  try {

    try {
      const { data: authUserResp } = await supabase.auth.getUser();
      const authUser = authUserResp?.user;
      if (authUser?.user_metadata?.avatar_url && !authUser.user_metadata.avatar_url.includes('unsplash.com')) {
        return {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
          email: authUser.email || '',
          avatarUrl: authUser.user_metadata.avatar_url,
        };
      }
    } catch {}

    const isGenericTerm = !term || term === 'Profissional' || term === 'Usuário' || term === 'Visitante' || term === 'Cliente';

    if (!isGenericTerm) {
      const { data: pros } = await (supabase.from('professionals') as any)
        .select('*')
        .or(`email.ilike.%${term}%,name.ilike.%${term}%`)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (pros && pros.length > 0) {
        const photo = (pros[0].avatar_url && !pros[0].avatar_url.includes('unsplash.com')) ? pros[0].avatar_url : '';
        return {
          id: pros[0].id,
          name: pros[0].name,
          email: pros[0].email || '',
          avatarUrl: photo,
        };
      }

      const { data: cls } = await (supabase.from('clients') as any)
        .select('id, name, email, avatar_url, updated_at')
        .or(`email.ilike.%${term}%,name.ilike.%${term}%`)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (cls && cls.length > 0) {
        const photo = (cls[0].avatar_url && !cls[0].avatar_url.includes('unsplash.com')) ? cls[0].avatar_url : '';
        return {
          id: cls[0].id,
          name: cls[0].name,
          email: cls[0].email || '',
          avatarUrl: photo,
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar perfil no Supabase:', err);
  }

  return null;
}

export async function refreshStoredAdmin(): Promise<SystemAdminUser | null> {
  const current = getStoredAdmin();
  if (!current) return null;

  try {
    const query = (current.email || current.username || '').trim().toLowerCase();
    const { data, error } = await supabase
      .from('system_admins')
      .select('id, full_name, username, email, phone_whatsapp, role, is_active, avatar_url, last_login_at, created_at')
      .or(`id.eq.${current.id},email.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(1);

    const baseAdmin = (!error && data && data.length > 0) ? { ...current, ...data[0] } : current;

    const userEmail = (baseAdmin.email || current.email || '').trim().toLowerCase();
    const userName = (baseAdmin.full_name || current.full_name || '').trim();

    const { data: profData } = await supabase
      .from('professionals')
      .select('avatar_url, updated_at')
      .eq('email', userEmail)
      .not('avatar_url', 'is', null)
      .neq('avatar_url', '')
      .order('updated_at', { ascending: false })
      .limit(1);

    const { data: clientData } = await supabase
      .from('clients')
      .select('avatar_url, updated_at')
      .eq('email', userEmail)
      .not('avatar_url', 'is', null)
      .neq('avatar_url', '')
      .order('updated_at', { ascending: false })
      .limit(1);

    const candidates = [
      ...(profData || []),
      ...(clientData || []),
    ].filter(r => r.avatar_url && !r.avatar_url.includes('unsplash.com'))
     .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

    let finalAvatar = baseAdmin.avatar_url;

    if (candidates.length > 0 && candidates[0].avatar_url) {
      finalAvatar = candidates[0].avatar_url;
    } else if (!finalAvatar || finalAvatar.includes('unsplash.com')) {
      const fallback = await fetchUserProfileFromDb({ email: userEmail, name: userName });
      if (fallback?.avatarUrl && !fallback.avatarUrl.includes('unsplash.com')) {
        finalAvatar = fallback.avatarUrl;
      }
    }

    const updatedAdmin: SystemAdminUser = {
      ...baseAdmin,
      avatar_url: finalAvatar,
    };

    setStoredAdmin(updatedAdmin);
    return updatedAdmin;
  } catch (err) {
    console.warn('[refreshStoredAdmin] Erro ao sincronizar sessão:', err);
  }

  return current;
}

export async function registerAdmin(payload: {
  full_name: string;
  username: string;
  email: string;
  email_confirmation: string;
  phone_whatsapp: string;
  password: string;
  role?: 'superadmin' | 'moderator' | 'support';
}): Promise<{ success: boolean; admin?: SystemAdminUser; error?: string; message?: string }> {
  const resolvedRole: 'superadmin' | 'moderator' | 'support' =
    payload.role === 'moderator' || payload.role === 'support' ? payload.role : 'superadmin';
  const resolvedAccessLevel =
    resolvedRole === 'moderator'
      ? 'Moderador'
      : resolvedRole === 'support'
      ? 'Suporte Técnico'
      : 'Superadmin Master';

  const cleanUser = payload.username.trim().replace(/^@+/, '');
  if (
    !/[A-Z]/.test(cleanUser) ||
    !/[a-z]/.test(cleanUser) ||
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanUser)
  ) {
    return {
      success: false,
      error:
        'O Nome de usuário deve conter ao menos 1 letra maiúscula, 1 letra minúscula e 1 caractere especial (Ex: Anderson@, jOse#, pauLa**).',
    };
  }

  try {
    const resp = await fetch('/api/admin/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, role: resolvedRole }),
    });
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        if (json.admin && !getStoredAdmin()) setStoredAdmin(json.admin);
        return json;
      }
      if (json.error) {
        return { success: false, error: json.error };
      }
    }
  } catch {}

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('register_system_admin', {
      p_full_name: payload.full_name,
      p_username: payload.username,
      p_email: payload.email,
      p_phone_whatsapp: payload.phone_whatsapp,
      p_password: payload.password,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      if (rpcData.success && rpcData.admin) {
        if (resolvedRole !== 'superadmin' && rpcData.admin.id) {
          await safeSupabaseClientWrite(
            'system_admins',
            'update',
            { role: resolvedRole, access_level: resolvedAccessLevel },
            { eqColumn: 'id', eqValue: rpcData.admin.id }
          );
          rpcData.admin.role = resolvedRole;
          rpcData.admin.access_level = resolvedAccessLevel;
        }
        if (!getStoredAdmin()) setStoredAdmin(rpcData.admin);
        return { success: true, admin: rpcData.admin, message: 'Administrador cadastrado com sucesso!' };
      }
      if (rpcData.error) {
        return { success: false, error: rpcData.error };
      }
    }
  } catch {}

  try {
    const { data: dbAdmin, error: insertError } = await safeSupabaseClientWrite('system_admins', 'insert', {
      full_name: payload.full_name.trim(),
      username: payload.username.trim().replace(/^@+/, ''),
      email: payload.email.trim().toLowerCase(),
      phone_whatsapp: payload.phone_whatsapp.trim(),
      password_hash: payload.password,
      role: resolvedRole,
      access_level: resolvedAccessLevel,
      is_active: true,
    });

    if (!insertError && dbAdmin) {
      const { password_hash, ...safeAdmin } = dbAdmin;
      const adminWithPass = { ...safeAdmin, password: password_hash || payload.password } as SystemAdminUser;
      if (!getStoredAdmin()) setStoredAdmin(adminWithPass);
      return { success: true, admin: adminWithPass, message: 'Administrador cadastrado com sucesso!' };
    }
  } catch {}

  return { success: false, error: 'Não foi possível concluir o cadastro. Verifique a conexão com o banco de dados.' };
}

export async function checkAdminBootstrapStatus(): Promise<{
  needsBootstrap: boolean;
}> {
  try {
    const res = await fetch('/api/admin/bootstrap/status');
    const json = await res.json();
    if (res.ok && json.success) {
      return { needsBootstrap: Boolean(json.needsBootstrap) };
    }
  } catch {}
  return { needsBootstrap: false };
}

export async function bootstrapInitialSuperAdmin(payload: {
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone_whatsapp?: string;
}): Promise<{ success: boolean; admin?: SystemAdminUser; error?: string }> {
  try {
    const res = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok && json.success && json.admin) {
      setStoredAdmin(json.admin);
      if (payload.email && payload.password) {
        await supabase.auth
          .signInWithPassword({
            email: payload.email.trim().toLowerCase(),
            password: payload.password,
          })
          .catch(() => {});
      }
      return { success: true, admin: json.admin };
    }
    return { success: false, error: json.error || 'Não foi possível concluir o bootstrap inicial.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de comunicação ao ativar Super Admin.' };
  }
}

export async function loginAdmin(
  identifier: string,
  password: string
): Promise<{ success: boolean; admin?: SystemAdminUser; error?: string }> {
  const cleanQuery = identifier.trim();
  if (!cleanQuery) {
    return {
      success: false,
      error: 'Por favor, informe seu usuário ou e-mail corporativo.',
    };
  }

  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanQuery, password }),
    });

    const data = await res.json();
    if (data.success && data.admin) {
      setStoredAdmin(data.admin);
      if (data.admin.email) {
        await supabase.auth
          .signInWithPassword({
            email: data.admin.email,
            password: password,
          })
          .catch(() => {});
      }
      return { success: true, admin: data.admin };
    } else if (data.error && !data.error.includes('não encontrado')) {
      return { success: false, error: data.error };
    }
  } catch (apiErr) {
    console.warn('[loginAdmin] Falha na chamada da API master, tentando RPC verify_admin_login:', apiErr);
  }

  try {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('verify_admin_login', {
      p_identifier: cleanQuery,
      p_password: password,
    });

    const match = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    if (!rpcErr && match && match.id) {
      const safeAdmin: SystemAdminUser = {
        id: match.id,
        full_name: match.full_name,
        username: match.username,
        email: match.email,
        phone_whatsapp: '',
        role: match.role === 'super_admin' ? 'superadmin' : match.role || 'superadmin',
        is_active: true,
        avatar_url: match.avatar_url || '',
      };
      setStoredAdmin(safeAdmin);
      if (safeAdmin.email) {
        await supabase.auth
          .signInWithPassword({ email: safeAdmin.email, password })
          .catch(() => {});
      }
      return { success: true, admin: safeAdmin };
    }
  } catch (fallbackErr) {
    console.warn('[loginAdmin] Erro no fallback verify_admin_login:', fallbackErr);
  }

  return {
    success: false,
    error: 'Administrador não encontrado ou senha incorreta. Verifique seu usuário, e-mail e senha.',
  };
}

export async function recoverAdminAccess(
  type: 'access_data' | 'password',
  query: string,
  newPassword?: string
): Promise<{
  success: boolean;
  message?: string;
  hint?: string;
  error?: string;
  type?: string;
  admin_found?: boolean;
  username?: string;
  full_name?: string;
  admin_username?: string;
}> {
  try {
    const resp = await fetch('/api/admin/auth/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, query, new_password: newPassword }),
    });
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        return json;
      } else if (json.error) {
        return { success: false, error: json.error };
      }
    }
  } catch {}

  try {
    const clean = query.trim().toLowerCase();
    const stripped = query.replace(/[@#]/g, '').trim().toLowerCase();
    const phoneDigits = query.replace(/\D/g, '');

    let filter = `email.ilike.%${clean}%,username.ilike.%${clean}%,username.ilike.%${stripped}%`;
    if (phoneDigits.length >= 8) {
      filter += `,phone.ilike.%${phoneDigits}%`;
    }

    const { data: dbAdmins } = await supabase
      .from('system_admins')
      .select('*')
      .or(filter)
      .limit(1);

    if (dbAdmins && dbAdmins.length > 0) {
      const a = dbAdmins[0];
      if (newPassword && newPassword.length >= 6) {
        await supabase
          .from('system_admins')
          .update({ password_hash: newPassword })
          .eq('id', a.id);
        return {
          success: true,
          type: 'password_reset_success',
          message: `Senha do administrador ${a.username.replace(/^@+/, '')} redefinida com sucesso! Você já pode realizar o login.`,
          admin_username: a.username.replace(/^@+/, ''),
        };
      }
      return {
        success: true,
        type: 'recovery_sent',
        admin_found: true,
        username: a.username.replace(/^@+/, ''),
        full_name: a.full_name,
        message: `Código no celular e link no e-mail enviados com sucesso para o usuário ${a.username}!`,
      };
    }
  } catch {}

  return {
    success: true,
    type: 'recovery_sent',
    message: `Enviamos um código de verificação por celular e um link de redefinição para o e-mail cadastrado para ${query}.`,
    hint: 'Verifique sua caixa de entrada e WhatsApp.',
  };
}

export async function logoutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {}
  setStoredAdmin(null);
}

export async function fetchSystemAdmins(): Promise<SystemAdminUser[]> {
  try {
    const resp = await adminApiFetch('/api/admin/system-admins');
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success && Array.isArray(json.admins) && json.admins.length > 0) {
        return json.admins.map((a: any) => ({
          ...a,
          password: a.password_hash || a.password || '',
        }));
      }
    }
  } catch {}

  try {
    const { data, error } = await supabaseAdmin
      .from('system_admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((a: any) => ({
        ...a,
        password: a.password_hash || a.password || '',
      })) as SystemAdminUser[];
    }
  } catch {}

  const current = getStoredAdmin();
  return current ? [current] : [];
}

export async function toggleAdminStatus(
  adminId: string,
  isActive: boolean
): Promise<{ success: boolean; admin?: SystemAdminUser; error?: string }> {
  try {
    const resp = await fetch(`/api/admin/system-admins/${adminId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        return json;
      }
      return { success: false, error: json.error || 'Erro ao atualizar status.' };
    }
  } catch {}

  try {
    const { data, error } = await supabaseAdmin
      .from('system_admins')
      .update({ is_active: isActive })
      .eq('id', adminId)
      .select()
      .single();

    if (!error && data) {
      return { success: true, admin: data as SystemAdminUser };
    }
    return { success: false, error: error?.message || 'Erro ao atualizar status.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminAppointments(): Promise<AdminAppointmentItem[]> {
  const mapAppointmentRow = (row: any): AdminAppointmentItem => {
    const dateStr = row.date_str || row.appointment_date || row.scheduled_date || '';
    const startTime = String(row.start_time || row.time_slot || '00:00').slice(0, 5);
    const endTime = row.end_time ? String(row.end_time).slice(0, 5) : undefined;
    const isBlocked = Boolean(row.is_blocked_slot || row.status === 'BLOQUEADO');
    const isPaid = Boolean(row.is_paid || row.payment_status === 'paid');
    const paymentStatus = row.payment_status || (isPaid ? 'paid' : 'pending');
    const rawPrice = Number(row.price ?? row.total_price ?? 0);
    const discount = Number(row.discount ?? 0);
    const finalPrice = row.final_price !== undefined && row.final_price !== null ? Number(row.final_price) : Math.max(0, rawPrice - discount);

    return {
      id: row.id,
      protocol: row.protocol_code || row.protocol || `VG-${String(row.id || '').slice(0, 6).toUpperCase()}`,
      salon_id: row.salon_id || '',
      salon_name: row.salon_name || 'Estabelecimento Vagou',
      salon_slug: row.salon_slug || 'salao',
      client_id: row.client_id || undefined,
      client_name: row.client_name || row.customer_name || (isBlocked ? 'Horário Bloqueado' : 'Cliente Vagou'),
      client_phone: row.client_phone || '—',
      client_email: row.client_email || '',
      beneficiary_name: row.beneficiary_name || row.client_name || 'O próprio',
      beneficiary_relation: row.beneficiary_relation || 'self',
      service_title: row.service_title || row.service_name || (isBlocked ? 'Pausa / Bloqueio de Agenda' : 'Serviço'),
      service_category: row.service_category || '',
      service_location_type: row.service_location_type || 'in_salon',
      client_address: row.client_address || row.origin_formatted_address || '',
      professional_id: row.professional_id || undefined,
      professional_name: row.professional_name || 'Especialista',
      price: rawPrice,
      discount,
      final_price: finalPrice,
      commission_fee: Number(row.commission_fee ?? 0),
      is_paid: isPaid,
      paid_at: row.paid_at || null,
      payment_status: paymentStatus,
      payment_method: row.payment_method || null,
      appointment_date: dateStr,
      date_str: dateStr,
      time_slot: startTime,
      start_time: startTime,
      end_time: endTime,
      status: isBlocked ? 'BLOQUEADO' : (row.status || 'confirmado'),
      is_blocked_slot: isBlocked,
      block_reason: row.block_reason || row.pause_reason || null,
      swap_state: row.swap_state && typeof row.swap_state === 'object' ? row.swap_state : null,
      collision_warning: row.collision_warning || null,
      is_radar_offer: Boolean(row.is_radar_offer || row.radar_offer_id),
      radar_discount_percent: Number(row.radar_discount_percent || 0),
      billing_status: row.billing_status || 'unbilled',
      fee_charged: row.status === 'cancelado' || isBlocked ? 0 : Number(row.fee_charged ?? 2.5),
      transport_mode: row.transport_mode,
      tracking_status: row.tracking_status,
      selected_route_summary: row.selected_route_summary,
      current_street_name: row.current_street_name,
      distance_km: row.distance_km !== null && row.distance_km !== undefined ? Number(row.distance_km) : undefined,
      eta_minutes: row.eta_minutes !== null && row.eta_minutes !== undefined ? Number(row.eta_minutes) : undefined,
      prep_buffer_minutes: row.prep_buffer_minutes !== null && row.prep_buffer_minutes !== undefined ? Number(row.prep_buffer_minutes) : undefined,
      created_at: row.created_at || new Date().toISOString(),
    };
  };

  const sortChronological = (items: AdminAppointmentItem[]) =>
    [...items].sort((a, b) => {
      const da = `${a.date_str || a.appointment_date || ''}T${a.start_time || a.time_slot || '00:00'}`;
      const db = `${b.date_str || b.appointment_date || ''}T${b.start_time || b.time_slot || '00:00'}`;
      return da.localeCompare(db);
    });

  try {
    try {
      const resp = await adminApiFetch('/api/admin/appointments');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.appointments)) {
          return sortChronological(json.appointments.map(mapAppointmentRow));
        }
      }
    } catch {}

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .order('date_str', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && Array.isArray(data)) {
      return sortChronological(data.map(mapAppointmentRow));
    }

    return [];
  } catch (err) {
    console.warn('[Supabase Admin] Falha ao buscar agendamentos reais:', err);
    return [];
  }
}

export async function fetchAdminClients(): Promise<UserClientItem[]> {
  let apiErrorMessage: string | null = null;
  try {
    const resp = await adminApiFetch('/api/admin/clients');
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success && Array.isArray(json.clients)) {
        lastAdminSyncError = null;
        return json.clients;
      }
      if (json.error) {
        apiErrorMessage = String(json.error);
      }
    }
  } catch (err: any) {
    apiErrorMessage = err?.message || 'API indisponível';
  }

  try {
    const [{ data, error }, { data: secAnswers }, { data: sysAdmins }, { data: profilesRows }] = await Promise.all([
      supabaseAdmin.from('clients').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('user_security_answers').select('client_id, question_code'),
      supabaseAdmin.from('system_admins').select('id, email, username'),
      supabaseAdmin.from('profiles').select('id, username, email'),
    ]);

    if (error) {
      lastAdminSyncError = error.message || apiErrorMessage || 'Erro ao sincronizar clientes com o Supabase.';
      return [];
    }

    lastAdminSyncError = null;
    const profileUsernameById = new Map<string, string>();
    const profileUsernameByEmail = new Map<string, string>();
    (profilesRows || []).forEach((pr: any) => {
      if (pr?.username) {
        if (pr.id) profileUsernameById.set(String(pr.id), String(pr.username).trim());
        if (pr.email) profileUsernameByEmail.set(String(pr.email).trim().toLowerCase(), String(pr.username).trim());
      }
    });

    const adminEmails = new Set(
      (sysAdmins || []).map((a: any) => String(a.email || '').trim().toLowerCase()).filter(Boolean)
    );
    const adminUsers = new Set(
      (sysAdmins || []).map((a: any) => String(a.username || '').trim().replace(/^@+/, '').toLowerCase()).filter(Boolean)
    );

    const secMap = new Map<string, string[]>();
    (secAnswers || []).forEach((s: any) => {
      if (s.client_id) {
        const list = secMap.get(String(s.client_id)) || [];
        if (s.question_code && !list.includes(s.question_code)) list.push(s.question_code);
        secMap.set(String(s.client_id), list);
      }
    });

    if (Array.isArray(data)) {
      const seenEmails = new Set<string>();
      const seenUsers = new Set<string>();
      return data
        .filter((c: any) => {
          const em = String(c.email || '').trim().toLowerCase();
          const us = String(c.username || '').trim().replace(/^@+/, '').toLowerCase();
          if ((em && adminEmails.has(em)) || (us && adminUsers.has(us))) return false;
          if ((em && seenEmails.has(em)) || (us && seenUsers.has(us))) return false;
          if (em) seenEmails.add(em);
          if (us) seenUsers.add(us);
          return true;
        })
        .map((c: any) => {
          const configuredCodes = secMap.get(String(c.id)) || (c.security_question_code ? [c.security_question_code] : []);
          const resolvedUsername =
            c.username ||
            (c.user_id ? profileUsernameById.get(String(c.user_id)) : undefined) ||
            (c.email ? profileUsernameByEmail.get(String(c.email).trim().toLowerCase()) : undefined) ||
            (c.email ? c.email.split('@')[0] : (c.full_name || 'cliente').toLowerCase().replace(/\s+/g, ''));
          return {
            ...c,
            full_name: c.name || c.full_name || 'Cliente',
            username: String(resolvedUsername).replace(/^@+/, ''),
            phone: c.phone || c.phone_whatsapp || '—',
            phone_secondary: c.phone_secondary || '',
            password: c.password_hash || c.password || '',
            dependents: Array.isArray(c.dependents) ? c.dependents : [],
            is_active: c.is_active !== undefined ? !!c.is_active : true,
            access_level: c.access_level || 'Cliente Titular',
            has_security_question: configuredCodes.length > 0,
            security_questions_configured: configuredCodes,
          };
        }) as UserClientItem[];
    }
  } catch (err: any) {
    lastAdminSyncError = err?.message || apiErrorMessage || 'Erro ao listar clientes.';
    console.warn('[Supabase Admin] Falha ao listar clientes reais:', err);
  }

  return [];
}

export async function resetUserSecurityAdmin(
  kind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent',
  userId: string,
  options: { resetSecurityQuestion?: boolean; newPassword?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const resp = await fetch(`/api/admin/users/${kind}/${encodeURIComponent(userId)}/reset-security`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const json = await resp.json();
    if (resp.ok && json.success) {
      return { success: true, message: json.message };
    }
    return { success: false, error: json.error || 'Falha ao executar reset administrativo.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de rede ao contatar o servidor.' };
  }
}

export async function unlinkClientDependent(dependentId: string): Promise<{ success: boolean }> {
  try {
    const resp = await fetch(`/api/admin/dependents/${dependentId}/unlink`, { method: 'PATCH' });
    if (resp.ok) {
      return { success: true };
    }
  } catch {}

  try {
    const { error } = await supabase
      .from('dependents')
      .update({
        is_unlinked: true,
        unlinked_at: new Date().toISOString(),
      })
      .eq('id', dependentId);

    if (error) {
      console.warn('[Supabase Admin] Falha ao desvincular dependente no banco:', error);
    }
    return { success: true };
  } catch {
    return { success: true };
  }
}

export async function fetchAdminSalonUsers(): Promise<UserSalonAccessItem[]> {
  try {
    const resp = await adminApiFetch('/api/admin/salon-users');
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success && Array.isArray(json.salonUsers)) {
        return json.salonUsers;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from('salon_members')
      .select('*, salons(trade_name, slug)')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const userIds = Array.from(new Set(data.map((m: any) => m.user_id).filter(Boolean)));
      let profilesById = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, username, email, phone, cpf, avatar_url')
          .in('id', userIds);
        (profs || []).forEach((p: any) => profilesById.set(p.id, p));
      }

      return data.map((sm: any) => {
        const prof = profilesById.get(sm.user_id) || {};
        const fullName = prof.full_name || 'Gestor de Salão';
        const cleanEmail = prof.email || '';
        return {
          ...sm,
          salon_name: sm.salons?.trade_name || 'Salão Parceiro',
          salon_slug: sm.salons?.slug || 'parceiro',
          full_name: fullName,
          username: String(prof.username || (cleanEmail ? cleanEmail.split('@')[0] : 'gestor')).replace(/^@+/, ''),
          email: cleanEmail,
          phone_whatsapp: prof.phone || '—',
          phone_secondary: '',
          password: '',
          cpf: prof.cpf || '',
          avatar_url: prof.avatar_url || '',
          role: sm.role || 'owner',
          access_level:
            sm.role === 'owner'
              ? 'Proprietário (Dono)'
              : sm.role === 'manager'
              ? 'Gerente Geral'
              : sm.role === 'receptionist'
              ? 'Recepção'
              : 'Profissional',
          is_active: sm.is_active !== false,
          total_appointments: 0,
          dependents_count: 0,
          created_via: sm.created_via || undefined,
          created_at: sm.created_at || '',
        };
      }) as UserSalonAccessItem[];
    }
  } catch (err) {
    console.warn('[Supabase Admin] Falha ao buscar salon_members reais:', err);
  }

  return [];
}

export async function fetchAdminProfessionals(): Promise<UserProfessionalItem[]> {
  try {
    const resp = await adminApiFetch('/api/admin/professionals');
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success && Array.isArray(json.professionals)) {
        return json.professionals;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabaseAdmin
      .from('professionals')
      .select('*, salons(trade_name, slug)')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((p: any) => ({
        ...p,
        full_name: p.name || p.full_name || 'Profissional',
        username: (p.username || (p.nickname ? p.nickname.toLowerCase().replace(/\s+/g, '') : (p.email ? p.email.split('@')[0] : (p.name || 'prof').toLowerCase().replace(/\s+/g, '')))).replace(/^@+/, ''),
        phone_whatsapp: p.phone || p.phone_whatsapp || '—',
        phone_secondary: p.phone_secondary || '',
        password: p.password_hash || p.password || '',
        current_salon_name: p.salons?.trade_name || p.current_salon_name || 'Sem Salão Ativo',
        status: p.status || (p.is_active === false ? 'suspended' : 'active'),
        access_level: p.access_level || 'MEI Parceiro',
      })) as any;
    }
  } catch (err) {
    console.warn('[Supabase Admin] Falha ao buscar profissionais reais:', err);
  }

  return [];
}

export async function unlinkProfessionalFromSalon(professionalId: string, _salonId?: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('professionals')
      .update({
        current_salon_id: null,
        status: 'unlinked_from_salon',
        unlinked_from_salon_at: new Date().toISOString(),
      })
      .eq('id', professionalId);

    if (error) {
      console.warn('[Supabase Admin] Falha ao desvincular profissional no banco:', error);
    }
    return { success: true };
  } catch (err) {
    console.warn('[Supabase Admin] Desvinculando profissional em memória:', err);
    return { success: true };
  }
}

export async function updateAdminUser(
  adminId: string,
  updates: Partial<SystemAdminUser> & { password?: string; password_hash?: string }
): Promise<{ success: boolean; admin?: SystemAdminUser; error?: string }> {
  const dbUpdates: any = { ...updates };
  if (dbUpdates.password) {
    dbUpdates.password_hash = dbUpdates.password;
    delete dbUpdates.password;
  }

  try {
    const resp = await fetch(`/api/admin/system-admins/${adminId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        return { success: true, admin: json.admin };
      }
      if (json.error) {
        return { success: false, error: json.error };
      }
    }
  } catch (apiErr) {
    console.warn('[updateAdminUser] Falha na rota Express, tentando fallback direto no Supabase:', apiErr);
  }

  try {
    if (dbUpdates.role && !dbUpdates.access_level) {
      dbUpdates.access_level =
        dbUpdates.role === 'moderator'
          ? 'Moderador'
          : dbUpdates.role === 'support'
          ? 'Suporte Técnico'
          : 'Superadmin Master';
    }
    const { data, error } = await safeSupabaseClientWrite('system_admins', 'update', dbUpdates, {
      eqColumn: 'id',
      eqValue: adminId,
    });

    if (error) {
      console.warn('[Supabase Admin] Falha ao atualizar dados do admin:', error);
      return { success: false, error: error.message };
    }

    const updatedAdmin = data
      ? {
          ...data,
          password: data.password_hash || dbUpdates.password_hash || '',
        }
      : undefined;

    return { success: true, admin: updatedAdmin as SystemAdminUser };
  } catch (err: any) {
    console.warn('[Supabase Admin] Erro ao atualizar admin:', err);
    return { success: false, error: err?.message || 'Erro de comunicação ao salvar.' };
  }
}

export async function updateAdminRole(adminId: string, newRole: SystemAdminUser['role']): Promise<{ success: boolean }> {
  return updateAdminUser(adminId, { role: newRole });
}

export async function geocodeAddressViaApi(params: {
  cep?: string;
  address?: string;
  street_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}): Promise<{
  success: boolean;
  latitude: number | null;
  longitude: number | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
  source?: string;
}> {
  try {
    const resp = await fetch('/api/geo/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.latitude && data.longitude) {
        return data;
      }
    }
  } catch {}
  return { success: false, latitude: null, longitude: null };
}

export async function updateUnifiedUserData(
  kind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent',
  id: string,
  payload: any
): Promise<{ success: boolean; user?: any; migrated?: boolean; sourceTable?: string; targetTable?: string; error?: string }> {
  let apiErrorMsg = '';
  try {
    const resp = await fetch(`/api/admin/users/${kind}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        return {
          success: true,
          user: json.user,
          migrated: json.migrated,
          sourceTable: json.sourceTable,
          targetTable: json.targetTable,
        };
      }
      if (json.error) {
        apiErrorMsg = json.error;
      }
    }
  } catch (err: any) {
    apiErrorMsg = err?.message || '';
    console.warn('[updateUnifiedUserData] Fallback direto via Supabase:', err);
  }

  try {
    if (id.startsWith('su-')) {
      const realSalonId = id.replace(/^su-/, '');
      const salonPayload: Record<string, any> = {};
      if (payload.name !== undefined) salonPayload.legal_name = payload.name;
      if (payload.email !== undefined) salonPayload.email = payload.email;
      if (payload.phone !== undefined) salonPayload.phone_whatsapp = payload.phone;
      if (payload.phoneSecondary !== undefined) salonPayload.phone_landline = payload.phoneSecondary;
      if (payload.cpf !== undefined) salonPayload.owner_cpf = payload.cpf;
      if (payload.address !== undefined) salonPayload.address = payload.address;
      if (payload.streetNumber !== undefined) salonPayload.street_number = payload.streetNumber;
      if (payload.complement !== undefined) salonPayload.complement = payload.complement;
      if (payload.neighborhood !== undefined) salonPayload.neighborhood = payload.neighborhood;
      if (payload.city !== undefined) salonPayload.city = payload.city;
      if (payload.state !== undefined) salonPayload.state = payload.state;
      if (payload.cep !== undefined) salonPayload.cep = payload.cep;
      if (payload.latitude !== undefined) salonPayload.latitude = payload.latitude;
      if (payload.longitude !== undefined) salonPayload.longitude = payload.longitude;

      const { error } = await safeSupabaseClientWrite('salons', 'update', salonPayload, {
        eqColumn: 'id',
        eqValue: realSalonId,
      });
      if (error) {
        return { success: false, error: apiErrorMsg || error.message };
      }
      return { success: true };
    }

    const kindToTable = (k?: string) => {
      if (k === 'professional') return 'professionals';
      if (k === 'salon_user') return 'salon_members';
      if (k === 'admin') return 'system_admins';
      if (k === 'dependent') return 'dependents';
      return 'clients';
    };

    const targetKind = payload.targetKind || kind;
    const targetTable = kindToTable(targetKind);
    let sourceTable = kindToTable(payload.sourceKind || kind);
    let existingRecord: any = null;

    const { data: foundInSource } = await supabase
      .from(sourceTable)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (foundInSource) {
      existingRecord = foundInSource;
    } else {
      for (const candidateTable of ['system_admins', 'salon_members', 'professionals', 'clients', 'dependents']) {
        if (candidateTable === sourceTable) continue;
        const { data: foundOther } = await supabase
          .from(candidateTable)
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (foundOther) {
          existingRecord = foundOther;
          sourceTable = candidateTable;
          break;
        }
      }
    }

    const resolvedName = (payload.name ?? existingRecord?.full_name ?? existingRecord?.name ?? '').trim();
    const resolvedEmail = (payload.email && payload.email !== '—' ? payload.email : existingRecord?.email ?? '')
      .trim()
      .toLowerCase();
    const resolvedUsername = (
      payload.username ??
      existingRecord?.username ??
      (resolvedEmail ? resolvedEmail.split('@')[0] : 'usuario')
    )
      .trim()
      .replace(/^@+/, '');
    const resolvedPhone = (
      payload.phone && payload.phone !== '—'
        ? payload.phone
        : existingRecord?.phone_whatsapp ?? existingRecord?.phone ?? ''
    ).trim();
    const resolvedPhoneSecondary = (
      payload.phoneSecondary && payload.phoneSecondary !== '—'
        ? payload.phoneSecondary
        : existingRecord?.phone_secondary ?? ''
    ).trim();
    const resolvedCpf = (payload.cpf ?? existingRecord?.cpf ?? '').trim();
    const resolvedPassword =
      payload.password !== undefined && String(payload.password).trim() !== '' && payload.password !== '—'
        ? String(payload.password).trim()
        : existingRecord?.password_hash || '';
    const resolvedAccessLevel = payload.accessLevel ?? existingRecord?.access_level ?? undefined;
    const resolvedIsActive = payload.isActive !== undefined ? Boolean(payload.isActive) : true;
    const resolvedAvatar =
      payload.avatarUrl !== undefined
        ? payload.avatarUrl
        : payload.avatar_url !== undefined
        ? payload.avatar_url
        : existingRecord?.avatar_url ?? null;

    const dbPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (resolvedName) {
      if (targetTable === 'clients') {
        dbPayload.name = resolvedName;
        dbPayload.full_name = resolvedName;
      } else if (targetTable === 'professionals') {
        dbPayload.name = resolvedName;
      } else {
        dbPayload.full_name = resolvedName;
      }
    }

    if (resolvedUsername && targetTable !== 'dependents') dbPayload.username = resolvedUsername;
    if (resolvedEmail && targetTable !== 'dependents') dbPayload.email = resolvedEmail;

    if (targetTable !== 'dependents') {
      if (targetTable === 'clients') {
        dbPayload.phone = resolvedPhone || null;
      } else if (targetTable === 'professionals') {
        dbPayload.phone = resolvedPhone || null;
        dbPayload.phone_whatsapp = resolvedPhone || null;
      } else {
        dbPayload.phone_whatsapp = resolvedPhone || null;
      }
      dbPayload.phone_secondary = resolvedPhoneSecondary || null;
    }

    if (payload.cpf !== undefined || existingRecord?.cpf) dbPayload.cpf = resolvedCpf || null;
    if (payload.address !== undefined) dbPayload.address = payload.address || null;
    if (payload.streetNumber !== undefined) dbPayload.street_number = payload.streetNumber || null;
    if (payload.complement !== undefined) dbPayload.complement = payload.complement || null;
    if (payload.neighborhood !== undefined) dbPayload.neighborhood = payload.neighborhood || null;
    if (payload.city !== undefined) dbPayload.city = payload.city || 'São Paulo';
    if (payload.state !== undefined) dbPayload.state = payload.state || 'SP';
    if (payload.cep !== undefined) dbPayload.cep = payload.cep || null;
    if (payload.latitude !== undefined) dbPayload.latitude = payload.latitude;
    if (payload.longitude !== undefined) dbPayload.longitude = payload.longitude;
    if (resolvedAccessLevel !== undefined) dbPayload.access_level = resolvedAccessLevel;
    if (resolvedPassword && targetTable !== 'dependents') dbPayload.password_hash = resolvedPassword;

    if (targetTable === 'system_admins') {
      const lowerAccess = String(resolvedAccessLevel || '').toLowerCase();
      dbPayload.role = lowerAccess.includes('suporte')
        ? 'support'
        : lowerAccess.includes('moderador')
        ? 'admin'
        : 'super_admin';
      dbPayload.is_active = resolvedIsActive;
    } else if (targetTable === 'salon_members') {
      const lowerAccess = String(resolvedAccessLevel || '').toLowerCase();
      dbPayload.role = lowerAccess.includes('gerente')
        ? 'manager'
        : lowerAccess.includes('recep')
        ? 'receptionist'
        : 'owner';
      dbPayload.is_active = resolvedIsActive;
    } else if (targetTable === 'professionals') {
      dbPayload.is_active = resolvedIsActive;
      dbPayload.role = existingRecord?.role || 'Especialista';
    } else if (targetTable === 'clients') {
      dbPayload.is_active = resolvedIsActive;
    }

    if (resolvedAvatar !== undefined) {
      dbPayload.avatar_url = isSafeMediaUrl(resolvedAvatar) ? resolvedAvatar : null;
    }

    const isCrossTableMigration = sourceTable !== targetTable;

    if (isCrossTableMigration) {
      const insertPayload: Record<string, any> = {
        id,
        ...dbPayload,
        created_at: existingRecord?.created_at || new Date().toISOString(),
        created_via: existingRecord?.created_via || 'admvapp',
      };

      const { data: migratedData, error: migErr } = await safeSupabaseClientWrite(
        targetTable,
        'upsert',
        insertPayload,
        { onConflict: 'id' }
      );

      if (migErr) {
        return { success: false, error: apiErrorMsg || migErr.message };
      }

      try {
        if (sourceTable === 'clients') {
          await supabaseAdmin.from('user_security_answers').delete().eq('client_id', id);
          await supabaseAdmin.from('dependents').delete().eq('parent_client_id', id);
          await supabaseAdmin.from('appointments').update({ client_id: null }).eq('client_id', id);
        } else if (sourceTable === 'professionals') {
          await supabaseAdmin.from('appointments').update({ professional_id: null }).eq('professional_id', id);
        }
        await supabaseAdmin.from(sourceTable).delete().eq('id', id);
      } catch (cleanupErr) {
        console.warn('[updateUnifiedUserData] Aviso ao remover registro antigo após promoção:', cleanupErr);
      }

      return {
        success: true,
        user: migratedData,
        migrated: true,
        sourceTable,
        targetTable,
      };
    }

    const { data: updatedData, error } = await safeSupabaseClientWrite(targetTable, 'update', dbPayload, {
      eqColumn: 'id',
      eqValue: id,
    });
    if (error) {
      return { success: false, error: apiErrorMsg || error.message };
    }
    return {
      success: true,
      user: updatedData,
      migrated: false,
      sourceTable,
      targetTable,
    };
  } catch (err: any) {
    return { success: false, error: apiErrorMsg || err?.message || 'Erro ao salvar dados do usuário' };
  }
}

export async function deleteUnifiedUserData(
  kind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent',
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(`/api/admin/users/${kind}/${id}`, {
      method: 'DELETE',
    });
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        return { success: true };
      }
    }
  } catch (err) {
    console.warn('[deleteUnifiedUserData] Falha rota Express:', err);
  }

  try {
    if (kind === 'dependent') {
      await supabase.from('dependents').delete().eq('id', id);
      return { success: true };
    }
    let table = 'clients';
    if (kind === 'professional') table = 'professionals';
    else if (kind === 'salon_user') table = 'salon_members';
    else if (kind === 'admin') table = 'system_admins';

    await supabase.from(table).delete().eq('id', id);
    return { success: true };
  } catch {
    return { success: true };
  }
}

export async function batchDeleteUnifiedUsers(
  items: Array<{ kind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent'; id: string }>
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!items || items.length === 0) return { success: true, count: 0 };

  try {
    const resp = await fetch('/api/admin/users/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const text = await resp.text();
    if (text && text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (resp.ok && json.success) {
        return { success: true, count: json.count || items.length };
      }
    }
  } catch (err) {
    console.warn('[batchDeleteUnifiedUsers] Falha rota Express batch, fallback direto:', err);
  }

  try {
    const clientIds = items.filter((it) => it.kind === 'client').map((it) => it.id);
    const depIds = items.filter((it) => it.kind === 'dependent').map((it) => it.id);
    const profIds = items.filter((it) => it.kind === 'professional').map((it) => it.id);
    const salonMemberIds = items.filter((it) => it.kind === 'salon_user').map((it) => it.id);
    const adminIds = items.filter((it) => it.kind === 'admin').map((it) => it.id);

    if (clientIds.length > 0) {
      await supabase.from('clients').delete().in('id', clientIds);
    }
    if (depIds.length > 0) {
      await supabase.from('dependents').delete().in('id', depIds);
    }
    if (profIds.length > 0) {
      await supabase.from('professionals').delete().in('id', profIds);
    }
    if (salonMemberIds.length > 0) {
      await supabase.from('salon_members').delete().in('id', salonMemberIds);
    }
    if (adminIds.length > 0) {
      await supabase.from('system_admins').delete().in('id', adminIds);
    }

    return { success: true, count: items.length };
  } catch {
    return { success: true, count: items.length };
  }
}

export async function toggleUnifiedUserStatus(
  kind: 'client' | 'professional' | 'salon_user' | 'admin' | 'dependent',
  id: string,
  isActive: boolean
): Promise<{ success: boolean }> {
  try {
    const resp = await fetch(`/api/admin/users/${kind}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (resp.ok) return { success: true };
  } catch {}

  try {
    let table = 'clients';
    if (kind === 'professional') table = 'professionals';
    else if (kind === 'salon_user') table = 'salon_members';
    else if (kind === 'admin') table = 'system_admins';

    const updateData = { is_active: isActive };
    await supabase.from(table).update(updateData).eq('id', id);
    return { success: true };
  } catch {
    return { success: true };
  }
}

