/**
 * app.js — Matamoro's Wedding Photo Booth
 */

/* ==========================================================================
   ESTADO GLOBAL
   ========================================================================== */
const state = {
    mode: null,
    filter: 'color',
    stream: null,
    photoDataUrl: null,
    capturedFrames: [],
    isCapturing: false,
    lang: 'es'
};

const PHOTO_COUNTS = { retrato: 1, pareja: 2, rollo: 4 };

// Aspecto (ancho/alto) del recorte capturado. Todos los modos usan 4:3 para
// que cada foto encaje sin distorsión en las celdas de la tira de película.
// La guía de encuadre en pantalla refleja exactamente esta zona (WYSIWYG).
const MODE_ASPECT  = { retrato: 4 / 3, pareja: 4 / 3, rollo: 4 / 3 };

// Calidad JPEG para todas las salidas (visualmente sin pérdida, mucho más ligero que PNG)
const JPEG_QUALITY = 0.92;

const screens = {
    landing: document.getElementById('landing'),
    menu:    document.getElementById('menu'),
    booth:   document.getElementById('booth'),
    result:  document.getElementById('result')
};

/* ==========================================================================
   INTERNACIONALIZACIÓN (i18n)
   ========================================================================== */
const TRANSLATIONS = {
    es: {
        // Landing
        'landing.subtitle1':    'Un momento capturado,',
        'landing.subtitle2':    'una memoria eterna',
        'landing.cta':          'Comenzar Experiencia',
        'landing.date':         '07 · 16 · 26',
        // Menu
        'menu.title':           'Sesión',
        'menu.retrato':         'Retrato',
        'menu.retrato.desc':    'El instante perfecto',
        'menu.diptico':         'Díptico',
        'menu.diptico.desc':    'Dos fotos, un recuerdo',
        'menu.rollo':           'Rollo',
        'menu.rollo.desc':      'Tira clásica de cuatro',
        'menu.continue':        'Continuar a la Cámara',
        'menu.nomode':          'Selecciona el tipo de sesión primero.',
        // Booth
        'booth.retry':          'Reintentar',
        'booth.cam.title':      'No pudimos acceder a la cámara',
        'booth.cam.text':       'Revisa que diste permiso de cámara en tu navegador.',
        'booth.cam.denied':     'Permiso de cámara denegado. Actívalo en los ajustes de tu navegador y reintenta.',
        'booth.cam.notfound':   'No se encontró ninguna cámara en este dispositivo.',
        'booth.cam.generic':    'No se pudo acceder a la cámara. Revisa los permisos y reintenta.',
        'booth.cam.nosupport':  'Tu navegador no soporta el acceso a la cámara. Prueba con Safari o Chrome actualizado.',
        'booth.settings':       'Ajustes',
        'booth.filters':        'Filtros',
        // Result
        'result.title':         'El Resultado',
        'result.subtitle':      'Tu momento ha sido capturado',
        'result.download':      'Descargar',
        'result.email':         'Enviar por Correo',
        'result.retake':        'Nueva Sesión',
        'result.saved':         'Foto guardada en tu dispositivo.',
        'result.error':         'Error al capturar la fotografía.',
        // Modal
        'modal.title':          'Guardar Foto',
        'modal.desc':           'Tu foto se guardará ahora en tu dispositivo. El envío por correo estará disponible muy pronto — déjanos tu correo si quieres recibirla.',
        'modal.placeholder':    'tu@correo.com',
        'modal.send':           'Guardar Foto',
        'modal.invalid':        'Ingresa un correo electrónico válido.',
        'modal.sending':        'Guardando...',
        'modal.success':        '¡Foto guardada en tu dispositivo!',
        // iOS Install
        'pwa.ios.title':        'Experiencia completa',
        'pwa.ios.text':         'Pulsa <strong>Compartir</strong> <span class="pwa-share-icon">⬆</span> y elige <strong>"Añadir a pantalla de inicio"</strong> para usar sin barras de navegación.',
        'pwa.ios.dismiss':      'Entendido'
    },
    en: {
        // Landing
        'landing.subtitle1':    'A moment captured,',
        'landing.subtitle2':    'a memory forever',
        'landing.cta':          'Start Experience',
        'landing.date':         '07 · 16 · 26',
        // Menu
        'menu.title':           'Session',
        'menu.retrato':         'Portrait',
        'menu.retrato.desc':    'The perfect moment',
        'menu.diptico':         'Diptych',
        'menu.diptico.desc':    'Two photos, one memory',
        'menu.rollo':           'Film Roll',
        'menu.rollo.desc':      'Classic strip of four',
        'menu.continue':        'Continue to Camera',
        'menu.nomode':          'Select the session type first.',
        // Booth
        'booth.retry':          'Retry',
        'booth.cam.title':      'We couldn\'t access the camera',
        'booth.cam.text':       'Make sure you granted camera permissions in your browser.',
        'booth.cam.denied':     'Camera permission denied. Enable it in your browser settings and try again.',
        'booth.cam.notfound':   'No camera found on this device.',
        'booth.cam.generic':    'Could not access the camera. Check permissions and try again.',
        'booth.cam.nosupport':  'Your browser doesn\'t support camera access. Try an updated Safari or Chrome.',
        'booth.settings':       'Settings',
        'booth.filters':        'Filters',
        // Result
        'result.title':         'The Result',
        'result.subtitle':      'Your moment has been captured',
        'result.download':      'Download',
        'result.email':         'Send by Email',
        'result.retake':        'New Session',
        'result.saved':         'Photo saved to your device.',
        'result.error':         'Error capturing the photograph.',
        // Modal
        'modal.title':          'Save Photo',
        'modal.desc':           'Your photo will be saved to your device now. Email delivery is coming very soon — leave your email if you\'d like to receive it.',
        'modal.placeholder':    'your@email.com',
        'modal.send':           'Save Photo',
        'modal.invalid':        'Please enter a valid email address.',
        'modal.sending':        'Saving...',
        'modal.success':        'Photo saved to your device!',
        // iOS Install
        'pwa.ios.title':        'Full experience',
        'pwa.ios.text':         'Tap <strong>Share</strong> <span class="pwa-share-icon">⬆</span> and choose <strong>"Add to Home Screen"</strong> to use without browser bars.',
        'pwa.ios.dismiss':      'Got it'
    }
};

