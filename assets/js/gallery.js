/**
 * gallery.js — Galería de la boda (lee la vista pública de Supabase).
 * No expone correos: solo lee `gallery_photos` (imagen + miniatura + fecha).
 *
 * Extras: textos ES/EN, miniaturas ligeras, lightbox con navegación,
 * botón de actualizar y refresco automático cada 60 s.
 */
(function () {
    'use strict';

    const cfg     = window.PB_CONFIG || {};
    const grid    = document.getElementById('grid');
    const stateEl = document.getElementById('state');
    const countEl = document.getElementById('count');
    const btnRef  = document.getElementById('btn-refresh');

    const ready = cfg.SUPABASE_URL &&
                  cfg.SUPABASE_ANON_KEY &&
                  !cfg.SUPABASE_URL.includes('TU-PROYECTO') &&
                  !cfg.SUPABASE_ANON_KEY.includes('TU_CLAVE');

    /* ── i18n (mismo idioma que la app: localStorage 'pb-lang') ─────────── */
    const I18N = {
        es: {
            back:      '‹ Volver',
            subtitle:  'Galería de la boda · 07 · 16 · 2026',
            refresh:   'Actualizar',
            loading:   'Cargando…',
            download:  'Descargar',
            empty:     'Aún no hay fotos. ¡Sé el primero en tomarte una!',
            error:     'No se pudieron cargar las fotos. Revisa tu conexión e inténtalo de nuevo.',
            notready:  'La galería aún no está configurada.',
            photo:     'foto', photos: 'fotos',
            alt:       'Foto de la boda'
        },
        en: {
            back:      '‹ Back',
            subtitle:  'Wedding gallery · 07 · 16 · 2026',
            refresh:   'Refresh',
            loading:   'Loading…',
            download:  'Download',
            empty:     'No photos yet. Be the first to take one!',
            error:     'Could not load the photos. Check your connection and try again.',
            notready:  'The gallery is not configured yet.',
            photo:     'photo', photos: 'photos',
            alt:       'Wedding photo'
        }
    };
    const lang = (() => {
        try { const s = localStorage.getItem('pb-lang'); if (s && I18N[s]) return s; } catch (_) {}
        return (navigator.language || '').slice(0, 2) === 'en' ? 'en' : 'es';
    })();
    const t = k => (I18N[lang] || I18N.es)[k] || k;

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-g-i18n]').forEach(el => { el.textContent = t(el.dataset.gI18n); });

    /* ── Estado ──────────────────────────────────────────────────────────── */
    let photos = [];          // filas visibles [{image_path, thumb_path?, created_at}]
    let signature = null;     // firma del último render (evita redibujar sin cambios)
    let lbIndex = -1;         // foto abierta en el lightbox (-1 = cerrado)

    function showState(msg) {
        stateEl.textContent = msg || '';
        stateEl.style.display = msg ? 'block' : 'none';
    }

    function publicUrl(path) {
        return `${cfg.SUPABASE_URL}/storage/v1/object/public/${cfg.BUCKET || 'photos'}/${path}`;
    }

    /* ── Carga de datos ──────────────────────────────────────────────────── */
    const headers = { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}` };

    // fetch con límite de tiempo: si no responde, lanza un error claro en vez
    // de dejar la petición colgada indefinidamente (wifi del venue poco fiable).
    async function fetchWithTimeout(url, opts, ms) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), ms);
        try {
            return await fetch(url, { ...opts, signal: ctrl.signal });
        } catch (e) {
            if (e.name === 'AbortError') throw new Error('sin respuesta en ' + Math.round(ms / 1000) + 's (timeout)');
            throw e;
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchRows() {
        const base = `${cfg.SUPABASE_URL}/rest/v1/gallery_photos`;
        let res = await fetchWithTimeout(`${base}?select=image_path,thumb_path,created_at&order=created_at.desc`, { headers }, 15000);
        if (res.status === 400) {
            // BD sin la columna thumb_path (falta upgrade-fase2.sql) → modo básico
            res = await fetchWithTimeout(`${base}?select=image_path,created_at&order=created_at.desc`, { headers }, 15000);
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }

    function render() {
        grid.innerHTML = '';
        const n = photos.length;
        countEl.textContent = n ? `${n} ${n === 1 ? t('photo') : t('photos')}` : '';

        if (!n) { showState(t('empty')); return; }
        showState('');

        const frag = document.createDocumentFragment();
        photos.forEach((row, i) => {
            const full = publicUrl(row.image_path);
            const fig  = document.createElement('figure');

            const img = document.createElement('img');
            img.src = publicUrl(row.thumb_path || row.image_path);
            img.loading = 'lazy';
            img.alt = t('alt');
            img.addEventListener('click', () => openLightbox(i));

            const dl = document.createElement('a');
            dl.className = 'dl';
            dl.href = `${full}?download=${encodeURIComponent(row.image_path)}`;
            dl.textContent = t('download');

            fig.append(img, dl);
            frag.appendChild(fig);
        });
        grid.appendChild(frag);
    }

    async function load({ silent = false } = {}) {
        if (!ready) { showState(t('notready')); return; }
        if (!silent) { btnRef.disabled = true; if (!photos.length) showState(t('loading')); }
        try {
            const rows = await fetchRows();
            const sig = rows.length + ':' + (rows[0]?.created_at || '');
            if (sig !== signature) {
                signature = sig;
                photos = rows;
                render();
            } else if (!photos.length) {
                showState(t('empty'));
            }
        } catch (err) {
            console.error('Gallery error:', err);
            if (!silent) showState(t('error'));
        } finally {
            if (!silent) btnRef.disabled = false;
        }
    }

    /* ── Lightbox ────────────────────────────────────────────────────────── */
    const lightbox = document.getElementById('lightbox');
    const lbImg    = document.getElementById('lb-img');
    const lbPrev   = document.getElementById('lb-prev');
    const lbNext   = document.getElementById('lb-next');
    const lbClose  = document.getElementById('lb-close');
    const lbDl     = document.getElementById('lb-download');

    function openLightbox(i) {
        if (i < 0 || i >= photos.length) return;
        lbIndex = i;
        const row  = photos[i];
        const full = publicUrl(row.image_path);
        lbImg.src = full;
        lbImg.alt = t('alt');
        lbDl.href = `${full}?download=${encodeURIComponent(row.image_path)}`;
        lbPrev.disabled = i <= 0;
        lbNext.disabled = i >= photos.length - 1;
        lightbox.classList.add('open');
        lbClose.focus();
    }

    function closeLightbox() {
        lbIndex = -1;
        lightbox.classList.remove('open');
        lbImg.src = '';
    }

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', () => openLightbox(lbIndex - 1));
    lbNext.addEventListener('click', () => openLightbox(lbIndex + 1));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

    document.addEventListener('keydown', e => {
        if (lbIndex < 0) return;
        if (e.key === 'Escape')     closeLightbox();
        if (e.key === 'ArrowLeft')  openLightbox(lbIndex - 1);
        if (e.key === 'ArrowRight') openLightbox(lbIndex + 1);
    });

    /* ── Refresco ────────────────────────────────────────────────────────── */
    btnRef.addEventListener('click', () => load());
    setInterval(() => load({ silent: true }), 60000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') load({ silent: true });
    });

    load();
})();
