const PagesGuests = (() => {
    let state = { page: 1, search: '', gender: '', nationality: '' };

    function readParams() {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        state.search = params.get('q') || '';
    }

    function render(root) {
        readParams();
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Guests</h2>
                    <p>All guest profiles and contact information in one place.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-ghost" onclick="PagesGuests.exportCsv()"><i class="fa-solid fa-file-csv"></i> Export</button>
                    <button class="btn btn-gold" onclick="PagesGuests.openForm()"><i class="fa-solid fa-user-plus"></i> Add guest</button>
                </div>
            </div>

            <div class="card-soft mb-4">
                <div class="filter-bar">
                    <div class="input-group" style="width:260px">
                        <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input class="form-control" id="guestSearch" placeholder="Search name, email or phone..." value="${UI.esc(state.search)}">
                    </div>
                    <select class="form-select" id="guestGender" style="width:140px">
                        <option value="">All genders</option>
                        <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                    <select class="form-select" id="guestNationality" style="width:160px">
                        <option value="">All nationalities</option>
                        <option>Cambodian</option><option>American</option><option>Spanish</option>
                        <option>Japanese</option><option>French</option><option>German</option>
                        <option>Singaporean</option><option>British</option><option>Vietnamese</option>
                        <option>Mexican</option><option>Australian</option><option>Emirati</option>
                    </select>
                    <span class="ms-auto text-muted" style="font-size:.78rem" id="guestCount"></span>
                </div>
            </div>

            <div class="card-soft">
                <div class="table-wrap">
                    <table class="table align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Guest</th><th>Contact</th><th>Gender</th><th>Nationality</th><th>ID Number</th><th>Bookings</th><th style="text-align:right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="guestTbody">${UI.skeletonRows(6)}</tbody>
                    </table>
                </div>
            </div>
            <div id="guestPagination"></div>
        `;

        document.getElementById('guestSearch').addEventListener('input', debounce(() => {
            state.search = document.getElementById('guestSearch').value;
            state.page = 1; load();
        }, 350));
        document.getElementById('guestGender').addEventListener('change', () => { state.gender = document.getElementById('guestGender').value; state.page = 1; load(); });
        document.getElementById('guestNationality').addEventListener('change', () => { state.nationality = document.getElementById('guestNationality').value; state.page = 1; load(); });
        load();
    }

    function params() {
        const p = { per_page: 10, page: state.page };
        if (state.search) p.search = state.search;
        if (state.gender) p.gender = state.gender;
        if (state.nationality) p.nationality = state.nationality;
        return p;
    }

    async function load() {
        document.getElementById('guestTbody').innerHTML = UI.skeletonRows(6);
        try {
            const res = await Api.guests(params());
            const d = res.data.data;
            const meta = d.meta;
            document.getElementById('guestCount').textContent = `${meta.total} guest${meta.total === 1 ? '' : 's'}`;

            if (!d.data.length) {
                document.getElementById('guestTbody').innerHTML = `
                <tr class="table-empty"><td colspan="7">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fa-solid fa-user-group"></i></div>
                        <h4>No guests found</h4>
                        <p>No guests match your search. Register a new guest to get started.</p>
                        <button class="btn btn-gold" onclick="PagesGuests.openForm()"><i class="fa-solid fa-user-plus"></i> Add guest</button>
                    </div>
                </td></tr>`;
                document.getElementById('guestPagination').innerHTML = '';
                return;
            }

            document.getElementById('guestTbody').innerHTML = d.data.map(row).join('');
            document.getElementById('guestPagination').replaceChildren(UI.paginate(meta, (pg) => { state.page = pg; load(); }));
        } catch { /* interceptor */ }
    }

    function row(g) {
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:11px">
                    <div class="guest-avatar">${UI.initials(g.full_name)}</div>
                    <div>
                        <div style="font-weight:600">${UI.esc(g.full_name)}</div>
                        <div class="cell-sub">${UI.esc(g.gender || '—')}</div>
                    </div>
                </div>
            </td>
            <td>
                <div>${UI.esc(g.email)}</div>
                <div class="cell-sub">${UI.esc(g.phone)}</div>
            </td>
            <td><span class="badge-pillx b-available">${UI.esc(g.gender || '—')}</span></td>
            <td>${UI.esc(g.nationality || '—')}</td>
            <td class="mono">${UI.esc(g.identity_number || '—')}</td>
            <td class="cell-sub">${g.created_at ? 'Profile' : 'Profile'}</td>
            <td style="text-align:right;white-space:nowrap">
                <button class="btn btn-ghost btn-icon" title="View" onclick="PagesGuests.view(${g.id})"><i class="fa-solid fa-eye" style="color:var(--slate)"></i></button>
                <button class="btn btn-ghost btn-icon" title="Edit" onclick="PagesGuests.openForm(${g.id})"><i class="fa-solid fa-pen" style="color:var(--gold-dark)"></i></button>
                <button class="btn btn-ghost btn-icon" title="Delete" onclick="PagesGuests.remove(${g.id}, '${UI.esc(g.full_name)}')"><i class="fa-solid fa-trash" style="color:var(--red)"></i></button>
            </td>
        </tr>`;
    }

    async function view(id) {
        const res = await Api.guest(id);
        const g = res.data.data;
        const bookings = g.bookings?.data || [];
        UI.openForm(`${g.full_name} — Guest profile`, `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
                <div class="guest-avatar" style="width:58px;height:58px;font-size:1.2rem;border-radius:18px">${UI.initials(g.full_name)}</div>
                <div>
                    <h5 class="mb-0">${UI.esc(g.full_name)}</h5>
                    <div class="text-muted" style="font-size:.82rem">${UI.esc(g.email)} · ${UI.esc(g.phone)}</div>
                </div>
            </div>
            <div class="detail-grid mb-3">
                <div class="detail-item"><div class="k">Gender</div><div class="v">${UI.esc(g.gender || '—')}</div></div>
                <div class="detail-item"><div class="k">Date of birth</div><div class="v">${UI.date(g.date_of_birth)}</div></div>
                <div class="detail-item"><div class="k">Nationality</div><div class="v">${UI.esc(g.nationality || '—')}</div></div>
                <div class="detail-item"><div class="k">ID number</div><div class="v mono">${UI.esc(g.identity_number || '—')}</div></div>
                <div class="detail-item" style="grid-column:1/-1"><div class="k">Address</div><div class="v">${UI.esc(g.address || '—')}</div></div>
            </div>
            <h6 class="fw-semibold mb-2">Booking history (${bookings.length})</h6>
            ${bookings.length ? `<div class="timeline">${bookings.map((b) => `
                <div class="timeline-item" style="font-size:.82rem">
                    <span class="mono">${UI.esc(b.booking_code)}</span> · ${UI.date(b.check_in)} → ${UI.date(b.check_out)}
                    ${UI.statusBadge('booking', b.booking_status)}
                </div>`).join('')}</div>` : '<p class="text-muted" style="font-size:.82rem">No bookings yet.</p>'}
            <div class="text-end mt-3"><button class="btn btn-ghost" data-bs-dismiss="modal">Close</button></div>
        `);
    }

    function openForm(id = null) {
        if (id) {
            Api.guest(id).then((res) => UI.openForm(`Edit ${res.data.data.full_name}`, formHtml(res.data.data)));
        } else {
            UI.openForm('Add New Guest', formHtml(null));
        }
    }

    function formHtml(g) {
        return `
        <form id="guestForm" data-api="${g ? 'updateGuest' : 'createGuest'}" data-id="${g?.id || ''}" data-method="${g ? 'PUT' : 'POST'}">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">First name *</label>
                    <input class="form-control" name="first_name" value="${UI.esc(g?.first_name || '')}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Last name *</label>
                    <input class="form-control" name="last_name" value="${UI.esc(g?.last_name || '')}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Email *</label>
                    <input type="email" class="form-control" name="email" value="${UI.esc(g?.email || '')}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Phone *</label>
                    <input class="form-control" name="phone" value="${UI.esc(g?.phone || '')}" placeholder="+855 12 345 678" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Gender</label>
                    <select class="form-select" name="gender">
                        <option value="">—</option>
                        <option ${g?.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option ${g?.gender === 'Female' ? 'selected' : ''}>Female</option>
                        <option ${g?.gender === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Date of birth</label>
                    <input type="date" class="form-control" name="date_of_birth" value="${g?.date_of_birth || ''}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Nationality</label>
                    <input class="form-control" name="nationality" value="${UI.esc(g?.nationality || '')}">
                </div>
                <div class="col-md-8">
                    <label class="form-label">Address</label>
                    <input class="form-control" name="address" value="${UI.esc(g?.address || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Identity number</label>
                    <input class="form-control" name="identity_number" value="${UI.esc(g?.identity_number || '')}" placeholder="Passport / ID">
                </div>
            </div>
            <div class="text-end mt-4">
                <button type="button" class="btn btn-ghost me-2" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-gold"><i class="fa-solid fa-floppy-disk"></i> ${g ? 'Update guest' : 'Create guest'}</button>
            </div>
        </form>`;
    }

    function remove(id, name) {
        UI.confirm({
            title: `Delete ${name}?`,
            text: 'This will permanently remove the guest and their bookings.',
            confirmText: 'Delete guest',
            onConfirm: async () => {
                try {
                    const res = await Api.deleteGuest(id);
                    UI.toast(res.data.message);
                    load();
                } catch (err) {
                    const res = err.response;
                    UI.toast((res && res.data && res.data.message) || 'Could not delete guest.', 'error');
                }
            },
        });
    }

    async function exportCsv() {
        try {
            const res = await Api.guests({ all: true });
            const rows = res.data.data.data || [];
            let csv = 'First,Last,Email,Phone,Gender,Nationality,Identity\n';
            rows.forEach((g) => { csv += `${g.first_name},${g.last_name},${g.email},${g.phone},${g.gender || ''},${g.nationality || ''},${g.identity_number || ''}\n`; });
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'guests.csv'; a.click();
            UI.toast('Guests exported to CSV');
        } catch { UI.toast('Export failed', 'error'); }
    }

    function debounce(fn, ms) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    const origOpenForm = openForm;
    openForm = (...args) => {
        origOpenForm(...args);
        UI.wireForm('guestForm', () => { UI.closeForm(); load(); });
    };

    return { render, openForm, view, remove, exportCsv };
})();
