import { ProductCatalog, Order, OrderStatus, PromoCode, StoreMetrics, AccountCredential } from '../types/store';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_PROMO_CODES, HERO_PROMO_IMG, MLBB_COVER_IMG } from '../data/mockData';
import { generateSerialNumber } from './currency';

const STORAGE_KEYS = {
  PRODUCTS: 'storeadv_products_v4',
  ORDERS: 'storeadv_orders_v3',
  PROMOS: 'storeadv_promos_v3',
};

export function loadProducts(): ProductCatalog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      // Migrate custom account stock from v3 if present
      const oldRaw = localStorage.getItem('storeadv_products_v3');
      if (oldRaw) {
        try {
          const oldProducts: ProductCatalog[] = JSON.parse(oldRaw);
          const migrated = INITIAL_PRODUCTS.map((initProd) => {
            const oldMatch = oldProducts.find((p) => p.id === initProd.id);
            if (oldMatch && initProd.type === 'advance_account') {
              return {
                ...initProd,
                ...oldMatch,
                denominations: initProd.denominations.map((initD) => {
                  const oldD = oldMatch.denominations.find((d) => d.id === initD.id);
                  return oldD ? { ...initD, ...oldD } : initD;
                }),
              };
            }
            return initProd;
          });
          saveProducts(migrated);
          return migrated;
        } catch {
          // fallback
        }
      }
      saveProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: ProductCatalog[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('storeadv_products_updated'));
}

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      saveOrders(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveOrders(orders: Order[]): void {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  window.dispatchEvent(new Event('storeadv_orders_updated'));
}

export function loadPromos(): PromoCode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMOS);
    if (!raw) {
      savePromos(INITIAL_PROMO_CODES);
      return INITIAL_PROMO_CODES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROMO_CODES;
  }
}

export function savePromos(promos: PromoCode[]): void {
  localStorage.setItem(STORAGE_KEYS.PROMOS, JSON.stringify(promos));
  window.dispatchEvent(new Event('storeadv_promos_updated'));
}

export function calculateMetrics(orders: Order[], products: ProductCatalog[]): StoreMetrics {
  let totalRevenue = 0;
  let totalProfit = 0;
  let successOrders = 0;
  let pendingOrders = 0;
  let accountsAvailable = 0;
  let accountsSold = 0;

  // Build a lookup map of item base prices
  const itemBasePriceMap = new Map<string, number>();
  for (const p of products) {
    for (const d of p.denominations) {
      itemBasePriceMap.set(d.id, d.priceBase);
      if (d.stockType === 'account_pool' && d.accountPool) {
        for (const acc of d.accountPool) {
          if (acc.isSold) {
            accountsSold++;
          } else {
            accountsAvailable++;
          }
        }
      }
    }
  }

  for (const o of orders) {
    if (o.status === 'SUCCESS') {
      successOrders++;
      totalRevenue += o.totalAmount;
      const baseCost = itemBasePriceMap.get(o.itemId) || Math.round(o.subtotal * 0.7);
      const profit = Math.max(0, o.subtotal - baseCost);
      totalProfit += profit;
    } else if (
      o.status === 'PENDING_PAYMENT' ||
      o.status === 'WAITING_VERIFICATION' ||
      o.status === 'PROCESSING'
    ) {
      pendingOrders++;
    }
  }

  return {
    totalRevenue,
    totalProfit,
    totalOrders: orders.length,
    successOrders,
    pendingOrders,
    accountsAvailable,
    accountsSold,
  };
}

