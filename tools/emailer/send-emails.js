/**
 * send-emails.js — Envía a cada invitado su(s) foto(s) del photobooth.
 *
 * Corre en TU Mac, usa TU Gmail (con clave de aplicación) y lee las fotos
 * pendientes de la tabla `photos` de Supabase. Agrupa por invitado: si alguien
 * se tomó varias fotos, recibe UN correo con todas adjuntas.
 *
 * Uso (dentro de tools/emailer/):
 *   npm install                 (solo la primera vez)
 *   node send-emails.js         → envía lo pendiente y termina
 *   node send-emails.js --watch → queda vigilando y envía cada foto nueva
 *                                 (déjalo corriendo durante la boda)
 *
 * Config: tools/secrets.js (ver tools/secrets.example.js) + assets/js/config.js.
 * Estado en la BD:  email_sent_at (enviado) · email_error (falla permanente).
 */
'use strict';

const path = require('path');
const nodemailer = require('nodemailer');

/* ── Cargar config pública y secretos (archivos pensados para el navegador) ── */
globalThis.window = globalThis;
require(path.join(__dirname, '..', '..', 'assets', 'js', 'config.js'));
try {
    require(path.join(__dirname, '..', 'secrets.js'));
} catch (_) {
    fail('No encontré tools/secrets.js.\n' +
         '  Créalo con:  cp tools/secrets.example.js tools/secrets.js\n' +
         '  y rellena tus claves (ver instrucciones dentro del archivo).');
}

const CFG = globalThis.PB_CONFIG  || {};
const SEC = globalThis.PB_SECRETS || {};

const SUPABASE_URL = CFG.SUPABASE_URL;
const BUCKET       = CFG.BUCKET || 'photos';
const GALLERY_URL  = 'https://notxngel.github.io/Photobooth-Our-Wedding/gallery.html';

const WATCH         = process.argv.includes('--watch');
const POLL_INTERVAL = 30 * 1000;   // 30 s entre revisiones en modo --watch

function fail(msg) {
    console.error('\n❌ ' + msg + '\n');
    process.exit(1);
}

if (!SUPABASE_URL) fail('Falta SUPABASE_URL en assets/js/config.js.');
if (!SEC.SERVICE_ROLE_KEY || SEC.SERVICE_ROLE_KEY.includes('PEGA_AQUI'))
    fail('Falta SERVICE_ROLE_KEY en tools/secrets.js (Supabase → Project Settings → API keys → clave secreta).');
if (!SEC.GMAIL_USER || !SEC.GMAIL_USER.includes('@'))
    fail('Falta GMAIL_USER en tools/secrets.js.');
if (!SEC.GMAIL_APP_PASSWORD || SEC.GMAIL_APP_PASSWORD.includes('PEGA_AQUI'))
    fail('Falta GMAIL_APP_PASSWORD en tools/secrets.js.\n' +
         '  Créala en https://myaccount.google.com/apppasswords (requiere verificación en 2 pasos).');

const dbHeaders = {
    apikey: SEC.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SEC.SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SEC.GMAIL_USER, pass: SEC.GMAIL_APP_PASSWORD.replace(/\s+/g, '') }
});

/* ── Supabase ──────────────────────────────────────────────────────────── */
async function fetchPending() {
    const url = `${SUPABASE_URL}/rest/v1/photos` +
        '?select=id,email,image_path,created_at' +
        '&email=not.is.null&email_sent_at=is.null&email_error=is.null' +
        '&order=created_at.asc';
    const res = await fetch(url, { headers: dbHeaders });
    if (!res.ok) throw new Error('BD ' + res.status + ': ' + (await res.text()).slice(0, 200));
    return res.json();
}

async function markRows(ids, patch) {
    const url = `${SUPABASE_URL}/rest/v1/photos?id=in.(${ids.join(',')})`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error('BD ' + res.status + ' al marcar filas');
}

async function downloadPhoto(imagePath) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${imagePath}`);
    if (!res.ok) throw Object.assign(new Error('Storage ' + res.status), { permanent: res.status === 404 });
    return Buffer.from(await res.arrayBuffer());
}

/* ── Correo ────────────────────────────────────────────────────────────── */
// URL pública con ?download=: Supabase responde Content-Disposition: attachment,
// así el navegador descarga el JPEG directo al tocar el botón (sin vista previa).
function photoFilename(i) { return `Matamoros_Wedding_${i + 1}.jpg`; }

function downloadUrl(row, i) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${row.image_path}` +
           `?download=${encodeURIComponent(photoFilename(i))}`;
}

