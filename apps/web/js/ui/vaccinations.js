import { apiFetch } from '../api.js';

export async function loadVaccinationsPage() {
    console.log('Vaccinations Page Loaded Successfully');

    const selectBox = document.getElementById('vacc-child');
    const loadBtn = document.getElementById('load-vaccinations');
    const tableBody = document.getElementById('vacc-table');

    if (!selectBox) return;

    // 1. Children பக்கத்தில் உள்ள பெயர்களை டிராப்-டவுனில் ஏற்றுவது
    try {
        const response = await apiFetch('/children');
        let childrenList = [];
        if (Array.isArray(response)) {
            childrenList = response;
        } else if (response && Array.isArray(response.children)) {
            childrenList = response.children;
        } else if (response && Array.isArray(response.data)) {
            childrenList = response.data;
        }

        if (childrenList.length > 0) {
            selectBox.innerHTML = '<option value="">Select Child</option>' + 
                childrenList.map(c => {
                    const id = c.id || c._id || c.child_id;
                    const name = c.full_name || c.name || c.child_name || c.fullname || 'Child';
                    return `<option value="${id}">${name}</option>`;
                }).join('');
        }
    } catch (err) {
        console.error('Error loading children:', err);
    }

    // 2. Load பட்டனை கிளிக் செய்தவுடன் தடுப்பூசி பட்டியலைக் காட்டுவது
    if (loadBtn && tableBody) {
        loadBtn.onclick = (e) => {
            e.preventDefault();
            const childId = selectBox.value;
            
            if (!childId) {
                alert('தயவுசெய்து ஒரு குழந்தையின் பெயரைத் தேர்ந்தெடுக்கவும்!');
                return;
            }

            // அனைத்து முக்கிய தடுப்பூசிகளின் பட்டியல்
            const standardVaccines = [
                { id: 'v1', name: 'BCG', dose: 'Birth Dose', due: 'At Birth' },
                { id: 'v2', name: 'Hepatitis B', dose: 'Dose 1', due: 'At Birth' },
                { id: 'v3', name: 'Oral Polio Vaccine', dose: 'OPV 0', due: 'At Birth' },
                { id: 'v4', name: 'Pentavalent', dose: 'Dose 1', due: '6 Weeks' },
                { id: 'v5', name: 'Rotavirus Vaccine', dose: 'Dose 1', due: '6 Weeks' },
                { id: 'v6', name: 'Fractional IPV', dose: 'Dose 1', due: '6 Weeks' },
                { id: 'v7', name: 'Pneumococcal Conjugate', dose: 'Dose 1', due: '6 Weeks' }
            ];

            // டேபிளில் வரிசையாகக் காட்டுவது
            tableBody.innerHTML = standardVaccines.map((v) => {
                const uniqueKey = `${childId}-${v.id}`;
                return `
                    <tr id="row-${uniqueKey}">
                        <td data-label="Vaccine"><strong>${v.name}</strong></td>
                        <td data-label="Dose"><span class="badge-status scheduled">${v.dose}</span></td>
                        <td data-label="Due">${v.due}</td>
                        <td data-label="Status" id="status-${uniqueKey}">
                            <span class="badge-status pending">Pending</span>
                        </td>
                        <td data-label="Action">
                            <button type="button" onclick="window.markDone('${uniqueKey}')" class="btn-small" style="background: var(--gradient-success); color: #fff; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: 600;">Done</button>
                        </td>
                    </tr>
                `;
            }).join('');
        };
    }
}

// Done பட்டனை கிளிக் செய்தவுடன் Completed என மாற்றுவது
window.markDone = function(key) {
    const statusCell = document.getElementById(`status-${key}`);
    if (statusCell) {
        statusCell.innerHTML = `<span class="badge-status completed">Completed</span>`;
    }
    alert('Vaccination marked as Completed successfully!');
};

window.__loadVaccinationsPage = loadVaccinationsPage;
