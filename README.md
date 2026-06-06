# 📸 Photo Booth — Angel & Clara

Photo booth web para el iPad del evento (16·07·26). Captura fotos con filtros y
marcos, las respalda automáticamente en la nube y entrega a cada invitado un
**código QR** para que descargue su recuerdo en el móvil.

---

## 1. Configurar la nube (QR + respaldo) — 5 minutos

El QR y el respaldo automático usan **Cloudinary** (plan gratis).

1. Crea una cuenta en <https://cloudinary.com>.
2. Ve a **Settings → Upload → Upload presets → Add upload preset**.
3. Pon **Signing Mode: Unsigned** y guarda. Anota el **nombre del preset**.
4. Copia tu **Cloud name** (aparece en el Dashboard).
5. Abre `app.js` y pega ambos valores arriba del todo:

```js
const CLOUDINARY = {
    cloudName: 'tu_cloud_name',
    uploadPreset: 'tu_upload_preset'
};
```

> Mientras estos valores empiecen por `TU_`, la app funciona igual (captura,
> filtros, descarga), pero el QR queda inactivo y muestra un aviso.

---

## 2. Publicar la app con HTTPS (obligatorio)

La cámara (`getUserMedia`) **solo funciona sobre HTTPS** o `localhost`.
Si abres el `index.html` con doble clic (`file://`), la cámara NO arrancará.

Opciones sencillas y gratuitas para publicarla:

- **Netlify Drop**: arrastra la carpeta a <https://app.netlify.com/drop> → URL HTTPS al instante.
- **GitHub Pages**: Settings → Pages → activa la rama.
- **Vercel / Cloudflare Pages**: conecta el repo y despliega.

Guarda la URL final; será la que abras en el iPad.

---

## 3. Preparar el iPad como kiosco (modo booth)

1. Abre la URL en **Safari**.
2. **Compartir → Añadir a pantalla de inicio**. Ábrela desde ese icono: se ve a
   pantalla completa, sin barras de Safari.
3. Concede el permiso de **cámara** la primera vez.
4. Activa **Acceso Guiado** para que nadie salga de la app:
   - Ajustes → Accesibilidad → **Acceso Guiado** → activar.
   - Abre la app y pulsa **3 veces el botón lateral** para bloquearla.
   - (Define un PIN que solo tú conozcas para salir).
5. **Ajustes → Pantalla y brillo → Bloqueo automático → Nunca** (la app además
   mantiene la pantalla encendida con Wake Lock, pero esto es un seguro extra).

---

## 4. Checklist de prueba ANTES del evento

Haz esta prueba completa en el **iPad Air 5 real** (no en otro dispositivo):

- [ ] La cámara abre y se ve en vivo.
- [ ] En la consola de Safari aparece `📷 Resolución de captura real: …`.
- [ ] Aplica filtro **Sepia** o **B/N**, captura y comprueba que la foto guardada
      **sale CON el filtro** (esto fallaba en Safari y ya está corregido).
- [ ] La foto guardada **no sale volteada** respecto a lo que viste en pantalla.
- [ ] Modo **Retrato** genera una **tira de 4 fotos** con el nombre al pie.
- [ ] El botón **Guardar** descarga un `.jpg`.
- [ ] El botón **Compartir** muestra un **QR** que, al escanearlo con otro móvil,
      abre la foto y permite descargarla.
- [ ] Entra en Cloudinary y confirma que la foto **quedó respaldada**.
- [ ] Deja la app quieta 90 s en la pantalla de resultado → vuelve sola a la portada.

---

## 5. Logística del día (5 horas)

- 🔌 **Mantén el iPad conectado a corriente** todo el evento. La cámara + pantalla
  encendida consumen mucho; no lo dejes solo con batería.
- 📶 **WiFi estable** cerca del booth. El QR y el respaldo necesitan internet.
  (Si el WiFi falla, la subida reintenta sola 3 veces; aun así, el botón
  **Guardar** funciona sin conexión como respaldo local.)
- 🧷 Fija el iPad en un soporte estable a la altura adecuada.
- 🧪 Haz una captura de prueba al montar, antes de que lleguen los invitados.

---

## Estructura del proyecto

```
index.html   → Estructura y pantallas (portada, menú, booth, resultado, modal QR)
styles.css   → Estilos
app.js        → Lógica: cámara, filtros, captura, tira de 4, nube + QR, robustez
```

## Notas técnicas

- Captura a **resolución nativa** de la cámara (Safari limita el stream a ~1080p;
  es un techo del navegador, no del código).
- Filtros **horneados por píxeles** para que funcionen en Safari/iPadOS.
- Export en **JPEG 0.92** (calidad intacta, peso reducido).
- Robustez: Wake Lock, auto-recuperación de cámara, reintentos de subida y
  reinicio por inactividad.