// Localized mode labels — update dynamically based on lang
function getLocalizedModeLabels() {
    const t = TRANSLATIONS[state.lang] || TRANSLATIONS.es;
    return { retrato: t['menu.retrato'], pareja: t['menu.diptico'], rollo: t['menu.rollo'] };
}

function t(key) {
    return (TRANSLATIONS[state.lang] || TRANSLATIONS.es)[key] || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const val = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = val;
        } else if (el.dataset.i18nHtml !== undefined) {
            el.innerHTML = val;
        } else {
            el.textContent = val;
        }
    });
    // Update active lang buttons
    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === state.lang);
        btn.setAttribute('aria-pressed', btn.dataset.lang === state.lang ? 'true' : 'false');
    });
    // Update html lang attribute
    document.documentElement.lang = state.lang;
    // Update mode badge if booth is active
    const badge = document.getElementById('current-mode-display');
    if (badge && state.mode) {
        badge.textContent = getLocalizedModeLabels()[state.mode] || '';
    }
}

function changeLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    state.lang = lang;
    try { localStorage.setItem('pb-lang', lang); } catch (_) {}
    applyTranslations();
}

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
let particlesReady = false;          // estado creado una sola vez (canvas, listener, partículas)
let particlesWidth = 0, particlesHeight = 0;
const particles = [];

function resizeParticles() {
    if (!canvasParticles) return;
    particlesWidth  = canvasParticles.width  = window.innerWidth;
    particlesHeight = canvasParticles.height = window.innerHeight;
}

