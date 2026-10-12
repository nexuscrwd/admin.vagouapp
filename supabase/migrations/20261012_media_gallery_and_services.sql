-- ==============================================================================
-- 🏛️ VAGOUAPP — MIGRAÇÃO INCREMENTAL 20261012: MÍDIAS, SLIDES & ACERVO CENTRAL DA TRÍADE
-- Aplicação: admvapp (adm.vagouapp.com) ⇄ mnvapp (seunegocio) ⇄ pvapp (portal)
-- Seguro para rodar em clusters existentes sem perda de dados
-- ==============================================================================

-- 1. EXTENSÃO DA TABELA SERVICES (Suporte a Fotos, Vídeos 5s e Slides por Procedimento)
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS slides TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Sincroniza 'name' com 'title' caso exista registro legado
UPDATE public.services SET name = title WHERE name IS NULL AND title IS NOT NULL;
UPDATE public.services SET title = name WHERE title IS NULL AND name IS NOT NULL;

-- 2. EXTENSÃO DA TABELA SALONS (Status, Banner de Cabeçalho e Chave PIX)
ALTER TABLE public.salons 
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pix_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS operating_hours JSONB;

-- Sincroniza cover_image_url com cover_url
UPDATE public.salons SET cover_image_url = cover_url WHERE cover_image_url IS NULL AND cover_url IS NOT NULL;
UPDATE public.salons SET cover_url = cover_image_url WHERE cover_url IS NULL AND cover_image_url IS NOT NULL;

-- 3. NOVA TABELA: SALON_MEDIA_ITEMS (Acervo Central em 3 Abas: Fotos, Vídeos 5s, Imagens)
CREATE TABLE IF NOT EXISTS public.salon_media_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video')),
    media_group VARCHAR(20) NOT NULL DEFAULT 'fotos' CHECK (media_group IN ('fotos', 'videos', 'imagens')),
    category VARCHAR(50) NOT NULL DEFAULT 'servicos', -- servicos, profissionais, espaco, banner, logotipo
    duration_seconds INTEGER DEFAULT 5,
    is_cover BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_salon_media_items_salon ON public.salon_media_items(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_media_items_group ON public.salon_media_items(salon_id, media_group);
CREATE INDEX IF NOT EXISTS idx_salon_media_items_category ON public.salon_media_items(salon_id, category);

-- Trigger de Atualização Automática de updated_at
CREATE OR REPLACE FUNCTION public.handle_salon_media_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_salon_media_items_updated_at ON public.salon_media_items;
CREATE TRIGGER trigger_salon_media_items_updated_at
BEFORE UPDATE ON public.salon_media_items
FOR EACH ROW EXECUTE FUNCTION public.handle_salon_media_items_updated_at();

-- Políticas RLS (Row Level Security)
ALTER TABLE public.salon_media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura_Publica_Salon_Media_Items" ON public.salon_media_items;
CREATE POLICY "Leitura_Publica_Salon_Media_Items" ON public.salon_media_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert_Salon_Media_Items" ON public.salon_media_items;
CREATE POLICY "Insert_Salon_Media_Items" ON public.salon_media_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update_Salon_Media_Items" ON public.salon_media_items;
CREATE POLICY "Update_Salon_Media_Items" ON public.salon_media_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Delete_Salon_Media_Items" ON public.salon_media_items;
CREATE POLICY "Delete_Salon_Media_Items" ON public.salon_media_items FOR DELETE USING (true);

-- 4. SEEDS DEMONSTRATIVOS PARA O ACERVO CENTRAL (Inserção segura apenas se a tabela estiver vazia para o salão)
INSERT INTO public.salon_media_items (salon_id, title, url, type, media_group, category, duration_seconds, is_cover)
SELECT 
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Degradê Fade Master',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=80',
    'image',
    'fotos',
    'servicos',
    5,
    true
WHERE EXISTS (SELECT 1 FROM public.salons WHERE id = '11111111-1111-1111-1111-111111111101'::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.salon_media_items WHERE salon_id = '11111111-1111-1111-1111-111111111101'::uuid AND title = 'Degradê Fade Master');

INSERT INTO public.salon_media_items (salon_id, title, url, type, media_group, category, duration_seconds, is_cover)
SELECT 
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Lucas Silva (Barbeiro Master)',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&auto=format&fit=crop&q=80',
    'image',
    'fotos',
    'profissionais',
    5,
    false
WHERE EXISTS (SELECT 1 FROM public.salons WHERE id = '11111111-1111-1111-1111-111111111101'::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.salon_media_items WHERE salon_id = '11111111-1111-1111-1111-111111111101'::uuid AND title = 'Lucas Silva (Barbeiro Master)');

INSERT INTO public.salon_media_items (salon_id, title, url, type, media_group, category, duration_seconds, is_cover)
SELECT 
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Estrutura e Bancadas Vintage',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=80',
    'image',
    'fotos',
    'espaco',
    5,
    false
WHERE EXISTS (SELECT 1 FROM public.salons WHERE id = '11111111-1111-1111-1111-111111111101'::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.salon_media_items WHERE salon_id = '11111111-1111-1111-1111-111111111101'::uuid AND title = 'Estrutura e Bancadas Vintage');

INSERT INTO public.salon_media_items (salon_id, title, url, type, media_group, category, duration_seconds, is_cover)
SELECT 
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Corte Degradê em Ação 5s',
    'https://assets.mixkit.co/videos/preview/mixkit-barber-trimming-a-mans-beard-43093-large.mp4',
    'video',
    'videos',
    'servicos',
    5,
    false
WHERE EXISTS (SELECT 1 FROM public.salons WHERE id = '11111111-1111-1111-1111-111111111101'::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.salon_media_items WHERE salon_id = '11111111-1111-1111-1111-111111111101'::uuid AND title = 'Corte Degradê em Ação 5s');

INSERT INTO public.salon_media_items (salon_id, title, url, type, media_group, category, duration_seconds, is_cover)
SELECT 
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Banner Oficial Cabeçalho App',
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&auto=format&fit=crop&q=80',
    'image',
    'imagens',
    'banner',
    5,
    false
WHERE EXISTS (SELECT 1 FROM public.salons WHERE id = '11111111-1111-1111-1111-111111111101'::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.salon_media_items WHERE salon_id = '11111111-1111-1111-1111-111111111101'::uuid AND title = 'Banner Oficial Cabeçalho App');

INSERT INTO public.salon_media_items (salon_id, title, url, type, media_group, category, duration_seconds, is_cover)
SELECT 
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Logotipo Oficial Prime',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80',
    'image',
    'imagens',
    'logotipo',
    5,
    false
WHERE EXISTS (SELECT 1 FROM public.salons WHERE id = '11111111-1111-1111-1111-111111111101'::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.salon_media_items WHERE salon_id = '11111111-1111-1111-1111-111111111101'::uuid AND title = 'Logotipo Oficial Prime');
