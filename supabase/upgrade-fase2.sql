-- ============================================================================
-- supabase/upgrade-fase2.sql — Fase 2: correo + admin + miniaturas
-- Ejecuta TODO este script UNA vez en: Supabase → SQL Editor → New query → Run
-- (Es seguro correrlo más de una vez: todo es idempotente.)
--
-- Qué hace:
--   1. Añade columnas a `photos`:
--        thumb_path     → miniatura ligera para que la galería cargue rápido
--        email_sent_at  → cuándo se envió el correo al invitado (script emailer)
--        email_error    → si un correo falló de forma permanente, el motivo
--   2. Actualiza la vista pública `gallery_photos` para incluir la miniatura
--      (sigue SIN exponer correos).
--   3. Endurece el bucket: solo JPEG y máximo 8 MB por archivo.
-- ============================================================================

-- 1. Columnas nuevas ---------------------------------------------------------
alter table public.photos add column if not exists thumb_path    text;
alter table public.photos add column if not exists email_sent_at timestamptz;
alter table public.photos add column if not exists email_error   text;

-- 2. Vista pública de la galería (imagen + miniatura + fecha; sin correos) ----
--    Nota: `create or replace` conserva el GRANT select existente para anon.
--    security_invoker evita el aviso "Security Definer View" del Advisor
--    (requiere haber corrido también fix-security-advisor.sql o setup.sql).
create or replace view public.gallery_photos
    with (security_invoker = true) as
    select id, image_path, created_at, thumb_path
    from public.photos
    order by created_at desc;

-- 3. Endurecer el bucket: solo imágenes JPEG, máximo 8 MB ---------------------
update storage.buckets
   set file_size_limit    = 8388608,          -- 8 MB
       allowed_mime_types = array['image/jpeg']
 where id = 'photos';

-- Listo. Nota: las columnas email/email_sent_at/email_error ya no se usan
-- (la entrega al invitado es por código QR en pantalla); se conservan solo
-- para no tocar la base ya desplegada. Son inofensivas.
