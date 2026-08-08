import { apiFetch } from '../api.js';

let lastAppointmentCount = 0;
let lastChildrenCount = 0;
let pollTimer = null;

// Small helper to format a timestamp for the activity timeline,
// showing a friendly relative/date label under the "Now" entry.
function formatTimelineTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMins = Math.floor((now - d) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export async function loadDashboard() {
    try {
        // Fetch appointments from API
        let appointments = [];
        try {
            const apptRes = await apiFetch('/dashboard');
            appointments = apptRes.appointments || [];
        } catch (e) {
            console.warn('Dashboard API fetch failed, using local fallback', e);
            appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        }

        // Fetch children from API
        let children = [];
        try {
            const childRes = await apiFetch('/children');
            children = childRes.children || [];
        } catch (e) {
            console.warn('Children API fetch failed, using local fallback', e);
            children = JSON.parse(localStorage.getItem('children')) || [];
        }

        const totalChildren = children.length;
        const totalAppointments = appointments.length;

        // Detect new appointments for toast notification
        if (lastAppointmentCount > 0 && appointments.length > lastAppointmentCount) {
            const newCount = appointments.length - lastAppointmentCount;
            const newestAppt = appointments[0];
            const childName = newestAppt?.child_name || newestAppt?.childName || 'A child';
            if (window.showToast) {
                window.showToast(
                    'New Appointment Booked!',
                    `${childName} — ${newestAppt?.appointment_date || ''} at ${newestAppt?.appointment_time || ''}`,
                    'success',
                    6000
                );
            }
        }
        lastAppointmentCount = appointments.length;

        // Detect new children for toast
        if (lastChildrenCount > 0 && children.length > lastChildrenCount) {
            if (window.showToast) {
                window.showToast(
                    'Child Profile Added',
                    `${children[0]?.full_name || 'A new child'} has been registered.`,
                    'info',
                    5000
                );
            }
        }
        lastChildrenCount = children.length;

        // Sort appointments: upcoming (scheduled) first, then by date+time
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);

        const sorted = [...appointments].sort((a, b) => {
            const dateA = a.appointment_date || '';
            const dateB = b.appointment_date || '';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            const timeA = a.appointment_time || '';
            const timeB = b.appointment_time || '';
            return timeA.localeCompare(timeB);
        });

// Update KPIs
        const childElem = document.getElementById('kpi-children');
        if (childElem) childElem.textContent = totalChildren;

        const apptElem = document.getElementById('kpi-appointments');
        if (apptElem) apptElem.textContent = totalAppointments;

// Assign a STABLE sequential "Appt No." based on booking/creation timestamp.
        // Computed over the full set so the number stays the same across
        // All/Scheduled/Paid/Pending filter tabs (filtering only toggles
        // row visibility — it never renumbers).
        const bookedOrder = [...appointments].sort((a, b) => {
            const ta = a.created_at || a.createdAt || a.booking_time || a.appointment_date || '';
            const tb = b.created_at || b.createdAt || b.booking_time || b.appointment_date || '';
            return String(ta).localeCompare(String(tb));
        });
        const seqByApptId = new Map();
        bookedOrder.forEach((a, i) => {
            const id = a.id || a.appointment_id || `key-${i}`;
            if (!seqByApptId.has(id)) seqByApptId.set(id, i + 1);
        });

        // Update Upcoming Appointments table
        const tbody = document.getElementById('appointments-table-body');
        if (tbody) {
            if (sorted.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">No appointments yet. Book your first appointment!</td></tr>`;
            } else {
                tbody.innerHTML = sorted.map((a, idx) => {
                    const apptNo = seqByApptId.get(a.id || a.appointment_id || `key-${idx}`) || (idx + 1);
                    const apptId = a.id || a.appointment_id || `new-${idx}`;
                    const statusClass = (a.status || 'scheduled').toLowerCase();
                    const payClass = (a.payment_status || 'pending').toLowerCase();
                    const childName = a.child_name || a.childName || 'Child';
                    const date = a.appointment_date || '-';
                    const time = a.appointment_time || '-';
                    const doctor = a.doctor_name || a.doctorName || '-';
                    const reason = a.reason || 'Consultation';

                    const payBadge = payClass === 'paid'
                        ? `<span class="badge-paid">Paid</span>`
                        : `<span class="badge-pending">Pending</span>`;

                    const payBtn = payClass === 'pending'
                        ? `<button class="btn-pay" data-pay-id="${apptId}" data-pay-amount="${a.fee_amount || 250}">Pay Now</button>`
                        : '';

                    const deleteBtn = `<button class="btn-delete-row" data-delete-appt="${apptId}" style="margin-left:4px;">&times;</button>`;

return `
                        <tr>
                            <td class="appt-no" data-label="S.No">${apptNo}</td>
                            <td data-label="Name"><strong>${childName}</strong></td>
                            <td data-label="Date">${date}</td>
                            <td data-label="Time" data-time="${time}">${time}</td>
                            <td data-label="Status"><span class="badge-status ${statusClass}">${a.status || 'scheduled'}</span></td>
                            <td data-label="Reason">${reason}</td>
<td data-label="Payment">${payBadge} ${payBtn}</td>
                            <td data-label="Action">${deleteBtn}</td>
                        </tr>
                    `;
                }).join('');

                // Attach Pay Now handlers
                tbody.querySelectorAll('[data-pay-id]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.payId;
                        const amount = btn.dataset.payAmount;
                        if (window.__openPaymentModal) {
                            window.__openPaymentModal(id, amount);
                        } else {
                            alert('Payment modal not available. Please use the payment page.');
                        }
                    });
                });

                // Attach Delete handlers
                tbody.querySelectorAll('[data-delete-appt]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.deleteAppt;
                        if (!confirm('Delete this appointment?')) return;
                        try {
                            await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
                            if (window.showToast) {
                                window.showToast('Appointment Deleted', 'The appointment has been removed.', 'warning', 4000);
                            }
                            window.dispatchEvent(new CustomEvent('appointments:changed'));
                        } catch (err) {
                            console.error('Delete error:', err);
                            alert('Failed to delete appointment: ' + err.message);
                        }
                    });
                });
            }
        }

        // Update the appointments count in the table footer
        const countEl = document.getElementById('appointments-count');
        if (countEl) countEl.textContent = `${sorted.length} record${sorted.length === 1 ? '' : 's'}`;

