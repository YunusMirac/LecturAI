-- Atomare Registrierung nach Auth-User-Anlage (Profil + Einladung + Kursmitgliedschaft)
-- Im Supabase SQL Editor ausführen (nach 006).

CREATE OR REPLACE FUNCTION public.complete_invited_registration(
  p_user_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_invitation_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_profile_role TEXT;
BEGIN
  IF p_role NOT IN ('teacher', 'student') THEN
    RAISE EXCEPTION 'invalid profile role';
  END IF;

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation not found';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation not pending';
  END IF;

  IF v_inv.expires_at < v_now THEN
    RAISE EXCEPTION 'invitation expired';
  END IF;

  IF lower(trim(v_inv.email)) <> lower(trim(p_email)) THEN
    RAISE EXCEPTION 'email mismatch';
  END IF;

  v_profile_role := CASE WHEN v_inv.role = 'student' THEN 'student' ELSE 'teacher' END;

  IF v_profile_role <> p_role THEN
    RAISE EXCEPTION 'role mismatch';
  END IF;

  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (p_user_id, lower(trim(p_email)), v_profile_role, v_now, v_now);

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = v_now
  WHERE id = p_invitation_id AND status = 'pending';

  IF v_inv.role = 'student' AND v_inv.course_id IS NOT NULL THEN
    INSERT INTO public.course_members (course_id, student_id, joined_at)
    VALUES (v_inv.course_id, p_user_id, v_now);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_invited_registration(UUID, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_invited_registration(UUID, TEXT, TEXT, UUID) TO service_role;
