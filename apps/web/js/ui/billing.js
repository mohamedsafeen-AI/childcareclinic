import { apiFetch } from '../api.js';

// Billing module: renders patient invoices/bills from appointment records.
// Supports search-by-name, filter tabs (All/Paid/Pending), invoice printing,
// and auto-refresh when a payment completes elsewhere in the app.

let allBills = [];
let currentFilter = 'all';
let searchTerm = '';

const CLINIC = {
    name: 'Child Care Clinic',
    address: '20/14, Opp. to C.S.I Church, North Street, Kilakarai, Ramanathapuram-623517',
    phone: '04567-243111 / +91 98039 20203',
};

function getEl(id) {
    return document.getElementById(id);
}

// Normalise a bill from an appointment record (~ idempotent across API/local shapes).
function toBill(a) {
    return {
        id: a.id || a.appointment_id || '',
        childName: a.child_name || a.childName || 'Patient',
        appointmentId: a.id || a.appointment_id || (a.appointment_id || ''),
        date: a.appointment_date || a.date || '-',
        time: a.appointment_time || a.time || '',
        amount: Number(a.fee_amount != null ? a.fee_amount : (a.amount || 250)),
        status: (a.payment_status || a.paymentStatus || 'pending').toLowerCase(),
        txnId: a.upi_transaction_id || a.upiTransactionId || '',
        paidAt: a.paid_at || a.paidAt || null,
    };
}

function formatCurrency(n) {
    const num = Number(n) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
}

function formatDate(d) {
    if (!d || d === '-') return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderSummary(bills) {
    const total = bills.reduce((s, b) => s + b.amount, 0);
    const paidCount = bills.filter(b => b.status === 'paid').length;
    const pendingCount = bills.length - paidCount;

    const totalEl = getEl('billing-total');
    const paidEl = getEl('billing-paid');
    const pendingEl = getEl('billing-pending');
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (paidEl) paidEl.textContent = String(paidCount);
    if (pendingEl) pendingEl.textContent = String(pendingCount);
}

function renderTable(bills) {
    const tbody = getEl('billing-table-body');
    const countEl = getEl('billing-count');
    if (!tbody) return;

    if (countEl) {
        countEl.textContent = `${bills.length} bill${bills.length === 1 ? '' : 's'}`;
    }

    if (bills.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        </div>
                        <div class="empty-state-title">No bills found</div>
                        <div class="empty-state-sub">Try a different filter or search term.</div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = bills.map(b => {
        const isPaid = b.status === 'paid';
        const payBadge = isPaid
            ? `<span class="badge-paid">Paid</span>`
            : `<span class="badge-pending">Pending</span>`;

        const invoiceBtn = `
            <button class="btn-invoice" data-invoice-id="${b.id}" data-appt-id="${b.appointmentId}"
                data-invoice-date="${b.date}" data-pay-status="${isPaid ? 'paid' : 'pending'}">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Invoice
            </button>`;

return `
            <tr data-bill-status="${isPaid ? 'paid' : 'pending'}">
                <td data-label="Patient Name"><strong>${b.childName}</strong></td>
                <td data-label="Appointment ID"><code class="bill-id">${b.appointmentId ? b.appointmentId.slice(0, 8) : '-'}</code></td>
                <td data-label="Date">${formatDate(b.date)}${b.time ? ' · ' + b.time : ''}</td>
                <td data-label="Amount">${formatCurrency(b.amount)}</td>
                <td data-label="Payment Status">${payBadge}</td>
                <td data-label="">${invoiceBtn}</td>
            </tr>`;
    }).join('');

    // Attach invoice handlers
    tbody.querySelectorAll('[data-invoice-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.invoiceId;
            const bill = allBills.find(x => String(x.id) === String(id));
            if (bill) printInvoice(bill);
        });
    });
}

function applyFilters() {
    let bills = allBills;

    if (currentFilter !== 'all') {
        bills = bills.filter(b => b.status === currentFilter);
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        bills = bills.filter(b => b.childName.toLowerCase().includes(term));
    }

    renderSummary(allBills);
    renderTable(bills);
}

