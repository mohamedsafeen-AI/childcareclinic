import './ui/router.js';
import './ui/dashboard.js';
import './ui/booking.js';
import './ui/children.js';
import './ui/vaccinations.js';
import './ui/visits.js';
import './ui/billing.js';
import './ui/support.js';
import './ui/payment.js';

// This template expects a Supabase Auth access token stored at:
//   localStorage.setItem('sb_access_token', '<access_token>')
//
// If you don't have auth wired yet, backend calls will fail with 401.

window.API_BASE_URL = window.API_BASE_URL || 'https://childcareclinic.vercel.app';

