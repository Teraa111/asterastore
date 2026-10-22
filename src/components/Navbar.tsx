import React from 'react';
import { ShoppingBag, Wrench, FileSearch, Calculator, UserCheck, Coins, BookOpen, Lock, LogOut } from 'lucide-react';

interface NavbarProps {
  currentView: 'store' | 'admin';
  isAdminAuthenticated: boolean;
  onNavigate: (view: 'store' | 'admin') => void;
  onOpenTracker: () => void;
  onOpenCalculator: () => void;
  onSelectProduct: (productId: 'mlbb-advance-server' | 'mlbb-bbcoin' | null) => void;
  onAdminLogout?: () => void;
}

import { getStoreOperatingStatus } from '../utils/currency';

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

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
        {/* Zone 1: Brand Wordmark (ASTERA STORE) & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onSelectProduct(null);
              onNavigate('store');
            }}
            className="flex items-center gap-2.5 text-left group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-red-600 flex items-center justify-center font-black text-white text-sm tracking-wider shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform border border-blue-400/30">
              AS
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors whitespace-nowrap">
                ASTERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">STORE</span>
              </span>
              <span className="text-[10px] text-neutral-400 tracking-wider font-semibold uppercase -mt-1 hidden sm:block">
                Advance Server & BB Coin Auto Konversi 5:1
              </span>
            </div>
          </button>

          {/* Operational Hours Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-neutral-900 border-neutral-800">
            <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={storeStatus.isOpen ? 'text-emerald-300' : 'text-red-300'}>
              {storeStatus.isOpen ? 'Buka (Tutup 22:00 WIB)' : 'Tutup (Buka 09:00 WIB)'}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-300">
          <button
            onClick={() => {
              onNavigate('store');
              onSelectProduct('mlbb-advance-server');
            }}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 text-neutral-300 hover:text-blue-400"
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Akun Advance Server</span>
          </button>

          <button
            onClick={() => {
              onNavigate('store');
              onSelectProduct('mlbb-bbcoin');
            }}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 text-neutral-300 hover:text-red-400"
          >
            <Coins className="w-4 h-4 text-red-400" />
            <span>BB Coin Auto Konversi 5:1</span>
          </button>

          <button
            onClick={onOpenTracker}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5"
          >
            <FileSearch className="w-4 h-4 text-blue-400" />
            <span>Lacak Pesanan</span>
          </button>

          <button
            onClick={onOpenCalculator}
            className="whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5"
          >
            <Calculator className="w-4 h-4 text-red-400" />
            <span>Kalkulator ML</span>
          </button>

        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentView === 'store' ? (
            isAdminAuthenticated ? (
              <button
                onClick={() => onNavigate('admin')}
                className="px-3.5 sm:px-4 py-2 text-xs font-bold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/40 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/30"
                title="Masuk ke Panel Manajemen Toko"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Dashboard Admin</span>
              </button>
            ) : (
              <button
                onClick={onOpenTracker}
                className="px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-600/25 whitespace-nowrap flex items-center gap-1.5 border border-white/10"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>Lacak Pesanan</span>
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
