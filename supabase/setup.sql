-- ============================================================================
-- supabase/setup.sql — Photo Booth "Matamoro's Wedding"
-- Ejecuta TODO este script una sola vez en: Supabase → SQL Editor → New query → Run
-- Crea el bucket de fotos, la tabla, la vista pública de la galería y los
-- permisos para que la app (clave anon) pueda subir fotos sin exponer correos.
--
-- Si tu proyecto YA existía antes de la Fase 2 (correo + admin + miniaturas),
-- corre también supabase/upgrade-fase2.sql (es idempotente).
-- ============================================================================

-- 1. Bucket de almacenamiento (público para lectura de imágenes) -------------
--    Solo acepta JPEG y máximo 8 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8388608, array['image/jpeg'])
on conflict (id) do update
    set file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- 2. Tabla de fotos ----------------------------------------------------------
create table if not exists public.photos (
    id             uuid primary key default gen_random_uuid(),
    email          text,                    -- correo del invitado (opcional)
    image_path     text not null,           -- archivo en el bucket
    thumb_path     text,                    -- miniatura ligera (galería rápida)
    email_sent_at  timestamptz,             -- cuándo se le envió su foto
    email_error    text,                    -- error permanente de envío (si hubo)
    created_at     timestamptz not null default now()
);

alter table public.photos enable row level security;

-- 2a. Cualquiera (rol anónimo) puede INSERTAR su foto...
--     Hacen falta DOS cosas: el privilegio (GRANT) y la política (RLS).
grant insert on public.photos to anon;

drop policy if exists "anon inserta fotos" on public.photos;
create policy "anon inserta fotos"
    on public.photos for insert
    to anon
    with check (true);

-- 2b. ...y puede LEER solo las columnas públicas (el correo queda ilegible:
--     no está en la lista del GRANT). Privilegio por columna + política RLS.
grant select (id, image_path, thumb_path, created_at) on public.photos to anon;

drop policy if exists "anon lee las columnas publicas" on public.photos;
create policy "anon lee las columnas publicas"
    on public.photos for select
    to anon
    using (true);

-- 3. Vista pública de la galería: imagen + miniatura + fecha (sin correos) ----
--    security_invoker: la vista corre con los permisos de quien consulta
--    (evita el aviso "Security Definer View" del Security Advisor).
create or replace view public.gallery_photos
    with (security_invoker = true) as
    select id, image_path, created_at, thumb_path
    from public.photos
    order by created_at desc;

grant select on public.gallery_photos to anon;

-- 4. Permiso de Storage: el rol anónimo puede subir al bucket 'photos' --------
drop policy if exists "anon sube al bucket photos" on storage.objects;
create policy "anon sube al bucket photos"
    on storage.objects for insert
    to anon
    with check (bucket_id = 'photos');

-- Listo. Copia tu "Project URL" y la clave "anon public" desde
-- Settings → API y pégalas en assets/js/config.js.
