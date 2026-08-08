import { apiFetch } from '../api.js';

let currentAppointment = null;
let currentSession = null;
let pollTimer = null;
let generatedAt = null;
let sessionTtlMs = 10 * 60 * 1000; // default 10 minutes

function getEl(id) {
    return document.getElementById(id);
}

function setStatus(msg, isError = false) {
    const statusEl = getEl('payment-status');
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    if (isError) statusEl.setAttribute('data-error', 'true');
    else statusEl.removeAttribute('data-error');
}

function showAutoActions() {
    const auto = getEl('payment-auto-actions');
    if (auto) auto.style.display = '';
    const manual = getEl('payment-verify-form');
    if (manual) manual.style.display = 'none';
    const help = getEl('payment-txn-help');
    if (help) help.style.display = 'none';
}

function showManualActions() {
    const auto = getEl('payment-auto-actions');
    if (auto) auto.style.display = 'none';
    const manual = getEl('payment-verify-form');
    if (manual) manual.style.display = '';
    const help = getEl('payment-txn-help');
    if (help) help.style.display = '';
}

const QR_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

// Lazy-load the qrcodejs library if it is not already on the page.
// Resolves once the global `QRCode` constructor is available.
function loadQrLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof QRCode !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = QR_LIB_URL;
        script.async = true;
        script.onload = () => {
            if (typeof QRCode !== 'undefined') resolve();
            else reject(new Error('QR library loaded but QRCode is undefined'));
        };
        script.onerror = () => reject(new Error('Failed to load QR library'));
        document.head.appendChild(script);
    });
}

/**
 * Render a dynamic, scannable QR code from the payment session's `upi://pay`
 * URI into the #payment-qr container. Falls back to an external QR image API
 * if the qrcodejs library is unavailable/offline so the box is never blank.
 */
function renderQr(upiUri) {
    const container = getEl('payment-qr');
    if (!container) return;

    // Always clear previous placeholders / static image.
    container.innerHTML = '';

    if (!upiUri) {
        container.innerHTML = `<p class="muted">Payment link unavailable.</p>`;
        return;
    }

    const drawCanvas = () => {
        try {
            new QRCode(container, {
                text: upiUri,
                width: 180,
                height: 180,
                correctLevel: QRCode.CorrectLevel.M,
            });
            return true;
        } catch (err) {
            console.error('QR render error:', err);
            return false;
        }
    };

    // 1) Use the already-loaded qrcodejs library if present.
    if (typeof QRCode !== 'undefined') {
        if (!drawCanvas()) renderImageFallback(container, upiUri);
        return;
    }

    // 2) Otherwise try to lazy-load it; fall back to an image QR on failure.
    loadQrLibrary()
        .then(() => {
            if (!drawCanvas()) renderImageFallback(container, upiUri);
        })
        .catch((err) => {
            console.warn('QR library unavailable, using image fallback:', err);
            renderImageFallback(container, upiUri);
        });
}

