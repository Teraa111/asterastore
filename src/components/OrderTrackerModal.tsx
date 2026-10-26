import React, { useState, useEffect } from 'react';
import { Order } from '../types/store';
import {
  loadOrders,
  loadAdminOrders,
  getMyOrders,
  getOrderStatusDetails,
  fetchOrdersFromServer,
  saveMyOrderId,
  isMyOrderId,
  isAdminSession,
} from '../utils/storage';
import { getOrderFromSupabase } from '../utils/supabase';
import { getOrderFromCloud } from '../utils/firebase';
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
  ShieldCheck,
  Lock,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

interface OrderTrackerModalProps {
  onClose: () => void;
  onOpenInvoice: (order: Order) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  onClose,
  onOpenInvoice,
}) => {
  const isAdmin = isAdminSession();

  // For Admin: view all store orders. For regular buyers: strictly view own orders
  const [ordersList, setOrdersList] = useState<Order[]>(() =>
    isAdmin ? loadAdminOrders() : getMyOrders()
  );
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Online search state for orders made on another phone/browser
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // WhatsApp verification state to protect customer identity & credentials
  const [waVerificationInput, setWaVerificationInput] = useState('');
  const [waVerificationError, setWaVerificationError] = useState<string | null>(null);

  // Synchronize orders reactively
  useEffect(() => {
    fetchOrdersFromServer();
    const handleUpdate = () => {
      setOrdersList(isAdmin ? loadAdminOrders() : getMyOrders());
    };
    window.addEventListener('storeadv_orders_updated', handleUpdate);

    const timer = setInterval(() => {
      fetchOrdersFromServer();
    }, 3500);

    return () => {
      clearInterval(timer);
      window.removeEventListener('storeadv_orders_updated', handleUpdate);
    };
  }, [isAdmin]);

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Perform targeted online lookup for an invoice made on another device
  const handlePerformOnlineSearch = async () => {
    const cleanQ = query.trim().toUpperCase().replace(/^#/, '');
    if (!cleanQ) return;

    setIsSearchingOnline(true);
    setSearchError(null);
    setSearchedOrder(null);
    setWaVerificationInput('');
    setWaVerificationError(null);

    try {
      // 1. Direct Supabase Cloud lookup
      let found: Order | null = null;
      try {
        found = await getOrderFromSupabase(cleanQ);
      } catch (err) {
        console.warn('Supabase search order error:', err);
      }

      // 2. Direct Firestore fallback lookup
      if (!found) {
        try {
          found = await getOrderFromCloud(cleanQ);
        } catch (err) {
          console.warn('Firestore search order error:', err);
        }
      }

      if (found) {
        setSearchedOrder(found);
        // If already owned by this device or user is Admin, auto-save and display
        if (isAdmin || isMyOrderId(found.id)) {
          saveMyOrderId(found.id);
          setOrdersList(isAdmin ? loadAdminOrders() : getMyOrders());
        }
      } else {
        setSearchError(`Nomor Invoice "${cleanQ}" tidak ditemukan di database server. Pastikan penulisan No. Invoice sudah sesuai.`);
      }
    } catch {
      setSearchError('Terjadi kesalahan saat mencari invoice di server.');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Verify ownership before unlocking foreign order invoice
  const handleVerifyOwnership = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedOrder) return;

    const inputDigits = waVerificationInput.replace(/[^0-9]/g, '');
    const cleanWaDigits = searchedOrder.whatsapp.replace(/[^0-9]/g, '');
    const last4 = cleanWaDigits.slice(-4);

    if (inputDigits.length < 4) {
      setWaVerificationError('Masukkan minimal 4 digit terakhir nomor WhatsApp pesanan Anda.');
      return;
    }

    if (inputDigits === last4 || cleanWaDigits.endsWith(inputDigits) || cleanWaDigits === inputDigits) {
      // Verified! Record ownership on this device
      saveMyOrderId(searchedOrder.id);
      setOrdersList(isAdmin ? loadAdminOrders() : getMyOrders());
      setWaVerificationError(null);
      onClose();
      onOpenInvoice(searchedOrder);
    } else {
      setWaVerificationError('4 digit nomor WhatsApp tidak cocok dengan data invoice ini. Demi keamanan data akun pembeli, invoice hanya dapat dibuka oleh pemiliknya.');
    }
  };

  // Filter orders
  const displayedOrders = ordersList.filter((ord) => {
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
    const matchItem = ord.itemName ? ord.itemName.toLowerCase().includes(cleanQuery) : false;

    return matchId || matchWa || matchUser || matchNick || matchItem;
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

        <div className="mb-4 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-bold text-xs">ASTERA STORE</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400 text-xs">
              {isAdmin ? 'Panel Riwayat Transaksi (Admin)' : 'Lacak Pesanan Saya'}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <span>{isAdmin ? 'Semua Pesanan Toko' : 'Pesanan & Invoice Saya'}</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            {isAdmin
              ? 'Mode Administrator: Menampilkan seluruh transaksi yang tersinkronisasi di database.'
              : 'Pesanan yang Anda buat di perangkat ini tersimpan di sini. Kredensial akun game Anda terlindungi dan privat.'}
          </p>
        </div>

        {/* Search & Lookup Bar */}
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (searchError) setSearchError(null);
                }}
                placeholder="Masukkan Nomor Invoice Anda (contoh: AST-...)"
                className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs sm:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSearchedOrder(null);
                    setSearchError(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  title="Hapus"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearchingOnline || !query.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95 shrink-0"
            >
              {isSearchingOnline ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Lacak</span>
            </button>
          </div>

          {/* Quick Filter Buttons (Shown for Admin or when user has multiple orders) */}
          {(isAdmin || ordersList.length > 1) && (
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
                Semua ({ordersList.length})
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
                Verifikasi ({ordersList.filter((o) => o.status === 'WAITING_VERIFICATION').length})
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
                Belum Bayar ({ordersList.filter((o) => o.status === 'PENDING_PAYMENT').length})
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
                Lunas ({ordersList.filter((o) => o.status === 'SUCCESS').length})
              </button>
            </div>
          )}
        </form>

        {/* Verification Card for Foreign Order Lookups (Customer Safety) */}
        {searchedOrder && !isAdmin && !isMyOrderId(searchedOrder.id) && (
          <div className="mb-4 p-4 rounded-xl bg-neutral-950 border border-blue-500/40 text-xs animate-in fade-in">
            <div className="flex items-start gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Verifikasi Kepemilikan Invoice</h4>
                <p className="text-neutral-400 text-[11px] mt-0.5">
                  Invoice <code className="text-blue-400 font-mono font-bold">{searchedOrder.id}</code> ditemukan di database server!
                  Demi melindungi privasi & keamanan data akun pembeli, silakan masukkan 4 digit terakhir nomor WhatsApp yang Anda daftarkan saat memesan:
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyOwnership} className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={15}
                  value={waVerificationInput}
                  onChange={(e) => {
                    setWaVerificationInput(e.target.value);
                    if (waVerificationError) setWaVerificationError(null);
                  }}
                  placeholder="Contoh: 8548 (4 digit terakhir WhatsApp)"
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Buka Pesanan</span>
                </button>
              </div>

              {waVerificationError && (
                <p className="text-red-400 text-[11px] flex items-center gap-1 mt-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{waVerificationError}</span>
                </p>
              )}
            </form>
          </div>
        )}

        {/* Search Not Found Error Message */}
        {searchError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {displayedOrders.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs">
              <AlertCircle className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              {ordersList.length === 0 ? (
                <>
                  <p className="font-semibold text-neutral-200 text-sm">Belum Ada Pesanan di Perangkat Ini</p>
                  <p className="mt-1 text-neutral-400 max-w-sm mx-auto leading-relaxed">
                    Anda belum pernah membuat pesanan di peramban ini. Jika Anda sudah memesan dari HP atau browser lain, masukkan Nomor Invoice Anda (contoh: <code className="text-blue-400 font-mono font-bold">AST-...</code>) di kolom pencarian di atas untuk melacak.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-neutral-200 text-sm">Tidak Ditemukan Pesanan yang Cocok</p>
                  <p className="mt-1 text-neutral-400">
                    Tidak ada pesanan Anda yang sesuai dengan kata kunci "{query}".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setFilterStatus('all');
                      setSearchError(null);
                    }}
                    className="mt-3 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-lg inline-flex items-center gap-1.5 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tampilkan Pesanan Saya ({ordersList.length})</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            displayedOrders.map((ord) => {
              const details = getOrderStatusDetails(ord.status);
              const isOwnOrder = isAdmin || isMyOrderId(ord.id);

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
                          {isOwnOrder ? ord.accountDelivered.email : '••••••••@gmail.com'}
                        </span>
                      ) : (
                        <span className="text-white font-mono">
                          {ord.userId ? `${ord.userId} ${ord.zoneId ? `(${ord.zoneId})` : ''}` : 'Akun Advance'}
                        </span>
                      )}
                      <span className="text-emerald-400 block font-medium">
                        {isOwnOrder
                          ? ord.userNickname || `WA: 0${ord.whatsapp}`
                          : `WA: ••••••${ord.whatsapp.slice(-4)}`}
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

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <span>
            {isAdmin
              ? `Total ${ordersList.length} pesanan toko tercatat`
              : `Tersimpan ${ordersList.length} pesanan Anda di perangkat ini`}
          </span>
          <span className="text-neutral-500">ASTERA STORE Official</span>
        </div>
      </div>
    </div>
  );
};
