import React from 'react';
import { ShoppingBag, Wrench, FileSearch, Calculator, UserCheck, Coins, BookOpen } from 'lucide-react';

interface NavbarProps {
  currentView: 'store' | 'admin';
  onNavigate: (view: 'store' | 'admin') => void;
  onOpenTracker: () => void;
  onOpenCalculator: () => void;
  onSelectProduct: (productId: 'mlbb-advance-server' | 'mlbb-bbcoin' | null) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenTracker,
  onOpenCalculator,
  onSelectProduct,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 h-16">
        {/* Zone 1: Brand Wordmark (K&F STORE) */}
        <button
          onClick={() => {
            onSelectProduct(null);
            onNavigate('store');
          }}
          className="flex items-center gap-2.5 text-left group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-red-600 flex items-center justify-center font-extrabold text-white text-xs tracking-tighter shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform border border-blue-400/30">
            K&F
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors whitespace-nowrap">
              K&F <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">STORE</span>
            </span>
            <span className="text-[10px] text-neutral-400 tracking-wider font-semibold uppercase -mt-1 hidden sm:block">
              Advance Server & BB Coin
            </span>
          </div>
        </button>

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
            <span>Top Up BB Coin</span>
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

          <button
            onClick={() => onNavigate('admin')}
            className={`whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 ${
              currentView === 'admin' ? 'text-blue-400 font-bold' : 'text-neutral-300'
            }`}
          >
            <Wrench className="w-4 h-4 text-blue-400" />
            <span>Manajemen K&F</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenTracker}
            className="lg:hidden p-2 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg"
            title="Lacak Pesanan"
          >
            <FileSearch className="w-4 h-4 text-blue-400" />
          </button>

          {currentView === 'store' ? (
            <button
              onClick={() => onNavigate('admin')}
              className="px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-600/25 whitespace-nowrap flex items-center gap-1.5 border border-white/10"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Portal Manajemen Stok</span>
            </button>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
};
