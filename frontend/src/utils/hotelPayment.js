// Payment details shown on the checkout payment step.
// Change the values here and they update everywhere.

export const GCASH_ACCOUNT = {
  name: 'GALILEE MANSION HOTEL',
  number: '0917-555-4254',
  // Put the QR image URL here (e.g. an imported asset or a Cloudinary link).
  // Leave empty to show a QR icon placeholder.
  qrImage: '',
}

// Display only. The backend sets the real 20% (Reservation.DOWN_PAYMENT_RATE).
export const DOWN_PAYMENT_PERCENT = 20

export function computeDownPayment(total) {
  return Math.round(Number(total) * (DOWN_PAYMENT_PERCENT / 100) * 100) / 100
}