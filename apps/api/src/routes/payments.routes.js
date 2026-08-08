const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const env = require('../lib/env');
const {
  generateTxnRef,
  buildUpiPayUri,
  signCallback,
  verifyCallback,
} = require('../lib/paymentGateway');

const router = express.Router();

// GET /api/payments/config
// Returns the public UPI payment configuration so the frontend can render
// a dynamic QR code without hardcoding values in the browser.
router.get('/config', requireAuth(), asyncHandler(async (req, res) => {
  res.json({
    upiId: env.UPI_ID,
    payeeName: env.UPI_PAYEE_NAME,
    note: env.UPI_PAYEE_NOTE,
    amount: env.UPI_AMOUNT,
    currency: env.UPI_CURRENCY,
    sessionTtlMinutes: env.PAYMENT_SESSION_TTL_MINUTES || 10,
  });
}));

// POST /api/payments/session
// Create a short-lived payment session + dynamic QR payload for an appointment.
// The QR's `tr` (txn_ref) is unique to this appointment + amount.
router.post('/session', requireAuth(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { appointment_id, amount } = req.body || {};

  if (!appointment_id) {
    return res.status(400).json({ error: 'appointment_id is required' });
  }

  // Ensure the appointment belongs to the user and is still pending.
  const { data: appt, error: apptErr } = await supabaseAdmin
    .from('appointments')
    .select('id, user_id, fee_amount, payment_status')
    .eq('id', appointment_id)
    .eq('user_id', userId)
    .single();

  if (apptErr || !appt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  if (appt.payment_status === 'paid') {
    return res.status(409).json({ error: 'Appointment is already paid' });
  }

  // Expire any stale pending sessions for this appointment.
  await supabaseAdmin
    .from('payment_sessions')
    .update({ status: 'expired' })
    .eq('appointment_id', appointment_id)
    .eq('status', 'pending');

  // Build the exact amount (fall back to appointment fee or default).
  const payAmount = Number(amount) || Number(appt.fee_amount) || Number(env.UPI_AMOUNT) || 250;

  // Generate a single-use txn reference and the dynamic UPI URI.
  const txnRef = generateTxnRef(appointment_id);
  const upiUri = buildUpiPayUri({
    payeeName: env.UPI_PAYEE_NAME,
    upiId: env.UPI_ID,
    amount: payAmount,
    txnRef,
    note: env.UPI_PAYEE_NOTE,
  });

  const ttlMs = (env.PAYMENT_SESSION_TTL_MINUTES || 10) * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const { data: session, error: insertErr } = await supabaseAdmin
    .from('payment_sessions')
    .insert([{
      user_id: userId,
      appointment_id: appointment_id,
      amount: payAmount,
      txn_ref: txnRef,
      upi_uri: upiUri,
      status: 'pending',
      expires_at: expiresAt,
    }])
    .select()
    .single();

  if (insertErr) {
    console.error('Payment session create error:', insertErr);
    return res.status(500).json({ error: insertErr.message });
  }

  res.status(201).json({
    success: true,
    session: {
      id: session.id,
      appointment_id: session.appointment_id,
      amount: session.amount,
      txn_ref: session.txn_ref,
      upi_uri: session.upi_uri,
      status: session.status,
      expires_at: session.expires_at,
    },
  });
}));

// GET /api/payments/session/:id
// Poll the status of a payment session (pending -> paid/expired).
router.get('/session/:id', requireAuth(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const { data: session, error } = await supabaseAdmin
    .from('payment_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !session) {
    return res.status(404).json({ error: 'Payment session not found' });
  }

  // Auto-expire if past validity and still pending.
  if (session.status === 'pending' && new Date(session.expires_at).getTime() < Date.now()) {
    const { data: expired } = await supabaseAdmin
      .from('payment_sessions')
      .update({ status: 'expired' })
      .eq('id', session.id)
      .eq('status', 'pending')
      .select()
      .single();
    session.status = (expired && expired.status) || 'expired';
  }

  res.json({
    success: true,
    session: {
      id: session.id,
      appointment_id: session.appointment_id,
      amount: session.amount,
      status: session.status,
      paid_at: session.paid_at,
      gateway_transaction_id: session.gateway_transaction_id,
      expires_at: session.expires_at,
    },
  });
}));

