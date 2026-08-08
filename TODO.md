# TODO — Fix blank QR code display in the payment modal

## Goal
Make the payment modal dynamically render a scannable QR code from the payment session's `upi_uri`, instead of relying on a static (possibly blank) image.

## Root causes
- `payment.js` no longer generated a dynamic QR; it only set UPI deep links and relied on a static `images/mygpayqr.jpeg` in the modal HTML.
- No dynamic QR rendering was wired to the fetched `session.upi_uri`.

## Plan
- [x] Analyze `payment.js`, `index.html`, `payments.routes.js`, `paymentGateway.js`, CSS
- [x] Re-add a dynamic `renderQr(upiUri)` in `apps/web/js/ui/payment.js`:
  - Use global `QRCode` (qrcodejs) to render to canvas when available
  - Lazy-load qrcodejs if missing, then re-render
  - Fallback: encode `upiUri` via an external QR image API if the library cannot load
- [x] Call `renderQr(res.session.upi_uri)` after creating the session in `__openPaymentModal`
- [x] Ensure the modal `#payment-qr` container is cleared so the static image is replaced by the dynamic QR
- [x] CSS already styles `#payment-qr canvas` and `img` (180px, centered, white frame)
- [x] Verify changes

