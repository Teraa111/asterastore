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
      className={`group relative bg-neutral-900/90 hover:bg-neutral-800/90 border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between shadow-xl shadow-black/50 ${
        isOutOfStock
          ? 'border-red-900/60 hover:border-red-600/80'
          : 'border-neutral-800 hover:border-blue-500/60'
      }`}
    >
      <div>
        {/* Cover Image Container */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-950">
          <img
            src={product.coverImage}
            alt={product.title}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ${
              isOutOfStock ? 'brightness-75' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            {isOutOfStock ? (
              <div className="bg-red-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>STOK KOSONG</span>
              </div>
            ) : product.badge ? (
              <div
                className={`text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md ${
                  isAccount
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/30'
                }`}
              >
                {product.badge}
              </div>
            ) : null}
          </div>

          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 drop-shadow flex items-center gap-1.5">
              {isAccount ? <UserCheck className="w-3.5 h-3.5 text-blue-400" /> : <Coins className="w-3.5 h-3.5 text-red-400" />}
              <span>{product.publisher}</span>
            </span>

            <span className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded border ${
              isOutOfStock
                ? 'text-red-400 bg-red-950/80 border-red-800'
                : 'text-emerald-400 bg-neutral-950/80 border-neutral-800'
            }`}>
              <Zap className="w-3 h-3" />
              <span>{isOutOfStock ? 'Stok Habis' : isAccount ? 'Kirim di Web' : 'Auto Inject'}</span>
            </span>
          </div>
        </div>

        {/* Info Content */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-extrabold text-white text-base group-hover:text-blue-400 transition-colors">
              {product.title}
            </h3>
          </div>
          <p className="text-xs text-blue-400 font-medium mt-1">
            {product.subtitle}
          </p>
          <p className="text-neutral-400 text-xs mt-2 line-clamp-2 leading-relaxed">
            {product.shortDesc}
          </p>

          {/* Out of stock alert or special highlights */}
          {isOutOfStock ? (
            <div className="mt-4 p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center gap-2 text-[11px] text-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
              <span>Stok sedang dinonaktifkan / kosong sementara oleh admin.</span>
            </div>
          ) : isAccount ? (
            <div className="mt-4 p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/60 flex items-center gap-2 text-[11px] text-blue-200">
              <Key className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Email & Password otomatis keluar di website setelah bayar.</span>
            </div>
          ) : (
            <div className="mt-4 p-2.5 rounded-xl bg-red-950/30 border border-red-900/60 flex items-center gap-2 text-[11px] text-red-200">
              <Coins className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Konversi 5 BB = 1 Diamond Resmi Moonton + Pengiriman Instan.</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Starting Price */}
      <div className="p-5 pt-0 mt-3 border-t border-neutral-800/80 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-neutral-400 block">Harga mulai dari</span>
          <span className="text-sm font-extrabold text-white font-mono tabular-nums">
            {formatIDR(lowestPrice)}
          </span>
        </div>

        <button
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
            isOutOfStock
              ? 'bg-red-950/70 text-red-300 border border-red-800/70 group-hover:bg-red-900 group-hover:text-white'
              : 'bg-neutral-800 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-red-600 group-hover:text-white text-neutral-300'
          }`}
        >
          <span>{isOutOfStock ? 'Stok Kosong' : 'Pilih Paket'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