// POST /api/payments/webhook
// SECURE callback endpoint — the payment gateway calls this on a successful
// transaction. The signature is verified (HMAC-SHA256, constant-time) before
// any DB write. This route intentionally does NOT use requireAuth; it trusts
// the signature instead.
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.get('X-Payment-Signature') || (req.body && req.body.signature);
  const payload = req.body || {};

  // 1) Verify signature first.
  if (!verifyCallback(payload, signature)) {
    console.warn('Payment webhook rejected: invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { txn_ref, status, amount, gateway_transaction_id } = payload;

  if (status !== 'success') {
    // Gateway reports failure — nothing to update.
    return res.json({ success: true, received: true, status });
  }

  // 2) Look up the payment session by its unique txn reference.
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('payment_sessions')
    .select('*')
    .eq('txn_ref', txn_ref)
    .single();

  if (sessionErr || !session) {
    console.warn('Payment webhook: unknown txn_ref', txn_ref);
    return res.status(404).json({ error: 'Payment session not found' });
  }

  // 3) Validate amount matches to prevent tampering.
  if (Number(amount) !== Number(session.amount)) {
    console.warn('Payment webhook: amount mismatch', { got: amount, expected: session.amount });
    return res.status(409).json({ error: 'Amount mismatch' });
  }

  // 4) Reject expired sessions.
  if (session.status === 'expired' || new Date(session.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Payment session expired' });
  }

  // 5) Idempotent: if already paid, return success without double-charging.
  if (session.status === 'paid') {
    return res.json({ success: true, alreadyPaid: true });
  }

  const now = new Date().toISOString();

  // 6) Mark the session paid.
  const { error: sessionUpdateErr } = await supabaseAdmin
    .from('payment_sessions')
    .update({
      status: 'paid',
      paid_at: now,
      gateway_transaction_id: gateway_transaction_id || null,
      gateway_signature: signature,
    })
    .eq('id', session.id)
    .eq('status', 'pending');

  if (sessionUpdateErr) {
    console.error('Payment webhook: session update error', sessionUpdateErr);
    return res.status(500).json({ error: sessionUpdateErr.message });
  }

  // 7) Update the appointment to Paid. This is what the dashboard reflects.
  const { error: apptUpdateErr } = await supabaseAdmin
    .from('appointments')
    .update({
      payment_status: 'paid',
      upi_transaction_id: gateway_transaction_id || txn_ref,
      upi_transaction_ref: txn_ref,
      paid_at: now,
    })
    .eq('id', session.appointment_id)
    .eq('user_id', session.user_id);

  if (apptUpdateErr) {
    console.error('Payment webhook: appointment update error', apptUpdateErr);
    return res.status(500).json({ error: apptUpdateErr.message });
  }

  res.json({ success: true, received: true, status: 'paid' });
}));

// POST /api/payments/simulate/:id
// DEV-ONLY helper that mimics the payment gateway sending a valid signed
// callback for a given session. Lets you prove the whole flow end-to-end
// without a live bank. Protected by requireAuth.
router.post('/simulate/:id', requireAuth(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const { data: session, error } = await supabaseAdmin
    .from('payment_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !session) {
    return res.status(404).json({ error: 'Payment session not found' });
  }

  const payload = {
    txn_ref: session.txn_ref,
    amount: String(session.amount),
    status: 'success',
    gateway_transaction_id: `SIM-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const signature = signCallback(payload);

  res.json({
    success: true,
    simulated: true,
    signature,
    payload,
    // For convenience, the client can POST this to /api/payments/webhook.
    webhookUrl: '/api/payments/webhook',
  });
}));

module.exports = router;