// Helper untuk label dan warna status pesanan resmi ASTERA STORE
export function getOrderStatusDetails(status: OrderStatus): {
  label: string;
  badgeClass: string;
  description: string;
} {
  switch (status) {
    case 'PENDING_PAYMENT':
      return {
        label: 'Menunggu Pembayaran',
        badgeClass: 'text-amber-400 bg-amber-950/70 border-amber-800',
        description: 'Menunggu pembeli melakukan transfer / scan QRIS.',
      };
    case 'WAITING_VERIFICATION':
      return {
        label: 'Menunggu Verifikasi Admin',
        badgeClass: 'text-blue-400 bg-blue-950/70 border-blue-800',
        description: 'Pembeli telah konfirmasi transfer. Menunggu Admin memeriksa mutasi dana masuk.',
      };
    case 'PROCESSING':
      return {
        label: 'Sedang Diproses',
        badgeClass: 'text-purple-400 bg-purple-950/70 border-purple-800',
        description: 'Pesanan sedang disiapkan untuk pengiriman.',
      };
    case 'SUCCESS':
      return {
        label: 'Lunas',
        badgeClass: 'text-emerald-400 bg-emerald-950/70 border-emerald-800',
        description: 'Pembayaran terverifikasi sah. Kredensial / Diamond telah dikirimkan.',
      };
    case 'EXPIRED':
      return {
        label: 'Kedaluwarsa',
        badgeClass: 'text-neutral-400 bg-neutral-900 border-neutral-700',
        description: 'Batas waktu pembayaran 15 menit telah habis.',
      };
    case 'CANCELLED':
    case 'FAILED':
      return {
        label: 'Dibatalkan',
        badgeClass: 'text-red-400 bg-red-950/70 border-red-800',
        description: 'Pesanan dibatalkan oleh Admin atau transaksi ditolak.',
      };
    default:
      return {
        label: status,
        badgeClass: 'text-neutral-400 bg-neutral-900 border-neutral-700',
        description: '',
      };
  }
}

/**
 * 1. KONFIRMASI OLEH PEMBELI (BUYER CONFIRMATION)
 * Hanya mengubah status menjadi "WAITING_VERIFICATION" (Menunggu Verifikasi Admin).
 * TIDAK PERNAH memberikan kredensial atau mengubah status menjadi SUCCESS secara otomatis!
 */
export function buyerConfirmPayment(orderId: string): Order | null {
  const orders = loadOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) return null;

  const currentOrder = orders[orderIndex];
  if (currentOrder.status !== 'PENDING_PAYMENT') {
    return currentOrder;
  }

  const updatedOrder: Order = {
    ...currentOrder,
    status: 'WAITING_VERIFICATION',
    logs: [
      ...currentOrder.logs,
      {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        message: 'Pembeli mengonfirmasi telah melakukan pembayaran. Status masuk antrean: Menunggu Verifikasi Admin.',
      },
    ],
  };

  orders[orderIndex] = updatedOrder;
  saveOrders(orders);
  return updatedOrder;
}

/**
 * 2. VERIFIKASI & PELUNASAN HANYA OLEH ADMIN / BACKEND RESMI
 * Status "Lunas" (SUCCESS) dan penyerahan kredensial akun / Diamond HANYA bisa
 * dieksekusi melalui fungsi ini setelah Admin mengecek mutasi riil di aplikasi DANA / Bank.
 */
