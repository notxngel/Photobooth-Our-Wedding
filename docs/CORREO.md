# Enviar las fotos a los invitados por correo (Fase 2)

Cada invitado que dejó su correo al guardar su foto recibirá un email **desde
tu Gmail** con su(s) foto(s) **adjuntas** y el enlace a la galería. El envío lo
hace un script que corre en **tu Mac** (`tools/emailer/`):

- Sale de tu correo real → excelente entregabilidad (no cae en spam).
- Gratis, sin cuentas nuevas ni dominios.
- Si un invitado se tomó varias fotos, recibe **un solo correo** con todas.
- El estado vive en la base (`email_sent_at`): puedes apagar la laptop y al
  volver a correr el script envía **solo lo pendiente**. Nada se envía dos veces.

> El correo es **opcional** para los invitados: quien no lo deja, simplemente
> aparece en la galería y no recibe email.

---

## Puesta en marcha (una sola vez, ~10 min)

### 1. Corre la migración de la base

Supabase → **SQL Editor** → **New query** → pega todo el contenido de
**`supabase/upgrade-fase2.sql`** → **Run**. (Si ya lo hiciste para el panel
admin, no hace falta repetirlo.)

### 2. Crea una clave de aplicación de Gmail

1. Necesitas **verificación en 2 pasos** activada en tu cuenta de Google
   (myaccount.google.com → Seguridad).
2. Entra a **https://myaccount.google.com/apppasswords**.
3. Nombre: `photobooth` → **Crear**. Google te da 16 letras
   (ej. `abcd efgh ijkl mnop`). Cópialas.

> Esto **no** es tu contraseña de Gmail: es una clave solo para esta app, y la
> puedes revocar después de la boda desde esa misma página.

### 3. Rellena tus secretos

```bash
cp tools/secrets.example.js tools/secrets.js   # si no existe ya
```

Edita `tools/secrets.js`:

- `SERVICE_ROLE_KEY` → Supabase → Project Settings → API keys → clave
  **secreta** (`service_role` legacy o `sb_secret_...`).
- `GMAIL_USER` → tu Gmail (ya viene puesto).
- `GMAIL_APP_PASSWORD` → las 16 letras del paso 2.

### 4. Instala las dependencias

```bash
cd tools/emailer
npm install
```

---

## Uso

```bash
cd tools/emailer

node send-emails.js           # envía lo pendiente y termina
node send-emails.js --watch   # 👈 PARA LA BODA: queda vigilando y envía
                              #    cada foto nueva a los ~30 segundos
```

El día de la boda: deja `--watch` corriendo en una terminal (y la Mac enchufada
y sin dormirse: Ajustes del Sistema → Pantalla y Energía). Si algo falla, no se
pierde nada — al volver a correr el script se envía lo pendiente.

### Qué verás

```
📮 Emailer del photobooth — Matamoro's Wedding
   Remitente: angelmm263@gmail.com
   Conexión con Gmail: ✓

  ✉️  invitado@ejemplo.com ← 2 fotos ✓
```

En el panel de admin, las fotos con correo ya enviado muestran **✓ enviada**.

### Detalles útiles

- **Reintentos:** los errores de red se reintentan solos en el siguiente ciclo.
  Un correo inexistente (rebote definitivo) se marca en la columna
  `email_error` y no se reintenta.
- **Límites de Gmail:** ~500 correos/día — de sobra para una boda.
- **¿Cuáles faltan?** En Supabase → Table Editor → `photos`: pendientes =
  filas con `email` y sin `email_sent_at`.
- **Después de la boda:** revoca la clave de aplicación en
  https://myaccount.google.com/apppasswords
