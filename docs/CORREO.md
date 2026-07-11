# Enviar las fotos a los invitados por correo

Cada invitado que dejó su correo al guardar su foto recibirá un email **desde
tu Gmail** con un **botón de descarga directa** por cada foto (un toque y el
JPEG se guarda en su dispositivo — la URL pública de Supabase con `?download=`
fuerza la descarga), además de la(s) foto(s) **adjuntas** y el enlace a la
galería. El envío lo hace un script que corre en **tu Mac** (`tools/emailer/`):

- Sale de tu correo real → excelente entregabilidad (no cae en spam).
- Gratis, sin cuentas nuevas ni dominios.
- Si un invitado se tomó varias fotos, recibe **un solo correo** con todas.
- El estado vive en la base (`email_sent_at`): puedes apagar la laptop y al
  volver a correr el script envía **solo lo pendiente**. Nada se envía dos veces.

> El correo es **opcional** para los invitados: el QR sigue siendo la vía
> principal. Quien no deja correo simplemente escanea el QR o busca su foto
> en la galería.

---

## Puesta en marcha (una sola vez, ~10 min)

### 1. Crea una clave de aplicación de Gmail

1. Necesitas **verificación en 2 pasos** activada en tu cuenta de Google
   (myaccount.google.com → Seguridad).
2. Entra a **https://myaccount.google.com/apppasswords**.
3. Nombre: `photobooth` → **Crear**. Google te da 16 letras
   (ej. `abcd efgh ijkl mnop`). Cópialas.

> Esto **no** es tu contraseña de Gmail: es una clave solo para esta app, y la
> puedes revocar después de la boda desde esa misma página.

### 2. Rellena tus secretos

```bash
cp tools/secrets.example.js tools/secrets.js   # si no existe ya
```

Edita `tools/secrets.js`:

- `SERVICE_ROLE_KEY` → Supabase → Project Settings → API keys → clave
  **secreta** (`service_role` legacy o `sb_secret_...`).
- `GMAIL_USER` → tu Gmail (ya viene puesto).
- `GMAIL_APP_PASSWORD` → las 16 letras del paso 1.

⚠️ `tools/secrets.js` está en `.gitignore`: **nunca** se sube a GitHub.

### 3. Instala las dependencias

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

El día de la boda: deja `--watch` corriendo (y la Mac enchufada y sin
dormirse: Ajustes del Sistema → Pantalla y Energía). Si algo falla, no se
pierde nada — al volver a correr el script se envía lo pendiente.

### Que corra solo, sin abrir una terminal (launchd)

Ya está instalado como servicio de `launchd` (`~/Library/LaunchAgents/com.photobooth.emailer.plist`):
arranca solo al iniciar sesión en la Mac, y si el proceso muere se reinicia
automáticamente. No hace falta dejar una ventana de Terminal abierta.

```bash
# Ver si está corriendo
launchctl list | grep photobooth

# Ver el log en vivo
tail -f tools/emailer/logs/emailer.log

# Parar el servicio (ej. para editar tools/secrets.js)
launchctl bootout gui/$(id -u)/com.photobooth.emailer

# Volver a arrancarlo (necesario tras editar secrets.js o el script)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.photobooth.emailer.plist
```

⚠️ Si cambias `tools/secrets.js`, tienes que hacer `bootout` + `bootstrap` de
nuevo — el servicio carga las claves solo una vez al arrancar.

### Qué verás

```
📮 Emailer del photobooth — Matamoros Wedding
   Remitente: angelmm263@gmail.com
   Conexión con Gmail: ✓

  ✉️  invitado@ejemplo.com ← 2 fotos ✓
```

### Detalles útiles

- **Reintentos:** los errores de red se reintentan solos en el siguiente ciclo.
  Un correo inexistente (rebote definitivo) se marca en la columna
  `email_error` y no se reintenta.
- **Límites de Gmail:** ~500 correos/día — de sobra para una boda.
- **¿Cuáles faltan?** En Supabase → Table Editor → `photos`: pendientes =
  filas con `email` y sin `email_sent_at`.
- **Privacidad:** la clave pública (`anon`) no puede leer la columna `email`
  (verificado: `permission denied`); solo el script local con la clave
  secreta puede. La galería pública nunca expone correos.
- **Después de la boda:** revoca la clave de aplicación en
  https://myaccount.google.com/apppasswords
