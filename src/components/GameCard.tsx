import React from 'react';
import { ProductCatalog } from '../types/store';
import { formatIDR } from '../utils/currency';
import { Zap, ChevronRight, UserCheck, Coins, Key } from 'lucide-react';
import { useTheme } from '../utils/theme';

interface GameCardProps {
  product: ProductCatalog;
  onSelect: (product: ProductCatalog) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ product, onSelect }) => {
  const [theme] = useTheme();
  const isLight = theme === 'light';

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
      className={`group relative border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between ${
        isLight
          ? isOutOfStock
            ? 'bg-white border-red-400 shadow-[0_6px_0_0_#dc2626]'
            : 'bg-white hover:bg-sky-50/60 border-sky-300 hover:border-sky-500 shadow-[0_6px_0_0_#0284c7] hover:shadow-[0_8px_0_0_#0369a1]'
          : isOutOfStock
            ? 'bg-[#16082c]/95 hover:bg-[#1d0b38]/95 border-red-800/80 hover:border-red-600 shadow-[0_6px_0_0_#7f1d1d]'
            : 'bg-[#16082c]/95 hover:bg-[#1d0b38]/95 border-purple-800/80 hover:border-purple-400 shadow-[0_6px_0_0_#380b61] hover:shadow-[0_8px_0_0_#581c87]'
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
                className={`!text-white text-[11px] font-pixel font-bold drop-shadow tracking-wider px-3 py-1 rounded-xl border ${
                  isAccount
                    ? 'arcade-btn-purple border-purple-300/40'
                    : 'arcade-btn-cyan border-cyan-300/40'
                }`}
              >
                ★ {product.badge}
              </div>
            ) : null}
          </div>

          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
            <span className="text-xs font-pixel !text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] flex items-center gap-1.5 font-bold">
              {isAccount ? <UserCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" /> : <Coins className="w-3.5 h-3.5 text-cyan-300 shrink-0" />}
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
            <h3 className={`font-pixel text-lg sm:text-xl transition-colors tracking-wide ${
              isLight ? 'text-slate-900 group-hover:text-sky-700' : 'text-white group-hover:text-purple-300'
            }`}>
              {product.title}
            </h3>
          </div>
          <p className={`font-pixel text-xs tracking-wide mt-1 ${
            isLight ? 'text-sky-700 font-semibold' : 'text-purple-300/90'
          }`}>
            {product.subtitle}
          </p>
          <p className={`text-xs mt-2.5 line-clamp-2 leading-relaxed ${
            isLight ? 'text-slate-600' : 'text-purple-200/80'
          }`}>
            {product.shortDesc}
          </p>

          {/* Out of stock alert or special highlights in arcade HUD style */}
          {isOutOfStock ? (
            <div className={`mt-4 p-2.5 rounded-xl border-2 flex items-center gap-2 text-xs font-pixel ${
              isLight 
                ? 'bg-red-50 border-red-300 text-red-700 shadow-[0_2px_0_0_#fca5a5]' 
                : 'bg-red-950/50 border-red-800/80 text-red-200'
            }`}>
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
              <span>STOK SEDANG DINONAKTIFKAN OLEH ADMIN</span>
            </div>
          ) : isAccount ? (
            <div className={`mt-4 p-2.5 rounded-xl border-2 flex items-center gap-2 text-xs font-pixel ${
              isLight 
                ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-[0_2px_0_0_#bae6fd]' 
                : 'bg-[#200d3d] border-purple-700/60 text-purple-200'
            }`}>
              <Key className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-sky-600' : 'text-purple-400'}`} />
              <span>EMAIL & PASSWORD LANGSUNG MUNCUL DI WEBSITE</span>
            </div>
          ) : (
            <div className={`mt-4 p-2.5 rounded-xl border-2 flex items-center gap-2 text-xs font-pixel ${
              isLight 
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-[0_2px_0_0_#fde68a]' 
                : 'bg-[#0e2136] border-cyan-700/60 text-cyan-200'
            }`}>
              <Coins className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-600' : 'text-cyan-400'}`} />
              <span>KONVERSI 5 BB = 1 DM RESMI MOONTON (INSTAN)</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Starting Price */}
      <div className={`p-5 pt-0 mt-3 border-t-2 flex items-center justify-between ${
        isLight ? 'border-sky-200' : 'border-purple-900/60'
      }`}>
        <div>
          <span className={`font-pixel text-[11px] block uppercase tracking-wide ${
            isLight ? 'text-slate-500 font-semibold' : 'text-purple-300/80'
          }`}>Mulai Dari</span>
          <span className={`font-pixel text-lg font-bold tabular-nums ${
            isLight ? 'text-amber-600 font-black' : 'text-amber-300'
          }`}>
            {formatIDR(lowestPrice)}
          </span>
        </div>

        <button
          type="button"
          className={`${
            isLight ? 'arcade-btn-coral' : 'arcade-btn-purple'
          } px-4 py-2 rounded-xl text-xs font-pixel tracking-wider flex items-center gap-2 text-white ${
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
