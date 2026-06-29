/**
 * admin.js — Panel de administración del Photo Booth.
 * Login con Supabase Auth (correo/contraseña) y borrado de fotos.
 * El borrado solo funciona para el usuario admin (políticas RLS en Supabase).
 */
(function () {
    const cfg = window.PB_CONFIG || {};
    const ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
                  !cfg.SUPABASE_URL.includes('TU-PROYECTO');
    const BUCKET = cfg.BUCKET || 'photos';
    const TOKEN_KEY = 'pb-admin-token';

    const $ = id => document.getElementById(id);
    const loginEl = $('login'), panelEl = $('panel');
    const loginMsg = $('login-msg'), stateEl = $('state'), grid = $('grid'), countEl = $('count');

    let token = sessionStorage.getItem(TOKEN_KEY) || null;

    const authHeaders = () => ({
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`
    });

    function showLogin(msg) {
        loginEl.style.display = 'block';
        panelEl.style.display = 'none';
        if (msg) { loginMsg.textContent = msg; loginMsg.classList.add('error'); }
    }
    function showPanel() {
        loginEl.style.display = 'none';
        panelEl.style.display = 'block';
    }
    function setState(msg) {
        stateEl.textContent = msg || '';
        stateEl.style.display = msg ? 'block' : 'none';
    }

    /* ── Login ──────────────────────────────────────────────────────────── */
    async function login() {
        const email = $('email').value.trim();
        const password = $('password').value;
        loginMsg.textContent = ''; loginMsg.classList.remove('error');
        if (!email || !password) { loginMsg.textContent = 'Ingresa correo y contraseña.'; loginMsg.classList.add('error'); return; }

        const btn = $('btn-login');
        btn.disabled = true; btn.textContent = 'Entrando...';
        try {
            const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: { apikey: cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.access_token) {
                throw new Error(data.error_description || data.msg || data.error || 'Credenciales inválidas');
            }
            token = data.access_token;
            sessionStorage.setItem(TOKEN_KEY, token);
            $('password').value = '';
            showPanel();
            loadPhotos();
        } catch (err) {
            loginMsg.textContent = 'No se pudo entrar: ' + err.message;
            loginMsg.classList.add('error');
        } finally {
            btn.disabled = false; btn.textContent = 'Entrar';
        }
    }

    function logout() {
        token = null;
        sessionStorage.removeItem(TOKEN_KEY);
        grid.innerHTML = '';
        showLogin();
    }

    /* ── Listar fotos ───────────────────────────────────────────────────── */
    function publicUrl(path) {
        return `${cfg.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    }

    async function loadPhotos() {
        setState('Cargando…'); grid.innerHTML = ''; countEl.textContent = '—';
        try {
            const res = await fetch(
                `${cfg.SUPABASE_URL}/rest/v1/photos?select=id,email,image_path,created_at&order=created_at.desc`,
                { headers: authHeaders() }
            );
            if (res.status === 401 || res.status === 403) { logout(); showLogin('Tu sesión expiró. Vuelve a entrar.'); return; }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const rows = await res.json();

            countEl.textContent = `${rows.length} foto${rows.length === 1 ? '' : 's'}`;
            if (!rows.length) { setState('No hay fotos todavía.'); return; }
            setState('');

            const frag = document.createDocumentFragment();
            for (const row of rows) {
                frag.appendChild(renderPhoto(row));
            }
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
        const date = new Date(row.created_at).toLocaleString();
        cap.textContent = `${row.email || '(sin correo)'} · ${date}`;

        const del = document.createElement('button');
        del.className = 'btn-del'; del.textContent = 'Borrar';
        del.addEventListener('click', () => deletePhoto(row, fig, del));

        fig.append(img, cap, del);
        return fig;
    }

    /* ── Borrar foto (Storage + fila de la BD) ──────────────────────────── */
    async function deletePhoto(row, fig, btn) {
        if (!confirm('¿Borrar esta foto? Esta acción no se puede deshacer.')) return;
        btn.disabled = true; btn.textContent = 'Borrando…';
        try {
            // 1) borrar el archivo del Storage. Si ya no existe (404/400), no es
            //    fatal: la fila de la BD es la fuente de verdad de la galería.
            const delObj = await fetch(`${cfg.SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(row.image_path)}`, {
                method: 'DELETE', headers: authHeaders()
            });
            if (delObj.status === 401 || delObj.status === 403) { logout(); showLogin('Tu sesión expiró. Vuelve a entrar.'); return; }
            if (!delObj.ok && delObj.status !== 404 && delObj.status !== 400) throw new Error('Storage ' + delObj.status);

            // 2) borrar la fila de la tabla
            const delRow = await fetch(`${cfg.SUPABASE_URL}/rest/v1/photos?id=eq.${row.id}`, {
                method: 'DELETE', headers: { ...authHeaders(), Prefer: 'return=minimal' }
            });
            if (delRow.status === 401 || delRow.status === 403) { logout(); showLogin('Tu sesión expiró. Vuelve a entrar.'); return; }
            if (!delRow.ok) throw new Error('BD ' + delRow.status);

            fig.remove();
            const n = grid.querySelectorAll('figure').length;
            countEl.textContent = `${n} foto${n === 1 ? '' : 's'}`;
            if (!n) setState('No hay fotos todavía.');
        } catch (err) {
            console.error(err);
            alert('No se pudo borrar: ' + err.message);
            btn.disabled = false; btn.textContent = 'Borrar';
        }
    }

    /* ── Init ───────────────────────────────────────────────────────────── */
    $('btn-login').addEventListener('click', login);
    $('password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    $('btn-logout').addEventListener('click', logout);

    if (!ready) { showLogin('Falta configurar Supabase en config.js.'); return; }
    if (token) { showPanel(); loadPhotos(); } else { showLogin(); }
})();
