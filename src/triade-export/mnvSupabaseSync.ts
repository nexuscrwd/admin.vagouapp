/**
 * ============================================================================
 * 🏛️ TRÍADE VAGOU: PONTE UNIFICADA DE SINCRONIZAÇÃO SUPABASE (MNVAPP ⇄ ADMVAPP)
 * ============================================================================
 * Copie este arquivo para `src/services/mnvSupabaseSync.ts` no projeto
 * Meu Negócio (mnvapp - https://github.com/nexuscrwd/vagouapp.git)
 * para garantir sincronismo bidirecional 100% em tempo real com o Admin-VagouApp.
 * ============================================================================
 */

import { supabase } from '../services/supabase';

/**
 * 1. SINCRONIZAÇÃO DE SERVIÇOS (Catálogo Duplo: salon_services + services)
 * Chamado em: SalonCatalogModal.tsx ao criar/editar/excluir serviços.
 */
export async function syncSalonServiceToDatabase(
  salonId: string,
  service: {
    id?: string;
    name: string;
    category: string;
    price: number;
    durationMinutes: number;
    commissionRate?: number;
    description?: string;
    photos?: string[];
    videos?: { id: string; url: string; title?: string; duration_seconds: number }[];
    slides?: string[];
    isActive?: boolean;
  }
) {
  const payload = {
    salon_id: salonId,
    name: service.name,
    category: service.category || 'Geral',
    price: Number(service.price) || 0,
    duration_minutes: Number(service.durationMinutes) || 30,
    commission_rate: Number(service.commissionRate ?? 50),
    description: service.description || '',
    photos: service.photos || [],
    videos: service.videos || [],
    slides: service.slides || [],
    is_active: service.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  // Sincroniza tanto em salon_services (usado pelo mnvapp) quanto em services (usado pelo admvapp e pvapp)
  const [resSalonServices, resServices] = await Promise.all([
    supabase.from('salon_services').upsert(payload),
    supabase.from('services').upsert(payload),
  ]);

  return { resSalonServices, resServices };
}

/**
 * 2. SINCRONIZAÇÃO DE GALERIA DE FOTOS, VÍDEOS 5S E IMAGENS
 * Chamado em: SalonConfigModal.tsx e Galeria de Mídias ao subir foto/vídeo.
 */
export async function syncSalonMediaToDatabase(
  salonId: string,
  mediaItem: {
    id?: string;
    title: string;
    url: string;
    type: 'image' | 'video';
    media_group: 'fotos' | 'videos' | 'imagens';
    category: 'servicos' | 'profissionais' | 'espaco' | 'banner' | 'logotipo';
    duration_seconds?: number;
    is_cover?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('salon_media_items')
    .upsert({
      ...(mediaItem.id && mediaItem.id.length === 36 ? { id: mediaItem.id } : {}),
      salon_id: salonId,
      title: mediaItem.title,
      url: mediaItem.url,
      type: mediaItem.type,
      media_group: mediaItem.media_group,
      category: mediaItem.category,
      duration_seconds: mediaItem.duration_seconds || 5,
      is_cover: mediaItem.is_cover || false,
    })
    .select()
    .single();

  if (mediaItem.is_cover || mediaItem.category === 'banner') {
    await supabase.from('salons').update({ cover_image_url: mediaItem.url }).eq('id', salonId);
  }
  if (mediaItem.category === 'logotipo') {
    await supabase.from('salons').update({ logo_url: mediaItem.url }).eq('id', salonId);
  }

  return { data, error };
}

/**
 * 3. SINCRONIZAÇÃO DO TEMA CAMALEÃO & ESPAÇO FÍSICO
 * Chamado em: SalonConfigModal.tsx ao selecionar preset ou salvar fachada/interior.
 */
export async function syncSalonThemeAndBranding(
  salonId: string,
  themeData: {
    themePresetId: 'emerald-dark' | 'gold-luxury' | 'rose-glam' | 'purple-neon' | 'clean-light';
    primaryColor?: string;
    secondaryColor?: string;
    facadePhotoUrl?: string;
    interiorPhotoUrl?: string;
    logoUrl?: string;
    coverImageUrl?: string;
  }
) {
  const { data: currentSalon } = await supabase
    .from('salons')
    .select('branding')
    .eq('id', salonId)
    .maybeSingle();

  const updatedBranding = {
    ...(currentSalon?.branding || {}),
    themePresetId: themeData.themePresetId,
    primaryColor: themeData.primaryColor,
    secondaryColor: themeData.secondaryColor,
    facadePhotoUrl: themeData.facadePhotoUrl,
    interiorPhotoUrl: themeData.interiorPhotoUrl,
  };

  return await supabase
    .from('salons')
    .update({
      theme_preset_id: themeData.themePresetId,
      primary_color: themeData.primaryColor,
      secondary_color: themeData.secondaryColor,
      facade_photo_url: themeData.facadePhotoUrl,
      interior_photo_url: themeData.interiorPhotoUrl,
      ...(themeData.logoUrl ? { logo_url: themeData.logoUrl } : {}),
      ...(themeData.coverImageUrl ? { cover_image_url: themeData.coverImageUrl } : {}),
      branding: updatedBranding,
      updated_at: new Date().toISOString(),
    })
    .eq('id', salonId);
}

/**
 * 4. SINCRONIZAÇÃO DE PROFISSIONAIS (Equipe & Comissões)
 * Chamado em: SalonTeamModal.tsx ao cadastrar/editar colaborador.
 */
export async function syncSalonProfessionalToDatabase(
  salonId: string,
  pro: {
    id?: string;
    name: string;
    role: string;
    accessLevel?: 'admin' | 'professional' | 'receptionist';
    phone?: string;
    email?: string;
    avatarUrl?: string;
    commissionRate: number;
    productCommissionRate?: number;
    specialties?: string[];
    isActive?: boolean;
  }
) {
  return await supabase.from('professionals').upsert({
    ...(pro.id && pro.id.length === 36 ? { id: pro.id } : {}),
    salon_id: salonId,
    name: pro.name,
    role: pro.role || 'Profissional',
    access_level: pro.accessLevel || 'professional',
    phone: pro.phone || '',
    phone_whatsapp: pro.phone || '',
    email: pro.email || '',
    avatar_url: pro.avatarUrl || '',
    commission_rate: Number(pro.commissionRate) || 50,
    product_commission_rate: Number(pro.productCommissionRate ?? 10),
    specialties: pro.specialties || [],
    is_active: pro.isActive ?? true,
    updated_at: new Date().toISOString(),
  });
}

/**
 * 5. SINCRONIZAÇÃO DE CONTA FAMÍLIA & DEPENDENTES (public.dependents)
 * Chamado em: ProfileDrawer.tsx (aba Conta Família) e SalonBookingModal.tsx.
 */
export async function syncClientDependentToDatabase(
  parentClientId: string,
  dependent: {
    id?: string;
    full_name: string;
    relationship: 'son' | 'daughter' | 'spouse' | 'parent' | 'other';
    birth_date?: string;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('dependents')
    .upsert({
      ...(dependent.id && dependent.id.length === 36 ? { id: dependent.id } : {}),
      parent_client_id: parentClientId,
      full_name: dependent.full_name,
      relationship: dependent.relationship,
      birth_date: dependent.birth_date || null,
      notes: dependent.notes || '',
      is_unlinked: false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  const { count } = await supabase
    .from('dependents')
    .select('id', { count: 'exact', head: true })
    .eq('parent_client_id', parentClientId)
    .eq('is_unlinked', false);

  await supabase
    .from('clients')
    .update({ dependents_count: count || 0 })
    .eq('id', parentClientId);

  return { data, error };
}

/**
 * 6. SINCRONIZAÇÃO DAS FERRAMENTAS DE UTILIDADES (Energia, Água, Equipamentos, DRE & Insumos)
 * Chamado em: SalonUtilitiesModal.tsx sempre que os estados mudarem no localStorage.
 */
export async function syncSalonUtilitiesToDatabase(
  salonId: string,
  utilitiesPayload: {
    energy_meters?: unknown[];
    energy_readings?: unknown[];
    water_meters?: unknown[];
    water_readings?: unknown[];
    appliances?: unknown[];
    dre_records?: unknown[];
    supply_items?: unknown[];
  }
) {
  return await supabase.from('salon_utilities_records').upsert(
    {
      salon_id: salonId,
      ...utilitiesPayload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'salon_id' }
  );
}
