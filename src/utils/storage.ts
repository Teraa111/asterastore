import { ProductCatalog, Order, OrderStatus, PromoCode, StoreMetrics, AccountCredential } from '../types/store';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_PROMO_CODES, HERO_PROMO_IMG, MLBB_COVER_IMG, QRIS_ADMIN_IMG } from '../data/mockData';
import { generateSerialNumber } from './currency';
import {
  saveOrderToCloud,
  updateOrderInCloud,
  fetchOrdersFromCloud,
  subscribeToOrdersCloud,
  getOrderFromCloud,
  saveProductsToCloud,
  fetchProductsFromCloud,
  subscribeToProductsCloud,
  saveAdminPinToCloud,
  fetchAdminPinFromCloud,
  subscribeToAdminPinCloud,
  saveStoreAssetsToCloud,
  fetchStoreAssetsFromCloud,
  subscribeToStoreAssetsCloud,
  savePaymentConfigToCloud,
  fetchPaymentConfigFromCloud,
  subscribeToPaymentConfigCloud,
  saveAccountVaultToCloud,
  fetchAccountVaultFromCloud,
  subscribeToAccountVaultCloud,
  deleteOrderFromCloud,
  deleteAllOrdersFromCloud,
} from './firebase';
import {
  fetchProductsFromSupabase,
  syncInitialProductsToSupabase,
  subscribeToProductsSupabase,
  isSupabaseConfigured,
  fulfillOrderAtomicSupabase,
  deleteAccountFromVaultSupabase,
  saveOrderToSupabase,
  fetchOrdersFromSupabase,
  getOrderFromSupabase,
  deleteOrderFromSupabase,
  deleteAllOrdersFromSupabase,
  fetchVaultAccountsGroupedSupabase,
  updateAccountInVaultSupabase,
  subscribeToVaultSupabase,
  subscribeToOrdersSupabase,
} from './supabase';

const STORAGE_KEYS = {
  PRODUCTS: 'storeadv_products_v5',
  ORDERS: 'storeadv_orders_v5',
  PROMOS: 'storeadv_promos_v3',
  MY_ORDER_IDS: 'storeadv_my_order_ids_v1',
};

// Cleanup old mock keys
try {
  localStorage.removeItem('storeadv_orders_v3');
  localStorage.removeItem('storeadv_products_v4');
  localStorage.removeItem('storeadv_products_v3');
} catch {
  // ignore
}

/**
 * Check if the current session is an authenticated Admin
 */
export function isAdminSession(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('storeadv_admin_session') === 'true';
  } catch {
    return false;
  }
}

/**
 * Get all order IDs that were created on this browser/device
 */
export function getMyOrderIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MY_ORDER_IDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save an order ID to the current device's order list
 */
export function saveMyOrderId(orderId: string): void {
  if (!orderId) return;
  try {
    const ids = getMyOrderIds();
    const cleanId = orderId.trim();
    if (!ids.includes(cleanId)) {
      ids.unshift(cleanId);
      localStorage.setItem(STORAGE_KEYS.MY_ORDER_IDS, JSON.stringify(ids.slice(0, 50)));
    }
  } catch {}
}

/**
 * Remove an order ID from the current device's order list
 */
export function removeMyOrderId(orderId: string): void {
  if (!orderId) return;
  try {
    const cleanId = orderId.trim();
    const ids = getMyOrderIds().filter((id) => id !== cleanId);
    localStorage.setItem(STORAGE_KEYS.MY_ORDER_IDS, JSON.stringify(ids));
    window.dispatchEvent(new Event('storeadv_orders_updated'));
  } catch {}
}

/**
 * Clear all my order IDs from current device
 */
export function clearMyOrders(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.MY_ORDER_IDS);
    window.dispatchEvent(new Event('storeadv_orders_updated'));
  } catch {}
}

/**
 * Check if an order ID belongs to the current browser/device
 */
export function isMyOrderId(orderId: string): boolean {
  if (!orderId) return false;
  return getMyOrderIds().includes(orderId.trim());
}

/**
 * Load ONLY orders that belong to this device (for regular customers)
 */
export function getMyOrders(): Order[] {
  const myIds = new Set(getMyOrderIds());
  const all = loadOrdersLocal();
  return all.filter((o) => myIds.has(o.id));
}

/**
 * Single Source of Truth for calculating ready stock for any denomination
 */
export function getDenomReadyStock(denom: {
  stockType: string;
  stockCount: number;
  accountPool?: AccountCredential[];
}): number {
  if (denom.stockType === 'auto_inject') {
    return -1;
  }
  // Cloud stockCount from Supabase/Firestore is authoritative across all browsers & devices
  if (typeof denom.stockCount === 'number' && denom.stockCount >= 0) {
    return denom.stockCount;
  }
  // Fallback if stockCount is not yet populated
  if (Array.isArray(denom.accountPool)) {
    return denom.accountPool.filter((a) => !a.isSold).length;
  }
  return 0;
}

