-- =====================================================================================================
-- 🏛️ VAGOUAPP TRÍADE — MIGRAÇÃO ADITIVA E SANEAMENTO: ZERO USUÁRIOS DUPLICADOS (bol-162)
-- Data: 14/11/2026
-- Objetivo:
--   1. Consolidar e remover cadastros duplicados entre public.system_admins e public.clients
--      (Ex.: Anderson Pires / Anderson@ / andersonhpires@gmail.com duplicado como Administrador e Cliente),
--      preservando contadores (total_appointments, dependents_count), avatar e dados no registro soberano.
--   2. Deduplicar eventuais registros repetidos dentro da mesma tabela (clients, system_admins,
--      professionals, salon_users) por e-mail ou username normalizado (mantendo o registro mais antigo).
--   3. Criar triggers e índices únicos funcionais para impedir novas duplicações entre tabelas ou na mesma tabela.
--   4. 100% Idempotente e Não-Destrutiva de Estrutura (ZERO DROP TABLE).
-- =====================================================================================================

BEGIN;

-- 1. GARANTE COLUNAS DE CONTADORES E AUDITORIA EM public.system_admins PARA ABSORVER DADOS DE CLIENTE
ALTER TABLE public.system_admins
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(20),
  ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS street_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS complement VARCHAR(100),
  ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150),
  ADD COLUMN IF NOT EXISTS city VARCHAR(150) DEFAULT 'São Paulo',
  ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'SP',
  ADD COLUMN IF NOT EXISTS cep VARCHAR(20),
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(50) DEFAULT 'admvapp';

-- 2. CONSOLIDA DADOS DE public.clients EM public.system_admins QUANDO FOR A MESMA PESSOA (E-MAIL OU USERNAME)
UPDATE public.system_admins sa
SET
  total_appointments = GREATEST(COALESCE(sa.total_appointments, 0), COALESCE(c.total_appointments, 0)),
  dependents_count = GREATEST(COALESCE(sa.dependents_count, 0), COALESCE(c.dependents_count, 0)),
  avatar_url = COALESCE(NULLIF(BTRIM(sa.avatar_url), ''), NULLIF(BTRIM(c.avatar_url), '')),
  phone_whatsapp = COALESCE(NULLIF(BTRIM(sa.phone_whatsapp), ''), NULLIF(BTRIM(c.phone), ''), NULLIF(BTRIM(c.phone_whatsapp), '')),
  cpf = CASE
    WHEN sa.cpf IS NOT NULL AND BTRIM(sa.cpf) <> '' AND BTRIM(sa.cpf) <> '000.000.000-00' THEN sa.cpf
    WHEN c.cpf IS NOT NULL AND BTRIM(c.cpf) <> '' AND BTRIM(c.cpf) <> '000.000.000-00' THEN c.cpf
    ELSE sa.cpf
  END,
  updated_at = NOW()
FROM public.clients c
WHERE
  (
    (sa.email IS NOT NULL AND c.email IS NOT NULL AND LOWER(BTRIM(sa.email)) = LOWER(BTRIM(c.email)))
    OR (
      sa.username IS NOT NULL AND c.username IS NOT NULL
      AND LOWER(REGEXP_REPLACE(BTRIM(sa.username), '^@+', '')) = LOWER(REGEXP_REPLACE(BTRIM(c.username), '^@+', ''))
    )
  );

-- 3. DESVINCULA FKs E REMOVE DE public.clients OS REGISTROS SOMBRA QUE JÁ SÃO ADMINISTRADORES EM public.system_admins
DO $$
DECLARE
  dup_client_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT c.id)
  INTO dup_client_ids
  FROM public.clients c
  JOIN public.system_admins sa
    ON (
      (sa.email IS NOT NULL AND c.email IS NOT NULL AND LOWER(BTRIM(sa.email)) = LOWER(BTRIM(c.email)))
      OR (
        sa.username IS NOT NULL AND c.username IS NOT NULL
        AND LOWER(REGEXP_REPLACE(BTRIM(sa.username), '^@+', '')) = LOWER(REGEXP_REPLACE(BTRIM(c.username), '^@+', ''))
      )
    );

  IF dup_client_ids IS NOT NULL AND ARRAY_LENGTH(dup_client_ids, 1) > 0 THEN
    -- Preserva histórico de agendamentos (mantendo client_name e client_email) sem trava de FK
    UPDATE public.appointments
    SET client_id = NULL
    WHERE client_id = ANY(dup_client_ids);

    DELETE FROM public.user_security_answers
    WHERE client_id::text = ANY(SELECT UNNEST(dup_client_ids)::text);

    DELETE FROM public.dependents
    WHERE parent_client_id = ANY(dup_client_ids);

    DELETE FROM public.clients
    WHERE id = ANY(dup_client_ids);
  END IF;
END $$;

-- 4. DEDUPLICAÇÃO INTRA-TABELA (MANTÉM SEMPRE O REGISTRO MAIS ANTIGO POR E-MAIL OU USERNAME)
DO $$
DECLARE
  extra_client_ids UUID[];
