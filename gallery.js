/**
 * gallery.js — Lista las fotos de la boda desde la vista pública de Supabase.
 * No expone correos: solo lee `gallery_photos` (imagen + fecha).
 */
(function () {
    const cfg   = window.PB_CONFIG || {};
    const grid  = document.getElementById('grid');
    const state = document.getElementById('state');

    const ready = cfg.SUPABASE_URL &&
                  cfg.SUPABASE_ANON_KEY &&
                  !cfg.SUPABASE_URL.includes('TU-PROYECTO') &&
                  !cfg.SUPABASE_ANON_KEY.includes('TU_CLAVE');

    function showState(msg) {
        state.textContent = msg;
        state.style.display = 'block';
    }

    function publicUrl(path) {
        return `${cfg.SUPABASE_URL}/storage/v1/object/public/${cfg.BUCKET || 'photos'}/${path}`;
    }

    async function load() {
        if (!ready) {
            showState('La galería aún no está configurada.');
            return;
        }
        try {
            const res = await fetch(
                `${cfg.SUPABASE_URL}/rest/v1/gallery_photos?select=image_path,created_at&order=created_at.desc`,
                { headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}` } }
            );
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const rows = await res.json();

            if (!rows.length) {
                showState('Aún no hay fotos. ¡Sé el primero en tomarte una!');
                return;
            }

            const frag = document.createDocumentFragment();
            for (const row of rows) {
                const url = publicUrl(row.image_path);
                const fig = document.createElement('figure');

                const link = document.createElement('a');
                link.href = url; link.target = '_blank'; link.rel = 'noopener';
                const img = document.createElement('img');
                img.src = url; img.loading = 'lazy'; img.alt = 'Foto de la boda';
                link.appendChild(img);

                const dl = document.createElement('a');
                dl.className = 'dl';
                dl.href = `${url}?download=${encodeURIComponent(row.image_path)}`;
                dl.textContent = 'Descargar';

                fig.append(link, dl);
                frag.appendChild(fig);
            }
            grid.appendChild(frag);
        } catch (err) {
            console.error('Gallery error:', err);
            showState('No se pudieron cargar las fotos. Revisa tu conexión e inténtalo de nuevo.');
        }
    }

    load();
})();
