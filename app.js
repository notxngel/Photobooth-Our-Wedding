/**
 * app.js — Angel & Clara Photo Booth
 */

/* ==========================================================================
   ESTADO GLOBAL
   ========================================================================== */
const state = {
    mode: null,
    filter: 'color',
    frame: 'classic',
    stream: null,
    photoDataUrl: null,
    capturedFrames: [],
    isCapturing: false
};

const PHOTO_COUNTS = { retrato: 1, pareja: 2, rollo: 4 };
const MODE_LABELS  = { retrato: 'Retrato', pareja: 'Díptico', rollo: 'Rollo' };

const screens = {
    landing: document.getElementById('landing'),
    menu:    document.getElementById('menu'),
    booth:   document.getElementById('booth'),
    result:  document.getElementById('result')
};

/* ==========================================================================
   UTILIDADES
   ========================================================================== */
const delay = ms => new Promise(r => setTimeout(r, ms));

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('visible'));
    });
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}

/* ==========================================================================
   PARTÍCULAS (Landing)
   ========================================================================== */
const canvasParticles = document.getElementById('particles-canvas');
let particlesAnimationId = null;

function initParticles() {
    if (!canvasParticles) return;
    const ctx = canvasParticles.getContext('2d');
    let width, height;
    const particles = [];

    function resize() {
        width = canvasParticles.width = window.innerWidth;
        height = canvasParticles.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.4,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            a: Math.random() * 0.6 + 0.2
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width)  p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${p.a})`;
            ctx.fill();
        });
        particlesAnimationId = requestAnimationFrame(draw);
    }
    draw();
}

function stopParticles() {
    if (particlesAnimationId) {
        cancelAnimationFrame(particlesAnimationId);
        particlesAnimationId = null;
    }
}

/* ==========================================================================
   NAVEGACIÓN
   ========================================================================== */
function navigateTo(screenId) {
    Object.values(screens).forEach(s => s?.classList.remove('active'));
    screens[screenId]?.classList.add('active');

    if (screenId === 'landing') initParticles();
    else stopParticles();

    // Cerrar settings si salimos de booth
    if (screenId !== 'booth') closeSettingsImmediate();

    if (screenId === 'booth') {
        startCamera();
        const badge = document.getElementById('current-mode-display');
        if (badge) badge.textContent = MODE_LABELS[state.mode] || '';
    } else if (state.stream) {
        stopCamera();
    }
}

/* ==========================================================================
   PANTALLA COMPLETA
   ========================================================================== */
// Instalada desde "Añadir a pantalla de inicio" la app ya corre standalone
function isStandalone() {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
}

// En Safari de iPad el Fullscreen API sí funciona para cualquier elemento
// (en iPhone solo para <video> — el try/catch lo ignora silenciosamente)
function tryFullscreen() {
    if (isStandalone() || document.fullscreenElement || document.webkitFullscreenElement) return;
    const el = document.documentElement;
    try {
        if (el.requestFullscreen)            el.requestFullscreen().catch(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (_) { /* no soportado — seguimos en ventana normal */ }
}

document.getElementById('btn-start')?.addEventListener('click', () => {
    tryFullscreen();
    navigateTo('menu');
});
document.getElementById('btn-back-menu')?.addEventListener('click', () => navigateTo('landing'));
document.getElementById('btn-back-booth')?.addEventListener('click', () => navigateTo('menu'));

/* ==========================================================================
   MENÚ — SELECCIÓN DE MODO
   ========================================================================== */
document.querySelectorAll('.mode-card').forEach(card => {
    function select() {
        document.querySelectorAll('.mode-card').forEach(c => {
            c.setAttribute('aria-checked', 'false');
            c.classList.remove('selected');
        });
        card.setAttribute('aria-checked', 'true');
        card.classList.add('selected');
        state.mode = card.dataset.mode;
    }
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
});

document.getElementById('btn-start-camera')?.addEventListener('click', () => {
    if (!state.mode) {
        showToast('Selecciona el tipo de sesión primero.', 'warning');
        return;
    }
    navigateTo('booth');
});

/* ==========================================================================
   CÁMARA
   ========================================================================== */
const video = document.getElementById('player');

async function startCamera() {
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        });
        if (video) video.srcObject = state.stream;
    } catch (err) {
        showToast('No se pudo acceder a la cámara. Revisa los permisos.', 'error');
        console.error('Camera error:', err);
    }
}

function stopCamera() {
    state.stream?.getTracks().forEach(t => t.stop());
    state.stream = null;
    if (video) video.srcObject = null;
}

function applyVideoFilter() {
    if (!video) return;
    const map = {
        bw:      'grayscale(100%)',
        sepia:   'sepia(100%)',
        vintage: 'sepia(50%) contrast(120%) saturate(120%)',
        warm:    'sepia(30%) hue-rotate(-30deg) saturate(150%)',
        cool:    'hue-rotate(180deg) saturate(120%)'
    };
    video.style.filter = map[state.filter] || 'none';
}

/* ==========================================================================
   PANEL DE AJUSTES (bottom sheet)
   ========================================================================== */
const settingsSheet = document.getElementById('settings-sheet');

function openSettings() {
    if (!settingsSheet) return;
    settingsSheet.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => settingsSheet.classList.add('open'));
    });
}

function closeSettings() {
    if (!settingsSheet) return;
    settingsSheet.classList.remove('open');
    setTimeout(() => { settingsSheet.style.display = 'none'; }, 360);
}

function closeSettingsImmediate() {
    if (!settingsSheet) return;
    settingsSheet.classList.remove('open');
    settingsSheet.style.display = 'none';
}

document.getElementById('btn-settings')?.addEventListener('click', openSettings);
document.getElementById('btn-close-settings')?.addEventListener('click', closeSettings);
document.getElementById('settings-backdrop')?.addEventListener('click', closeSettings);

// Filtros
document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.filter = btn.dataset.filter;
        applyVideoFilter();
    });
});

// Marcos
document.querySelectorAll('[data-frame]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-frame]').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.frame = btn.dataset.frame;
    });
});

/* ==========================================================================
   HELPERS DE CAPTURA
   ========================================================================== */
const countdownEl    = document.getElementById('countdown');
const flashEl        = document.getElementById('flash');
const photoCounterEl = document.getElementById('photo-counter');

async function showCountdown() {
    if (!countdownEl) return;
    for (let c = 3; c > 0; c--) {
        countdownEl.textContent = c;
        countdownEl.classList.add('active');
        await delay(800);
        countdownEl.classList.remove('active');
        await delay(200);
    }
    countdownEl.textContent = '';
}

function triggerFlash() {
    if (!flashEl) return;
    flashEl.classList.add('active');
    setTimeout(() => {
        flashEl.classList.remove('active');
        flashEl.classList.add('fade-out');
        setTimeout(() => flashEl.classList.remove('fade-out'), 500);
    }, 80);
}

function setPhotoCounter(current, total) {
    if (!photoCounterEl) return;
    if (total <= 1) { photoCounterEl.classList.remove('visible'); return; }
    photoCounterEl.textContent = `${current} / ${total}`;
    photoCounterEl.classList.add('visible');
}

// Captura un frame del video y lo dibuja en el canvas oculto.
// Aplica el espejo horizontal para que coincida con lo que el usuario ve.
function captureFrame(applyFrameBorder = false) {
    const canvas = document.getElementById('snapshot');
    if (!canvas || !video || !video.videoWidth) return null;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');

    // Volteo horizontal — el video tiene scaleX(-1) en CSS, así que reproducimos eso
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.filter = video.style.filter || 'none';
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
    ctx.filter = 'none';

    // Marco opcional (solo Retrato)
    if (applyFrameBorder && state.frame !== 'none') {
        const frameDefs = {
            classic: { lw: Math.round(w * 0.026), color: '#ffffff' },
            elegant: { lw: Math.round(w * 0.011), color: '#E5D3B3' },
            minimal: { lw: Math.round(w * 0.005), color: '#000000' }
        };
        const f = frameDefs[state.frame];
        if (f) {
            ctx.lineWidth   = f.lw;
            ctx.strokeStyle = f.color;
            ctx.strokeRect(f.lw / 2, f.lw / 2, w - f.lw, h - f.lw);
        }
    }

    return canvas.toDataURL('image/png', 0.92);
}

/* ==========================================================================
   HELPERS DE COMPOSICIÓN
   ========================================================================== */
function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = src;
    });
}

// Dibuja la imagen llenando el destino sin estirarla (crop centrado),
// equivalente a object-fit: cover de CSS.
function drawImageCover(ctx, img, dx, dy, dw, dh) {
    const sRatio = img.width / img.height;
    const dRatio = dw / dh;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;

    if (sRatio > dRatio) {
        sw = img.height * dRatio;
        sx = (img.width - sw) / 2;
    } else {
        sh = img.width / dRatio;
        sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// Safari < 16 no soporta ctx.roundRect — path manual
function roundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
}

/* ==========================================================================
   COMPOSICIÓN — ROLLO (tira de 4 fotos)
   ========================================================================== */
async function composeRollo(frames) {
    const PW = 600, PH = 450;       // slots 4:3 — coincide con cámaras frontales
    const RAIL = 46;                // rieles laterales con perforaciones
    const GAP = 16;
    const TOP = 58, FOOTER = 118;
    const cw = PW + RAIL * 2;
    const ch = TOP + PH * 4 + GAP * 3 + FOOTER;

    const c = document.createElement('canvas');
    c.width  = cw;
    c.height = ch;
    const ctx = c.getContext('2d');

    // Fondo de celuloide con leve gradiente lateral
    const bg = ctx.createLinearGradient(0, 0, cw, 0);
    bg.addColorStop(0,   '#0B0907');
    bg.addColorStop(0.5, '#12100C');
    bg.addColorStop(1,   '#0B0907');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    // Perforaciones de celuloide a lo largo de toda la tira
    const phW = 20, phH = 14, phGap = 34, phR = 4;
    ctx.fillStyle = 'rgba(245, 230, 211, 0.14)';
    for (let y = 26; y < ch - 26 - phH; y += phGap) {
        roundedRectPath(ctx, (RAIL - phW) / 2, y, phW, phH, phR);
        ctx.fill();
        roundedRectPath(ctx, cw - RAIL + (RAIL - phW) / 2, y, phW, phH, phR);
        ctx.fill();
    }

    // Marca superior estilo "edge print" de película
    ctx.fillStyle = 'rgba(201, 169, 110, 0.55)';
    ctx.font = '300 15px "Outfit", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('P H O T O  B O O T H', cw / 2, TOP / 2 + 6);

    // Fotos con crop centrado (sin estirar) y borde fino
    for (let i = 0; i < frames.length; i++) {
        const img = await loadImage(frames[i]);
        const y = TOP + i * (PH + GAP);
        drawImageCover(ctx, img, RAIL, y, PW, PH);
        ctx.strokeStyle = 'rgba(245, 230, 211, 0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(RAIL + 0.5, y + 0.5, PW - 1, PH - 1);
    }

    // Footer — ornamento + nombres + fecha
    const oy = ch - FOOTER + 30;
    ctx.strokeStyle = 'rgba(201, 169, 110, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cw / 2 - 70, oy); ctx.lineTo(cw / 2 - 16, oy);
    ctx.moveTo(cw / 2 + 16, oy); ctx.lineTo(cw / 2 + 70, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cw / 2,     oy - 6);
    ctx.lineTo(cw / 2 + 7, oy);
    ctx.lineTo(cw / 2,     oy + 6);
    ctx.lineTo(cw / 2 - 7, oy);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#C9A96E';
    ctx.font = '400 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('Angel & Clara', cw / 2, oy + 46);
    ctx.fillStyle = 'rgba(245, 230, 211, 0.45)';
    ctx.font = '300 14px "Outfit", system-ui, sans-serif';
    ctx.fillText('16 · 07 · 2026', cw / 2, oy + 72);

    return c.toDataURL('image/png');
}

/* ==========================================================================
   COMPOSICIÓN — DÍPTICO (2 fotos lado a lado)
   ========================================================================== */
async function composeDiptych(frames) {
    const PW = 640, PH = 480;       // slots 4:3 — sin distorsión
    const PAD = 30, GAP = 18;
    const FOOTER = 72;
    const cw = PW * 2 + GAP + PAD * 2;
    const ch = PAD + PH + FOOTER;

    const c = document.createElement('canvas');
    c.width  = cw;
    c.height = ch;
    const ctx = c.getContext('2d');

    // Fondo crema (paspartú)
    ctx.fillStyle = '#F5E6D3';
    ctx.fillRect(0, 0, cw, ch);

    // Fotos con crop centrado (sin estirar) y borde fino
    for (let i = 0; i < frames.length; i++) {
        const img = await loadImage(frames[i]);
        const x = PAD + i * (PW + GAP);
        drawImageCover(ctx, img, x, PAD, PW, PH);
        ctx.strokeStyle = 'rgba(80, 60, 40, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, PAD + 0.5, PW - 1, PH - 1);
    }

    // Texto al pie
    ctx.fillStyle = 'rgba(80, 60, 40, 0.6)';
    ctx.font = '400 22px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Angel & Clara · 16 . 07 . 2026', cw / 2, ch - 26);

    return c.toDataURL('image/png');
}

/* ==========================================================================
   SECUENCIA DE CAPTURA
   ========================================================================== */
const captureBtn = document.getElementById('capture');

captureBtn?.addEventListener('click', async () => {
    if (state.isCapturing) return;
    state.isCapturing  = true;
    state.capturedFrames = [];
    captureBtn.disabled = true;

    const total = PHOTO_COUNTS[state.mode] || 1;

    for (let i = 1; i <= total; i++) {
        setPhotoCounter(i, total);
        await showCountdown();
        triggerFlash();

        // Solo aplicamos marco de usuario en modo Retrato
        const frame = captureFrame(state.mode === 'retrato');
        if (frame) state.capturedFrames.push(frame);

        if (i < total) await delay(1400);
    }

    setPhotoCounter(0, 0);

    // Componer imagen final según modo
    if (state.mode === 'rollo' && state.capturedFrames.length === 4) {
        state.photoDataUrl = await composeRollo(state.capturedFrames);
    } else if (state.mode === 'pareja' && state.capturedFrames.length >= 2) {
        state.photoDataUrl = await composeDiptych(state.capturedFrames);
    } else {
        state.photoDataUrl = state.capturedFrames[0] || null;
    }

    state.isCapturing  = false;
    captureBtn.disabled = false;

    if (state.photoDataUrl) {
        // El wrapper del resultado se adapta al modo (paspartú vs. celuloide)
        const wrapper = document.querySelector('.result-preview-wrapper');
        if (wrapper) {
            wrapper.classList.remove('mode-retrato', 'mode-pareja', 'mode-rollo');
            wrapper.classList.add(`mode-${state.mode}`);
        }
        document.getElementById('result-image').src = state.photoDataUrl;
        navigateTo('result');
    } else {
        showToast('Error al capturar la fotografía.', 'error');
    }
});

/* ==========================================================================
   PANTALLA DE RESULTADO
   ========================================================================== */
function downloadPhoto() {
    if (!state.photoDataUrl) return false;
    const a = document.createElement('a');
    a.href     = state.photoDataUrl;
    a.download = `Angel_Clara_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
}

