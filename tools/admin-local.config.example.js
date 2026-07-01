/**
 * admin-local.config.example.js — PLANTILLA de configuración del panel local.
 *
 * CÓMO USAR (una sola vez, en tu Mac):
 *   1. Copia este archivo a  tools/admin-local.config.js
 *          cp tools/admin-local.config.example.js tools/admin-local.config.js
 *   2. En Supabase → Project Settings → API, copia la clave "service_role"
 *      (la SECRETA, no la anon) y pégala abajo.
 *
 * ⚠️ La clave service_role da acceso TOTAL a tu proyecto. El archivo real
 *    (tools/admin-local.config.js) está en .gitignore y NUNCA debe subirse a
 *    GitHub ni desplegarse. Úsalo solo en tu propia computadora (localhost).
 */
window.PB_ADMIN = {
    SERVICE_ROLE_KEY: 'PEGA_AQUI_TU_CLAVE_SERVICE_ROLE'
};
