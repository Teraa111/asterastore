import React, { useState, useEffect, useMemo } from 'react';
import { ProductCatalog, Order, PromoCode, DenominationItem, AccountCredential } from '../types/store';
import { loadProducts, saveProducts, loadOrders, saveOrders, loadPromos, savePromos, calculateMetrics, triggerAutomaticFulfillment } from '../utils/storage';
import { formatIDR, formatNumber } from '../utils/currency';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Ticket,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  X,
  Key,
  UserCheck,
  Coins,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  BookOpen,
  ShieldCheck,
  Zap,
  ArrowRight,
  HelpCircle,
  Layers,
  FileText,
} from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'bbcoin' | 'orders' | 'promos' | 'guide'>('accounts');

  // Core data states
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);

  // Filtering & Search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Modals & Forms
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedDenomForAccount, setSelectedDenomForAccount] = useState<string>('acc-advance-fresh');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccServer, setNewAccServer] = useState('Server 5701 (Advance Server)');
  const [newAccLevel, setNewAccLevel] = useState(8);
  const [newAccNotes, setNewAccNotes] = useState('Akun Advance Server siap pakai.');

  const [editingItem, setEditingItem] = useState<{ productId: string; item: DenominationItem } | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Sync from storage
  const refreshData = () => {
    setProducts(loadProducts());
    setOrders(loadOrders());
    setPromos(loadPromos());
  };

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storeadv_products_updated', handleSync);
    window.addEventListener('storeadv_orders_updated', handleSync);
    window.addEventListener('storeadv_promos_updated', handleSync);
    return () => {
      window.removeEventListener('storeadv_products_updated', handleSync);
      window.removeEventListener('storeadv_orders_updated', handleSync);
      window.removeEventListener('storeadv_promos_updated', handleSync);
    };
  }, []);

  const metrics = useMemo(() => calculateMetrics(orders, products), [orders, products]);

  // Account product reference
  const accountProduct = useMemo(() => {
    return products.find((p) => p.type === 'advance_account');
  }, [products]);

  // BB Coin product reference
  const bbCoinProduct = useMemo(() => {
    return products.find((p) => p.type === 'bbcoin_diamond');
  }, [products]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const q = orderSearchQuery.toLowerCase();
      const matchQuery =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.userId && o.userId.toLowerCase().includes(q)) ||
        o.whatsapp.includes(q) ||
        o.itemName.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Add new account to pool
  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccEmail.trim() || !newAccPassword.trim()) return;

    const updated = products.map((prod) => {
      if (prod.type === 'advance_account') {
        return {
          ...prod,
          denominations: prod.denominations.map((denom) => {
            if (denom.id === selectedDenomForAccount) {
              const currentPool = denom.accountPool || [];
              const newCredential: AccountCredential = {
                id: `acc-${Date.now()}`,
                email: newAccEmail.trim(),
                password: newAccPassword.trim(),
                serverInfo: newAccServer.trim(),
                bindType: 'Moonton Sepaket Email',
                level: Number(newAccLevel),
                notes: newAccNotes.trim(),
                isSold: false,
                createdAt: new Date().toISOString(),
              };
              const newPool = [...currentPool, newCredential];
              return {
                ...denom,
                accountPool: newPool,
                stockCount: newPool.filter((a) => !a.isSold).length,
              };
            }
            return denom;
          }),
        };
      }
      return prod;
    });

    saveProducts(updated);
    setProducts(updated);
    setNewAccEmail('');
    setNewAccPassword('');
    setShowAddAccountModal(false);
  };

  // Save Item Price Edit
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = products.map((p) => {
      if (p.id === editingItem.productId) {
        return {
          ...p,
          denominations: p.denominations.map((d) => {
            if (d.id === editingItem.item.id) {
              return editingItem.item;
            }
            return d;
          }),
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);
    setEditingItem(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Order ID',
      'Tanggal',
      'Tipe Produk',
      'Paket/Item',
      'User ID/Akun',
      'WhatsApp',
      'Metode Bayar',
      'Total Bayar',
      'Status',
      'Data Akun/SN Terkirim',
    ];

    const rows = orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleString('id-ID'),
      o.productType,
      `"${o.itemName}"`,
      o.userId ? `'${o.userId}` : `"${o.accountDelivered?.email || 'Akun Advance'}"`,
      `'${o.whatsapp}`,
      `"${o.paymentMethodName}"`,
      o.totalAmount,
      o.status,
      o.accountDelivered ? `"${o.accountDelivered.email} / ${o.accountDelivered.password}"` : o.serialNumberDelivery || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KF_STORE_Laporan_Transaksi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-bold text-xs tracking-wider uppercase">
              K&F STORE Enterprise Portal
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-emerald-400 text-xs font-medium">Sistem Pengiriman Otomatis Aktif</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manajemen Stok Akun Advance Server & BB Coin
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Kelola brankas akun Mobile Legends Advance Server siap kirim, margin harga, dan antrean konversi BB Coin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Stok Akun</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Total Omset (Revenue)</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-blue-400 font-mono tabular-nums">
            {formatIDR(metrics.totalRevenue)}
          </p>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            +{metrics.successOrders} transaksi sukses
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Profit Bersih (Net Margin)</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {metrics.totalRevenue > 0
                ? `${Math.round((metrics.totalProfit / metrics.totalRevenue) * 100)}%`
                : '0%'}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {formatIDR(metrics.totalProfit)}
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Laba bersih penjualan akun & BB Coin
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Stok Akun Advance Ready</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-white font-mono tabular-nums">
            {metrics.accountsAvailable} Akun
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            {metrics.accountsSold} akun telah terjual & terkirim
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Kecepatan Pengiriman Web</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
            Instant (1-3 dtk)
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Data login muncul otomatis di layar
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-900 rounded-2xl border border-neutral-800 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Brankas Stok Akun Advance Server ({metrics.accountsAvailable} Ready)</span>
        </button>

        <button
          onClick={() => setActiveTab('bbcoin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'bbcoin'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Katalog BB Coin & Konversi Diamond</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Semua Pesanan & Riwayat Kirim ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('promos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'promos'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Kode Promo ({promos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'guide'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Panduan & Alur Manajemen K&F</span>
        </button>
      </div>

      {/* ================= TAB 1: BRANKAS STOK AKUN ADVANCE SERVER ================= */}
      {activeTab === 'accounts' && accountProduct && (
        <div className="space-y-6">
          {/* Package Summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {accountProduct.denominations.map((denom) => {
              const unsold = denom.accountPool?.filter((a) => !a.isSold).length || 0;
              const sold = denom.accountPool?.filter((a) => a.isSold).length || 0;

              return (
                <div key={denom.id} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs">{denom.name}</span>
                    <button
                      onClick={() => setEditingItem({ productId: accountProduct.id, item: { ...denom } })}
                      className="p-1 rounded text-blue-400 hover:bg-neutral-800"
                      title="Edit Harga Paket"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-baseline justify-between text-xs mt-1">
                    <span className="text-neutral-400">Harga Jual:</span>
                    <strong className="text-blue-400 font-mono">{formatIDR(denom.priceSell)}</strong>
                  </div>
                  <div className="flex items-baseline justify-between text-xs mt-1">
                    <span className="text-neutral-400">Modal:</span>
                    <span className="text-neutral-300 font-mono">{formatIDR(denom.priceBase)}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs mt-2 pt-2 border-t border-neutral-800">
                    <span className="text-emerald-400 font-bold">{unsold} Akun Ready</span>
                    <span className="text-neutral-500">{sold} Terjual</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* List of Accounts in Pool */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-sm">Daftar Kredensial Akun Advance Server di Brankas</h3>
              <span className="text-xs text-neutral-400">Akun yang belum terjual akan otomatis terkirim saat customer membayar</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Paket Akun</th>
                    <th className="py-3 px-4">Email Moonton</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4">Server Target</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Status Stok</th>
                    <th className="py-3 px-4">Catatan Bind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300 font-mono">
                  {accountProduct.denominations.flatMap((denom) =>
                    (denom.accountPool || []).map((acc) => (
                      <tr key={acc.id} className="hover:bg-neutral-950/40">
                        <td className="py-3 px-4 font-sans font-semibold text-white">
                          {denom.name}
                        </td>
                        <td className="py-3 px-4 text-blue-400 select-all">
                          {acc.email}
                        </td>
                        <td className="py-3 px-4 text-amber-400 select-all">
                          {acc.password}
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          {acc.serverInfo}
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          Lv. {acc.level}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {acc.isSold ? (
                            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                              Terjual ({acc.soldToOrderId || 'Order'})
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                              Ready Kirim
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-neutral-400 text-[11px] max-w-xs truncate">
                          {acc.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: BB COIN DENOMINASI ================= */}
      {activeTab === 'bbcoin' && bbCoinProduct && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="font-bold text-white text-sm">Paket Top Up BB Coin & Konversi Diamond</h3>
              <p className="text-xs text-neutral-400">Atur harga modal, harga jual, dan estimasi Diamond yang diterima</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Paket BB Coin</th>
                  <th className="py-3 px-4">Diamond Dihasilkan</th>
                  <th className="py-3 px-4">Harga Modal</th>
                  <th className="py-3 px-4">Harga Jual</th>
                  <th className="py-3 px-4">Margin Laba</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {bbCoinProduct.denominations.map((item) => {
                  const profitRp = item.priceSell - item.priceBase;
                  const profitPercent = Math.round((profitRp / item.priceSell) * 100);
                  const totalD = (item.diamondAmount || 0) + (item.bonusDiamond || 0);

                  return (
                    <tr key={item.id} className="hover:bg-neutral-950/40">
                      <td className="py-3.5 px-4 font-bold text-white">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-400 font-mono">
                          {totalD} Diamonds
                        </span>
                        {item.bonusDiamond && (
                          <span className="text-[10px] text-blue-400 block font-sans">
                            ({item.diamondAmount} + {item.bonusDiamond} Bonus)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-400">
                        {formatIDR(item.priceBase)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatIDR(item.priceSell)}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-emerald-400 font-bold block">+{formatIDR(profitRp)}</span>
                        <span className="text-[10px] text-neutral-500">{profitPercent}% margin</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setEditingItem({ productId: bbCoinProduct.id, item: { ...item } })}
                          className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-semibold rounded-lg border border-neutral-700"
                        >
                          Edit Harga
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SEMUA PESANAN & AUDIT ================= */}
      {activeTab === 'orders' && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-neutral-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Cari Order ID, WhatsApp, User ID..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-700 text-xs text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-700 text-white text-xs rounded-xl px-3 py-2"
              >
                <option value="all">Semua Status</option>
                <option value="PENDING_PAYMENT">Menunggu Bayar</option>
                <option value="PROCESSING">Diproses</option>
                <option value="SUCCESS">Sukses Terkirim</option>
              </select>
            </div>

            <span className="text-xs text-neutral-400">
              Total {filteredOrders.length} transaksi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Tipe Produk</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Penerima / Akun</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-950/40">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{ord.id}</td>
                    <td className="py-3 px-4">
                      {ord.productType === 'advance_account' ? (
                        <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded font-bold">
                          AKUN ADVANCE
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded font-bold">
                          TOP UP BB COIN
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{ord.itemName}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {ord.accountDelivered ? (
                        <span className="text-emerald-400 block">{ord.accountDelivered.email}</span>
                      ) : (
                        <span className="text-white block">{ord.userId} ({ord.zoneId})</span>
                      )}
                      <span className="text-neutral-500">WA: {ord.whatsapp}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                      {formatIDR(ord.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      {ord.status === 'SUCCESS' && (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-900 px-2 py-0.5 rounded">
                          SUKSES
                        </span>
                      )}
                      {ord.status === 'PENDING_PAYMENT' && (
                        <span className="text-[11px] font-bold text-red-400 bg-red-950/70 border border-red-900 px-2 py-0.5 rounded">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ord.status === 'PENDING_PAYMENT' && (
                          <button
                            onClick={() => triggerAutomaticFulfillment(ord.id)}
                            className="px-2 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-[11px] rounded"
                          >
                            Set Lunas
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrderDetails(ord)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] rounded"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: KODE PROMO ================= */}
      {activeTab === 'promos' && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
          <div className="mb-4 pb-3 border-b border-neutral-800">
            <h3 className="font-bold text-white text-sm">Voucher Promo & Diskon STORE ADV</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promos.map((promo) => (
              <div key={promo.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-extrabold text-blue-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-900">
                    {promo.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">
                    AKTIF
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mb-3">{promo.description}</p>
                <div className="space-y-1 text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-2">
                  <div className="flex justify-between">
                    <span>Diskon:</span>
                    <strong className="text-white">{promo.discountPercent}% (Maks {formatIDR(promo.maxDiscount)})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pemakaian:</span>
                    <span className="text-blue-400 font-mono font-bold">{promo.usedCount} / {promo.quota}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: PANDUAN & ALUR LENGKAP MANAJEMEN BISNIS K&F STORE ================= */}
      {activeTab === 'guide' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 via-neutral-900 to-red-950/40 border border-blue-900/60 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-red-600 flex items-center justify-center font-bold text-white shadow-md">
                K&F
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Standar Operasional & Alur Manajemen K&F STORE
              </h2>
            </div>
            <p className="text-neutral-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Dokumentasi lengkap tata kelola inventaris, otomatisasi pembayaran, sistem pengiriman data akun instan di layar website, konversi BB Coin ke Diamond, dan strategi margin keuntungan bisnis K&F STORE.
            </p>
          </div>

          {/* Process 1: Manajemen Stok Akun Advance Server */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Alur Manajemen Brankas & Stok Akun Advance Server
                </h3>
                <p className="text-xs text-neutral-400">
                  Pengelolaan kredensial akun Mobile Legends dengan sistem pool terenkripsi (Zero Double-Selling).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                  <Plus className="w-4 h-4" />
                  <span>1. Restok Kredensial Baru</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Admin menginput data akun baru (Email Moonton, Password, Server 5701/5702, Level, dan catatan panduan). Setiap akun yang diinput masuk ke pool status <code className="text-emerald-400">isSold: false</code> dan stok bertambah otomatis.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>2. Alokasi Otomatis (FIFO)</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Ketika pelanggan checkout dan membayar lunas, sistem secara otomatis mengambil 1 akun terlama di antrean (First-In, First-Out), mengunci akun tersebut, dan mengubah statusnya menjadi <code className="text-amber-400">isSold: true</code> terikat pada ID Pesanan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <Key className="w-4 h-4" />
                  <span>3. Tampil Langsung di Layar Web</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Data Email, Password, Server, dan Panduan langsung dibuka di layar website pembeli secara instan dalam 1-3 detik. Pelanggan dapat menyalin 1-klik atau mengunduh file kredensial <code className="text-blue-400">.TXT</code> ke perangkat mereka.
                </p>
              </div>
            </div>
          </section>

          {/* Process 2: Manajemen BB Coin & Konversi Diamond */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Alur Top Up BB Coin & Konversi Diamond Advance Server
                </h3>
                <p className="text-xs text-neutral-400">
                  Mekanisme konversi resmi Bang Bang Coin menjadi Diamond in-game langsung ke User ID & Server.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <UserCheck className="w-4 h-4" />
                  <span>1. Validasi Akun Gamers</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Pembeli memasukkan User ID dan Zone ID. Sistem K&F STORE menjalankan validasi nickname real-time untuk memastikan server dan akun target valid sebelum lanjut ke pembayaran.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <Coins className="w-4 h-4" />
                  <span>2. Rumus Rasio Konversi</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Rasio resmi: <strong>5 BB Coin = 1 Diamond</strong>. Contoh: 1.000 BB = 200 DM (Rp 10.000), 5.000 BB = 1.000 DM (Rp 25.000), hingga 50.000 BB = 10.000 DM (Rp 250.000). Harga sesuai tabel resmi K&F STORE.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                  <Zap className="w-4 h-4" />
                  <span>3. Auto-Injeksi 1-3 Detik</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Setelah verifikasi mutasi pembayaran diterima, API provider otomatis menginjeksi saldo BB Coin yang langsung berubah menjadi Diamond in-game tanpa perlu login akun oleh admin.
                </p>
              </div>
            </div>
          </section>

          {/* Process 3: Gateway Pembayaran & Verifikasi Otomatis */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Alur Integrasi Pembayaran Otomatis (QRIS & Virtual Account)
                </h3>
                <p className="text-xs text-neutral-400">
                  Pembayaran otomatis 24 jam nonstop tanpa perlu kirim struk bukti transfer manual ke WhatsApp.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">A. Generate Invoice</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Nomor invoice unik dihasilkan (contoh: KF-261020-XXXX) bersama kode bayar QRIS dinamis atau nomor Virtual Account bank (BCA, Mandiri, BRI, BNI).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">B. Countdown 15 Menit</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Timer aktif menjaga ketersediaan kuota stok. Jika waktu habis sebelum dibayar, pesanan otomatis kedaluwarsa dan stok dikembalikan ke brankas.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">C. Callback / Webhook</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Ketika dana masuk ke rekening merchant, gateway mengirim webhook notifikasi instan. Status invoice berubah dari <code className="text-amber-400">PENDING</code> menjadi <code className="text-emerald-400">SUCCESS</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">D. Settlement Dana</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Dana hasil penjualan langsung masuk ke saldo kas K&F STORE dan siap dicairkan (disbursement) harian ke rekening bank pemilik toko.
                </p>
              </div>
            </div>
          </section>

          {/* Process 4: Strategi Finansial & Margin Keuntungan */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Manajemen Finansial, HPP (Modal) & Margin Keuntungan
                </h3>
                <p className="text-xs text-neutral-400">
                  Kalkulasi laba bersih, penetapan harga jual, dan ekspor laporan pembukuan toko.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Produk / Paket</th>
                    <th className="py-2.5 px-3">Modal Dasar (HPP)</th>
                    <th className="py-2.5 px-3">Harga Jual K&F</th>
                    <th className="py-2.5 px-3">Margin Laba Bersih</th>
                    <th className="py-2.5 px-3">Persentase Margin</th>
                    <th className="py-2.5 px-3">Status Pemenuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">Akun Advance Fresh (Lvl 8)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(35000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(49000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(14000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">28.5%</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-400">Tampil Langsung di Web</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">Akun Advance Ranked (Lvl 12+)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(55000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(79000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(24000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">30.3%</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-400">Tampil Langsung di Web</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">Akun Advance Sultan (Lvl 20+)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(95000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(139000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(44000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">31.6%</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-400">Tampil Langsung di Web</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">1000 BB (200 DM)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(8000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(10000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(2000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">20.0%</td>
                    <td className="py-2.5 px-3 font-sans text-blue-400">Injeksi Instan via API</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">5.000 BB (1.000 DM) [Promo]</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(20000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(25000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(5000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">20.0%</td>
                    <td className="py-2.5 px-3 font-sans text-blue-400">Injeksi Instan via API</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">50.000 BB (10.000 DM) [Jumbo]</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(200000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(250000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(50000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">20.0%</td>
                    <td className="py-2.5 px-3 font-sans text-blue-400">Injeksi Instan via API</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-400">
              <p>
                * Rumus Laba: <strong>Profit = Harga Jual - Modal Dasar (HPP) - Biaya Transaksi Payment Gateway</strong>.
              </p>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 font-semibold rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan Finansial (.CSV)</span>
              </button>
            </div>
          </section>

          {/* Process 5: Layanan Purna Jual & Pelacakan Transaksi */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Layanan Purna Jual & Pelacakan Transaksi Pelanggan
                </h3>
                <p className="text-xs text-neutral-400">
                  Solusi jika pelanggan tidak sengaja menutup halaman atau butuh data akun kembali.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <h4 className="font-bold text-white text-sm mb-1">Fitur Lacak Pesanan 24 Jam</h4>
                <p className="text-neutral-400 leading-relaxed">
                  Pelanggan cukup memasukkan <strong>Nomor Invoice</strong> atau <strong>Nomor WhatsApp</strong> mereka pada modal Lacak Pesanan di navbar. Seluruh data kredensial akun dan status pengiriman BB Coin akan langsung muncul kembali dengan aman.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <h4 className="font-bold text-white text-sm mb-1">Audit Log & Resend Manual Admin</h4>
                <p className="text-neutral-400 leading-relaxed">
                  Di tab "Semua Pesanan", Admin dapat mengklik tombol mata pada tiap transaksi untuk melihat timeline transaksi, data kredensial yang telah dikirim, atau mengirim ulang struk resmi langsung ke nomor WhatsApp pembeli.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ================= MODAL: TAMBAH STOK AKUN ADVANCE ================= */}
      {showAddAccountModal && accountProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h3 className="text-base font-bold text-white">Tambah Stok Akun Advance Server</h3>
              <button onClick={() => setShowAddAccountModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Pilih Paket Akun:</label>
                <select
                  value={selectedDenomForAccount}
                  onChange={(e) => setSelectedDenomForAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                >
                  {accountProduct.denominations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Email / Akun Moonton:</label>
                <input
                  type="text"
                  required
                  placeholder="adv.player@advserver-store.com"
                  value={newAccEmail}
                  onChange={(e) => setNewAccEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Password Akun:</label>
                <input
                  type="text"
                  required
                  placeholder="Password#2026"
                  value={newAccPassword}
                  onChange={(e) => setNewAccPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-400 mb-1">Server Target:</label>
                  <input
                    type="text"
                    value={newAccServer}
                    onChange={(e) => setNewAccServer(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Level Akun:</label>
                  <input
                    type="number"
                    value={newAccLevel}
                    onChange={(e) => setNewAccLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Panduan / Catatan Khusus untuk Pembeli:</label>
                <input
                  type="text"
                  value={newAccNotes}
                  onChange={(e) => setNewAccNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold"
                >
                  Simpan Akun ke Brankas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PRICE ================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h3 className="text-base font-bold text-white">Edit Harga Produk</h3>
              <button onClick={() => setEditingItem(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Nama Paket:</label>
                <input
                  type="text"
                  value={editingItem.item.name}
                  onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, name: e.target.value } })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Modal Dasar (IDR):</label>
                  <input
                    type="number"
                    value={editingItem.item.priceBase}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, priceBase: Number(e.target.value) } })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Harga Jual (IDR):</label>
                  <input
                    type="number"
                    value={editingItem.item.priceSell}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, priceSell: Number(e.target.value) } })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono font-bold text-blue-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ORDER DETAILS & CREDENTIALS AUDIT ================= */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Detail Pesanan & Kredensial Terkirim</h3>
                <p className="text-xs font-mono text-blue-400">{selectedOrderDetails.id}</p>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-400 text-[11px] block">WhatsApp Pembeli:</span>
                  <span className="text-white font-mono">+62 {selectedOrderDetails.whatsapp}</span>
                </div>
                <div>
                  <span className="text-neutral-400 text-[11px] block">Total Bayar:</span>
                  <span className="text-blue-400 font-mono font-bold">{formatIDR(selectedOrderDetails.totalAmount)}</span>
                </div>
              </div>

              {selectedOrderDetails.accountDelivered && (
                <div className="p-3.5 bg-blue-950/40 rounded-xl border border-blue-900/60 space-y-2">
                  <span className="text-blue-300 font-bold block">Data Akun Advance Server yang Dikirim:</span>
                  <div className="font-mono text-white">
                    <div>Email: <strong className="text-blue-400">{selectedOrderDetails.accountDelivered.email}</strong></div>
                    <div>Password: <strong className="text-amber-400">{selectedOrderDetails.accountDelivered.password}</strong></div>
                    <div>Server: {selectedOrderDetails.accountDelivered.serverInfo}</div>
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-neutral-300 block mb-2">Timeline Audit Transaksi:</span>
                <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 max-h-36 overflow-y-auto font-mono text-[11px]">
                  {selectedOrderDetails.logs.map((log, i) => (
                    <div key={i} className="text-neutral-300">
                      <span className="text-blue-400">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
