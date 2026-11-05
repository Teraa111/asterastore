import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import { Order, ProductCatalog } from '../types/store';
import firebaseConfigRaw from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigRaw.projectId,
  appId: firebaseConfigRaw.appId,
  apiKey: firebaseConfigRaw.apiKey,
  authDomain: firebaseConfigRaw.authDomain,
  storageBucket: firebaseConfigRaw.storageBucket,
  messagingSenderId: firebaseConfigRaw.messagingSenderId,
};

let app: any = null;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (err) {
  console.warn('Firebase initializeApp note:', err);
}

// Safely obtain Firestore instance without crashing on missing provider
let db: Firestore | null = null;

export function getValidDb(): Firestore | null {
  if (db) return db;
  if (!app) return null;
  try {
    if (firebaseConfigRaw.firestoreDatabaseId && firebaseConfigRaw.firestoreDatabaseId !== '(default)') {
      db = getFirestore(app, firebaseConfigRaw.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
  } catch (err) {
    try {
      db = getFirestore(app);
    } catch (err2) {
      console.warn('Firestore service currently deferred or unavailable:', err2);
      db = null;
    }
  }
  return db;
}

// Attempt initial binding
getValidDb();

export { db };

const ORDERS_COLLECTION = 'orders';
const PRODUCTS_COLLECTION = 'products';

/**
 * Save / Upsert order in Firestore cloud database
 */
export async function saveOrderToCloud(order: Order): Promise<void> {
  const activeDb = getValidDb();
  if (!activeDb) return;
  try {
    const orderDocRef = doc(activeDb, ORDERS_COLLECTION, order.id);
    const cleaned = JSON.parse(JSON.stringify(order));
    await setDoc(orderDocRef, cleaned, { merge: true });
  } catch (err) {
    console.warn('Error saving order to Firestore:', err);
  }
}

/**
 * Update order status or fields in Firestore cloud database
 */
export async function updateOrderInCloud(orderId: string, updates: Partial<Order>): Promise<void> {
  const activeDb = getValidDb();
  if (!activeDb) return;
  try {
    const orderDocRef = doc(activeDb, ORDERS_COLLECTION, orderId);
    const cleaned = JSON.parse(JSON.stringify(updates));
    await updateDoc(orderDocRef, cleaned);
  } catch (err) {
    console.warn('Error updating order in Firestore:', err);
  }
}

/**
 * Permanently delete single order from Firestore cloud database
 */
export async function deleteOrderFromCloud(orderId: string): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const orderDocRef = doc(activeDb, ORDERS_COLLECTION, orderId);
    await deleteDoc(orderDocRef);
    return true;
  } catch (err) {
    console.warn('Error deleting order from Firestore:', err);
    return false;
  }
}

/**
 * Permanently clear all test orders from Firestore cloud database
 */
export async function deleteAllOrdersFromCloud(): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const snapshot = await getDocs(collection(activeDb, ORDERS_COLLECTION));
    if (snapshot.empty) return true;
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    return true;
  } catch (err) {
    console.warn('Error clearing orders from Firestore:', err);
    return false;
  }
}

/**
 * Fetch all orders from Firestore cloud database
 */
export async function fetchOrdersFromCloud(): Promise<Order[]> {
  const activeDb = getValidDb();
  if (!activeDb) return [];
  try {
    const q = query(collection(activeDb, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const list: Order[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as Order);
    });
    return list;
  } catch (err) {
    console.warn('Error fetching orders from Firestore:', err);
    return [];
  }
}

/**
 * Real-time listener for orders across all devices (buyers & admins)
 */
export function subscribeToOrdersCloud(onOrdersChange: (orders: Order[]) => void): () => void {
  const activeDb = getValidDb();
  if (!activeDb) return () => {};
  try {
    const q = query(collection(activeDb, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Order);
        });
        onOrdersChange(list);
      },
      (err) => {
        console.warn('Firestore onSnapshot warning:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore orders:', err);
    return () => {};
  }
}

/**
 * Fetch single order by ID from Firestore
 */
export async function getOrderFromCloud(orderId: string): Promise<Order | null> {
  const activeDb = getValidDb();
  if (!activeDb) return null;
  try {
    const d = await getDoc(doc(activeDb, ORDERS_COLLECTION, orderId));
    if (d.exists()) {
      return d.data() as Order;
    }
  } catch (err) {
    console.warn('Error getting single order from Firestore:', err);
  }
  return null;
}

/**
 * Save products catalog in Firestore
 */
export async function saveProductsToCloud(products: ProductCatalog[]): Promise<void> {
  const activeDb = getValidDb();
  if (!activeDb) return;
  try {
    for (const prod of products) {
      const prodDocRef = doc(activeDb, PRODUCTS_COLLECTION, prod.id);
      const cleaned = JSON.parse(JSON.stringify(prod));
      await setDoc(prodDocRef, cleaned, { merge: true });
    }
  } catch (err) {
    console.warn('Error saving products to Firestore:', err);
  }
}

