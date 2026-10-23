export type ProductType = 'advance_account' | 'bbcoin_diamond';

export type StockType = 'auto_inject' | 'account_pool';

export type OrderStatus =
  | 'PENDING_PAYMENT'       // Menunggu Pembayaran
  | 'WAITING_VERIFICATION' // Menunggu Verifikasi Admin
  | 'PROCESSING'           // Sedang Diproses
  | 'SUCCESS'              // Lunas
  | 'EXPIRED'              // Kedaluwarsa
  | 'CANCELLED'            // Dibatalkan
  | 'FAILED';

export interface AccountCredential {
  id: string;
  email: string;
  password: string;
  serverInfo: string; // e.g. "Server 5702 (Advance Server)"
  bindType: string; // e.g. "Moonton Sepaket Email" / "Email Kosong"
  level: number;
  notes?: string;
  isSold: boolean;
  soldToOrderId?: string;
  createdAt: string;
}

export interface DenominationItem {
  id: string;
  gameId: string;
  name: string;
  category: 'Popular' | 'Standard' | 'Pass/Membership' | 'Jumbo' | 'Account Tiers';
  nominalValue: number;
  unit: string; // "Akun", "BB Coin", "Diamonds"
  priceBase: number; // Modal dasar (IDR)
  priceSell: number; // Harga jual (IDR)
  stockType: StockType;
  stockCount: number; // Jumlah akun ready atau -1 untuk auto_inject
  accountPool?: AccountCredential[];
  isFlashSale?: boolean;
  strikePrice?: number;
  bonusText?: string;
  isActive: boolean;

  // Khusus produk BB Coin
  bbCoinAmount?: number;
  diamondAmount?: number;
  bonusDiamond?: number;

  // Khusus produk Akun
  accountSpec?: {
    level: string;
    server: string;
    heroCount?: string;
    battlePoints?: string;
    bindStatus: string;
  };
}

export interface ProductCatalog {
  id: string;
  type: ProductType;
  title: string;
  subtitle: string;
  publisher: string;
  badge: string;
  coverImage: string;
  shortDesc: string;
  needPlayerId: boolean; // false untuk akun, true untuk top up BB Coin
  needZoneId: boolean;
  playerIdLabel?: string;
  playerIdPlaceholder?: string;
  zoneIdLabel?: string;
  zoneIdPlaceholder?: string;
  idHelpGuide?: string;
  denominations: DenominationItem[];
  isActive?: boolean; // false jika admin mematikan penjualan produk karena stok kosong
}

export interface PaymentChannel {
  id: string;
  name: string;
  code: string;
  group: 'QRIS' | 'E-Wallet' | 'Virtual Account' | 'Convenience Store';
  feePercent: number;
  feeFixed: number;
  minAmount: number;
  iconType: 'qris' | 'dana' | 'gopay' | 'shopeepay' | 'ovo' | 'bca' | 'mandiri' | 'bri' | 'bni' | 'alfamart' | 'indomaret';
  accountNumber?: string;
  badge?: string;
  instructions: {
    title: string;
    steps: string[];
  }[];
}

export interface Order {
  id: string; // e.g. "ADV-261020-001"
  createdAt: string;
  productType: ProductType;
  productId: string;
  productTitle: string;
  productImage: string;
  itemId: string;
  itemName: string;
  userId?: string; // untuk BB Coin
  zoneId?: string; // untuk BB Coin
  userNickname?: string;
  whatsapp: string;
  email?: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentGroup: string;
  subtotal: number;
  fee: number;
  discount: number;
  promoCode?: string;
  totalAmount: number;
  status: OrderStatus;
  paidAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  serialNumberDelivery?: string;
  virtualAccount?: string;

  // Data akun yang langsung dikirimkan di website setelah lunas
  accountDelivered?: {
    email: string;
    password: string;
    serverInfo: string;
    bindType: string;
    notes?: string;
  };

  // Rincian konversi jika pembelian BB Coin
  bbCoinConversion?: {
    coins: number;
    diamonds: number;
    bonus: number;
  };

  logs: { timestamp: string; message: string }[];
}

export interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  maxDiscount: number;
  minSpend: number;
  quota: number;
  usedCount: number;
  isActive: boolean;
  description: string;
}

export interface StoreMetrics {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  successOrders: number;
  pendingOrders: number;
  accountsAvailable: number;
  accountsSold: number;
}