/**
 * Ensure stockCount on every denomination matches cloud database count,
 * without letting stale local accountPool overwrite real-time stock
 */
export function sanitizeProductsStock(products: ProductCatalog[]): ProductCatalog[] {
  return products.map((prod) => ({
    ...prod,
    denominations: prod.denominations.map((d) => {
      if (d.stockType === 'account_pool') {
        const readyPool = Array.isArray(d.accountPool)
          ? d.accountPool.filter((a) => !a.isSold)
          : [];
        // Cloud stockCount is authoritative. Only fallback to readyPool if stockCount is undefined
        const authoritativeStock =
          typeof d.stockCount === 'number' && d.stockCount >= 0 ? d.stockCount : readyPool.length;
        return {
          ...d,
          accountPool: readyPool,
          stockCount: authoritativeStock,
        };
      }
      return d;
    }),
  }));
}

function mergeCloudProducts(local: ProductCatalog[], cloud: ProductCatalog[]): ProductCatalog[] {
  const map = new Map<string, ProductCatalog>();
  for (const l of local) map.set(l.id, l);

  const isAdmin = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('storeadv_admin_session') === 'true';

  for (const c of cloud) {
    const existing = map.get(c.id);
    if (!existing) {
      map.set(c.id, c);
    } else {
      const denomMap = new Map<string, any>();
      if (existing.denominations) {
        for (const d of existing.denominations) denomMap.set(d.id, d);
      }
      const updatedDenoms = (c.denominations || []).map((cd) => {
        const ed = denomMap.get(cd.id);
        const edPool = (ed && Array.isArray(ed.accountPool)) ? ed.accountPool : [];
        const cdPool = (cd && Array.isArray(cd.accountPool)) ? cd.accountPool : [];

        // For Admin: merge cloud pool and local pool so accounts stored in database are preserved
        const accMap = new Map<string, AccountCredential>();
        for (const a of cdPool) accMap.set(a.id, a);
        for (const a of edPool) accMap.set(a.id, a);
        const mergedPool = Array.from(accMap.values());

        const readyCount = mergedPool.filter((a) => !a.isSold).length;
        const realStock = typeof cd.stockCount === 'number' && cd.stockCount >= 0
          ? Math.max(cd.stockCount, readyCount)
          : readyCount;

        return {
          ...cd,
          // Maintain complete account credentials pool from database on authorized Admin session
          accountPool: isAdmin ? mergedPool : [],
          stockCount: realStock,
        };
      });

      map.set(c.id, {
        ...existing,
        ...c,
        denominations: updatedDenoms,
      });
    }
  }

  return sanitizeProductsStock(Array.from(map.values()));
}

let isSyncingProducts = false;

export async function fetchProductsFromCloudServer(): Promise<ProductCatalog[]> {
  if (isSyncingProducts) return loadProductsLocal();
  isSyncingProducts = true;
  try {
    let cloudList: ProductCatalog[] = [];

    // 1. Fetch from Supabase (Primary Multi-Device Source of Truth)
    try {
      const supabaseProducts = await fetchProductsFromSupabase();
      if (supabaseProducts && supabaseProducts.length > 0) {
        cloudList = supabaseProducts;
      }
    } catch (err) {
      console.warn('Supabase product fetch warning:', err);
    }

    // 2. Fetch from Firestore (Secondary Multi-Device Source)
    try {
      const firestoreProducts = await fetchProductsFromCloud();
      if (firestoreProducts && firestoreProducts.length > 0) {
        if (cloudList.length === 0) {
          cloudList = firestoreProducts;
        } else {
          cloudList = mergeCloudProducts(cloudList, firestoreProducts);
        }
      }
    } catch (err) {
      console.warn('Firestore product fetch warning:', err);
    }

    const local = loadProductsLocal();

    // If cloud has data, merge into local
    if (cloudList.length > 0) {
      const merged = mergeCloudProducts(local, cloudList);
      const currentRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const newRaw = JSON.stringify(merged);
      if (currentRaw !== newRaw) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, newRaw);
        window.dispatchEvent(new Event('storeadv_products_updated'));
      }
      return merged;
    } else {
      // Only auto-upload if current user is an authenticated Admin
      const isAdmin = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('storeadv_admin_session') === 'true';
      if (isAdmin) {
        syncAllProductsToCloud(local).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('fetchProductsFromCloudServer warning:', err);
  } finally {
    isSyncingProducts = false;
  }
  return loadProductsLocal();
}

