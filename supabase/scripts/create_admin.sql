-- Ersten Admin anlegen (nach Migration 001 ausführen)
-- 1. Im Supabase Dashboard → Authentication → Users → Add user
--    E-Mail + Passwort setzen, "Auto Confirm User" aktivieren
-- 2. Die User-UUID kopieren und unten einsetzen:

-- INSERT INTO public.profiles (id, email, role)
-- VALUES (
--   'HIER-DIE-AUTH-USER-UUID',
--   'admin@beispiel.de',
--   'admin'
-- );

-- Alternativ per SQL (wenn du die UUID aus auth.users kennst):
-- INSERT INTO public.profiles (id, email, role)
-- SELECT id, email, 'admin'
-- FROM auth.users
-- WHERE email = 'admin@beispiel.de';
