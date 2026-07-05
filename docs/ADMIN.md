# Borrar fotos — Panel de administración

Hay **dos formas** de borrar fotos de la galería. Ambas borran el archivo del
Storage **y** la fila de la base de datos (y la miniatura, si existe).

| Panel | Dónde funciona | Qué necesita |
|-------|----------------|--------------|
| **`admin.html`** (publicado) | **Cualquier dispositivo** (tu teléfono en la boda) | Edge Function + PIN (guía abajo) |
| **`tools/admin-local.html`** | Solo tu Mac | Pegar la clave secreta en `tools/secrets.js` |

Los invitados no pueden borrar nada: el borrado pasa por una Edge Function que
exige el PIN, o por la clave secreta que solo vive en tu Mac.

---

## A. Panel desde el teléfono (`admin.html`) — puesta en marcha

La página `admin.html` se publica con la app, pero **no funciona hasta que
despliegues la Edge Function** `admin-photos` en Supabase. Es una sola vez,
~5 minutos, y la clave `service_role` nunca sale de Supabase.

### Paso 0 — Corre la migración (si no lo has hecho)

Supabase → **SQL Editor** → **New query** → pega todo el contenido de
**`supabase/upgrade-fase2.sql`** → **Run**.

### Paso 1 — Crear la función

1. Supabase → menú lateral **Edge Functions** → **Deploy a new function**
   → **Via Editor** (editor en el navegador).
2. Nombre: **`admin-photos`** (exacto).
3. Borra el código de ejemplo y pega **todo** el contenido de
   **`supabase/functions/admin-photos/index.ts`** de este repo.
4. Pulsa **Deploy**.

### Paso 2 — Desactivar la verificación de JWT

El PIN es la autenticación, así que la verificación JWT debe apagarse:

1. Edge Functions → **admin-photos** → pestaña **Details** (o el engranaje).
2. Desactiva **"Enforce JWT verification"** (o "Verify JWT with legacy secret").
3. Guarda.

### Paso 3 — Definir el PIN secreto

1. Edge Functions → **Secrets** (o Project Settings → Edge Functions → Secrets).
2. Añade: **Name** = `ADMIN_PIN` · **Value** = tu PIN.

> ⚠️ El PIN protege el borrado de las fotos y la lista de correos de los
> invitados. Usa una **frase larga** (mínimo 10 caracteres, no `1234`).
> Ejemplo: `clara-y-angel-2026!boda`.

### Paso 4 — Usar

1. Abre **https://notxngel.github.io/Photobooth-Our-Wedding/admin.html**
   en tu teléfono o cualquier navegador.
2. Escribe el PIN → verás todas las fotos con su correo y fecha.
3. **Borrar** en cualquier foto la elimina para siempre (previa confirmación).
4. El PIN queda recordado mientras la pestaña esté abierta; **Salir** lo olvida.

> 💡 Guarda la dirección en la pantalla de inicio de tu teléfono antes de la
> boda. No compartas el enlace ni el PIN con nadie más que ustedes dos.

### Alternativa por terminal (si prefieres CLI)

```bash
npx supabase login
npx supabase functions deploy admin-photos --project-ref bxlfjobuzoxcnjrwaeee --no-verify-jwt
npx supabase secrets set ADMIN_PIN='tu-frase-secreta' --project-ref bxlfjobuzoxcnjrwaeee
```

---

## B. Panel local (`tools/admin-local.html`)

Sigue funcionando como respaldo (no necesita la Edge Function):

1. Una sola vez: `cp tools/secrets.example.js tools/secrets.js` y pega tu clave
   secreta de Supabase (**Project Settings → API keys**, la clave *secreta* —
   `service_role` legacy o `sb_secret_...` — **no** la anon/publishable).
2. `node tools/dev-server.js`
3. Abre **https://localhost:8443/tools/admin-local.html**

> ⚠️ `tools/secrets.js` está en `.gitignore`: **nunca** lo subas a GitHub.
