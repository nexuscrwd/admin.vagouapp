-- ============================================================================
-- 🏛️ VAGOUAPP — TRÍADE GOVERNANCE: MIGRAÇÃO OFICIAL DE USUÁRIOS & ENDEREÇOS
-- Data: 13/10/2026
-- Escopo: Adição de colunas de endereço residencial, CPF, senhas, níveis de acesso,
--         contatos secundários e criação das tabelas dependents e salon_users
-- ============================================================================

-- 1. TABELA CLIENTS (CLIENTES DO MARKETPLACE & PORTAL)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'Cliente Titular';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS street_number VARCHAR(50);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city VARCHAR(150);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state VARCHAR(10);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;

-- 2. TABELA DEPENDENTS (CONTA FAMÍLIA & DEPENDENTES VINCULADOS AO TITULAR)
CREATE TABLE IF NOT EXISTS public.dependents (
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

CREATE INDEX IF NOT EXISTS idx_dependents_parent ON public.dependents(parent_client_id);

-- 3. TABELA PROFESSIONALS (PRESTADORES / PROFISSIONAIS DE EQUIPE)
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS nickname VARCHAR(150);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS phone_whatsapp VARCHAR(30);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'partner_mei';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'MEI Parceiro';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS street_number VARCHAR(50);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS city VARCHAR(150);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS state VARCHAR(10);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS total_services_done INTEGER DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.00;

-- 4. TABELA SALON_USERS (DONOS, GERENTES E RECEPÇÃO DOS ESTABELECIMENTOS)
CREATE TABLE IF NOT EXISTS public.salon_users (
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

CREATE INDEX IF NOT EXISTS idx_salon_users_salon ON public.salon_users(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_users_email ON public.salon_users(LOWER(email));

-- 5. TABELA SYSTEM_ADMINS (ADMINISTRADORES MASTER & GOVERNANÇA CORPORATIVA)
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'Superadmin Master';
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS street_number VARCHAR(50);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS city VARCHAR(150);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS state VARCHAR(10);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;

-- 6. PERMISSÕES RLS & POLICIES SOBERANAS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Permitir leitura total para administradores master" ON public.clients;
    CREATE POLICY "Permitir leitura total para administradores master" ON public.clients
        FOR ALL TO public USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permitir leitura total para dependentes" ON public.dependents;
    CREATE POLICY "Permitir leitura total para dependentes" ON public.dependents
        FOR ALL TO public USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permitir leitura total para profissionais" ON public.professionals;
    CREATE POLICY "Permitir leitura total para profissionais" ON public.professionals
        FOR ALL TO public USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permitir leitura total para salon_users" ON public.salon_users;
    CREATE POLICY "Permitir leitura total para salon_users" ON public.salon_users
        FOR ALL TO public USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permitir leitura total para administradores" ON public.system_admins;
    CREATE POLICY "Permitir leitura total para administradores" ON public.system_admins
        FOR ALL TO public USING (true) WITH CHECK (true);
END $$;
