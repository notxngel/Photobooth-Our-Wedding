/**
 * app.js
 * Logic for Angel & Clara's Photo Booth
 */

/* ==========================================================================
   CONFIGURACIÓN DE LA NUBE (Cloudinary)
   --------------------------------------------------------------------------
   👉 PASOS PARA ACTIVAR EL RESPALDO + QR:
      1. Crea una cuenta gratis en https://cloudinary.com
      2. En Settings → Upload, crea un "Upload preset" en modo "Unsigned".
      3. Copia tu Cloud name (Dashboard) y el nombre del preset aquí abajo.
   Mientras estos valores empiecen por "TU_", la app sigue funcionando pero
   sin subida a la nube ni QR (solo el botón Guardar). En cuanto los pegues,
   el respaldo automático y el código QR se activan solos.
   ========================================================================== */
const CLOUDINARY = {
    cloudName: 'TU_CLOUD_NAME',
    uploadPreset: 'TU_UPLOAD_PRESET'
};

function cloudConfigured() {
    return CLOUDINARY.cloudName &&
           !CLOUDINARY.cloudName.startsWith('TU_') &&
           CLOUDINARY.uploadPreset &&
           !CLOUDINARY.uploadPreset.startsWith('TU_');
}

/* ==========================================================================
   ESTADO
   ========================================================================== */
const state = {
    mode: null,
    filter: 'color',
    frame: 'classic',
    stream: null,
    photoDataUrl: null,   // JPEG dataURL para previsualización/descarga
    photoBlob: null,      // Blob JPEG para subir a la nube
    shareUrl: null,       // URL pública devuelta por la nube (para el QR)
    uploading: false,
    isCapturing: false
};

const screens = {
    landing: document.getElementById('landing'),
    menu: document.getElementById('menu'),
    booth: document.getElementById('booth'),
    result: document.getElementById('result')
};

// Canvas reutilizable para capturar (evita crear uno por foto -> sostenible 5h)
const grabCanvas = document.createElement('canvas');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* ==========================================================================
   DEFINICIÓN DE FILTROS
   --------------------------------------------------------------------------
   `css`   -> filtro para la previsualización en vivo (GPU, fluido).
   El "horneado" en la foto final se hace por píxeles en applyFilter()
   porque ctx.filter NO es fiable en Safari/iPadOS.
   ========================================================================== */
const FILTERS = {
    color:   'none',
    bw:      'grayscale(1)',
    sepia:   'sepia(1)',
    vintage: 'sepia(0.5) contrast(1.1) saturate(1.15)',
    warm:    'brightness(1.04) saturate(1.15) sepia(0.18)',
    cool:    'saturate(1.12) hue-rotate(190deg)'
};

// Aplica el filtro directamente sobre los píxeles (Uint8ClampedArray rgba)
function applyFilter(data, filter) {
    if (!filter || filter === 'color') return;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let nr, ng, nb;
        switch (filter) {
            case 'bw': {
                const v = 0.299 * r + 0.587 * g + 0.114 * b;
                nr = ng = nb = v;
                break;
            }
            case 'sepia': {
                nr = 0.393 * r + 0.769 * g + 0.189 * b;
                ng = 0.349 * r + 0.686 * g + 0.168 * b;
                nb = 0.272 * r + 0.534 * g + 0.131 * b;
                break;
            }
            case 'vintage': {
                const sr = 0.393 * r + 0.769 * g + 0.189 * b;
                const sg = 0.349 * r + 0.686 * g + 0.168 * b;
                const sb = 0.272 * r + 0.534 * g + 0.131 * b;
                nr = r * 0.5 + sr * 0.5;
                ng = g * 0.5 + sg * 0.5;
                nb = b * 0.5 + sb * 0.5;
                // contraste suave
                nr = (nr - 128) * 1.1 + 128;
                ng = (ng - 128) * 1.1 + 128;
                nb = (nb - 128) * 1.1 + 128;
                break;
            }
            case 'warm': {
                nr = r * 1.12 + 10;
                ng = g * 1.02;
                nb = b * 0.88;
                break;
            }
            case 'cool': {
                nr = r * 0.88;
                ng = g * 1.0;
                nb = b * 1.12 + 10;
                break;
            }
            default:
                nr = r; ng = g; nb = b;
        }
        data[i]     = nr < 0 ? 0 : nr > 255 ? 255 : nr;
        data[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
        data[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
    }
}

/* ==========================================================================
   PARTICLES SYSTEM (Landing Screen)
   ========================================================================== */
const canvasParticles = document.getElementById('particles-canvas');
let particlesAnimationId = null;
let particlesInited = false;       // evita registrar listeners/loops duplicados

function initParticles() {
    if (!canvasParticles) return;
    const ctx = canvasParticles.getContext('2d');
    let width, height;
    let particles = [];

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvasParticles.width = width;
        canvasParticles.height = height;
    }

    function buildParticles() {
        particles = [];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.5 + 0.5,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                alpha: Math.random() * 0.6 + 0.2
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx = -p.vx;
            if (p.y < 0 || p.y > height) p.vy = -p.vy;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.fill();
        });
        particlesAnimationId = requestAnimationFrame(draw);
    }

    // El listener de resize se registra UNA sola vez en toda la sesión.
    if (!particlesInited) {
        window.addEventListener('resize', resize);
        particlesInited = true;
    }

    resize();
    buildParticles();
    if (particlesAnimationId) cancelAnimationFrame(particlesAnimationId);
    draw();
}

