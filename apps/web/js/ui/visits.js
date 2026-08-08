import { apiFetch } from '../api.js';

// 24 மணி நேர நேரத்தை 12 மணி நேரமாக (AM/PM) மாற்றும் ஃபங்ஷன்
function format12Hour(timeStr) {
    if (!timeStr) return 'N/A';
    try {
        const parts = timeStr.split(':');
        if (parts.length < 2) return timeStr;
        
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12;
        
        return `${hours}:${minutes} ${ampm}`;
    } catch (e) {
        return timeStr;
    }
}

export async function loadVisitsPage() {
    console.log('Loading Visit History Page...');

    setTimeout(async () => {
        const childSelect = document.getElementById('visits-child');
        const loadBtn = document.getElementById('load-visits');
        const targetTable = document.getElementById('visits-table');

        try {
            const childrenRes = await apiFetch('/children');
            let childrenList = Array.isArray(childrenRes) ? childrenRes : (childrenRes.children || childrenRes.data || []);

            if (childSelect) {
                if (childrenList.length > 0) {
                    childSelect.innerHTML = '<option value="">Select Child</option>' + 
                        childrenList.map(c => {
                            const childId = c.id || c._id || c.child_id;
                            const childName = c.name || c.child_name || c.fullname || c.first_name || c.childName || c.full_name || 'Child';
                            return `<option value="${childId}">${childName}</option>`;
                        }).join('');
                } else {
                    childSelect.innerHTML = '<option value="">No children found</option>';
                }
            }
        } catch (err) {
            console.error('Children fetch error:', err);
        }

        if (loadBtn) {
            loadBtn.onclick = async () => {
                const selectedChildId = childSelect ? childSelect.value.trim() : '';
                
                if (!selectedChildId) {
                    alert('தயவுசெய்து ஒரு குழந்தையின் பெயரைத் தேர்ந்தெடுக்கவும்!');
                    return;
                }

                try {
                    const response = await apiFetch('/appointments');
                    let appointments = Array.isArray(response) ? response : (response.appointments || response.data || []);

                    const filteredVisits = appointments.filter(app => {
                        const appChildId = String(app.child_id || app.childId || (app.child && (app.child.id || app.child._id)) || '').trim();
                        return appChildId === selectedChildId;
                    });

                    if (targetTable) {
                        if (filteredVisits.length === 0) {
                            targetTable.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg></div><div class="empty-state-title">No visit history found</div><div class="empty-state-sub">No visits recorded for this child yet.</div></div></td></tr>`;
                            return;
                        }

                        targetTable.innerHTML = filteredVisits.map(v => {
                            const rawTime = v.appointment_time || v.time || '';
                            const formattedTime = format12Hour(rawTime);

                            return `
                                <tr>
                                    <td>${v.appointment_date || v.date || 'N/A'}</td>
                                    <td><strong>${v.doctor_name || v.doctorName || v.doctor || 'N/A'}</strong></td>
                                    <td>${v.reason || v.reason_for_visit || 'Checkup'}</td>
                                    <td>${formattedTime}</td>
                                </tr>
                            `;
                        }).join('');
                    }
                } catch (error) {
                    console.error('Visit history fetch error:', error);
                    if (targetTable) {
                        targetTable.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="empty-state-title">Failed to load visit history</div><div class="empty-state-sub">Please try again later.</div></div></td></tr>`;
                    }
                }
            };
        }
    }, 200);
}

window.__loadVisitsPage = loadVisitsPage;
