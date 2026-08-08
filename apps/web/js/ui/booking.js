import { apiFetch } from '../api.js';

// Load children into the select dropdown (for booking form)
async function loadChildrenForSelect() {
    const select = document.getElementById('booking-child');
    if (!select) return;

    try {
        const res = await apiFetch('/children');
        const children = res.children || [];

        if (children.length === 0) {
            select.innerHTML = '<option value="" disabled selected hidden>No children found</option>';
            return;
        }

        select.innerHTML = children.map(c => {
            const id = c.id || c._id;
            const name = c.full_name || c.name || c.child_name || 'Child';
            return `<option value="${id}">${name}</option>`;
        }).join('');
    } catch (err) {
        console.error('Error loading children for booking:', err);
        select.innerHTML = '<option value="" disabled selected hidden>Error loading children</option>';
    }
}

const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const childId = document.getElementById('booking-child')?.value;
        const date = document.getElementById('booking-date')?.value;
        const time = document.getElementById('booking-time')?.value;
        const doctor = document.getElementById('booking-doctor')?.value || 'Dr. Hashim';
        const reason = document.getElementById('booking-reason')?.value || 'Consultation';
        const statusEl = document.getElementById('booking-status');

        if (!childId || !date || !time) {
            alert('Please fill all required fields!');
            return;
        }

        if (statusEl) {
            statusEl.textContent = 'Booking...';
            statusEl.removeAttribute('data-error');
        }

        try {
            const res = await apiFetch('/appointments', {
                method: 'POST',
                body: {
                    child_id: childId,
                    appointment_date: date,
                    appointment_time: time,
                    doctor_name: doctor,
                    reason: reason
                }
            });

            if (statusEl) {
                statusEl.textContent = 'Appointment booked successfully!';
            }

            if (window.showToast) {
                // Get child name for the toast
                const select = document.getElementById('booking-child');
                const childName = select ? select.options[select.selectedIndex]?.text || 'Child' : 'Child';
                window.showToast(
                    'Appointment Booked!',
                    `${childName} — ${date} at ${time}`,
                    'success',
                    6000
                );
            }

            // Reset form
            e.target.reset();

            // Dispatch change event so dashboard updates in real time
            window.dispatchEvent(new CustomEvent('appointments:changed'));

            // Navigate to dashboard after a brief delay
            setTimeout(() => {
                window.location.hash = '#dashboard';
            }, 800);

        } catch (err) {
            console.error('Booking error:', err);
            if (statusEl) {
                statusEl.textContent = err.message || 'Booking failed. Please try again.';
                statusEl.setAttribute('data-error', 'true');
            }
            alert('Failed to book appointment: ' + (err.message || 'Unknown error'));
        }
    });
}

// Load tomorrow's date as a quick-fill
document.getElementById('booking-load-tomorrow')?.addEventListener('click', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const dateInput = document.getElementById('booking-date');
    if (dateInput) dateInput.value = dateStr;
});

// Expose for router lazy loading
window.__loadChildrenForSelect = loadChildrenForSelect;
