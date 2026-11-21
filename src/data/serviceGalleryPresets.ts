export interface ServiceGalleryPreset {
  id: string;
  category: 'unhas' | 'cabelo' | 'barba' | 'sobrancelhas' | 'estetica' | 'combos';
  categoryLabel: string;
  title: string;
  imageUrl: string;
  keywords: string[];
}

export const SERVICE_GALLERY_PRESETS: ServiceGalleryPreset[] = [

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
