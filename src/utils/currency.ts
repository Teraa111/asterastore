export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export function calculatePaymentFee(subtotal: number, feePercent: number, feeFixed: number): number {
  const percentFee = Math.round((subtotal * feePercent) / 100);
  return percentFee + feeFixed;
}

export function generateOrderId(prefix = 'A4'): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}${month}${day}-${random}`;
}

export function generateSerialNumber(): string {
  const time = Date.now().toString().slice(-8);
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SN-AUTO${time}${rand}`;
}
