-- =====================================================================================================
-- 🏛️ ECOSSISTEMA VAGOUAPP — SCRIPT DEFINITIVO DE COMPATIBILIDADE NÃO-DESTRUTIVA (ZERO ERRO)
-- =====================================================================================================
-- Este script:
-- 1. NÃO apaga seus salões cadastrados (Marilu, Momy nail, Salão X Prime, etc.)
-- 2. Cria as tabelas que ainda faltavam no seu Supabase (salon_services, dependents, salon_users, etc.)
-- 3. Adiciona as colunas necessárias com IF NOT EXISTS
-- 4. Copia os serviços existentes para salon_services automaticamente
-- 5. Aplica os triggers desacoplados sem qualquer erro de compilação
-- =====================================================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ADIÇÃO DE COLUNAS FALTANTES EM TABELAS EXISTENTES (SEM APAGAR DADOS)
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100);
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Barbearia';
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS phone_landline VARCHAR(30);
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(20);
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_key VARCHAR(150);
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_keys JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS space_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS theme_preset_id VARCHAR(50) DEFAULT 'emerald-dark';
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS slogan VARCHAR(255);
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS brand_font VARCHAR(60) DEFAULT 'Poppins';
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS favicon_url TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_whatsapp VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10,2);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_estimated VARCHAR(50) DEFAULT '45 min';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_whatsapp VARCHAR(30);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS origin_type VARCHAR(30) DEFAULT 'portal';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS origin_salon_id UUID;

