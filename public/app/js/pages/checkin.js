const PagesCheckin = (() => {
    function render(root) {
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Check-in / Check-out</h2>
                    <p>Manage today's arrivals, departures and in-house guests.</p>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-6">
                    <div class="card-soft h-100">
                        <div class="card-head">
                            <div><h3><i class="fa-solid fa-arrow-right-to-bracket me-1" style="color:var(--green)"></i> Today's check-ins</h3><span class="sub">Expected arrivals</span></div>
                            <span class="badge-pillx b-checkedin" id="ciCount">0</span>
                        </div>
                        <div class="table-wrap"><table class="table align-middle mb-0">
                            <thead><tr><th>Booking</th><th>Guest</th><th>Room</th><th>Status</th><th style="text-align:right">Action</th></tr></thead>
                            <tbody id="ciTbody">${UI.skeletonRows(3)}</tbody>
                        </table></div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card-soft h-100">
                        <div class="card-head">
                            <div><h3><i class="fa-solid fa-arrow-right-from-bracket me-1" style="color:var(--red)"></i> Today's check-outs</h3><span class="sub">Expected departures</span></div>
                            <span class="badge-pillx b-checkedout" id="coCount">0</span>
                        </div>
                        <div class="table-wrap"><table class="table align-middle mb-0">
                            <thead><tr><th>Booking</th><th>Guest</th><th>Room</th><th>Status</th><th style="text-align:right">Action</th></tr></thead>
                            <tbody id="coTbody">${UI.skeletonRows(3)}</tbody>
                        </table></div>
                    </div>
                </div>
            </div>

            <div class="card-soft mt-4">
                <div class="card-head">
                    <div><h3><i class="fa-solid fa-users-between-lines me-1" style="color:var(--gold-dark)"></i> In-house & upcoming guests</h3><span class="sub">Active and reserved bookings</span></div>
                    <a href="#/bookings" class="btn btn-ghost btn-sm">View all bookings</a>
                </div>
                <div class="table-wrap"><table class="table align-middle mb-0">
                    <thead><tr><th>Booking</th><th>Guest</th><th>Room</th><th>Stay</th><th>Status</th><th style="text-align:right">Action</th></tr></thead>
                    <tbody id="activeTbody">${UI.skeletonRows(3)}</tbody>
                </table></div>
            </div>
        `;

        load();
    }

    async function load() {
        try {
            const res = await Api.todayActivity();
            const d = res.data.data;
            document.getElementById('ciCount').textContent = d.check_ins.length;
            document.getElementById('coCount').textContent = d.check_outs.length;

            renderList('ciTbody', d.check_ins, 'in');
            renderList('coTbody', d.check_outs, 'out');

            const active = await Api.bookings({ booking_status: '', per_page: 10 });
            const list = active.data.data.data.filter((b) => ['Pending', 'Confirmed', 'Checked In'].includes(b.booking_status));
            renderActive(list);
        } catch { /* interceptor */ }
    }

    function renderList(tbodyId, bookings, type) {
        const tbody = document.getElementById(tbodyId);
        if (!bookings.length) {
            tbody.innerHTML = `<tr class="table-empty"><td colspan="5"><div class="empty-state" style="padding:28px 10px">
                <div class="empty-icon" style="width:60px;height:60px;font-size:1.4rem"><i class="fa-solid ${type === 'in' ? 'fa-arrow-right-to-bracket' : 'fa-arrow-right-from-bracket'}"></i></div>
                <h4 style="font-size:.9rem">No ${type === 'in' ? 'check-ins' : 'check-outs'} today</h4>
                <p style="font-size:.76rem">All clear for this time slot.</p>
            </div></td></tr>`;
            return;
        }
        tbody.innerHTML = bookings.map((b) => `
        <tr>
            <td><span class="mono" style="color:var(--gold-dark);font-size:.76rem">${UI.esc(b.booking_code)}</span></td>
            <td style="font-weight:500">${b.guest ? UI.esc(b.guest.full_name) : '—'}</td>
            <td>${b.room ? `<span class="badge-pillx b-available"><i class="fa-solid fa-bed"></i>${UI.esc(b.room.room_number)}</span>` : '—'}</td>
            <td>${UI.statusBadge('booking', b.booking_status)}</td>
            <td style="text-align:right">
                ${type === 'in' && (b.booking_status === 'Confirmed' || b.booking_status === 'Pending')
                    ? `<button class="btn btn-navy btn-sm" onclick="PagesCheckin.checkIn(${b.id})"><i class="fa-solid fa-door-open"></i> Check in</button>`
                    : type === 'out' && b.booking_status === 'Checked In'
                        ? `<button class="btn btn-danger btn-sm" onclick="PagesCheckin.checkOut(${b.id})"><i class="fa-solid fa-door-closed"></i> Check out</button>`
                        : '<span class="text-muted" style="font-size:.76rem">—</span>'}
            </td>
        </tr>`).join('');
    }

    function renderActive(list) {
        const tbody = document.getElementById('activeTbody');
        if (!list.length) {
            tbody.innerHTML = `<tr class="table-empty"><td colspan="6"><div class="empty-state" style="padding:28px 10px">
                <div class="empty-icon" style="width:60px;height:60px;font-size:1.4rem"><i class="fa-solid fa-bed"></i></div>
                <h4 style="font-size:.9rem">No active bookings</h4>
            </div></td></tr>`;
            return;
        }
        tbody.innerHTML = list.map((b) => `
        <tr>
            <td><span class="mono" style="color:var(--gold-dark);font-size:.76rem">${UI.esc(b.booking_code)}</span></td>
            <td style="font-weight:500">${b.guest ? UI.esc(b.guest.full_name) : '—'}<div class="cell-sub">${b.guest ? UI.esc(b.guest.email) : ''}</div></td>
            <td>${b.room ? `Room ${UI.esc(b.room.room_number)}<div class="cell-sub">${UI.esc(b.room.room_type)}</div>` : '—'}</td>
            <td>${UI.date(b.check_in)}<div class="cell-sub">→ ${UI.date(b.check_out)}</div></td>
            <td>${UI.statusBadge('booking', b.booking_status)}</td>
            <td style="text-align:right">
                <button class="btn btn-ghost btn-sm" onclick="PagesCheckin.viewBooking(${b.id})"><i class="fa-solid fa-eye"></i> View</button>
            </td>
        </tr>`).join('');
    }

    async function checkIn(id) {
        try {
            const res = await Api.checkIn(id);
            UI.toast(res.data.message);
            load();
        } catch (err) {
            const res = err.response;
            UI.toast((res && res.data && res.data.message) || 'Check-in failed', 'error');
        }
    }

    function checkOut(id) {
        UI.confirm({
            title: 'Check out this guest?',
            text: 'The room will become available after check-out.',
            confirmText: 'Check out',
            onConfirm: async () => {
                try {
                    const res = await Api.checkOut(id);
                    UI.toast(res.data.message);
                    load();
                } catch (err) {
                    const res = err.response;
                    UI.toast((res && res.data && res.data.message) || 'Check-out failed', 'error');
                }
            },
        });
    }

    function viewBooking(id) {
        PagesBookings.view(id);
    }

    return { render, checkIn, checkOut, viewBooking };
})();
