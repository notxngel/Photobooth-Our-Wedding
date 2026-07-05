# Informe de preparación para producción — Matamoro's Wedding Photo Booth

> Revisión del estado actual de la PWA y propuesta de arquitectura para la entrega de fotos.
> Fecha de la revisión: 23/06/2026 · Fecha del evento: **16/07/2026**.

> **ACTUALIZACIÓN 04/07/2026 — estado de los hallazgos:**
> - ✅ Almacenamiento central (Supabase) — resuelto (Fase 1).
> - ✅ Correo real a invitados — resuelto con script Gmail local (`docs/CORREO.md`); el correo ahora es **opcional** para el invitado.
> - ✅ Borrado de fotos — panel con PIN desde cualquier dispositivo + panel local (`docs/ADMIN.md`).
> - ✅ Marca unificada, fuga de partículas, SW tolerante + fuentes offline, Escape/foco en modales, código muerto — resueltos.
> - ✅ Consentimiento en el modal, miniaturas y galería mejorada (lightbox, refresco, ES/EN) — añadidos.
> - ✅ Bucket endurecido (solo JPEG, máx. 8 MB) — en `upgrade-fase2.sql`.
> - ⏳ Pendiente operativo (una vez): correr `upgrade-fase2.sql`, desplegar Edge Function `admin-photos` + `ADMIN_PIN`, configurar `tools/secrets.js`, y el **ensayo general** end-to-end antes del 16/07.

---

## 1. Resumen ejecutivo

La experiencia de front-end está **sólida y bien construida**: la captura con cámara, los filtros
por matrices de color (compatibles con iOS/Safari), la composición de la tira de película, la
internacionalización (ES/EN) y el soporte PWA están bien resueltos.

Sin embargo, hay **dos bloqueantes para producción**:

1. **El envío por correo es falso.** El botón "Enviar por Correo" muestra "¡Foto guardada y correo
   enviado!" pero **no envía nada**. Le promete al invitado un correo que nunca llega.
2. **No existe almacenamiento central.** Las fotos solo quedan en el teléfono del invitado. Si el
   invitado no las comparte, **los novios no conservan ninguna**.

Además hay un grupo de mejoras de robustez, accesibilidad y consistencia de marca de menor
severidad. Este documento prioriza todo y propone una **arquitectura concreta** para resolver la
entrega de fotos (guardar en un servidor + enviar al invitado + galería compartida).

---

## 2. Hallazgos priorizados

| Severidad | Área | Problema | Solución |
|-----------|------|----------|----------|
| 🔴 Crítico | Correo | `app.js:841-866` valida el correo y luego hace `setTimeout(...)` → muestra "¡correo enviado!" sin enviar nada. `modal.desc` promete un correo que nunca llega. | Reemplazar por el backend real de la §4. |
| 🔴 Crítico | Almacenamiento | Las fotos solo viven en el dispositivo del invitado (`state.photoDataUrl`). No hay copia central para los novios. | Subir cada foto a almacenamiento central (§4). |
| 🟠 Alto | Marca | `manifest.webmanifest`, `<title>` y meta dicen **"Matamoro's Wedding"**; la landing (`index.html:49`) y la tira (`app.js:692,722`) dicen **"Angel & Clara"**. | Unificar en **"Matamoro's Wedding"** (ver §2.1). |
| 🟠 Alto | Infraestructura | `getUserMedia` (cámara) y el service worker **solo funcionan en HTTPS** o `localhost`. En producción es obligatorio servir por HTTPS. | Definir hosting con HTTPS (ligado a §4). |
| 🟡 Medio | Rendimiento | `initParticles()` (`app.js:206`) se ejecuta en **cada** visita a la landing vía `navigateTo('landing')`; cada vez añade un nuevo listener `resize` e inicia otro bucle `requestAnimationFrame`. Fuga de listeners y posibles bucles duplicados. | Inicializar una sola vez (guard), y quitar el listener en `stopParticles`. |
| 🟡 Medio | Accesibilidad | `#email-modal` y `#settings-sheet` tienen `role="dialog" aria-modal="true"` pero **no cierran con Escape** ni atrapan/devuelven el foco. | Añadir Escape + trampa y retorno de foco. |
| 🟡 Medio | Offline | `sw.js` solo cachea recursos del mismo origen; **Google Fonts no se cachean**. Offline/instalado, la tira cae a la serif del sistema. | Cachear el CSS+archivos de fuentes o auto-hospedarlas. |
| 🟢 Bajo | Accesibilidad | `user-scalable=no, maximum-scale=1.0` (`index.html:5`) bloquea el pinch-zoom. | Aceptable para kiosko; documentado. Reconsiderar si se usan teléfonos de invitados. |
| 🟢 Bajo | Mantenimiento | `MODE_LABELS` (`app.js:19`) es código muerto (lo reemplaza `getLocalizedModeLabels()`). | Eliminar. |
| 🟢 Bajo | Service Worker | `cache.addAll` (`sw.js:22`) rechaza **toda** la instalación si un solo recurso da 404. | Cachear críticos con `addAll` y opcionales con `cache.add` tolerante a fallos; versionar `CACHE_NAME`. |
| ⚪ Nota | Privacidad | Se recolectan correos de invitados y se almacenarán/servirán fotos. | Añadir línea breve de consentimiento y enlaces de galería con token no adivinable (§4). |