function printInvoice(bill) {
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) {
        alert('Please allow pop-ups to download/print the invoice.');
        return;
    }

    const invoiceNo = `INV-${(bill.appointmentId || bill.id || 'NA').slice(0, 8).toUpperCase()}`;
    const isPaid = bill.status === 'paid';
    const statusHtml = isPaid
        ? `<span style="color:#059669;font-weight:700;">PAID</span>`
        : `<span style="color:#b45309;font-weight:700;">PENDING</span>`;

    const txnRow = bill.txnId
        ? `<tr><td style="padding:6px 10px;border:1px solid #ddd;">UPI Transaction ID</td><td style="padding:6px 10px;border:1px solid #ddd;">${bill.txnId}</td></tr>`
        : '';

    const paidRow = bill.paidAt
        ? `<tr><td style="padding:6px 10px;border:1px solid #ddd;">Paid On</td><td style="padding:6px 10px;border:1px solid #ddd;">${formatDate(bill.paidAt)}</td></tr>`
        : '';

    win.document.write(`
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <title>Invoice ${invoiceNo}</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; color: #0f2a43; margin: 0; padding: 24px; }
                .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 14px; }
                .clinic-name { font-size: 22px; font-weight: 800; }
                .clinic-sub { font-size: 12px; color: #5c6f88; margin-top: 4px; }
                .invoice-title { text-align: right; font-size: 20px; font-weight: 800; color: #0d9488; }
                .invoice-no { font-size: 12px; color: #5c6f88; text-align: right; margin-top: 4px; }
                h2 { margin: 22px 0 10px; font-size: 15px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th, td { text-align: left; }
                th { background: #e6f7f5; }
                .total-row td { font-size: 16px; font-weight: 800; }
                .foot { margin-top: 26px; border-top: 1px solid #ccd7e4; padding-top: 12px; font-size: 12px; color: #5c6f88; }
                .no-print { margin-top: 22px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="head">
                <div>
                    <div class="clinic-name">${CLINIC.name}</div>
                    <div class="clinic-sub">${CLINIC.address}</div>
                    <div class="clinic-sub">Phone: ${CLINIC.phone}</div>
                </div>
                <div>
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-no">${invoiceNo}</div>
                </div>
            </div>

            <h2>Bill To</h2>
            <table>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;width:40%;">Patient Name</td><td style="padding:6px 10px;border:1px solid #ddd;"><strong>${bill.childName}</strong></td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Appointment ID</td><td style="padding:6px 10px;border:1px solid #ddd;">${bill.appointmentId || '-'}</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Date</td><td style="padding:6px 10px;border:1px solid #ddd;">${formatDate(bill.date)}</td></tr>
                ${txnRow}
                ${paidRow}
            </table>

            <h2>Charges</h2>
            <table>
                <tr><th style="padding:8px 10px;border:1px solid #ddd;">Description</th><th style="padding:8px 10px;border:1px solid #ddd;text-align:right;">Amount</th></tr>
                <tr class="total-row">
                    <td style="padding:8px 10px;border:1px solid #ddd;">Consultation Fee</td>
                    <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${formatCurrency(bill.amount)}</td>
                </tr>
                <tr>
                    <td style="padding:8px 10px;border:1px solid #ddd;">Payment Status</td>
                    <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${statusHtml}</td>
                </tr>
            </table>

            <div class="foot">
                <div>Thank you for choosing ${CLINIC.name}.</div>
                <div style="margin-top:4px;">This is a computer-generated invoice.</div>
            </div>

            <div class="no-print">
                <button onclick="window.print()" style="padding:10px 18px;font-size:14px;font-weight:700;background:#0d9488;color:#fff;border:none;border-radius:8px;cursor:pointer;">Print / Save as PDF</button>
                <button onclick="window.close()" style="padding:10px 18px;font-size:14px;font-weight:700;background:#eef2f7;color:#0f2a43;border:1px solid #ccd7e4;border-radius:8px;cursor:pointer;margin-left:8px;">Close</button>
            </div>
        </body>
        </html>
    `);
    win.document.close();
}

export async function loadBillingPage() {
    try {
        let appts = [];
        try {
            const res = await apiFetch('/appointments');
            const list = Array.isArray(res) ? res : (res.appointments || res.data || []);
            appts = list;
        } catch (e) {
            console.warn('Billing API fetch failed, using local fallback', e);
            appts = JSON.parse(localStorage.getItem('appointments')) || [];
        }

        allBills = appts.map(toBill);
        applyFilters();

        // Wire up search + filter controls (idempotent).
        const searchInput = getEl('billing-search');
        if (searchInput) {
            searchInput.value = searchTerm;
            searchInput.oninput = (e) => {
                searchTerm = e.target.value.trim();
                applyFilters();
            };
        }

        const chips = document.querySelectorAll('#billing-filters .chip');
        chips.forEach(chip => {
            chip.onclick = () => {
                currentFilter = chip.dataset.filter || 'all';
                chips.forEach(c => c.classList.toggle('is-active', c === chip));
                applyFilters();
            };
        });
    } catch (err) {
        console.error('Billing page error:', err);
        const tbody = getEl('billing-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-title">Failed to load bills</div><div class="empty-state-sub">Please try again later.</div></div></td></tr>`;
        }
    }
}

// Real-time sync: refresh when a payment completes or appointments change.
window.addEventListener('appointments:payment_updated', () => {
    loadBillingPage();
});
window.addEventListener('appointments:changed', () => {
    loadBillingPage();
});

window.__loadBillingPage = loadBillingPage;
