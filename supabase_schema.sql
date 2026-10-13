-- ==============================================================================
-- 💈 VAGOU APP — SCHEMA COMPLETO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Versão: 2.2.0 (Tríade Master • Acervo Central de Mídias 3 Abas • Admin Master • RLS • Seeds Ricos)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. LIMPEZA SEGURA DAS TABELAS E FUNÇÕES (SE JÁ EXISTIREM)
DROP FUNCTION IF EXISTS public.get_offers_in_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.service_offers CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.professionals CASCADE;
DROP TABLE IF EXISTS public.salon_media_items CASCADE;
DROP TABLE IF EXISTS public.salon_media_slots CASCADE;
DROP TABLE IF EXISTS public.billing_invoices CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.salons CASCADE;
DROP TABLE IF EXISTS public.admin_access_logs CASCADE;
DROP TABLE IF EXISTS public.system_admins CASCADE;

-- 3. TABELA: SALONS (ESTABELECIMENTOS / PARCEIROS)
CREATE TABLE public.salons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    trade_name VARCHAR(255) NOT NULL,              -- Nome Fantasia (Ex: Salão X Prime)
    legal_name VARCHAR(255) NOT NULL,              -- Razão Social / Nome do Responsável
    slug VARCHAR(100) UNIQUE NOT NULL,             -- Link exclusivo (ex: vagou.app/salao-x-prime)
    document_type VARCHAR(20) DEFAULT 'CNPJ',      -- CNPJ ou CPF
    document_number VARCHAR(30),
    phone_whatsapp VARCHAR(30),
    email VARCHAR(255),
    operating_model VARCHAR(50) DEFAULT 'team',    -- solo, team, home_delivery, hybrid
    home_delivery_enabled BOOLEAN DEFAULT FALSE,
    home_delivery_area TEXT,
    home_delivery_travel_fee NUMERIC(10,2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'incomplete', 'suspended')),
    is_verified BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    commission_rate NUMERIC(5,2) DEFAULT 15.00,
    
    -- Localização & GIS
    address TEXT,
    street_number VARCHAR(50),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100) DEFAULT 'São Paulo',
    state VARCHAR(10) DEFAULT 'SP',
    cep VARCHAR(20),
    latitude DOUBLE PRECISION DEFAULT -23.5350,
    longitude DOUBLE PRECISION DEFAULT -46.4520,
    
    -- Identidade Visual & Branding
    logo_url TEXT,
    logo_light_url TEXT,
    logo_dark_url TEXT,
    cover_url TEXT,
    cover_image_url TEXT,                          -- Banner de cabeçalho do app
    branding JSONB DEFAULT '{"primaryColor": "#20C933", "secondaryColor": "#0F172A", "themeMode": "dark"}'::jsonb,
    primary_color VARCHAR(20) DEFAULT '#20C933',
    secondary_color VARCHAR(20) DEFAULT '#0F172A',
    bio TEXT,
    
    -- Financeiro & Pagamentos
    pix_key VARCHAR(100),                          -- Chave PIX oficial do parceiro
    operating_hours JSONB,                         -- Horários de funcionamento por dia da semana
    
    -- Avaliações & Métricas
    rating_avg NUMERIC(3,2) DEFAULT 5.00,
    rating_count INTEGER DEFAULT 1,
    media_slots_count INTEGER DEFAULT 1,
    
    -- Modelo de Cobrança / Faturamento
    billing_plan VARCHAR(50) DEFAULT 'PER_APPOINTMENT',
    billing_fee_type VARCHAR(50) DEFAULT 'FIXED',
    billing_fee_value NUMERIC(10,2) DEFAULT 1.50,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA: PROFESSIONALS (PROFISSIONAIS / EQUIPE)