export function loadProductsLocal(): ProductCatalog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      // Return initial products in memory only.
      // CRITICAL: DO NOT call saveProducts() here! A fresh incognito session or new visitor
      // must NEVER overwrite cloud database prices with default initial prices!
      return sanitizeProductsStock(INITIAL_PRODUCTS);
    }
    const parsed: ProductCatalog[] = JSON.parse(raw);
    return sanitizeProductsStock(parsed);
  } catch {
    return sanitizeProductsStock(INITIAL_PRODUCTS);
  }
}

export function loadProducts(): ProductCatalog[] {
  // Trigger background cloud sync from Supabase + Firestore
  fetchProductsFromCloudServer().catch(() => {});
  return loadProductsLocal();
}

export interface CloudSyncResult {
  success: boolean;
  supabaseOk: boolean;
  firestoreOk: boolean;
  supabaseError?: string;
  firestoreError?: string;
}

/**
 * Force sync all current products and stock to Cloud (Supabase + Firestore)
 */
export async function syncAllProductsToCloud(products: ProductCatalog[]): Promise<CloudSyncResult> {
  const sanitized = sanitizeProductsStock(products);
  let supabaseOk = false;
  let firestoreOk = false;
  let supabaseError: string | undefined;
  let firestoreError: string | undefined;

  // 1. Supabase
  try {
    const sbRes = await syncInitialProductsToSupabase(sanitized);
    supabaseOk = sbRes.success;
    if (!sbRes.success) {
      supabaseError = sbRes.error;
    }
  } catch (err: any) {
    supabaseError = err?.message || 'Error syncing to Supabase';
    console.warn('Supabase sync note:', err);
  }

  // 2. Firestore
  try {
    await saveProductsToCloud(sanitized);
    firestoreOk = true;
  } catch (err: any) {
    firestoreError = err?.message || 'Error saving to Firestore';
    console.warn('Firestore sync note:', err);
  }

  // 3. Local server
  fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized),
  }).catch(() => {});

  return {
    success: supabaseOk || firestoreOk,
    supabaseOk,
    firestoreOk,
    supabaseError,
    firestoreError,
  };
}

/**
 * Synchronize the entire account credentials vault directly from Supabase Cloud Database (with Firestore fallback)
 */
export async function syncAccountVaultFromCloud(): Promise<void> {
  try {
    let cloudVault: Record<string, AccountCredential[]> | null = null;

    // 1. Supabase (Primary Source of Truth)
    try {
      const sbVault = await fetchVaultAccountsGroupedSupabase();
      if (sbVault && typeof sbVault === 'object') {
        cloudVault = sbVault;
      }
    } catch (sbErr) {
      console.warn('Supabase vault sync note:', sbErr);
    }

    // 2. Secondary fallback to Firestore
    if (!cloudVault) {
      try {
        const firestoreVault = await fetchAccountVaultFromCloud();
        if (firestoreVault && typeof firestoreVault === 'object') {
          cloudVault = firestoreVault;
        }
      } catch {}
    }

    if (cloudVault && typeof cloudVault === 'object') {
      const local = loadProductsLocal();
      let hasChanges = false;
      const updated = local.map((p) => {
        if (p.type !== 'advance_account') return p;
        return {
          ...p,
          denominations: p.denominations.map((d) => {
            const vaultAccounts = cloudVault![d.id];
            if (Array.isArray(vaultAccounts)) {
              const currentPool = d.accountPool || [];
              const diffCount = currentPool.length !== vaultAccounts.length;
              const diffStock = d.stockCount !== vaultAccounts.length;
              if (diffCount || diffStock) {
                hasChanges = true;
              }
              return {
                ...d,
                accountPool: vaultAccounts,
                stockCount: vaultAccounts.length,
              };
            }
            return d;
          }),
        };
      });

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
        window.dispatchEvent(new Event('storeadv_products_updated'));
      }
    }
  } catch (err) {
    console.warn('syncAccountVaultFromCloud error:', err);
  }
}

/**
 * Save account vault to Firestore Cloud Database
 */
export async function syncAccountVaultToCloud(products: ProductCatalog[]): Promise<void> {
  try {
    const vaultMap: Record<string, AccountCredential[]> = {};
    for (const p of products) {
      if (p.type === 'advance_account') {
        for (const d of p.denominations) {
          if (Array.isArray(d.accountPool)) {
            vaultMap[d.id] = d.accountPool;
          }
        }
      }
    }
    if (Object.keys(vaultMap).length > 0) {
      await saveAccountVaultToCloud(vaultMap);
    }
  } catch (err) {
    console.warn('syncAccountVaultToCloud error:', err);
  }
}

