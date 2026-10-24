import React, { useState, useEffect } from 'react';
import { Order } from '../types/store';
import { loadOrders, getOrderStatusDetails, searchOrdersOnline, fetchOrdersFromServer } from '../utils/storage';
import { formatIDR } from '../utils/currency';
import {
  X,
  Search,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Receipt,
  RotateCcw,
  Loader2,
  Globe,
} from 'lucide-react';

interface OrderTrackerModalProps {
  onClose: () => void;
  onOpenInvoice: (order: Order) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  onClose,
  onOpenInvoice,
}) => {
  const [allOrders, setAllOrders] = useState<Order[]>(() => loadOrders());
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Live Sync orders from localStorage or when other components update orders
  useEffect(() => {
    fetchOrdersFromServer();
    const handleUpdate = () => {
      setAllOrders(loadOrders());
    };
    window.addEventListener('storeadv_orders_updated', handleUpdate);

    // Poll every 3 seconds
    const timer = setInterval(() => {
      fetchOrdersFromServer();
    }, 3000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('storeadv_orders_updated', handleUpdate);
    };
  }, []);

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Perform online search across server database
  const handlePerformOnlineSearch = async () => {
    if (!query.trim()) return;
    setIsSearchingOnline(true);
    try {
      await searchOrdersOnline(query);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Filter orders based on search query and status
  const filteredOrders = allOrders.filter((ord) => {
    // Status filter
    if (filterStatus !== 'all' && ord.status !== filterStatus) {
      return false;
    }

    if (!query.trim()) return true;

    const cleanQuery = query.trim().toLowerCase().replace(/^#/, '');
    const cleanDigits = cleanQuery.replace(/[^0-9]/g, '');

    const matchId = ord.id.toLowerCase().includes(cleanQuery);
    const matchWa = cleanDigits.length >= 4 && ord.whatsapp.replace(/[^0-9]/g, '').includes(cleanDigits);
    const matchUser = ord.userId ? ord.userId.toLowerCase().includes(cleanQuery) : false;
    const matchNick = ord.userNickname ? ord.userNickname.toLowerCase().includes(cleanQuery) : false;
    const matchEmail = ord.accountDelivered?.email ? ord.accountDelivered.email.toLowerCase().includes(cleanQuery) : false;
    const matchItem = ord.itemName ? ord.itemName.toLowerCase().includes(cleanQuery) : false;

    return matchId || matchWa || matchUser || matchNick || matchEmail || matchItem;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-bold text-xs">ASTERA STORE</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400 text-xs">Daftar & Lacak Invoice</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <span>Riwayat & Invoice Pesanan</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Klik tombol <strong className="text-blue-400 font-semibold">"Buka Invoice"</strong> pada pesanan Anda untuk melihat rincian pembayaran, kode QRIS, status verifikasi, dan data akun Anda.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePerformOnlineSearch();
          }}
          className="space-y-2 mb-4"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari No Invoice (AST-...), No WhatsApp, atau Nama Produk..."
                className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearchingOnline}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95 shrink-0"
            >
              {isSearchingOnline ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Cari</span>
            </button>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Semua ({allOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('WAITING_VERIFICATION')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                filterStatus === 'WAITING_VERIFICATION'
                  ? 'bg-amber-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Verifikasi ({allOrders.filter((o) => o.status === 'WAITING_VERIFICATION').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PENDING_PAYMENT')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                filterStatus === 'PENDING_PAYMENT'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Belum Bayar ({allOrders.filter((o) => o.status === 'PENDING_PAYMENT').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('SUCCESS')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                filterStatus === 'SUCCESS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Lunas ({allOrders.filter((o) => o.status === 'SUCCESS').length})
            </button>
          </div>
        </form>

        {/* Results or Orders List */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs">
              <AlertCircle className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              {allOrders.length === 0 ? (
                <>
                  <p className="font-semibold text-neutral-200 text-sm">Belum Ada Pesanan di Perangkat Ini</p>
                  <p className="mt-1 text-neutral-400 max-w-sm mx-auto">
                    Jika Anda sudah pernah memesan di perangkat lain, masukkan Nomor Invoice (AST-...) atau Nomor WhatsApp Anda di kolom pencarian di atas.
                  </p>
                  {query && (
                    <button
                      type="button"
                      onClick={handlePerformOnlineSearch}
                      disabled={isSearchingOnline}
                      className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all"
                    >
                      {isSearchingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                      <span>Cari di Database Server ({query})</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold text-neutral-200 text-sm">Tidak Ada Pesanan Lokal yang Cocok</p>
                  <p className="mt-1 text-neutral-400">
                    Tidak ditemukan di peramban ini dengan kata kunci "{query}".
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handlePerformOnlineSearch}
                      disabled={isSearchingOnline}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5"
                    >
                      {isSearchingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                      <span>Cari di Server Database</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setFilterStatus('all');
                      }}
                      className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-lg inline-flex items-center gap-1.5 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Semua Pesanan ({allOrders.length})</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const details = getOrderStatusDetails(ord.status);
              return (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400">{ord.id}</span>
                      <button
                        type="button"
                        onClick={() => copyText(ord.id, ord.id)}
                        className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
                        title="Salin No Invoice"
                      >
                        {copiedId === ord.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className={`text-[11px] font-bold border px-2 py-0.5 rounded ${details.badgeClass}`}>
                      {details.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-neutral-800/80 my-2">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Produk & Layanan</span>
                      <span className="font-semibold text-white">{ord.productTitle}</span>
                      <span className="text-neutral-300 block">{ord.itemName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-400 block text-[11px]">Penerima / Akun</span>
                      {ord.accountDelivered ? (
                        <span className="text-blue-400 font-mono block select-all font-semibold">
                          {ord.accountDelivered.email}
                        </span>
                      ) : (
                        <span className="text-white font-mono">
                          {ord.userId} {ord.zoneId ? `(${ord.zoneId})` : ''}
                        </span>
                      )}
                      <span className="text-emerald-400 block font-medium">
                        {ord.userNickname || `WA: 0${ord.whatsapp}`}
                      </span>
                    </div>
                  </div>

                  {ord.serialNumberDelivery && (
                    <div className="mt-2 p-2 bg-neutral-900 rounded-lg text-xs flex items-center justify-between">
                      <span className="text-neutral-400 text-[11px]">SN:</span>
                      <code className="text-blue-400 font-mono text-[11px]">{ord.serialNumberDelivery}</code>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[11px] text-neutral-400">Total Tagihan: </span>
                      <strong className="text-xs text-white font-mono tabular-nums block sm:inline">
                        {formatIDR(ord.totalAmount)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenInvoice(ord);
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Buka Invoice</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {allOrders.length > 0 && (
          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Tersimpan {allOrders.length} pesanan di peramban ini</span>
            <span className="text-neutral-500">ASTERA STORE Official</span>
          </div>
        )}
      </div>
    </div>
  );
};