function emailHtml(rows) {
    const count = rows.length;
    const fotos = count === 1 ? 'tu foto' : 'tus fotos';
    const botones = rows.map((row, i) => `
        <p style="margin:14px 0">
            <a href="${downloadUrl(row, i)}"
               style="display:inline-block;color:#1a1206;background:#C9A96E;text-decoration:none;padding:14px 30px;border-radius:999px;font-size:15px;font-weight:bold">
               ⬇️ Descargar ${count === 1 ? 'tu foto' : `foto ${i + 1}`}
            </a>
        </p>`).join('');
    return `
    <div style="background:#0F0C09;color:#F5E6D3;font-family:Georgia,serif;padding:36px 24px;text-align:center">
        <p style="color:#C9A96E;font-size:26px;margin:0 0 4px">Matamoros Wedding</p>
        <p style="font-style:italic;font-size:18px;margin:0 0 24px;opacity:.8">Angel &amp; Clara · 16 · 07 · 2026</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px">
            ¡Gracias por acompañarnos! 💛<br>
            Toca el botón y ${fotos} se ${count === 1 ? 'guardará' : 'guardarán'} en tu dispositivo.
        </p>
        ${botones}
        <p style="font-size:13px;opacity:.7;margin:20px 0 0">
            (${count === 1 ? 'También va adjunta' : 'También van adjuntas'} en este correo, por si prefieres guardarla desde ahí.)
        </p>
        <p style="margin:28px 0 0">
            <a href="${GALLERY_URL}" style="color:#C9A96E;font-size:14px">Ver la galería de la boda</a>
        </p>
        <p style="font-size:12px;opacity:.5;margin:24px 0 0">Un momento capturado, una memoria eterna.</p>
    </div>`;
}

async function sendGroup(email, rows) {
    const attachments = [];
    for (let i = 0; i < rows.length; i++) {
        attachments.push({
            filename: photoFilename(i),
            content: await downloadPhoto(rows[i].image_path),
            contentType: 'image/jpeg'
        });
    }
    await transporter.sendMail({
        from: `"Angel & Clara" <${SEC.GMAIL_USER}>`,
        to: email,
        subject: '📸 Tu foto del photobooth — Boda de Angel & Clara',
        html: emailHtml(rows),
        attachments
    });
}

/* ── Ciclo principal ───────────────────────────────────────────────────── */
async function processPending() {
    const pending = await fetchPending();
    if (!pending.length) return 0;

    // Un correo por invitado, con todas sus fotos pendientes adjuntas
    const groups = new Map();
    for (const row of pending) {
        const key = row.email.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }

    let sent = 0;
    for (const [email, rows] of groups) {
        const ids = rows.map(r => r.id);
        try {
            await sendGroup(email, rows);
            await markRows(ids, { email_sent_at: new Date().toISOString() });
            sent += rows.length;
            console.log(`  ✉️  ${email} ← ${rows.length} foto${rows.length === 1 ? '' : 's'} ✓`);
        } catch (err) {
            // Falla permanente (correo inexistente, imagen borrada): se marca y
            // no se reintenta. Falla temporal (red): se reintenta al siguiente ciclo.
            const permanent = err.permanent || (err.responseCode >= 500 && err.responseCode < 600);
            if (permanent) {
                await markRows(ids, { email_error: String(err.message || err).slice(0, 200) }).catch(() => {});
                console.error(`  ⚠️  ${email}: falla permanente (${err.message}) — no se reintentará`);
            } else {
                console.error(`  ⏳ ${email}: ${err.message} — se reintentará`);
            }
        }
    }
    return sent;
}

async function main() {
    console.log('📮 Emailer del photobooth — Matamoros Wedding');
    console.log(`   Remitente: ${SEC.GMAIL_USER}`);

    try {
        await transporter.verify();
        console.log('   Conexión con Gmail: ✓\n');
    } catch (err) {
        fail('Gmail rechazó la conexión: ' + err.message +
             '\n  Revisa GMAIL_USER y GMAIL_APP_PASSWORD en tools/secrets.js.' +
             '\n  La clave de aplicación se crea en https://myaccount.google.com/apppasswords');
    }

    if (!WATCH) {
        const n = await processPending();
        console.log(n ? `\n✅ ${n} foto(s) enviadas.` : 'No hay correos pendientes. ✓');
        return;
    }

    console.log(`👀 Modo vigilancia: revisando cada ${POLL_INTERVAL / 1000}s. Ctrl+C para salir.\n`);
    for (;;) {
        try {
            const n = await processPending();
            if (n) console.log(`   ${new Date().toLocaleTimeString()} — ${n} foto(s) enviadas`);
        } catch (err) {
            console.error('   ' + new Date().toLocaleTimeString() + ' — error: ' + err.message + ' (se reintenta)');
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
}

main().catch(err => fail(err.stack || err.message));
