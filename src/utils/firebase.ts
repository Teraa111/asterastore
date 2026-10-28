import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use specified firestoreDatabaseId if available
let db: Firestore;
try {
  if (firebaseConfigRaw.firestoreDatabaseId && firebaseConfigRaw.firestoreDatabaseId !== '(default)') {
    db = getFirestore(app, firebaseConfigRaw.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (err) {
  console.warn('Fallback to default firestore database:', err);
  db = getFirestore(app);
}

export { db };

const ORDERS_COLLECTION = 'orders';
const PRODUCTS_COLLECTION = 'products';

/**
 * Save / Upsert order in Firestore cloud database
 */
export async function saveOrderToCloud(order: Order): Promise<void> {
  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, order.id);
    // Convert undefined fields to null or omit them to prevent Firestore undefined errors
    const cleaned = JSON.parse(JSON.stringify(order));
    await setDoc(orderDocRef, cleaned, { merge: true });
  } catch (err) {
    console.error('Error saving order to Firestore:', err);
    throw err;
  }
}

/**
 * Update order status or fields in Firestore cloud database
 */
export async function updateOrderInCloud(orderId: string, updates: Partial<Order>): Promise<void> {
  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    const cleaned = JSON.parse(JSON.stringify(updates));
    await updateDoc(orderDocRef, cleaned);
  } catch (err) {
    console.error('Error updating order in Firestore:', err);
    throw err;
  }
}

/**
 * Fetch all orders from Firestore cloud database
 */
export async function fetchOrdersFromCloud(): Promise<Order[]> {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const list: Order[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as Order);
    });
    return list;
  } catch (err) {
    console.error('Error fetching orders from Firestore:', err);
    return [];
  }
}

/**
 * Real-time listener for orders across all devices (buyers & admins)
 */
export function subscribeToOrdersCloud(onOrdersChange: (orders: Order[]) => void): () => void {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
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
        console.error('Firestore onSnapshot error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to Firestore orders:', err);
    return () => {};
  }
}

/**
 * Fetch single order by ID from Firestore
 */
export async function getOrderFromCloud(orderId: string): Promise<Order | null> {
  try {
    const d = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
    if (d.exists()) {
      return d.data() as Order;
    }
  } catch (err) {
    console.error('Error getting single order from Firestore:', err);
  }
  return null;
}

/**
 * Save products catalog in Firestore
 */
export async function saveProductsToCloud(products: ProductCatalog[]): Promise<void> {
  try {
    for (const prod of products) {
      const prodDocRef = doc(db, PRODUCTS_COLLECTION, prod.id);
      const cleaned = JSON.parse(JSON.stringify(prod));
      await setDoc(prodDocRef, cleaned, { merge: true });
    }
  } catch (err) {
    console.error('Error saving products to Firestore:', err);
  }
}

/**
 * Fetch products catalog from Firestore
 */
export async function fetchProductsFromCloud(): Promise<ProductCatalog[]> {
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const list: ProductCatalog[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as ProductCatalog);
    });
    return list;
  } catch (err) {
    console.error('Error fetching products from Firestore:', err);
    return [];
  }
}

/**
 * Real-time listener for products & stocks across all devices & browsers (Chrome, Hola, incognito, etc.)
 */
export function subscribeToProductsCloud(onProductsChange: (products: ProductCatalog[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, PRODUCTS_COLLECTION),
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
    console.error('Failed to subscribe to Firestore products:', err);
    return () => {};
  }
}

/**
 * Save Admin Security PIN to Cloud Database (Firestore)
 */
export async function saveAdminPinToCloud(newPin: string): Promise<boolean> {
  try {
    const configDocRef = doc(db, 'config', 'admin_security');
    await setDoc(configDocRef, {
      adminPin: newPin.trim(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving admin PIN to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Admin Security PIN from Cloud Database
 */
export async function fetchAdminPinFromCloud(): Promise<string | null> {
  try {
    const d = await getDoc(doc(db, 'config', 'admin_security'));
    if (d.exists()) {
      const data = d.data();
      if (data && typeof data.adminPin === 'string' && data.adminPin.trim().length >= 4) {
        return data.adminPin.trim();
      }
    }
  } catch (err) {
    console.error('Error fetching admin PIN from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Admin PIN updates across all devices
 */
export function subscribeToAdminPinCloud(onPinChange: (newPin: string) => void): () => void {
  try {
    return onSnapshot(
      doc(db, 'config', 'admin_security'),
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
 * Save Store Assets (banners, logos, covers) to Cloud Database
 */
export async function saveStoreAssetsToCloud(assets: any): Promise<boolean> {
  try {
    const configDocRef = doc(db, 'config', 'store_assets');
    await setDoc(configDocRef, {
      ...assets,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving store assets to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Store Assets from Cloud Database
 */
export async function fetchStoreAssetsFromCloud(): Promise<any | null> {
  try {
    const d = await getDoc(doc(db, 'config', 'store_assets'));
    if (d.exists()) {
      return d.data();
    }
  } catch (err) {
    console.error('Error fetching store assets from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Store Assets updates across all devices
 */
export function subscribeToStoreAssetsCloud(onAssetsChange: (assets: any) => void): () => void {
  try {
    return onSnapshot(
      doc(db, 'config', 'store_assets'),
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
  try {
    const configDocRef = doc(db, 'config', 'payment_settings');
    await setDoc(configDocRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving payment config to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Payment Configuration from Cloud Database
 */
export async function fetchPaymentConfigFromCloud(): Promise<any | null> {
  try {
    const d = await getDoc(doc(db, 'config', 'payment_settings'));
    if (d.exists()) {
      return d.data();
    }
  } catch (err) {
    console.error('Error fetching payment config from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Payment Configuration across all devices
 */
export function subscribeToPaymentConfigCloud(onConfigChange: (config: any) => void): () => void {
  try {
    return onSnapshot(
      doc(db, 'config', 'payment_settings'),
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
  try {
    const vaultDocRef = doc(db, 'config', 'account_vault');
    const cleaned = JSON.parse(JSON.stringify(vault));
    await setDoc(vaultDocRef, {
      vault: cleaned,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving account vault to Firestore:', err);
    return false;
  }
}

/**
 * Fetch Account Vault from Firestore
 */
export async function fetchAccountVaultFromCloud(): Promise<Record<string, any[]> | null> {
  try {
    const d = await getDoc(doc(db, 'config', 'account_vault'));
    if (d.exists()) {
      const data = d.data();
      if (data && data.vault) {
        return data.vault as Record<string, any[]>;
      }
    }
  } catch (err) {
    console.error('Error fetching account vault from Firestore:', err);
  }
  return null;
}

/**
 * Real-time listener for Account Vault updates across all Admin devices
 */
export function subscribeToAccountVaultCloud(onVaultChange: (vault: Record<string, any[]>) => void): () => void {
  try {
    return onSnapshot(
      doc(db, 'config', 'account_vault'),
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




