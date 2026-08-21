const PagesAvailability = (() => {
    let lastResult = null;

    function render(root) {
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Room Availability</h2>
                    <p>Search available rooms for any stay period and book instantly.</p>
                </div>
            </div>

            <div class="availability-search">
                <div>
                    <label class="form-label">Check-in date</label>
                    <input type="date" class="form-control" id="avCheckIn" value="${today()}">
                </div>
                <div>
                    <label class="form-label">Check-out date</label>
                    <input type="date" class="form-control" id="avCheckOut" value="${inDays(2)}">
                </div>
                <div>
                    <label class="form-label">Guests</label>
                    <select class="form-select" id="avGuests">
                        ${[1,2,3,4,5,6].map((n) => `<option>${n}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="form-label">Room type</label>
                    <select class="form-select" id="avType">
                        <option value="">All types</option>
                        <option>Single</option><option>Double</option><option>Twin</option>
                        <option>Deluxe</option><option>Suite</option><option>Presidential</option>
                    </select>
                </div>
                <button class="btn btn-gold" id="avSearchBtn"><i class="fa-solid fa-magnifying-glass"></i> Search rooms</button>
            </div>

            <div id="avResult" class="mt-4"></div>
        `;

        document.getElementById('avSearchBtn').addEventListener('click', search);
        document.getElementById('avCheckIn').addEventListener('change', () => {
            const ci = document.getElementById('avCheckIn');
            const co = document.getElementById('avCheckOut');
            if (co.value && new Date(co.value) <= new Date(ci.value)) {
                co.value = inDaysFrom(ci.value, 1);
            }
        });
        search();
    }

    function today() { return new Date().toISOString().split('T')[0]; }
    function inDays(n) { return new Date(Date.now() + n * 86400000).toISOString().split('T')[0]; }
    function inDaysFrom(dateStr, n) { return new Date(new Date(dateStr).getTime() + n * 86400000).toISOString().split('T')[0]; }

    async function search() {
        const el = document.getElementById('avResult');
        el.innerHTML = '<div class="row g-4"><div class="col-12"><div class="skeleton skel-card" style="height:120px"></div></div><div class="col-12"><div class="skeleton skel-card" style="height:300px"></div></div></div>';
        const params = {
            check_in: document.getElementById('avCheckIn').value,
            check_out: document.getElementById('avCheckOut').value,
            guests: document.getElementById('avGuests').value,
        };
        const type = document.getElementById('avType').value;
        if (type) params.room_type = type;

        if (!params.check_in || !params.check_out) {
            UI.toast('Please select both check-in and check-out dates.', 'warning');
            return;
        }
        if (new Date(params.check_out) <= new Date(params.check_in)) {
            UI.toast('Check-out must be after check-in.', 'warning');
            return;
        }

        try {
            const res = await Api.availability(params);
            const d = res.data.data;
            lastResult = { ...params, nights: d.nights };

            const nights = d.nights;
            const dateRange = `${UI.date(d.check_in)} — ${UI.date(d.check_out)} (${nights} night${nights > 1 ? 's' : ''})`;

            if (!d.rooms.length) {
                el.innerHTML = `
                <div class="card-soft mt-4">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fa-solid fa-magnifying-glass-minus"></i></div>
                        <h4>No rooms available</h4>
                        <p>No rooms match this search for ${dateRange} with ${d.guests} guest${d.guests > 1 ? 's' : ''}. Try different dates or a smaller party.</p>
                    </div>
                </div>`;
                return;
            }

            el.innerHTML = `
            <div class="card-soft mt-4">
                <div class="card-head">
                    <div><h3><i class="fa-solid fa-bed me-1" style="color:var(--gold-dark)"></i> ${d.rooms.length} room${d.rooms.length > 1 ? 's' : ''} available</h3><span class="sub">${dateRange} · ${d.guests} guest${d.guests > 1 ? 's' : ''}</span></div>
                </div>
                <div class="card-body">
                    <div class="room-grid">${d.rooms.map((r) => roomCard(r, nights)).join('')}</div>
                </div>
            </div>`;
        } catch (err) {
            const res = err.response;
            const msg = (res && res.data && res.data.errors)
                ? Object.values(res.data.errors).flat()[0]
                : ((res && res.data && res.data.message) || 'Search failed');
            el.innerHTML = `<div class="card-soft mt-4"><div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h4>Search issue</h4><p>${msg}</p></div></div>`;
        }
    }

    function roomCard(r, nights) {
        const total = r.price_per_night * nights;
        return `
        <div class="room-card">
            <div class="img-wrap">
                ${r.image_url ? `<img src="${r.image_url}" alt="Room ${UI.esc(r.room_number)}" loading="lazy">` : '<div style="height:100%;display:grid;place-items:center;background:#eef1f7"><i class="fa-solid fa-image" style="font-size:2rem;color:#b7c2d4"></i></div>'}
                <span class="status-chip"><span class="badge-pillx b-available"><i class="fa-solid fa-circle"></i>Available</span></span>
                <span class="price-chip">${UI.money(r.price_per_night)} / night</span>
            </div>
            <div class="body">
                <div class="room-number">Room ${UI.esc(r.room_number)}</div>
                <div class="room-type">${UI.esc(r.room_type)} · Floor ${UI.esc(r.floor)}</div>
                <div class="room-details">
                    <span><i class="fa-solid fa-user-group"></i>Up to ${r.capacity}</span>
                    <span><i class="fa-solid fa-calculator"></i>${nights} night${nights > 1 ? 's' : ''}</span>
                    <span><i class="fa-solid fa-tag"></i>${UI.money(total)} total</span>
                </div>
            </div>
            <div class="actions">
                <button class="btn btn-gold flex-fill" onclick="PagesAvailability.book(${r.id}, '${UI.esc(r.room_number)}')"><i class="fa-solid fa-book"></i> Book now</button>
            </div>
        </div>`;
    }

    function book(roomId, roomNumber) {
        if (!lastResult) { UI.toast('Please search first.', 'warning'); return; }
        PagesBookings.openBookingForRoom(roomId, roomNumber, lastResult);
    }

    return { render, book, search };
})();
