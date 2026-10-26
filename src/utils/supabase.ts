import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProductCatalog, AccountCredential, Order } from '../types/store';

// Retrieve credentials safely from Vite environment or manual Admin configuration
export const getSupabaseConfig = (): { url: string; anonKey: string; isCustom: boolean } => {
  let customUrl = '';
  let customKey = '';
  try {
    customUrl = localStorage.getItem('storeadv_supabase_custom_url') || '';
    customKey = localStorage.getItem('storeadv_supabase_custom_key') || '';
  } catch {}

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && !envUrl.includes('your-project-id') && envKey && !envKey.includes('your-anon-public-key')) {
    return { url: envUrl, anonKey: envKey, isCustom: false };
  }

  if (customUrl.trim() && customKey.trim()) {
    return { url: customUrl.trim(), anonKey: customKey.trim(), isCustom: true };
  }

  return { url: envUrl, anonKey: envKey, isCustom: false };
};

export const setCustomSupabaseConfig = (url: string, anonKey: string): void => {
  try {
    if (url.trim() && anonKey.trim()) {
      localStorage.setItem('storeadv_supabase_custom_url', url.trim());
      localStorage.setItem('storeadv_supabase_custom_key', anonKey.trim());
    } else {
      localStorage.removeItem('storeadv_supabase_custom_url');
      localStorage.removeItem('storeadv_supabase_custom_key');
    }
  } catch {}
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  return (
    typeof url === 'string' &&
    url.length > 0 &&
    !url.includes('your-project-id') &&
    typeof anonKey === 'string' &&
    anonKey.length > 0 &&
    !anonKey.includes('your-anon-public-key')
  );
};

const initSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabaseConfig();
  try {
    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
};

export let supabase: SupabaseClient | null = initSupabaseClient();

export const refreshSupabaseClient = (): SupabaseClient | null => {
  supabase = initSupabaseClient();
  return supabase;
};

export const SUPABASE_SETUP_SQL = `-- ============================================================
-- ASTERA STORE: ENTERPRISE SUPABASE DATABASE & REALTIME SETUP
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New query -> RUN
-- ============================================================

-- 1. TABEL PRODUK & KATALOG PUBLIK (Stok real-time, TANPA password)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  cover_image TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  denominations JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 2. TABEL BRANKAS KREDENSIAL AKUN (Sangat Privat & Terenkripsi)
CREATE TABLE IF NOT EXISTS public.account_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  denomination_id TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT 'mlbb-advance-server',
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  server_info TEXT,
  bind_type TEXT DEFAULT 'Moonton Sepaket Email',
  level INT DEFAULT 8,
  notes TEXT,
  is_sold BOOLEAN DEFAULT FALSE,
  sold_to_order_id TEXT,
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_account_vault_denom ON public.account_vault(denomination_id, is_sold);

-- 3. TABEL PESANAN & INVOICE CLOUD (Lintas Perangkat)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  product_type TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT,
  item_id TEXT NOT NULL,
  item_name TEXT,
  user_id TEXT,
  zone_id TEXT,
  user_nickname TEXT,
  whatsapp TEXT NOT NULL,
  email TEXT,
  payment_method_name TEXT,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  serial_number TEXT,
  account_delivered JSONB,
  logs JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Products: Publik boleh membaca katalog & jumlah stok
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Products: Sinkronisasi katalog
DROP POLICY IF EXISTS "Allow upsert products" ON public.products;
CREATE POLICY "Allow upsert products"
  ON public.products FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Account Vault: Pengunjung & Admin
DROP POLICY IF EXISTS "Allow insert account_vault" ON public.account_vault;
CREATE POLICY "Allow insert account_vault"
  ON public.account_vault FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select account_vault" ON public.account_vault;
CREATE POLICY "Allow select account_vault"
  ON public.account_vault FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow update account_vault" ON public.account_vault;
CREATE POLICY "Allow update account_vault"
  ON public.account_vault FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete account_vault" ON public.account_vault;
CREATE POLICY "Allow delete account_vault"
  ON public.account_vault FOR DELETE
  TO anon, authenticated
  USING (true);

-- Orders: Pengunjung boleh membuat order & melihat invoice mereka
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can select orders" ON public.orders;
CREATE POLICY "Public can select orders"
  ON public.orders FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow update orders" ON public.orders;
CREATE POLICY "Allow update orders"
  ON public.orders FOR UPDATE
  TO anon, authenticated
  USING (true);

-- 5. ATOMIC FULFILLMENT FUNCTION (Mencegah 2 pembeli dapat 1 akun yang sama)
CREATE OR REPLACE FUNCTION public.admin_fulfill_order_atomic(
  p_order_id TEXT,
  p_item_id TEXT,
  p_verifier_name TEXT DEFAULT 'Admin ASTERA STORE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
BEGIN
  -- Kunci tepat 1 akun ready yang belum terjual dengan FOR UPDATE SKIP LOCKED
  SELECT id, email, password, server_info, bind_type, notes
  INTO v_account
  FROM public.account_vault
  WHERE denomination_id = p_item_id
    AND is_sold = FALSE
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Stok akun untuk paket ini sudah habis di brankas database!'
    );
  END IF;

  -- Hapus akun dari brankas stok karena telah dikirimkan kepada pembeli
  DELETE FROM public.account_vault
  WHERE id = v_account.id;

  -- Sinkronkan sisa stok ke tabel products
  UPDATE public.products p
  SET denominations = (
    SELECT jsonb_agg(
      CASE 
        WHEN (d->>'id') = p_item_id THEN
          jsonb_set(d, '{stockCount}', to_jsonb(
            COALESCE((
              SELECT count(*)::int 
              FROM public.account_vault av 
              WHERE av.denomination_id = p_item_id AND av.is_sold = FALSE
            ), 0)
          ))
        ELSE d
      END
    )
    FROM jsonb_array_elements(p.denominations) AS d
  ),
  updated_at = now()
  WHERE p.id = 'mlbb-advance-server';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Akun berhasil dialokasikan secara atomik.',
    'account', jsonb_build_object(
      'email', v_account.email,
      'password', v_account.password,
      'serverInfo', v_account.server_info,
      'bindType', v_account.bind_type,
      'notes', v_account.notes
    )
  );
END;
$$;

-- 6. PUBLIKASI REALTIME (Broadcast otomatis ke Chrome, Hola, Mobile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
`;

