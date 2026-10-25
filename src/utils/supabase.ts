import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProductCatalog, AccountCredential } from '../types/store';

// Retrieve credentials safely from Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project-id') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-public-key')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const SUPABASE_SETUP_SQL = `-- ==========================================
-- ASTERA STORE: SUPABASE DATABASE SETUP SQL
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New query -> RUN
-- ==========================================

-- 1. Buat Tabel Produk Publik (Aman: Tanpa Password / Email Akun)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  cover_image TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  denominations JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan Baca: Pengunjung publik (anon) dan admin dapat membaca katalog & stok
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Kebijakan Tulis: Pengunjung & Admin dapat menyinkronkan stok publik
DROP POLICY IF EXISTS "Allow anon/authenticated upsert products" ON public.products;
CREATE POLICY "Allow anon/authenticated upsert products"
  ON public.products
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Buat Brankas Kredensial Akun (Hanya Kredensial, Terisolasi dari Publik)
CREATE TABLE IF NOT EXISTS public.account_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  denomination_id TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT 'mlbb-advance-server',
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  server_info TEXT,
  bind_type TEXT DEFAULT 'Moonton Sepaket Email',
  level INT DEFAULT 8,
  notes TEXT,
  is_sold BOOLEAN DEFAULT FALSE,
  sold_to_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.account_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert account_vault" ON public.account_vault;
CREATE POLICY "Allow insert account_vault"
  ON public.account_vault
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select account_vault" ON public.account_vault;
CREATE POLICY "Allow select account_vault"
  ON public.account_vault
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow update account_vault" ON public.account_vault;
CREATE POLICY "Allow update account_vault"
  ON public.account_vault
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Aktifkan Realtime Broadcasting agar semua browser (Chrome, Hola, dll.) sinkron otomatis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
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
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel('public:products')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