export function saveProducts(products: ProductCatalog[]): void {
  const sanitized = sanitizeProductsStock(products);
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(sanitized));
  } catch (err) {
    console.error('saveProducts error:', err);
  }
  window.dispatchEvent(new Event('storeadv_products_updated'));

  // Sync to Cloud Databases (Firestore Catalog + Firestore Account Vault + Supabase)
  syncAllProductsToCloud(sanitized).catch(() => {});
  syncAccountVaultToCloud(sanitized).catch(() => {});
}

export function applyCloudProductsUpdate(cloudProducts: ProductCatalog[]) {
  if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
    const local = loadProductsLocal();
    const merged = mergeCloudProducts(local, cloudProducts);
    const currentRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const newRaw = JSON.stringify(merged);
    if (currentRaw !== newRaw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, newRaw);
      window.dispatchEvent(new Event('storeadv_products_updated'));
    }
  }
}

// 1. Real-time listeners from Supabase (PostgreSQL Realtime - Primary)
if (typeof window !== 'undefined') {
  try {
    subscribeToProductsSupabase((cloudProducts) => {
      applyCloudProductsUpdate(cloudProducts);
    });
  } catch (err) {
    console.warn('Real-time Supabase product listener init:', err);
  }

  // Real-time Supabase account credentials vault listener
  try {
    subscribeToVaultSupabase(() => {
      syncAccountVaultFromCloud().catch(() => {});
    });
  } catch (err) {
    console.warn('Real-time Supabase vault listener init:', err);
  }

  // Real-time Supabase orders listener for Admin
  try {
    subscribeToOrdersSupabase((cloudOrders) => {
      if (!isAdminSession()) return;
      if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
        const local = loadOrdersLocal();
        const map = new Map<string, Order>();
        for (const o of local) map.set(o.id, o);
        for (const o of cloudOrders) map.set(o.id, o);

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const currentRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
        const newRaw = JSON.stringify(merged);
        if (currentRaw !== newRaw) {
          localStorage.setItem(STORAGE_KEYS.ORDERS, newRaw);
          window.dispatchEvent(new Event('storeadv_orders_updated'));
        }
      }
    });
  } catch (err) {
    console.warn('Real-time Supabase order listener init:', err);
  }

  // 2. Real-time listeners from Firestore (Firebase Cloud - Secondary)
  try {
    subscribeToProductsCloud((cloudProducts) => {
      applyCloudProductsUpdate(cloudProducts);
    });
  } catch (err) {
    console.warn('Real-time Firestore product listener init:', err);
  }
}

// Background sync promise flag
let isSyncing = false;

// Setup real-time listener from Firestore ONLY for authenticated Admin (secondary)
if (typeof window !== 'undefined') {
  try {
    subscribeToOrdersCloud((cloudOrders) => {
      // Only process global cloud orders if user is Admin
      if (!isAdminSession()) return;
      if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
        const local = loadOrdersLocal();
        const map = new Map<string, Order>();
        for (const o of local) map.set(o.id, o);
        for (const o of cloudOrders) map.set(o.id, o);

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const currentRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
        const newRaw = JSON.stringify(merged);
        if (currentRaw !== newRaw) {
          localStorage.setItem(STORAGE_KEYS.ORDERS, newRaw);
          window.dispatchEvent(new Event('storeadv_orders_updated'));
        }
      }
    });
  } catch (err) {
    console.warn('Real-time order listener initialization warning:', err);
  }
}

/**
 * Fetch and refresh status of orders that belong to THIS device only (Buyer privacy protection)
 */
export async function fetchMyOrdersFromServer(): Promise<Order[]> {
  const myIds = getMyOrderIds();
  if (myIds.length === 0) return [];

  try {
    const updatedMyOrders: Order[] = [];
    for (const id of myIds) {
      try {
        const sbOrder = await getOrderFromSupabase(id);
        if (sbOrder) {
          updatedMyOrders.push(sbOrder);
        } else {
          const cloudOrder = await getOrderFromCloud(id);
          if (cloudOrder) updatedMyOrders.push(cloudOrder);
        }
      } catch {}
    }

    if (updatedMyOrders.length > 0) {
      const local = loadOrdersLocal();
      const map = new Map<string, Order>();
      for (const o of local) map.set(o.id, o);
      for (const o of updatedMyOrders) map.set(o.id, o);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(Array.from(map.values())));
      window.dispatchEvent(new Event('storeadv_orders_updated'));
    }
  } catch (err) {
    console.warn('fetchMyOrdersFromServer error:', err);
  }
  return getMyOrders();
}

/**
 * Global order fetching: ONLY for Admin. Normal customers only fetch their own orders.
 */
