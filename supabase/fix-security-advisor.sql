-- ============================================================================
-- supabase/fix-security-advisor.sql — resuelve el aviso del Security Advisor:
--   "Security Definer View: public.gallery_photos" (CRITICAL)
--
-- Ejecuta TODO este script UNA vez en: Supabase → SQL Editor → New query → Run
-- (Es seguro correrlo más de una vez: todo es idempotente.)
--
-- Qué hace y por qué:
--   La vista `gallery_photos` se ejecutaba con los permisos de su creador
--   (comportamiento "security definer"), que es lo que el Advisor marca.
--   Este script invierte el esquema sin cambiar lo que ve la app:
--     1. El rol anónimo puede leer SOLO las columnas públicas de `photos`
--        (el correo NO está en la lista: sigue siendo ilegible).
--     2. La vista pasa a ejecutarse con los permisos de quien consulta
--        ("security invoker") — el aviso desaparece.
--   La galería funciona exactamente igual que antes.
-- ============================================================================

-- 1. anon puede leer SOLO las columnas públicas de photos --------------------
--    (privilegio por columna + política RLS de lectura; hacen falta ambos)
grant select (id, image_path, thumb_path, created_at) on public.photos to anon;

drop policy if exists "anon lee las columnas publicas" on public.photos;
create policy "anon lee las columnas publicas"
    on public.photos for select
    to anon
    using (true);

-- 2. La vista se ejecuta con los permisos de quien consulta ------------------
--    (requiere Postgres 15+, que es lo que usa este proyecto)
alter view public.gallery_photos set (security_invoker = true);

-- Listo. Verifica en: Dashboard → Advisors → Security Advisor → "Rerun linter"
-- (el aviso sobre gallery_photos debe desaparecer) y recarga gallery.html
-- (las fotos deben seguir apareciendo).
