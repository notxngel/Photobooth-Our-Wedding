-- ============================================================================
-- supabase/schema.sql — Photo Booth "Matamoro's Wedding" — esquema completo
-- ============================================================================
-- Fuente única de verdad. Reemplaza a los scripts sueltos anteriores
-- (setup.sql, upgrade-fase2.sql, fix-security-advisor.sql,
-- fix-upsert-reintentos.sql), ya fusionados aquí en orden y con nombres
-- consistentes (prefijo "pb_").
--
-- Es 100% idempotente: se puede correr las veces que haga falta sin duplicar
-- nada ni perder fotos ya subidas (no borra la tabla, el bucket ni sus filas).
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO → Run.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────
-- 1. BUCKET DE STORAGE — solo JPEG, máx. 8 MB, lectura pública
-- ────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8388608, array['image/jpeg'])
on conflict (id) do update
    set public             = true,
        file_size_limit    = 8388608,
        allowed_mime_types = array['image/jpeg'];


-- ────────────────────────────────────────────────────────────────────────
-- 2. TABLA public.photos
-- ────────────────────────────────────────────────────────────────────────
-- Nota: las columnas email/email_sent_at/email_error son de la Fase 2
-- (envío por correo), eliminada el 05/07/2026 a favor del QR. Se conservan
-- sin uso para no romper filas ya existentes; la app nunca las lee ni escribe.
create table if not exists public.photos (
    id             uuid primary key default gen_random_uuid(),
    email          text,
    image_path     text not null,
    thumb_path     text,
    email_sent_at  timestamptz,
    email_error    text,
    created_at     timestamptz not null default now()
);

alter table public.photos add column if not exists thumb_path    text;
alter table public.photos add column if not exists email_sent_at timestamptz;
alter table public.photos add column if not exists email_error   text;

alter table public.photos enable row level security;


-- ────────────────────────────────────────────────────────────────────────
-- 2b. PERMISOS — rol service_role (emailer local, tools/emailer/)
-- ────────────────────────────────────────────────────────────────────────
-- service_role se salta las políticas RLS, pero Postgres igual exige el
-- GRANT de tabla por separado (es un mecanismo distinto de RLS). Sin esto
-- el emailer local falla con "permission denied for table photos" al leer
-- lo pendiente (fetchPending) o marcar filas como enviadas (markRows).
grant select, update on public.photos to service_role;


-- ────────────────────────────────────────────────────────────────────────
-- 3. RLS — public.photos (rol anon)
-- ────────────────────────────────────────────────────────────────────────
-- 3a. anon puede INSERTAR su foto (cualquier fila — es un kiosko sin login)
grant insert on public.photos to anon;

drop policy if exists "anon inserta fotos" on public.photos;
drop policy if exists "pb_photos_insert" on public.photos;
create policy "pb_photos_insert"
    on public.photos for insert
    to anon
    with check (true);

-- 3b. anon puede LEER solo las columnas públicas (el correo NUNCA es legible:
--     no está en la lista del GRANT por columna, aunque exista en la tabla)
grant select (id, image_path, thumb_path, created_at) on public.photos to anon;

drop policy if exists "anon lee las columnas publicas" on public.photos;
drop policy if exists "pb_photos_select" on public.photos;
create policy "pb_photos_select"
    on public.photos for select
    to anon
    using (true);


-- ────────────────────────────────────────────────────────────────────────
-- 4. VISTA PÚBLICA public.gallery_photos (para gallery.html)
-- ────────────────────────────────────────────────────────────────────────
-- security_invoker = true → corre con los permisos de quien consulta (anon),
-- no con los del creador. Evita el aviso "Security Definer View" del
-- Security Advisor.
create or replace view public.gallery_photos
    with (security_invoker = true) as
    select id, image_path, created_at, thumb_path
    from public.photos
    order by created_at desc;

grant select on public.gallery_photos to anon;


-- ────────────────────────────────────────────────────────────────────────
-- 5. RLS — storage.objects, bucket 'photos' (rol anon)
-- ────────────────────────────────────────────────────────────────────────
-- 5a. anon puede SUBIR fotos nuevas al bucket
drop policy if exists "anon sube al bucket photos" on storage.objects;
drop policy if exists "pb_storage_insert" on storage.objects;
create policy "pb_storage_insert"
    on storage.objects for insert
    to anon
    with check (bucket_id = 'photos');

-- 5b. anon puede LEER los objetos del bucket (necesario para que el upsert
--     detecte si un archivo ya existe en un reintento)
drop policy if exists "anon lee el bucket photos" on storage.objects;
drop policy if exists "pb_storage_select" on storage.objects;
create policy "pb_storage_select"
    on storage.objects for select
    to anon
    using (bucket_id = 'photos');

-- 5c. anon puede SOBREESCRIBIR un objeto existente (x-upsert en reintentos
--     de subida — sin esto, cualquier reintento tras un corte de wifi falla
--     con 403 para siempre en ese archivo. Verificado contra el proyecto
--     real el 07/07/2026)
drop policy if exists "anon actualiza en el bucket photos" on storage.objects;
drop policy if exists "pb_storage_update" on storage.objects;
create policy "pb_storage_update"
    on storage.objects for update
    to anon
    using (bucket_id = 'photos')
    with check (bucket_id = 'photos');


-- ============================================================================
-- Verificación rápida tras correr este script:
--   1. Security Advisor → Rerun linter → sin avisos sobre gallery_photos.
--   2. gallery.html sigue mostrando las fotos existentes.
--   3. "Guardar en la Galería" en la app funciona y un reintento del mismo
--      archivo no da 403 ni "Duplicate".
-- ============================================================================
