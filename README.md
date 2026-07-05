# Matamoro's Wedding — Photo Booth 📸

PWA (app web) de photo booth para la boda de **Angel & Clara** (16/07/2026).
Los invitados toman fotos con filtros, se componen en una tira de película, se
**descargan** y se **suben a una galería en la nube** (Supabase).

- 🌐 **App en vivo:** https://notxngel.github.io/Photobooth-Our-Wedding/
- 🖼️ **Galería:** https://notxngel.github.io/Photobooth-Our-Wedding/gallery.html

---

## 🗂️ Estructura del proyecto

```
/
├── index.html              Página principal (la app: portada, menú, cámara, resultado)
├── gallery.html            Página de la galería (mosaico, lightbox, ES/EN)
├── admin.html              Panel admin con PIN (borrar fotos desde cualquier dispositivo)
├── manifest.webmanifest    Configuración PWA (nombre, iconos, colores)
├── sw.js                   Service Worker (caché offline). ⚠️ DEBE quedarse en la raíz
│
├── assets/
│   ├── css/
│   │   └── styles.css      TODOS los estilos de la app
│   └── js/
│       ├── app.js          Lógica principal (cámara, filtros, captura, subida, i18n)
│       ├── config.js       Datos de Supabase (URL + clave pública)
│       └── gallery.js      Lógica de la página de galería
│
├── icons/                  Iconos de la app (PWA / pantalla de inicio)
│
├── supabase/
│   ├── setup.sql           Script de base de datos (se corre 1 vez en Supabase)
│   ├── upgrade-fase2.sql   Migración Fase 2: correo + admin + miniaturas
│   └── functions/
│       └── admin-photos/   Edge Function del panel admin (borrado con PIN)
│
├── tools/
│   ├── dev-server.js       Servidor local HTTPS para probar (cámara) en el teléfono
│   ├── admin-local.html    Panel admin local (respaldo, solo tu Mac)
│   ├── secrets.example.js  Plantilla de secretos → cópiala a tools/secrets.js
│   └── emailer/            Script que envía las fotos por correo (tu Gmail)
│
└── docs/                   Documentación
    ├── SETUP_BACKEND.md        Guía paso a paso de Supabase (Fase 1)
    ├── ADMIN.md                Borrar fotos: panel con PIN + panel local
    ├── CORREO.md               Enviar las fotos a los invitados (Fase 2)
    ├── PRODUCTION_READINESS.md Informe de preparación para producción
    └── GEMINI.md               Notas de contexto del proyecto
```

> ⚠️ **Importante:** `index.html`, `gallery.html`, `manifest.webmanifest` y `sw.js`
> **deben permanecer en la raíz**. El service worker solo puede controlar la app si
> vive en la raíz; moverlo rompería el modo offline/PWA.

---

## 🚀 Cómo desplegar (publicar cambios)

El sitio se publica solo con **GitHub Pages** desde la rama `main`:

1. Haz tus cambios y súbelos a `main` (`git push`).
2. En ~1–2 min, GitHub Pages reconstruye y el link en vivo se actualiza.

> 💡 Tras un cambio, si no lo ves: el navegador cachea la PWA. Abre en **incógnito**
> o sube el número de versión en `sw.js` (`CACHE_NAME = 'photobooth-vN'`).

---

## 🧪 Cómo probar en local (con cámara)

La cámara solo funciona en `https://` o `localhost`. Para probar en tu teléfono:

```bash
node tools/dev-server.js
```

Genera un certificado solo la primera vez e imprime las URLs (`https://localhost:8443`
y `https://<IP-de-tu-Wi-Fi>:8443`). Abre la del teléfono estando en la misma Wi-Fi.

---

## ☁️ Backend (Supabase)

La galería usa **Supabase** (almacenamiento + base de datos). La configuración inicial
está en **`docs/SETUP_BACKEND.md`** y el script en **`supabase/setup.sql`**.

### Gestionar / borrar fotos (solo ustedes, como admins)
- **Desde el teléfono (recomendado):** `admin.html` con PIN — guía en **`docs/ADMIN.md`**.
- **Desde tu Mac:** `tools/admin-local.html` — misma guía.

Los invitados **no** pueden borrar fotos (a propósito): solo pueden subir.

### Enviar las fotos a los invitados por correo
Script `tools/emailer/` con tu Gmail — guía completa en **`docs/CORREO.md`**.

---

## 🔧 ¿Dónde cambio cada cosa? (guía rápida)

| Quiero cambiar… | Archivo | Dónde |
|-----------------|---------|-------|
| **Nombres de la portada** | `index.html` | `<h1 class="landing-title">` y `<p class="landing-couple">` |
| **Nombres/fecha en la tira de película** | `assets/js/app.js` | función `composeFilmstrip` (textos `fillText`) |
| **Textos en español/inglés** | `assets/js/app.js` | objeto `TRANSLATIONS` (arriba del archivo) |
| **Colores / tipografías** | `assets/css/styles.css` | variables `:root` (`--color-accent`, etc.) |
| **Filtros de la cámara** | `assets/js/app.js` (`FILTER_MATRICES`) + `index.html` (botones `data-filter`) |
| **Modos (Retrato/Díptico/Rollo)** | `assets/js/app.js` | `PHOTO_COUNTS` |
| **Datos de Supabase** | `assets/js/config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **Iconos de la app** | `icons/` | reemplaza los PNG (mismos nombres) |

> Tras editar `app.js`, `styles.css` o `config.js`, **sube la versión** en `sw.js`
> (`CACHE_NAME`) para que los usuarios reciban el cambio sin caché vieja.

---

## 🗺️ Estado y pendientes

- [x] **Fase 1 — Galería en la nube** (Supabase): subir + ver + descargar.
- [x] **Borrar fotos**: `admin.html` con PIN (cualquier dispositivo) y panel local.
  ⚠️ Requiere **una vez**: correr `supabase/upgrade-fase2.sql` y desplegar la
  Edge Function — pasos en **`docs/ADMIN.md`**.
- [x] **Fase 2 — Correo a los invitados**: script con tu Gmail (`tools/emailer/`).
  ⚠️ Requiere **una vez**: clave de aplicación de Gmail + `tools/secrets.js` —
  pasos en **`docs/CORREO.md`**.
- [ ] (Opcional) **Código QR** para que los invitados abran la app escaneando.

## 🔐 Secretos locales (`tools/secrets.js`)

Las herramientas de administración usan **un solo archivo de secretos** que vive
únicamente en tu Mac (está en `.gitignore`, **nunca** se sube):

```bash
cp tools/secrets.example.js tools/secrets.js   # y rellena los valores
```

Contiene: la clave **secreta** de Supabase (para el panel local y el emailer) y
tu **clave de aplicación de Gmail** (para enviar los correos).

---

*Hecho con cariño para Angel & Clara.*
