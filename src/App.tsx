import React, { useState, useEffect } from 'react';
import { ProductCatalog, Order } from './types/store';
import { loadProducts, loadOrders, getOrderStatusDetails, fetchOrdersFromServer, fetchProductsFromCloudServer, isMyOrderId, applyCloudProductsUpdate } from './utils/storage';
import { subscribeToProductsSupabase } from './utils/supabase';
import { subscribeToProductsCloud } from './utils/firebase';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { GameCard } from './components/GameCard';
import { TopUpOrderEngine } from './components/TopUpOrderEngine';
import { PaymentModal } from './components/PaymentModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { AdminInventory } from './components/AdminInventory';
import { AdminAuthModal } from './components/AdminAuthModal';
import { MlCalculatorModal } from './components/MlCalculatorModal';
import { Footer } from './components/Footer';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { PromoCarousel } from './components/PromoCarousel';
import { Sparkles, Key, Coins, ShieldCheck, Zap, Receipt, ExternalLink, X } from 'lucide-react';
import { useTheme } from './utils/theme';

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const isLight = theme === 'light';
  const [currentView, setCurrentView] = useState<'store' | 'admin'>('store');
  const [products, setProducts] = useState<ProductCatalog[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<ProductCatalog | null>(null);

  // Admin authentication state (protected by PIN)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('storeadv_admin_session') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);

  // Modals
  const [activePaymentOrder, setActivePaymentOrder] = useState<Order | null>(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Live Orders state for persistent active invoice banner
  const [recentOrders, setRecentOrders] = useState<Order[]>(() => loadOrders());
  const [dismissedOrderBannerId, setDismissedOrderBannerId] = useState<string | null>(null);

  // Initial load & reactive listener
  useEffect(() => {
    setProducts(loadProducts());
    setRecentOrders(loadOrders());
    fetchOrdersFromServer();
    fetchProductsFromCloudServer().then((fresh) => {
      if (fresh && fresh.length > 0) {
        setProducts(fresh);
      }
    }).catch(() => {});

    const handleProductsUpdate = () => {
      setProducts(loadProducts());
    };
    const handleOrdersUpdate = () => {
      setRecentOrders(loadOrders());
    };

    window.addEventListener('storeadv_products_updated', handleProductsUpdate);
    window.addEventListener('storeadv_orders_updated', handleOrdersUpdate);

    // 1. Supabase Realtime channel subscription for instant multi-device stock & price updates
    const unsubscribeSupabase = subscribeToProductsSupabase((freshProducts) => {
      applyCloudProductsUpdate(freshProducts);
      setProducts(loadProducts());
    });

    // 2. Firestore Realtime subscription for cross-device & incognito compatibility
    const unsubscribeFirestore = subscribeToProductsCloud((freshProducts) => {
      applyCloudProductsUpdate(freshProducts);
      setProducts(loadProducts());
    });

    const poll = setInterval(() => {
      fetchOrdersFromServer();
      fetchProductsFromCloudServer().catch(() => {});
    }, 4000);

    return () => {
      clearInterval(poll);
      window.removeEventListener('storeadv_products_updated', handleProductsUpdate);
      window.removeEventListener('storeadv_orders_updated', handleOrdersUpdate);
      if (unsubscribeSupabase) {
        unsubscribeSupabase();
      }
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Keep active product view in sync with real-time stock updates from Supabase
  useEffect(() => {
    if (selectedProduct) {
      const refreshed = products.find((p) => p.id === selectedProduct.id);
      if (refreshed && JSON.stringify(refreshed) !== JSON.stringify(selectedProduct)) {
        setSelectedProduct(refreshed);
      }
    }
  }, [products]);


  // Find latest pending or waiting verification order created on THIS device only (Privacy protection)
  const activePendingOrder = recentOrders.find(
    (o) =>
      isMyOrderId(o.id) &&
      (o.status === 'WAITING_VERIFICATION' || o.status === 'PENDING_PAYMENT') &&
      o.id !== dismissedOrderBannerId
  );

  const handleSelectProductId = (id: 'mlbb-advance-server' | 'mlbb-bbcoin' | null) => {
    if (!id) {
      setSelectedProduct(null);
      return;
    }
    const found = products.find((p) => p.id === id);
    if (found) {
      setSelectedProduct(found);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOrderCreated = (order: Order) => {
    setActivePaymentOrder(order);
  };

  // Admin security handlers
  const handleRequestAdminAccess = () => {
    if (isAdminAuthenticated) {
      setCurrentView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAdminAuthOpen(true);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem('storeadv_admin_session', 'true');
    } catch {
      // ignore
    }
    setIsAdminAuthOpen(false);
    setCurrentView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('storeadv_admin_session');
    } catch {
      // ignore
    }
    setCurrentView('store');
  };

  return (
    <div 
      data-theme={theme}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isLight
          ? 'bg-[#eaf4fd] bg-arcade-grid text-slate-800 selection:bg-sky-500 selection:text-white'
          : 'bg-[#0b0416] bg-arcade-grid text-neutral-100 selection:bg-purple-600 selection:text-white'
      }`}
    >
      {/* Universal Top Bar */}
      <Navbar
        currentView={currentView}
        isAdminAuthenticated={isAdminAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={(view) => {
          if (view === 'admin') {
            handleRequestAdminAccess();
          } else {
            setCurrentView('store');
            setSelectedProduct(null);
          }
        }}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onSelectProduct={handleSelectProductId}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {currentView === 'admin' ? (
          isAdminAuthenticated ? (
            /* ENTERPRISE INVENTORY & ORDER MANAGEMENT PORTAL */
            <AdminInventory
              onLogout={handleAdminLogout}
              onBackToStore={() => {
                setSelectedProduct(null);
                setCurrentView('store');
              }}
              onOpenInvoice={(order) => setActivePaymentOrder(order)}
            />
          ) : (
            <div className="py-20 text-center">
              <p className={`font-pixel ${isLight ? 'text-sky-700 font-bold' : 'text-purple-300'}`}>MEMERLUKAN AUTENTIKASI PIN...</p>
            </div>
          )
        ) : selectedProduct ? (
          /* DEDICATED ORDER ENGINE FOR THE SELECTED PRODUCT */
          <TopUpOrderEngine
            product={selectedProduct}
            onBack={() => setSelectedProduct(null)}
            onOrderCreated={handleOrderCreated}
          />
        ) : (
          /* STOREFRONT CATALOG (EXCLUSIVELY THE 2 CORE PRODUCTS) */
          <div>
            {/* Hero Promotional Banner */}
            <HeroBanner
              onSelectProduct={handleSelectProductId}
              onQuickTrack={() => setIsTrackerOpen(true)}
            />

            {/* Kolom Promosi & Event Slider (Under Main Description) */}
            <PromoCarousel onSelectProduct={handleSelectProductId} isAdmin={isAdminAuthenticated} />

            {/* Value Proposition Strip in Retro Arcade Chassis */}
            <div className={`mb-10 p-5 rounded-2xl border-2 transition-all ${
              isLight
                ? 'bg-white/95 border-sky-300 shadow-[0_6px_0_0_#0284c7]'
                : 'bg-[#140628]/95 border-purple-800/80 shadow-[0_6px_0_0_#380b61]'
            }`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-[0_2px_0_0] ${
                    isLight
                      ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-[#bae6fd]'
                      : 'bg-purple-900/60 border-purple-500/50 text-purple-300 shadow-[#4c1d95]'
                  }`}>
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`font-pixel text-base tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>
                      PENGIRIMAN DATA AKUN INSTAN DI WEBSITE
                    </h2>
                    <p className={`text-xs mt-0.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-purple-200/80'}`}>
                      Email & Password Akun Advance Server langsung keluar di layar setelah pembayaran diverifikasi otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-[0_2px_0_0] ${
                    isLight
                      ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-[#fde68a]'
                      : 'bg-cyan-900/60 border-cyan-500/50 text-cyan-300 shadow-[#164e63]'
                  }`}>
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`font-pixel text-base tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>
                      BB COIN AUTO-KONVERSI 5:1 DIAMOND
                    </h2>
                    <p className={`text-xs mt-0.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-purple-200/80'}`}>
                      Jalur resmi Bang Bang Coin Moonton dengan auto-konversi rasio 5:1 langsung masuk ke akun game Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog Section Header in Arcade Pixel Typography */}
            <div className={`mb-6 pb-3 border-b-2 flex items-center justify-between ${
              isLight ? 'border-sky-300' : 'border-purple-900/70'
            }`}>
              <div>
                <h2 className={`text-xl sm:text-2xl font-pixel tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>
                  PILIH LAYANAN ARCADE
                </h2>
                <p className={`text-xs font-pixel mt-1 ${isLight ? 'text-sky-700 font-semibold' : 'text-purple-300/80'}`}>
                  2 PRODUK UTAMA DENGAN SISTEM PENGIRIMAN OTOMATIS
                </p>
              </div>

              <span className={`text-xs font-pixel px-3.5 py-1.5 rounded-xl border-2 shadow-[0_2px_0_0] ${
                isLight
                  ? 'bg-white border-sky-400 text-sky-900 shadow-[#0284c7] font-bold'
                  : 'bg-[#230c44] border-purple-600/70 text-purple-200 shadow-[#4c1d95]'
              }`}>
                ★ 2 PRODUK AKTIF ★
              </span>
            </div>

            {/* Two Main Product Cards Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {products.map((product) => (
                <GameCard
                  key={product.id}
                  product={product}
                  onSelect={(p) => {
                    setSelectedProduct(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Universal Footer */}
      <Footer onOpenAdminAuth={handleRequestAdminAccess} />

      {/* Admin Security PIN Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onAuthenticated={handleAdminAuthSuccess}
      />

      {/* Automatic Payment Invoice Modal with direct account credentials delivery */}
      {activePaymentOrder && (
        <PaymentModal
          order={activePaymentOrder}
          onClose={() => setActivePaymentOrder(null)}
          onOrderUpdated={(updated) => setActivePaymentOrder(updated)}
        />
      )}

      {/* Order Tracking Modal */}
      {isTrackerOpen && (
        <OrderTrackerModal
          onClose={() => setIsTrackerOpen(false)}
          onOpenInvoice={(order) => {
            setIsTrackerOpen(false);
            setActivePaymentOrder(order);
          }}
        />
      )}

      {/* ML Gamers Calculator Modal */}
      {isCalculatorOpen && (
        <MlCalculatorModal
          onClose={() => setIsCalculatorOpen(false)}
          onGoToTopUp={() => {
            handleSelectProductId('mlbb-bbcoin');
          }}
        />
      )}

      {/* Floating Active Invoice Bar (Buyer can re-open pending invoice anytime) */}
      {activePendingOrder && !activePaymentOrder && !isTrackerOpen && (
        <div className={`fixed bottom-4 right-4 z-40 max-w-sm w-full border rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-bottom duration-300 ${
          isLight
            ? 'bg-white border-sky-400 shadow-sky-900/20 text-slate-800'
            : 'bg-neutral-900 border-blue-500/50 shadow-blue-900/40 text-neutral-100'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isLight ? 'bg-sky-100 text-sky-700' : 'bg-blue-600/20 text-blue-400'
              }`}>
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] font-bold font-mono ${isLight ? 'text-sky-700' : 'text-blue-400'}`}>{activePendingOrder.id}</span>
                  <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded ${getOrderStatusDetails(activePendingOrder.status).badgeClass}`}>
                    {getOrderStatusDetails(activePendingOrder.status).label}
                  </span>
                </div>
                <p className={`text-xs font-medium line-clamp-1 mt-0.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  {activePendingOrder.itemName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedOrderBannerId(activePendingOrder.id)}
              className={`p-1 rounded transition-colors ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-500 hover:text-white'}`}
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`mt-2.5 pt-2 border-t flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
            <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Ada invoice belum selesai
            </span>
            <button
              type="button"
              onClick={() => setActivePaymentOrder(activePendingOrder)}
              className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-md shadow-blue-600/30 transition-all active:scale-95"
            >
              <span>Buka Invoice</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Customer Support Button (Bottom Left) */}
      <WhatsAppFloatingButton />
    </div>
  );
}