### 2.1 Decisión de marca

Se unifica todo en **"Matamoro's Wedding"**. Pendiente de tu confirmación: mantener "Angel & Clara"
como línea decorativa **debajo** del título (recomendado, conserva el toque personal) o reemplazarlo
por completo. Puntos a tocar cuando se implemente: `index.html:49` (landing) y `app.js:692,722`
(título y nombres en la tira de película).

---

## 3. Qué nos da ya el front-end (y el único punto a integrar)

La buena noticia: el cliente ya tiene casi todo listo para conectar un backend.

- **La imagen ya está lista para subir.** `composeFilmstrip()` devuelve un JPEG de alta calidad
  como data URL en `state.photoDataUrl`, y `dataURLtoBlob()` (`app.js:780`) ya lo convierte a `Blob`.
- **Hay un único punto de integración.** El handler de `btn-send-email` (`app.js:841-866`) es el
  lugar exacto donde hoy se simula el envío. Ahí se cambia el `setTimeout` por un `fetch` real.
- **Los textos ya existen** en i18n: `modal.sending`, `modal.success`, `modal.invalid`,
  `result.saved`, `result.error` — listos para estados de carga/éxito/error reales.
- **Descargar/Compartir ya funciona** vía `navigator.share` (`app.js:792`) — se mantiene como
  alternativa segura sin conexión.

Ejemplo del cambio (conceptual) en `app.js:841`:

```js
// ANTES (simulado):
setTimeout(() => { showToast(t('modal.success'), 'success'); ... }, 1600);

// DESPUÉS (real):
const blob = dataURLtoBlob(state.photoDataUrl);
const fd = new FormData();
fd.append('image', blob, `Matamoros_${Date.now()}.jpg`);
fd.append('email', email);
try {
  const res = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('upload failed');
  const { url } = await res.json();          // enlace a la foto en la galería
  showToast(t('modal.success'), 'success');
} catch (e) {
  showToast(t('result.error'), 'error');     // permitir reintento
}
```

---

## 4. Arquitectura de entrega de fotos (núcleo del informe)

**Idea clave primero:** enviar la tira completa como **adjunto** de correo es frágil. Los servicios
solo-cliente (tipo EmailJS) limitan los adjuntos a unas decenas de KB, y nuestros JPEG pesan mucho
más. El patrón robusto es:

> **Guardar la foto de forma centralizada → enviarle al invitado un enlace (no un adjunto).**

Eso, además, **entrega gratis el Plan B** (la galería): si todas las fotos viven en un lugar central
con URL, la galería es simplemente una página que las lista.

A continuación, tres opciones con sus ventajas y desventajas, y una recomendación.

### Opción 1 — Tu computadora como servidor (tu "Plan A" literal)

Un servidor local en tu laptop guarda en una carpeta y envía los correos.

- **Stack:** Node + Express + Multer. Endpoint `POST /upload` que:
  1. Guarda el JPEG en una carpeta específica, p. ej. `./photos/Matamoros_<timestamp>.jpg`.
  2. Envía al invitado, con **Nodemailer** (SMTP de Gmail + *clave de aplicación* de tu cuenta
     `angelmm263@gmail.com`), un correo con el **enlace** a su foto.
- **Galería (Plan B):** una ruta `/gallery` que lista los archivos de `./photos`. Express también
  puede servir la propia PWA.
- **HTTPS para los teléfonos:** la cámara no funciona sobre `http://IP-local`. Solución simple y
  gratuita: **Cloudflare Tunnel** (`cloudflared`), que expone tu servidor local con una URL HTTPS
  confiable (sin advertencias de certificado en los teléfonos de los invitados). El repo ya ignora
  `key.pem`/`cert.pem`/`dev-server.js`, así que la idea de HTTPS local ya estaba contemplada.
