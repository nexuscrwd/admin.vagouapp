-- ============================================================================
-- 🏛️ VAGOUAPP TRIAD MASTER CONVERGENCE SQL MIGRATION (bol-022)
-- Date: 2026-10-23
-- Target Database: Supabase PostgreSQL 17.6 (Single Source of Truth)
-- Beneficiaries: admvapp (Admin) | mnvapp (Meu Negócio) | pvapp (Portal Marketplace)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CORREÇÃO DE ESTRUTURA E COLUNAS FALTANTES (SCHEMA HARMONIZATION)
-- ----------------------------------------------------------------------------

-- A. public.salon_clients (Remoção da trava NOT NULL em client_user_id)
ALTER TABLE public.salon_clients ALTER COLUMN client_user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salon_clients_salon_client ON public.salon_clients(salon_id, client_id);
CREATE INDEX IF NOT EXISTS idx_salon_clients_client_user_id ON public.salon_clients(client_user_id);

-- B. public.professionals (Colunas de comissão e desvinculação)
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS product_commission_rate numeric(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS unlinked_from_salon_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_secondary text,
  ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'MEI Parceiro';

-- C. public.services & public.salon_services (Sincronização de catálogo)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS gender_target text DEFAULT 'unisex',
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.salon_services
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS gender_target text DEFAULT 'unisex',
  ADD COLUMN IF NOT EXISTS image_url text;

-- D. public.appointments (Suporte a rastreamento live 10s, dependentes e cancelamento)
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
  ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beneficiary_name text,
  ADD COLUMN IF NOT EXISTS beneficiary_relation text;

-- E. public.salons & public.salon_ui_settings (Estilização White-Label e Branding)
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
  ADD COLUMN IF NOT EXISTS nav_style text DEFAULT 'minimal',
  ADD COLUMN IF NOT EXISTS nav_shape text DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS nav_border text DEFAULT 'bordered',
  ADD COLUMN IF NOT EXISTS nav_bg_style text DEFAULT 'glass',
  ADD COLUMN IF NOT EXISTS nav_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_btn_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_btn_active_bg_color text,
  ADD COLUMN IF NOT EXISTS nav_active_color text DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS nav_text_color text;

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

-- F. public.client_family_members & public.dependents (Espelhamento seguro)
ALTER TABLE public.client_family_members
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS parent_client_id uuid,
  ADD COLUMN IF NOT EXISTS salon_id uuid,
  ADD COLUMN IF NOT EXISTS is_unlinked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlinked_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS birth_date date;

ALTER TABLE public.dependents
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- G. Endereço Completo & Coordenadas de Geolocalização (salons, clients, professionals, profiles, salon_users)
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS owner_cpf text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

ALTER TABLE public.salon_users
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

CREATE INDEX IF NOT EXISTS idx_salons_owner_cpf ON public.salons(owner_cpf);
CREATE INDEX IF NOT EXISTS idx_salons_coords ON public.salons(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON public.clients(cpf);
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON public.professionals(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_salon_users_cpf ON public.salon_users(cpf);



-- ----------------------------------------------------------------------------
-- 2. CORREÇÃO DE TRIGGERS E PREVENÇÃO DE LOOPS RECURSIVOS (pg_trigger_depth)
-- ----------------------------------------------------------------------------

-- A. Sincronização Bidirecional de Serviços (services <-> salon_services)
CREATE OR REPLACE FUNCTION public.sync_services_to_salon_services()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF pg_trigger_depth() <= 1 THEN
    INSERT INTO public.salon_services (
      id, salon_id, title, description, price, duration_minutes, category, is_active, gender_target, image_url
    ) VALUES (
      NEW.id, NEW.salon_id, NEW.title, NEW.description, NEW.price, NEW.duration_minutes, NEW.category, COALESCE(NEW.is_active, true), COALESCE(NEW.gender_target, 'unisex'), NEW.image_url
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      duration_minutes = EXCLUDED.duration_minutes,
      category = EXCLUDED.category,
      is_active = EXCLUDED.is_active,
      gender_target = EXCLUDED.gender_target,
      image_url = EXCLUDED.image_url,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_salon_services_to_services()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF pg_trigger_depth() <= 1 THEN
    INSERT INTO public.services (
      id, salon_id, title, description, price, duration_minutes, category, is_active, gender_target, image_url
    ) VALUES (
      NEW.id, NEW.salon_id, NEW.title, NEW.description, NEW.price, NEW.duration_minutes, NEW.category, COALESCE(NEW.is_active, true), COALESCE(NEW.gender_target, 'unisex'), NEW.image_url
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      duration_minutes = EXCLUDED.duration_minutes,
      category = EXCLUDED.category,
      is_active = EXCLUDED.is_active,
      gender_target = EXCLUDED.gender_target,
      image_url = EXCLUDED.image_url,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_services_to_salon_services ON public.services;
CREATE TRIGGER trg_sync_services_to_salon_services
  AFTER INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.sync_services_to_salon_services();

DROP TRIGGER IF EXISTS trg_sync_salon_services_to_services ON public.salon_services;
CREATE TRIGGER trg_sync_salon_services_to_services
  AFTER INSERT OR UPDATE ON public.salon_services
  FOR EACH ROW EXECUTE FUNCTION public.sync_salon_services_to_services();


-- B. Sincronização Bidirecional de Dependentes (dependents <-> client_family_members)
CREATE OR REPLACE FUNCTION public.normalize_client_family_member_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.full_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.full_name := NEW.name;
  END IF;
  IF NEW.name IS NULL AND NEW.full_name IS NOT NULL THEN
    NEW.name := NEW.full_name;
  END IF;
  IF NEW.parent_client_id IS NULL AND NEW.client_id IS NOT NULL THEN
    NEW.parent_client_id := NEW.client_id;
  END IF;
  IF NEW.client_id IS NULL AND NEW.parent_client_id IS NOT NULL THEN
    NEW.client_id := NEW.parent_client_id;
  END IF;

  IF pg_trigger_depth() <= 1 THEN
    INSERT INTO public.dependents (
      id, parent_client_id, client_id, full_name, name, relationship, birth_date, avatar_url, notes, is_unlinked, unlinked_at, salon_id
    ) VALUES (
      NEW.id, NEW.parent_client_id, NEW.client_id, COALESCE(NEW.full_name, NEW.name), COALESCE(NEW.name, NEW.full_name), NEW.relationship, NEW.birth_date, NEW.avatar_url, NEW.notes, COALESCE(NEW.is_unlinked, false), NEW.unlinked_at, NEW.salon_id
    )
    ON CONFLICT (id) DO UPDATE SET
      parent_client_id = EXCLUDED.parent_client_id,
      client_id = EXCLUDED.client_id,
      full_name = EXCLUDED.full_name,
      name = EXCLUDED.name,
      relationship = EXCLUDED.relationship,
      birth_date = EXCLUDED.birth_date,
      avatar_url = EXCLUDED.avatar_url,
      notes = EXCLUDED.notes,
      is_unlinked = EXCLUDED.is_unlinked,
      unlinked_at = EXCLUDED.unlinked_at,
      salon_id = EXCLUDED.salon_id,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_dependents_to_family_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.full_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.full_name := NEW.name;
  END IF;
  IF NEW.name IS NULL AND NEW.full_name IS NOT NULL THEN
    NEW.name := NEW.full_name;
  END IF;
  IF NEW.parent_client_id IS NULL AND NEW.client_id IS NOT NULL THEN
    NEW.parent_client_id := NEW.client_id;
  END IF;
  IF NEW.client_id IS NULL AND NEW.parent_client_id IS NOT NULL THEN
    NEW.client_id := NEW.parent_client_id;
  END IF;

  IF pg_trigger_depth() <= 1 THEN
    INSERT INTO public.client_family_members (
      id, client_id, parent_client_id, name, full_name, relationship, birth_date, avatar_url, notes, is_unlinked, unlinked_at, salon_id
    ) VALUES (
      NEW.id, NEW.client_id, NEW.parent_client_id, COALESCE(NEW.name, NEW.full_name), COALESCE(NEW.full_name, NEW.name), NEW.relationship, NEW.birth_date, NEW.avatar_url, NEW.notes, COALESCE(NEW.is_unlinked, false), NEW.unlinked_at, NEW.salon_id
    )
    ON CONFLICT (id) DO UPDATE SET
      client_id = EXCLUDED.client_id,
      parent_client_id = EXCLUDED.parent_client_id,
      name = EXCLUDED.name,
      full_name = EXCLUDED.full_name,
      relationship = EXCLUDED.relationship,
      birth_date = EXCLUDED.birth_date,
      avatar_url = EXCLUDED.avatar_url,
      notes = EXCLUDED.notes,
      is_unlinked = EXCLUDED.is_unlinked,
      unlinked_at = EXCLUDED.unlinked_at,
      salon_id = EXCLUDED.salon_id,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_client_family_member ON public.client_family_members;
CREATE TRIGGER trg_normalize_client_family_member
  BEFORE INSERT OR UPDATE ON public.client_family_members
  FOR EACH ROW EXECUTE FUNCTION public.normalize_client_family_member_fields();

DROP TRIGGER IF EXISTS trg_sync_dependents_to_family_members ON public.dependents;
CREATE TRIGGER trg_sync_dependents_to_family_members
  BEFORE INSERT OR UPDATE ON public.dependents
  FOR EACH ROW EXECUTE FUNCTION public.sync_dependents_to_family_members();


-- C. Trava de Foreign Key em Appointments (client_user_id só é preenchido se existir em auth.users)
CREATE OR REPLACE FUNCTION public.handle_appointment_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists_in_auth boolean := false;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE id = NEW.client_id
    ) INTO v_exists_in_auth;

    IF v_exists_in_auth THEN
      NEW.client_user_id := NEW.client_id;
    ELSE
      NEW.client_user_id := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_appointment_defaults ON public.appointments;
CREATE TRIGGER trg_handle_appointment_defaults
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_defaults();


-- ----------------------------------------------------------------------------
-- 3. PROCEDURE DE CRIAÇÃO E MIGRACAO DE RPCs (RPC GOVERNANCE)
-- ----------------------------------------------------------------------------

-- A. RPC register_system_admin para admvapp
CREATE OR REPLACE FUNCTION public.register_system_admin(
  p_full_name text,
  p_username text,
  p_email text,
  p_password_hash text,
  p_role text DEFAULT 'admin',
  p_phone_whatsapp text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_clean_email text := lower(trim(p_email));
  v_clean_username text := lower(trim(p_username));
BEGIN
  -- Verifica se já existe por e-mail ou username
  SELECT id INTO v_admin_id
  FROM public.system_admin_users
  WHERE lower(email) = v_clean_email OR lower(username) = v_clean_username;

  IF v_admin_id IS NOT NULL THEN
    UPDATE public.system_admin_users
    SET
      full_name = p_full_name,
      password_hash = p_password_hash,
      role = COALESCE(p_role, role),
      phone_whatsapp = COALESCE(p_phone_whatsapp, phone_whatsapp),
      is_active = true,
      updated_at = now()
    WHERE id = v_admin_id;
  ELSE
    INSERT INTO public.system_admin_users (
      full_name, username, email, password_hash, role, phone_whatsapp, is_active
    ) VALUES (
      p_full_name, v_clean_username, v_clean_email, p_password_hash, COALESCE(p_role, 'admin'), p_phone_whatsapp, true
    )
    RETURNING id INTO v_admin_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'admin_id', v_admin_id,
    'message', 'Administrador master cadastrado com sucesso'
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 4. BUCKETS DE STORAGE E POLÍTICAS DE ACESSO (STORAGE & RLS)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) VALUES ('salon-media', 'salon-media', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage Públicas e Seguras
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Storage salon-media') THEN
    CREATE POLICY "Public Read Storage salon-media" ON storage.objects FOR SELECT USING (bucket_id = 'salon-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Storage avatars') THEN
    CREATE POLICY "Public Read Storage avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Storage media') THEN
    CREATE POLICY "Public Read Storage media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Universal Insert Storage salon-media') THEN
    CREATE POLICY "Universal Insert Storage salon-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'salon-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Universal Insert Storage avatars') THEN
    CREATE POLICY "Universal Insert Storage avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Universal Insert Storage media') THEN
    CREATE POLICY "Universal Insert Storage media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION (Sincronização em Tempo Real na Tríade)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.salons;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_ui_settings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_services;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_offers;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_family_members;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dependents;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;

-- Força a recarga imediata do cache de schema da API PostgREST do Supabase
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO MASTER DE CONVERGÊNCIA DA TRÍADE VAGOUAPP (bol-022 / bol-023)
-- ============================================================================