export function adminVerifyAndFulfillOrder(
  orderId: string,
  verifierName = 'Admin ASTERA STORE'
): { success: boolean; order?: Order; message: string } {
  const orders = loadOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    return { success: false, message: 'Pesanan tidak ditemukan.' };
  }

  const currentOrder = orders[orderIndex];
  if (currentOrder.status === 'SUCCESS') {
    return { success: true, order: currentOrder, message: 'Pesanan sudah berstatus Lunas.' };
  }

  const products = loadProducts();
  let deliveredAccountData: Order['accountDelivered'] = undefined;
  let deliveredSerial = generateSerialNumber();
  let updatedProducts = false;

  // Alokasi akun dari brankas stok jika produk akun Advance Server
  if (currentOrder.productType === 'advance_account') {
    for (const prod of products) {
      if (prod.id === currentOrder.productId) {
        for (const denom of prod.denominations) {
          if (denom.id === currentOrder.itemId && denom.accountPool) {
            // Cari akun ready yang belum terjual
            const availableAcc = denom.accountPool.find((a) => !a.isSold);
            if (availableAcc) {
              availableAcc.isSold = true;
              availableAcc.soldToOrderId = currentOrder.id;
              deliveredAccountData = {
                email: availableAcc.email,
                password: availableAcc.password,
                serverInfo: availableAcc.serverInfo,
                bindType: availableAcc.bindType,
                notes: availableAcc.notes,
              };
              denom.stockCount = denom.accountPool.filter((a) => !a.isSold).length;
              updatedProducts = true;
            } else {
              // Jika brankas stok habis saat admin verifikasi
              deliveredAccountData = {
                email: `adv.resmi${Date.now().toString().slice(-4)}@asterastore.com`,
                password: `Astera#${Math.floor(1000 + Math.random() * 9000)}`,
                serverInfo: 'Server 5701 (Advance Server)',
                bindType: 'Moonton Sepaket Email',
                notes: 'Akun resmi diserahkan oleh Admin setelah verifikasi mutasi.',
              };
            }
          }
        }
      }
    }
  } else {
    // BB Coin to Diamond Conversion
    deliveredSerial = `SN-BBCOIN-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  if (updatedProducts) {
    saveProducts(products);
  }

  const fulfillmentMessage = currentOrder.productType === 'advance_account'
    ? `Pembayaran Rp ${currentOrder.totalAmount.toLocaleString('id-ID')} diverifikasi sah oleh ${verifierName}. Kredensial Akun Advance Server (${deliveredAccountData?.email}) telah diserahkan!`
    : `Pembayaran Rp ${currentOrder.totalAmount.toLocaleString('id-ID')} diverifikasi sah oleh ${verifierName}. Top up konversi BB Coin ke Diamond untuk ID MLBB ${currentOrder.userId} (${currentOrder.userNickname || 'Player'}) berhasil diproses. SN: ${deliveredSerial}`;

  const successOrder: Order = {
    ...currentOrder,
    status: 'SUCCESS',
    paidAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    verifiedBy: verifierName,
    serialNumberDelivery: deliveredSerial,
    accountDelivered: deliveredAccountData,
    logs: [
      ...currentOrder.logs,
      {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        message: fulfillmentMessage,
      },
    ],
  };

  orders[orderIndex] = successOrder;
  saveOrders(orders);
  return {
    success: true,
    order: successOrder,
    message: `Pesanan ${orderId} berhasil diverifikasi dan diset LUNAS!`,
  };
}

/**
 * 3. TANDAI KEDALUWARSA (EXPIRED)
 */
export function adminMarkOrderExpired(orderId: string): Order | null {
  const orders = loadOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) return null;

  const currentOrder = orders[orderIndex];
  if (currentOrder.status === 'SUCCESS') return currentOrder;

  const updated: Order = {
    ...currentOrder,
    status: 'EXPIRED',
    logs: [
      ...currentOrder.logs,
      {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        message: 'Batas waktu pembayaran telah habis. Pesanan ditandai Kedaluwarsa.',
      },
    ],
  };

  orders[orderIndex] = updated;
  saveOrders(orders);
  return updated;
}

/**
 * 4. BATALKAN PESANAN (CANCELLED)
 */
export function adminCancelOrder(orderId: string, reason = 'Dibatalkan oleh Admin'): Order | null {
  const orders = loadOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) return null;

  const currentOrder = orders[orderIndex];
  
  // Jika sebelumnya ada akun yang ter-assign tapi dibatalkan, kembalikan ke stok
  if (currentOrder.accountDelivered && currentOrder.productType === 'advance_account') {
    const products = loadProducts();
    let updatedProducts = false;
    for (const prod of products) {
      if (prod.id === currentOrder.productId) {
        for (const denom of prod.denominations) {
          if (denom.id === currentOrder.itemId && denom.accountPool) {
            const acc = denom.accountPool.find((a) => a.soldToOrderId === currentOrder.id);
            if (acc) {
              acc.isSold = false;
              acc.soldToOrderId = undefined;
              denom.stockCount = denom.accountPool.filter((a) => !a.isSold).length;
              updatedProducts = true;
            }
          }
        }
      }
    }
    if (updatedProducts) {
      saveProducts(products);
    }
  }

  const updated: Order = {
    ...currentOrder,
    status: 'CANCELLED',
    accountDelivered: undefined,
    logs: [
      ...currentOrder.logs,
      {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        message: `Pesanan dibatalkan: ${reason}`,
      },
    ],
  };

  orders[orderIndex] = updated;
  saveOrders(orders);
  return updated;
}

// Legacy alias compatibility jika ada komponen yang memanggil fungsi lama
export function triggerAutomaticFulfillment(orderId: string, onUpdate?: (updatedOrder: Order) => void): void {
  // Hanya konfirmasi buyer, tidak pernah melunaskan otomatis!
  const res = buyerConfirmPayment(orderId);
  if (res && onUpdate) onUpdate(res);
}

// Nickname verification simulation for MLBB User ID
export function simulateCheckNickname(userId: string, zoneId?: string): string {
  if (!userId || userId.trim().length < 3) {
    return 'ID Tidak Valid';
  }

  const sampleNames = [
    'SkyRider_ML',
    'LemonPro_99',
    'RRQ_Kingdom',
    'EVOS_Legend',
    'SultanGaming',
    'Aura_Phoenix',
    'KaguraMaster',
    'FannyGod_ID',
    'Gusion_FastHand',
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % sampleNames.length;
  const picked = sampleNames[index];

  if (zoneId) {
    return `${picked} (Server ${zoneId})`;
  }
  return picked;
}

// ==========================================
// ADMIN SECURITY & PIN MANAGEMENT
// ==========================================
const ADMIN_PIN_KEY = 'storeadv_admin_pin_v1';
export const DEFAULT_ADMIN_PIN = '8888';

export function getAdminPin(): string {
  try {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN;
  } catch {
    return DEFAULT_ADMIN_PIN;
  }
}

export function setAdminPin(newPin: string): boolean {
  try {
    if (!newPin || newPin.trim().length < 4) return false;
    localStorage.setItem(ADMIN_PIN_KEY, newPin.trim());
    return true;
  } catch {
    return false;
  }
}

export function verifyAdminPin(inputPin: string): boolean {
  const currentPin = getAdminPin();
  return inputPin.trim() === currentPin.trim();
}

// ==========================================
// PAYMENT CONFIG & DANA QRIS SETTINGS
// ==========================================
export interface AdminPaymentConfig {
  adminPhone: string;
  adminWhatsappUrl: string;
  danaNumber: string;
  danaAccountName: string;
  gopayNumber: string;
  gopayAccountName: string;
  qrisMerchantName: string;
  qrisNmid: string;
  qrisCustomImageUrl?: string;
}

export const DEFAULT_PAYMENT_CONFIG: AdminPaymentConfig = {
  adminPhone: '+62 823-1208-8548',
  adminWhatsappUrl: 'https://wa.me/6282312088548',
  danaNumber: '0823-1208-8548',
  danaAccountName: 'ASTERA STORE',
  gopayNumber: '0823-1208-8548',
  gopayAccountName: 'ASTERA STORE',
  qrisMerchantName: 'ASTERA STORE',
  qrisNmid: 'ID99281726481 (DANA BISNIS ASTERA STORE)',
  qrisCustomImageUrl: '',
};

const PAYMENT_CONFIG_KEY = 'storeadv_payment_config_v2';

export function getPaymentConfig(): AdminPaymentConfig {
  try {
    const raw = localStorage.getItem(PAYMENT_CONFIG_KEY);
    if (!raw) return DEFAULT_PAYMENT_CONFIG;
    return { ...DEFAULT_PAYMENT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

export function savePaymentConfig(config: Partial<AdminPaymentConfig>): AdminPaymentConfig {
  try {
    const current = getPaymentConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('storeadv_payment_config_updated'));
    return updated;
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

// ==========================================
// STORE ASSETS & CUSTOM PHOTOS (HERO & PRODUCTS)
// ==========================================
export interface StoreAssetsConfig {
  heroBannerImg: string;
  accountProductImg: string;
  bbcoinProductImg: string;
  storeLogoImg?: string;
}

export const DEFAULT_STORE_ASSETS: StoreAssetsConfig = {
  heroBannerImg: HERO_PROMO_IMG,
  accountProductImg: MLBB_COVER_IMG,
  bbcoinProductImg: HERO_PROMO_IMG,
  storeLogoImg: '',
};

const STORE_ASSETS_KEY = 'storeadv_assets_config_v2';

export function getStoreAssets(): StoreAssetsConfig {
  try {
    const raw = localStorage.getItem(STORE_ASSETS_KEY);
    if (!raw) return DEFAULT_STORE_ASSETS;
    return { ...DEFAULT_STORE_ASSETS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STORE_ASSETS;
  }
}

export function saveStoreAssets(assets: Partial<StoreAssetsConfig>): StoreAssetsConfig {
  try {
    const current = getStoreAssets();
    const updated = { ...current, ...assets };
    localStorage.setItem(STORE_ASSETS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('storeadv_assets_updated'));

    // Also keep product catalog coverImage in sync
    const products = loadProducts();
    const updatedProducts = products.map((p) => {
      if (p.id === 'mlbb-advance-server' && updated.accountProductImg) {
        return { ...p, coverImage: updated.accountProductImg };
      }
      if (p.id === 'mlbb-bbcoin' && updated.bbcoinProductImg) {
        return { ...p, coverImage: updated.bbcoinProductImg };
      }
      return p;
    });
    saveProducts(updatedProducts);

    return updated;
  } catch {
    return DEFAULT_STORE_ASSETS;
  }
}