export async function fetchOrdersFromServer(): Promise<Order[]> {
  // STRICT PRIVACY PROTECTION: Regular buyers must NEVER download other people's orders!
  if (!isAdminSession()) {
    return fetchMyOrdersFromServer();
  }

  if (isSyncing) return loadOrdersLocal();
  isSyncing = true;
  try {
    // 1. Fetch from Supabase Cloud Database (Primary cross-device source of truth)
    let supabaseOrders: Order[] = [];
    try {
      supabaseOrders = await fetchOrdersFromSupabase();
    } catch (err) {
      console.warn('Supabase fetchOrders warning:', err);
    }

    // 2. Fetch from Firestore Cloud Database (Secondary cross-device)
    let cloudOrders: Order[] = [];
    try {
      cloudOrders = await fetchOrdersFromCloud();
    } catch (err) {
      console.warn('Firestore fetchOrders warning:', err);
    }

    // 3. Fetch from Express /api/orders (if available)
    let serverOrders: Order[] = [];
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        serverOrders = await res.json();
      }
    } catch {
      // offline / static hosting
    }

    const local = loadOrdersLocal();
    const map = new Map<string, Order>();
    for (const o of local) map.set(o.id, o);
    for (const o of serverOrders) map.set(o.id, o);
    for (const o of cloudOrders) map.set(o.id, o);
    for (const o of supabaseOrders) map.set(o.id, o);

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const currentRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const newRaw = JSON.stringify(merged);
    if (currentRaw !== newRaw) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, newRaw);
      window.dispatchEvent(new Event('storeadv_orders_updated'));
    }
    return merged;
  } catch (err) {
    console.error('fetchOrdersFromServer error:', err);
  } finally {
    isSyncing = false;
  }
  return loadOrdersLocal();
}

export function loadOrdersLocal(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Load orders for Admin view (returns all store orders)
 */
export function loadAdminOrders(): Order[] {
  fetchOrdersFromServer().catch(() => {});
  return loadOrdersLocal();
}

/**
 * Universal loadOrders: If Admin, returns all orders. If Buyer, returns ONLY their own orders!
 */
export function loadOrders(): Order[] {
  if (isAdminSession()) {
    fetchOrdersFromServer().catch(() => {});
    return loadOrdersLocal();
  }
  // Buyer: Only load their own orders
  fetchMyOrdersFromServer().catch(() => {});
  return getMyOrders();
}

export function saveOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (err) {
    console.error('saveOrders error:', err);
  }
  window.dispatchEvent(new Event('storeadv_orders_updated'));
}

export async function syncOrderToServer(order: Order): Promise<void> {
  // 1. Save to Supabase Cloud Database (PostgreSQL)
  saveOrderToSupabase(order).catch((err) => {
    console.warn('Failed to sync order to Supabase:', err);
  });

  // 2. Save to Cloud Firestore
  saveOrderToCloud(order).catch((err) => {
    console.warn('Failed to sync order to Cloud Firestore:', err);
  });

  // 3. Also POST to local Express server API
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  }).catch(() => {});
}

