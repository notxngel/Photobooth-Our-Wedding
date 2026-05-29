/**
 * app.js
 * Logic for Angel & Clara's Photo Booth
 */

const state = {
    mode: null,
    filter: 'color',
    frame: 'classic',
    stream: null,
    photoDataUrl: null,
    isCapturing: false
};

const screens = {
    landing: document.getElementById('landing'),
    menu: document.getElementById('menu'),
    booth: document.getElementById('booth'),
    result: document.getElementById('result')
};

/* ==========================================================================
   PARTICLES SYSTEM (Landing Screen)
   ========================================================================== */
const canvasParticles = document.getElementById('particles-canvas');
let particlesAnimationId = null;

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
    
    window.addEventListener('resize', resize);
    resize();

    // Create particles
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

    // Default container styling if not present in CSS
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.pointerEvents = 'none';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Basic inline styling to ensure it's robust and visible
    toast.style.margin = '8px 0';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '30px';
    toast.style.fontFamily = "'Outfit', sans-serif";
    toast.style.fontSize = '14px';
    toast.style.color = '#fff';
    toast.style.background = type === 'error' ? 'rgba(220, 53, 69, 0.9)' : 
                             type === 'warning' ? 'rgba(255, 193, 7, 0.9)' : 
                             type === 'success' ? 'rgba(40, 167, 69, 0.9)' : 'rgba(30, 30, 30, 0.9)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Remove after timeout
    setTimeout(() => {
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
        if(screen) screen.classList.remove('active');
    });
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
    }

    // Handle specific screen enter logic
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
modeCards.forEach(card => {
    card.addEventListener('click', () => {
        modeCards.forEach(c => {
            c.setAttribute('aria-checked', 'false');
            c.classList.remove('selected');
            c.style.borderColor = '';
        });

        card.setAttribute('aria-checked', 'true');
        card.classList.add('selected');
        state.mode = card.dataset.mode;
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
        state.stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
            audio: false 
        });
        if (video) {
            video.srcObject = state.stream;
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
    let cssFilter = '';
    switch(state.filter) {
        case 'bw': cssFilter = 'grayscale(100%)'; break;
        case 'sepia': cssFilter = 'sepia(100%)'; break;
        case 'vintage': cssFilter = 'sepia(50%) contrast(120%) saturate(120%)'; break;
        case 'warm': cssFilter = 'sepia(30%) hue-rotate(-30deg) saturate(150%)'; break;
        case 'cool': cssFilter = 'hue-rotate(180deg) saturate(120%)'; break;
        default: cssFilter = 'none'; break;
    }
    video.style.filter = cssFilter;
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
   CAPTURE SEQUENCE
   ========================================================================== */
const captureBtn = document.getElementById('capture');

captureBtn?.addEventListener('click', async () => {
    if (state.isCapturing) return;
    state.isCapturing = true;

    // UI disable
    captureBtn.style.pointerEvents = 'none';
    captureBtn.style.opacity = '0.5';

    // How many photos based on mode
    let photosToTake = state.mode === 'individual' ? 4 : 1;
    if (photoCounterEl && photosToTake > 1) {
        photoCounterEl.style.display = 'block';
    }
    
    // Optional basic countdown styling if missing in CSS
    if (countdownEl) {
        countdownEl.style.position = 'absolute';
        countdownEl.style.top = '50%';
        countdownEl.style.left = '50%';
        countdownEl.style.transform = 'translate(-50%, -50%)';
        countdownEl.style.fontSize = '8rem';
        countdownEl.style.color = '#fff';
        countdownEl.style.textShadow = '0 4px 20px rgba(0,0,0,0.5)';
        countdownEl.style.fontWeight = '300';
    }

    // Optional flash styling if missing
    if (flashEl) {
        flashEl.style.position = 'absolute';
        flashEl.style.inset = '0';
        flashEl.style.backgroundColor = '#fff';
        flashEl.style.opacity = '0';
        flashEl.style.display = 'none';
        flashEl.style.pointerEvents = 'none';
        flashEl.style.transition = 'opacity 0.15s ease-out';
    }

    for (let i = 1; i <= photosToTake; i++) {
        if (photoCounterEl && photosToTake > 1) {
            photoCounterEl.textContent = `Foto ${i} de ${photosToTake}`;
        }
        
        // 3-second countdown
        if (countdownEl) {
            for (let c = 3; c > 0; c--) {
                countdownEl.textContent = c;
                countdownEl.style.display = 'block';
                await new Promise(r => setTimeout(r, 1000));
            }
            countdownEl.style.display = 'none';
        }

        // Trigger Flash
        if (flashEl) {
            flashEl.style.display = 'block';
            // Force reflow
            void flashEl.offsetWidth; 
            flashEl.style.opacity = '1';
            
            setTimeout(() => { flashEl.style.opacity = '0'; }, 100);
            setTimeout(() => { flashEl.style.display = 'none'; }, 300);
        }

        // Draw snapshot
        const canvas = document.getElementById('snapshot');
        if (canvas && video) {
            canvas.width = video.videoWidth || 1920;
            canvas.height = video.videoHeight || 1080;
            const ctx = canvas.getContext('2d');
            
            // Mirror flip logic could be added if video is mirrored
            ctx.filter = video.style.filter || 'none';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Draw Frame
            if (state.frame !== 'none') {
                ctx.filter = 'none';
                let lw = 0;
                let strokeCol = '#fff';
                
                if (state.frame === 'classic') { lw = 50; strokeCol = '#fff'; }
                if (state.frame === 'elegant') { lw = 20; strokeCol = '#E5D3B3'; } // Gold-ish
                if (state.frame === 'minimal') { lw = 10; strokeCol = '#000'; }

                if (lw > 0) {
                    ctx.lineWidth = lw;
                    ctx.strokeStyle = strokeCol;
                    ctx.strokeRect(lw/2, lw/2, canvas.width - lw, canvas.height - lw);
                }
            }

            state.photoDataUrl = canvas.toDataURL('image/png', 0.9);
        }
        
        // Pause between shots if multiple
        if (i < photosToTake) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    if (photoCounterEl) photoCounterEl.style.display = 'none';
    
    // UI re-enable
    state.isCapturing = false;
    captureBtn.style.pointerEvents = 'auto';
    captureBtn.style.opacity = '1';
    
    // Transition to result
    const resultImg = document.getElementById('result-image');
    if (resultImg && state.photoDataUrl) {
        resultImg.src = state.photoDataUrl;
    }
    navigateTo('result');
});

// Retake button inside booth
document.getElementById('retake')?.addEventListener('click', () => {
    state.photoDataUrl = null;
    showToast('Sesión reiniciada', 'info');
});

/* ==========================================================================
   RESULT SCREEN ACTIONS
   ========================================================================== */
document.getElementById('btn-download')?.addEventListener('click', () => {
    if (!state.photoDataUrl) return;
    const a = document.createElement('a');
    a.href = state.photoDataUrl;
    a.download = `Angel_Clara_Photobooth_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('¡Fotografía descargada con éxito!', 'success');
});

document.getElementById('btn-email')?.addEventListener('click', () => {
    const modal = document.getElementById('email-modal');
    if (modal) modal.style.display = 'flex';
});

document.getElementById('btn-retake-result')?.addEventListener('click', () => {
    state.photoDataUrl = null;
    navigateTo('menu');
});

/* ==========================================================================
   EMAIL MODAL
   ========================================================================== */
document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('email-modal');
    if (modal) modal.style.display = 'none';
});

document.getElementById('btn-send-email')?.addEventListener('click', () => {
    const input = document.getElementById('email-input');
    const email = input?.value;
    
    if (!email || !email.includes('@')) {
        showToast('Por favor ingresa un correo electrónico válido.', 'error');
        return;
    }
    
    const status = document.getElementById('email-status');
    const btnSend = document.getElementById('btn-send-email');
    
    if (status) status.textContent = 'Enviando...';
    if (btnSend) btnSend.disabled = true;
    
    // Simulate API delay
    setTimeout(() => {
        if (status) status.textContent = '';
        if (btnSend) btnSend.disabled = false;
        if (input) input.value = '';
        
        const modal = document.getElementById('email-modal');
        if (modal) modal.style.display = 'none';
        
        showToast('¡Correo enviado con éxito! Revisa tu bandeja de entrada.', 'success');
    }, 1500);
});

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    navigateTo('landing');
});