// Update Recent Activity timeline
        const timeline = document.getElementById('activity-timeline');
        if (timeline && sorted.length > 0) {
            // Build a combined activity feed: appointment status events PLUS
            // "Payment Received" entries for every paid appointment.
            const activityItems = [];

            sorted.forEach(a => {
                const childName = a.child_name || a.childName || 'Child';
                const date = a.appointment_date || '';
                const time = a.appointment_time || '';
                const status = (a.status || 'scheduled').toLowerCase();

                // Appointment status event
                activityItems.push({
                    title: `${childName} — ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    meta: `${date} at ${time}`,
                    dot: status === 'completed' ? 'teal' : (status === 'cancelled' ? 'amber' : 'blue'),
                    ts: a.updated_at || `${date}T${time}` || new Date().toISOString()
                });

                // Payment event (appears when payment_status is paid)
                if ((a.payment_status || '').toLowerCase() === 'paid') {
                    const paidAt = a.paid_at || a.updated_at || new Date().toISOString();
                    const amount = a.fee_amount || 250;
                    const txn = a.upi_transaction_id
                        ? ` · UTR ${a.upi_transaction_id}`
                        : '';
                    activityItems.push({
                        title: `${childName} — Payment Received`,
                        meta: `₹${amount} received${txn}`,
                        dot: 'teal',
                        ts: paidAt
                    });
                }
            });

            // Sort newest first, then take the top 6
            activityItems.sort((x, y) => new Date(y.ts) - new Date(x.ts));
            const recent = activityItems.slice(0, 6);

            timeline.innerHTML = recent.map((item, idx) => {
                const isLatest = idx === 0;
                return `
                    <div class="timeline-item">
                        <div class="timeline-dot ${item.dot} ${isLatest ? 'pulse-dot' : ''}"></div>
                        <div class="timeline-content">
                            <div class="timeline-title">${item.title}</div>
                            <div class="timeline-meta">${item.meta}</div>
                        </div>
                        <div class="timeline-time">${isLatest ? 'Now' : formatTimelineTime(item.ts)}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

// Listen for data change events from other modules
window.addEventListener('appointments:changed', () => {
    loadDashboard();
});

window.addEventListener('children:changed', () => {
    loadDashboard();
});

// Real-time payment update: refresh immediately so the paid row moves to
// the "Paid" tab and a "Payment Received" entry appears in the timeline.
window.addEventListener('appointments:payment_updated', () => {
    loadDashboard();
});

// Poll every 10 seconds for real-time updates
function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
        // Only poll if dashboard is visible
        const dashboardPage = document.getElementById('page-dashboard');
        if (dashboardPage && !dashboardPage.classList.contains('hidden')) {
            loadDashboard();
        }
    }, 10000);
}

// Start polling when module loads
startPolling();

// Export the function for lazy loading
window.__loadDashboardPage = loadDashboard;