function stopParticles() {
    if (particlesAnimationId) {
        cancelAnimationFrame(particlesAnimationId);
        particlesAnimationId = null;
    }
}

/* ==========================================================================
   TOAST NOTIFICATION SYSTEM
   ========================================================================== */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    if (type === 'error')   toast.style.background = 'rgba(220, 53, 69, 0.95)';
    if (type === 'warning') toast.style.background = 'rgba(200, 150, 0, 0.95)';
    if (type === 'success') toast.style.background = 'rgba(40, 120, 70, 0.95)';
    if (type !== 'info')    toast.style.color = '#fff';

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ==========================================================================
   NAVIGATION FLOW
   ========================================================================== */
function navigateTo(screenId) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
    }

    if (screenId === 'landing') {
        initParticles();
    } else {
        stopParticles();
    }

    if (screenId === 'booth') {
        startCamera();
        const modeDisplay = document.getElementById('current-mode-display');
        if (modeDisplay) {
            modeDisplay.textContent =
                state.mode === 'individual' ? 'Retrato' :
                state.mode === 'couple' ? 'Pareja' : 'Grupo';
        }
    } else {
        if (state.stream) {
            stopCamera();
        }
    }
}

// Global Nav Bindings
document.getElementById('btn-start')?.addEventListener('click', () => navigateTo('menu'));
document.getElementById('btn-back-menu')?.addEventListener('click', () => navigateTo('landing'));
document.getElementById('btn-back-booth')?.addEventListener('click', () => navigateTo('menu'));

/* ==========================================================================
   MENU SCREEN
   ========================================================================== */
const modeCards = document.querySelectorAll('.mode-card');
function selectModeCard(card) {
    modeCards.forEach(c => {
        c.setAttribute('aria-checked', 'false');
        c.classList.remove('selected');
        c.style.borderColor = '';
    });
    card.setAttribute('aria-checked', 'true');
    card.classList.add('selected');
    state.mode = card.dataset.mode;
}

modeCards.forEach(card => {
    card.addEventListener('click', () => selectModeCard(card));
    // Accesibilidad real por teclado (Enter / Espacio)
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectModeCard(card);
        }
    });
});

document.getElementById('btn-start-camera')?.addEventListener('click', () => {
    if (!state.mode) {
        showToast('Por favor, selecciona el tipo de fotografía primero.', 'warning');
        return;
    }
    navigateTo('booth');
});

/* ==========================================================================
   BOOTH (CAMERA & FILTERS)
   ========================================================================== */
const video = document.getElementById('player');
const flashEl = document.getElementById('flash');
const countdownEl = document.getElementById('countdown');
const photoCounterEl = document.getElementById('photo-counter');

async function startCamera() {
    try {
        // Pedimos la MÁXIMA resolución posible. Safari entregará lo que la
        // cámara frontal del iPad permita (normalmente hasta 1080p).
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width:  { ideal: 3840 },
                height: { ideal: 2160 }
            },
            audio: false
        });
        if (video) {
            video.srcObject = state.stream;
        }
        // Diagnóstico: resolución real obtenida (útil al probar en el iPad).
        const track = state.stream.getVideoTracks()[0];
        if (track) {
            const s = track.getSettings();
            console.info(`📷 Resolución de captura real: ${s.width}×${s.height}`);
        }
    } catch (err) {
        showToast('No se pudo acceder a la cámara. Revisa los permisos.', 'error');
        console.error('Camera Access Error:', err);
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    if (video) video.srcObject = null;
}

function updateVideoFilter() {
    if (!video) return;
    video.style.filter = FILTERS[state.filter] || 'none';
}

