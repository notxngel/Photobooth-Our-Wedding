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
├── gallery.html            Página de la galería (lista todas las fotos)
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
│   └── setup.sql           Script de base de datos (se corre 1 vez en Supabase)
│
├── tools/
│   └── dev-server.js       Servidor local HTTPS para probar (cámara) en el teléfono
│
└── docs/                   Documentación
    ├── SETUP_BACKEND.md        Guía paso a paso de Supabase
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

### Gestionar / borrar fotos (solo tú, como admin)
- **Quitar de la galería:** Supabase → **Table Editor** → tabla `photos` → marca filas → **Delete**.
- **Borrar el archivo:** Supabase → **Storage** → bucket `photos` → selecciona → **Delete**.

Los invitados **no** pueden borrar fotos (a propósito): solo pueden subir.

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

## 🗺️ Próximos pasos (pendientes)

- [x] **Panel de administrador local** (`tools/admin-local.html`) — borrar fotos desde tu compu. Ver abajo.
- [ ] **Fase 2 — Correo automático**: enviar a cada invitado su foto por correo (Resend).
- [ ] (Opcional) **Código QR** para que los invitados abran la app escaneando.

---

## 🔐 Panel de administrador (local)

Página **`tools/admin-local.html`** que corre **solo en tu computadora** para que
**solo los novios** puedan borrar fotos. No se despliega ni se enlaza desde la app
pública. Los invitados nunca pueden borrar.

Usa la clave **`service_role`** de Supabase (acceso total), por eso vive únicamente
en tu máquina y **no** en el sitio publicado.

**Puesta en marcha (una vez):**
1. Copia la plantilla de configuración:
   `cp tools/admin-local.config.example.js tools/admin-local.config.js`
2. Supabase → **Project Settings → API**: copia la clave **`service_role`** (la secreta,
   NO la `anon`) y pégala en `tools/admin-local.config.js`.
   > ⚠️ Ese archivo está en `.gitignore` — **nunca** lo subas a GitHub ni lo despliegues.

**Uso:**
1. `node tools/dev-server.js`
2. Abre **`https://localhost:8443/tools/admin-local.html`**
3. Cada foto tiene un botón **Borrar** (elimina el archivo del Storage y la fila de la
   base de datos de un clic). El botón **Actualizar** recarga la lista.

La página se niega a funcionar fuera de `localhost` como red de seguridad.

---

*Hecho con cariño para Angel & Clara.*
