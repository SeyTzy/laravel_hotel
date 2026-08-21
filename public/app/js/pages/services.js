const PagesServices = (() => {
    let state = { page: 1, search: '', status: '' };

    function readParams() {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        state.search = params.get('q') || '';
    }

    function render(root) {
        readParams();
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Hotel Services</h2>
                    <p>Amenities and services offered to guests at StaySphere.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-gold" onclick="PagesServices.openForm()"><i class="fa-solid fa-plus"></i> Add service</button>
                </div>
            </div>

            <div class="card-soft mb-4">
                <div class="filter-bar">
                    <div class="input-group" style="width:240px">
                        <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input class="form-control" id="svcSearch" placeholder="Search services..." value="${UI.esc(state.search)}">
                    </div>
                    <select class="form-select" id="svcStatus" style="width:150px">
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <span class="ms-auto text-muted" style="font-size:.78rem" id="svcCount"></span>
                </div>
            </div>

            <div id="svcGrid">${UI.skeletonCards(6)}</div>
            <div id="svcPagination"></div>
        `;

        document.getElementById('svcSearch').addEventListener('input', debounce(() => {
            state.search = document.getElementById('svcSearch').value; state.page = 1; load();
        }, 350));
        document.getElementById('svcStatus').addEventListener('change', () => {
            state.status = document.getElementById('svcStatus').value; state.page = 1; load();
        });

        load();
    }

    function params() {
        const p = { per_page: 8, page: state.page };
        if (state.search) p.search = state.search;
        if (state.status) p.status = state.status;
        return p;
    }

    async function load() {
        document.getElementById('svcGrid').innerHTML = UI.skeletonCards(6);
        try {
            const res = await Api.services(params());
            const d = res.data.data;
            const meta = d.meta;
            document.getElementById('svcCount').textContent = `${meta.total} service${meta.total === 1 ? '' : 's'}`;

            if (!d.data.length) {
                document.getElementById('svcGrid').innerHTML = `
                <div class="card-soft">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fa-solid fa-concierge-bell"></i></div>
                        <h4>No services found</h4>
                        <p>No services match your filters. Add a new hotel service to get started.</p>
                        <button class="btn btn-gold" onclick="PagesServices.openForm()"><i class="fa-solid fa-plus"></i> Add service</button>
                    </div>
                </div>`;
                document.getElementById('svcPagination').innerHTML = '';
                return;
            }

            document.getElementById('svcGrid').innerHTML = `<div class="service-grid">${d.data.map(card).join('')}</div>`;
            document.getElementById('svcPagination').replaceChildren(UI.paginate(meta, (pg) => { state.page = pg; load(); }));
        } catch { /* interceptor */ }
    }

    function card(s) {
        return `
        <div class="service-card">
            <div class="img-wrap" style="cursor:pointer" onclick="PagesServices.viewImage('${s.image_url || ''}')">
                ${s.image_url ? `<img src="${s.image_url}" alt="${UI.esc(s.service_name)}" loading="lazy">` : '<div style="height:100%;display:grid;place-items:center;background:#eef1f7"><i class="fa-solid fa-spa" style="font-size:1.8rem;color:#b7c2d4"></i></div>'}
            </div>
            <div class="body">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div class="service-name">${UI.esc(s.service_name)}</div>
                    ${UI.statusBadge('service', s.status)}
                </div>
                <p class="text-muted mb-2" style="font-size:.78rem;min-height:38px">${UI.esc(s.description || '')}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="service-price">${UI.money(s.price)}</span>
                    <div class="d-flex gap-2">
                        <button class="btn btn-ghost btn-icon" title="Toggle status" onclick="PagesServices.toggle(${s.id}, ${s.status === 'active'})"><i class="fa-solid ${s.status === 'active' ? 'fa-toggle-on' : 'fa-toggle-off'}" style="color:${s.status === 'active' ? 'var(--green)' : '#c3ccdc'};font-size:1.2rem"></i></button>
                        <button class="btn btn-ghost btn-icon" title="Edit" onclick="PagesServices.openForm(${s.id})"><i class="fa-solid fa-pen" style="color:var(--gold-dark)"></i></button>
                        <button class="btn btn-ghost btn-icon" title="Delete" onclick="PagesServices.remove(${s.id}, '${UI.esc(s.service_name)}')"><i class="fa-solid fa-trash" style="color:var(--red)"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function openForm(id = null) {
        if (id) {
            Api.services({ all: true }).then((res) => {
                const s = res.data.data.data.find((x) => x.id === id);
                if (s) UI.openForm(`Edit ${s.service_name}`, formHtml(s));
            });
        } else {
            UI.openForm('Add Hotel Service', formHtml(null));
        }
    }

    function formHtml(s) {
        return `
        <form id="svcForm" data-api="${s ? 'updateService' : 'createService'}" data-id="${s?.id || ''}" data-method="${s ? 'PUT' : 'POST'}">
            <div class="row g-3">
                <div class="col-md-8">
                    <label class="form-label">Service name *</label>
                    <input class="form-control" name="service_name" value="${UI.esc(s?.service_name || '')}" placeholder="e.g. Breakfast" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Price ($) *</label>
                    <input type="number" step="0.01" min="0" class="form-control" name="price" value="${s?.price ?? ''}" required>
                </div>
                <div class="col-12">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" name="description" rows="3" placeholder="Describe the service...">${UI.esc(s?.description || '')}</textarea>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Status *</label>
                    <select class="form-select" name="status">
                        <option value="active" ${s?.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${s?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Service image</label>
                    <input type="file" class="form-control" name="image" accept="image/*">
                    ${s?.image_url ? `<div class="mt-2"><img src="${s.image_url}" style="height:60px;border-radius:9px"></div>` : ''}
                </div>
            </div>
            <div class="text-end mt-4">
                <button type="button" class="btn btn-ghost me-2" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-gold"><i class="fa-solid fa-floppy-disk"></i> ${s ? 'Update service' : 'Create service'}</button>
            </div>
        </form>`;
    }

    function remove(id, name) {
        UI.confirm({
            title: `Delete ${name}?`,
            text: 'This will permanently remove the service.',
            confirmText: 'Delete service',
            onConfirm: async () => {
                try {
                    const res = await Api.deleteService(id);
                    UI.toast(res.data.message);
                    load();
                } catch (err) {
                    const res = err.response;
                    UI.toast((res && res.data && res.data.message) || 'Could not delete service.', 'error');
                }
            },
        });
    }

    async function toggle(id, makeInactive) {
        try {
            const all = await Api.services({ all: true });
            const s = all.data.data.data.find((x) => x.id === id);
            if (!s) return;
            const res = await Api.updateService(id, {
                service_name: s.service_name,
                description: s.description || '',
                price: s.price,
                status: makeInactive ? 'inactive' : 'active',
                _method: 'PUT',
            });
            UI.toast(res.data.message);
            load();
        } catch (err) {
            const res = err.response;
            UI.toast((res && res.data && res.data.message) || 'Toggle failed', 'error');
        }
    }

    function viewImage(src) {
        if (src) UI.openImage(src);
    }

    function debounce(fn, ms) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    const origOpenForm = openForm;
    openForm = (...args) => {
        origOpenForm(...args);
        UI.wireForm('svcForm', () => { UI.closeForm(); load(); });
    };

    return { render, openForm, remove, toggle, viewImage };
})();