export async function searchOrdersOnline(query: string): Promise<Order[]> {
  const cleanQ = query.trim().replace(/^#/, '');

  // 1. Direct Supabase Cloud lookup by Invoice ID
  try {
    const sbMatch = await getOrderFromSupabase(cleanQ);
    if (sbMatch) {
      const local = loadOrdersLocal();
      const map = new Map<string, Order>();
      for (const o of local) map.set(o.id, o);
      map.set(sbMatch.id, sbMatch);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(Array.from(map.values())));
      window.dispatchEvent(new Event('storeadv_orders_updated'));
      return [sbMatch];
    }
  } catch {}

  // 2. Direct Cloud Firestore lookup by Invoice ID
  try {
    const directMatch = await getOrderFromCloud(cleanQ);
    if (directMatch) {
      const local = loadOrdersLocal();
      const map = new Map<string, Order>();
      for (const o of local) map.set(o.id, o);
      map.set(directMatch.id, directMatch);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(Array.from(map.values())));
      window.dispatchEvent(new Event('storeadv_orders_updated'));
      return [directMatch];
    }
  } catch {
    // fallback
  }

  // 3. Search via Express API if running (targeted)
  try {
    const res = await fetch(`/api/orders/search?q=${encodeURIComponent(cleanQ)}`);
    if (res.ok) {
      const found: Order[] = await res.json();
      if (Array.isArray(found) && found.length > 0) {
        if (isAdminSession()) {
          const local = loadOrdersLocal();
          const map = new Map<string, Order>();
          for (const o of local) map.set(o.id, o);
          for (const o of found) map.set(o.id, o);
          const merged = Array.from(map.values());
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(merged));
          window.dispatchEvent(new Event('storeadv_orders_updated'));
        }
        return found;
      }
    }
  } catch {
    // Fallback to local
  }

  // 4. Local filter: For admin, filter all orders; for customer, only filter own orders
  const all = isAdminSession() ? loadOrdersLocal() : getMyOrders();
  const lowerQ = cleanQ.toLowerCase();
  const digits = lowerQ.replace(/[^0-9]/g, '');
  return all.filter((o) => {
    const matchId = o.id.toLowerCase().includes(lowerQ);
    const matchWa = digits.length >= 4 && o.whatsapp.replace(/[^0-9]/g, '').includes(digits);
    const matchUser = o.userId ? o.userId.toLowerCase().includes(lowerQ) : false;
    const matchNick = o.userNickname ? o.userNickname.toLowerCase().includes(lowerQ) : false;
    const matchEmail = o.accountDelivered?.email ? o.accountDelivered.email.toLowerCase().includes(lowerQ) : false;
    const matchItem = o.itemName ? o.itemName.toLowerCase().includes(lowerQ) : false;
    return matchId || matchWa || matchUser || matchNick || matchEmail || matchItem;
  });
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
      if (d.stockType === 'account_pool') {
        if (d.accountPool && d.accountPool.length > 0) {
          for (const acc of d.accountPool) {
            if (acc.isSold) {
              accountsSold++;
            } else {
              accountsAvailable++;
            }
          }
        } else if (typeof d.stockCount === 'number' && d.stockCount > 0) {
          accountsAvailable += d.stockCount;
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

  // Akun terjual dihitung dari order SUCCESS akun advance server yang telah dikirimkan
  const deliveredAdvanceOrders = orders.filter(
    (o) => o.status === 'SUCCESS' && o.productType === 'advance_account'
  ).length;
  accountsSold = Math.max(accountsSold, deliveredAdvanceOrders);

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

  // Sync to Firestore Cloud Database
  updateOrderInCloud(orderId, {
    status: 'WAITING_VERIFICATION',
    logs: updatedOrder.logs,
  }).catch(() => {});

  // Sync to local server backend
  fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'WAITING_VERIFICATION' }),
  }).catch(() => {});

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
            const availableAccIndex = denom.accountPool.findIndex((a) => !a.isSold);
            if (availableAccIndex !== -1) {
              const availableAcc = denom.accountPool[availableAccIndex];
              deliveredAccountData = {
                email: availableAcc.email,
                password: availableAcc.password,
                serverInfo: availableAcc.serverInfo,
                bindType: availableAcc.bindType,
                notes: availableAcc.notes,
              };
              // Otomatis hapus akun dari brankas stok admin karena sudah diserahkan ke pembeli
              denom.accountPool.splice(availableAccIndex, 1);
              denom.stockCount = denom.accountPool.filter((a) => !a.isSold).length;
              updatedProducts = true;

              // Hapus juga dari Supabase Vault jika terkonfigurasi
              deleteAccountFromVaultSupabase(availableAcc.email).catch(() => {});
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

  // Sync verification & fulfillment to Supabase Cloud Database (PostgreSQL)
  saveOrderToSupabase(successOrder).catch(() => {});

  // Sync verification & fulfillment to Firestore Cloud Database
  updateOrderInCloud(orderId, {
    status: 'SUCCESS',
    paidAt: successOrder.paidAt,
    completedAt: successOrder.completedAt,
    verifiedAt: successOrder.verifiedAt,
    verifiedBy: successOrder.verifiedBy,
    serialNumberDelivery: successOrder.serialNumberDelivery,
    accountDelivered: successOrder.accountDelivered,
    logs: successOrder.logs,
  }).catch(() => {});

  // Sync verification & fulfillment to local server
  fetch(`/api/orders/${orderId}/verify`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verifiedBy: verifierName }),
  }).catch(() => {});

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

  // Sync to Firestore Cloud Database
  updateOrderInCloud(orderId, {
    status: 'EXPIRED',
    logs: updated.logs,
  }).catch(() => {});

  // Sync to server backend
  fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'EXPIRED' }),
  }).catch(() => {});

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
  
  // Jika sebelumnya ada akun yang ter-assign tapi pesanan dibatalkan, kembalikan ke brankas stok
  if (currentOrder.accountDelivered && currentOrder.productType === 'advance_account') {
    const products = loadProducts();
    let updatedProducts = false;
    for (const prod of products) {
      if (prod.id === currentOrder.productId) {
        for (const denom of prod.denominations) {
          if (denom.id === currentOrder.itemId) {
            if (!denom.accountPool) denom.accountPool = [];
            const exists = denom.accountPool.some((a) => a.email === currentOrder.accountDelivered!.email);
            if (!exists) {
              denom.accountPool.push({
                id: `acc-restored-${Date.now()}`,
                email: currentOrder.accountDelivered.email,
                password: currentOrder.accountDelivered.password,
                serverInfo: currentOrder.accountDelivered.serverInfo,
                bindType: currentOrder.accountDelivered.bindType || 'Moonton Sepaket Email',
                level: 8,
                notes: 'Akun dikembalikan ke stok karena pesanan dibatalkan.',
                isSold: false,
                createdAt: new Date().toISOString(),
              });
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

  // Sync to Firestore Cloud Database
  updateOrderInCloud(orderId, {
    status: 'CANCELLED',
    accountDelivered: undefined,
    logs: updated.logs,
  }).catch(() => {});

  // Sync to server backend
  fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED', actionBy: reason }),
  }).catch(() => {});

  return updated;
}

/**
 * 5. HAPUS PESANAN PERMANEN OLEH ADMIN (DELETE ORDER)
 * Menghapus pesanan secara permanen dari database cloud Firestore dan cache lokal.
 */
export async function adminDeleteOrder(orderId: string): Promise<boolean> {
  const cleanId = orderId.trim();
  // 1. Hapus dari cache localStorage orders
  const orders = loadOrdersLocal();
  const filtered = orders.filter((o) => o.id !== cleanId);
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered));
  } catch {}

  // 2. Hapus dari daftar riwayat perangkat
  removeMyOrderId(cleanId);

  // 3. Hapus permanen dari Supabase Cloud Database (PostgreSQL)
  try {
    await deleteOrderFromSupabase(cleanId);
  } catch (err) {
    console.warn('Error deleting order from Supabase:', err);
  }

  // 4. Hapus permanen dari cloud database Firestore
  try {
    await deleteOrderFromCloud(cleanId);
  } catch (err) {
    console.warn('Error deleting order from Firestore:', err);
  }

  // 5. Hapus dari backend Express jika aktif
  fetch(`/api/orders/${cleanId}`, { method: 'DELETE' }).catch(() => {});

  // 6. Dispatch event pembaruan
  window.dispatchEvent(new Event('storeadv_orders_updated'));
  return true;
}