function drawParticles(ctx) {
    ctx.clearRect(0, 0, particlesWidth, particlesHeight);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > particlesWidth)  p.vx *= -1;
        if (p.y < 0 || p.y > particlesHeight) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.fill();
    });
    particlesAnimationId = requestAnimationFrame(() => drawParticles(ctx));
}

// Inicializa una sola vez (listener + partículas) y reanuda el bucle en cada visita.
function initParticles() {
    if (!canvasParticles) return;
    const ctx = canvasParticles.getContext('2d');

    if (!particlesReady) {
        window.addEventListener('resize', resizeParticles);
        resizeParticles();
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * particlesWidth,
                y: Math.random() * particlesHeight,
                r: Math.random() * 1.5 + 0.4,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                a: Math.random() * 0.6 + 0.2
            });
        }
        particlesReady = true;
    }

    if (particlesAnimationId === null) drawParticles(ctx);   // evita bucles duplicados
}

function stopParticles() {
    if (particlesAnimationId !== null) {
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
        if (badge) badge.textContent = getLocalizedModeLabels()[state.mode] || '';
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
        showToast(t('menu.nomode'), 'warning');
        return;
    }
    navigateTo('booth');
});

/* ==========================================================================
   CÁMARA
   ========================================================================== */
const video = document.getElementById('player');

async function startCamera() {
    hideCameraError();

    if (!navigator.mediaDevices?.getUserMedia) {
        showCameraError(t('booth.cam.nosupport'));
        return;
    }

    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            // Pedimos la mayor resolución disponible — el recorte usa la real
            video: { facingMode: 'user', width: { ideal: 2560 }, height: { ideal: 1440 } },
            audio: false
        });
        if (video) {
            video.srcObject = state.stream;
            video.addEventListener('loadedmetadata', () => {
                applyVideoFilter();
                updateFrameGuide();
            }, { once: true });
        }
    } catch (err) {
        console.error('Camera error:', err);
        const msg = (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError'))
            ? t('booth.cam.denied')
            : (err && err.name === 'NotFoundError')
                ? t('booth.cam.notfound')
                : t('booth.cam.generic');
        showCameraError(msg);
    }
}

function stopCamera() {
    state.stream?.getTracks().forEach(t => t.stop());
    state.stream = null;
    if (video) video.srcObject = null;
}

/* ── Overlay de error de cámara ─────────────────────────────────────────── */
function showCameraError(msg) {
    const el  = document.getElementById('camera-error');
    const txt = document.getElementById('camera-error-text');
    if (txt && msg) txt.textContent = msg;
    if (el) el.style.display = 'flex';
}

function hideCameraError() {
    const el = document.getElementById('camera-error');
    if (el) el.style.display = 'none';
}

document.getElementById('btn-retry-camera')?.addEventListener('click', () => startCamera());

/* ── Guía de encuadre — refleja en pantalla la zona que se capturará ────── */
const frameGuide = document.getElementById('frame-guide');

function updateFrameGuide() {
    if (!frameGuide || !video || !video.videoWidth) return;
    if (!screens.booth?.classList.contains('active')) return;

    const vw = video.videoWidth,  vh = video.videoHeight;
    const ew = video.clientWidth, eh = video.clientHeight;
    if (!ew || !eh) return;

    // object-fit: cover → el video se escala para llenar el viewport
    const scale = Math.max(ew / vw, eh / vh);
    const ta = MODE_ASPECT[state.mode] || (vw / vh);

    // Recorte centrado del video al aspecto del modo
    let sw, sh;
    if (vw / vh > ta) { sh = vh; sw = vh * ta; }
    else              { sw = vw; sh = vw / ta; }

    frameGuide.style.width   = (sw * scale) + 'px';
    frameGuide.style.height  = (sh * scale) + 'px';
    frameGuide.style.opacity = '1';
}

window.addEventListener('resize', updateFrameGuide);

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

// Cerrar con la tecla Escape el overlay que esté abierto (modal de correo o ajustes)
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('email-modal');
    if (modal && modal.style.display === 'flex') { closeEmailModal(); return; }
    if (settingsSheet && settingsSheet.classList.contains('open')) closeSettings();
});

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

