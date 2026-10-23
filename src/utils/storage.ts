import { ProductCatalog, Order, PromoCode, StoreMetrics, AccountCredential } from '../types/store';
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
    } else if (o.status === 'PENDING_PAYMENT' || o.status === 'PROCESSING') {
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

// Process an order after simulated payment:
// Delivers account credentials directly on the website for advance server accounts,
// or performs BB Coin to Diamond conversion auto-inject for diamond top up!
export function triggerAutomaticFulfillment(orderId: string, onUpdate?: (updatedOrder: Order) => void): void {
  const orders = loadOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) return;

  const currentOrder = orders[orderIndex];
  if (currentOrder.status !== 'PENDING_PAYMENT') return;

  // 1. Mark as PROCESSING immediately
  const processingOrder: Order = {
    ...currentOrder,
    status: 'PROCESSING',
    paidAt: new Date().toISOString(),
    logs: [
      ...currentOrder.logs,
      {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        message: currentOrder.productType === 'advance_account'
          ? 'Pembayaran terverifikasi! Sistem sedang mendekripsi data login Akun Advance Server...'
          : 'Pembayaran terverifikasi! Menghubungkan ke API Moonton untuk konversi BB Coin ke Diamond...',
      },
    ],
  };

  orders[orderIndex] = processingOrder;
  saveOrders(orders);
  if (onUpdate) onUpdate(processingOrder);

  // 2. Simulate fulfillment after 2.2 seconds
  setTimeout(() => {
    const freshOrders = loadOrders();
    const freshIndex = freshOrders.findIndex((o) => o.id === orderId);
    if (freshIndex === -1) return;

    const products = loadProducts();
    let deliveredAccountData: Order['accountDelivered'] = undefined;
    let deliveredSerial = generateSerialNumber();
    let updatedProducts = false;

    // Check if it's an account order
    if (currentOrder.productType === 'advance_account') {
      for (const prod of products) {
        if (prod.id === currentOrder.productId) {
          for (const denom of prod.denominations) {
            if (denom.id === currentOrder.itemId && denom.accountPool) {
              // Find first unsold account
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
                // Fallback generated account if pool was empty
                deliveredAccountData = {
                  email: `adv.backup${Date.now().toString().slice(-4)}@advserver-store.com`,
                  password: `PassAdv#${Math.floor(1000 + Math.random() * 9000)}`,
                  serverInfo: 'Server 5701 (Advance Server)',
                  bindType: 'Moonton Sepaket Email',
                  notes: 'Akun baru dari alokasi otomatis server.',
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

    const successMessage = currentOrder.productType === 'advance_account'
      ? `Data Akun Advance Server berhasil dikirimkan di website! Email: ${deliveredAccountData?.email}`
      : `Konversi BB Coin Sukses! Diamond telah terkirim ke User ID ${currentOrder.userId} (${currentOrder.userNickname || 'Akun MLBB'}). SN: ${deliveredSerial}`;

    const successOrder: Order = {
      ...freshOrders[freshIndex],
      status: 'SUCCESS',
      completedAt: new Date().toISOString(),
      serialNumberDelivery: deliveredSerial,
      accountDelivered: deliveredAccountData,
      logs: [
        ...freshOrders[freshIndex].logs,
        {
          timestamp: new Date().toLocaleTimeString('id-ID'),
          message: successMessage,
        },
      ],
    };

    freshOrders[freshIndex] = successOrder;
    saveOrders(freshOrders);
    if (onUpdate) onUpdate(successOrder);
  }, 2200);
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


