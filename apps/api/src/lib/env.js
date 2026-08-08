require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

module.exports = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  PORT: process.env.PORT || '3000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // UPI payment configuration (placeholders - update in your .env file)
  UPI_ID: process.env.UPI_ID || 'childcareclinic@upi',
  UPI_PAYEE_NAME: process.env.UPI_PAYEE_NAME || 'Child Care Clinic',
  UPI_PAYEE_NOTE: process.env.UPI_PAYEE_NOTE || 'Appointment Fee',
  UPI_AMOUNT: process.env.UPI_AMOUNT || '250',
  UPI_CURRENCY: process.env.UPI_CURRENCY || 'INR',

  // Secure webhook signing (HMAC-SHA256). Must be a long random secret.
  // In production, set PAYMENT_WEBHOOK_SECRET in your .env file.
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'dev-insecure-webhook-secret-change-me',

  // How long a dynamically generated QR payment session stays valid (minutes).
  PAYMENT_SESSION_TTL_MINUTES: parseInt(process.env.PAYMENT_SESSION_TTL_MINUTES || '10', 10),
};
