/**
 * admin-local.js — Panel de administración LOCAL (solo en tu Mac).
 *
 * Usa la clave `service_role` (window.PB_ADMIN.SERVICE_ROLE_KEY) para listar y
 * borrar fotos SIN login ni políticas RLS: esa clave salta todos los permisos.
 * Por eso este panel:
 *   - solo se ejecuta en localhost / red local (guarda de abajo), y
 *   - lee la clave de tools/admin-local.config.js, que está en .gitignore.
 * NUNCA subas ese archivo ni abras esta página en el sitio público.
 */
(function () {
    'use strict';

    const cfg   = window.PB_CONFIG || {};
    const admin = window.PB_ADMIN  || {};
    const URL_  = cfg.SUPABASE_URL;
    const BUCKET = cfg.BUCKET || 'photos';
    const KEY   = admin.SERVICE_ROLE_KEY;

    const grid    = document.getElementById('grid');
    const stateEl = document.getElementById('state');
    const countEl = document.getElementById('count');

    function setState(msg) {
        stateEl.textContent = msg || '';
        stateEl.style.display = msg ? 'block' : 'none';
    }

    // ── Guarda: solo local ─────────────────────────────────────────────────
    const host = location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' ||
        /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    if (!isLocal) {
        setState('⛔ Este panel solo funciona en tu computadora (localhost). ' +
                 'Ábrelo con: node tools/dev-server.js → https://localhost:8443/tools/admin-local.html');
        countEl.textContent = '';
        return;
    }

    // ── Config lista ───────────────────────────────────────────────────────
    if (!URL_ || !KEY || KEY.includes('PEGA_AQUI')) {
        setState('Falta la clave. Copia tools/admin-local.config.example.js a ' +
                 'tools/admin-local.config.js y pega tu clave service_role de Supabase ' +
                 '(Project Settings → API).');
        countEl.textContent = '';
        return;
    }

    const headers = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` });
    const publicUrl = p => `${URL_}/storage/v1/object/public/${BUCKET}/${p}`;

    function setCount() {
        const n = grid.querySelectorAll('figure').length;
        countEl.textContent = n ? `${n} foto${n === 1 ? '' : 's'}` : '';
    }

    // ── Listar ─────────────────────────────────────────────────────────────
    async function loadPhotos() {
        setState('Cargando…'); grid.innerHTML = ''; countEl.textContent = '—';
        try {
            const res = await fetch(
                `${URL_}/rest/v1/photos?select=id,email,image_path,created_at&order=created_at.desc`,
                { headers: headers() }
            );
            if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 140));
            const rows = await res.json();

            countEl.textContent = `${rows.length} foto${rows.length === 1 ? '' : 's'}`;
            if (!rows.length) { setState('No hay fotos todavía.'); return; }
            setState('');

            const frag = document.createDocumentFragment();
            rows.forEach(row => frag.appendChild(renderPhoto(row)));
            grid.appendChild(frag);
        } catch (err) {
            console.error(err);
            setState('No se pudieron cargar las fotos: ' + err.message);
        }
    }

    function renderPhoto(row) {
        const fig = document.createElement('figure');

        const img = document.createElement('img');
        img.src = publicUrl(row.image_path); img.loading = 'lazy'; img.alt = 'Foto';

        const cap = document.createElement('figcaption');
        cap.textContent = `${row.email || '(sin correo)'} · ${new Date(row.created_at).toLocaleString()}`;

        const del = document.createElement('button');
        del.className = 'btn-del'; del.textContent = 'Borrar';
        del.addEventListener('click', () => deletePhoto(row, fig, del));

        fig.append(img, cap, del);
        return fig;
    }

    // ── Borrar (Storage + fila) ────────────────────────────────────────────
    async function deletePhoto(row, fig, btn) {
        if (!confirm('¿Borrar esta foto? Esta acción no se puede deshacer.')) return;
        btn.disabled = true; btn.textContent = 'Borrando…';
        fig.classList.add('deleting');
        try {
            // 1) archivo del Storage (404/400 = ya no existe → no es fatal)
            const delObj = await fetch(
                `${URL_}/storage/v1/object/${BUCKET}/${encodeURI(row.image_path)}`,
                { method: 'DELETE', headers: headers() }
            );
            if (!delObj.ok && delObj.status !== 404 && delObj.status !== 400) {
                throw new Error('Storage ' + delObj.status);
            }

            // 2) fila de la tabla (fuente de verdad de la galería)
            const delRow = await fetch(
                `${URL_}/rest/v1/photos?id=eq.${row.id}`,
                { method: 'DELETE', headers: { ...headers(), Prefer: 'return=minimal' } }
            );
            if (!delRow.ok) throw new Error('BD ' + delRow.status);

            fig.remove();
            setCount();
            if (!grid.querySelectorAll('figure').length) setState('No hay fotos todavía.');
        } catch (err) {
            console.error(err);
            fig.classList.remove('deleting');
            btn.disabled = false; btn.textContent = 'Borrar';
            alert('No se pudo borrar: ' + err.message);
        }
    }

    document.getElementById('btn-refresh').addEventListener('click', loadPhotos);
    loadPhotos();
})();