/* ── Motor de filtros por color-matrix ──────────────────────────────────────
   Aplicamos los filtros en la imagen capturada con matrices de color en lugar
   de ctx.filter, que tiene soporte irregular en Safari/iOS. Así la foto SIEMPRE
   sale con el filtro que el invitado eligió, en cualquier navegador.
   Cada matriz es [r,g,b,offset] × 3 filas (12 valores). Trabaja en 0–255.        */
const IDENTITY_M = [1,0,0,0, 0,1,0,0, 0,0,1,0];

function mulMatrix(A, B) {           // aplica B y luego A  (resultado = A·B)
    const R = new Array(12);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            R[i*4+j] = A[i*4]*B[j] + A[i*4+1]*B[4+j] + A[i*4+2]*B[8+j];
        }
        R[i*4+3] = A[i*4]*B[3] + A[i*4+1]*B[7] + A[i*4+2]*B[11] + A[i*4+3];
    }
    return R;
}
function blendMatrix(a, M) {         // mezcla identidad·(1-a) + M·a
    return M.map((v, i) => IDENTITY_M[i] * (1 - a) + v * a);
}
function grayscaleM(a) {
    const L = [0.2126, 0.7152, 0.0722, 0];
    return blendMatrix(a, [...L, ...L, ...L]);
}
function sepiaM(a) {
    return blendMatrix(a, [
        0.393, 0.769, 0.189, 0,
        0.349, 0.686, 0.168, 0,
        0.272, 0.534, 0.131, 0
    ]);
}
function saturateM(s) {
    return [
        0.213 + 0.787*s, 0.715 - 0.715*s, 0.072 - 0.072*s, 0,
        0.213 - 0.213*s, 0.715 + 0.285*s, 0.072 - 0.072*s, 0,
        0.213 - 0.213*s, 0.715 - 0.715*s, 0.072 + 0.928*s, 0
    ];
}
function hueRotateM(deg) {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [
        0.213 + c*0.787 - s*0.213, 0.715 - c*0.715 - s*0.715, 0.072 - c*0.072 + s*0.928, 0,
        0.213 - c*0.213 + s*0.143, 0.715 + c*0.285 + s*0.140, 0.072 - c*0.072 - s*0.283, 0,
        0.213 - c*0.213 - s*0.787, 0.715 - c*0.715 + s*0.715, 0.072 + c*0.928 + s*0.072, 0
    ];
}
function contrastM(c) {
    const o = (0.5 - 0.5*c) * 255;
    return [c,0,0,o, 0,c,0,o, 0,0,c,o];
}

const FILTER_MATRICES = {
    bw:      grayscaleM(1),
    sepia:   sepiaM(1),
    vintage: mulMatrix(saturateM(1.2), mulMatrix(contrastM(1.2), sepiaM(0.5))),
    warm:    mulMatrix(saturateM(1.5), mulMatrix(hueRotateM(-30), sepiaM(0.3))),
    cool:    mulMatrix(saturateM(1.2), hueRotateM(180))
};

function applyColorMatrix(imageData, m) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        d[i]   = Math.min(255, Math.max(0, m[0]*r  + m[1]*g  + m[2]*b  + m[3]));
        d[i+1] = Math.min(255, Math.max(0, m[4]*r  + m[5]*g  + m[6]*b  + m[7]));
        d[i+2] = Math.min(255, Math.max(0, m[8]*r  + m[9]*g  + m[10]*b + m[11]));
    }
}

