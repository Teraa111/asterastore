import React, { useState, useEffect } from 'react';
import { ShoppingBag, Wrench, FileSearch, Calculator, UserCheck, Coins, BookOpen, Lock, LogOut, Sun, Moon } from 'lucide-react';
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
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  isAdminAuthenticated,
  onNavigate,
  onOpenTracker,
  onOpenCalculator,
  onSelectProduct,
  onAdminLogout,
  theme,
  onToggleTheme,
}) => {
  const isLight = theme === 'light';
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
    <header className={`sticky top-0 z-40 w-full backdrop-blur-md border-b-2 transition-colors duration-200 ${
      isLight 
        ? 'bg-[#eaf4fd]/95 border-sky-300 shadow-md shadow-sky-900/10' 
        : 'bg-[#0e051e]/95 border-purple-900/80 shadow-lg shadow-purple-950/40'
    }`}>

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
              <div className={`w-10 h-10 rounded-xl border-2 overflow-hidden flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform ${
                isLight 
                  ? 'bg-white border-sky-400 shadow-[0_3px_0_0_#0284c7]' 
                  : 'bg-[#1a0b36] border-purple-600/70 shadow-[0_3px_0_0_#4c1d95]'
              }`}>
                <img src={storeLogo} alt="ASTERA STORE Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-pixel text-white text-base tracking-wider group-hover:scale-105 transition-transform border ${
                isLight
                  ? 'bg-gradient-to-tr from-sky-600 via-blue-500 to-indigo-600 shadow-[0_3px_0_0_#0284c7] border-sky-300'
                  : 'bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-indigo-600 shadow-[0_3px_0_0_#4c1d95] border-purple-400/40'
              }`}>
                AS
              </div>
            )}
            <div className="flex flex-col">
              <span className={`text-xl font-pixel tracking-wider transition-colors whitespace-nowrap ${
                isLight
                  ? 'text-slate-900 group-hover:text-sky-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]'
                  : 'text-white group-hover:text-purple-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
              }`}>
                ASTERA <span className={`text-transparent bg-clip-text ${
                  isLight
                    ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-amber-600'
                    : 'bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400'
                }`}>STORE</span>
              </span>
              <span className={`text-[10px] font-pixel tracking-wider uppercase -mt-0.5 hidden sm:block ${
                isLight ? 'text-sky-700 font-semibold' : 'text-purple-300/80'
              }`}>
                ★ ARCADE MLBB & BB COIN 5:1 ★
              </span>
            </div>
          </button>

          {/* Operational Hours Badge */}
          <div className={`hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] font-pixel border-2 ${
            isLight
              ? 'bg-white border-sky-300 shadow-[0_2px_0_0_#38bdf8] text-slate-800'
              : 'bg-[#1a0933] border-purple-800/80 shadow-[0_2px_0_0_#3b0764]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={storeStatus.isOpen 
              ? (isLight ? 'text-emerald-700 font-bold tracking-wide' : 'text-emerald-300 tracking-wide') 
              : (isLight ? 'text-red-700 font-bold tracking-wide' : 'text-red-300 tracking-wide')}>
              {storeStatus.isOpen ? 'OPEN (TUTUP 22:00)' : 'CLOSED (BUKA 09:00)'}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className={`hidden lg:flex items-center gap-6 text-xs font-pixel tracking-wider ${
          isLight ? 'text-slate-700' : 'text-purple-200'
        }`}>
          <button
            onClick={() => {
              onNavigate('store');
              onSelectProduct('mlbb-advance-server');
            }}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              isLight ? 'hover:text-sky-800' : 'hover:text-purple-300 hover:text-white'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-purple-400'}`} />
            <span>AKUN ADVANCE</span>
          </button>

          <button
            onClick={() => {
              onNavigate('store');
              onSelectProduct('mlbb-bbcoin');
            }}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              isLight ? 'hover:text-amber-800' : 'hover:text-fuchsia-300 hover:text-white'
            }`}
          >
            <Coins className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-fuchsia-400'}`} />
            <span>TOP UP BB COIN 5:1</span>
          </button>

          <button
            onClick={onOpenTracker}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              isLight ? 'hover:text-sky-800' : 'hover:text-cyan-300 hover:text-white'
            }`}
          >
            <FileSearch className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span>LACAK PESANAN</span>
          </button>

          <button
            onClick={onOpenCalculator}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              isLight ? 'hover:text-orange-800' : 'hover:text-amber-300 hover:text-white'
            }`}
          >
            <Calculator className={`w-4 h-4 ${isLight ? 'text-orange-600' : 'text-amber-400'}`} />
            <span>KALKULATOR ML</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* THEME TOGGLE BUTTON */}
          <button
            onClick={onToggleTheme}
            type="button"
            className={`px-3 py-2 text-xs font-pixel rounded-xl border-2 transition-all flex items-center gap-1.5 active:scale-95 shadow-[0_3px_0_0] ${
              isLight
                ? 'bg-white hover:bg-sky-50 text-sky-900 border-sky-400 shadow-[#0284c7]'
                : 'bg-[#1b0933] hover:bg-[#250d45] text-amber-200 border-amber-400/80 shadow-[#78350f]'
            }`}
            title={isLight ? 'Ganti ke Tema Gelap (Dark Mode)' : 'Ganti ke Tema Terang (Light Mode Sky)'}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600 fill-indigo-200" />
                <span className="hidden sm:inline">TEMA GELAP</span>
                <span className="sm:hidden">GELAP</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="hidden sm:inline">TEMA TERANG</span>
                <span className="sm:hidden">TERANG</span>
              </>
            )}
          </button>

          {currentView === 'store' ? (
            isAdminAuthenticated ? (
              <button
                onClick={() => onNavigate('admin')}
                className="arcade-btn-amber px-3.5 sm:px-4 py-2 text-xs font-pixel text-amber-100 rounded-xl transition-all flex items-center gap-1.5 tracking-wider"
                title="Masuk ke Panel Manajemen Toko"
              >
                <Lock className="w-3.5 h-3.5 text-amber-200" />
                <span>ADMIN</span>
              </button>
            ) : (
              <button
                onClick={onOpenTracker}
                className={`${isLight ? 'arcade-btn-cyan' : 'arcade-btn-purple'} px-3.5 sm:px-4 py-2 text-xs font-pixel tracking-wider text-white rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5`}
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">LACAK INVOICE</span>
                <span className="sm:hidden">LACAK</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSelectProduct(null);
                  onNavigate('store');
                }}
                className={`px-3.5 sm:px-4 py-2 text-xs font-bold active:scale-95 border rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isLight
                    ? 'text-slate-800 bg-white hover:bg-slate-100 border-sky-300'
                    : 'text-white bg-neutral-800 hover:bg-neutral-700 border-neutral-700'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                <span>Toko</span>
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