/**
 * Diagnostic helper: checks whether Supabase connection & table 'products' exist
 */
export async function checkSupabaseStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  tablesExist: boolean;
  errorMessage?: string;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      configured: false,
      connected: false,
      tablesExist: false,
      errorMessage: 'VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum terkonfigurasi di env/Vercel.',
    };
  }

  try {
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "products" does not exist')) {
        return {
          configured: true,
          connected: true,
          tablesExist: false,
          errorMessage: 'Tabel "products" belum dibuat di Supabase SQL Editor.',
        };
      }
      return {
        configured: true,
        connected: false,
        tablesExist: false,
        errorMessage: error.message,
      };
    }
    return {
      configured: true,
      connected: true,
      tablesExist: true,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      tablesExist: false,
      errorMessage: err?.message || 'Gagal menghubungi server Supabase.',
    };
  }
}

/**
 * Fetch all public products with real-time stock counts from Supabase.
 * Does NOT contain sensitive credentials (email/password).
 */
export async function fetchProductsFromSupabase(): Promise<ProductCatalog[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Supabase fetchProducts warning:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      // Map database row back to ProductCatalog
      return data.map((row: any) => ({
        id: row.id,
        type: row.id.includes('bbcoin') ? 'bbcoin_diamond' : 'advance_account',
        title: row.title,
        subtitle: row.subtitle || '',
        publisher: 'Moonton',
        badge: row.badge || 'Official Reseller',
        coverImage: row.cover_image || '',
        shortDesc: row.short_desc || '',
        needPlayerId: row.id.includes('bbcoin'),
        needZoneId: row.id.includes('bbcoin'),
        isActive: row.is_active ?? true,
        denominations: Array.isArray(row.denominations) ? row.denominations : [],
      }));
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch products from Supabase:', err);
    return null;
  }
}

/**
 * Sync initial products catalog to Supabase (only used for setup or initial migration)
 */
