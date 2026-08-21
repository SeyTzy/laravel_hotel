const PagesDashboard = (() => {
    let charts = [];

    function statCard(icon, color, label, value, suffix = '') {
        return `
        <div class="stat-card">
            <div class="stat-icon ${color}"><i class="fa-solid ${icon}"></i></div>
            <div class="stat-meta">
                <h4><span class="count-value" data-target="${value}" data-suffix="${suffix}">0</span></h4>
                <p>${label}</p>
            </div>
        </div>`;
    }

    function render(root) {
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Welcome back, ${App.getUser()?.name?.split(' ')[0] || 'Admin'} <i class="fa-solid fa-hand-sparkles" style="color:var(--gold)"></i></h2>
                    <p>Here's what's happening at StaySphere today.</p>
                </div>
                <div class="page-actions">
                    <a href="#/availability" class="btn btn-ghost"><i class="fa-solid fa-magnifying-glass"></i> Check availability</a>
                    <a href="#/bookings" class="btn btn-gold"><i class="fa-solid fa-plus"></i> New booking</a>
                </div>
            </div>
            <div class="stats-grid" id="dashStats">
                ${Array.from({ length: 9 }).map(() => '<div class="skeleton skel-card" style="height:96px"></div>').join('')}
            </div>

            <div class="row g-4 mt-1">
                <div class="col-lg-8">
                    <div class="card-soft h-100">
                        <div class="card-head">
                            <div><h3>Revenue overview</h3><span class="sub">Monthly revenue · last 12 months</span></div>
                            <span class="badge-pillx b-paid"><i class="fa-solid fa-circle"></i>USD</span>
                        </div>
                        <div class="card-body"><div class="chart-box"><canvas id="revChart"></canvas></div></div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card-soft h-100">
                        <div class="card-head"><div><h3>Booking status</h3><span class="sub">Distribution across all bookings</span></div></div>
                        <div class="card-body"><div class="chart-box"><canvas id="statusChart"></canvas></div></div>
                    </div>
                </div>
            </div>

            <div class="row g-4 mt-0">
                <div class="col-lg-6">
                    <div class="card-soft h-100">
                        <div class="card-head"><div><h3>Bookings trend</h3><span class="sub">Bookings created per month</span></div></div>
                        <div class="card-body"><div class="chart-box sm"><canvas id="bookingChart"></canvas></div></div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card-soft h-100">
                        <div class="card-head"><div><h3>Room occupancy</h3><span class="sub">Monthly occupancy rate %</span></div></div>
                        <div class="card-body"><div class="chart-box sm"><canvas id="occupancyChart"></canvas></div></div>
                    </div>
                </div>
            </div>
        `;

        loadStats();
        loadCharts();
    }

    function destroyCharts() {
        charts.forEach((c) => c.destroy());
        charts = [];
    }

    async function loadStats() {
        try {
            const res = await Api.dashboard();
            const s = res.data.data;
            const wrap = document.getElementById('dashStats');
            wrap.innerHTML =
                statCard('fa-bed', 'gold', 'Total Rooms', s.total_rooms) +
                statCard('fa-circle-check', 'green', 'Available Rooms', s.available_rooms) +
                statCard('fa-person-walking-arrow-right', 'red', 'Occupied Rooms', s.occupied_rooms) +
                statCard('fa-calendar-check', 'amber', 'Reserved Rooms', s.reserved_rooms) +
                statCard('fa-screwdriver-wrench', 'purple', 'Maintenance Rooms', s.maintenance_rooms) +
                statCard('fa-user-group', 'blue', 'Total Guests', s.total_guests) +
                statCard('fa-book-open', 'teal', 'Active Bookings', s.active_bookings) +
                statCard('fa-door-open', 'pink', 'Check-ins Today', s.today_check_ins) +
                statCard('fa-door-closed', 'red', 'Check-outs Today', s.today_check_outs) +
                statCard('fa-sack-dollar', 'gold', 'Revenue This Month', s.monthly_revenue, '');
            wrap.querySelectorAll('.count-value').forEach((el) => {
                UI.countUp(el, parseFloat(el.dataset.target), el.dataset.suffix);
            });
        } catch { /* handled by interceptor */ }
    }

    async function loadCharts() {
        try {
            const res = await Api.dashboardCharts();
            const d = res.data.data;
            destroyCharts();

            const labels = d.monthly_revenue.map((m) => m.month);

            charts.push(new Chart(document.getElementById('revChart'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Revenue',
                        data: d.monthly_revenue.map((m) => m.revenue),
                        borderColor: '#c9a14e',
                        backgroundColor: (ctx) => {
                            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                            g.addColorStop(0, 'rgba(201,161,78,.28)');
                            g.addColorStop(1, 'rgba(201,161,78,0)');
                            return g;
                        },
                        fill: true,
                        tension: .4,
                        borderWidth: 2.5,
                        pointBackgroundColor: '#c9a14e',
                        pointRadius: 3.5,
                    }],
                },
                options: baseOptions('$'),
            }));

            const statusColors = { Pending: '#d97706', Confirmed: '#2563eb', 'Checked In': '#16a34a', 'Checked Out': '#94a3b8', Cancelled: '#dc2626' };
            charts.push(new Chart(document.getElementById('statusChart'), {
                type: 'doughnut',
                data: {
                    labels: d.status_distribution.map((x) => x.status),
                    datasets: [{
                        data: d.status_distribution.map((x) => x.count),
                        backgroundColor: d.status_distribution.map((x) => statusColors[x.status] || '#94a3b8'),
                        borderWidth: 3,
                        borderColor: '#fff',
                        hoverOffset: 8,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '62%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, boxWidth: 8, font: { family: 'Poppins', size: 11 } } },
                        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}` } },
                    },
                },
            }));

            charts.push(new Chart(document.getElementById('bookingChart'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Bookings',
                        data: d.bookings_by_month.map((m) => m.bookings),
                        backgroundColor: 'rgba(37,99,235,.75)',
                        borderRadius: 7,
                        maxBarThickness: 26,
                    }],
                },
                options: baseOptions(''),
            }));

            charts.push(new Chart(document.getElementById('occupancyChart'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Occupancy %',
                        data: d.occupancy_rate.map((m) => m.rate),
                        borderColor: '#16a34a',
                        backgroundColor: (ctx) => {
                            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 240);
                            g.addColorStop(0, 'rgba(22,163,74,.25)');
                            g.addColorStop(1, 'rgba(22,163,74,0)');
                            return g;
                        },
                        fill: true,
                        tension: .4,
                        borderWidth: 2.5,
                        pointBackgroundColor: '#16a34a',
                        pointRadius: 3.5,
                    }],
                },
                options: baseOptions('%'),
            }));
        } catch { /* handled */ }
    }

    function baseOptions(prefix) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${prefix}${Number(c.raw).toLocaleString()}` }, backgroundColor: '#0b1526', padding: 12, cornerRadius: 10, titleFont: { family: 'Poppins' }, bodyFont: { family: 'Poppins' } },
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Poppins', size: 10.5 }, color: '#8b98ad', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
                y: { beginAtZero: true, grid: { color: '#eef1f7' }, ticks: { font: { family: 'Poppins', size: 10.5 }, color: '#8b98ad', callback: (v) => (prefix === '$' ? '$' + v : v + prefix) } },
            },
        };
    }

    return { render };
})();
