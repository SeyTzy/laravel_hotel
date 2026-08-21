const UI = (() => {
    const money = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const date = (v) => v ? new Date(v + (v.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const dateTime = (v) => v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
    const initials = (name) => (name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

    function toast(message, type = 'success') {
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
        const el = document.createElement('div');
        el.className = `toast-item ${type}`;
        el.innerHTML = `<div class="t-icon"><i class="fa-solid ${icons[type]}"></i></div><div>${message}</div>`;
        document.getElementById('toast-container').appendChild(el);
        setTimeout(() => {
            el.style.transition = 'opacity .3s, transform .3s';
            el.style.opacity = '0';
            el.style.transform = 'translateX(30px)';
            setTimeout(() => el.remove(), 320);
        }, 3200);
    }

    let confirmCallback = null;
    function confirm({ title = 'Are you sure?', text = 'This action cannot be undone.', confirmText = 'Yes, continue', onConfirm }) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmText').textContent = text;
        const btn = document.getElementById('confirmBtn');
        btn.textContent = confirmText;
        confirmCallback = onConfirm;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmModal')).show();
    }
    document.getElementById('confirmBtn').addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
        if (confirmCallback) confirmCallback();
    });

    function openForm(title, bodyHtml) {
        document.getElementById('formModalLabel').textContent = title;
        document.getElementById('formModalBody').innerHTML = bodyHtml;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('formModal')).show();
        document.getElementById('formModalBody').querySelectorAll('input,select,textarea').forEach((el) => el.focus && false);
    }
    function closeForm() {
        bootstrap.Modal.getInstance(document.getElementById('formModal'))?.hide();
    }

    function openImage(src, alt = '') {
        const img = document.getElementById('imageModalImg');
        img.src = src || '';
        img.alt = alt;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('imageModal')).show();
    }

    function modalForm(form) {
        return Object.fromEntries(new FormData(form).entries());
    }

    function showFieldErrors(form, errors) {
        form.querySelectorAll('.field-error, .is-invalid').forEach((el) => el.remove?.() || el.classList.remove('is-invalid'));
        if (!errors) return;
        Object.entries(errors).forEach(([field, msgs]) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (!input) return;
            input.classList.add('is-invalid');
            const err = document.createElement('div');
            err.className = 'field-error';
            err.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${Array.isArray(msgs) ? msgs[0] : msgs}`;
            input.parentElement.appendChild(err);
        });
    }

    function submitForm(form, onSuccess) {
        if (form._submitWired) return;
        form._submitWired = true;
        const submitBtn = form.querySelector('[type="submit"]');
        const original = submitBtn ? submitBtn.innerHTML : '';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'; }
            const payload = new FormData(form);
            const method = form.dataset.method || 'POST';
            try {
                const res = method === 'POST'
                    ? await Api[form.dataset.api](payload)
                    : await Api[form.dataset.api](form.dataset.id, payload);
                UI.toast(res.data.message || 'Saved successfully');
                if (onSuccess) onSuccess(res.data.data);
                return res.data;
            } catch (err) {
                const res = err.response;
                if (res && res.status === 422) showFieldErrors(form, res.data.errors);
                else UI.toast((res && res.data && res.data.message) || 'Something went wrong', 'error');
                throw err;
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = original; }
            }
        });
    }

    function wireForm(id, onSuccess, timeout = 4000) {
        const start = Date.now();
        const timer = setInterval(() => {
            if (Date.now() - start > timeout) { clearInterval(timer); return; }
            const form = document.getElementById(id);
            if (!form || form._submitWired) return;
            clearInterval(timer);
            submitForm(form, onSuccess);
        }, 80);
    }

    function skeletonRows(count = 5) {
        return Array.from({ length: count }).map(() => '<div class="skeleton skel-row"></div>').join('');
    }
    function skeletonCards(count = 6) {
        return `<div class="room-grid">${Array.from({ length: count }).map(() => '<div class="skeleton skel-card"></div>').join('')}</div>`;
    }

    function paginate(meta, onGo) {
        if (!meta || meta.last_page <= 1) return '';
        let html = '<nav><ul class="pagination justify-content-center">';
        html += `<li class="page-item ${meta.current_page <= 1 ? 'disabled' : ''}"><a class="page-link" data-page="${meta.current_page - 1}"><i class="fa-solid fa-chevron-left"></i></a></li>`;
        const from = Math.max(1, meta.current_page - 2);
        const to = Math.min(meta.last_page, meta.current_page + 2);
        for (let i = from; i <= to; i++) {
            html += `<li class="page-item ${i === meta.current_page ? 'active' : ''}"><a class="page-link" data-page="${i}">${i}</a></li>`;
        }
        html += `<li class="page-item ${meta.current_page >= meta.last_page ? 'disabled' : ''}"><a class="page-link" data-page="${meta.current_page + 1}"><i class="fa-solid fa-chevron-right"></i></a></li>`;
        html += '</ul></nav>';
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        wrap.querySelectorAll('[data-page]').forEach((el) => el.addEventListener('click', (e) => {
            e.preventDefault();
            const pg = parseInt(el.dataset.page);
            if (pg >= 1 && pg <= meta.last_page) onGo(pg);
        }));
        return wrap;
    }

    function statusBadge(type, value) {
        const map = {
            room: { Available: 'b-available', Occupied: 'b-occupied', Reserved: 'b-reserved', Maintenance: 'b-maintenance' },
            booking: { Pending: 'b-pending', Confirmed: 'b-confirmed', 'Checked In': 'b-checkedin', 'Checked Out': 'b-checkedout', Cancelled: 'b-cancelled' },
            payment: { Unpaid: 'b-unpaid', Partial: 'b-partial', Paid: 'b-paid', Refunded: 'b-refunded' },
            service: { active: 'b-active', inactive: 'b-inactive' },
        };
        const cls = (map[type] && map[type][value]) || 'b-pending';
        return `<span class="badge-pillx ${cls}"><i class="fa-solid fa-circle"></i>${value}</span>`;
    }

    function countUp(el, target, suffix = '') {
        const duration = 700;
        const start = performance.now();
        function frame(now) {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = suffix ? Math.round(target * eased).toLocaleString() + suffix : Math.round(target * eased).toLocaleString();
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

    return { money, date, dateTime, initials, toast, confirm, openForm, closeForm, openImage, modalForm, showFieldErrors, submitForm, wireForm, skeletonRows, skeletonCards, paginate, statusBadge, countUp, esc };
})();
window.UI = UI;
