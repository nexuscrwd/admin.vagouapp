import { supabaseAdmin } from '../services/supabase';

export interface ServiceGalleryPreset {
  id: string;
  category: 'unhas' | 'cabelo' | 'barba' | 'sobrancelhas' | 'estetica' | 'combos';
  categoryLabel: string;
  title: string;
  imageUrl: string;
  keywords: string[];
}

/**
 * Galeria Oficial Curada de Presets Fotográficos de Serviços (Tríade VagouApp)
 * Utilizada como acervo rápido de 1-toque e fallback automático para procedimentos sem imagem
 */
export const SERVICE_GALLERY_PRESETS: ServiceGalleryPreset[] = [
  // 1. UNHAS & MANICURE
  {
    id: 'preset-unha-1',
    category: 'unhas',
    categoryLabel: 'Unhas & Nail Art',
    title: 'Alongamento em Gel & Acabamento Nude',
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=80',
    keywords: ['alongamento', 'gel', 'fibra', 'nude', 'esmaltacao', 'unha'],
  },
  {
    id: 'preset-unha-2',
    category: 'unhas',
    categoryLabel: 'Unhas & Nail Art',
    title: 'Esmaltação Francesinha & Cuidados',
    imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=80',
    keywords: ['francesinha', 'manicure', 'cuticula', 'pes', 'maos', 'unha'],
  },
  {
    id: 'preset-unha-3',
    category: 'unhas',
    categoryLabel: 'Unhas & Nail Art',
    title: 'Nail Art Delicada & Joia',
    imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&auto=format&fit=crop&q=80',
    keywords: ['nail art', 'joia', 'decorada', 'esmalte', 'pedraria'],
  },

  // 2. CABELO
  {
    id: 'preset-cabelo-1',
    category: 'cabelo',
    categoryLabel: 'Cabelo & Penteados',
    title: 'Corte Degradê Navalhado (Fade Moderno)',
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
    keywords: ['corte', 'fade', 'degrade', 'masculino', 'navalha', 'maquina'],
  },
  {
    id: 'preset-cabelo-2',
    category: 'cabelo',
    categoryLabel: 'Cabelo & Penteados',
    title: 'Loiro Iluminado & Mechas em Camadas',
    imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&auto=format&fit=crop&q=80',
    keywords: ['loiro', 'mechas', 'balayage', 'luzes', 'coloracao', 'cabelo'],
  },
  {
    id: 'preset-cabelo-3',
    category: 'cabelo',
    categoryLabel: 'Cabelo & Penteados',
    title: 'Corte em Camadas & Escova Modelada',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    keywords: ['escova', 'corte feminino', 'camadas', 'chapinha', 'alisamento', 'botox'],
  },
  {
    id: 'preset-cabelo-4',
    category: 'cabelo',
    categoryLabel: 'Cabelo & Penteados',
    title: 'Finalização Clássica Pompadour',
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80',
    keywords: ['pompadour', 'social', 'tesoura', 'finalizacao'],
  },

  // 3. BARBA
  {
    id: 'preset-barba-1',
    category: 'barba',
    categoryLabel: 'Barba & Cuidados Masculinos',
    title: 'Barboterapia com Toalha Quente & Ozônio',
    imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80',
    keywords: ['barba', 'barboterapia', 'toalha quente', 'ozonio', 'oleo'],
  },
  {
    id: 'preset-barba-2',
    category: 'barba',
    categoryLabel: 'Barba & Cuidados Masculinos',
    title: 'Alinhamento de Barba & Contorno na Lâmina',
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
    keywords: ['alinhamento', 'barba desenhada', 'lamina', 'peeling barba'],
  },

  // 4. SOBRANCELHAS & CÍLIOS
  {
    id: 'preset-sobrancelha-1',
    category: 'sobrancelhas',
    categoryLabel: 'Sobrancelhas & Olhar',
    title: 'Design de Sobrancelhas com Henna Natural',
    imageUrl: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=800&auto=format&fit=crop&q=80',
    keywords: ['sobrancelha', 'henna', 'design', 'pinça', 'visagismo'],
  },
  {
    id: 'preset-sobrancelha-2',
    category: 'sobrancelhas',
    categoryLabel: 'Sobrancelhas & Olhar',
    title: 'Lash Lifting & Extensão de Cílios Fio a Fio',
    imageUrl: 'https://images.unsplash.com/photo-1588516903720-8ceb67f9ef84?w=800&auto=format&fit=crop&q=80',
    keywords: ['cilios', 'lash', 'extensao', 'volume russo', 'fio a fio'],
  },

  // 5. ESTÉTICA & SPA
  {
    id: 'preset-estetica-1',
    category: 'estetica',
    categoryLabel: 'Estética & Massoterapia',
    title: 'Limpeza de Pele Profunda & Peeling',
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    keywords: ['limpeza de pele', 'peeling', 'facial', 'cravos', 'revitalizacao'],
  },
  {
    id: 'preset-estetica-2',
    category: 'estetica',
    categoryLabel: 'Estética & Massoterapia',
    title: 'Massagem Relaxante & Drenagem Linfática',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80',
    keywords: ['massagem', 'drenagem', 'spa', 'relaxamento', 'corpo'],
  },

  // 6. COMBOS
  {
    id: 'preset-combo-1',
    category: 'combos',
    categoryLabel: 'Combos & Pacotes Promocionais',
    title: 'Combo Completo Cabelo + Barba + Sobrancelha',
    imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80',
    keywords: ['combo', 'pacote', 'completo', 'cabelo e barba', 'promocao'],
  },
  {
    id: 'preset-combo-2',
    category: 'combos',
    categoryLabel: 'Combos & Pacotes Promocionais',
    title: 'Combo Beleza Pé + Mão + Spa',
    imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&auto=format&fit=crop&q=80',
    keywords: ['pe e mao', 'combo feminino', 'spa dos pes', 'promocional'],
  },
];

