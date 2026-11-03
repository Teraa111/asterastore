import React, { useState, useEffect } from 'react';
import { ShoppingBag, Wrench, FileSearch, Calculator, UserCheck, Coins, BookOpen, Lock, LogOut } from 'lucide-react';
import { getStoreOperatingStatus } from '../utils/currency';
import { getStoreAssets } from '../utils/storage';

interface NavbarProps {
  currentView: 'store' | 'admin';
  isAdminAuthenticated: boolean;
  onNavigate: (view: 'store' | 'admin') => void;
  onOpenTracker: () => void;
  onOpenCalculator: () => void;
  onSelectProduct: (productId: 'mlbb-advance-server' | 'mlbb-bbcoin' | null) => void;
  onAdminLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  isAdminAuthenticated,
  onNavigate,
  onOpenTracker,
  onOpenCalculator,
  onSelectProduct,
  onAdminLogout,
}) => {
  const storeStatus = getStoreOperatingStatus();
  const [storeLogo, setStoreLogo] = useState<string | undefined>(getStoreAssets().storeLogoImg);

  useEffect(() => {
    const handleAssetsChange = () => {
      setStoreLogo(getStoreAssets().storeLogoImg);
    };
    window.addEventListener('storeadv_assets_updated', handleAssetsChange);
    return () => {
      window.removeEventListener('storeadv_assets_updated', handleAssetsChange);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0e051e]/95 backdrop-blur-md border-b-2 border-purple-900/80 shadow-lg shadow-purple-950/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
        {/* Zone 1: Brand Wordmark (ASTERA STORE) & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onSelectProduct(null);
              onNavigate('store');
            }}
            className="flex items-center gap-2.5 text-left group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
          >
            {storeLogo ? (
              <div className="w-10 h-10 rounded-xl bg-[#1a0b36] border-2 border-purple-600/70 overflow-hidden flex items-center justify-center p-0.5 shadow-[0_3px_0_0_#4c1d95] group-hover:scale-105 transition-transform">
                <img src={storeLogo} alt="ASTERA STORE Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-indigo-600 flex items-center justify-center font-pixel text-white text-base tracking-wider shadow-[0_3px_0_0_#4c1d95] group-hover:scale-105 transition-transform border border-purple-400/40">
                AS
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-pixel tracking-wider text-white group-hover:text-purple-300 transition-colors whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ASTERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400">STORE</span>
              </span>
              <span className="text-[10px] text-purple-300/80 font-pixel tracking-wider uppercase -mt-0.5 hidden sm:block">
                ★ ARCADE MLBB & BB COIN 5:1 ★
              </span>
            </div>
          </button>

          {/* Operational Hours Badge */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] font-pixel border-2 bg-[#1a0933] border-purple-800/80 shadow-[0_2px_0_0_#3b0764]">
            <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={storeStatus.isOpen ? 'text-emerald-300 tracking-wide' : 'text-red-300 tracking-wide'}>
              {storeStatus.isOpen ? 'OPEN (TUTUP 22:00)' : 'CLOSED (BUKA 09:00)'}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-pixel tracking-wider text-purple-200">
          <button
            onClick={() => {
              onNavigate('store');
              onSelectProduct('mlbb-advance-server');
            }}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 hover:text-purple-300"
          >
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>AKUN ADVANCE</span>
          </button>

          <button
            onClick={() => {
              onNavigate('store');
              onSelectProduct('mlbb-bbcoin');
            }}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 hover:text-fuchsia-300"
          >
            <Coins className="w-4 h-4 text-fuchsia-400" />
            <span>TOP UP BB COIN 5:1</span>
          </button>

          <button
            onClick={onOpenTracker}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 hover:text-cyan-300"
          >
            <FileSearch className="w-4 h-4 text-cyan-400" />
            <span>LACAK PESANAN</span>
          </button>

          <button
            onClick={onOpenCalculator}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 hover:text-amber-300"
          >
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>KALKULATOR ML</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentView === 'store' ? (
            isAdminAuthenticated ? (
              <button
                onClick={() => onNavigate('admin')}
                className="arcade-btn-amber px-3.5 sm:px-4 py-2 text-xs font-pixel text-amber-100 rounded-xl transition-all flex items-center gap-1.5 tracking-wider"
                title="Masuk ke Panel Manajemen Toko"
              >
                <Lock className="w-3.5 h-3.5 text-amber-200" />
                <span>ADMIN PANEL</span>
              </button>
            ) : (
              <button
                onClick={onOpenTracker}
                className="arcade-btn-purple px-4 py-2 text-xs font-pixel tracking-wider text-white rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>LACAK INVOICE</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSelectProduct(null);
                  onNavigate('store');
                }}
                className="px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-neutral-700 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                <span>Kembali ke Toko</span>
              </button>

              {onAdminLogout && (
                <button
                  onClick={onAdminLogout}
                  className="px-3 py-2 text-xs font-bold text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 active:scale-95 rounded-xl transition-all flex items-center gap-1.5"
                  title="Kunci Brankas Admin & Keluar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kunci</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