// Captura un frame del video recortado al aspecto del modo (mismo encuadre que
// la guía en pantalla) y aplica espejo + filtro. Devuelve un JPEG de alta calidad.
function captureFrame() {
    const canvas = document.getElementById('snapshot');
    if (!canvas || !video || !video.videoWidth) return null;

    const vw = video.videoWidth, vh = video.videoHeight;
    const ta = MODE_ASPECT[state.mode] || (vw / vh);

    // Recorte centrado al aspecto objetivo, a resolución completa
    let sw, sh, sx, sy;
    if (vw / vh > ta) { sh = vh; sw = Math.round(vh * ta); sx = Math.round((vw - sw) / 2); sy = 0; }
    else              { sw = vw; sh = Math.round(vw / ta); sx = 0; sy = Math.round((vh - sh) / 2); }

    canvas.width  = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');

    // Volteo horizontal — el video tiene scaleX(-1) en CSS, así que reproducimos eso
    ctx.save();
    ctx.translate(sw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.restore();

    // Filtro determinista sobre los pixeles (sin depender de ctx.filter)
    const m = FILTER_MATRICES[state.filter];
    if (m) {
        const id = ctx.getImageData(0, 0, sw, sh);
        applyColorMatrix(id, m);
        ctx.putImageData(id, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
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
   COMPOSICIÓN — TIRA DE PELÍCULA (1, 2 o 4 fotos)
   Todos los modos usan este estilo de celuloide; la altura se adapta al
   número de fotos capturadas.
   ========================================================================== */
async function composeFilmstrip(frames) {
    const n = frames.length;
    const PW = 600, PH = 450;       // slots 4:3 — coincide con cámaras frontales
    const RAIL = 46;                // rieles laterales con perforaciones
    const GAP = 16;
    const TOP = 58, FOOTER = 150;
    const cw = PW + RAIL * 2;
    const ch = TOP + PH * n + GAP * (n - 1) + FOOTER;

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

    // Marca superior — título del evento
    ctx.fillStyle = 'rgba(201, 169, 110, 0.55)';
    ctx.font = '400 17px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Matamoro\'s Wedding', cw / 2, TOP / 2 + 6);

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

    // Título principal del evento
    ctx.fillStyle = '#C9A96E';
    ctx.font = '400 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('Matamoro\'s Wedding', cw / 2, oy + 46);
    // Subtítulo — nombres de los novios
    ctx.fillStyle = 'rgba(245, 230, 211, 0.7)';
    ctx.font = 'italic 400 21px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('Angel & Clara', cw / 2, oy + 74);
    // Fecha
    ctx.fillStyle = 'rgba(245, 230, 211, 0.45)';
    ctx.font = '300 14px "Outfit", system-ui, sans-serif';
    ctx.fillText('07 · 16 · 2026', cw / 2, oy + 98);

    return c.toDataURL('image/jpeg', JPEG_QUALITY);
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

        const frame = captureFrame();
        if (frame) state.capturedFrames.push(frame);

        if (i < total) await delay(1400);
    }

    setPhotoCounter(0, 0);

    // Tira de película para todos los modos (1, 2 o 4 fotos)
    state.photoDataUrl = state.capturedFrames.length
        ? await composeFilmstrip(state.capturedFrames)
        : null;

    state.isCapturing  = false;
    captureBtn.disabled = false;

    if (state.photoDataUrl) {
        // Todos los modos se muestran como tira de película (sin paspartú)
        const wrapper = document.querySelector('.result-preview-wrapper');
        if (wrapper) wrapper.classList.add('mode-rollo');
        document.getElementById('result-image').src = state.photoDataUrl;
        navigateTo('result');
    } else {
        showToast(t('result.error'), 'error');
    }
});

/* ==========================================================================
   PANTALLA DE RESULTADO
   ========================================================================== */
// Convierte un data URL a Blob de forma síncrona (preserva el gesto del usuario
// que necesita navigator.share en iOS)
function dataURLtoBlob(dataUrl) {
    const [head, b64] = dataUrl.split(',');
    const mime = (head.match(/:(.*?);/) || [, 'image/jpeg'])[1];
    const bin  = atob(b64);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// Guarda la foto. En iOS/Android usa el menú nativo de compartir (permite
// "Guardar en Fotos"); en escritorio cae a una descarga clásica.
// Devuelve 'shared' | 'downloaded' | false
async function savePhoto() {
    if (!state.photoDataUrl) return false;
    const blob = dataURLtoBlob(state.photoDataUrl);
    const file = new File([blob], `Angel_Clara_${Date.now()}.jpg`, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'Angel & Clara' });
            return 'shared';
        } catch (err) {
            if (err && err.name === 'AbortError') return false; // el usuario canceló
            // cualquier otro error → caemos a la descarga clásica
        }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
}

