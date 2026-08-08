export function loadSupportPage() {
    console.log('Support Page Loaded Successfully');

    // 1. Clinic Details மாற்றுவது
    const addressEl = document.querySelector('#page-support .card:nth-child(1) div:nth-child(2)');
    const hoursEl = document.querySelector('#page-support .card:nth-child(1) div:nth-child(3)');
    const phoneEl = document.querySelector('#page-support .card:nth-child(1) div:nth-child(4)');

    // 2. Doctor Info மாற்றுவது
    const doctorCard = document.querySelector('#page-support .card:nth-child(2)');

    if (doctorCard) {
        doctorCard.innerHTML = `
            <div class="card-header">
                <h2 class="card-title">Doctor Info</h2>
            </div>
            <div class="spotlight-body">
                <div class="doctor-name">Dr. Muhammed Hasheem <span>M.B.B.S., M.D.</span></div>
                <div class="doctor-role">Paediatric Consultant</div>
                <div class="hours-block">
                    <div class="hours-title">Consulting Hours</div>
                    <div class="hours-row"><span>Morning</span><strong>11:30 AM — 2:30 PM</strong></div>
                    <div class="hours-row"><span>Evening</span><strong>7:00 PM — 10:30 PM</strong></div>
                </div>
            </div>
        `;
    }

    // Address மாற்றுவது
    const addressCard = document.querySelector('#page-support .card:nth-child(1)');
    if (addressCard) {
        addressCard.innerHTML = `
            <div class="card-header">
                <h2 class="card-title">Clinic Details</h2>
            </div>
            <div class="spotlight-body">
                <div class="spot-row">
                    <div class="spot-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                    <div><strong>Address:</strong> Child Care Clinic, 20/14, Opp. to C.S.I Church, North Street, Kilakarai, Ramanathapuram-623517.</div>
                </div>
                <div class="spot-row">
                    <div class="spot-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                    <div><strong>Phone:</strong> 04567-243111 / +91 98039 20203</div>
                </div>
            </div>
        `;
    }
}

window.__loadSupportPage = loadSupportPage;