- **Ventajas:** todos los datos quedan en **tu máquina**; coincide exactamente con tu Plan A.
- **Desventajas:** la laptop debe estar **encendida y conectada todo el evento**; punto único de
  falla; depende de la estabilidad de tu red doméstica/del lugar. Riesgoso para un evento en vivo
  de un solo día.

### Opción 2 — Nube administrada (recomendada por confiabilidad)

- **Hosting de la PWA:** Netlify / Vercel / GitHub Pages (HTTPS y dominio gratis).
- **Subida:** una función *serverless* recibe `POST /upload`.
- **Almacenamiento:** bucket de objetos (Cloudflare R2 / Supabase Storage / Firebase Storage), con
  una pequeña tabla/índice por foto (para listar la galería).
- **Correo:** API transaccional **Resend** o **SendGrid** (sus planes gratuitos cubren de sobra el
  volumen de una boda) — se envía el **enlace**.
- **Galería (Plan B):** página `/gallery` que lista las fotos del bucket.
- **"Guardado en mi computadora":** sincronizar el bucket a tu carpeta con `rclone` (durante o
  después del evento), **o** usar **Google Drive como backend** para que se sincronice solo a tu
  computadora vía Drive Desktop y los correos salgan por Gmail.
- **Ventajas:** alta disponibilidad, sin cuidar la laptop, escalable.
- **Desventajas:** depende de servicios de terceros y de un par de cuentas gratuitas.

### Opción 3 — Híbrida (lo mejor de ambas)

Hosting + almacenamiento administrados (confiabilidad) **+** un espejo programado con `rclone` hacia
la **carpeta específica de tu computadora** (tu intención del Plan A) **+** enlace de galería (Plan B).
El correo siempre lleva un enlace, nunca un adjunto pesado.

### Comparativa rápida

| Criterio | Opción 1 (local) | Opción 2 (nube) | Opción 3 (híbrida) |
|----------|------------------|-----------------|---------------------|
| Datos en tu compu | ✅ nativo | ⚠️ vía sync | ✅ vía sync |
| Confiabilidad el día del evento | ⚠️ media | ✅ alta | ✅ alta |
| Esfuerzo de montaje | medio | medio | medio-alto |
| Costo | $0 | $0 (planes free) | $0 (planes free) |
| Punto único de falla | ❌ la laptop | ✅ no | ✅ no |

### Recomendación

Para un evento en vivo de un solo día, **prioriza la confiabilidad: Opción 2** (o la **3** si
guardar en tu carpeta es requisito firme). La Opción 1 solo si lo 100%-local es ineludible y puedes
garantizar laptop + red estables toda la jornada.

### Esquema de implementación (opción recomendada)

1. **Contrato del endpoint:** `POST /upload` con `multipart/form-data` `{ image, email }` →
   respuesta `{ url }` (enlace público a la foto/galería).
2. **Front-end:** un solo cambio en `app.js:841` (ver §3) — reemplazar el `setTimeout` por el
   `fetch`, con manejo de error que permita reintento.
3. **Correo:** plantilla simple con saludo + **enlace** a la foto/galería (no adjunto).
4. **Galería con control de acceso:** publicar bajo un **token de álbum aleatorio largo** (enlace no
   adivinable) o protegida con contraseña — evita exponer las fotos de la boda a cualquiera.
5. **Secretos/variables a preparar:**
   - SMTP de Gmail + *clave de aplicación* (Opción 1) **o** API key de Resend/SendGrid (Opción 2/3).
   - Credenciales del almacenamiento (R2/Supabase/Firebase) si aplica.
   - URL del túnel (Cloudflare Tunnel) o del hosting.
6. **Privacidad:** una línea breve de consentimiento en el modal antes de pedir el correo.

---

## 5. Recomendación y próximos pasos

1. **Decidir hosting** (Opción 2/3 recomendada por confiabilidad; Opción 1 si lo local es requisito).
2. **Montar** almacenamiento + `/upload` + galería.
3. **Conectar el correo real:** reemplazar el flujo simulado por `fetch` + correo con enlace.
4. **Corregir la marca** a "Matamoro's Wedding" (`index.html:49`, `app.js:692,722`).
5. **Pasada de robustez:** fuga de partículas (`app.js:206`), accesibilidad de modales, fuentes
   offline en el SW, eliminar código muerto (`MODE_LABELS`).
6. **Ensayo general de extremo a extremo** en teléfonos reales y sobre la red real **antes del
   16/07/2026** (incluye: cámara con HTTPS, subida, correo recibido y galería accesible).

---

*Informe generado como parte de la revisión de preparación para producción. No modifica el código de
la aplicación; sus recomendaciones quedan como lista de trabajo para la siguiente etapa.*
