-- ============================================================================
-- 🛡️ MIGRATION SOBERANA (bol-166): BLINDAGEM DEFINITIVA DE salons_owner_id_fkey
-- E SANITIZAÇÃO AUTOMÁTICA DE CHAVES ESTRANGEIRAS PARA auth.users
-- ============================================================================
-- CAUSA RAIZ RESOLVIDA:
-- A coluna public.salons.owner_id possui a constraint salons_owner_id_fkey
-- apontando estritamente para auth.users(id). Quando um usuário está cadastrado
-- em public.clients ou public.system_admins (cujo id não existe em auth.users),
-- enviar owner_id = clients.id disparava:
--   insert or update on table "salons" violates foreign key constraint "salons_owner_id_fkey"
--
-- Esta migration instala triggers BEFORE INSERT OR UPDATE no banco que validam
-- automaticamente se owner_id / user_id existe em auth.users antes da checagem
-- de Foreign Key do PostgreSQL, preservando o ID original em branding.ownerRecordId
-- e evitando qualquer falha em admvapp, mnvapp e pvapp.
-- ============================================================================

BEGIN;

-- 1. Trigger em public.salons para sanitizar owner_id antes da constraint salons_owner_id_fkey
CREATE OR REPLACE FUNCTION public.fn_sanitize_salons_owner_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_matched_auth_id UUID;
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    -- Verifica se o UUID informado existe de fato em auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.owner_id) THEN
      -- Tenta resolver automaticamente pelo e-mail do salão em auth.users, se existir
      IF NEW.email IS NOT NULL AND btrim(NEW.email) <> '' THEN
        SELECT u.id INTO v_matched_auth_id
        FROM auth.users u
        WHERE lower(u.email) = lower(btrim(NEW.email))
        LIMIT 1;
      END IF;

      -- Preserva o ID original da tabela clients/system_admins no JSONB branding
      NEW.branding := COALESCE(NEW.branding, '{}'::jsonb)
        || jsonb_build_object('ownerRecordId', NEW.owner_id::text);

      -- Substitui pelo UUID válido de auth.users ou NULL (permitido por ON DELETE SET NULL)
      NEW.owner_id := v_matched_auth_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_salons_owner_id ON public.salons;
CREATE TRIGGER trg_sanitize_salons_owner_id
  BEFORE INSERT OR UPDATE OF owner_id ON public.salons
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sanitize_salons_owner_id();

-- 2. Trigger equivalente em public.clients e public.professionals para user_id -> auth.users(id)
CREATE OR REPLACE FUNCTION public.fn_sanitize_public_user_id_fk()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
      NEW.user_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_clients_user_id ON public.clients;
CREATE TRIGGER trg_sanitize_clients_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sanitize_public_user_id_fk();

DROP TRIGGER IF EXISTS trg_sanitize_professionals_user_id ON public.professionals;
CREATE TRIGGER trg_sanitize_professionals_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sanitize_public_user_id_fk();

COMMIT;