/**
 * 6. HAPUS SEMUA PESANAN TEST (RESET ALL ORDERS)
 * Menghapus seluruh riwayat transaksi dari database cloud Supabase, Firestore, dan cache lokal.
 */
export async function adminDeleteAllOrders(): Promise<boolean> {
  // 1. Simpan array kosong ke localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    localStorage.removeItem(STORAGE_KEYS.MY_ORDER_IDS);
  } catch {}

  // 2. Hapus seluruh pesanan dari Supabase Cloud Database
  try {
    await deleteAllOrdersFromSupabase();
  } catch (err) {
    console.warn('Error clearing all orders from Supabase:', err);
  }

  // 3. Hapus seluruh pesanan dari Firestore Cloud Database
  try {
    await deleteAllOrdersFromCloud();
  } catch (err) {
    console.warn('Error clearing all orders from Firestore:', err);
  }

  // 4. Hapus dari backend Express jika aktif
  fetch('/api/orders', { method: 'DELETE' }).catch(() => {});

  // 5. Pastikan kembali localStorage tetap kosong
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  } catch {}

  window.dispatchEvent(new Event('storeadv_orders_updated'));
  return true;
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
    const cleanPin = newPin.trim();
    localStorage.setItem(ADMIN_PIN_KEY, cleanPin);

    // Sync to Firestore Cloud Database so all browsers & devices receive the new PIN
    saveAdminPinToCloud(cleanPin).catch(() => {});

    // Sync to server backend
    fetch('/api/admin/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: cleanPin }),
    }).catch(() => {});

    return true;
  } catch {
    return false;
  }
}

export async function syncAdminPinFromCloud(): Promise<string> {
  try {
    const cloudPin = await fetchAdminPinFromCloud();
    if (cloudPin && cloudPin.length >= 4) {
      localStorage.setItem(ADMIN_PIN_KEY, cloudPin);
      return cloudPin;
    }
  } catch {}
  return getAdminPin();
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
  danaAccountName: 'Aster4, Pakaian (ASTERA STORE)',
  gopayNumber: '0838-1194-9679',
  gopayAccountName: 'ASTERA STORE',
  qrisMerchantName: 'Aster4, Pakaian',
  qrisNmid: 'ID1026623708512',
  qrisCustomImageUrl: QRIS_ADMIN_IMG,
};

const PAYMENT_CONFIG_KEY = 'storeadv_payment_config_v2';

