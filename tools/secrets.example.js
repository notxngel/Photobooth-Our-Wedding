/**
 * secrets.example.js — PLANTILLA del archivo de secretos local.
 *
 * CÓMO USAR (una sola vez, en tu Mac):
 *   1. Copia este archivo a  tools/secrets.js
 *          cp tools/secrets.example.js tools/secrets.js
 *   2. Rellena los valores de abajo en tools/secrets.js.
 *
 * ⚠️ tools/secrets.js está en .gitignore y NUNCA debe subirse a GitHub ni
 *    desplegarse: estas claves dan acceso total. Solo viven en tu computadora.
 *
 * Lo usa tools/emailer/ (envío de las fotos por correo a los invitados).
 */
globalThis.PB_SECRETS = {
    // Supabase → Project Settings → API keys → clave SECRETA
    // (la "service_role" legacy o una "sb_secret_..."; NO la anon/publishable)
    SERVICE_ROLE_KEY: 'PEGA_AQUI_TU_CLAVE_SECRETA',

    // Tu cuenta de Gmail desde la que salen los correos a los invitados
    GMAIL_USER: 'angelmm263@gmail.com',

    // Clave de aplicación de Gmail (NO tu contraseña normal).
    // Se crea en https://myaccount.google.com/apppasswords (requiere tener
    // verificación en 2 pasos activada). Son 16 letras, ej: "abcd efgh ijkl mnop".
    GMAIL_APP_PASSWORD: 'PEGA_AQUI_TU_CLAVE_DE_APLICACION'
};