CREATE TABLE public.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(150) DEFAULT 'Profissional',
    avatar_url TEXT,
    phone VARCHAR(30),
    email VARCHAR(255),
    specialties TEXT[] DEFAULT ARRAY['cabelo']::TEXT[],
    color_hex VARCHAR(20) DEFAULT '#10B981',
    slot_minutes INTEGER DEFAULT 45,
    use_custom_schedule BOOLEAN DEFAULT FALSE,
    schedule_config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA: SERVICES (CATÁLOGO DE SERVIÇOS / PROCEDIMENTOS)
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(255),                             -- Nome do Procedimento (Ex: Corte Degradê Navalhado)
    title VARCHAR(255) NOT NULL,                   -- Sincronizado para retrocompatibilidade
    category VARCHAR(50) DEFAULT 'cabelo',         -- cabelo, barba, unhas, beleza, estetica, outros
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER DEFAULT 45,
    description TEXT,
    image_url TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],         -- Acervo de fotos do serviço
    videos JSONB DEFAULT '[]'::jsonb,              -- Acervo de vídeos curtos (5s / MB equiv)
    slides TEXT[] DEFAULT ARRAY[]::TEXT[],         -- Fotos de slides / carrossel
    target_audience VARCHAR(20) DEFAULT 'all',     -- all, male, female, kids
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA: SERVICE_OFFERS (RADAR DE VAGAS RELÂMPAGO / HORÁRIOS OCIOSOS)
CREATE TABLE public.service_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_title VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'cabelo',
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    date_str VARCHAR(20) NOT NULL,              -- Ex: '2026-09-24'
    start_time TIME NOT NULL,                  -- Ex: '14:30:00'
    end_time TIME NOT NULL,                    -- Ex: '15:15:00'
    status VARCHAR(30) DEFAULT 'AVAILABLE',    -- AVAILABLE, RESERVED, EXPIRED, CANCELLED
    
    -- Mídia e Nível do Story
    media_level INTEGER DEFAULT 1,             -- 1 = Fallback animado, 2 = Carrossel, 3 = Vídeo
    video_url TEXT,
    gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Urgência e Recorrência
    is_flash_deal BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_count INTEGER DEFAULT 1,
    description TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA: CLIENTS (CLIENTES FINAIS DO APP)
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    cpf VARCHAR(20),
    phone VARCHAR(30),
    phone_secondary VARCHAR(30),
    email VARCHAR(255),
    password_hash TEXT,
    avatar_url TEXT,
    access_level VARCHAR(50) DEFAULT 'Cliente Titular',
    is_active BOOLEAN DEFAULT TRUE,
    address TEXT,
    street_number VARCHAR(50),
    complement VARCHAR(100),
    neighborhood VARCHAR(150),
    city VARCHAR(150),
    state VARCHAR(10),
    cep VARCHAR(20),
    default_address TEXT,
    total_appointments INTEGER DEFAULT 0,
    dependents_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.1 TABELA: DEPENDENTS (CONTA FAMÍLIA & DEPENDENTES)
CREATE TABLE public.dependents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) DEFAULT 'son' CHECK (relationship IN ('son', 'daughter', 'spouse', 'parent', 'other')),
    birth_date DATE,
    notes TEXT,
    is_unlinked BOOLEAN DEFAULT FALSE,
    unlinked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.2 TABELA: SALON_USERS (GESTÃO, DONOS E RECEPÇÃO DO SALÃO)
CREATE TABLE public.salon_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
    city VARCHAR(150),
    state VARCHAR(10),
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


