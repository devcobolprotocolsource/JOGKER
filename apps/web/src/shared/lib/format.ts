const jakartaTimeZone = 'Asia/Jakarta';

export function formatRupiah(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError('Nominal rupiah harus berupa integer yang aman.');
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(amount);
}

export function formatDateJakarta(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: jakartaTimeZone,
  }).format(date);
}

export function formatTimeJakarta(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: jakartaTimeZone,
  })
    .format(date)
    .replace(':', '.');
}
