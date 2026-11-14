-- =====================================================================================================
-- 🏛️ MIGRAÇÃO ADITIVA DE AUDITORIA TEMPORAL & ORIGEM CADASTRAL — TRÍADE VAGOUAPP (bol-161)
-- Data: 14/11/2026 | Origem: admvapp (adm.vagouapp.com) ➔ mnvapp & pvapp
-- Regra Inegociável: 100% Idempotente, ZERO DROP TABLE, ZERO perda de dados existentes.
-- Garante registro exato de data/hora (TIMESTAMPTZ) e canal de origem (created_via) para
-- todos os Usuários e Estabelecimentos do ecossistema compartilhado.
-- =====================================================================================================

BEGIN;

-- 1. ESTABELECIMENTOS (public.salons)
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(50);

ALTER TABLE public.salons ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.salons ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_salons_created_at ON public.salons (created_at DESC);

-- 2. CLIENTES TITULARES (public.clients)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS origin_type VARCHAR(50) DEFAULT 'portal',
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(50);

ALTER TABLE public.clients ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.clients ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at DESC);

-- 3. DEPENDENTES FAMILIARES (public.dependents)
ALTER TABLE public.dependents
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(50);

ALTER TABLE public.dependents ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.dependents ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_dependents_created_at ON public.dependents (created_at DESC);

-- 4. PROFISSIONAIS DA REDE (public.professionals)
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(50);

ALTER TABLE public.professionals ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.professionals ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_professionals_created_at ON public.professionals (created_at DESC);

-- 5. GESTORES / PROPRIETÁRIOS DE SALÃO (public.salon_users)
ALTER TABLE public.salon_users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(50);

ALTER TABLE public.salon_users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.salon_users ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_salon_users_created_at ON public.salon_users (created_at DESC);

-- 6. ADMINISTRADORES DO SISTEMA (public.system_admins)
ALTER TABLE public.system_admins
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(50) DEFAULT 'admvapp';

ALTER TABLE public.system_admins ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.system_admins ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_system_admins_created_at ON public.system_admins (created_at DESC);

-- 7. GARANTE REALTIME ATIVO EM salon_users E system_admins ALÉM DAS DEMAIS TABELAS
DO $$
DECLARE
    tbl TEXT;
    audit_tables TEXT[] := ARRAY['salons', 'clients', 'dependents', 'professionals', 'salon_users', 'system_admins'];
BEGIN
    FOREACH tbl IN ARRAY audit_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
            IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_publication_tables
                    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
                ) THEN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
                END IF;
            END IF;
        END IF;
    END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