-- 8. TABELA: APPOINTMENTS (AGENDAMENTOS E RESERVAS REALIZADAS)
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol_code VARCHAR(50) UNIQUE NOT NULL,  -- Ex: '#VGA-12345'
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    offer_id UUID REFERENCES public.service_offers(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(255),
    
    service_title VARCHAR(255) NOT NULL,
    service_category VARCHAR(50) DEFAULT 'cabelo',
    service_type VARCHAR(30) DEFAULT 'IN_SALON', -- IN_SALON, HOME_DELIVERY
    client_address TEXT,
    travel_fee NUMERIC(10,2) DEFAULT 0.00,
    
    price NUMERIC(10,2) NOT NULL,
    date_str VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMADO',     -- CONFIRMADO, EM_ATENDIMENTO, CONCLUIDO, CANCELADO, NO_SHOW
    commission_fee NUMERIC(10,2) DEFAULT 1.50,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA: SALON_MEDIA_ITEMS (ACERVO CENTRAL DE MÍDIAS: FOTOS, VÍDEOS 5S, IMAGENS)
CREATE TABLE public.salon_media_items (
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

CREATE INDEX idx_salon_media_items_salon ON public.salon_media_items(salon_id);
CREATE INDEX idx_salon_media_items_group ON public.salon_media_items(salon_id, media_group);
CREATE INDEX idx_salon_media_items_category ON public.salon_media_items(salon_id, category);

-- 9.1 TABELA LEGADA: SALON_MEDIA_SLOTS (Stories Legados)
CREATE TABLE public.salon_media_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL,
    media_type VARCHAR(20) DEFAULT 'image', -- image, video
    media_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELA: SYSTEM_ADMINS & ADMIN_ACCESS_LOGS (ADMIN MASTER CORP)
CREATE TABLE public.system_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_whatsapp VARCHAR(30) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'moderator', 'support')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(50),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_admins_username ON public.system_admins (LOWER(username));
CREATE INDEX idx_system_admins_email ON public.system_admins (LOWER(email));

CREATE TABLE public.admin_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.system_admins(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('login_success', 'login_failed', 'register', 'recovery_requested', 'password_changed', 'logout')),
    ip_address VARCHAR(50),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_access_logs_admin_id ON public.admin_access_logs (admin_id);
CREATE INDEX idx_admin_access_logs_created_at ON public.admin_access_logs (created_at DESC);

-- 11. TABELA: BILLING_INVOICES (FATURAMENTO DE COMISSÕES DO PARCEIRO)
CREATE TABLE public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    reference_month VARCHAR(20) NOT NULL,
    total_appointments INTEGER DEFAULT 0,
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'PENDING',  -- PENDING, PAID, OVERDUE, CANCELLED
    pix_code TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. RPC GEOESPACIAL: GET_OFFERS_IN_RADIUS (BUSCA DE VAGAS COM DISTÂNCIA REAL)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_offers_in_radius(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 25.0,
    filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    offer_id UUID,
    salon_id UUID,
    salon_name VARCHAR(255),
    salon_neighborhood VARCHAR(100),
    salon_address TEXT,
    salon_logo TEXT,
    salon_logo_light TEXT,
    salon_logo_dark TEXT,
    operating_model VARCHAR(50),
    home_delivery_enabled BOOLEAN,
    home_delivery_area TEXT,
    home_delivery_travel_fee NUMERIC(10,2),
    professional_name VARCHAR(255),
    professional_avatar TEXT,
    rating_avg NUMERIC(3,2),
    rating_count INTEGER,
    service_title VARCHAR(255),
    category VARCHAR(50),
    price NUMERIC(10,2),
    original_price NUMERIC(10,2),
    date_str VARCHAR(20),
    start_time TIME,
    end_time TIME,
    media_level INTEGER,
    video_url TEXT,
    gallery_images TEXT[],
    distance_meters INTEGER,
    distance_km NUMERIC(5,1),
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        so.id AS offer_id,
        s.id AS salon_id,
        s.trade_name AS salon_name,
        s.neighborhood AS salon_neighborhood,
        s.address AS salon_address,
        s.logo_url AS salon_logo,
        s.logo_light_url AS salon_logo_light,
        s.logo_dark_url AS salon_logo_dark,
        s.operating_model,
        s.home_delivery_enabled,
        s.home_delivery_area,
        s.home_delivery_travel_fee,
        COALESCE(p.name, s.trade_name) AS professional_name,
        p.avatar_url AS professional_avatar,
        s.rating_avg,
        s.rating_count,
        so.service_title,
        so.category,
        so.price,
        so.original_price,
        so.date_str,
        so.start_time,
        so.end_time,
        so.media_level,
        so.video_url,
        so.gallery_images,
        ROUND(
            (6371000 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(user_lat)) * cos(radians(s.latitude)) *
                    cos(radians(s.longitude) - radians(user_lng)) +
                    sin(radians(user_lat)) * sin(radians(s.latitude))
                ))
            ))
        )::INTEGER AS distance_meters,
        ROUND(
            ((6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(user_lat)) * cos(radians(s.latitude)) *
                    cos(radians(s.longitude) - radians(user_lng)) +
                    sin(radians(user_lat)) * sin(radians(s.latitude))
                ))
            )))::NUMERIC, 1
        ) AS distance_km,
        so.expires_at
    FROM
        public.service_offers so
        JOIN public.salons s ON so.salon_id = s.id
        LEFT JOIN public.professionals p ON so.professional_id = p.id
    WHERE
        so.status = 'AVAILABLE'
        AND so.expires_at > NOW()
        AND (filter_category IS NULL OR filter_category = 'todos' OR LOWER(so.category) = LOWER(filter_category))
    ORDER BY
        so.expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 12. TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA (UPDATED_AT)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_salons_updated_at BEFORE UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trigger_professionals_updated_at BEFORE UPDATE ON public.professionals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trigger_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trigger_salon_media_items_updated_at BEFORE UPDATE ON public.salon_media_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trigger_system_admins_updated_at BEFORE UPDATE ON public.system_admins FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 13. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_media_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Leitura Pública
