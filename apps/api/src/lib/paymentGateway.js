const crypto = require('crypto');
const env = require('./env');

/**
 * paymentGateway.js
 * ---------------------------------------------------------------------------
 * Helpers for the automated UPI payment flow:
 *   1) Build a dynamic `upi://pay` URI that is uniquely tied to a specific
 *      appointment + amount via a one-time `tr` (transaction reference).
 *   2) Generate/verify an HMAC-SHA256 signature for payment callbacks so that
 *      only the payment gateway (who knows the secret) can mark a payment paid.
 *
 * In a real deployment you would replace the URI/callback generation with calls
 * to your actual payment provider (Razorpay, PhonePe, Paytm, etc.). The signing
 * scheme demonstrates the correct, secure pattern.
 * ---------------------------------------------------------------------------
 */

const CURRENCY = process.env.UPI_CURRENCY || 'INR';

/**
 * Generate a unique, unpredictable transaction reference for a payment session.
 * Encodes a random component so each QR is single-use and collision-resistant.
 */
function generateTxnRef(appointmentId) {
  const rand = crypto.randomBytes(8).toString('hex').toUpperCase();
  const shortId = String(appointmentId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  return `CCC${shortId}${rand}`;
}

/**
 * Build a UPI `upi://pay` URI string that will be encoded into the QR code.
 * The `tr` field is the unique txn reference the gateway echoes back on
 * callback, allowing us to match the payment to the exact session.
 */
function buildUpiPayUri({ payeeName, upiId, amount, txnRef, note }) {
  const params = new URLSearchParams();
  params.set('pa', upiId);                 // payee address / VPA
  params.set('pn', payeeName);             // payee name
  params.set('am', String(amount));        // exact amount (₹)
  params.set('cu', CURRENCY);              // currency
  params.set('tr', txnRef);                // unique txn reference (single-use)
  params.set('tn', note || 'Appointment Fee');
  params.set('purpose', 'P2P');            // optional UPI purpose code
  return `upi://pay?${params.toString()}`;
}

/**
 * Create a signed callback payload (what a real gateway would send to our
 * webhook). The signature covers the success-critical fields so they cannot
 * be tampered with in transit.
 */
function signCallback(payload) {
  const message = buildSignaturePayload(payload);
  return crypto
    .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
    .update(message)
    .digest('hex');
}

/**
 * Verify a callback signature. Uses constant-time comparison to resist timing
 * attacks. Returns true only if the signature matches the payload fields.
 */
function verifyCallback(payload, signature) {
  if (!signature || typeof signature !== 'string') return false;
  const expected = signCallback(payload);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Deterministic canonical string used for signing. Order matters and must be
 * identical between signCallback and verifyCallback.
 */
function buildSignaturePayload({ txn_ref, amount, status, gateway_transaction_id, timestamp }) {
  return [
    txn_ref,
    String(amount),
    status,
    gateway_transaction_id || '',
    timestamp || '',
  ].join('|');
}

module.exports = {
  generateTxnRef,
  buildUpiPayUri,
  signCallback,
  verifyCallback,
  buildSignaturePayload,
};
