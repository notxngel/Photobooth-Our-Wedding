#!/usr/bin/env node
/**
 * dev-server.js — Servidor de desarrollo HTTPS sin dependencias.
 *
 * Sirve los archivos estáticos de esta carpeta por HTTPS para que la cámara
 * (getUserMedia) funcione también desde el teléfono en la misma red Wi-Fi.
 *
 * Uso:
 *   node dev-server.js            # puerto 8443 por defecto
 *   PORT=9000 node dev-server.js  # puerto personalizado
 *
 * Genera key.pem/cert.pem automáticamente (requiere openssl) si no existen.
 * El certificado es autofirmado: el teléfono mostrará un aviso de seguridad
 * una sola vez ("continuar de todos modos") — es normal en desarrollo.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT, 10) || 8443;
const KEY = path.join(ROOT, 'key.pem');
const CERT = path.join(ROOT, 'cert.pem');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff2': 'font/woff2'
};

/* ── Direcciones LAN para conectarse desde el teléfono ─────────────────── */
function lanAddresses() {
    const out = [];
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const net of ifaces[name] || []) {
            if (net.family === 'IPv4' && !net.internal) out.push(net.address);
        }
    }
    return out;
}

/* ── Certificado autofirmado (se genera una sola vez) ──────────────────── */
function ensureCert() {
    if (fs.existsSync(KEY) && fs.existsSync(CERT)) return;
    console.log('🔐  Generando certificado autofirmado (key.pem / cert.pem)...');
    const sans = ['DNS:localhost', 'IP:127.0.0.1', ...lanAddresses().map(ip => `IP:${ip}`)].join(',');
    try {
        execSync(
            `openssl req -x509 -newkey rsa:2048 -nodes ` +
            `-keyout "${KEY}" -out "${CERT}" -days 365 ` +
            `-subj "/CN=localhost" -addext "subjectAltName=${sans}"`,
            { stdio: 'ignore' }
        );
        console.log('✅  Certificado generado.\n');
    } catch (e) {
        console.error('\n❌  No se pudo generar el certificado automáticamente.');
        console.error('    Instala openssl o genera los archivos manualmente:\n');
        console.error(`    openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"\n`);
        process.exit(1);
    }
}

/* ── Resolución segura de rutas (evita path traversal) ─────────────────── */
function resolvePath(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    let rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const full = path.normalize(path.join(ROOT, rel));
    if (!full.startsWith(ROOT)) return null;          // fuera de la carpeta → bloqueado
    return full;
}

function handler(req, res) {
    let filePath = resolvePath(req.url);
    if (!filePath) { res.writeHead(403); return res.end('Forbidden'); }

    fs.stat(filePath, (err, stat) => {
        if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
        fs.readFile(filePath, (err2, data) => {
            if (err2) { res.writeHead(404); return res.end('Not found'); }
            const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
            res.end(data);
        });
    });
}

/* ── Arranque ──────────────────────────────────────────────────────────── */
ensureCert();

const options = { key: fs.readFileSync(KEY), cert: fs.readFileSync(CERT) };
https.createServer(options, handler).listen(PORT, '0.0.0.0', () => {
    console.log('📸  Photo Booth — servidor HTTPS de desarrollo\n');
    console.log(`    En esta compu:   https://localhost:${PORT}`);
    for (const ip of lanAddresses()) {
        console.log(`    En el teléfono:  https://${ip}:${PORT}`);
    }
    console.log('\n    (Acepta el aviso de certificado autofirmado en el teléfono.)');
    console.log('    Ctrl+C para detener.\n');
});

// Redirección opcional HTTP → HTTPS si levantas también el 80 (no obligatorio)
process.on('SIGINT', () => { console.log('\n👋  Servidor detenido.'); process.exit(0); });
