const PagesPayments = (() => {
    let state = { page: 1, search: '', payment_method: '', payment_status: '', date_from: '', date_to: '' };

    function readParams() {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        state.search = params.get('q') || '';
    }

    function render(root) {
        readParams();
        root.innerHTML = `
            <div class="page-head">
                <div class="page-title">
                    <h2>Payments</h2>
                    <p>Track every transaction and payment method across bookings.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-ghost" onclick="PagesPayments.exportCsv()"><i class="fa-solid fa-file-csv"></i> Export</button>
                    <button class="btn btn-gold" onclick="PagesPayments.openForm()"><i class="fa-solid fa-plus"></i> Record payment</button>
                </div>
            </div>

            <div class="card-soft mb-4">
                <div class="filter-bar">
                    <div class="input-group" style="width:230px">
                        <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input class="form-control" id="paySearch" placeholder="Ref, code, guest..." value="${UI.esc(state.search)}">
                    </div>
                    <select class="form-select" id="payMethod" style="width:160px">
                        <option value="">All methods</option>
                        <option>Cash</option><option>Credit Card</option><option>ABA</option>
                        <option>ACLEDA</option><option>Wing</option><option>Bank Transfer</option>
                    </select>
                    <select class="form-select" id="payStatus" style="width:140px">
                        <option value="">Any status</option>
                        <option>Paid</option><option>Partial</option><option>Unpaid</option><option>Refunded</option>
                    </select>
                    <input type="date" class="form-control" id="payFrom" style="width:150px" title="From">
                    <input type="date" class="form-control" id="payTo" style="width:150px" title="To">
                    <span class="ms-auto text-muted" style="font-size:.78rem" id="payTotal"></span>
                </div>
            </div>

            <div class="card-soft">
                <div class="table-wrap">
                    <table class="table align-middle mb-0">
                        <thead>
                            <tr><th>Transaction</th><th>Booking</th><th>Guest</th><th>Method</th><th>Amount</th><th>Date</th><th>Status</th><th style="text-align:right">Actions</th></tr>
                        </thead>
                        <tbody id="payTbody">${UI.skeletonRows(6)}</tbody>
                    </table>
                </div>
            </div>
            <div id="payPagination"></div>
        `;

        document.getElementById('paySearch').addEventListener('input', debounce(() => {
            state.search = document.getElementById('paySearch').value; state.page = 1; load();
        }, 350));
        document.getElementById('payMethod').addEventListener('change', () => { state.payment_method = document.getElementById('payMethod').value; state.page = 1; load(); });
        document.getElementById('payStatus').addEventListener('change', () => { state.payment_status = document.getElementById('payStatus').value; state.page = 1; load(); });
        document.getElementById('payFrom').addEventListener('change', () => { state.date_from = document.getElementById('payFrom').value; state.page = 1; load(); });
        document.getElementById('payTo').addEventListener('change', () => { state.date_to = document.getElementById('payTo').value; state.page = 1; load(); });

        load();
    }

    function params() {
        const p = { per_page: 10, page: state.page };
        if (state.search) p.search = state.search;
        if (state.payment_method) p.payment_method = state.payment_method;
        if (state.payment_status) p.payment_status = state.payment_status;
        if (state.date_from) p.date_from = state.date_from;
        if (state.date_to) p.date_to = state.date_to;
        return p;
    }

    function methodBadge(m) {
        const map = { Cash: 'b-cash', 'Credit Card': 'b-creditcard', ABA: 'b-aba', ACLEDA: 'b-acleda', Wing: 'b-wing', 'Bank Transfer': 'b-banktransfer' };
        return `<span class="badge-pillx ${map[m] || 'b-pending'}">${UI.esc(m)}</span>`;
    }

    async function load() {
        document.getElementById('payTbody').innerHTML = UI.skeletonRows(6);
        try {
            const res = await Api.payments(params());
            const d = res.data.data;
            const meta = d.meta;
            let total = 0;
            d.data.forEach((p) => { if (p.payment_status !== 'Refunded') total += p.amount; });
            document.getElementById('payTotal').innerHTML = `<i class="fa-solid fa-sack-dollar me-1" style="color:var(--gold-dark)"></i>${d.data.length} shown · ${UI.money(total)} total`;

            if (!d.data.length) {
                document.getElementById('payTbody').innerHTML = `
                <tr class="table-empty"><td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
                        <h4>No payments found</h4>
                        <p>No transactions match your filters. Record a new payment to get started.</p>
                        <button class="btn btn-gold" onclick="PagesPayments.openForm()"><i class="fa-solid fa-plus"></i> Record payment</button>
                    </div>
                </td></tr>`;
                document.getElementById('payPagination').innerHTML = '';
                return;
            }

            document.getElementById('payTbody').innerHTML = d.data.map(row).join('');
            document.getElementById('payPagination').replaceChildren(UI.paginate(meta, (pg) => { state.page = pg; load(); }));
        } catch { /* interceptor */ }
    }

    function row(p) {
        const b = p.booking;
        return `
        <tr>
            <td class="mono" style="color:var(--gold-dark);font-size:.76rem">${UI.esc(p.transaction_reference || '—')}<div class="cell-sub">${UI.dateTime(p.created_at)}</div></td>
            <td class="mono">${b ? UI.esc(b.booking_code) : '—'}</td>
            <td style="font-weight:500">${b && b.guest ? UI.esc(b.guest.full_name) : '—'}</td>
            <td>${methodBadge(p.payment_method)}</td>
            <td style="font-weight:600">${UI.money(p.amount)}</td>
            <td>${UI.date(p.payment_date)}</td>
            <td>${UI.statusBadge('payment', p.payment_status)}</td>
            <td style="text-align:right;white-space:nowrap">
                <button class="btn btn-ghost btn-icon" title="Edit" onclick="PagesPayments.openForm(${p.id})"><i class="fa-solid fa-pen" style="color:var(--gold-dark)"></i></button>
                <button class="btn btn-ghost btn-icon" title="Delete" onclick="PagesPayments.remove(${p.id})"><i class="fa-solid fa-trash" style="color:var(--red)"></i></button>
            </td>
        </tr>`;
    }

    function openForm(id = null) {
        if (id) {
            Api.payments({ all: true }).then((res) => {
                const pay = res.data.data.data.find((p) => p.id === id);
                if (pay) UI.openForm('Edit Payment', formHtml(pay));
            });
        } else {
            Api.bookings({ all: true, booking_status: '' }).then((res) => {
                window._bkOptions = res.data.data.data || [];
                UI.openForm('Record Payment', formHtml(null));
            }).catch(() => UI.openForm('Record Payment', formHtml(null)));
        }
    }

    function formHtml(p) {
        const methods = ['Cash', 'Credit Card', 'ABA', 'ACLEDA', 'Wing', 'Bank Transfer'];
        return `
        <form id="payForm" data-api="${p ? 'updatePayment' : 'createPayment'}" data-id="${p?.id || ''}" data-method="${p ? 'PUT' : 'POST'}">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Booking *</label>
                    <select class="form-select" name="booking_id" required>
                        <option value="">Select booking</option>
                        ${(window._bkOptions || []).map((b) => `<option value="${b.id}" ${p?.booking_id === b.id ? 'selected' : ''}>${UI.esc(b.booking_code)} — ${b.guest ? UI.esc(b.guest.full_name) : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Payment method *</label>
                    <select class="form-select" name="payment_method" required>
                        <option value="">Select method</option>
                        ${methods.map((m) => `<option ${p?.payment_method === m ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Amount ($) *</label>
                    <input type="number" step="0.01" min="0.01" class="form-control" name="amount" value="${p?.amount ?? ''}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Payment date *</label>
                    <input type="date" class="form-control" name="payment_date" value="${p?.payment_date || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Payment status *</label>
                    <select class="form-select" name="payment_status">
                        <option ${p?.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
                        <option ${p?.payment_status === 'Partial' ? 'selected' : ''}>Partial</option>
                        <option ${p?.payment_status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                        <option ${p?.payment_status === 'Refunded' ? 'selected' : ''}>Refunded</option>
                    </select>
                </div>
                <div class="col-12">
                    <label class="form-label">Transaction reference</label>
                    <input class="form-control" name="transaction_reference" value="${UI.esc(p?.transaction_reference || '')}">
                </div>
            </div>
            <div class="text-end mt-4">
                <button type="button" class="btn btn-ghost me-2" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-gold"><i class="fa-solid fa-floppy-disk"></i> ${p ? 'Update payment' : 'Record payment'}</button>
            </div>
        </form>`;
    }

    function remove(id) {
        UI.confirm({
            title: 'Delete this payment?',
            text: 'The booking\'s payment status will be recalculated.',
            confirmText: 'Delete payment',
            onConfirm: async () => {
                try {
                    const res = await Api.deletePayment(id);
                    UI.toast(res.data.message);
                    load();
                } catch (err) {
                    const res = err.response;
                    UI.toast((res && res.data && res.data.message) || 'Could not delete payment.', 'error');
                }
            },
        });
    }

    async function exportCsv() {
        try {
            const res = await Api.payments({ all: true });
            const rows = res.data.data.data || [];
            let csv = 'Reference,Booking,Method,Amount,Date,Status\n';
            rows.forEach((p) => { csv += `${p.transaction_reference || ''},${p.booking ? p.booking.booking_code : ''},${p.payment_method},${p.amount},${p.payment_date},${p.payment_status}\n`; });
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'payments.csv'; a.click();
            UI.toast('Payments exported to CSV');
        } catch { UI.toast('Export failed', 'error'); }
    }

    function debounce(fn, ms) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    const origOpenForm = openForm;
    openForm = (...args) => {
        origOpenForm(...args);
        UI.wireForm('payForm', () => { UI.closeForm(); load(); });
    };

    return { render, openForm, remove, exportCsv };
})();
