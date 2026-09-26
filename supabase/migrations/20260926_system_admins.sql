-- ==============================================================================
-- 🏛️ VAGOUAPP ADMIN MASTER — SISTEMA DE GESTÃO & ACESSO DE ADMINISTRADORES
-- Tabela: system_admins & admin_access_logs
-- Executar no SQL Editor do Supabase (Cluster VagouApp)
-- ==============================================================================

-- 1. Habilitar extensões necessárias caso ainda não estejam ativas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Administradores do Sistema
CREATE TABLE IF NOT EXISTS public.system_admins (
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

-- 3. Índices para performance e busca rápida
CREATE INDEX IF NOT EXISTS idx_system_admins_username ON public.system_admins (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_system_admins_email ON public.system_admins (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_system_admins_role ON public.system_admins (role);
CREATE INDEX IF NOT EXISTS idx_system_admins_active ON public.system_admins (is_active);

-- 4. Tabela de Logs de Acesso e Auditoria de Segurança
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.system_admins(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('login_success', 'login_failed', 'register', 'recovery_requested', 'password_changed', 'logout')),
    ip_address VARCHAR(50),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_access_logs_admin_id ON public.admin_access_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created_at ON public.admin_access_logs (created_at DESC);

-- 5. Trigger para atualização automática do timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_system_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_admins_updated_at ON public.system_admins;
CREATE TRIGGER trigger_system_admins_updated_at
    BEFORE UPDATE ON public.system_admins
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_system_admins_updated_at();

-- 6. Habilitação de RLS (Row Level Security)
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Segurança (RLS)
-- Como o Admin Master opera com a chave Service Role no backend, o Service Role tem bypass nativo.
-- As políticas abaixo garantem segurança caso conexões anon/auth tentem acessar diretamente.

DROP POLICY IF EXISTS "Service Role bypass em system_admins" ON public.system_admins;
CREATE POLICY "Service Role bypass em system_admins"
    ON public.system_admins
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role bypass em admin_access_logs" ON public.admin_access_logs;
CREATE POLICY "Service Role bypass em admin_access_logs"
    ON public.admin_access_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 8. Seed do Primeiro Super Administrador Fundador (Opcional/Seguro)
-- Senha padrão provisória: Admin@2026! (alterar no primeiro acesso)
INSERT INTO public.system_admins (
    id,
    full_name,
    username,
    email,
    phone_whatsapp,
    password_hash,
    role,
    is_active
) VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Administrador Master Vagou',
    'AdminMaster@Vagou',
    'admin@vagouapp.com',
    '11999990000',
    crypt('Admin@2026!', gen_salt('bf')),
    'superadmin',
    true
)
ON CONFLICT (email) DO NOTHING;
