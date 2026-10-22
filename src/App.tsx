import React, { useState, useEffect } from 'react';
import { ProductCatalog, Order } from './types/store';
import { loadProducts } from './utils/storage';
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
import { Sparkles, Key, Coins, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
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

  // Initial load & reactive listener
  useEffect(() => {
    setProducts(loadProducts());
    const handleUpdate = () => {
      setProducts(loadProducts());
    };
    window.addEventListener('storeadv_products_updated', handleUpdate);
    return () => window.removeEventListener('storeadv_products_updated', handleUpdate);
  }, []);

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
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Universal Top Bar */}
      <Navbar
        currentView={currentView}
        isAdminAuthenticated={isAdminAuthenticated}
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
            />
          ) : (
            <div className="py-20 text-center">
              <p className="text-neutral-400">Memerlukan autentikasi PIN...</p>
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

            {/* Value Proposition Strip */}
            <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-blue-950/40 border border-neutral-800">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-base tracking-tight">
                      Pengiriman Data Akun Instan di Website
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Email & Password Akun Advance Server langsung keluar di layar setelah pembayaran diverifikasi otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-base tracking-tight">
                      BB Coin Auto-Konversi 5:1 Diamond
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Jalur resmi Bang Bang Coin Moonton dengan auto-konversi rasio 5:1 (5 BB Coin = 1 Diamond) langsung masuk ke akun Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog Section Header */}
            <div className="mb-6 pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Pilih Layanan Utama ASTERA STORE
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tersedia 2 produk spesialis Mobile Legends dengan sistem inventaris dan pengiriman otomatis.
                </p>
              </div>

              <span className="text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-900 px-3 py-1 rounded-full">
                2 Produk Aktif
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
    </div>
  );
}
