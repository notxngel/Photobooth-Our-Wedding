# Photobooth — Our Wedding (Angel & Clara, 16/07/2026)

PWA de photo booth para una boda. Frontend estático puro (sin build, sin
frameworks) publicado en GitHub Pages desde `main`. Backend mínimo: Supabase
(proyecto `bxlfjobuzoxcnjrwaeee`) usando SOLO la clave pública `anon`.

> Memoria detallada del proyecto y su historia: `docs/GEMINI.md`.
> Tras cambios significativos, actualiza ambos archivos.

## Flujo principal
1. El invitado toma 1/2/4 fotos (`assets/js/app.js`: cámara, filtros por
   matrices de color, composición de tira en Canvas, i18n ES/EN).
2. "Guardar en la Galería" sube el JPEG a Supabase Storage + INSERT en
   `photos` (`uploadPhotoToGallery`) y muestra un **código QR** con la URL
   pública (`showQrView`, librería vendorizada en `assets/js/qr.js`).
3. El invitado escanea el QR y guarda la foto en su teléfono.
4. `gallery.html` muestra todas las fotos (lee la vista `gallery_photos`).

## ⛔ No revertir (eliminado a propósito el 05/07/2026, commit 31f3dc8)
- Envío por **correo** (emailer Gmail) → reemplazado por QR. La app no
  recopila correos.
- **Panel admin** (`admin.html` + Edge Function `admin-photos` + PIN +
  secrets) → las fotos se borran en el dashboard de Supabase (Table Editor →
  `photos`). No hay Edge Functions ni claves secretas en el proyecto.
- Columnas `email*` de la tabla `photos`: sin uso, se conservan adrede.

## Reglas del repo
- `index.html`, `gallery.html`, `manifest.webmanifest` y `sw.js` deben
  permanecer en la raíz (alcance del service worker).
- Tras tocar `app.js`/`styles.css`/`config.js`/`index.html`: **subir
  `CACHE_NAME`** en `sw.js` (actualmente `photobooth-v15`).
- SQL: fuente única `supabase/schema.sql` (bucket + tabla `photos` + vista
  `gallery_photos` + todas las políticas RLS, con nombres `pb_*`). Es
  idempotente — se puede volver a pegar y correr entero en el SQL Editor del
  dashboard sin duplicar nada ni perder fotos. Ya no hay scripts sueltos.

## Comandos
- Probar en local con cámara: `node tools/dev-server.js` (HTTPS, puerto 8443).
- No hay tests ni build: verificar cargando la app en un navegador real.