/**
 * Retorna a foto curada mais recomendada com base na categoria ou título do serviço
 */
export function getCuratedServiceFallbackPhoto(category: string, title?: string): string {
  const normCat = (category || '').toLowerCase().trim();
  const normTitle = (title || '').toLowerCase().trim();

  // 1. Tenta correspondência direta por palavras-chave
  for (const preset of SERVICE_GALLERY_PRESETS) {
    if (preset.keywords.some((kw) => normTitle.includes(kw) || normCat.includes(kw))) {
      return preset.imageUrl;
    }
  }

  // 2. Correspondência por categoria primária
  if (normCat.includes('unha') || normCat.includes('manicure') || normCat.includes('pedicure') || normCat.includes('nail')) {
    return SERVICE_GALLERY_PRESETS.find((p) => p.category === 'unhas')?.imageUrl || SERVICE_GALLERY_PRESETS[0].imageUrl;
  }
  if (normCat.includes('barba') || normCat.includes('barbearia')) {
    return SERVICE_GALLERY_PRESETS.find((p) => p.category === 'barba')?.imageUrl || SERVICE_GALLERY_PRESETS[4].imageUrl;
  }
  if (normCat.includes('sobrancelha') || normCat.includes('cilios') || normCat.includes('olhar')) {
    return SERVICE_GALLERY_PRESETS.find((p) => p.category === 'sobrancelhas')?.imageUrl || SERVICE_GALLERY_PRESETS[7].imageUrl;
  }
  if (normCat.includes('estet') || normCat.includes('spa') || normCat.includes('massag')) {
    return SERVICE_GALLERY_PRESETS.find((p) => p.category === 'estetica')?.imageUrl || SERVICE_GALLERY_PRESETS[9].imageUrl;
  }
  if (normCat.includes('combo') || normCat.includes('pacote')) {
    return SERVICE_GALLERY_PRESETS.find((p) => p.category === 'combos')?.imageUrl || SERVICE_GALLERY_PRESETS[11].imageUrl;
  }

  // Fallback padrão para cabelo
  return SERVICE_GALLERY_PRESETS.find((p) => p.category === 'cabelo')?.imageUrl || SERVICE_GALLERY_PRESETS[3].imageUrl;
}

/**
 * Upload seguro de mídia para o bucket oficial 'salon-media' do Supabase Storage
 */
export async function uploadSalonMediaToStorage(
  fileOrBase64: File | Blob | string,
  salonId: string,
  folder: 'services' | 'branding' | 'gallery' = 'services'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    let blob: Blob;
    let ext = 'jpg';
    let mimeType = 'image/jpeg';

    if (typeof fileOrBase64 === 'string') {
      if (!fileOrBase64.startsWith('data:')) {
        return { success: true, url: fileOrBase64 };
      }
      const res = await fetch(fileOrBase64);
      blob = await res.blob();
      mimeType = blob.type || 'image/jpeg';
      ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    } else {
      blob = fileOrBase64;
      mimeType = fileOrBase64.type || 'image/jpeg';
      ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    }

    const cleanSalonId = salonId.slice(0, 12);
    const fileName = `${folder}/${cleanSalonId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from('salon-media')
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (upErr) {
      // Fallback para bucket 'media' caso 'salon-media' ainda não tenha sido criado
      const { error: fallbackErr } = await supabaseAdmin.storage
        .from('media')
        .upload(fileName, blob, { contentType: mimeType, upsert: true });

      if (fallbackErr) {
        return { success: false, error: upErr.message };
      }
      const { data: pubData } = supabaseAdmin.storage.from('media').getPublicUrl(fileName);
      return { success: true, url: pubData.publicUrl };
    }

    const { data: pubData } = supabaseAdmin.storage.from('salon-media').getPublicUrl(fileName);
    return { success: true, url: pubData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha no upload' };
  }
}
