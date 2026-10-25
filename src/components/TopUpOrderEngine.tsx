import React, { useState, useMemo } from 'react';
import { ProductCatalog, DenominationItem, PaymentChannel, PromoCode, Order } from '../types/store';
import { PAYMENT_CHANNELS } from '../data/mockData';
import { formatIDR, calculatePaymentFee, generateOrderId } from '../utils/currency';
import { simulateCheckNickname, loadPromos, saveOrders, loadOrders, savePromos, syncOrderToServer, getDenomReadyStock } from '../utils/storage';
import { QrisLogo, GopayLogo, DanaLogo } from './PaymentLogos';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Zap,
  Tag,
  ShieldCheck,
  Info,
  UserCheck,
  Coins,
  Key,
  Flame,
  Check,
  AlertTriangle,
  Video,
  Clock,
  Mail,
  Radio,
  Power,
  Ban,
} from 'lucide-react';

interface TopUpOrderEngineProps {
  product: ProductCatalog;
  onBack: () => void;
  onOrderCreated: (order: Order) => void;
}

export const TopUpOrderEngine: React.FC<TopUpOrderEngineProps> = ({
  product,
  onBack,
  onOrderCreated,
}) => {
  const isAccountProduct = product.type === 'advance_account';

  // Step 1 for BB Coin: Account Data (Input manual tanpa cek otomatis)
  const [userId, setUserId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [showIdHelp, setShowIdHelp] = useState(false);
  const [isDisclaimerAgreed, setIsDisclaimerAgreed] = useState(false);

  // Jam Operasional: Buka s.d 22:00 WIB (10 malam tutup)
  const isStoreOpen = useMemo(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const wibHour = (utcHours + 7) % 24;
    return wibHour >= 9 && wibHour < 22;
  }, []);

  const isProductActive = product.isActive !== false;

  // Selected Denomination / Package
  const [selectedItem, setSelectedItem] = useState<DenominationItem | null>(() => {
    const available = product.denominations.filter((d) => {
      const isAct = d.isActive !== false;
      const readyStock = getDenomReadyStock(d);
      return isAct && (d.stockType !== 'account_pool' || readyStock > 0);
    });
    return available.find((d) => d.isFlashSale) || available[0] || product.denominations[0] || null;
  });

  // Keep selectedItem in sync when product.denominations update from cloud
  React.useEffect(() => {
    if (!selectedItem) {
      const available = product.denominations.filter((d) => {
        const isAct = d.isActive !== false;
        const readyStock = getDenomReadyStock(d);
        return isAct && (d.stockType !== 'account_pool' || readyStock > 0);
      });
      const chosen = available.find((d) => d.isFlashSale) || available[0] || product.denominations[0] || null;
      if (chosen) setSelectedItem(chosen);
    } else {
      const refreshed = product.denominations.find((d) => d.id === selectedItem.id);
      if (refreshed) {
        const oldStock = getDenomReadyStock(selectedItem);
        const newStock = getDenomReadyStock(refreshed);
        if (oldStock !== newStock || refreshed.isActive !== selectedItem.isActive) {
          setSelectedItem(refreshed);
        }
      }
    }
  }, [product]);

  // Selected Payment
  const [selectedPayment, setSelectedPayment] = useState<PaymentChannel>(PAYMENT_CHANNELS[0]);

  // Contact
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Promo Code
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Modal confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formError, setFormError] = useState('');

  // Promo handler
  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccess('');
    if (!promoInput.trim()) {
      setPromoError('Masukkan kode promo.');
      return;
    }

    if (!selectedItem) {
      setPromoError('Pilih paket/nominal terlebih dahulu.');
      return;
    }

    const promos = loadPromos();
    const code = promoInput.trim().toUpperCase();
    const promo = promos.find((p) => p.code === code && p.isActive);

    if (!promo) {
      setPromoError('Kode promo tidak valid atau telah kedaluwarsa.');
      return;
    }

    if (promo.usedCount >= promo.quota) {
      setPromoError('Kuota kode promo ini sudah habis.');
      return;
    }

    if (selectedItem.priceSell < promo.minSpend) {
      setPromoError(`Minimal transaksi untuk promo ini adalah ${formatIDR(promo.minSpend)}.`);
      return;
    }

    setAppliedPromo(promo);
    setPromoSuccess(`Kode ${promo.code} berhasil digunakan!`);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoSuccess('');
    setPromoError('');
  };

  // Calculations
  const subtotal = selectedItem ? selectedItem.priceSell : 0;
  const discountAmount = useMemo(() => {
    if (!appliedPromo || !selectedItem) return 0;
    const rawDisc = Math.round((subtotal * appliedPromo.discountPercent) / 100);
    return Math.min(rawDisc, appliedPromo.maxDiscount);
  }, [appliedPromo, subtotal, selectedItem]);

  const paymentFee = useMemo(() => {
    if (!selectedPayment || subtotal === 0) return 0;
    return calculatePaymentFee(subtotal - discountAmount, selectedPayment.feePercent, selectedPayment.feeFixed);
  }, [selectedPayment, subtotal, discountAmount]);

  const totalAmount = Math.max(0, subtotal - discountAmount + paymentFee);

  // Validate and open confirmation modal
  const handleInitiateOrder = () => {
    setFormError('');

    if (!isProductActive) {
      setFormError('⚠️ Produk ini sedang dinonaktifkan oleh Admin karena stok kosong. Pemesanan tidak dapat diproses.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isAccountProduct) {
      if (!userId.trim()) {
        setFormError('Mohon masukkan User ID MLBB Anda untuk top up BB Coin.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!zoneId.trim()) {
        setFormError('Mohon lengkapi Zone ID / Server MLBB.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!isDisclaimerAgreed) {
        setFormError('⚠️ Mohon centang kotak persetujuan syarat Live Streaming aktif & jadwal masuk Diamond pukul 20:00 WIB di bagian bawah Step 1.');
        return;
      }
    }

    if (!selectedItem) {
      setFormError('Silakan pilih salah satu paket atau nominal.');
      return;
    }

    const isItemActive = selectedItem.isActive !== false;
    const readyStock = getDenomReadyStock(selectedItem);
    if (!isItemActive || (selectedItem.stockType === 'account_pool' && readyStock <= 0)) {
      setFormError(`⚠️ Paket "${selectedItem.name}" sedang kosong atau dinonaktifkan oleh Admin. Silakan pilih paket lain.`);
      return;
    }

    if (!selectedPayment) {
      setFormError('Silakan tentukan metode pembayaran.');
      return;
    }

    if (!whatsapp.trim() || whatsapp.trim().length < 9) {
      setFormError('Mohon masukkan nomor WhatsApp aktif untuk pengiriman bukti & notifikasi.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleFinalConfirmOrder = () => {
    if (!selectedItem || !selectedPayment) return;

    const orderId = generateOrderId('AST');
    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      productType: product.type,
      productId: product.id,
      productTitle: product.title,
      productImage: product.coverImage,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      userId: !isAccountProduct ? userId.trim() : undefined,
      zoneId: !isAccountProduct ? zoneId.trim() : undefined,
      userNickname: !isAccountProduct ? `Player MLBB (ID: ${userId.trim()})` : 'Pembeli Akun Advance Server',
      whatsapp: whatsapp.trim(),
      email: email.trim() || undefined,
      paymentMethodId: selectedPayment.id,
      paymentMethodName: selectedPayment.name,
      paymentGroup: selectedPayment.group,
      subtotal,
      fee: paymentFee,
      discount: discountAmount,
      promoCode: appliedPromo?.code,
      totalAmount,
      status: 'PENDING_PAYMENT',
      virtualAccount: selectedPayment.accountNumber ? `${selectedPayment.accountNumber}${Math.floor(10 + Math.random() * 89)}` : undefined,
      bbCoinConversion: !isAccountProduct && selectedItem.bbCoinAmount ? {
        coins: selectedItem.bbCoinAmount,
        diamonds: selectedItem.diamondAmount || selectedItem.bbCoinAmount,
        bonus: selectedItem.bonusDiamond || 0,
      } : undefined,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString('id-ID'),
          message: isAccountProduct
            ? `Invoice ${orderId} dibuat. Menunggu pembayaran via ${selectedPayment.name}. Data akun akan diserahkan setelah pembayaran diverifikasi oleh Admin.`
            : `Invoice ${orderId} dibuat. Menunggu pembayaran via ${selectedPayment.name}. Diamond akan dikirimkan setelah pembayaran diverifikasi oleh Admin.`,
        },
      ],
    };

    const orders = loadOrders();
    orders.unshift(newOrder);
    saveOrders(orders);
    syncOrderToServer(newOrder);

    if (appliedPromo) {
      const promos = loadPromos();
      const pIdx = promos.findIndex((p) => p.id === appliedPromo.id);
      if (pIdx !== -1) {
        promos[pIdx].usedCount += 1;
        savePromos(promos);
      }
    }

    setShowConfirmModal(false);
    onOrderCreated(newOrder);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors py-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>
      </div>

      {/* Product Hero Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xl">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-neutral-700 bg-neutral-950 shadow-md">
          <img
            src={product.coverImage}
            alt={product.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
              {product.publisher}
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-red-400 font-semibold">{product.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {product.title}
          </h1>
          <p className="text-neutral-400 text-sm mt-1.5 max-w-xl">
            {product.shortDesc}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-neutral-300">
            {isAccountProduct ? (
              <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Key className="w-3.5 h-3.5" />
                <span>Pengiriman Otomatis Langsung di Website</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Coins className="w-3.5 h-3.5" />
                <span>Auto-Konversi 5:1 Diamond Resmi</span>
              </span>
            )}
            <span>·</span>
            <span className="flex items-center gap-1.5 text-red-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garansi 100% Aman & Terpercaya</span>
            </span>
          </div>
        </div>
      </div>

      {/* Alert Banner if Admin turned off product due to out of stock */}
      {!isProductActive && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-red-950/80 border-2 border-red-600 text-white flex items-start gap-3.5 shadow-xl animate-in fade-in">
          <div className="w-10 h-10 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 border border-red-500/50">
            <Power className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm sm:text-base text-red-200">
                PRODUK SEDANG DINONAKTIFKAN KARENA STOK KOSONG
              </h4>
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black tracking-wider uppercase">
                TUTUP SEMENTARA
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
              Admin saat ini sedang mengisi ulang stok akun / diamond. Pemesanan untuk produk ini ditutup sementara agar pesanan tidak tertunda. Silakan hubungi Admin via WhatsApp untuk info restock.
            </p>
          </div>
        </div>
      )}

      {formError && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span>{formError}</span>
          </div>
          <button onClick={() => setFormError('')} className="text-xs underline text-red-300 hover:text-white">
            Tutup
          </button>
        </div>
      )}

      <div className="space-y-8">
        {/* ================= STEP 1: INPUT DATA (FOR BB COIN ONLY) ================= */}
        {!isAccountProduct && (
          <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/30">
                  1
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Masukkan User ID & Zone ID Akun MLBB
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowIdHelp(!showIdHelp)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Petunjuk ID</span>
              </button>
            </div>

            {showIdHelp && (
              <div className="mb-5 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white mb-1">Cara Menemukan User ID MLBB:</p>
                  <p>{product.idHelpGuide}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  User ID MLBB <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Contoh: 12345678"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Zone ID / Server <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  placeholder="Contoh: 2024"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="mt-3 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 text-xs text-neutral-400 flex items-start gap-2.5">
              <span className="text-blue-400 font-bold shrink-0">ℹ️</span>
              <p className="leading-relaxed">
                Diamond dari konversi BB Coin akan langsung dikirimkan ke nomor <strong>User ID ({userId || '...'})</strong> dan <strong>Server ({zoneId || '...'})</strong> di atas. Mohon pastikan angka ID yang Anda ketik sudah benar.
              </p>
            </div>

            {/* ================= DISCLAIMER WAJIB TOP UP DIAMOND ADVANCE ================= */}
            <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-950 to-red-950/30 border-2 border-amber-500/70 shadow-xl">
              <div className="flex items-center gap-2.5 text-amber-400 font-extrabold text-sm mb-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
                <span>PENTING! CARA & SYARAT TOP UP DIAMOND ADVANCE SERVER</span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Rule 1: Live Streaming */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">
                      1. Wajib Aktifkan Live Streaming (Minimal Rank Master)
                    </h4>
                    <p className="text-neutral-300 leading-relaxed text-[11px]">
                      Buka Mobile Legends &gt; Klik logo <strong className="text-white">Kamera</strong> di pojok kanan atas &gt; Klik <strong className="text-amber-400">"Pergi Live"</strong> dan aktifkan live streaming. Akun wajib minimal sudah mencapai <strong className="text-emerald-400">Rank Master</strong>.
                    </p>
                  </div>
                </div>

                {/* Rule 2: Waktu Masuk Jam 8 Malam */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">
                      2. Jadwal Masuk Diamond: Pukul 20:00 WIB (Jam 8 Malam)
                    </h4>
                    <p className="text-neutral-300 leading-relaxed text-[11px]">
                      Diamond (DM) akan otomatis masuk pukul <strong className="text-blue-400">20:00 WIB (Jam 8 Malam)</strong> langsung ke <strong className="text-amber-400">Mailbox (Pesan In-Game)</strong> akun Anda.
                    </p>
                  </div>
                </div>

                {/* Rule 3: Batas Order 18:00 WIB (6 Sore) */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">
                      3. Batas Jam Order (Cut-Off 18:00 WIB / 6 Sore)
                    </h4>
                    <div className="space-y-1.5 text-[11px] mt-1">
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-bold">✓ Order DI BAWAH jam 18:00 WIB (6 Sore):</span>
                        <span>Diamond masuk di <strong>hari yang sama</strong> (Jam 20:00 WIB).</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-900/60 text-amber-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-bold">✓ Order DI ATAS jam 18:00 WIB (6 Sore):</span>
                        <span>Diamond masuk di <strong>hari besoknya</strong> (Jam 20:00 WIB).</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Server support badge */}
                <div className="px-3 py-2 rounded-lg bg-neutral-900/70 border border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-2">
                  <span className="text-blue-400 font-bold">✓ Server Kompatibel:</span>
                  <span>Support juga untuk <strong>Advance Server TapTap Beta</strong>.</span>
                </div>
              </div>

              {/* Checkbox Persetujuan Pembeli */}
              <label className="flex items-start gap-3 mt-4 pt-3.5 border-t border-amber-800/60 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={isDisclaimerAgreed}
                  onChange={(e) => {
                    setIsDisclaimerAgreed(e.target.checked);
                    if (e.target.checked) setFormError('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 border-neutral-700 bg-neutral-900 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-neutral-200 group-hover:text-white leading-relaxed">
                  <strong className="text-amber-400">Saya Mengerti & Menyetujui:</strong> Akun saya minimal Rank Master, fitur Live Streaming sudah diaktifkan di in-game MLBB, dan bersedia menerima Diamond di Mailbox pukul 20:00 WIB sesuai batas cut-off order jam 18:00 WIB.
                </span>
              </label>
            </div>
          </section>
        )}

        {/* ================= STEP: PILIH PAKET AKUN ATAU NOMINAL BB COIN ================= */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/30">
              {isAccountProduct ? '1' : '2'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isAccountProduct ? 'Pilih Paket Akun Advance Server' : 'Pilih Nominal BB Coin (Konversi ke Diamond)'}
              </h2>
              <p className="text-neutral-400 text-xs">
                {isAccountProduct
                  ? 'Setiap paket dilengkapi kredensial Moonton lengkap dan garansi anti-hackback.'
                  : 'BB Coin otomatis dikonversi menjadi Diamond in-game resmi dengan bonus ekstra.'}
              </p>
            </div>
          </div>

          {/* Cards Display */}
          {isAccountProduct ? (
            /* ACCOUNT SPECIFICATION CARDS */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {product.denominations.map((item) => {
                const isItemActive = item.isActive !== false;
                const unsold = getDenomReadyStock(item);
                const isOutOfStock = !isItemActive || unsold <= 0;
                const isSelected = selectedItem?.id === item.id && !isOutOfStock;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isOutOfStock) {
                        setFormError(`Paket "${item.name}" saat ini sedang kosong atau dinonaktifkan oleh Admin.`);
                        return;
                      }
                      setFormError('');
                      setSelectedItem(item);
                    }}
                    className={`relative text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-neutral-950/40 border-dashed border-red-900/60 opacity-60 cursor-not-allowed text-neutral-400'
                        : isSelected
                        ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500 text-white shadow-xl shadow-blue-600/20'
                        : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        {isOutOfStock ? (
                          <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded shadow flex items-center gap-1 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            <span>STOK KOSONG</span>
                          </span>
                        ) : item.isFlashSale ? (
                          <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800 uppercase tracking-wider inline-block">
                            POPULER
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900 uppercase tracking-wider inline-block">
                            TERSEDIA
                          </span>
                        )}

                        {item.bonusText && !isOutOfStock && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/50">
                            {item.bonusText}
                          </span>
                        )}
                      </div>

                      <h3 className={`text-sm font-extrabold ${isOutOfStock ? 'text-neutral-400' : 'text-white'}`}>
                        {item.name}
                      </h3>

                      {item.accountSpec && (
                        <div className={`mt-3 space-y-1.5 text-[11px] p-2.5 rounded-lg border ${
                          isOutOfStock
                            ? 'bg-neutral-950/60 border-neutral-800/50 text-neutral-500'
                            : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-300'
                        }`}>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Server:</span>
                            <span className={`font-semibold ${isOutOfStock ? 'text-neutral-400' : 'text-blue-400'}`}>{item.accountSpec.server}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Level:</span>
                            <span className={`font-semibold ${isOutOfStock ? 'text-neutral-400' : 'text-white'}`}>{item.accountSpec.level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">BP:</span>
                            <span className={`font-mono ${isOutOfStock ? 'text-neutral-400' : 'text-emerald-400'}`}>{item.accountSpec.battlePoints}</span>
                          </div>
                          <div className="pt-1 border-t border-neutral-800 text-[10px] text-neutral-500">
                            {item.accountSpec.bindStatus}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                      <div>
                        {item.strikePrice && (
                          <span className="text-[10px] line-through decoration-red-500 text-neutral-400 block font-mono">
                            {formatIDR(item.strikePrice)}
                          </span>
                        )}
                        <span className={`text-base font-extrabold font-mono tabular-nums ${isOutOfStock ? 'text-neutral-400 line-through' : 'text-blue-400'}`}>
                          {formatIDR(item.priceSell)}
                        </span>
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        isOutOfStock
                          ? 'text-red-400 bg-red-950/80 border-red-800'
                          : 'text-emerald-400 bg-emerald-950/60 border-emerald-900'
                      }`}>
                        {isOutOfStock ? 'Stok Habis' : `${unsold} Akun Ready`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* BB COIN NOMINALS GRID - MATCHING USER SCREENSHOT EXACTLY */
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800/60">
                <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Top Up Advance Server</span>
                  <span className="text-xs font-normal text-neutral-400 hidden sm:inline">(Rasio Konversi: 5 BB = 1 Diamond)</span>
                </h3>
                <span className="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                  ⚡ Auto-Convert 1-3 Detik
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {product.denominations.map((item) => {
                  const isItemActive = item.isActive !== false;
                  const isOutOfStock = !isItemActive;
                  const isSelected = selectedItem?.id === item.id && !isOutOfStock;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (isOutOfStock) {
                          setFormError(`Nominal "${item.name}" saat ini sedang dinonaktifkan oleh Admin karena stok kosong.`);
                          return;
                        }
                        setFormError('');
                        setSelectedItem(item);
                      }}
                      className={`relative text-left p-4 rounded-xl transition-all flex flex-col justify-between ${
                        isOutOfStock
                          ? 'bg-[#10121a]/60 border-2 border-dashed border-red-900/60 opacity-60 cursor-not-allowed text-neutral-400'
                          : isSelected
                          ? 'bg-[#151928] border-2 border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.55)] ring-1 ring-red-500'
                          : 'bg-[#121520] border border-neutral-800/90 text-neutral-300 hover:border-neutral-700 hover:bg-[#161a28]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          {/* Title: 1000 BB (200 DM) */}
                          <h4 className={`text-sm sm:text-base font-black tracking-tight ${isOutOfStock ? 'text-neutral-400' : 'text-white'}`}>
                            {item.name}
                          </h4>

                          {isOutOfStock && (
                            <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded shadow uppercase">
                              STOK KOSONG
                            </span>
                          )}
                        </div>

                        {/* Price Row with Cyan Diamond Gem */}
                        <div className="flex items-center gap-2 mt-2.5">
                          <svg className={`w-5 h-5 shrink-0 ${isOutOfStock ? 'text-neutral-500 fill-neutral-500' : 'text-cyan-400 fill-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.65)]'}`} viewBox="0 0 24 24">
                            <polygon points="6,2 18,2 22,8 12,22 2,8" />
                          </svg>

                          <div className="flex items-baseline flex-wrap">
                            <span className={`text-base font-extrabold font-mono tabular-nums ${isOutOfStock ? 'text-neutral-400 line-through' : 'text-white'}`}>
                              {formatIDR(item.priceSell)}
                            </span>
                            {item.strikePrice && (
                              <span className="line-through decoration-red-500 decoration-2 text-neutral-400 text-xs font-mono ml-2 font-semibold">
                                {formatIDR(item.strikePrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Divider line and bottom badges matching the screenshot */}
                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400">
                            <span>🚫 Stok Belum Tersedia</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white text-neutral-900 text-[10px] font-bold shadow-sm">
                            <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                            <span>Pengiriman INSTAN</span>
                          </span>
                        )}

                        {item.bonusText && !isOutOfStock && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white text-neutral-900 text-[10px] font-black shadow-sm">
                            <span className="text-orange-500">🔥</span>
                            <span>{item.bonusText}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ================= STEP: PILIH METODE PEMBAYARAN ================= */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/30">
              {isAccountProduct ? '2' : '3'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Pilih Metode Pembayaran Otomatis
              </h2>
              <p className="text-neutral-400 text-xs">
                Sistem verifikasi otomatis 24 jam. Tanpa kirim bukti transfer manual.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* QRIS */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                QRIS (Instan & Bebas Biaya Admin)
              </p>
              <div className="grid grid-cols-1 gap-3">
                {PAYMENT_CHANNELS.filter((p) => p.group === 'QRIS').map((channel) => {
                  const isSelected = selectedPayment.id === channel.id;
                  const fee = calculatePaymentFee(subtotal - discountAmount, channel.feePercent, channel.feeFixed);
                  const grandTotal = Math.max(0, subtotal - discountAmount + fee);

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setSelectedPayment(channel)}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-sm border border-neutral-300">
                          <QrisLogo className="h-7 w-auto" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{channel.name}</span>
                          <span className="text-[11px] text-neutral-400">Scan via DANA, GoPay, OVO, atau m-Banking apapun</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-blue-400 font-mono tabular-nums block">
                          {formatIDR(grandTotal)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">⚡ Verifikasi Instan</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* E-Wallet: GoPay & DANA */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                E-Wallet Resmi (GoPay & DANA)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_CHANNELS.filter((p) => p.group === 'E-Wallet').map((channel) => {
                  const isSelected = selectedPayment.id === channel.id;
                  const fee = calculatePaymentFee(subtotal - discountAmount, channel.feePercent, channel.feeFixed);
                  const grandTotal = Math.max(0, subtotal - discountAmount + fee);

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setSelectedPayment(channel)}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded-lg bg-neutral-900 border border-neutral-700/80 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                          {channel.code === 'GOPAY' ? (
                            <GopayLogo className="h-7 w-auto" />
                          ) : (
                            <DanaLogo className="h-7 w-auto" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{channel.name}</span>
                          <span className="text-[11px] text-neutral-400">Biaya: {formatIDR(fee)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-400 font-mono tabular-nums block">
                          {formatIDR(grandTotal)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">Otomatis</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ================= STEP: KONTAK & NOTIFIKASI ================= */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/30">
              {isAccountProduct ? '3' : '4'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Nomor WhatsApp untuk Bukti Struk & Notifikasi
              </h2>
              <p className="text-neutral-400 text-xs">
                {isAccountProduct
                  ? 'Data login akun akan tampil langsung di website dan dikirimkan juga ke WhatsApp ini sebagai cadangan.'
                  : 'Struk pengiriman Diamond dan status konversi BB Coin akan dikirimkan ke nomor ini.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Nomor WhatsApp <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                  +62
                </span>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="81234567890"
                  className="w-full pl-12 pr-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Alamat Email (Opsional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@anda.com"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* ================= STEP: KODE PROMO & BELI SEKARANG ================= */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/30">
              {isAccountProduct ? '4' : '5'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Kode Promo & Konfirmasi Pembelian
              </h2>
              <p className="text-neutral-400 text-xs">
                Gunakan kode voucher promo STORE ADV untuk potongan harga spesial.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="ADVHEMAT / BBCOINML"
                  className="w-full pl-10 pr-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {appliedPromo ? (
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="px-4 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-semibold rounded-xl transition-all"
                >
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 border border-neutral-700 text-xs font-semibold rounded-xl transition-all active:scale-95"
                >
                  Terapkan
                </button>
              )}
            </div>

            {promoSuccess && (
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{promoSuccess}</span>
              </p>
            )}
            {promoError && (
              <p className="text-xs text-red-400 mt-2">{promoError}</p>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-300">
              <span>Produk Terpilih:</span>
              <span className="font-semibold text-white">
                {product.title} ({selectedItem?.name})
              </span>
            </div>

            {!isAccountProduct && (
              <div className="flex items-center justify-between text-neutral-400">
                <span>Tujuan Top Up MLBB:</span>
                <span className="font-mono text-emerald-400">{userId} ({zoneId})</span>
              </div>
            )}

            {isAccountProduct && (
              <div className="flex items-center justify-between text-blue-300">
                <span>Metode Pengiriman Akun:</span>
                <span className="font-semibold text-blue-400">Tampil Langsung di Layar Website</span>
              </div>
            )}

            <div className="flex items-center justify-between text-neutral-400">
              <span>Harga Produk</span>
              <span className="font-mono tabular-nums text-neutral-200">{formatIDR(subtotal)}</span>
            </div>

            {appliedPromo && discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span>Diskon Promo ({appliedPromo.code})</span>
                <span className="font-mono tabular-nums">-{formatIDR(discountAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-neutral-400">
              <span>Biaya Layanan ({selectedPayment.name})</span>
              <span className="font-mono tabular-nums text-neutral-200">{formatIDR(paymentFee)}</span>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-sm">
              <span className="font-bold text-white">Total Pembayaran:</span>
              <span className="font-extrabold text-blue-400 text-lg font-mono tabular-nums">
                {formatIDR(totalAmount)}
              </span>
            </div>
          </div>

          <div className="mt-6">
            {isProductActive && selectedItem && selectedItem.isActive !== false && (selectedItem.stockType !== 'account_pool' || getDenomReadyStock(selectedItem) > 0) ? (
              <button
                type="button"
                onClick={handleInitiateOrder}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white font-extrabold text-base rounded-xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 fill-white text-white" />
                <span>Beli Sekarang — {formatIDR(totalAmount)}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-4 bg-neutral-800/90 border border-red-900/40 text-neutral-400 font-bold text-sm sm:text-base rounded-xl cursor-not-allowed flex items-center justify-center gap-2.5 shadow-inner"
              >
                <Ban className="w-5 h-5 text-red-500 shrink-0" />
                <span>
                  {!isProductActive
                    ? 'Produk Dinonaktifkan oleh Admin (Stok Kosong)'
                    : !selectedItem
                    ? 'Pilih Paket yang Masih Ready'
                    : 'Paket Sedang Habis (Silakan Pilih Paket Lain)'}
                </span>
              </button>
            )}
            <p className="text-center text-[11px] text-neutral-400 mt-2.5">
              Dengan mengklik Beli Sekarang, Anda menyetujui Syarat & Ketentuan transaksi otomatis ASTERA STORE.
            </p>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="text-center pb-4 border-b border-neutral-800">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Konfirmasi Data Pesanan</h3>
              <p className="text-xs text-neutral-400 mt-1">
                {isAccountProduct
                  ? 'Pastikan pesanan Anda sudah benar. Setelah pembayaran lunas, Email & Password Akun Advance Server akan langsung ditampilkan di website.'
                  : 'Pastikan User ID & Server MLBB Anda sudah tepat sebelum melanjutkan pembayaran.'}
              </p>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Produk:</span>
                <span className="font-semibold text-white">{product.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Paket:</span>
                <span className="font-semibold text-blue-400">{selectedItem?.name}</span>
              </div>

              {!isAccountProduct && (
                <>
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-400">Target User ID & Zone ID:</span>
                    <span className="font-mono text-white font-bold">{userId} ({zoneId})</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-800/80 text-[11px] text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 block">Konfirmasi Syarat Live Streaming:</span>
                      <p className="text-neutral-300">
                        Live Streaming wajib aktif (Min. Rank Master). Diamond masuk otomatis pukul 20:00 WIB di Mailbox in-game (cut-off order 18:00 WIB).
                      </p>
                    </div>
                  </div>
                </>
              )}

              {isAccountProduct && (
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-400">Pengiriman Kredensial:</span>
                  <span className="font-semibold text-emerald-400">Langsung di Layar Website</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Metode Bayar:</span>
                <span className="font-semibold text-blue-400">{selectedPayment.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">No. WhatsApp:</span>
                <span className="font-mono text-white">+62 {whatsapp}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-bold">
                <span className="text-white">Total Bayar:</span>
                <span className="text-blue-400 font-mono tabular-nums">{formatIDR(totalAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs transition-colors"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                onClick={handleFinalConfirmOrder}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white font-bold text-xs transition-colors shadow-md shadow-blue-600/30"
              >
                Bayar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
