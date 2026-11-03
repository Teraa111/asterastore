import React from 'react';
import { ProductCatalog } from '../types/store';
import { formatIDR } from '../utils/currency';
import { Zap, ChevronRight, UserCheck, Coins, Key } from 'lucide-react';

interface GameCardProps {
  product: ProductCatalog;
  onSelect: (product: ProductCatalog) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ product, onSelect }) => {
  const lowestPrice = product.denominations.reduce((min, item) => {
    return item.priceSell < min ? item.priceSell : min;
  }, product.denominations[0]?.priceSell || 0);

  const isAccount = product.type === 'advance_account';
  const isProductActive = product.isActive !== false;
  const allItemsDisabled = product.denominations.every(
    (d) => d.isActive === false || (d.stockType === 'account_pool' && (d.stockCount ?? 0) <= 0)
  );
  const isOutOfStock = !isProductActive || allItemsDisabled;

  return (
    <div
      onClick={() => onSelect(product)}
      className={`group relative bg-[#16082c]/95 hover:bg-[#1d0b38]/95 border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between shadow-[0_6px_0_0_#380b61] hover:shadow-[0_8px_0_0_#581c87] ${
        isOutOfStock
          ? 'border-red-800/80 hover:border-red-600'
          : 'border-purple-800/80 hover:border-purple-400'
      }`}
    >
      <div>
        {/* Cover Image Container */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0c0417]">
          <img
            src={product.coverImage}
            alt={product.title}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ${
              isOutOfStock ? 'brightness-60' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16082c] via-[#16082c]/40 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            {isOutOfStock ? (
              <div className="bg-red-700 border border-red-400 text-white text-[11px] font-pixel tracking-wider px-3 py-1 rounded-xl shadow-[0_3px_0_0_#7f1d1d] flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>STOK KOSONG</span>
              </div>
            ) : product.badge ? (
              <div
                className={`text-white text-[11px] font-pixel tracking-wider px-3 py-1 rounded-xl border ${
                  isAccount
                    ? 'arcade-btn-purple border-purple-300/40 text-purple-100'
                    : 'arcade-btn-cyan border-cyan-300/40 text-cyan-100'
                }`}
              >
                ★ {product.badge}
              </div>
            ) : null}
          </div>

          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
            <span className="text-xs font-pixel text-purple-200 drop-shadow flex items-center gap-1.5">
              {isAccount ? <UserCheck className="w-3.5 h-3.5 text-purple-400" /> : <Coins className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{product.publisher}</span>
            </span>

            <span className={`text-[11px] font-pixel flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 ${
              isOutOfStock
                ? 'text-red-300 bg-red-950/90 border-red-800'
                : 'text-emerald-300 bg-[#0e051d]/90 border-emerald-600/60'
            }`}>
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>{isOutOfStock ? 'HABIS' : isAccount ? 'KIRIM INSTAN' : 'AUTO INJECT'}</span>
            </span>
          </div>
        </div>

        {/* Info Content */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-pixel text-lg sm:text-xl text-white group-hover:text-purple-300 transition-colors tracking-wide">
              {product.title}
            </h3>
          </div>
          <p className="font-pixel text-xs text-purple-300/90 tracking-wide mt-1">
            {product.subtitle}
          </p>
          <p className="text-purple-200/80 text-xs mt-2.5 line-clamp-2 leading-relaxed">
            {product.shortDesc}
          </p>

          {/* Out of stock alert or special highlights in arcade HUD style */}
          {isOutOfStock ? (
            <div className="mt-4 p-2.5 rounded-xl bg-red-950/50 border-2 border-red-800/80 flex items-center gap-2 text-xs font-pixel text-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
              <span>STOK SEDANG DINONAKTIFKAN OLEH ADMIN</span>
            </div>
          ) : isAccount ? (
            <div className="mt-4 p-2.5 rounded-xl bg-[#200d3d] border-2 border-purple-700/60 flex items-center gap-2 text-xs font-pixel text-purple-200">
              <Key className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>EMAIL & PASSWORD LANGSUNG MUNCUL DI WEBSITE</span>
            </div>
          ) : (
            <div className="mt-4 p-2.5 rounded-xl bg-[#0e2136] border-2 border-cyan-700/60 flex items-center gap-2 text-xs font-pixel text-cyan-200">
              <Coins className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>KONVERSI 5 BB = 1 DM RESMI MOONTON (INSTAN)</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Starting Price */}
      <div className="p-5 pt-0 mt-3 border-t-2 border-purple-900/60 flex items-center justify-between">
        <div>
          <span className="font-pixel text-[11px] text-purple-300/80 block uppercase tracking-wide">Mulai Dari</span>
          <span className="font-pixel text-lg font-bold text-amber-300 tabular-nums">
            {formatIDR(lowestPrice)}
          </span>
        </div>

        <button
          type="button"
          className={`arcade-btn-purple px-4 py-2 rounded-xl text-xs font-pixel tracking-wider flex items-center gap-2 text-white ${
            isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <span>{isOutOfStock ? 'STOK KOSONG' : 'PILIH PAKET'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
