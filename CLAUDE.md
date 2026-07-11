# Photobooth — Our Wedding (Angel & Clara, 16/07/2026)

PWA de photo booth para una boda. Frontend estático puro (sin build, sin
frameworks) publicado en GitHub Pages desde `main`. Backend mínimo: Supabase
(proyecto `bxlfjobuzoxcnjrwaeee`) usando SOLO la clave pública `anon`.

> Marca oficial: **"Matamoros Wedding"** (sin apóstrofo, desde 11/07/2026).
> Memoria detallada del proyecto y su historia: `docs/GEMINI.md`.
> Tras cambios significativos, actualiza ambos archivos.

## Flujo principal
1. El invitado toma 1/2/4 fotos (`assets/js/app.js`: cámara, filtros por
   matrices de color, composición de tira en Canvas, i18n ES/EN).
2. "Guardar en la Galería": correo **opcional** en el modal → sube el JPEG a
   Supabase Storage + INSERT en `photos` (`uploadPhotoToGallery`, columna
   `email` si la dejó) y muestra un **código QR** con la URL pública
   (`showQrView`, librería vendorizada en `assets/js/qr.js`).
3. El invitado escanea el QR; si dejó correo, además se lo envía el emailer
   (botón de descarga directa por foto vía `?download=` + adjunto).
4. `gallery.html` muestra todas las fotos (lee la vista `gallery_photos`).
5. **Emailer local** (`tools/emailer/send-emails.js`, Nodemailer + Gmail +
   clave secreta en `tools/secrets.js` gitignored): `--watch` durante la
   boda. Guía: `docs/CORREO.md`. (Eliminado el 05/07, **restaurado el
   09/07/2026** a pedido del usuario: el QR es difícil para invitados
   mayores.)

## ⛔ No revertir (eliminado a propósito el 05/07/2026, commit 31f3dc8)
- **Panel admin** (`admin.html` + Edge Function `admin-photos` + PIN) → las
  fotos se borran en el dashboard de Supabase (Table Editor → `photos`).
  No hay Edge Functions; el único secreto vive en `tools/secrets.js` (local,
  gitignored, para el emailer).

## Reglas del repo
- `index.html`, `gallery.html`, `manifest.webmanifest` y `sw.js` deben
  permanecer en la raíz (alcance del service worker).
- Tras tocar `app.js`/`styles.css`/`config.js`/`index.html`: **subir
  `CACHE_NAME`** en `sw.js` (actualmente `photobooth-v21`).
- SQL: fuente única `supabase/schema.sql` (bucket + tabla `photos` + vista
  `gallery_photos` + todas las políticas RLS, con nombres `pb_*`). Es
  idempotente — se puede volver a pegar y correr entero en el SQL Editor del
  dashboard sin duplicar nada ni perder fotos. Ya no hay scripts sueltos.

## Comandos
- Probar en local con cámara: `node tools/dev-server.js` (HTTPS, puerto 8443).
- No hay tests ni build: verificar cargando la app en un navegador real.
