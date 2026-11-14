-- ============================================================================
-- SCHEMA DE PERGUNTAS SECRETAS & RECUPERAÇÃO DE USUÁRIO — TRÍADE VAGOUAPP (SQL v5.0 / bol-159 / bol-160)
-- Homologação Oficial da Tríade: mnvapp ⇄ pvapp ⇄ admvapp
-- Política: 100% Idempotente (Zero DROP TABLE) — Único seed oficial permitido (3 perguntas).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. Catálogo Oficial de Perguntas Secretas (3 perguntas padrão)
CREATE TABLE IF NOT EXISTS public.security_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  category_label TEXT NOT NULL,
  question_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.security_questions
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS category_label TEXT DEFAULT 'Segurança',
  ADD COLUMN IF NOT EXISTS question_text TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

INSERT INTO public.security_questions (code, category_label, question_text, is_active)
VALUES
  ('first_pet', 'Primeiro Animal de Estimação', 'Qual o nome do seu primeiro animal de estimação?', true),
  ('city_at_10', 'Cidade na Infância', 'Em qual cidade você morava aos 10 anos de idade?', true),
  ('childhood_friend', 'Amigo de Infância', 'Qual o primeiro nome do seu melhor amigo de infância?', true)
ON CONFLICT (code) DO UPDATE
SET
  category_label = EXCLUDED.category_label,
  question_text = EXCLUDED.question_text,
  is_active = true;

-- Desativa eventuais perguntas legadas fora do trio oficial sem apagar histórico
UPDATE public.security_questions
SET is_active = false
WHERE code NOT IN ('first_pet', 'city_at_10', 'childhood_friend');

-- 2. Respostas Criptografadas / Normalizadas vinculadas ao Cliente
CREATE TABLE IF NOT EXISTS public.user_security_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  question_code TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  answer_normalized TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, question_code)
);

CREATE INDEX IF NOT EXISTS idx_user_security_answers_client ON public.user_security_answers(client_id);
CREATE INDEX IF NOT EXISTS idx_security_answers_phone ON public.user_security_answers(phone);
CREATE INDEX IF NOT EXISTS idx_security_answers_email ON public.user_security_answers(email);

-- 3. Colunas de Compatibilidade Direta em public.clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS security_question_code TEXT,
  ADD COLUMN IF NOT EXISTS security_answer_normalized TEXT;

-- 4. RPC: Obter Pergunta Secreta Aleatória Ativa
CREATE OR REPLACE FUNCTION public.get_random_security_question()
RETURNS TABLE (
  code TEXT,
  question TEXT
) LANGUAGE sql STABLE AS $$
  SELECT code, COALESCE(question_text, category_label) AS question
  FROM public.security_questions
  WHERE COALESCE(is_active, true) = true
  ORDER BY random()
  LIMIT 1;
$$;

-- 5. RPC: Recuperar Usuário (@username) pela Resposta Secreta
CREATE OR REPLACE FUNCTION public.recover_username_by_security_answer(
  p_identifier TEXT,
  p_question_code TEXT,
  p_answer_raw TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clean_identifier TEXT;
  v_normalized_answer TEXT;
  v_client RECORD;
  v_sec_record RECORD;
BEGIN
  v_clean_identifier := trim(p_identifier);
  IF v_clean_identifier ~ '^[0-9\(\)\s\-\+]+$' THEN
    v_clean_identifier := regexp_replace(v_clean_identifier, '\D', '', 'g');
  ELSE
    v_clean_identifier := lower(v_clean_identifier);
  END IF;

  v_normalized_answer := lower(trim(regexp_replace(p_answer_raw, '\s+', ' ', 'g')));

  SELECT * INTO v_sec_record
  FROM public.user_security_answers
  WHERE (
      regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_clean_identifier
      OR lower(COALESCE(email, '')) = v_clean_identifier
      OR client_id IN (
        SELECT id::TEXT FROM public.clients
        WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_clean_identifier
           OR lower(COALESCE(email, '')) = v_clean_identifier
      )
    )
    AND question_code = p_question_code
    AND (
      lower(trim(COALESCE(answer_normalized, ''))) = v_normalized_answer
      OR lower(trim(COALESCE(answer_hash, ''))) = v_normalized_answer
    )
  LIMIT 1;

  IF FOUND THEN
    SELECT username, COALESCE(full_name, name) AS name, email INTO v_client
    FROM public.clients
    WHERE id::TEXT = v_sec_record.client_id
       OR regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_clean_identifier
       OR lower(COALESCE(email, '')) = v_clean_identifier
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'username', COALESCE(v_client.username, split_part(v_client.email, '@', 1)),
      'name', v_client.name
    );
  END IF;

  SELECT username, COALESCE(full_name, name) AS name, email INTO v_client
  FROM public.clients
  WHERE (regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_clean_identifier OR lower(COALESCE(email, '')) = v_clean_identifier)
    AND security_question_code = p_question_code
    AND lower(trim(regexp_replace(COALESCE(security_answer_normalized, ''), '\s+', ' ', 'g'))) = v_normalized_answer
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'username', COALESCE(v_client.username, split_part(v_client.email, '@', 1)),
      'name', v_client.name
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Resposta incorreta ou dados de identificação não conferem.'
  );
END;
$$;

GRANT SELECT ON public.security_questions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_security_answers TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_random_security_question() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recover_username_by_security_answer(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