-- 2.1 TELEMETRIA DE DESLOCAMENTO AO VIVO (10s), ROTA GOOGLE MAPS, LINHA DE RUAS (SHOPEE/CORREIOS) & ADVERSIDADES
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_location_type VARCHAR(30) DEFAULT 'in_salon';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(30) DEFAULT 'driving';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(40) DEFAULT 'idle';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS selected_route_summary TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS current_street_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS route_checkpoints JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS active_adversity JSONB DEFAULT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_lat DOUBLE PRECISION;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_lng DOUBLE PRECISION;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS eta_minutes INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS prep_buffer_minutes INTEGER DEFAULT 10;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- 3. CRIAÇÃO DAS TABELAS QUE AINDA NÃO EXISTIAM (CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.salon_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    name VARCHAR(255),
    title VARCHAR(255),
    custom_name VARCHAR(255),
    category VARCHAR(100) DEFAULT 'cabelo',
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    promotional_price NUMERIC(10,2),
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    duration_estimated VARCHAR(50) DEFAULT '45 min',
    commission_rate NUMERIC(5,2) DEFAULT 50.00,
    description TEXT,
    image_url TEXT,
    video_url TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    videos JSONB DEFAULT '[]'::jsonb,
    slides TEXT[] DEFAULT ARRAY[]::TEXT[],
    target_audience VARCHAR(30) DEFAULT 'all',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salon_services_salon ON public.salon_services(salon_id);

CREATE TABLE IF NOT EXISTS public.dependents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    guardian_client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    parent_user_id UUID,
    salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    relationship VARCHAR(50) DEFAULT 'son',
    birth_date DATE,
    gender VARCHAR(30),
    phone VARCHAR(30),
    email VARCHAR(255),
    cpf VARCHAR(20),
    avatar_url TEXT,
    avatar_emoji VARCHAR(20),
    autonomy_level VARCHAR(50) DEFAULT 'parent_controlled',
    emancipated_user_id UUID,
    notes TEXT,
    is_unlinked BOOLEAN DEFAULT FALSE,
    unlinked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dependents_parent ON public.dependents(parent_client_id);

CREATE TABLE IF NOT EXISTS public.salon_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    user_id UUID,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone_whatsapp VARCHAR(30),
    phone_secondary VARCHAR(30),
    cpf VARCHAR(20),
    password_hash TEXT,
    role VARCHAR(50) DEFAULT 'manager',
    access_level VARCHAR(50) DEFAULT 'Proprietário (Dono)',
    is_active BOOLEAN DEFAULT TRUE,
    address TEXT,
    street_number VARCHAR(50),
    complement VARCHAR(100),
    neighborhood VARCHAR(150),
    city VARCHAR(150) DEFAULT 'São Paulo',
    state VARCHAR(10) DEFAULT 'SP',
    cep VARCHAR(20),
    can_manage_financial BOOLEAN DEFAULT TRUE,
    can_manage_professionals BOOLEAN DEFAULT TRUE,
    total_appointments INTEGER DEFAULT 0,
    dependents_count INTEGER DEFAULT 0,
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salon_users_salon ON public.salon_users(salon_id);

CREATE TABLE IF NOT EXISTS public.salon_utilities_records (
    salon_id UUID PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
    energy_meters JSONB DEFAULT '[]'::jsonb,
    energy_readings JSONB DEFAULT '[]'::jsonb,
    water_meters JSONB DEFAULT '[]'::jsonb,
    water_readings JSONB DEFAULT '[]'::jsonb,
    appliances JSONB DEFAULT '[]'::jsonb,
    dre_records JSONB DEFAULT '[]'::jsonb,
    financial_dre JSONB DEFAULT '{}'::jsonb,
    supply_items JSONB DEFAULT '[]'::jsonb,
    inventory_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'income' CHECK (type IN ('income', 'expense', 'commission')),
    category VARCHAR(100) DEFAULT 'Atendimento',
    description TEXT,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'PIX',
    transaction_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MIGRAÇÃO DE DADOS: POPULA salon_services COM OS SERVIÇOS QUE JÁ ESTÃO EM services
INSERT INTO public.salon_services (
    id, salon_id, service_id, name, title, custom_name, category, price, promotional_price,
    duration_minutes, duration_estimated, commission_rate, description, image_url, video_url,
    photos, videos, slides, target_audience, order_index, is_active, created_at, updated_at
)
SELECT
    s.id,
    s.salon_id,
    s.id,
    COALESCE(s.name, s.title, 'Procedimento'),
    s.title,
    COALESCE(s.custom_name, s.title),
    COALESCE(s.category, 'cabelo'),
    COALESCE(s.price, 0.00),
    s.promotional_price,
    COALESCE(s.duration_minutes, 45),
    COALESCE(s.duration_estimated, '45 min'),
    COALESCE(s.commission_rate, 50.00),
    s.description,
    s.image_url,
    s.video_url,
    COALESCE(s.photos, ARRAY[]::TEXT[]),
    COALESCE(s.videos, '[]'::jsonb),
    COALESCE(s.slides, ARRAY[]::TEXT[]),
    COALESCE(s.target_audience, 'all'),
    COALESCE(s.order_index, 0),
    COALESCE(s.is_active, TRUE),
    s.created_at,
    NOW()
FROM public.services s
ON CONFLICT (id) DO NOTHING;

-- 5. LIMPEZA SEGURA DE FUNÇÕES ANTIGAS (DROP CASCADE NUNCA RECLAMA SE A TABELA EXISTE)
DROP FUNCTION IF EXISTS public.normalize_service_fields() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_salon_service_fields() CASCADE;
DROP FUNCTION IF EXISTS public.sync_services_to_salon_services() CASCADE;
DROP FUNCTION IF EXISTS public.sync_salon_services_to_services() CASCADE;
DROP FUNCTION IF EXISTS public.sync_services_bidirectional() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_dependent_fields() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_client_family_member_fields() CASCADE;
DROP FUNCTION IF EXISTS public.sync_dependents_to_family_members() CASCADE;
DROP FUNCTION IF EXISTS public.sync_family_members_to_dependents() CASCADE;

-- 6. CRIAÇÃO DOS TRIGGERS DESACOPLADOS (ZERO ERRO DE COLUNA INEXISTENTE)
CREATE OR REPLACE FUNCTION public.normalize_service_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_label VARCHAR(255);
BEGIN
    v_label := COALESCE(NEW.name, NEW.title, NEW.custom_name, 'Procedimento');
    NEW.name := v_label;
    NEW.title := v_label;
    NEW.custom_name := COALESCE(NEW.custom_name, v_label);
    NEW.duration_estimated := COALESCE(NEW.duration_estimated, COALESCE(NEW.duration_minutes, 45) || ' min');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_services_fields
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.normalize_service_fields();

CREATE OR REPLACE FUNCTION public.normalize_salon_service_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_label VARCHAR(255);
BEGIN
    v_label := COALESCE(NEW.name, NEW.title, NEW.custom_name, 'Procedimento');
    NEW.name := v_label;
    NEW.title := v_label;
    NEW.custom_name := COALESCE(NEW.custom_name, v_label);
    NEW.duration_estimated := COALESCE(NEW.duration_estimated, COALESCE(NEW.duration_minutes, 45) || ' min');
    NEW.service_id := COALESCE(NEW.service_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_salon_services_fields
BEFORE INSERT OR UPDATE ON public.salon_services
FOR EACH ROW EXECUTE FUNCTION public.normalize_salon_service_fields();

CREATE OR REPLACE FUNCTION public.sync_services_to_salon_services()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.salon_services WHERE id = OLD.id OR service_id = OLD.id;
        RETURN OLD;
    END IF;

    INSERT INTO public.salon_services (
        id, salon_id, service_id, name, title, custom_name, category, price, promotional_price,
        duration_minutes, duration_estimated, commission_rate, description, image_url, video_url, photos, videos, slides,
        target_audience, order_index, is_active, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.salon_id, NEW.id, NEW.name, NEW.title, NEW.custom_name, NEW.category, NEW.price, NEW.promotional_price,
        NEW.duration_minutes, COALESCE(NEW.duration_estimated, NEW.duration_minutes || ' min'), NEW.commission_rate, NEW.description, NEW.image_url, NEW.video_url, NEW.photos, NEW.videos, NEW.slides,
        NEW.target_audience, NEW.order_index, NEW.is_active, NEW.created_at, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        salon_id = EXCLUDED.salon_id,
        service_id = EXCLUDED.service_id,
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        custom_name = EXCLUDED.custom_name,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        promotional_price = EXCLUDED.promotional_price,
        duration_minutes = EXCLUDED.duration_minutes,
        duration_estimated = EXCLUDED.duration_estimated,
        commission_rate = EXCLUDED.commission_rate,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        video_url = EXCLUDED.video_url,
        photos = EXCLUDED.photos,
        videos = EXCLUDED.videos,
        slides = EXCLUDED.slides,
        target_audience = EXCLUDED.target_audience,
        order_index = EXCLUDED.order_index,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_services_to_salon_services
AFTER INSERT OR UPDATE OR DELETE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.sync_services_to_salon_services();

CREATE OR REPLACE FUNCTION public.sync_salon_services_to_services()
RETURNS TRIGGER AS $$
DECLARE
    v_srv_id UUID;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.services WHERE id = OLD.id OR (OLD.service_id IS NOT NULL AND id = OLD.service_id);
        RETURN OLD;
    END IF;

    v_srv_id := COALESCE(NEW.service_id, NEW.id);

    INSERT INTO public.services (
        id, salon_id, name, title, custom_name, category, price, promotional_price,
        duration_minutes, duration_estimated, commission_rate, description, image_url, video_url, photos, videos, slides,
        target_audience, order_index, is_active, created_at, updated_at
    ) VALUES (
        v_srv_id, NEW.salon_id, NEW.name, NEW.title, NEW.custom_name, NEW.category, NEW.price, NEW.promotional_price,
        NEW.duration_minutes, COALESCE(NEW.duration_estimated, NEW.duration_minutes || ' min'), NEW.commission_rate, NEW.description, NEW.image_url, NEW.video_url, NEW.photos, NEW.videos, NEW.slides,
        NEW.target_audience, NEW.order_index, NEW.is_active, NEW.created_at, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        salon_id = EXCLUDED.salon_id,
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        custom_name = EXCLUDED.custom_name,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        promotional_price = EXCLUDED.promotional_price,
        duration_minutes = EXCLUDED.duration_minutes,
        duration_estimated = EXCLUDED.duration_estimated,
        commission_rate = EXCLUDED.commission_rate,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        video_url = EXCLUDED.video_url,
        photos = EXCLUDED.photos,
        videos = EXCLUDED.videos,
        slides = EXCLUDED.slides,
        target_audience = EXCLUDED.target_audience,
        order_index = EXCLUDED.order_index,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_salon_services_to_services
AFTER INSERT OR UPDATE OR DELETE ON public.salon_services
FOR EACH ROW EXECUTE FUNCTION public.sync_salon_services_to_services();

-- 7. CONTA FAMÍLIA (TRIGGERS DESACOPLADOS)
CREATE OR REPLACE FUNCTION public.normalize_dependent_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name := COALESCE(NEW.full_name, NEW.name, 'Dependente');
    NEW.name := COALESCE(NEW.name, NEW.full_name, 'Dependente');
    NEW.parent_client_id := COALESCE(NEW.parent_client_id, NEW.guardian_client_id);
    NEW.guardian_client_id := COALESCE(NEW.guardian_client_id, NEW.parent_client_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_dependent_fields
BEFORE INSERT OR UPDATE ON public.dependents
FOR EACH ROW EXECUTE FUNCTION public.normalize_dependent_fields();

CREATE OR REPLACE FUNCTION public.normalize_client_family_member_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name := COALESCE(NEW.name, NEW.full_name, 'Dependente');
    NEW.full_name := COALESCE(NEW.full_name, NEW.name, 'Dependente');
    NEW.guardian_client_id := COALESCE(NEW.guardian_client_id, NEW.parent_client_id);
    NEW.parent_client_id := COALESCE(NEW.parent_client_id, NEW.guardian_client_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_family_member_fields
BEFORE INSERT OR UPDATE ON public.client_family_members
FOR EACH ROW EXECUTE FUNCTION public.normalize_client_family_member_fields();

CREATE OR REPLACE FUNCTION public.sync_dependents_to_family_members()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.client_family_members WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    INSERT INTO public.client_family_members (
        id, guardian_client_id, parent_client_id, salon_id, name, full_name,
        relationship, birth_date, avatar_url, notes, autonomy_level, phone, email, is_unlinked, created_at, updated_at
    ) VALUES (
        NEW.id, COALESCE(NEW.parent_client_id, NEW.guardian_client_id), COALESCE(NEW.parent_client_id, NEW.guardian_client_id), NEW.salon_id, COALESCE(NEW.full_name, NEW.name, 'Dependente'), COALESCE(NEW.full_name, NEW.name, 'Dependente'),
        COALESCE(NEW.relationship, 'son'), NEW.birth_date, NEW.avatar_url, NEW.notes, COALESCE(NEW.autonomy_level, 'parent_controlled'), NEW.phone, NEW.email, COALESCE(NEW.is_unlinked, FALSE), NEW.created_at, NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, full_name = EXCLUDED.full_name, relationship = EXCLUDED.relationship, birth_date = EXCLUDED.birth_date, updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_dependents_to_family_members
AFTER INSERT OR UPDATE OR DELETE ON public.dependents
FOR EACH ROW EXECUTE FUNCTION public.sync_dependents_to_family_members();

CREATE OR REPLACE FUNCTION public.sync_family_members_to_dependents()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.dependents WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    INSERT INTO public.dependents (
        id, parent_client_id, guardian_client_id, salon_id, full_name, name,
        relationship, birth_date, avatar_url, notes, autonomy_level, phone, email, is_unlinked, created_at, updated_at
    ) VALUES (
        NEW.id, COALESCE(NEW.guardian_client_id, NEW.parent_client_id), COALESCE(NEW.guardian_client_id, NEW.parent_client_id), NEW.salon_id, COALESCE(NEW.name, NEW.full_name, 'Dependente'), COALESCE(NEW.name, NEW.full_name, 'Dependente'),
        COALESCE(NEW.relationship, 'son'), NEW.birth_date, NEW.avatar_url, NEW.notes, COALESCE(NEW.autonomy_level, 'parent_controlled'), NEW.phone, NEW.email, COALESCE(NEW.is_unlinked, FALSE), NEW.created_at, NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name, name = EXCLUDED.name, relationship = EXCLUDED.relationship, birth_date = EXCLUDED.birth_date, updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_family_members_to_dependents
AFTER INSERT OR UPDATE OR DELETE ON public.client_family_members
FOR EACH ROW EXECUTE FUNCTION public.sync_family_members_to_dependents();

-- 8. POLÍTICAS RLS E REALTIME
ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_utilities_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Salon Services" ON public.salon_services;
CREATE POLICY "Public Salon Services" ON public.salon_services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Dependents" ON public.dependents;
CREATE POLICY "Public Dependents" ON public.dependents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Salon Users" ON public.salon_users;
CREATE POLICY "Public Salon Users" ON public.salon_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Salon Utilities" ON public.salon_utilities_records;
CREATE POLICY "Public Salon Utilities" ON public.salon_utilities_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Financial Transactions" ON public.financial_transactions;
CREATE POLICY "Public Financial Transactions" ON public.financial_transactions FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'salon_services') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_services;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dependents') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dependents;
    END IF;
END $$;

-- =====================================================================================================
-- 🏛️ MIGRAÇÃO 20261023: COLUNAS DE UI/ESTILOS, TABELA SALON_UI_SETTINGS E BUCKETS (MNVAPP ⇄ ADMVAPP ⇄ PVAPP)
-- =====================================================================================================

-- 1. Colunas físicas na tabela public.salons
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

-- 2. Tabela estruturada dedicada para configurações de UI por Salão
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

-- 3. Habilitação de RLS e Políticas de Acesso
ALTER TABLE public.salon_ui_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'salon_ui_settings_public_read') THEN
    CREATE POLICY salon_ui_settings_public_read ON public.salon_ui_settings
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'salon_ui_settings_public_upsert') THEN
    CREATE POLICY salon_ui_settings_public_upsert ON public.salon_ui_settings
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Buckets no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-media', 'salon-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;
