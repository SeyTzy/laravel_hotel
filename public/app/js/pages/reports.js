const PagesReports = (() => {
    let chart = null;

    function render(root) {
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Reports & Analytics</h2>
                    <p>Business performance, revenue and occupancy insights.</p>
                </div>
            </div>

            <div class="card-soft mb-4">
                <div class="filter-bar">
                    <select class="form-select" id="repPeriod" style="width:160px">
                        <option value="today">Today</option>
                        <option value="this_week">This week</option>
                        <option value="this_month" selected>This month</option>
                        <option value="this_year">This year</option>
                        <option value="custom">Custom range</option>
                    </select>
                    <input type="date" class="form-control d-none" id="repFrom" style="width:150px">
                    <input type="date" class="form-control d-none" id="repTo" style="width:150px">
                    <button class="btn btn-navy" id="repApply"><i class="fa-solid fa-arrow-rotate-right"></i> Apply</button>
                    <button class="btn btn-ghost" id="repExport"><i class="fa-solid fa-download"></i> Export</button>
                    <span class="ms-auto text-muted" style="font-size:.78rem" id="repRange"></span>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-3 col-md-6"><div class="card-soft kpi-tile"><div class="kpi-icon"><i class="fa-solid fa-sack-dollar"></i></div><div class="kpi-value" id="kpiRevenue">—</div><div class="kpi-label">Total revenue</div></div></div>
                <div class="col-lg-3 col-md-6"><div class="card-soft kpi-tile"><div class="kpi-icon"><i class="fa-solid fa-book-open"></i></div><div class="kpi-value" id="kpiBookings">—</div><div class="kpi-label">Total bookings</div></div></div>
                <div class="col-lg-3 col-md-6"><div class="card-soft kpi-tile"><div class="kpi-icon"><i class="fa-solid fa-percent"></i></div><div class="kpi-value" id="kpiOccupancy">—</div><div class="kpi-label">Occupancy rate</div></div></div>
                <div class="col-lg-3 col-md-6"><div class="card-soft kpi-tile"><div class="kpi-icon"><i class="fa-solid fa-money-bill-trend-up"></i></div><div class="kpi-value" id="kpiAvg">—</div><div class="kpi-label">Avg booking value</div></div></div>
            </div>

            <div class="row g-4 mt-0">
                <div class="col-lg-8">
                    <div class="card-soft h-100">
                        <div class="card-head"><div><h3>Daily revenue</h3><span class="sub">Revenue across the selected period</span></div></div>
                        <div class="card-body"><div class="chart-box"><canvas id="repDailyChart"></canvas></div></div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card-soft h-100">
                        <div class="card-head"><div><h3>Payment methods</h3><span class="sub">Collected amount by method</span></div></div>
                        <div class="card-body"><div class="chart-box"><canvas id="repPayChart"></canvas></div></div>
                    </div>
                </div>
            </div>

            <div class="row g-4 mt-0">
                <div class="col-lg-6">
                    <div class="card-soft h-100">
                        <div class="card-head"><div><h3>Most booked rooms</h3><span class="sub">Top 5 rooms by bookings</span></div></div>
                        <div class="card-body">
                            <div class="table-wrap"><table class="table align-middle mb-0">
                                <thead><tr><th>Rank</th><th>Room</th><th>Type</th><th style="text-align:right">Bookings</th></tr></thead>
                                <tbody id="topRooms"></tbody>
                            </table></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card-soft h-100">
                        <div class="card-head"><div><h3>Popular room types</h3><span class="sub">Bookings by room category</span></div></div>
                        <div class="card-body">
                            <div id="roomTypeBars"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('repPeriod').addEventListener('change', () => {
            const custom = document.getElementById('repPeriod').value === 'custom';
            document.getElementById('repFrom').classList.toggle('d-none', !custom);
            document.getElementById('repTo').classList.toggle('d-none', !custom);
        });
        document.getElementById('repApply').addEventListener('click', load);
        document.getElementById('repExport').addEventListener('click', exportJson);
        load();
    }

    function params() {
        const period = document.getElementById('repPeriod').value;
        const p = { period };
        if (period === 'custom') {
            p.date_from = document.getElementById('repFrom').value;
            p.date_to = document.getElementById('repTo').value;
            if (!p.date_from || !p.date_to) {
                UI.toast('Select both custom dates.', 'warning');
                return null;
            }
        }
        return p;
    }

    async function load() {
        const p = params();
        if (!p) return;

        try {
            const res = await Api.reports(p);
            const d = res.data.data;

            document.getElementById('repRange').textContent = `${UI.date(d.period.start)} — ${UI.date(d.period.end)}`;
            document.getElementById('kpiRevenue').textContent = UI.money(d.total_revenue);
            document.getElementById('kpiBookings').textContent = d.total_bookings;
            document.getElementById('kpiOccupancy').textContent = d.occupancy_rate + '%';
            document.getElementById('kpiAvg').textContent = d.total_bookings ? UI.money(d.total_revenue / d.total_bookings) : UI.money(0);

            renderDailyChart(d.daily_revenue);
            renderPayChart(d.payment_statistics);
            renderTopRooms(d.most_booked_rooms);
            renderRoomTypes(d.popular_room_types);
        } catch { /* interceptor */ }
    }

    function renderDailyChart(daily) {
        if (chart) chart.destroy();
        chart = new Chart(document.getElementById('repDailyChart'), {
            type: 'bar',
            data: {
                labels: daily.map((d) => d.date.slice(5)),
                datasets: [{
                    label: 'Revenue',
                    data: daily.map((d) => d.revenue),
                    backgroundColor: 'rgba(201,161,78,.7)',
                    borderRadius: 5,
                    maxBarThickness: 22,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` $${Number(c.raw).toLocaleString()}` } } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#8b98ad', maxTicksLimit: 10 } },
                    y: { beginAtZero: true, grid: { color: '#eef1f7' }, ticks: { font: { size: 10 }, color: '#8b98ad', callback: (v) => '$' + v } },
                },
            },
        });
    }

    function renderPayChart(stats) {
        const filtered = stats.filter((s) => s.amount > 0);
        new Chart(document.getElementById('repPayChart'), {
            type: 'doughnut',
            data: {
                labels: filtered.map((s) => s.method),
                datasets: [{
                    data: filtered.map((s) => s.amount),
                    backgroundColor: ['#16a34a', '#2563eb', '#dc2626', '#be185d', '#4338ca', '#0d9488'],
                    borderWidth: 3, borderColor: '#fff', hoverOffset: 8,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '62%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, boxWidth: 8, font: { size: 11, family: 'Poppins' } } },
                    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${UI.money(c.raw)}` } },
                },
            },
        });
    }

    function renderTopRooms(rooms) {
        const tbody = document.getElementById('topRooms');
        if (!rooms.length) {
            tbody.innerHTML = '<tr class="table-empty"><td colspan="4">No bookings in this period.</td></tr>';
            return;
        }
        tbody.innerHTML = rooms.map((r, i) => `
        <tr>
            <td><span class="badge-pillx b-available">#${i + 1}</span></td>
            <td style="font-weight:600">Room ${UI.esc(r.room_number)}</td>
            <td>${UI.esc(r.room_type)}</td>
            <td style="text-align:right;font-weight:600">${r.bookings}</td>
        </tr>`).join('');
    }

    function renderRoomTypes(types) {
        const wrap = document.getElementById('roomTypeBars');
        if (!types.length) {
            wrap.innerHTML = '<p class="text-muted" style="font-size:.84rem">No data for this period.</p>';
            return;
        }
        const max = Math.max(...types.map((t) => t.bookings), 1);
        wrap.innerHTML = types.map((t) => `
        <div class="mb-3">
            <div class="d-flex justify-content-between mb-1">
                <span style="font-size:.82rem;font-weight:500">${UI.esc(t.room_type)}</span>
                <span class="text-muted" style="font-size:.78rem">${t.bookings} booking${t.bookings === 1 ? '' : 's'}</span>
            </div>
            <div class="progress" style="height:9px;background:#eef1f7;border-radius:6px">
                <div class="progress-bar" style="width:${(t.bookings / max) * 100}%;background:linear-gradient(90deg,var(--gold),var(--gold-dark));border-radius:6px"></div>
            </div>
        </div>`).join('');
    }

    function exportJson() {
        const period = document.getElementById('repPeriod').value;
        const data = { period, exported_at: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `staysphere-report-${period}.json`; a.click();
        UI.toast('Report exported');
    }

    return { render };
})();