CREATE POLICY "Leitura_Salons" ON public.salons FOR SELECT USING (true);
CREATE POLICY "Leitura_Professionals" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Leitura_Services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Leitura_Offers" ON public.service_offers FOR SELECT USING (true);
CREATE POLICY "Leitura_Media_Items" ON public.salon_media_items FOR SELECT USING (true);
CREATE POLICY "Leitura_Media" ON public.salon_media_slots FOR SELECT USING (true);
CREATE POLICY "Leitura_Appointments" ON public.appointments FOR SELECT USING (true);

-- Inserção, Atualização e Exclusão
CREATE POLICY "Insert_Salons" ON public.salons FOR INSERT WITH CHECK (true);
CREATE POLICY "Update_Salons" ON public.salons FOR UPDATE USING (true);
CREATE POLICY "Insert_Professionals" ON public.professionals FOR INSERT WITH CHECK (true);
CREATE POLICY "Update_Professionals" ON public.professionals FOR UPDATE USING (true);
CREATE POLICY "Insert_Services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Update_Services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Delete_Services" ON public.services FOR DELETE USING (true);
CREATE POLICY "Insert_Offers" ON public.service_offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Update_Offers" ON public.service_offers FOR UPDATE USING (true);
CREATE POLICY "Insert_Appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Update_Appointments" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Insert_Clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Update_Clients" ON public.clients FOR UPDATE USING (true);

-- Políticas do Acervo Central de Mídias
CREATE POLICY "Insert_Salon_Media_Items" ON public.salon_media_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Update_Salon_Media_Items" ON public.salon_media_items FOR UPDATE USING (true);
CREATE POLICY "Delete_Salon_Media_Items" ON public.salon_media_items FOR DELETE USING (true);

-- Políticas para Administradores do Sistema Master
CREATE POLICY "Admin_Access_System_Admins" ON public.system_admins FOR ALL USING (true);
CREATE POLICY "Admin_Access_Logs" ON public.admin_access_logs FOR ALL USING (true);

-- ==============================================================================
-- 14. DADOS INICIAIS (SEEDS DE SALÕES, PROFISSIONAIS, SERVIÇOS, MÍDIAS E VAGAS)
-- ==============================================================================

