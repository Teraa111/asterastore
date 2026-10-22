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

export function generateOrderId(prefix = 'AST'): string {
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

export interface StoreOperatingStatus {
  isOpen: boolean;
  currentWibHour: number;
  currentWibMinute: number;
  timeStringWib: string;
  statusBadge: string;
  operatingHoursText: string;
}

export function getStoreOperatingStatus(): StoreOperatingStatus {
  const now = new Date();
  // WIB is UTC+7
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const wibHour = (utcHours + 7) % 24;
  const wibMinute = utcMinutes;
  
  // Store is open from 09:00 WIB to 22:00 WIB (Tutup jam 10 malam)
  const isOpen = wibHour >= 9 && wibHour < 22;
  const timeStringWib = `${String(wibHour).padStart(2, '0')}:${String(wibMinute).padStart(2, '0')} WIB`;

  return {
    isOpen,
    currentWibHour: wibHour,
    currentWibMinute: wibMinute,
    timeStringWib,
    statusBadge: isOpen ? 'Toko Buka (Tutup 22:00 WIB)' : 'Toko Tutup (Buka 09:00 WIB)',
    operatingHoursText: '09:00 - 22:00 WIB (Tutup Jam 10 Malam)',
  };
}

