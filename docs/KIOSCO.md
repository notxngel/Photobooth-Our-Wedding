# ⚠️ IMPORTANTE — Modo kiosco del iPad (Acceso Guiado)

> **Leer antes de la boda (16/07/2026).** Sin esto, cualquier invitado puede
> salir de la app y usar el iPad para lo que sea. La web NO puede impedirlo
> por sí sola — es una función del sistema operativo.

## Por qué hace falta

La app ya corre a pantalla completa como PWA (sin barras de Safari) y no
tiene ningún enlace que saque al invitado (`index.html` ↔ `gallery.html`
solamente; el QR se escanea con el teléfono del invitado, nunca en el iPad).
Lo único que la web no puede bloquear es el gesto/botón de inicio y el
cambio de apps. Eso lo bloquea el **Acceso Guiado** de iOS.

## Configuración (una sola vez)

1. **Ajustes → Accesibilidad → Acceso Guiado** → activar.
2. Definir el **código** de Acceso Guiado (solo lo saben Angel & Clara —
   es lo que protege la salida).
3. Ahí mismo, en **Ajustes de pantalla**, activar que la pantalla **no se
   bloquee automáticamente** durante la sesión.
4. Verificar en **Ajustes → Accesibilidad → Atajo de accesibilidad** (hasta
   abajo) que **"Acceso Guiado"** esté marcado.

## ⚠️ Fijar la app (esto se hace CADA vez — activarlo en Ajustes NO basta)

Activar el interruptor en Ajustes es solo el paso 1: **no fija nada por sí
solo**. Hay que iniciar una sesión manualmente dentro de la app:

1. Abrir la app del photobooth **desde el ícono de pantalla de inicio**
   (la PWA instalada).
2. **⚠️ Tomar una foto de prueba primero** para que el permiso de cámara ya
   esté concedido. Si el diálogo de permiso aparece con el Acceso Guiado ya
   activo, sus botones pueden quedar fuera del área permitida y no se puede
   aceptar.
3. Con la app abierta, presionar **3 veces seguidas y rápido** el botón:
   - iPad **sin** botón de inicio → el **botón superior** (encendido).
   - iPad **con** botón de inicio → el **botón de inicio**.
4. En la pantalla de Acceso Guiado, tocar **"Iniciar"** (arriba a la
   derecha). Debe decir "Acceso Guiado iniciado".
5. Opcional: en "Opciones", desactivar los botones de volumen. **NO
   desactivar el teclado** — se necesita para el campo de correo.

**Para salir**: triple clic de nuevo → código → "Finalizar".

## Si el triple clic no hace nada

- El triple clic tiene que ser **rápido** (menos de ~1.5 s entre clics);
  si es lento, iOS lo interpreta como clics sueltos.
- Revisar **Ajustes → Accesibilidad → Atajo de accesibilidad**: "Acceso
  Guiado" debe estar marcado. Si hay varias funciones marcadas, el triple
  clic abre un menú — elegir "Acceso Guiado" ahí.
- Si pide crear un código la primera vez: crearlo — ese es el código que
  protege la salida.

## Probar antes de soltar el iPad

Con la sesión iniciada, intentar escapar: deslizar desde abajo (no debe
salir al inicio), intentar cambiar de app, presionar el botón de apagado —
nada debe funcionar excepto la app. Si es así, está listo para los
invitados.

## Checklist del día

- [ ] Cargador conectado toda la noche.
- [ ] Brillo fijo (el auto-brillo baja en salones oscuros).
- [ ] "No molestar" activado.
- [ ] Wifi del venue conectada y probada con un guardado completo
      (foto → correo → QR → galería).
- [ ] Foto de prueba tomada (permiso de cámara concedido) **antes** de
      iniciar el Acceso Guiado — y borrada después en el dashboard de
      Supabase si no quieren que salga en la galería.
- [ ] Triple clic → "Iniciar" → intentar escapar para confirmar el bloqueo.

## Si el booth fuera Android (plan B)

Equivalente nativo: **Fijar pantalla** (Ajustes → Seguridad → Fijar
aplicaciones), o la app *Fully Kiosk Browser* para algo más robusto.
