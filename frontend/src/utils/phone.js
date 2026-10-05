// Keeps only the 10 local digits. Handles pasted "+639171234567" or "09171234567".
export function toLocalDigits(value) {
  let digits = (value || '').replace(/\D/g, '')
  if (digits.startsWith('63')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}