// Fallback: encode the UPI URI into a scannable QR via an image API.
function renderImageFallback(container, upiUri) {
    const encoded = encodeURIComponent(upiUri);
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}`;
    img.alt = 'UPI payment QR code';
    img.width = 180;
    img.height = 180;
    img.onerror = () => {
        container.innerHTML = `<p class="muted">Could not render QR. Open a UPI app below to pay.</p>`;
    };
    container.appendChild(img);
}

function renderCountdown() {
    const hint = getEl('payment-qr-hint');
    if (!hint || !generatedAt) return;
    const remaining = sessionTtlMs - (Date.now() - generatedAt);
    if (remaining <= 0) {
        hint.textContent = 'QR expired. Please regenerate.';
        return;
    }
    const secs = Math.ceil(remaining / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    hint.textContent = `Scan with any UPI app · refreshes in ${mins}:${s.toString().padStart(2, '0')}`;
}

// Poll the session status every 2 seconds until it resolves.
function startPolling(sessionId) {
    stopPolling();
    pollTimer = setInterval(async () => {
        try {
            const res = await apiFetch(`/payments/session/${sessionId}`);
            const session = res && res.session;
            if (!session) return;

            if (session.status === 'paid') {
                stopPolling();
                handlePaymentSuccess(session);
            } else if (session.status === 'expired') {
                stopPolling();
                setStatus('This QR code has expired. Please close and try again.', true);
                showAutoActions();
            }
        } catch (err) {
            console.warn('Session poll error:', err);
        }
    }, 2000);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function handlePaymentSuccess(session) {
    const amount = session.amount || currentAppointment?.amount || 250;
    const txn = session.gateway_transaction_id || currentSession?.txn_ref || '';

    if (window.showToast) {
        window.showToast(
            'Payment Successful',
            `₹${amount} received${txn ? ' · ' + txn : ''} (auto-verified)`,
            'success',
            5000
        );
    }

    setStatus('Payment verified automatically. Thank you!');

    // Refresh dashboard table/badges + Recent Activity timeline.
    window.dispatchEvent(new CustomEvent('appointments:changed'));
    window.dispatchEvent(new CustomEvent('appointments:payment_updated', {
        detail: {
            appointmentId: currentAppointment?.id,
            amount,
            transactionId: txn,
            paidAt: new Date().toISOString()
        }
    }));

    // Close modal after a short delay.
    setTimeout(() => {
        window.__closePaymentModal();
    }, 1500);
}

function setUpiAppLinks(upiUri) {
    // Build provider deeplink hints (best-effort). The QR is the primary path.
    const gpay = getEl('pay-gpay');
    const phonepe = getEl('pay-phonepe');
    const paytm = getEl('pay-paytm');
    if (gpay) gpay.href = upiUri;
    if (phonepe) phonepe.href = upiUri;
    if (paytm) paytm.href = upiUri;
}

window.__openPaymentModal = async function(appointmentId, amount) {
    currentAppointment = { id: appointmentId, amount: amount || 250 };
    currentSession = null;
    generatedAt = null;
    stopPolling();

    const modal = getEl('payment-modal');
    if (modal) modal.classList.remove('hidden');

    const amountEl = getEl('payment-amount');
    if (amountEl) amountEl.textContent = `₹${amount || 250}`;

    // Clear previous form state.
    const txnInput = getEl('payment-txn-id');
    if (txnInput) txnInput.value = '';
    const refInput = getEl('payment-txn-ref');
    if (refInput) refInput.value = '';
    setStatus('');
    showAutoActions();

    // Load config for TTL (optional).
    try {
        const cfg = await apiFetch('/payments/config');
        if (cfg && cfg.sessionTtlMinutes) {
            sessionTtlMs = cfg.sessionTtlMinutes * 60 * 1000;
        }
    } catch (e) {
        // Ignore — use default.
    }

    // Create a payment session + dynamic QR server-side.
    try {
        const res = await apiFetch('/payments/session', {
            method: 'POST',
            body: { appointment_id: appointmentId, amount: amount || 250 }
        });

        if (!res || !res.session) {
            throw new Error('Could not create payment session');
        }

        currentSession = res.session;
        generatedAt = Date.now();

        // Render a dynamic, scannable QR from the session's UPI URI so the
        // payment box is never blank. Falls back to an image API if qrcodejs
        // is unavailable. Also set the UPI app deep links and begin polling.
        renderQr(res.session.upi_uri);
        setUpiAppLinks(res.session.upi_uri);
        renderCountdown();
        setStatus('Scan the QR to pay. Your payment is verified automatically.');

        startPolling(res.session.id);
    } catch (err) {
        console.error('Payment session error:', err);
        setStatus(err.message || 'Could not start payment. Please try again.', true);
        showManualActions();
    }
};

window.__closePaymentModal = function() {
    stopPolling();
    const modal = getEl('payment-modal');
    if (modal) modal.classList.add('hidden');
    currentAppointment = null;
    currentSession = null;
    generatedAt = null;
};

const closeBtn = getEl('payment-modal-close');
if (closeBtn) {
    closeBtn.addEventListener('click', window.__closePaymentModal);
}

// Dev-only: simulate a successful gateway callback for this session.
const simulateBtn = getEl('payment-simulate-btn');
if (simulateBtn) {
    simulateBtn.addEventListener('click', async () => {
        if (!currentSession || !currentSession.id) {
            setStatus('No active payment session to simulate.', true);
            return;
        }
        setStatus('Simulating gateway callback…');
        try {
            // Ask the backend to generate a VALID signed callback.
            const sim = await apiFetch(`/payments/simulate/${currentSession.id}`, { method: 'POST' });
            if (!sim || !sim.signature) throw new Error('Simulation failed');

            // Replay the signed callback into the webhook (as the gateway would).
            const webhookRes = await apiFetch('/payments/webhook', {
                method: 'POST',
                body: { ...sim.payload, signature: sim.signature }
            });

            if (webhookRes && webhookRes.success) {
                // The webhook already updated the DB. Poll will pick it up.
                setStatus('Callback delivered. Verifying…');
            } else {
                throw new Error('Webhook rejected simulation');
            }
        } catch (err) {
            console.error('Simulate error:', err);
            setStatus(err.message || 'Simulation failed.', true);
        }
    });
}

// Keep the countdown ticking.
setInterval(() => {
    if (getEl('payment-modal') && !getEl('payment-modal').classList.contains('hidden')) {
        renderCountdown();
    }
}, 1000);

// Pay Later / Skip button (auto flow).
const skipBtn2 = getEl('payment-skip-btn-2');
if (skipBtn2) {
    skipBtn2.addEventListener('click', () => {
        if (window.showToast) {
            window.showToast(
                'Payment Skipped',
                'You can pay later from the dashboard.',
                'info',
                4000
            );
        }
        window.__closePaymentModal();
    });
}

// Legacy manual verification form (kept for fallback / older flows).
const verifyForm = getEl('payment-verify-form');
if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const txnId = getEl('payment-txn-id')?.value.trim();
        const txnRef = getEl('payment-txn-ref')?.value.trim();
        if (!txnId) {
            setStatus('Please enter the UPI Transaction ID.', true);
            return;
        }
        if (!currentAppointment || !currentAppointment.id) {
            setStatus('No appointment selected for payment.', true);
            return;
        }
        setStatus('Verifying payment…');
        try {
            const res = await apiFetch(`/appointments/${currentAppointment.id}/payment`, {
                method: 'PATCH',
                body: {
                    payment_status: 'paid',
                    upi_transaction_id: txnId,
                    upi_transaction_ref: txnRef || null
                }
            });
            if (res && res.success) {
                const paidAmount = currentAppointment.amount || 250;
                if (window.showToast) {
                    window.showToast(
                        'Payment Successful',
                        `₹${paidAmount} received · UPI Transaction ${txnId} verified.`,
                        'success',
                        5000
                    );
                }
                window.dispatchEvent(new CustomEvent('appointments:changed'));
                window.dispatchEvent(new CustomEvent('appointments:payment_updated', {
                    detail: {
                        appointmentId: currentAppointment.id,
                        amount: paidAmount,
                        transactionId: txnId,
                        paidAt: new Date().toISOString()
                    }
                }));
                setTimeout(() => window.__closePaymentModal(), 1500);
            } else {
                throw new Error(res?.error || 'Verification failed');
            }
        } catch (err) {
            console.error('Payment verification error:', err);
            setStatus(err.message || 'Verification failed. Please try again.', true);
        }
    });
}

// Legacy Pay Later inside the manual form.
const skipBtn = getEl('payment-skip-btn');
if (skipBtn) {
    skipBtn.addEventListener('click', () => {
        if (window.showToast) {
            window.showToast(
                'Payment Skipped',
                'You can pay later from the dashboard.',
                'info',
                4000
            );
        }
        window.__closePaymentModal();
    });
}