// Filter and Frame Listeners
document.querySelectorAll('.options-scroll .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        const frame = btn.dataset.frame;

        if (filter) {
            document.querySelectorAll('[data-filter]').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            state.filter = filter;
            updateVideoFilter();
        }

        if (frame) {
            document.querySelectorAll('[data-frame]').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            state.frame = frame;
        }
    });
});

/* ==========================================================================
   CAPTURA DE UN FOTOGRAMA (resolución nativa + espejo + filtro + marco)
   ========================================================================== */
function drawFrameBorder(ctx, w, h, frame) {
    if (!frame || frame === 'none') return;
    let lw = 0, strokeCol = '#fff';
    // Grosor proporcional a la resolución para que se vea igual a cualquier tamaño
    const base = Math.min(w, h);
    if (frame === 'classic') { lw = base * 0.045; strokeCol = '#fff'; }
    if (frame === 'elegant') { lw = base * 0.020; strokeCol = '#E5D3B3'; }
    if (frame === 'minimal') { lw = base * 0.010; strokeCol = '#1A1510'; }
    if (lw > 0) {
        ctx.lineWidth = lw;
        ctx.strokeStyle = strokeCol;
        ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    }
}

// Devuelve un <canvas> con el fotograma capturado a resolución nativa.
function grabFrame() {
    const w = video.videoWidth || 1920;
    const h = video.videoHeight || 1080;
    grabCanvas.width = w;
    grabCanvas.height = h;
    const ctx = grabCanvas.getContext('2d');

    // Espejo: igual que la previsualización (#player usa scaleX(-1)),
    // así lo que el invitado ve es exactamente lo que se guarda.
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Horneamos el filtro por píxeles (funciona en Safari/iPad).
    if (state.filter !== 'color') {
        const img = ctx.getImageData(0, 0, w, h);
        applyFilter(img.data, state.filter);
        ctx.putImageData(img, 0, 0);
    }

    // Marco encima (sin filtro, sin espejo).
    drawFrameBorder(ctx, w, h, state.frame);

    // Copiamos a un canvas independiente (grabCanvas se reutiliza).
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d').drawImage(grabCanvas, 0, 0);
    return out;
}

