-- ============================================================================
-- 💈 VAGOUAPP — TRÍADE GOVERNANCE: MIGRAÇÃO RESILIENTE DE CADASTRO & SALON CLIENTS
-- Data: 18/10/2026
-- ============================================================================

-- 1. Garante que a extensão uuid-ossp está ativada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Atualização da Tabela CLIENTS (Adiciona origin_type e origin_salon_id se não existirem)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS origin_type VARCHAR(20) DEFAULT 'portal';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS origin_salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL;

-- 3. Criação da Tabela SALON_CLIENTS (Se não existir)
CREATE TABLE IF NOT EXISTS public.salon_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    source VARCHAR(50) DEFAULT 'direct_registration',
    status VARCHAR(30) DEFAULT 'active',
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    total_appointments INTEGER DEFAULT 0,
    total_spent NUMERIC(10,2) DEFAULT 0.00,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Adiciona colunas individualmente caso a tabela salon_clients já existia previamente
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct_registration';
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.salon_clients ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Aplica a restrição de unicidade (salon_id + client_id) com proteção contra duplicidade
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_salon_client'
    ) THEN
        ALTER TABLE public.salon_clients ADD CONSTRAINT uq_salon_client UNIQUE (salon_id, client_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 6. Índices de Performance com verificação de segurança
CREATE INDEX IF NOT EXISTS idx_clients_origin_salon ON public.clients(origin_salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_clients_salon ON public.salon_clients(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_clients_client ON public.salon_clients(client_id);

-- 7. Stored Procedure / RPC para Registro e Vínculo Instantâneo
CREATE OR REPLACE FUNCTION public.register_triade_user(
    p_full_name VARCHAR(255),
    p_username VARCHAR(100),
    p_phone VARCHAR(30),
    p_email VARCHAR(255),
    p_password_hash TEXT,
    p_cep VARCHAR(20),
    p_street VARCHAR(255),
    p_number VARCHAR(50),
    p_complement VARCHAR(100),
    p_neighborhood VARCHAR(150),
    p_city VARCHAR(150),
    p_state VARCHAR(10),
    p_origin_type VARCHAR(20) DEFAULT 'portal',
    p_origin_salon_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_client_id UUID;
    v_result JSONB;
BEGIN
    -- Localiza cliente existente por email ou telefone
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE LOWER(email) = LOWER(p_email) OR phone = p_phone
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
        UPDATE public.clients SET
            name = p_full_name,
            username = COALESCE(p_username, username),
            password_hash = COALESCE(p_password_hash, password_hash),
            cep = p_cep,
            address = p_street,
            street_number = p_number,
            complement = p_complement,
            neighborhood = p_neighborhood,
            city = p_city,
            state = p_state,
            updated_at = NOW()
        WHERE id = v_client_id;
    ELSE
        INSERT INTO public.clients (
            name, username, phone, email, password_hash,
            cep, address, street_number, complement, neighborhood, city, state,
            origin_type, origin_salon_id
        ) VALUES (
            p_full_name, p_username, p_phone, LOWER(p_email), p_password_hash,
            p_cep, p_street, p_number, p_complement, p_neighborhood, p_city, p_state,
            p_origin_type, p_origin_salon_id
        ) RETURNING id INTO v_client_id;
    END IF;

    -- Se houver salão de origem, insere/atualiza vínculo instantâneo na carteira do salão
    IF p_origin_salon_id IS NOT NULL THEN
        INSERT INTO public.salon_clients (
            salon_id, client_id, source, last_interaction_at
        ) VALUES (
            p_origin_salon_id, v_client_id, 'embed_form', NOW()
        )
        ON CONFLICT (salon_id, client_id) DO UPDATE SET
            last_interaction_at = NOW(),
            updated_at = NOW();
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'client_id', v_client_id,
        'full_name', p_full_name,
        'email', p_email,
        'origin_salon_id', p_origin_salon_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Habilita RLS de Forma Segura
ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Permitir leitura e escrita para clientes do salao" ON public.salon_clients;
    CREATE POLICY "Permitir leitura e escrita para clientes do salao" ON public.salon_clients
        FOR ALL TO public USING (true) WITH CHECK (true);
END $$;