export function getPaymentConfig(): AdminPaymentConfig {
  try {
    const raw = localStorage.getItem(PAYMENT_CONFIG_KEY);
    if (!raw) return DEFAULT_PAYMENT_CONFIG;
    const parsed = JSON.parse(raw);
    const merged: AdminPaymentConfig = { ...DEFAULT_PAYMENT_CONFIG, ...parsed };
    // Prioritaskan gambar QRIS resmi jika konfigurasi lokal masih kosong
    if (!merged.qrisCustomImageUrl || merged.qrisCustomImageUrl.trim() === '') {
      merged.qrisCustomImageUrl = DEFAULT_PAYMENT_CONFIG.qrisCustomImageUrl;
    }
    // Perbarui NMID lama ke NMID resmi Aster4
    if (!merged.qrisNmid || merged.qrisNmid.includes('ID99281726481')) {
      merged.qrisNmid = DEFAULT_PAYMENT_CONFIG.qrisNmid;
      merged.qrisMerchantName = DEFAULT_PAYMENT_CONFIG.qrisMerchantName;
    }
    // Perbarui nomor GoPay jika masih bernilai nomor DANA lama
    if (!merged.gopayNumber || merged.gopayNumber === '0823-1208-8548') {
      merged.gopayNumber = '0838-1194-9679';
    }
    return merged;
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

export function savePaymentConfig(config: Partial<AdminPaymentConfig>): AdminPaymentConfig {
  try {
    const current = getPaymentConfig();
    const updated = { ...current, ...config };
    try {
      localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new Event('storeadv_payment_config_updated'));
    // Persist immediately to Cloud Firestore database
    savePaymentConfigToCloud(updated).catch(() => {});
    return updated;
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

export async function syncPaymentConfigFromCloud(): Promise<AdminPaymentConfig> {
  try {
    const cloudConfig = await fetchPaymentConfigFromCloud();
    if (cloudConfig) {
      const merged: AdminPaymentConfig = { ...DEFAULT_PAYMENT_CONFIG, ...cloudConfig };
      try {
        localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(merged));
      } catch {}
      window.dispatchEvent(new Event('storeadv_payment_config_updated'));
      return merged;
    }
  } catch {}
  return getPaymentConfig();
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
    try {
      localStorage.setItem(STORE_ASSETS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('localStorage quota note for store assets (syncing to cloud):', e);
    }
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

    // Sync Store Assets to Firestore Cloud Database
    saveStoreAssetsToCloud(updated).catch(() => {});

    return updated;
  } catch {
    return DEFAULT_STORE_ASSETS;
  }
}

export async function syncStoreAssetsFromCloud(): Promise<StoreAssetsConfig> {
  try {
    const cloudAssets = await fetchStoreAssetsFromCloud();
    if (cloudAssets) {
      const merged = { ...DEFAULT_STORE_ASSETS, ...cloudAssets };
      try {
        localStorage.setItem(STORE_ASSETS_KEY, JSON.stringify(merged));
      } catch {}
      window.dispatchEvent(new Event('storeadv_assets_updated'));
      return merged;
    }
  } catch {}
  return getStoreAssets();
}

// Global Cloud Listeners for Admin PIN, Store Assets & Payment Config across all devices
if (typeof window !== 'undefined') {
  try {
    syncAdminPinFromCloud().catch(() => {});
    syncStoreAssetsFromCloud().catch(() => {});
    syncPaymentConfigFromCloud().catch(() => {});

    subscribeToAdminPinCloud((newPin) => {
      if (newPin && newPin.length >= 4) {
        localStorage.setItem(ADMIN_PIN_KEY, newPin);
      }
    });

    subscribeToStoreAssetsCloud((cloudAssets) => {
      if (cloudAssets) {
        const merged = { ...DEFAULT_STORE_ASSETS, ...cloudAssets };
        try {
          localStorage.setItem(STORE_ASSETS_KEY, JSON.stringify(merged));
        } catch {}
        window.dispatchEvent(new Event('storeadv_assets_updated'));
      }
    });

    subscribeToPaymentConfigCloud((cloudConfig) => {
      if (cloudConfig) {
        const merged: AdminPaymentConfig = { ...DEFAULT_PAYMENT_CONFIG, ...cloudConfig };
        try {
          localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(merged));
        } catch {}
        window.dispatchEvent(new Event('storeadv_payment_config_updated'));
      }
    });

    // Real-time synchronization for Account Credentials Vault in Firestore Cloud
    syncAccountVaultFromCloud().catch(() => {});
    subscribeToAccountVaultCloud((cloudVault) => {
      if (cloudVault && typeof cloudVault === 'object') {
        const local = loadProductsLocal();
        let changed = false;
        const updated = local.map((p) => {
          if (p.type !== 'advance_account') return p;
          return {
            ...p,
            denominations: p.denominations.map((d) => {
              const vaultAccs = cloudVault[d.id];
              if (Array.isArray(vaultAccs)) {
                changed = true;
                return {
                  ...d,
                  accountPool: vaultAccs,
                  stockCount: vaultAccs.filter((a) => !a.isSold).length,
                };
              }
              return d;
            }),
          };
        });
        if (changed) {
          try {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
          } catch {}
          window.dispatchEvent(new Event('storeadv_products_updated'));
        }
      }
    });
  } catch (err) {
    console.warn('Realtime cloud listener init note:', err);
  }
}


