const PagesBookings = (() => {
    let state = { page: 1, search: '', booking_status: '', payment_status: '', date_from: '', date_to: '', guests: [], rooms: [] };

    function readParams() {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        state.search = params.get('q') || '';
    }

    function render(root) {
        readParams();
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Bookings</h2>
                    <p>Reservations, stay management and billing status.</p>
                </div>
                <div class="page-actions">
                    <a href="#/availability" class="btn btn-ghost"><i class="fa-solid fa-calendar-check"></i> Find availability</a>
                    <button class="btn btn-gold" onclick="PagesBookings.openForm()"><i class="fa-solid fa-plus"></i> New booking</button>
                </div>
            </div>

            <div class="card-soft mb-4">
                <div class="filter-bar">
                    <div class="input-group" style="width:230px">
                        <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input class="form-control" id="bkSearch" placeholder="Code, guest, room..." value="${UI.esc(state.search)}">
                    </div>
                    <select class="form-select" id="bkStatus" style="width:150px">
                        <option value="">All statuses</option>
                        <option>Pending</option><option>Confirmed</option><option>Checked In</option>
                        <option>Checked Out</option><option>Cancelled</option>
                    </select>
                    <select class="form-select" id="bkPayment" style="width:150px">
                        <option value="">Any payment</option>
                        <option>Unpaid</option><option>Partial</option><option>Paid</option><option>Refunded</option>
                    </select>
                    <input type="date" class="form-control" id="bkFrom" style="width:150px" title="Check-in from">
                    <input type="date" class="form-control" id="bkTo" style="width:150px" title="Check-out to">
                    <button class="btn btn-ghost btn-sm" onclick="PagesBookings.clearFilters()"><i class="fa-solid fa-filter-circle-xmark"></i> Clear</button>
                    <span class="ms-auto text-muted" style="font-size:.78rem" id="bkCount"></span>
                </div>
            </div>

            <div class="card-soft">
                <div class="table-wrap">
                    <table class="table align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Booking</th><th>Guest</th><th>Room</th><th>Stay</th><th>Nights</th><th>Total</th><th>Status</th><th>Payment</th><th style="text-align:right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="bkTbody">${UI.skeletonRows(6)}</tbody>
                    </table>
                </div>
            </div>
            <div id="bkPagination"></div>
        `;

        document.getElementById('bkSearch').addEventListener('input', debounce(() => {
            state.search = document.getElementById('bkSearch').value; state.page = 1; load();
        }, 350));
        document.getElementById('bkStatus').addEventListener('change', () => { state.booking_status = document.getElementById('bkStatus').value; state.page = 1; load(); });
        document.getElementById('bkPayment').addEventListener('change', () => { state.payment_status = document.getElementById('bkPayment').value; state.page = 1; load(); });
        document.getElementById('bkFrom').addEventListener('change', () => { state.date_from = document.getElementById('bkFrom').value; state.page = 1; load(); });
        document.getElementById('bkTo').addEventListener('change', () => { state.date_to = document.getElementById('bkTo').value; state.page = 1; load(); });

        load();
    }

    function clearFilters() {
        state = { page: 1, search: '', booking_status: '', payment_status: '', date_from: '', date_to: '', guests: [], rooms: [] };
        ['bkSearch', 'bkStatus', 'bkPayment', 'bkFrom', 'bkTo'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = id === 'bkSearch' ? '' : ''; });
        load();
    }

    function params() {
        const p = { per_page: 10, page: state.page };
        if (state.search) p.search = state.search;
        if (state.booking_status) p.booking_status = state.booking_status;
        if (state.payment_status) p.payment_status = state.payment_status;
        if (state.date_from) p.date_from = state.date_from;
        if (state.date_to) p.date_to = state.date_to;
        return p;
    }

    async function load() {
        document.getElementById('bkTbody').innerHTML = UI.skeletonRows(6);
        try {
            const res = await Api.bookings(params());
            const d = res.data.data;
            const meta = d.meta;
            document.getElementById('bkCount').textContent = `${meta.total} booking${meta.total === 1 ? '' : 's'}`;

            if (!d.data.length) {
                document.getElementById('bkTbody').innerHTML = `
                <tr class="table-empty"><td colspan="9">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fa-solid fa-book-open"></i></div>
                        <h4>No bookings found</h4>
                        <p>No bookings match your filters. Create a new booking to get started.</p>
                        <button class="btn btn-gold" onclick="PagesBookings.openForm()"><i class="fa-solid fa-plus"></i> New booking</button>
                    </div>
                </td></tr>`;
                document.getElementById('bkPagination').innerHTML = '';
                return;
            }

            document.getElementById('bkTbody').innerHTML = d.data.map(row).join('');
            document.getElementById('bkPagination').replaceChildren(UI.paginate(meta, (pg) => { state.page = pg; load(); }));
        } catch { /* interceptor */ }
    }

    function row(b) {
        return `
        <tr>
            <td><span class="mono" style="color:var(--gold-dark)">${UI.esc(b.booking_code)}</span><div class="cell-sub">${UI.dateTime(b.created_at)}</div></td>
            <td style="font-weight:500">${b.guest ? UI.esc(b.guest.full_name) : '—'}<div class="cell-sub">${b.guest ? UI.esc(b.guest.email) : ''}</div></td>
            <td>${b.room ? `<span class="badge-pillx b-available"><i class="fa-solid fa-bed"></i>${UI.esc(b.room.room_number)}</span>` : '—'}</td>
            <td>${UI.date(b.check_in)}<div class="cell-sub">→ ${UI.date(b.check_out)}</div></td>
            <td>${b.number_of_nights} · ${b.number_of_guests} guest${b.number_of_guests > 1 ? 's' : ''}</td>
            <td style="font-weight:600">${UI.money(b.total_amount)}</td>
            <td>${UI.statusBadge('booking', b.booking_status)}</td>
            <td>${UI.statusBadge('payment', b.payment_status)}</td>
            <td style="text-align:right;white-space:nowrap">
                <button class="btn btn-ghost btn-icon" title="View" onclick="PagesBookings.view(${b.id})"><i class="fa-solid fa-eye" style="color:var(--slate)"></i></button>
                <button class="btn btn-ghost btn-icon" title="Edit" onclick="PagesBookings.openForm(${b.id})"><i class="fa-solid fa-pen" style="color:var(--gold-dark)"></i></button>
                <button class="btn btn-ghost btn-icon" title="Delete" onclick="PagesBookings.remove(${b.id}, '${UI.esc(b.booking_code)}')"><i class="fa-solid fa-trash" style="color:var(--red)"></i></button>
            </td>
        </tr>`;
    }

    async function view(id) {
        const res = await Api.booking(id);
        const b = res.data.data;
        const payments = b.payments?.data || [];
        UI.openForm(`Booking ${b.booking_code}`, `
            <div class="detail-grid mb-3">
                <div class="detail-item"><div class="k">Guest</div><div class="v">${b.guest ? UI.esc(b.guest.full_name) : '—'}</div></div>
                <div class="detail-item"><div class="k">Room</div><div class="v">${b.room ? `Room ${UI.esc(b.room.room_number)} · ${UI.esc(b.room.room_type)}` : '—'}</div></div>
                <div class="detail-item"><div class="k">Check-in</div><div class="v">${UI.date(b.check_in)}</div></div>
                <div class="detail-item"><div class="k">Check-out</div><div class="v">${UI.date(b.check_out)}</div></div>
                <div class="detail-item"><div class="k">Nights</div><div class="v">${b.number_of_nights}</div></div>
                <div class="detail-item"><div class="k">Guests</div><div class="v">${b.number_of_guests}</div></div>
                <div class="detail-item"><div class="k">Booking status</div><div class="v">${UI.statusBadge('booking', b.booking_status)}</div></div>
                <div class="detail-item"><div class="k">Payment status</div><div class="v">${UI.statusBadge('payment', b.payment_status)}</div></div>
                <div class="detail-item"><div class="k">Total</div><div class="v">${UI.money(b.total_amount)}</div></div>
                <div class="detail-item"><div class="k">Paid</div><div class="v" style="color:var(--green)">${UI.money(b.amount_paid)}</div></div>
                <div class="detail-item"><div class="k">Due</div><div class="v" style="color:${b.amount_due > 0 ? 'var(--red)' : 'var(--green)'}">${UI.money(b.amount_due)}</div></div>
            </div>
            ${b.special_request ? `<div class="mb-3"><div class="detail-item"><div class="k">Special request</div><div class="v">${UI.esc(b.special_request)}</div></div></div>` : ''}
            <div class="d-flex gap-2 mb-3">
                ${b.booking_status === 'Pending' || b.booking_status === 'Confirmed' ? `<button class="btn btn-navy btn-sm" onclick="PagesBookings.doCheckIn(${b.id})"><i class="fa-solid fa-door-open"></i> Check in</button>` : ''}
                ${b.booking_status === 'Checked In' ? `<button class="btn btn-danger btn-sm" onclick="PagesBookings.doCheckOut(${b.id})"><i class="fa-solid fa-door-closed"></i> Check out</button>` : ''}
                <button class="btn btn-gold btn-sm" onclick="PagesBookings.addPayment(${b.id})"><i class="fa-solid fa-money-bill-wave"></i> Record payment</button>
            </div>
            <h6 class="fw-semibold mb-2">Payments (${payments.length})</h6>
            ${payments.length ? `
            <div class="table-wrap"><table class="table align-middle">
                <thead><tr><th>Method</th><th>Amount</th><th>Date</th><th>Status</th><th>Ref</th></tr></thead>
                <tbody>${payments.map((p) => `
                    <tr>
                        <td><span class="badge-pillx ${badgeForMethod(p.payment_method)}">${UI.esc(p.payment_method)}</span></td>
                        <td style="font-weight:600">${UI.money(p.amount)}</td>
                        <td>${UI.date(p.payment_date)}</td>
                        <td>${UI.statusBadge('payment', p.payment_status)}</td>
                        <td class="mono" style="font-size:.72rem">${UI.esc(p.transaction_reference || '—')}</td>
                    </tr>`).join('')}</tbody>
            </table></div>` : '<p class="text-muted" style="font-size:.82rem">No payments recorded yet.</p>'}
            <div class="text-end mt-3"><button class="btn btn-ghost" data-bs-dismiss="modal">Close</button></div>
        `);
    }

    function badgeForMethod(m) {
        const map = { Cash: 'b-cash', 'Credit Card': 'b-creditcard', ABA: 'b-aba', ACLEDA: 'b-acleda', Wing: 'b-wing', 'Bank Transfer': 'b-banktransfer' };
        return map[m] || 'b-pending';
    }

    function openForm(id = null) {
        if (id) {
            Promise.all([Api.booking(id), Api.guests({ all: true }), Api.rooms({ all: true })])
                .then(([bk, guests, rooms]) => {
                    state.guests = guests.data.data.data || [];
                    state.rooms = rooms.data.data.data || [];
                    UI.openForm(`Edit ${bk.data.data.booking_code}`, formHtml(bk.data.data));
                });
        } else {
            Promise.all([Api.guests({ all: true }), Api.rooms({ all: true, status: 'Available' })])
                .then(([guests, rooms]) => {
                    state.guests = guests.data.data.data || [];
                    state.rooms = rooms.data.data.data || [];
                    UI.openForm('New Booking', formHtml(null));
                });
        }
    }

    function formHtml(b) {
        const statuses = ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'];
        const pstatuses = ['Unpaid', 'Partial', 'Paid', 'Refunded'];
        return `
        <form id="bkForm" data-api="${b ? 'updateBooking' : 'createBooking'}" data-id="${b?.id || ''}" data-method="${b ? 'PUT' : 'POST'}">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Guest *</label>
                    <select class="form-select" name="guest_id" required>
                        <option value="">Select guest</option>
                        ${state.guests.map((g) => `<option value="${g.id}" ${b?.guest_id === g.id ? 'selected' : ''}>${UI.esc(g.full_name)} — ${UI.esc(g.email)}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Room *</label>
                    <select class="form-select" name="room_id" id="bkRoomSelect" required onchange="PagesBookings.updateTotal()">
                        <option value="">Select room</option>
                        ${state.rooms.map((r) => `<option value="${r.id}" data-price="${r.price_per_night}" ${b?.room_id === r.id ? 'selected' : ''}>Room ${UI.esc(r.room_number)} — ${UI.esc(r.room_type)} (${UI.money(r.price_per_night)}/nt)</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Check-in date *</label>
                    <input type="date" class="form-control" name="check_in" id="bkCheckIn" value="${b?.check_in || ''}" required onchange="PagesBookings.updateTotal()">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Check-out date *</label>
                    <input type="date" class="form-control" name="check_out" id="bkCheckOut" value="${b?.check_out || ''}" required onchange="PagesBookings.updateTotal()">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Guests *</label>
                    <input type="number" min="1" max="10" class="form-control" name="number_of_guests" value="${b?.number_of_guests ?? 1}" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Booking status *</label>
                    <select class="form-select" name="booking_status">
                        ${statuses.map((s) => `<option ${b?.booking_status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Payment status *</label>
                    <select class="form-select" name="payment_status">
                        ${pstatuses.map((s) => `<option ${b?.payment_status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Total amount</label>
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" step="0.01" min="0" class="form-control" name="total_amount" id="bkTotal" value="${b?.total_amount ?? ''}" placeholder="Auto-calculated">
                    </div>
                </div>
                <div class="col-12">
                    <label class="form-label">Special request</label>
                    <textarea class="form-control" name="special_request" rows="2" placeholder="Any special requests for the stay...">${UI.esc(b?.special_request || '')}</textarea>
                </div>
            </div>
            <div id="bkTotalPreview" class="alert alert-light mt-3 mb-0" style="font-size:.82rem;border:1px dashed var(--line);display:none"></div>
            <div class="text-end mt-4">
                <button type="button" class="btn btn-ghost me-2" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-gold"><i class="fa-solid fa-floppy-disk"></i> ${b ? 'Update booking' : 'Create booking'}</button>
            </div>
        </form>`;
    }

    function updateTotal() {
        const sel = document.getElementById('bkRoomSelect');
        const ci = document.getElementById('bkCheckIn');
        const co = document.getElementById('bkCheckOut');
        const preview = document.getElementById('bkTotalPreview');
        if (!sel || !ci || !co || !preview) return;
        const opt = sel.selectedOptions[0];
        if (!opt || !opt.dataset.price || !ci.value || !co.value) return;
        const price = parseFloat(opt.dataset.price);
        const nights = Math.max(0, Math.round((new Date(co.value) - new Date(ci.value)) / 86400000));
        if (nights <= 0) return;
        const total = price * nights;
        preview.style.display = 'block';
        preview.innerHTML = `<i class="fa-solid fa-calculator me-1"></i><strong>${nights}</strong> night${nights > 1 ? 's' : ''} × <strong>${UI.money(price)}</strong> = <strong style="color:var(--gold-dark)">${UI.money(total)}</strong>`;
        const input = document.getElementById('bkTotal');
        if (input && !input.value) input.value = total.toFixed(2);
    }

    function remove(id, code) {
        UI.confirm({
            title: `Delete booking ${code}?`,
            text: 'This will permanently remove the booking and its payments.',
            confirmText: 'Delete booking',
            onConfirm: async () => {
                try {
                    const res = await Api.deleteBooking(id);
                    UI.toast(res.data.message);
                    load();
                } catch (err) {
                    const res = err.response;
                    UI.toast((res && res.data && res.data.message) || 'Could not delete booking.', 'error');
                }
            },
        });
    }

    async function doCheckIn(id) {
        try {
            const res = await Api.checkIn(id);
            UI.toast(res.data.message);
            load();
            UI.closeForm();
        } catch (err) {
            const res = err.response;
            UI.toast((res && res.data && res.data.message) || 'Check-in failed', 'error');
        }
    }

    async function doCheckOut(id) {
        UI.confirm({
            title: 'Check out this guest?',
            text: 'The booking will be marked checked out and the room will become available.',
            confirmText: 'Check out',
            onConfirm: async () => {
                try {
                    const res = await Api.checkOut(id);
                    UI.toast(res.data.message);
                    load();
                    UI.closeForm();
                } catch (err) {
                    const res = err.response;
                    UI.toast((res && res.data && res.data.message) || 'Check-out failed', 'error');
                }
            },
        });
    }

    function addPayment(bookingId) {
        UI.openForm('Record Payment', `
            <form id="bkPaymentForm" data-api="createPayment" data-method="POST">
                <input type="hidden" name="booking_id" value="${bookingId}">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Payment method *</label>
                        <select class="form-select" name="payment_method" required>
                            <option value="">Select method</option>
                            <option>Cash</option><option>Credit Card</option><option>ABA</option>
                            <option>ACLEDA</option><option>Wing</option><option>Bank Transfer</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Amount ($) *</label>
                        <input type="number" step="0.01" min="0.01" class="form-control" name="amount" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Payment date *</label>
                        <input type="date" class="form-control" name="payment_date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Payment status *</label>
                        <select class="form-select" name="payment_status">
                            <option>Paid</option><option>Partial</option><option>Unpaid</option><option>Refunded</option>
                        </select>
                    </div>
                    <div class="col-12">
                        <label class="form-label">Transaction reference</label>
                        <input class="form-control" name="transaction_reference" placeholder="Optional reference / receipt no.">
                    </div>
                </div>
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-ghost me-2" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-gold"><i class="fa-solid fa-money-bill-wave"></i> Record payment</button>
                </div>
            </form>
        `);
        UI.wireForm('bkPaymentForm', () => { UI.closeForm(); view(bookingId); });
    }

    function openBookingForRoom(roomId, roomNumber, stay) {
        Promise.all([Api.guests({ all: true }), Api.rooms({ all: true })])
            .then(([guests, rooms]) => {
                state.guests = guests.data.data.data || [];
                state.rooms = rooms.data.data.data || [];
                const room = state.rooms.find((r) => r.id === roomId);
                UI.openForm(`Book Room ${roomNumber}`, formHtml(null));
                UI.wireForm('bkForm', () => { UI.closeForm(); load(); });
                setTimeout(() => {
                    const form = document.getElementById('bkForm');
                    if (!form) return;
                    form.elements.room_id.value = roomId;
                    form.elements.check_in.value = stay.check_in;
                    form.elements.check_out.value = stay.check_out;
                    form.elements.number_of_guests.value = stay.guests;
                    if (form.elements.total_amount) form.elements.total_amount.value = '';
                    PagesBookings.updateTotal();
                }, 100);
            });
    }

    function debounce(fn, ms) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    const origOpenForm = openForm;
    openForm = (...args) => {
        origOpenForm(...args);
        UI.wireForm('bkForm', () => { UI.closeForm(); load(); });
    };

    return { render, openForm, view, remove, doCheckIn, doCheckOut, addPayment, updateTotal, clearFilters, openBookingForRoom };
})();
