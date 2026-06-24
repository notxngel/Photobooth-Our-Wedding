# Configuración del backend — Galería en la nube (Supabase)

Esta guía conecta el Photo Booth con **Supabase** para que cada foto se guarde
en la nube y aparezca en la **galería** (`gallery.html`). Es la **Fase 1**.
El **correo automático** con enlace (Resend) es la **Fase 2** y se añade después.

> ⏱️ Tiempo estimado: ~10 minutos. Todo es gratis.

---

## Paso 1 — Crear el proyecto en Supabase

1. Entra a **https://supabase.com** → **Start your project** → inicia sesión (puedes usar GitHub).
2. **New project**:
   - **Name**: `matamoros-photobooth` (o el que quieras).
   - **Database Password**: genera una y guárdala (no la necesitarás para la app).
   - **Region**: elige la más cercana a la boda (p. ej. *East US* o *Mexico*).
3. Espera ~1–2 min a que el proyecto termine de crearse.

## Paso 2 — Crear la base de datos y los permisos

1. En el panel del proyecto, menú lateral → **SQL Editor** → **New query**.
2. Abre el archivo **`supabase/setup.sql`** de este repo, copia **todo** su contenido,
   pégalo en el editor y pulsa **Run** ▶.
3. Debe decir *"Success"*. Esto crea el bucket de fotos, la tabla, la galería y los permisos.

## Paso 3 — Copiar tus credenciales

1. Menú lateral → **Project Settings** (engranaje) → **API**.
2. Copia estos **dos** valores:
   - **Project URL** → algo como `https://abcd1234.supabase.co`
   - **Project API keys → `anon` `public`** → una cadena larga que empieza con `eyJ...`

> ⚠️ Usa solo la clave **anon public**. **Nunca** compartas la `service_role`.

## Paso 4 — Pegar las credenciales

Tienes dos opciones:

- **Opción fácil:** pásame esos dos valores y yo los coloco en `config.js` y publico.
- **Tú mismo:** abre `config.js` y reemplaza:
  ```js
  SUPABASE_URL:      'https://TU-PROYECTO.supabase.co',   // ← tu Project URL
  SUPABASE_ANON_KEY: 'TU_CLAVE_ANON_PUBLICA',             // ← tu clave anon public
  ```
  Guarda, haz commit y push. (La clave anon es pública: es seguro tenerla en el repo.)

## Paso 5 — Probar

1. Abre la app, toma una foto, pulsa **Guardar Foto**, escribe un correo y confirma.
   Debe decir *"¡Listo! Tu foto se guardó y aparecerá en la galería."*
2. Abre **`/gallery.html`** (o el enlace **"Ver la galería"** en la pantalla de resultado):
   tu foto debe aparecer ahí, con botón de **Descargar**.

---

## Privacidad

- La **galería es pública** para quien tenga el enlace (las fotos se ven sin contraseña).
  Es lo normal en una boda; si quieres restringirla, lo vemos.
- Los **correos NO se exponen** en la galería: la página solo lee una vista
  (`gallery_photos`) que muestra imagen y fecha, nunca el correo.

## Fase 2 (después) — Correo automático con enlace

Para que a cada invitado le llegue su foto por correo automáticamente, añadiremos una
**Supabase Edge Function** + **Resend** (servicio de correo gratuito). Lo dejamos
preparado cuando termines la Fase 1.