-- SALÕES PARCEIROS
INSERT INTO public.salons (
    id, trade_name, legal_name, slug, phone_whatsapp, address, neighborhood, city, state, latitude, longitude, rating_avg, rating_count, status, is_verified, is_active, cover_image_url, logo_url, pix_key, bio
) VALUES
(
    '11111111-1111-1111-1111-111111111101',
    'Salão X Prime',
    'Lucas Silva Barber ME',
    'salao-x-prime',
    '(11) 98123-4567',
    'Rua Itaquera, 340',
    'Itaquera',
    'São Paulo',
    'SP',
    -23.5350,
    -46.4520,
    4.9,
    142,
    'active',
    true,
    true,
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80',
    'contato@salaoxprime.com.br',
    'Especialistas em cortes degradê, barba na toalha quente e estética masculina de alta performance.'
),
(
    '11111111-1111-1111-1111-111111111102',
    'Barbearia Primo',
    'João Santos Barbearia ME',
    'barbearia-primo',
    '(11) 97234-5678',
    'Rua Campanella, 85',
    'Itaquera',
    'São Paulo',
    'SP',
    -23.5380,
    -46.4560,
    4.9,
    98,
    'active',
    true,
    true,
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&auto=format&fit=crop&q=80',
    '11972345678',
    'Ambiente retrô aconchegante com chopp gelado e os melhores mestres barbudos da zona leste.'
),
(
    '11111111-1111-1111-1111-111111111103',
    'Studio Mabe Nails',
    'Camila Rocha Manicure ME',
    'studio-mabe-nails',
    '(11) 96345-6789',
    'Av. Líder, 1200',
    'Artur Alvim',
    'São Paulo',
    'SP',
    -23.5410,
    -46.4620,
    4.8,
    84,
    'active',
    true,
    true,
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
    'financeiro@mabenails.com',
    'Especialistas em unhas em gel, fibra de vidro e spa dos pés com produtos hipoalergênicos.'
),
(
    '11111111-1111-1111-1111-111111111104',
    'Don Studio Facial',
    'Juliana Mendes Sobrancelhas ME',
    'don-studio-facial',
    '(11) 95456-7890',
    'Rua Sabbado D''Ângelo, 500',
    'Itaquera',
    'São Paulo',
    'SP',
    -23.5330,
    -46.4500,
    4.9,
    210,
    'active',
    true,
    true,
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&auto=format&fit=crop&q=80',
    'donstudio@pix.me',
    'Design de sobrancelhas personalizado, visagismo e extensão de cílios com técnica exclusiva.'
);

-- PROFISSIONAIS
INSERT INTO public.professionals (id, salon_id, name, role, specialties, color_hex, slot_minutes) VALUES
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'Lucas Silva', 'Barbeiro Master', ARRAY['Corte Degradê', 'Barboterapia', 'Pigmentação'], '#059669', 45),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'João Santos', 'Cabeleireiro & Visagista', ARRAY['Corte Tesoura', 'Coloração', 'Escova'], '#2563eb', 50),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 'Camila Rocha', 'Manicure & Nail Designer', ARRAY['Esmaltação Gel', 'Fibra', 'Spa dos Pés'], '#db2777', 60),
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 'Juliana Mendes', 'Designer de Sobrancelhas', ARRAY['Henna', 'Lash Lifting', 'Micropigmentação'], '#7c3aed', 30);

