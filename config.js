/* ==========================================================================
   config.js — Configuración del backend (Supabase)
   --------------------------------------------------------------------------
   Pega aquí los datos de tu proyecto de Supabase.

   - SUPABASE_URL:      "Project URL"  (Settings → API)
   - SUPABASE_ANON_KEY: clave "anon public" (Settings → API)

   ⚠️ La clave "anon" es PÚBLICA por diseño: está pensada para vivir en el
   navegador, así que es seguro incluirla aquí. NO pongas la clave "service_role".

   Mientras tenga los valores de ejemplo, la app funciona en modo local
   (descarga en el dispositivo) sin intentar subir nada.
   ========================================================================== */
window.PB_CONFIG = {
    SUPABASE_URL:      'https://TU-PROYECTO.supabase.co',
    SUPABASE_ANON_KEY: 'TU_CLAVE_ANON_PUBLICA',
    BUCKET:            'photos'
};