// Compone una tira vertical de 4 fotos (modo Retrato).
function buildStrip(frames) {
    const pw = frames[0].width;
    const ph = frames[0].height;
    const targetW = Math.min(pw, 1080);
    const scale = targetW / pw;
    const sw = Math.round(pw * scale);
    const sh = Math.round(ph * scale);
    const margin = Math.round(sw * 0.05);
    const gap = Math.round(sw * 0.03);
    const footerH = Math.round(sw * 0.18);

    const stripW = sw + margin * 2;
    const stripH = margin + frames.length * sh + (frames.length - 1) * gap + footerH;

    const c = document.createElement('canvas');
    c.width = stripW;
    c.height = stripH;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#1A1510';
    ctx.fillRect(0, 0, stripW, stripH);

    let y = margin;
    frames.forEach(f => {
        ctx.drawImage(f, margin, y, sw, sh);
        y += sh + gap;
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#E5D3B3';
    ctx.font = `${Math.round(footerH * 0.34)}px 'Cormorant Garamond', Georgia, serif`;
    ctx.fillText('Angel & Clara', stripW / 2, stripH - footerH * 0.50);
    ctx.font = `${Math.round(footerH * 0.20)}px 'Outfit', Arial, sans-serif`;
    ctx.fillText('16 · 07 · 26', stripW / 2, stripH - footerH * 0.18);

    return c;
}

function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

/* ==========================================================================
   SECUENCIA DE CAPTURA
   ========================================================================== */
const captureBtn = document.getElementById('capture');

async function runCountdown() {
    if (!countdownEl) return;
    for (let c = 3; c > 0; c--) {
        countdownEl.textContent = c;
        countdownEl.classList.add('active');
        await wait(900);
        countdownEl.classList.remove('active');
        await wait(100);
    }
}

function triggerFlash() {
    if (!flashEl) return;
    flashEl.classList.remove('fade-out');
    flashEl.classList.add('active');
    setTimeout(() => {
        flashEl.classList.remove('active');
        flashEl.classList.add('fade-out');
        setTimeout(() => flashEl.classList.remove('fade-out'), 800);
    }, 100);
}

captureBtn?.addEventListener('click', async () => {
    if (state.isCapturing) return;
    if (!state.stream) {
        showToast('La cámara aún no está lista.', 'warning');
        return;
    }
    state.isCapturing = true;
    captureBtn.style.pointerEvents = 'none';
    captureBtn.style.opacity = '0.5';

    const photosToTake = state.mode === 'individual' ? 4 : 1;
    const frames = [];

    if (photoCounterEl && photosToTake > 1) {
        photoCounterEl.style.display = 'block';
    }

    for (let i = 1; i <= photosToTake; i++) {
        if (photoCounterEl && photosToTake > 1) {
            photoCounterEl.textContent = `Foto ${i} de ${photosToTake}`;
        }

        await runCountdown();
        triggerFlash();
        frames.push(grabFrame());

        if (i < photosToTake) {
            await wait(1500);
        }
    }

    if (photoCounterEl) photoCounterEl.style.display = 'none';

    // Imagen final: tira de 4 (Retrato) o foto única.
    const finalCanvas = photosToTake > 1 ? buildStrip(frames) : frames[0];

    state.photoDataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);
    state.photoBlob = await canvasToBlob(finalCanvas, 'image/jpeg', 0.92);

    state.isCapturing = false;
    captureBtn.style.pointerEvents = 'auto';
    captureBtn.style.opacity = '1';

    const resultImg = document.getElementById('result-image');
    if (resultImg && state.photoDataUrl) {
        resultImg.src = state.photoDataUrl;
    }

    // Respaldo automático en la nube (en segundo plano).
    startUpload(state.photoBlob);

    navigateTo('result');
});

/* ==========================================================================
   SUBIDA A LA NUBE
   ========================================================================== */
async function uploadToCloud(blob) {
    const fd = new FormData();
    fd.append('file', blob);
    fd.append('upload_preset', CLOUDINARY.uploadPreset);
    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`,
        { method: 'POST', body: fd }
    );
    if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
    const json = await res.json();
    return json.secure_url;
}

async function startUpload(blob) {
    state.shareUrl = null;
    if (!cloudConfigured() || !blob) return;
    state.uploading = true;
    renderQR();
    try {
        state.shareUrl = await uploadToCloud(blob);
    } catch (e) {
        console.error('Upload error:', e);
        state.shareUrl = null;
    } finally {
        state.uploading = false;
        renderQR();
    }
}

/* ==========================================================================
   RESULT SCREEN ACTIONS
   ========================================================================== */
document.getElementById('btn-download')?.addEventListener('click', () => {
    if (!state.photoDataUrl) return;
    const a = document.createElement('a');
    a.href = state.photoDataUrl;
    a.download = `Angel_Clara_Photobooth_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('¡Fotografía guardada con éxito!', 'success');
});

document.getElementById('btn-qr')?.addEventListener('click', () => {
    const modal = document.getElementById('qr-modal');
    if (modal) modal.style.display = 'flex';
    renderQR();
});

document.getElementById('btn-retake-result')?.addEventListener('click', () => {
    state.photoDataUrl = null;
    state.photoBlob = null;
    state.shareUrl = null;
    navigateTo('menu');
});

/* ==========================================================================
   MODAL QR
   ========================================================================== */
document.getElementById('btn-close-qr')?.addEventListener('click', () => {
    const modal = document.getElementById('qr-modal');
    if (modal) modal.style.display = 'none';
});

// Dibuja (o actualiza) el QR según el estado de la subida.
function renderQR() {
    const box = document.getElementById('qr-box');
    const status = document.getElementById('qr-status');
    const modal = document.getElementById('qr-modal');
    if (!box || !status) return;
    // Solo refrescamos si el modal está visible.
    if (modal && modal.style.display === 'none') return;

    box.innerHTML = '';

    if (!cloudConfigured()) {
        status.textContent = 'La nube aún no está configurada. Usa "Guardar" por ahora.';
        status.className = 'status-msg';
        return;
    }

    if (state.uploading) {
        status.textContent = 'Generando tu enlace…';
        status.className = 'status-msg';
        return;
    }

    if (!state.shareUrl) {
        status.textContent = 'No se pudo subir la foto. Revisa la conexión.';
        status.className = 'status-msg error';
        return;
    }

    // Generación del QR (librería local QRCode; si falta, servicio externo).
    if (typeof QRCode !== 'undefined') {
        new QRCode(box, {
            text: state.shareUrl,
            width: 240,
            height: 240,
            colorDark: '#1A1510',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } else {
        const img = document.createElement('img');
        img.alt = 'Código QR';
        img.width = 240;
        img.height = 240;
        img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' +
                  encodeURIComponent(state.shareUrl);
        box.appendChild(img);
    }
    status.textContent = 'Escanea con tu móvil para descargar la foto.';
    status.className = 'status-msg success';
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    updateVideoFilter();
    navigateTo('landing');
});
