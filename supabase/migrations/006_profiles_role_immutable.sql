-- Fix: Privilege Escalation — authenticated durfte profiles.role per UPDATE ändern
-- Im Supabase SQL Editor ausführen (nach 005).

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- App liest/schreibt Profile nur über Service Role (API-Routes).
REVOKE UPDATE ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.profiles_prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role cannot be changed directly';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_prevent_role_change();
