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
