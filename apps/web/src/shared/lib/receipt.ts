import { formatRupiah, formatTimeJakarta } from './format';

export type PaperWidth = 58 | 80;

export interface ReceiptLine {
  name: string;
  quantity: number;
  lineTotal: number;
  modifiers?: string[];
}

export interface ReceiptData {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  header?: string | null;
  footer?: string | null;
  orderNo: string;
  createdAt: string | Date;
  tableLabel?: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discountTotal: number;
  voucherCode?: string | null;
  serviceAmount: number;
  taxAmount: number;
  roundingAmount: number;
  grandTotal: number;
  payments: { method: string; amount: number }[];
  change: number;
}

const ESC = 0x1b;
const GS = 0x1d;
const encoder = new TextEncoder();

function byteChunks(bytes: Uint8Array, maximumSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += maximumSize) {
    chunks.push(bytes.slice(offset, offset + maximumSize));
  }
  return chunks;
}

function cleanText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?');
}

function columns(text: string, width: number): string {
  const sanitized = cleanText(text);
  return sanitized.length > width ? `${sanitized.slice(0, width - 3)}...` : sanitized;
}

function moneyRow(label: string, amount: number, width: number): string {
  const left = cleanText(label);
  const right = cleanText(formatRupiah(amount));
  const spacer = Math.max(1, width - left.length - right.length);
  return `${left}${' '.repeat(spacer)}${right}`;
}

export function buildReceipt(
  data: ReceiptData,
  paperWidth: PaperWidth,
  reprint = false
): Uint8Array[] {
  const columnWidth = paperWidth === 58 ? 32 : 48;
  const lines: string[] = [
    String.fromCharCode(ESC, 0x40),
    String.fromCharCode(ESC, 0x61, 0x01),
    columns(data.storeName, columnWidth),
  ];
  if (data.address) lines.push(columns(data.address, columnWidth));
  if (data.phone) lines.push(columns(data.phone, columnWidth));
  if (data.header) lines.push(columns(data.header, columnWidth));
  lines.push('-'.repeat(columnWidth));
  if (reprint) lines.push('*** REPRINT ***');
  lines.push(columns(data.orderNo, columnWidth));
  lines.push(
    `${formatTimeJakarta(data.createdAt)}${data.tableLabel ? `  ${cleanText(data.tableLabel)}` : ''}`
  );
  lines.push('-'.repeat(columnWidth));
  lines.push(String.fromCharCode(ESC, 0x61, 0x00));

  for (const line of data.lines) {
    lines.push(columns(line.name, columnWidth));
    if (line.modifiers)
      for (const modifier of line.modifiers) lines.push(columns(`  + ${modifier}`, columnWidth));
    lines.push(moneyRow(`${line.quantity} x`, line.lineTotal, columnWidth));
  }

  lines.push('-'.repeat(columnWidth));
  lines.push(moneyRow('Subtotal', data.subtotal, columnWidth));
  if (data.discountTotal > 0) {
    lines.push(
      moneyRow(
        data.voucherCode ? `Diskon ${data.voucherCode}` : 'Diskon',
        -data.discountTotal,
        columnWidth
      )
    );
  }
  if (data.serviceAmount > 0) lines.push(moneyRow('Layanan', data.serviceAmount, columnWidth));
  if (data.taxAmount > 0) lines.push(moneyRow('PB1', data.taxAmount, columnWidth));
  if (data.roundingAmount !== 0)
    lines.push(moneyRow('Pembulatan', data.roundingAmount, columnWidth));
  lines.push(moneyRow('TOTAL', data.grandTotal, columnWidth));
  for (const payment of data.payments)
    lines.push(moneyRow(payment.method, payment.amount, columnWidth));
  if (data.change > 0) lines.push(moneyRow('Kembalian', data.change, columnWidth));
  lines.push('-'.repeat(columnWidth));
  if (data.footer) lines.push(columns(data.footer, columnWidth));
  lines.push('', '', String.fromCharCode(GS, 0x56, 0x00));

  const bytes = encoder.encode(lines.join('\n'));
  return byteChunks(bytes, 100);
}