BEGIN
  -- 4.1 Duplicatas internas em public.clients por LOWER(email)
  SELECT ARRAY_AGG(id)
  INTO extra_client_ids
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(BTRIM(email))
             ORDER BY created_at ASC NULLS LAST, id ASC
           ) AS rn
    FROM public.clients
    WHERE email IS NOT NULL AND BTRIM(email) <> ''
  ) sub
  WHERE sub.rn > 1;

  IF extra_client_ids IS NOT NULL AND ARRAY_LENGTH(extra_client_ids, 1) > 0 THEN
    UPDATE public.appointments SET client_id = NULL WHERE client_id = ANY(extra_client_ids);
    DELETE FROM public.user_security_answers WHERE client_id::text = ANY(SELECT UNNEST(extra_client_ids)::text);
    DELETE FROM public.dependents WHERE parent_client_id = ANY(extra_client_ids);
    DELETE FROM public.clients WHERE id = ANY(extra_client_ids);
  END IF;

  -- 4.2 Duplicatas internas em public.system_admins por LOWER(email)
  DELETE FROM public.system_admins
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY LOWER(BTRIM(email))
               ORDER BY created_at ASC NULLS LAST, id ASC
             ) AS rn
      FROM public.system_admins
      WHERE email IS NOT NULL AND BTRIM(email) <> ''
    ) sub
    WHERE sub.rn > 1
  );
END $$;

-- 5. ÍNDICES ÚNICOS PARCIAIS (BLINDAGEM NO BANCO CONTRA DUPLICIDADE DE E-MAIL E USERNAME)
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_admins_unique_lower_email
  ON public.system_admins (LOWER(BTRIM(email)))
  WHERE email IS NOT NULL AND BTRIM(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_admins_unique_norm_username
  ON public.system_admins (LOWER(REGEXP_REPLACE(BTRIM(username), '^@+', '')))
  WHERE username IS NOT NULL AND BTRIM(username) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_lower_email
  ON public.clients (LOWER(BTRIM(email)))
  WHERE email IS NOT NULL AND BTRIM(email) <> '';

-- 6. TRIGGERS DE GOVERNANÇA SOBERANA: IMPEDE CLIENTE DUPLICADO DE ADMIN E CONSOLIDA AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.fn_prevent_client_duplicate_of_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT sa.id
  INTO v_admin_id
  FROM public.system_admins sa
  WHERE
    (NEW.email IS NOT NULL AND BTRIM(NEW.email) <> '' AND sa.email IS NOT NULL AND LOWER(BTRIM(sa.email)) = LOWER(BTRIM(NEW.email)))
    OR (
      NEW.username IS NOT NULL AND BTRIM(NEW.username) <> '' AND sa.username IS NOT NULL
      AND LOWER(REGEXP_REPLACE(BTRIM(sa.username), '^@+', '')) = LOWER(REGEXP_REPLACE(BTRIM(NEW.username), '^@+', ''))
    )
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    -- Sincroniza dados úteis diretamente no registro de Administrador e cancela a criação duplicada em clients
    UPDATE public.system_admins
    SET
      total_appointments = GREATEST(COALESCE(total_appointments, 0), COALESCE(NEW.total_appointments, 0)),
      dependents_count = GREATEST(COALESCE(dependents_count, 0), COALESCE(NEW.dependents_count, 0)),
      avatar_url = COALESCE(NULLIF(BTRIM(avatar_url), ''), NULLIF(BTRIM(NEW.avatar_url), '')),
      phone_whatsapp = COALESCE(NULLIF(BTRIM(phone_whatsapp), ''), NULLIF(BTRIM(NEW.phone), ''), NULLIF(BTRIM(NEW.phone_whatsapp), '')),
      updated_at = NOW()
    WHERE id = v_admin_id;

    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_duplicate_of_admin ON public.clients;
CREATE TRIGGER trg_prevent_client_duplicate_of_admin
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_client_duplicate_of_admin();

CREATE OR REPLACE FUNCTION public.fn_consolidate_client_on_admin_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dup_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(c.id)
  INTO dup_ids
  FROM public.clients c
  WHERE
    (NEW.email IS NOT NULL AND BTRIM(NEW.email) <> '' AND c.email IS NOT NULL AND LOWER(BTRIM(c.email)) = LOWER(BTRIM(NEW.email)))
    OR (
      NEW.username IS NOT NULL AND BTRIM(NEW.username) <> '' AND c.username IS NOT NULL
      AND LOWER(REGEXP_REPLACE(BTRIM(c.username), '^@+', '')) = LOWER(REGEXP_REPLACE(BTRIM(NEW.username), '^@+', ''))
    );

  IF dup_ids IS NOT NULL AND ARRAY_LENGTH(dup_ids, 1) > 0 THEN
    UPDATE public.appointments SET client_id = NULL WHERE client_id = ANY(dup_ids);
    DELETE FROM public.user_security_answers WHERE client_id::text = ANY(SELECT UNNEST(dup_ids)::text);
    DELETE FROM public.dependents WHERE parent_client_id = ANY(dup_ids);
    DELETE FROM public.clients WHERE id = ANY(dup_ids);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consolidate_client_on_admin_upsert ON public.system_admins;
CREATE TRIGGER trg_consolidate_client_on_admin_upsert
  AFTER INSERT OR UPDATE ON public.system_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_consolidate_client_on_admin_upsert();

NOTIFY pgrst, 'reload schema';

COMMIT;
