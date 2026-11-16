-- ============================================================================
-- 🛡️ MIGRATION SOBERANA (bol-167.2): TABELA admin_preferences PARA PERSISTÊNCIA GLOBAL
-- ============================================================================
-- Garante que as preferências visuais (logotipos, ícone mobile, favicon, cores e fontes)
-- sejam persistidas no banco Supabase, permitindo sincronização instantânea em qualquer
-- navegador (Chrome, Edge, Safari, Mobile) e dispositivo.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_preferences (
  id TEXT PRIMARY KEY DEFAULT 'global',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserção padrão inicial se não existir
INSERT INTO public.admin_preferences (id, preferences)
VALUES (
  'global',
  '{
    "logoDarkUrl": "",
    "logoLightUrl": "",
    "mobileAppIconUrl": "",
    "faviconUrl": "",
    "dark": {},
    "light": {}
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Habilita RLS de forma permissiva para leitura pública e escrita autenticada/service_role
ALTER TABLE public.admin_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read admin_preferences" ON public.admin_preferences;
CREATE POLICY "Allow public read admin_preferences"
  ON public.admin_preferences
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow all write admin_preferences" ON public.admin_preferences;
CREATE POLICY "Allow all write admin_preferences"
  ON public.admin_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMIT;
