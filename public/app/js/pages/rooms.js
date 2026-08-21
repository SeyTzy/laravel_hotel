const PagesRooms = (() => {
    let state = { page: 1, search: '', room_type: '', status: '', price: '' };

    function readParams() {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        state.search = params.get('q') || '';
    }

    function render(root) {
        readParams();
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Rooms</h2>
                    <p>Manage your property's rooms, pricing and availability.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-ghost" onclick="PagesRooms.exportCsv()"><i class="fa-solid fa-file-csv"></i> Export</button>
                    <button class="btn btn-gold" onclick="PagesRooms.openForm()"><i class="fa-solid fa-plus"></i> Add room</button>
                </div>
            </div>

            <div class="card-soft mb-4">
                <div class="filter-bar">
                    <div class="input-group" style="width:220px">
                        <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input class="form-control" id="roomSearch" placeholder="Search room number..." value="${UI.esc(state.search)}">
                    </div>
                    <select class="form-select" id="roomTypeFilter" style="width:150px">
                        <option value="">All types</option>
                        <option>Single</option><option>Double</option><option>Twin</option>
                        <option>Deluxe</option><option>Suite</option><option>Presidential</option>
                    </select>
                    <select class="form-select" id="roomStatusFilter" style="width:150px">
                        <option value="">All statuses</option>
                        <option>Available</option><option>Occupied</option><option>Reserved</option><option>Maintenance</option>
                    </select>
                    <select class="form-select" id="roomPriceFilter" style="width:160px">
                        <option value="">Any price</option>
                        <option value="50">Under $50</option>
                        <option value="100">Under $100</option>
                        <option value="150">Under $150</option>
                        <option value="300">Under $300</option>
                        <option value="9999">$300+</option>
                    </select>
                    <span class="ms-auto text-muted" style="font-size:.78rem" id="roomCount"></span>
                </div>
            </div>

            <div id="roomGrid">${UI.skeletonCards(6)}</div>
            <div id="roomPagination" class="mt-2"></div>
        `;

        document.getElementById('roomSearch').addEventListener('input', debounce(() => {
            state.search = document.getElementById('roomSearch').value;
            state.page = 1;
            load();
        }, 350));

        ['roomTypeFilter', 'roomStatusFilter', 'roomPriceFilter'].forEach((id) => {
            document.getElementById(id).addEventListener('change', () => {
                state.room_type = document.getElementById('roomTypeFilter').value;
                state.status = document.getElementById('roomStatusFilter').value;
                state.price = document.getElementById('roomPriceFilter').value;
                state.page = 1;
                load();
            });
        });

        load();
    }

    function params() {
        const p = { per_page: 9, page: state.page };
        if (state.search) p.search = state.search;
        if (state.room_type) p.room_type = state.room_type;
        if (state.status) p.status = state.status;
        if (state.price) p.price_max = state.price;
        return p;
    }

    async function load() {
        const grid = document.getElementById('roomGrid');
        grid.innerHTML = UI.skeletonCards(6);
        try {
            const res = await Api.rooms(params());
            const d = res.data.data;
            const meta = d.meta;

            document.getElementById('roomCount').textContent = `${meta.total} room${meta.total === 1 ? '' : 's'} found`;

            if (!d.data.length) {
                grid.innerHTML = `
                <div class="card-soft">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fa-solid fa-bed"></i></div>
                        <h4>No rooms found</h4>
                        <p>No rooms match your current filters. Try adjusting the search or create a new room.</p>
                        <button class="btn btn-gold" onclick="PagesRooms.openForm()"><i class="fa-solid fa-plus"></i> Add room</button>
                    </div>
                </div>`;
                document.getElementById('roomPagination').innerHTML = '';
                return;
            }

            grid.innerHTML = `<div class="room-grid">${d.data.map(roomCard).join('')}</div>`;
            document.getElementById('roomPagination').replaceChildren(UI.paginate(meta, (pg) => { state.page = pg; load(); }));
        } catch { /* interceptor */ }
    }

    function roomCard(r) {
        return `
        <div class="room-card">
            <div class="img-wrap" onclick="PagesRooms.viewImage('${r.image_url || ''}')">
                ${r.image_url ? `<img src="${r.image_url}" alt="Room ${UI.esc(r.room_number)}" loading="lazy">` : '<div style="height:100%;display:grid;place-items:center;background:#eef1f7"><i class="fa-solid fa-image" style="font-size:2rem;color:#b7c2d4"></i></div>'}
                <span class="status-chip">${UI.statusBadge('room', r.status)}</span>
                <span class="price-chip">${UI.money(r.price_per_night)} / night</span>
            </div>
            <div class="body">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div>
                        <div class="room-number">Room ${UI.esc(r.room_number)}</div>
                        <div class="room-type">${UI.esc(r.room_type)} · Floor ${UI.esc(r.floor)}</div>
                    </div>
                    <button class="btn btn-ghost btn-icon" title="View" onclick="PagesRooms.viewRoom(${r.id})"><i class="fa-solid fa-eye" style="color:var(--slate)"></i></button>
                </div>
                <div class="room-details">
                    <span><i class="fa-solid fa-user-group"></i>${r.capacity} guest${r.capacity > 1 ? 's' : ''}</span>
                    <span><i class="fa-solid fa-ruler-combined"></i>${UI.esc(r.room_type)}</span>
                    <span><i class="fa-solid fa-bed"></i>${UI.esc(r.floor)}F</span>
                </div>
            </div>
            <div class="actions">
                <button class="btn btn-ghost btn-sm flex-fill" onclick="PagesRooms.openForm(${r.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="btn btn-danger btn-sm flex-fill" onclick="PagesRooms.remove(${r.id}, '${UI.esc(r.room_number)}')"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
        </div>`;
    }

    async function viewRoom(id) {
        const res = await Api.room(id);
        const r = res.data.data;
        UI.openForm(`Room ${r.room_number} details`, `
            <div class="mb-3 text-center">
                ${r.image_url ? `<img src="${r.image_url}" alt="" style="width:100%;max-height:230px;object-fit:cover;border-radius:14px" onclick="PagesRooms.viewImage('${r.image_url}')">` : ''}
            </div>
            <div class="detail-grid mb-3">
                <div class="detail-item"><div class="k">Room number</div><div class="v">${UI.esc(r.room_number)}</div></div>
                <div class="detail-item"><div class="k">Type</div><div class="v">${UI.esc(r.room_type)}</div></div>
                <div class="detail-item"><div class="k">Floor</div><div class="v">${UI.esc(r.floor)}</div></div>
                <div class="detail-item"><div class="k">Price / night</div><div class="v">${UI.money(r.price_per_night)}</div></div>
                <div class="detail-item"><div class="k">Capacity</div><div class="v">${r.capacity} guests</div></div>
                <div class="detail-item"><div class="k">Status</div><div class="v">${UI.statusBadge('room', r.status)}</div></div>
            </div>
            ${r.description ? `<p class="text-muted" style="font-size:.84rem">${UI.esc(r.description)}</p>` : ''}
            <div class="text-end"><button class="btn btn-ghost" data-bs-dismiss="modal">Close</button></div>
        `);
    }

    function openForm(id = null) {
        if (id) {
            Api.room(id).then((res) => {
                const r = res.data.data;
                UI.openForm(`Edit Room ${r.room_number}`, formHtml(r));
            });
        } else {
            UI.openForm('Add New Room', formHtml(null));
        }
    }

    function formHtml(r) {
        const types = ['Single', 'Double', 'Twin', 'Deluxe', 'Suite', 'Presidential'];
        const statuses = ['Available', 'Occupied', 'Reserved', 'Maintenance'];
        return `
        <form id="roomForm" data-api="${r ? 'updateRoom' : 'createRoom'}" data-id="${r?.id || ''}" data-method="${r ? 'PUT' : 'POST'}">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Room number *</label>
                    <input class="form-control" name="room_number" value="${UI.esc(r?.room_number || '')}" placeholder="e.g. 305" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Room type *</label>
                    <select class="form-select" name="room_type" required>
                        <option value="">Select type</option>
                        ${types.map((t) => `<option ${r?.room_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Floor *</label>
                    <input class="form-control" name="floor" value="${UI.esc(r?.floor || '1')}" placeholder="e.g. 3" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Price per night ($) *</label>
                    <input type="number" step="0.01" min="0.01" class="form-control" name="price_per_night" value="${r?.price_per_night ?? ''}" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Capacity *</label>
                    <input type="number" min="1" max="10" class="form-control" name="capacity" value="${r?.capacity ?? 2}" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Status *</label>
                    <select class="form-select" name="status" required>
                        ${statuses.map((s) => `<option ${r?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="col-12">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" name="description" rows="3" placeholder="Room amenities, view, notes...">${UI.esc(r?.description || '')}</textarea>
                </div>
                <div class="col-12">
                    <label class="form-label">Room image</label>
                    <input type="file" class="form-control" name="image" accept="image/*">
                    ${r?.image_url ? `<div class="mt-2"><img src="${r.image_url}" style="height:70px;border-radius:10px"></div>` : ''}
                </div>
            </div>
            <div class="text-end mt-4">
                <button type="button" class="btn btn-ghost me-2" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-gold"><i class="fa-solid fa-floppy-disk"></i> ${r ? 'Update room' : 'Create room'}</button>
            </div>
        </form>`;
    }

    function remove(id, roomNumber) {
        UI.confirm({
            title: `Delete room ${roomNumber}?`,
            text: 'This will permanently remove the room. Active bookings block deletion.',
            confirmText: 'Delete room',
            onConfirm: async () => {
                try {
                    const res = await Api.deleteRoom(id);
                    UI.toast(res.data.message);
                    load();
                } catch (err) {
                    const res = err.response;
                    UI.toast((res && res.data && res.data.message) || 'Could not delete room.', 'error');
                }
            },
        });
    }

    function viewImage(src) {
        if (src) UI.openImage(src);
    }

    async function exportCsv() {
        try {
            const res = await Api.rooms({ all: true, ...params(), per_page: undefined });
            const rows = res.data.data.data || [];
            let csv = 'Room Number,Type,Floor,Price,Night,Capacity,Status\n';
            rows.forEach((r) => { csv += `${r.room_number},${r.room_type},${r.floor},${r.price_per_night},${r.capacity},${r.status}\n`; });
            download(csv, 'rooms.csv');
            UI.toast('Rooms exported to CSV');
        } catch { UI.toast('Export failed', 'error'); }
    }

    function download(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    function debounce(fn, ms) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    // Re-wire form submit after modal opens
    const origOpenForm = openForm;
    openForm = (...args) => {
        origOpenForm(...args);
        UI.wireForm('roomForm', () => { UI.closeForm(); load(); });
    };

    return { render, openForm, remove, viewRoom, viewImage, exportCsv };
})();
