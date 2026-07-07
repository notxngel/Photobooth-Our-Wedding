# Photobooth - Our Wedding (Angel & Clara)

> **Última actualización de esta memoria: 07/07/2026** (por Claude Code).
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
- **PWA**: `sw.js` precachea el shell (versión de caché `photobooth-v14`;
  **subir el número** tras tocar assets para invalidar caché de usuarios).
- **SQL** (`supabase/`): `setup.sql` (instalación desde cero),
  `upgrade-fase2.sql` (miniaturas + bucket solo JPEG ≤8MB),
  `fix-security-advisor.sql` (vista `gallery_photos` como `security_invoker`
  + lectura anon solo de columnas públicas — resuelve el aviso CRITICAL del
  Security Advisor).

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
1. **Ejecutar `supabase/fix-security-advisor.sql`** en el SQL Editor del
   proyecto (si el usuario aún no lo hizo) y verificar que el Security Advisor
   queda limpio. Verificado en Postgres 16 local: idempotente; la galería
   sigue funcionando; `email` ilegible para anon.
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
