# Photobooth - Our Wedding (Angel & Clara)

> **Última actualización de esta memoria: 08/07/2026** (por Claude Code).
> Cualquier agente que haga cambios significativos debe actualizar este
> archivo (y el `CLAUDE.md` de la raíz) antes de terminar su sesión.

## 📌 Contexto del Proyecto
**Photo Booth digital** (PWA) para la boda de **Angel y Clara** (16 de julio
de 2026). Los invitados capturan fotos en tres formatos (Retrato ×1,
Díptico ×2, Rollo ×4), con filtros en tiempo real, compuestas en una tira de
película con diseño personalizado. La foto se guarda en una galería en la nube
y el invitado se la lleva a su teléfono **escaneando un código QR**.

- App en vivo: https://notxngel.github.io/Photobooth-Our-Wedding/ (GitHub Pages, rama `main`)
- Galería: https://notxngel.github.io/Photobooth-Our-Wedding/gallery.html
- Proyecto Supabase: `bxlfjobuzoxcnjrwaeee`

## 🏗️ Arquitectura vigente (desde 05/07/2026)
- **Frontend estático puro** (sin build): `index.html` + `assets/js/app.js`
  (cámara, filtros por matrices de color, composición Canvas, i18n ES/EN,
  subida, QR) y `gallery.html` + `assets/js/gallery.js`.
- **Backend mínimo**: Supabase solo con la clave **pública** (`anon`), en
  `assets/js/config.js`. La app únicamente sube (Storage + INSERT en `photos`).
  No hay Edge Functions, no hay claves secretas en ningún sitio.
- **Entrega al invitado**: tras subir, el modal muestra un **código QR** con la
  URL pública de la foto (`assets/js/qr.js`, librería qrcode-generator MIT
  vendorizada; funciones `openSaveModal`/`showQrView`/`uploadPhotoToGallery`
  en `app.js`). `state.uploadedUrl` evita subir dos veces la misma foto.
- **PWA**: `sw.js` precachea el shell (versión de caché `photobooth-v16`;
  **subir el número** tras tocar assets para invalidar caché de usuarios).
- **SQL**: fuente única `supabase/schema.sql` (reemplaza a los 4 scripts
  sueltos que existían antes — se consolidaron y se borraron el 08/07/2026).
  Idempotente: bucket `photos` (JPEG ≤8MB), tabla `photos`, vista
  `gallery_photos` con `security_invoker=true` (sin aviso del Security
  Advisor), y todas las políticas RLS con nombres `pb_*` — incluye
  `pb_storage_update`, necesaria para que los reintentos de subida
  (`x-upsert: true` en `uploadPhotoToGallery`) no fallen con 403. Verificado
  contra el proyecto en vivo el 07-08/07/2026 con `curl` directo a la API.

## ⛔ Decisiones deliberadas — NO revertir
Estas piezas se **eliminaron a propósito** el 05/07/2026 (commit `31f3dc8`)
para simplificar. NO las reintroduzcas aunque parezcan "faltantes":
- ❌ **Envío por correo** (`tools/emailer/`, Nodemailer + Gmail): reemplazado
  por el QR. La app ya **no pide ni guarda correos** de invitados.
- ❌ **Panel admin** (`admin.html`, Edge Function `admin-photos`, PIN,
  `tools/admin-local.html`, `tools/secrets.js`): el borrado de fotos se hace
  en el dashboard de Supabase (Table Editor → `photos` → Delete row; opcional
  Storage para liberar espacio). Documentado en README.
- Las columnas `email`, `email_sent_at`, `email_error` de la tabla `photos`
  quedan **sin uso adrede** (sin migración, para no tocar la BD desplegada).

## 🚀 Pendientes reales
1. **Commit + push** de los cambios en `app.js`/`gallery.js`/`sw.js` (v15,
   guardas de cámara + reintentos de subida) y del nuevo `supabase/schema.sql`
   — el SQL ya corrió y se verificó en el proyecto real; falta publicar el
   frontend a producción (GitHub Pages).
2. **Ensayo general** end-to-end antes del 16/07: tomar foto → Guardar en la
   Galería → escanear QR con otro teléfono → ver en gallery.html.

## 🔧 Recordatorios operativos
- Probar en local con cámara: `node tools/dev-server.js` (HTTPS autofirmado).
- Publicar = push a `main` (GitHub Pages, ~1-2 min).
- Tras editar `app.js`/`styles.css`/`config.js`/`index.html`: subir
  `CACHE_NAME` en `sw.js`.

## 🤖 Colaboración de Agentes
- **Claude (Anthropic)**: diseño inicial, Fase 1-2, y la simplificación por QR
  + fix del Security Advisor (05-07/07/2026).
- **Gemini CLI**: implementación y mantenimiento en sesiones locales.