-- CATÁLOGO DE SERVIÇOS / PROCEDIMENTOS (COM MÍDIAS VINCULADAS)
INSERT INTO public.services (
    id, salon_id, name, title, category, price, duration_minutes, description, photos, slides, is_active
) VALUES
(
    '55555555-5555-5555-5555-555555555501',
    '11111111-1111-1111-1111-111111111101',
    'Corte Degradê Navalhado',
    'Corte Degradê Navalhado',
    'cabelo',
    45.00,
    45,
    'Degradê suave na navalha ou shaver, finalizado com lavagem refrescante e pomada matte.',
    ARRAY['https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=80']::TEXT[],
    ARRAY['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=80']::TEXT[],
    true
),
(
    '55555555-5555-5555-5555-555555555502',
    '11111111-1111-1111-1111-111111111101',
    'Barboterapia Spa Prime',
    'Barboterapia Spa Prime',
    'barba',
    50.00,
    40,
    'Alinhamento com navalha descartável, toalha quente com essência de eucalipto e massagem facial.',
    ARRAY['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=80']::TEXT[],
    ARRAY[]::TEXT[],
    true
),
(
    '55555555-5555-5555-5555-555555555503',
    '11111111-1111-1111-1111-111111111103',
    'Alongamento em Fibra de Vidro',
    'Alongamento em Fibra de Vidro',
    'unhas',
    160.00,
    120,
    'Estrutura fina e natural com acabamento em gel de alta durabilidade e cuticulagem russa.',
    ARRAY['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&auto=format&fit=crop&q=80']::TEXT[],
    ARRAY[]::TEXT[],
    true
);

-- ACERVO CENTRAL DE MÍDIAS (3 ABAS: FOTOS, VÍDEOS 5S E IMAGENS)
INSERT INTO public.salon_media_items (
    salon_id, title, url, type, media_group, category, duration_seconds, is_cover
) VALUES
(
    '11111111-1111-1111-1111-111111111101',
    'Degradê Fade Master',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=80',
    'image',
    'fotos',
    'servicos',
    5,
    true
),
(
    '11111111-1111-1111-1111-111111111101',
    'Lucas Silva (Barbeiro Master)',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&auto=format&fit=crop&q=80',
    'image',
    'fotos',
    'profissionais',
    5,
    false
),
(
    '11111111-1111-1111-1111-111111111101',
    'Estrutura e Bancadas Vintage',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=80',
    'image',
    'fotos',
    'espaco',
    5,
    false
),
(
    '11111111-1111-1111-1111-111111111101',
    'Corte Degradê em Ação 5s',
    'https://assets.mixkit.co/videos/preview/mixkit-barber-trimming-a-mans-beard-43093-large.mp4',
    'video',
    'videos',
    'servicos',
    5,
    false
),
(
    '11111111-1111-1111-1111-111111111101',
    'Banner Oficial Cabeçalho App',
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&auto=format&fit=crop&q=80',
    'image',
    'imagens',
    'banner',
    5,
    false
),
(
    '11111111-1111-1111-1111-111111111101',
    'Logotipo Oficial Prime',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80',
    'image',
    'imagens',
    'logotipo',
    5,
    false
);