export async function syncInitialProductsToSupabase(products: ProductCatalog[]): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client belum aktif. Pastikan VITE_SUPABASE_URL sudah diisi di Vercel/env.',
    };
  }

  try {
    for (const p of products) {
      // Sanitize denominations so credentials are NEVER placed into public products table
      const sanitizedDenoms = p.denominations.map((d) => {
        const { accountPool, ...rest } = d;
        // Count stock based on pool if present and populated, otherwise preserve stockCount
        const count =
          Array.isArray(accountPool) && accountPool.length > 0
            ? accountPool.filter((a) => !a.isSold).length
            : typeof d.stockCount === 'number'
            ? d.stockCount
            : 0;
        return {
          ...rest,
          stockCount: count,
        };
      });

      const payload = {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        cover_image: p.coverImage,
        is_active: p.isActive ?? true,
        denominations: sanitizedDenoms,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Failed to upsert product into Supabase:', error.message);
        if (error.code === '42P01' || error.message.includes('relation "products" does not exist')) {
          return {
            success: false,
            error: 'Tabel "products" belum ada di Supabase! Harap jalankan SQL Setup di Supabase Dashboard -> SQL Editor.',
          };
        }
        return { success: false, error: error.message };
      }

      // Upload akun ready dari pool ke tabel privat account_vault
      for (const d of p.denominations) {
        if (d.accountPool && d.accountPool.length > 0) {
          for (const acc of d.accountPool) {
            if (!acc.isSold && acc.email && acc.password) {
              try {
                await supabase.from('account_vault').upsert(
                  {
                    denomination_id: d.id,
                    product_id: p.id,
                    email: acc.email.trim(),
                    password: acc.password.trim(),
                    server_info: acc.serverInfo || 'Server 5701 (Advance Server)',
                    bind_type: acc.bindType || 'Moonton Sepaket Email',
                    level: acc.level || 8,
                    notes: acc.notes || '',
                    is_sold: false,
                  },
                  { onConflict: 'email' }
                );
              } catch {
                // ignore
              }
            }
          }
        }
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error syncing products to Supabase:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan ke Supabase' };
  }
}

/**
 * Realtime subscription for products & stock updates across all browsers (Chrome, Hola, etc.)
 */
export function subscribeToProductsSupabase(
  onUpdate: (products: ProductCatalog[]) => void
): (() => void) | null {
  const client = supabase;
  if (!client) return null;

  try {
    const channelName = `products-sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async () => {
          const fresh = await fetchProductsFromSupabase();
          if (fresh && fresh.length > 0) {
            onUpdate(fresh);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`Supabase Realtime channel ${channelName} encountered an error.`);
        }
      });

    return () => {
      try {
        client.removeChannel(channel);
      } catch (err) {
        console.warn('Error removing channel:', err);
      }
    };
  } catch (err) {
    console.error('Error creating Supabase realtime channel:', err);
    return null;
  }
}

/**
 * Vault functions: Add single account credential to protected account_vault table
 */
export async function addAccountToVaultSupabase(
  denomId: string,
  account: Omit<AccountCredential, 'id' | 'createdAt' | 'isSold'>,
  productId = 'mlbb-advance-server'
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('account_vault').insert({
      denomination_id: denomId,
      product_id: productId,
      email: account.email,
      password: account.password,
      server_info: account.serverInfo,
      bind_type: account.bindType,
      level: account.level || 8,
      notes: account.notes || '',
      is_sold: false,
    });

    if (error) {
      console.error('Failed to add account to Supabase vault:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in addAccountToVaultSupabase:', err);
    return false;
  }
}

/**
 * Fetch accounts from protected vault (only accessible by Admin with valid session)
 */
export async function fetchVaultAccountsSupabase(denomId?: string): Promise<AccountCredential[]> {
  if (!supabase) return [];
  try {
    let query = supabase.from('account_vault').select('*').order('created_at', { ascending: false });
    if (denomId) {
      query = query.eq('denomination_id', denomId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Vault fetch note (RLS/Auth):', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      password: row.password,
      serverInfo: row.server_info,
      bindType: row.bind_type,
      level: row.level,
      notes: row.notes,
      isSold: row.is_sold,
      soldToOrderId: row.sold_to_order_id,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Error fetching vault accounts:', err);
    return [];
  }
}

/**
 * Atomic fulfillment via PostgreSQL stored function:
 * Locks exactly 1 available account with FOR UPDATE SKIP LOCKED,
 * marks it sold, and returns credentials to Admin.
 */
export async function fulfillOrderAtomicSupabase(
  orderId: string,
  itemId: string,
  verifierName: string
): Promise<{ success: boolean; account?: any; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client belum terhubung' };
  }

  try {
    const { data, error } = await supabase.rpc('admin_fulfill_order_atomic', {
      p_order_id: orderId,
      p_item_id: itemId,
      p_verifier_name: verifierName,
    });

    if (error) {
      console.warn('RPC admin_fulfill_order_atomic error:', error.message);
      return { success: false, message: error.message };
    }

    return data as { success: boolean; account?: any; message: string };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal memproses transaksi atomik' };
  }
}

/**
 * Remove/delete a delivered account permanently from Supabase account_vault
 */
export async function deleteAccountFromVaultSupabase(email: string): Promise<boolean> {
  if (!supabase || !email) return false;
  try {
    const { error } = await supabase.from('account_vault').delete().eq('email', email.trim());
    if (error) {
      console.warn('Delete from Supabase vault warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error in deleteAccountFromVaultSupabase:', err);
    return false;
  }
}

/**
 * Save an order to Supabase orders table
 */
export async function saveOrderToSupabase(order: Order): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = {
      id: order.id,
      created_at: order.createdAt,
      product_type: order.productType,
      product_id: order.productId,
      product_title: order.productTitle,
      item_id: order.itemId,
      item_name: order.itemName,
      user_id: order.userId || null,
      zone_id: order.zoneId || null,
      user_nickname: order.userNickname || null,
      whatsapp: order.whatsapp,
      email: order.email || null,
      payment_method_name: order.paymentMethodName,
      total_amount: order.totalAmount,
      status: order.status,
      paid_at: order.paidAt || null,
      completed_at: order.completedAt || null,
      verified_by: order.verifiedBy || null,
      serial_number: order.serialNumberDelivery || null,
      account_delivered: order.accountDelivered || null,
      logs: Array.isArray(order.logs) ? order.logs : [],
    };

    const { error } = await supabase.from('orders').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveOrder warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to save order to Supabase:', err);
    return false;
  }
}

/**
 * Fetch orders from Supabase orders table
 */
export async function fetchOrdersFromSupabase(): Promise<Order[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Supabase fetchOrders warning:', error.message);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      productType: r.product_type,
      productId: r.product_id,
      productTitle: r.product_title,
      productImage: '',
      itemId: r.item_id,
      itemName: r.item_name,
      userId: r.user_id || undefined,
      zoneId: r.zone_id || undefined,
      userNickname: r.user_nickname || undefined,
      whatsapp: r.whatsapp,
      email: r.email || undefined,
      paymentMethodId: 'qris',
      paymentMethodName: r.payment_method_name || 'QRIS Realtime',
      paymentGroup: 'QRIS',
      subtotal: Number(r.total_amount),
      fee: 0,
      discount: 0,
      totalAmount: Number(r.total_amount),
      status: r.status,
      paidAt: r.paid_at || undefined,
      completedAt: r.completed_at || undefined,
      verifiedBy: r.verified_by || undefined,
      serialNumberDelivery: r.serial_number || undefined,
      accountDelivered: r.account_delivered || undefined,
      logs: Array.isArray(r.logs) ? r.logs : [],
    }));
  } catch (err) {
    console.warn('Failed to fetch orders from Supabase:', err);
    return [];
  }
}

/**
 * Find single order from Supabase by ID
 */
export async function getOrderFromSupabase(id: string): Promise<Order | null> {
  if (!supabase || !id) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id.trim())
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      productType: data.product_type,
      productId: data.product_id,
      productTitle: data.product_title,
      productImage: '',
      itemId: data.item_id,
      itemName: data.item_name,
      userId: data.user_id || undefined,
      zoneId: data.zone_id || undefined,
      userNickname: data.user_nickname || undefined,
      whatsapp: data.whatsapp,
      email: data.email || undefined,
      paymentMethodId: 'qris',
      paymentMethodName: data.payment_method_name || 'QRIS Realtime',
      paymentGroup: 'QRIS',
      subtotal: Number(data.total_amount),
      fee: 0,
      discount: 0,
      totalAmount: Number(data.total_amount),
      status: data.status,
      paidAt: data.paid_at || undefined,
      completedAt: data.completed_at || undefined,
      verifiedBy: data.verified_by || undefined,
      serialNumberDelivery: data.serial_number || undefined,
      accountDelivered: data.account_delivered || undefined,
      logs: Array.isArray(data.logs) ? data.logs : [],
    };
  } catch {
    return null;
  }
}