document.getElementById('btn-download')?.addEventListener('click', async () => {
    const result = await savePhoto();
    if (result === 'downloaded') showToast(t('result.saved'), 'success');
});

// Recuerda el elemento que abrió el modal para devolverle el foco al cerrar
let lastFocusedBeforeModal = null;

function openEmailModal() {
    const modal = document.getElementById('email-modal');
    if (!modal) return;
    lastFocusedBeforeModal = document.activeElement;
    modal.style.display = 'flex';
    const input = document.getElementById('email-input');
    if (input) requestAnimationFrame(() => input.focus());
}

function closeEmailModal() {
    const modal = document.getElementById('email-modal');
    if (!modal) return;
    modal.style.display = 'none';
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
        lastFocusedBeforeModal.focus();
        lastFocusedBeforeModal = null;
    }
}

document.getElementById('btn-save-send')?.addEventListener('click', openEmailModal);

// Cerrar el modal al tocar el fondo oscuro (fuera de la tarjeta)
document.getElementById('email-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEmailModal();
});

document.getElementById('btn-retake-result')?.addEventListener('click', () => {
    state.photoDataUrl   = null;
    state.capturedFrames = [];
    navigateTo('menu');
});

/* ==========================================================================
   MODAL — GUARDAR & ENVIAR
   ========================================================================== */
document.getElementById('btn-close-modal')?.addEventListener('click', closeEmailModal);

document.getElementById('btn-send-email')?.addEventListener('click', () => {
    const input   = document.getElementById('email-input');
    const email   = input?.value?.trim();
    const status  = document.getElementById('email-status');
    const btnSend = document.getElementById('btn-send-email');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast(t('modal.invalid'), 'error');
        return;
    }

    // Guarda inmediatamente en el dispositivo (Fase 2 conectará el envío real)
    savePhoto();

    if (status)  status.textContent = t('modal.sending');
    if (btnSend) btnSend.disabled = true;

    // Simular llamada al API de email
    setTimeout(() => {
        if (status)  status.textContent = '';
        if (btnSend) btnSend.disabled = false;
        if (input)   input.value = '';
        closeEmailModal();
        showToast(t('modal.success'), 'success');
    }, 1600);
});

/* ==========================================================================
   SELECTOR DE IDIOMA
   ========================================================================== */
document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => changeLanguage(btn.dataset.lang));
});

/* ==========================================================================
   iOS PWA INSTALL BANNER
   ========================================================================== */
function showIOSInstallBanner() {
    const banner = document.getElementById('pwa-ios-banner');
    if (!banner) return;

    // Only show on iOS Safari when NOT running as standalone PWA
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS || isStandalone()) {
        banner.style.display = 'none';
        return;
    }

    // Check if dismissed before
    try {
        if (localStorage.getItem('pb-pwa-dismissed')) {
            banner.style.display = 'none';
            return;
        }
    } catch (_) {}

    banner.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => banner.classList.add('visible'));
    });
}

document.getElementById('btn-pwa-dismiss')?.addEventListener('click', () => {
    const banner = document.getElementById('pwa-ios-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => { banner.style.display = 'none'; }, 400);
    }
    try { localStorage.setItem('pb-pwa-dismissed', '1'); } catch (_) {}
});

/* ==========================================================================
   SERVICE WORKER
   ========================================================================== */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.warn('SW registration failed:', err);
        });
    }
}

/* ==========================================================================
   INIT
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    // Restore saved language or detect from browser
    const saved = (() => { try { return localStorage.getItem('pb-lang'); } catch (_) { return null; } })();
    const browserLang = (navigator.language || '').slice(0, 2);
    state.lang = saved || (browserLang === 'en' ? 'en' : 'es');
    applyTranslations();

    registerServiceWorker();
    navigateTo('landing');
    showIOSInstallBanner();
});
