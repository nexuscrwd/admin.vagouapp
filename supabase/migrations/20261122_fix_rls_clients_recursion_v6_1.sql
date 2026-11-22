-- =====================================================================================================
-- VAGOUAPP TRÍADE — HOTFIX EMERGENCIAL RLS v6.1 (bol-182)
-- Corrige: ERROR 42P17: infinite recursion detected in policy for relation "clients" / "salon_clients"
-- Impacto: Destrava imediatamente public.clients, public.salon_clients, public.appointments,
--          public.dependents, public.user_security_answers e public.profiles em pvapp, mnvapp e admvapp.
-- Segurança: 100% IDEMPOTENTE • ZERO PERDA DE DADOS • ZERO DROP TABLE
-- Executar no Supabase Dashboard -> SQL Editor (projeto xemenxdhuoekytyhmgyt)
-- =====================================================================================================

BEGIN;

-- 1. Novas funções SECURITY DEFINER para quebrar o ciclo mútuo de RLS entre clients <-> salon_clients
CREATE OR REPLACE FUNCTION public.is_client_owner(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = p_client_id
      AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_client_salon(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salon_clients sc
    WHERE sc.client_id = p_client_id
      AND public.is_salon_member(sc.salon_id)
  );
$$;

-- 2. PROFILES: permitir INSERT autenticado para o próprio usuário (habilita upsert seguro via JWT)
DROP POLICY IF EXISTS "profiles_insert_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_insert_self_or_admin" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR public.is_super_admin());

-- 3. CLIENTS: substituir subquery direta em salon_clients por função SECURITY DEFINER
DROP POLICY IF EXISTS "clients_self_salon_or_admin" ON public.clients;
CREATE POLICY "clients_self_salon_or_admin" ON public.clients
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR public.is_member_of_client_salon(id)
  );

-- 4. SALON_CLIENTS: substituir subquery direta em clients por função SECURITY DEFINER (SELECT e INSERT/UPDATE)
DROP POLICY IF EXISTS "salon_clients_member_access" ON public.salon_clients;
CREATE POLICY "salon_clients_member_access" ON public.salon_clients
  FOR ALL USING (
    public.is_salon_member(salon_id)
    OR public.is_client_owner(client_id)
  )
  WITH CHECK (
    public.is_salon_member(salon_id)
    OR public.is_client_owner(client_id)
  );

-- 5. DEPENDENTS: usar is_client_owner() para eliminar cascata de RLS em clients
DROP POLICY IF EXISTS "dependents_owner_or_admin" ON public.dependents;
CREATE POLICY "dependents_owner_or_admin" ON public.dependents
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_client_owner(parent_client_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_client_owner(parent_client_id)
  );

-- 6. USER_SECURITY_ANSWERS: usar is_client_owner() para eliminar cascata de RLS em clients
DROP POLICY IF EXISTS "user_security_answers_owner_or_admin" ON public.user_security_answers;
CREATE POLICY "user_security_answers_owner_or_admin" ON public.user_security_answers
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_client_owner(client_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_client_owner(client_id)
  );

-- 7. APPOINTMENTS: usar is_client_owner() para eliminar cascata de RLS em clients
DROP POLICY IF EXISTS "appointments_tenant_or_owner_select" ON public.appointments;
CREATE POLICY "appointments_tenant_or_owner_select" ON public.appointments
  FOR SELECT USING (
    client_user_id = auth.uid()
    OR public.is_salon_member(salon_id)
    OR public.is_client_owner(client_id)
  );

-- 8. TRIGGER fn_handle_new_auth_user: persistir username em public.profiles no signup direto via Supabase Auth
CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_origin TEXT;
  v_phone TEXT;
  v_cpf TEXT;
  v_username TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(COALESCE(NEW.email, 'usuario'), '@', 1)
  );
  v_role := COALESCE(
    NULLIF(btrim(NEW.raw_app_meta_data ->> 'role'), ''),
    'client'
  );
  IF v_role NOT IN ('super_admin', 'salon_owner', 'salon_staff', 'client') THEN
    v_role := 'client';
  END IF;
  v_origin := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'created_via'), ''), 'mnvapp');
  IF v_origin NOT IN ('admvapp', 'mnvapp', 'pvapp', 'system') THEN
    v_origin := 'mnvapp';
  END IF;
  v_phone := NULLIF(btrim(NEW.raw_user_meta_data ->> 'phone'), '');
  v_cpf := NULLIF(btrim(NEW.raw_user_meta_data ->> 'cpf'), '');
  v_username := NULLIF(btrim(NEW.raw_user_meta_data ->> 'username'), '');

  IF v_username IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(btrim(p.username)) = lower(v_username)
      AND p.id <> NEW.id
  ) THEN
    v_username := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, username, cpf, phone, role, created_via)
  VALUES (NEW.id, lower(btrim(NEW.email)), v_name, v_username, v_cpf, v_phone, v_role, v_origin)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    updated_at = NOW();

  INSERT INTO public.clients (user_id, full_name, email, phone, cpf, created_via)
  VALUES (NEW.id, v_name, lower(btrim(NEW.email)), v_phone, v_cpf, v_origin)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;