document.getElementById('btn-download')?.addEventListener('click', () => {
    if (downloadPhoto()) showToast('Foto guardada en tu dispositivo.', 'success');
});

document.getElementById('btn-save-send')?.addEventListener('click', () => {
    const modal = document.getElementById('email-modal');
    if (modal) modal.style.display = 'flex';
});

document.getElementById('btn-retake-result')?.addEventListener('click', () => {
    state.photoDataUrl   = null;
    state.capturedFrames = [];
    navigateTo('menu');
});

/* ==========================================================================
   MODAL — GUARDAR & ENVIAR
   ========================================================================== */
document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    document.getElementById('email-modal').style.display = 'none';
});

document.getElementById('btn-send-email')?.addEventListener('click', () => {
    const input   = document.getElementById('email-input');
    const email   = input?.value?.trim();
    const status  = document.getElementById('email-status');
    const btnSend = document.getElementById('btn-send-email');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Ingresa un correo electrónico válido.', 'error');
        return;
    }

    // Descarga inmediata en el dispositivo
    downloadPhoto();

    if (status)  status.textContent = 'Enviando...';
    if (btnSend) btnSend.disabled = true;

    // Simular llamada al API de email
    setTimeout(() => {
        if (status)  status.textContent = '';
        if (btnSend) btnSend.disabled = false;
        if (input)   input.value = '';
        document.getElementById('email-modal').style.display = 'none';
        showToast('¡Foto guardada y correo enviado!', 'success');
    }, 1600);
});

/* ==========================================================================
   INIT
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => navigateTo('landing'));
