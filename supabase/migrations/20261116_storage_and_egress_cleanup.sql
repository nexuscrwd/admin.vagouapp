-- =============================================================================
-- 🛠️ VAGOUAPP TRÍADE — MIGRAÇÃO & BLINDAGEM ANTI-EGRESS / STORAGE (bol-171)
-- Data: 2026-11-16
-- =============================================================================

BEGIN;

-- 1. Homologação dos Buckets Públicos no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('salon-media', 'salon-media', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'video/mp4', 'video/webm']),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif']),
  ('media', 'media', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas RLS de Storage (Desbloqueia 'media', 'salon-media' e 'avatars')
DROP POLICY IF EXISTS "triade_public_read_storage_objects" ON storage.objects;
CREATE POLICY "triade_public_read_storage_objects"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('salon-media', 'avatars', 'media'));

DROP POLICY IF EXISTS "triade_public_insert_storage_objects" ON storage.objects;
CREATE POLICY "triade_public_insert_storage_objects"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('salon-media', 'avatars', 'media'));

DROP POLICY IF EXISTS "triade_public_update_storage_objects" ON storage.objects;
CREATE POLICY "triade_public_update_storage_objects"
  ON storage.objects FOR UPDATE
  USING (bucket_id IN ('salon-media', 'avatars', 'media'))
  WITH CHECK (bucket_id IN ('salon-media', 'avatars', 'media'));

DROP POLICY IF EXISTS "triade_public_delete_storage_objects" ON storage.objects;
CREATE POLICY "triade_public_delete_storage_objects"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('salon-media', 'avatars', 'media'));

-- 3. Limpeza Preventiva de qualquer resíduo Base64 (> 4 KB) nas colunas reais do banco
UPDATE public.salons
SET
  logo_url = CASE WHEN logo_url LIKE 'data:%' AND length(logo_url) > 4096 THEN NULL ELSE logo_url END,
  logo_light_url = CASE WHEN logo_light_url LIKE 'data:%' AND length(logo_light_url) > 4096 THEN NULL ELSE logo_light_url END,
  logo_dark_url = CASE WHEN logo_dark_url LIKE 'data:%' AND length(logo_dark_url) > 4096 THEN NULL ELSE logo_dark_url END,
  cover_url = CASE WHEN cover_url LIKE 'data:%' AND length(cover_url) > 4096 THEN NULL ELSE cover_url END,
  cover_image_url = CASE WHEN cover_image_url LIKE 'data:%' AND length(cover_image_url) > 4096 THEN NULL ELSE cover_image_url END,
  favicon_url = CASE WHEN favicon_url LIKE 'data:%' AND length(favicon_url) > 4096 THEN NULL ELSE favicon_url END,
  facade_photo_url = CASE WHEN facade_photo_url LIKE 'data:%' AND length(facade_photo_url) > 4096 THEN NULL ELSE facade_photo_url END,
  interior_photo_url = CASE WHEN interior_photo_url LIKE 'data:%' AND length(interior_photo_url) > 4096 THEN NULL ELSE interior_photo_url END
WHERE
  logo_url LIKE 'data:%'
  OR logo_light_url LIKE 'data:%'
  OR logo_dark_url LIKE 'data:%'
  OR cover_url LIKE 'data:%'
  OR cover_image_url LIKE 'data:%'
  OR favicon_url LIKE 'data:%'
  OR facade_photo_url LIKE 'data:%'
  OR interior_photo_url LIKE 'data:%';

UPDATE public.appointments
SET
  salon_logo_url = CASE WHEN salon_logo_url LIKE 'data:%' AND length(salon_logo_url) > 4096 THEN NULL ELSE salon_logo_url END,
  professional_avatar_url = CASE WHEN professional_avatar_url LIKE 'data:%' AND length(professional_avatar_url) > 4096 THEN NULL ELSE professional_avatar_url END,
  client_avatar_url = CASE WHEN client_avatar_url LIKE 'data:%' AND length(client_avatar_url) > 4096 THEN NULL ELSE client_avatar_url END
WHERE
  salon_logo_url LIKE 'data:%'
  OR professional_avatar_url LIKE 'data:%'
  OR client_avatar_url LIKE 'data:%';

DELETE FROM public.salon_media_items
WHERE url LIKE 'data:%' AND length(url) > 4096;

-- 4. Índices de Performance para Consultas de Alta Frequência
CREATE INDEX IF NOT EXISTS idx_admin_preferences_updated_at ON public.admin_preferences (id, updated_at);
CREATE INDEX IF NOT EXISTS idx_professionals_email_updated_at ON public.professionals (email, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_email_updated_at ON public.clients (email, updated_at DESC);

COMMIT;

-- 5. Atualização imediata das estatísticas das tabelas
ANALYZE public.salons;
ANALYZE public.admin_preferences;
ANALYZE public.salon_media_items;
ANALYZE public.appointments;
ANALYZE public.system_admins;
ANALYZE public.clients;
ANALYZE public.professionals;
