-- ============================================================================
-- supabase/admin-setup.sql — Permisos del PANEL DE ADMINISTRADOR
-- Ejecuta TODO esto UNA vez en: Supabase → SQL Editor → New query → Run
--
-- Da permiso de LEER y BORRAR fotos SOLO al rol `authenticated` (el admin que
-- inicia sesión). Los invitados (rol anon) siguen pudiendo solo subir.
--
-- Defensa en profundidad: además de exigir sesión iniciada, las políticas
-- exigen que el correo del token sea el del admin. Así, aunque alguien lograra
-- registrarse como usuario, NO podría leer ni borrar nada.
-- Si los novios usan dos correos, añade el segundo dentro de los in (...).
--
-- ⚠️ Antes o después, en Supabase → Authentication:
--    1) Crea tu usuario admin (Users → Add user → con correo y contraseña).
--       El correo debe coincidir con el de las políticas de abajo.
--    2) Desactiva el registro público (Providers → Email → "Allow new users to
--       sign up" = OFF), para que nadie más pueda crearse una cuenta.
-- ============================================================================

-- Recordatorio: hacen falta DOS cosas — el GRANT (privilegio) y la política RLS.

-- 1. Privilegios a nivel tabla para el admin -------------------------------
grant select, delete on public.photos to authenticated;

-- 2. Políticas RLS: el admin (sesión iniciada + su correo) lee y borra -------
drop policy if exists "admin lee fotos" on public.photos;
create policy "admin lee fotos"
    on public.photos for select
    to authenticated
    using ( auth.email() in ('angelmm263@gmail.com') );

drop policy if exists "admin borra fotos" on public.photos;
create policy "admin borra fotos"
    on public.photos for delete
    to authenticated
    using ( auth.email() in ('angelmm263@gmail.com') );

-- 3. Storage: el admin puede BORRAR archivos del bucket 'photos' ------------
drop policy if exists "admin borra del bucket photos" on storage.objects;
create policy "admin borra del bucket photos"
    on storage.objects for delete
    to authenticated
    using ( bucket_id = 'photos' and auth.email() in ('angelmm263@gmail.com') );

-- Listo. Abre /admin.html, inicia sesión con tu usuario admin y podrás borrar.
