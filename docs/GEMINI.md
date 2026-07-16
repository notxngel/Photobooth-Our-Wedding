# Photobooth - Our Wedding (Angel & Clara)

> **Última actualización de esta memoria: 11/07/2026** (por Claude Code).
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

- **Marca oficial (11/07/2026)**: el evento se llama **"Matamoros Wedding"**
  (sin apóstrofo). Renombrado en toda la app (títulos, manifest, tira de
  Canvas, correo del emailer, docs). No reintroducir "Matamoro's".

## 🏗️ Arquitectura vigente (desde 05/07/2026)
- **Frontend estático puro** (sin build): `index.html` + `assets/js/app.js`
  (cámara, filtros por matrices de color, composición Canvas, i18n ES/EN,
  subida, QR) y `gallery.html` + `assets/js/gallery.js`. La tira se compone
  en `composeFilmstrip` con layout en unidades lógicas y **escala dinámica**
  según la resolución real de la cámara (mín 2× = 1384 px de ancho, máx 4×,
  tope de área ~14 MP por los límites de canvas de iOS; la cámara se pide a
  ideal 4K). A 1× salía de 692 px y las fotos llegaban borrosas por correo
  (corregido el 11/07/2026); el 2× fijo desperdiciaba cámaras de 1440+ px
  (corregido también el 11/07/2026).
- **Backend mínimo**: Supabase solo con la clave **pública** (`anon`), en
  `assets/js/config.js`. La app únicamente sube (Storage + INSERT en `photos`).
  No hay Edge Functions, no hay claves secretas en ningún sitio.
- **Entrega al invitado**: tras subir, el modal muestra un **código QR** con la
  URL pública de la foto (`assets/js/qr.js`, librería qrcode-generator MIT
  vendorizada; funciones `openSaveModal`/`showQrView`/`uploadPhotoToGallery`
  en `app.js`). `state.uploadedUrl` evita subir dos veces la misma foto.
  **Además (09/07/2026, decisión de Angel & Clara: el QR es difícil para
  invitados mayores)**: el modal pide un **correo opcional** que viaja en la
  columna `email` del INSERT; el **emailer local restaurado**
  (`tools/emailer/send-emails.js`, Nodemailer + Gmail app password + clave
  secreta en `tools/secrets.js` gitignored, modo `--watch` durante la boda)
  se lo envía con **botón de descarga directa** por foto (URL pública de
  Storage con `?download=` → `Content-Disposition: attachment`, verificado
  en vivo el 10/07/2026: un toque y el JPEG se guarda en el dispositivo)
  más la foto adjunta. Guía: `docs/CORREO.md`. La clave anon sigue sin poder
  leer `email` (verificado).
- **PWA**: `sw.js` precachea el shell (versión de caché `photobooth-v23`;
  **subir el número** tras tocar assets para invalidar caché de usuarios).
- **SQL**: fuente única `supabase/schema.sql` (reemplaza a los 4 scripts
  sueltos que existían antes — se consolidaron y se borraron el 08/07/2026).
  Idempotente: bucket `photos` (JPEG ≤8MB), tabla `photos`, vista
  `gallery_photos` con `security_invoker=true` (sin aviso del Security
  Advisor), y todas las políticas RLS con nombres `pb_*` — incluye
  `pb_storage_update`, necesaria para que los reintentos de subida
  (`x-upsert: true` en `uploadPhotoToGallery`) no fallen con 403. Verificado
  contra el proyecto en vivo el 07-08/07/2026 con `curl` directo a la API.

- **Pulido final de diseño (11/07/2026)**: se reservó espacio inferior en
  Menú/Resultado para que el botón flotante de la galería no se encime sobre
  los botones principales en móvil; en `gallery.html` el encabezado baja en
  pantallas angostas para no chocar con "Volver"; `:focus-visible` y
  `prefers-reduced-motion` añadidos; eliminado CSS/JS muerto (clase
  `.selected`, estilos de paspartú `mode-pareja`/`mode-rollo` — la tira de
  celuloide es ahora el único estilo de resultado, sin clase extra —,
  utilidades `.text-center`/`.mt-4`, `--spacing-xs`). Caché `photobooth-v23`.

## ⛔ Decisiones deliberadas — NO revertir
Estas piezas se **eliminaron a propósito** el 05/07/2026 (commit `31f3dc8`)
para simplificar. NO las reintroduzcas aunque parezcan "faltantes":
- ❌ **Panel admin** (`admin.html`, Edge Function `admin-photos`, PIN,
  `tools/admin-local.html`): el borrado de fotos se hace en el dashboard de
  Supabase (Table Editor → `photos` → Delete row; opcional Storage para
  liberar espacio). Documentado en README.
- (El **envío por correo** también se eliminó ese día, pero se **restauró el
  09/07/2026** a pedido de Angel & Clara — ver arriba. Las columnas `email`,
  `email_sent_at`, `email_error` vuelven a estar en uso.)

## 🚀 Pendientes reales
0. **⚠️ Modo kiosco del iPad**: iniciar sesión de **Acceso Guiado** cada vez
   que se monte el booth (activarlo en Ajustes no basta) — guía completa y
   checklist del día en `docs/KIOSCO.md`.
1. **Ensayo general** end-to-end antes del 16/07 en un dispositivo real con
   cámara (iPad): tomar foto → Guardar mi Foto → correo con botón de
   descarga y/o QR → ver en gallery.html. No se pudo probar la cámara real
   en sesión de agente (sin webcam en el entorno de automatización).
2. El día de la boda: dejar la Mac enchufada y sin dormirse — el emailer ya
   corre solo vía `launchd` (`~/Library/LaunchAgents/com.photobooth.emailer.plist`,
   ver `docs/CORREO.md`), no requiere abrir terminal.
3. Después de la boda: revocar la clave de aplicación de Gmail en
   myaccount.google.com/apppasswords.

## 🔧 Recordatorios operativos
- Probar en local con cámara: `node tools/dev-server.js` (HTTPS autofirmado).
- Publicar = push a `main` (GitHub Pages, ~1-2 min).
- Tras editar `app.js`/`styles.css`/`config.js`/`index.html`: subir
  `CACHE_NAME` en `sw.js`.

## 🤖 Colaboración de Agentes
- **Claude (Anthropic)**: diseño inicial, Fase 1-2, y la simplificación por QR
  + fix del Security Advisor (05-07/07/2026).
- **Gemini CLI**: implementación y mantenimiento en sesiones locales.
