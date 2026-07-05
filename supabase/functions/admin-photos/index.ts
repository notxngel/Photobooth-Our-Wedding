/**
 * admin-photos — Edge Function de administración de la galería.
 *
 * Permite LISTAR y BORRAR fotos desde cualquier dispositivo (admin.html)
 * sin exponer nunca la clave service_role: la clave vive aquí, en el
 * servidor de Supabase, y el acceso se protege con un PIN secreto.
 *
 * Despliegue (ver docs/ADMIN.md):
 *   - Secreto requerido:  ADMIN_PIN     (frase larga, no "1234")
 *   - Secreto requerido:  SERVICE_KEY   (clave secreta de Supabase — Project
 *                          Settings → API Keys → clave "secret"/"service_role";
 *                          la misma que usan tools/admin-local.html y el emailer)
 *   - Desplegar SIN verificación de JWT (el PIN es la autenticación).
 *
 * API (POST, JSON):
 *   Cabecera:  x-admin-pin: <tu PIN>
 *   { "action": "list" }                  → [{ id, email, image_path, thumb_path, created_at }]
 *   { "action": "delete", "id": "<uuid>" } → { ok: true }   (borra archivo(s) + fila)
 */

const BUCKET = 'photos';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-pin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Comparación de PIN sin fugas de tiempo: compara hashes de longitud fija.
async function pinOk(given: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const va = new Uint8Array(a), vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return json({ error: 'Método no permitido' }, 405);

  const given = req.headers.get('x-admin-pin') ?? '';
  if (!(await pinOk(given, Deno.env.get('ADMIN_PIN') ?? ''))) {
    return json({ error: 'PIN incorrecto' }, 401);
  }

  const URL_ = Deno.env.get('SUPABASE_URL')!;
  // Secreto propio en vez del SUPABASE_SERVICE_ROLE_KEY auto-inyectado: en
  // proyectos migrados al nuevo sistema de llaves (sb_publishable_/sb_secret_)
  // esa variable puede no dar acceso total y el REST API responde 403.
  const KEY  = Deno.env.get('SERVICE_KEY')!;
  const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  let body: { action?: string; id?: string };
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

  // ── Listar todas las fotos (incluye correo — solo para los novios) ──────
  if (body.action === 'list') {
    const r = await fetch(
      `${URL_}/rest/v1/photos?select=id,email,image_path,thumb_path,created_at,email_sent_at&order=created_at.desc`,
      { headers: auth },
    );
    if (!r.ok) return json({ error: 'BD ' + r.status }, 500);
    return json(await r.json());
  }

  // ── Borrar una foto: archivo(s) del Storage + fila de la tabla ──────────
  if (body.action === 'delete') {
    if (!body.id || !UUID_RE.test(body.id)) return json({ error: 'id inválido' }, 400);

    const r = await fetch(
      `${URL_}/rest/v1/photos?id=eq.${body.id}&select=image_path,thumb_path`,
      { headers: auth },
    );
    if (!r.ok) return json({ error: 'BD ' + r.status }, 500);
    const rows: { image_path: string; thumb_path: string | null }[] = await r.json();
    if (!rows.length) return json({ ok: true, note: 'La foto ya no existía' });

    // Archivos (imagen + miniatura). Si ya no existen, no es fatal.
    const paths = [rows[0].image_path, rows[0].thumb_path].filter(Boolean);
    await fetch(`${URL_}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths }),
    }).catch(() => null);

    // Fila (la fuente de verdad de la galería)
    const d = await fetch(`${URL_}/rest/v1/photos?id=eq.${body.id}`, {
      method: 'DELETE',
      headers: { ...auth, Prefer: 'return=minimal' },
    });
    if (!d.ok) return json({ error: 'BD ' + d.status }, 500);

    return json({ ok: true });
  }

  return json({ error: 'Acción desconocida' }, 400);
});