-- VAGAS RELÂMPAGO DO RADAR (ATIVAS E DISPONÍVEIS AGORA)
INSERT INTO public.service_offers (
    id, salon_id, professional_id, service_title, category, price, original_price, date_str, start_time, end_time, status, media_level, video_url, is_flash_deal, expires_at, description
) VALUES
(
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    'Degradê Navalhado',
    'cabelo',
    45.00,
    65.00,
    TO_CHAR(NOW(), 'YYYY-MM-DD'),
    '14:30:00',
    '15:15:00',
    'AVAILABLE',
    3,
    'https://assets.mixkit.co/videos/preview/mixkit-barber-trimming-a-mans-beard-43093-large.mp4',
    TRUE,
    NOW() + INTERVAL '4 hours',
    'Degradê na zero ou navalhado com finalização em pomada matte e toalha refrescante.'
),
(
    '33333333-3333-3333-3333-333333333302',
    '11111111-1111-1111-1111-111111111102',
    '22222222-2222-2222-2222-222222222202',
    'Corte Clássico & Barba',
    'barba',
    50.00,
    75.00,
    TO_CHAR(NOW(), 'YYYY-MM-DD'),
    '15:00:00',
    '16:00:00',
    'AVAILABLE',
    2,
    NULL,
    TRUE,
    NOW() + INTERVAL '3 hours',
    'Barba alinhada com toalha quente, óleos essenciais e massagem facial relaxante.'
),
(
    '33333333-3333-3333-3333-333333333303',
    '11111111-1111-1111-1111-111111111103',
    '22222222-2222-2222-2222-222222222203',
    'Manicure em Gel',
    'unhas',
    40.00,
    55.00,
    TO_CHAR(NOW(), 'YYYY-MM-DD'),
    '15:45:00',
    '16:35:00',
    'AVAILABLE',
    2,
    NULL,
    TRUE,
    NOW() + INTERVAL '2 hours',
    'Cuticulagem perfeita, esmaltação em gel de alta durabilidade e hidratação com cera nutritiva.'
),
(
    '33333333-3333-3333-3333-333333333304',
    '11111111-1111-1111-1111-111111111104',
    '22222222-2222-2222-2222-222222222204',
    'Design com Henna',
    'beleza',
    35.00,
    50.00,
    TO_CHAR(NOW(), 'YYYY-MM-DD'),
    '16:30:00',
    '17:05:00',
    'AVAILABLE',
    1,
    NULL,
    TRUE,
    NOW() + INTERVAL '5 hours',
    'Mapeamento facial com linha e aplicação de henna personalizada para o seu tom de pele.'
);

-- AGENDAMENTOS INICIAIS
INSERT INTO public.appointments (
    id, protocol_code, salon_id, professional_id, client_name, client_phone, service_title, service_category, price, date_str, start_time, end_time, status
) VALUES (
    '44444444-4444-4444-4444-444444444401',
    '#VGA-12345',
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    'Anderson Silva',
    '(11) 98765-4321',
    'Corte Degradê Navalhado',
    'cabelo',
    45.00,
    TO_CHAR(NOW(), 'YYYY-MM-DD'),
    '14:30:00',
    '15:15:00',
    'CONFIRMADO'
);

-- SUPER ADMINISTRADOR MASTER (SEED SEGURO)
INSERT INTO public.system_admins (
    id, full_name, username, email, phone_whatsapp, password_hash, role, is_active
) VALUES (
    '99999999-9999-9999-9999-999999999999',
    'Administrador Master VagouApp',
    'admin',
    'admin@vagouapp.com',
    '(11) 99999-9999',
    crypt('Admin@2026!', gen_salt('bf')),
    'superadmin',
    true
) ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- 12. COMPATIBILIDADE SOBERANA & MIGRAÇÕES IDEMPOTENTES (COLUNAS UNIFICADAS)
-- Garante que todas as tabelas de usuários suportem os campos corporativos do Admin Master
-- ============================================================================

-- Clientes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'Cliente Titular';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS street_number VARCHAR(50);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city VARCHAR(150) DEFAULT 'São Paulo';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'SP';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Sincroniza name e full_name em clients se um for nulo
UPDATE public.clients SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
UPDATE public.clients SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;

-- Profissionais
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS phone_whatsapp VARCHAR(30);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'partner_mei';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'MEI Parceiro';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS street_number VARCHAR(50);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS city VARCHAR(150) DEFAULT 'São Paulo';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'SP';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Sincroniza name e full_name em professionals se um for nulo
UPDATE public.professionals SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
UPDATE public.professionals SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE public.professionals SET phone_whatsapp = phone WHERE phone_whatsapp IS NULL AND phone IS NOT NULL;

-- Usuários de Salão (Gestores)
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30);
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'Proprietário (Dono)';
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS street_number VARCHAR(50);
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS city VARCHAR(150) DEFAULT 'São Paulo';
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'SP';
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE public.salon_users ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;

-- Administradores do Sistema
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'Superadmin Master';
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS street_number VARCHAR(50);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS city VARCHAR(150) DEFAULT 'São Paulo';
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'SP';
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;

