import React, { useState } from 'react';
import { Order } from '../types/store';
import { loadOrders } from '../utils/storage';
import { formatIDR } from '../utils/currency';
import {
  X,
  Search,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface OrderTrackerModalProps {
  onClose: () => void;
  onOpenInvoice: (order: Order) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  onClose,
  onOpenInvoice,
}) => {
  const [query, setQuery] = useState('');
  const [searchedOrders, setSearchedOrders] = useState<Order[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const allOrders = loadOrders();
    const cleanQuery = query.trim().toLowerCase();

    const matches = allOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(cleanQuery) ||
        o.whatsapp.includes(cleanQuery.replace(/^0/, '').replace(/^\+62/, '')) ||
        (o.userId && o.userId.toLowerCase().includes(cleanQuery)) ||
        (o.accountDelivered && o.accountDelivered.email.toLowerCase().includes(cleanQuery))
    );

    setSearchedOrders(matches);
    setHasSearched(true);
  };

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-auto animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-bold text-xs">Aster4 STORE</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400 text-xs">Pelacakan Transaksi</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Lacak Pesanan Top Up
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Masukkan Nomor Invoice (contoh: AST-261020-8912) atau Nomor WhatsApp yang digunakan saat order.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik Nomor Invoice (AST-...) atau No WhatsApp..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap shadow-md shadow-blue-600/20"
          >
            Cari Pesanan
          </button>
        </form>

        {/* Results */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {hasSearched && searchedOrders && searchedOrders.length === 0 && (
            <div className="p-6 text-center rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs">
              <AlertCircle className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              <p className="font-semibold text-neutral-300">Pesanan Tidak Ditemukan</p>
              <p className="mt-1 text-neutral-500">
                Pastikan nomor invoice atau nomor WhatsApp yang Anda masukkan sudah sesuai.
              </p>
            </div>
          )}

          {searchedOrders?.map((ord) => (
            <div
              key={ord.id}
              className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">{ord.id}</span>
                  <button
                    onClick={() => copyText(ord.id, ord.id)}
                    className="text-neutral-400 hover:text-white"
                    title="Salin ID"
                  >
                    {copiedId === ord.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {ord.status === 'SUCCESS' && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-900 px-2 py-0.5 rounded">
                    SUKSES
                  </span>
                )}
                {ord.status === 'PENDING_PAYMENT' && (
                  <span className="text-[11px] font-bold text-red-400 bg-red-950/70 border border-red-900 px-2 py-0.5 rounded">
                    MENUNGGU PEMBAYARAN
                  </span>
                )}
                {ord.status === 'PROCESSING' && (
                  <span className="text-[11px] font-bold text-blue-400 bg-blue-950/70 border border-blue-900 px-2 py-0.5 rounded">
                    DIPROSES
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-neutral-800/80 my-2">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Produk & Layanan</span>
                  <span className="font-semibold text-white">{ord.productTitle}</span>
                  <span className="text-neutral-300 block">{ord.itemName}</span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-400 block text-[11px]">Penerima</span>
                  {ord.accountDelivered ? (
                    <span className="text-blue-400 font-mono block select-all">{ord.accountDelivered.email}</span>
                  ) : (
                    <span className="text-white font-mono">{ord.userId} {ord.zoneId ? `(${ord.zoneId})` : ''}</span>
                  )}
                  <span className="text-emerald-400 block font-medium">{ord.userNickname}</span>
                </div>
              </div>

              {ord.serialNumberDelivery && (
                <div className="mt-2 p-2 bg-neutral-900 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-neutral-400 text-[11px]">SN:</span>
                  <code className="text-blue-400 font-mono text-[11px]">{ord.serialNumberDelivery}</code>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400">Total: </span>
                  <strong className="text-xs text-white font-mono tabular-nums">{formatIDR(ord.totalAmount)}</strong>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onOpenInvoice(ord);
                  }}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
                >
                  <span>Buka Invoice</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {!hasSearched && (
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center text-xs text-neutral-400">
              <p>Riwayat pesanan di Aster4 STORE tersimpan secara aman di peramban Anda.</p>
              <p className="mt-1 text-[11px] text-neutral-500">
                Punya kendala transaksi? Hubungi CS WhatsApp resmi kami untuk respon instan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
