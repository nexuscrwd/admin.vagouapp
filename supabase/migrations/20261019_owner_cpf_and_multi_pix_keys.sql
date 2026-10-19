-- ============================================================================
-- 💈 VAGOUAPP — TRÍADE GOVERNANCE: MIGRAÇÃO DE CPF PESSOAL & MÚLTIPLAS CHAVES PIX
-- Data: 19/10/2026
-- Projetos Impactados: admvapp, mnvapp, pvapp
-- ============================================================================

-- 1. TABELA SALONS: Adiciona owner_cpf e pix_keys (JSONB)
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS owner_cpf VARCHAR(20);
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_keys JSONB DEFAULT '[]'::jsonb;

-- 2. TABELA CLIENTS: Garante coluna cpf e índices de busca
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON public.clients(cpf);
CREATE INDEX IF NOT EXISTS idx_salons_owner_cpf ON public.salons(owner_cpf);

-- 3. MIGRAÇÃO SEGURA DE DADOS LEGADOS (BACKFILL)
-- A) Se um salão antigo tinha CPF (11 dígitos) salvo no document_number, move para owner_cpf
UPDATE public.salons 
SET owner_cpf = document_number 
WHERE (owner_cpf IS NULL OR owner_cpf = '')
  AND LENGTH(REGEXP_REPLACE(COALESCE(document_number, ''), '\D', '', 'g')) = 11;

-- B) Limpa document_number e legal_name dos salões autônomos que tinham CPF gravado como documento fiscal
UPDATE public.salons 
SET document_number = NULL,
    document_type = 'CPF',
    legal_name = ''
WHERE LENGTH(REGEXP_REPLACE(COALESCE(document_number, ''), '\D', '', 'g')) = 11;

-- C) Se o salão possui pix_key mas pix_keys estiver vazio ou nulo, converte para array JSONB
UPDATE public.salons
SET pix_keys = jsonb_build_array(
    jsonb_build_object(
        'id', 'pix-legacy-' || SUBSTRING(id::text, 1, 8),
        'type', CASE 
            WHEN pix_key ~ '^[0-9]{11}$' OR pix_key ~ '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$' THEN 'cpf'
            WHEN pix_key ~ '^[0-9]{14}$' OR pix_key ~ '^[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}-[0-9]{2}$' THEN 'cnpj'
            WHEN pix_key LIKE '%@%' THEN 'email'
            WHEN pix_key ~ '^\+?[0-9]{10,13}$' THEN 'phone'
            ELSE 'evp'
        END,
        'key', pix_key,
        'holderName', COALESCE(NULLIF(legal_name, ''), trade_name),
        'institution', 'Conta Principal (SPI / PIX)',
        'isPrimary', true,
        'verified', true
    )
)
WHERE pix_key IS NOT NULL 
  AND pix_key <> '' 
  AND (pix_keys IS NULL OR pix_keys = '[]'::jsonb);

-- 4. ATUALIZAÇÃO DA RPC register_triade_user COM SUPORTE A CPF PESSOAL
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
    p_origin_salon_id UUID DEFAULT NULL,
    p_cpf VARCHAR(20) DEFAULT NULL
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
            cpf = COALESCE(p_cpf, cpf),
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
            name, username, cpf, phone, email, password_hash,
            cep, address, street_number, complement, neighborhood, city, state,
            origin_type, origin_salon_id
        ) VALUES (
            p_full_name, p_username, p_cpf, p_phone, LOWER(p_email), p_password_hash,
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
        'cpf', p_cpf,
        'origin_salon_id', p_origin_salon_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