/**
 * Fetch products catalog from Firestore
 */
export async function fetchProductsFromCloud(): Promise<ProductCatalog[]> {
  const activeDb = getValidDb();
  if (!activeDb) return [];
  try {
    const snapshot = await getDocs(collection(activeDb, PRODUCTS_COLLECTION));
    const list: ProductCatalog[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ProductCatalog);
    });
    return list;
  } catch (err) {
    console.warn('Error fetching products from Firestore:', err);
    return [];
  }
}

/**
 * Real-time listener for products & stocks across all devices & browsers (Chrome, Hola, incognito, etc.)
 */
export function subscribeToProductsCloud(onProductsChange: (products: ProductCatalog[]) => void): () => void {
  const activeDb = getValidDb();
  if (!activeDb) return () => {};
  try {
    const unsubscribe = onSnapshot(
      collection(activeDb, PRODUCTS_COLLECTION),
      (snapshot) => {
        const list: ProductCatalog[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as ProductCatalog);
        });
        if (list.length > 0) {
          onProductsChange(list);
        }
      },
      (err) => {
        console.warn('Firestore products onSnapshot warning:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore products:', err);
    return () => {};
  }
}

/**
 * Save Admin Security PIN to Cloud Database (Firestore)
 */
export async function saveAdminPinToCloud(newPin: string): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const configDocRef = doc(activeDb, 'config', 'admin_security');
    await setDoc(configDocRef, {
      adminPin: newPin.trim(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error saving admin PIN to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Admin Security PIN from Cloud Database
 */
export async function fetchAdminPinFromCloud(): Promise<string | null> {
  const activeDb = getValidDb();
  if (!activeDb) return null;
  try {
    const d = await getDoc(doc(activeDb, 'config', 'admin_security'));
    if (d.exists()) {
      const data = d.data();
      if (data && typeof data.adminPin === 'string' && data.adminPin.trim().length >= 4) {
        return data.adminPin.trim();
      }
    }
  } catch (err) {
    console.warn('Error fetching admin PIN from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Admin PIN updates across all devices
 */
export function subscribeToAdminPinCloud(onPinChange: (pin: string) => void): () => void {
  const activeDb = getValidDb();
  if (!activeDb) return () => {};
  try {
    return onSnapshot(
      doc(activeDb, 'config', 'admin_security'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && typeof data.adminPin === 'string' && data.adminPin.trim().length >= 4) {
            onPinChange(data.adminPin.trim());
          }
        }
      },
      (err) => {
        console.warn('Firestore admin PIN onSnapshot warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Save Store Assets (Logo, Hero Banner) to Cloud Database
 */
export async function saveStoreAssetsToCloud(assets: { storeLogoImg?: string; heroBannerImg?: string }): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const configDocRef = doc(activeDb, 'config', 'store_assets');
    const cleaned = JSON.parse(JSON.stringify(assets));
    await setDoc(configDocRef, {
      ...cleaned,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error saving store assets to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Store Assets from Cloud Database
 */
export async function fetchStoreAssetsFromCloud(): Promise<any | null> {
  const activeDb = getValidDb();
  if (!activeDb) return null;
  try {
    const d = await getDoc(doc(activeDb, 'config', 'store_assets'));
    if (d.exists()) {
      return d.data();
    }
  } catch (err) {
    console.warn('Error fetching store assets from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Store Assets updates across all devices
 */
export function subscribeToStoreAssetsCloud(onAssetsChange: (assets: any) => void): () => void {
  const activeDb = getValidDb();
  if (!activeDb) return () => {};
  try {
    return onSnapshot(
      doc(activeDb, 'config', 'store_assets'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data) {
            onAssetsChange(data);
          }
        }
      },
      (err) => {
        console.warn('Firestore store assets onSnapshot warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Save Payment Configuration (QRIS, DANA, Merchant) to Cloud Database
 */
export async function savePaymentConfigToCloud(config: any): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const configDocRef = doc(activeDb, 'config', 'payment_settings');
    await setDoc(configDocRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error saving payment config to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Payment Configuration from Cloud Database
 */
export async function fetchPaymentConfigFromCloud(): Promise<any | null> {
  const activeDb = getValidDb();
  if (!activeDb) return null;
  try {
    const d = await getDoc(doc(activeDb, 'config', 'payment_settings'));
    if (d.exists()) {
      return d.data();
    }
  } catch (err) {
    console.warn('Error fetching payment config from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Payment Configuration across all devices
 */
export function subscribeToPaymentConfigCloud(onConfigChange: (config: any) => void): () => void {
  const activeDb = getValidDb();
  if (!activeDb) return () => {};
  try {
    return onSnapshot(
      doc(activeDb, 'config', 'payment_settings'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data) {
            onConfigChange(data);
          }
        }
      },
      (err) => {
        console.warn('Firestore payment config onSnapshot warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Save Account Vault (Moonton email, password, server, level) directly to Firestore
 */
export async function saveAccountVaultToCloud(vault: Record<string, any[]>): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const vaultDocRef = doc(activeDb, 'config', 'account_vault');
    const cleaned = JSON.parse(JSON.stringify(vault));
    await setDoc(vaultDocRef, {
      vault: cleaned,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error saving account vault to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Account Vault from Firestore
 */
export async function fetchAccountVaultFromCloud(): Promise<Record<string, any[]> | null> {
  const activeDb = getValidDb();
  if (!activeDb) return null;
  try {
    const d = await getDoc(doc(activeDb, 'config', 'account_vault'));
    if (d.exists()) {
      const data = d.data();
      if (data && data.vault) {
        return data.vault as Record<string, any[]>;
      }
    }
  } catch (err) {
    console.warn('Error fetching account vault from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Account Vault updates across all Admin devices
 */
export function subscribeToAccountVaultCloud(onVaultChange: (vault: Record<string, any[]>) => void): () => void {
  const activeDb = getValidDb();
  if (!activeDb) return () => {};
  try {
    return onSnapshot(
      doc(activeDb, 'config', 'account_vault'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.vault) {
            onVaultChange(data.vault);
          }
        }
      },
      (err) => {
        console.warn('Firestore account vault onSnapshot warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Save single deleted order ID to Firestore config so all browsers purge it
 */
export async function saveDeletedOrderIdToCloud(orderId: string): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const cleanId = orderId.trim();
    const configDocRef = doc(activeDb, 'config', 'deleted_orders');
    const existing = await getDoc(configDocRef);
    let currentIds: string[] = [];
    if (existing.exists()) {
      const data = existing.data();
      if (Array.isArray(data?.deletedIds)) {
        currentIds = data.deletedIds;
      }
    }
    if (!currentIds.includes(cleanId)) {
      currentIds.push(cleanId);
    }
    await setDoc(configDocRef, {
      deletedIds: currentIds,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error saving deleted order to Firestore config:', err);
    return false;
  }
}

/**
 * Record a full orders reset in Firestore so all other browsers automatically clear their caches
 */
export async function saveOrdersResetToCloud(resetTimestamp: number, allDeletedIds: string[] = []): Promise<boolean> {
  const activeDb = getValidDb();
  if (!activeDb) return false;
  try {
    const configDocRef = doc(activeDb, 'config', 'deleted_orders');
    const existing = await getDoc(configDocRef);
    let currentIds: string[] = [];
    if (existing.exists()) {
      const data = existing.data();
      if (Array.isArray(data?.deletedIds)) {
        currentIds = data.deletedIds;
      }
    }
    const combined = Array.from(new Set([...currentIds, ...allDeletedIds]));
    await setDoc(configDocRef, {
      deletedIds: combined,
      lastResetAt: resetTimestamp,
      resetAtIso: new Date(resetTimestamp).toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error saving orders reset to Firestore config:', err);
    return false;
  }
}

/**
 * Fetch deleted order IDs & reset timestamp from Firestore
 */
export async function fetchDeletedOrdersFromCloud(): Promise<{ deletedIds: string[]; lastResetAt: number }> {
  const activeDb = getValidDb();
  if (!activeDb) return { deletedIds: [], lastResetAt: 0 };
  try {
    const d = await getDoc(doc(activeDb, 'config', 'deleted_orders'));
    if (d.exists()) {
      const data = d.data();
      return {
        deletedIds: Array.isArray(data?.deletedIds) ? data.deletedIds : [],
        lastResetAt: Number(data?.lastResetAt) || 0,
      };
    }
  } catch (err) {
    console.warn('Error fetching deleted orders from Firestore:', err);
  }
  return { deletedIds: [], lastResetAt: 0 };
}

/**
 * Real-time listener for deleted order IDs and resets across all browsers
 */
export function subscribeToDeletedOrdersCloud(
  onChange: (info: { deletedIds: string[]; lastResetAt: number }) => void
): () => void {
  const activeDb = getValidDb();
  if (!activeDb) return () => {};
  try {
    return onSnapshot(
      doc(activeDb, 'config', 'deleted_orders'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onChange({
            deletedIds: Array.isArray(data?.deletedIds) ? data.deletedIds : [],
            lastResetAt: Number(data?.lastResetAt) || 0,
          });
        }
      },
      (err) => {
        console.warn('Firestore deleted orders onSnapshot warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}
