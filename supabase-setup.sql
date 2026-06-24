-- ============================================================================
-- supabase-setup.sql — Photo Booth "Matamoro's Wedding"
-- Ejecuta TODO este script una sola vez en: Supabase → SQL Editor → New query → Run
-- Crea el bucket de fotos, la tabla, la vista pública de la galería y los
-- permisos para que la app (clave anon) pueda subir fotos sin exponer correos.
-- ============================================================================

-- 1. Bucket de almacenamiento (público para lectura de imágenes) -------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 2. Tabla de fotos ----------------------------------------------------------
create table if not exists public.photos (
    id          uuid primary key default gen_random_uuid(),
    email       text,
    image_path  text not null,
    created_at  timestamptz not null default now()
);

alter table public.photos enable row level security;

-- 2a. Cualquiera (rol anónimo) puede INSERTAR su foto...
drop policy if exists "anon inserta fotos" on public.photos;
create policy "anon inserta fotos"
    on public.photos for insert
    to anon
    with check (true);

-- 2b. ...pero NADIE puede leer la tabla directamente (protege los correos).
--     La galería lee desde la vista de abajo, que no expone el correo.

-- 3. Vista pública de la galería: solo imagen + fecha (sin correos) -----------
create or replace view public.gallery_photos as
    select id, image_path, created_at
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
-- Settings → API y pégalas en config.js (o pásamelas).
