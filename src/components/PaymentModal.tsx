import React, { useState, useEffect } from 'react';
import { Order } from '../types/store';
import { formatIDR } from '../utils/currency';
import {
  buyerConfirmPayment,
  adminMarkOrderExpired,
  getOrderStatusDetails,
  loadOrders,
  fetchOrdersFromServer,
  getPaymentConfig,
  syncPaymentConfigFromCloud,
  AdminPaymentConfig,
} from '../utils/storage';
import { QrisLogo, DanaLogo, GopayLogo } from './PaymentLogos';
import {
  X,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Zap,
  Share2,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

interface PaymentModalProps {
  order: Order;
  onClose: () => void;
  onOrderUpdated: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  onClose,
  onOrderUpdated,
}) => {
  const [paymentConfig, setPaymentConfig] = useState<AdminPaymentConfig>(() => getPaymentConfig());
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Sync latest payment config (QRIS & DANA) from Cloud Database
  useEffect(() => {
    const handlePaymentConfigChange = () => {
      setPaymentConfig(getPaymentConfig());
    };
    window.addEventListener('storeadv_payment_config_updated', handlePaymentConfigChange);
    syncPaymentConfigFromCloud()
      .then((conf) => {
        if (conf) setPaymentConfig(conf);
      })
      .catch(() => {});
    return () => window.removeEventListener('storeadv_payment_config_updated', handlePaymentConfigChange);
  }, []);

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Live Sync: update view immediately when Admin verifies order in Admin portal
  useEffect(() => {
    const handleOrdersChange = () => {
      const freshOrders = loadOrders();
      const match = freshOrders.find((o) => o.id === currentOrder.id);
      if (match && (match.status !== currentOrder.status || match.accountDelivered !== currentOrder.accountDelivered)) {
        setCurrentOrder(match);
        onOrderUpdated(match);
      }
    };
    window.addEventListener('storeadv_orders_updated', handleOrdersChange);

    // Active polling from Firestore every 2.5s while invoice modal is open
    const pollInterval = setInterval(() => {
      fetchOrdersFromServer();
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storeadv_orders_updated', handleOrdersChange);
    };
  }, [currentOrder.id, currentOrder.status, currentOrder.accountDelivered, onOrderUpdated]);

  useEffect(() => {
    if (currentOrder.status !== 'PENDING_PAYMENT') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const expired = adminMarkOrderExpired(currentOrder.id);
          if (expired) {
            setCurrentOrder(expired);
            onOrderUpdated(expired);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentOrder.id, currentOrder.status, onOrderUpdated]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllAccountData = () => {
    if (!currentOrder.accountDelivered) return;
    const acc = currentOrder.accountDelivered;
    const fullText = `*DATA AKUN ADVANCE SERVER - ASTERA STORE*\nNomor Pesanan: ${currentOrder.id}\nEmail: ${acc.email}\nPassword: ${acc.password}\nServer: ${acc.serverInfo}\nBind: ${acc.bindType}\nPanduan: ${acc.notes || '-'}`;
    copyToClipboard(fullText, 'all_account');
  };

  const handleDownloadTxtCredentials = () => {
    if (!currentOrder.accountDelivered) return;
    const acc = currentOrder.accountDelivered;
    const content = `=====================================================
ASTERA STORE - BUKTI PENGIRIMAN AKUN ADVANCE SERVER MLBB
=====================================================
Nomor Pesanan : ${currentOrder.id}
Tanggal       : ${new Date().toLocaleString('id-ID')}
Produk        : ${currentOrder.productTitle}
Paket         : ${currentOrder.itemName}
Total Bayar   : ${formatIDR(currentOrder.totalAmount)}
Metode Bayar  : ${currentOrder.paymentMethodName}
Status        : SUKSES & RESMI DIAKTIFKAN

-----------------------------------------------------
DATA LOGIN KREDENSIAL AKUN ADVANCE SERVER:
-----------------------------------------------------
Email Moonton : ${acc.email}
Password      : ${acc.password}
Server Target : ${acc.serverInfo}
Tipe Bind     : ${acc.bindType}

-----------------------------------------------------
PANDUAN LOGIN & MASUK SERVER ADVANCE:
-----------------------------------------------------
1. Buka Mobile Legends di HP Android / iOS Anda.
2. Masuk ke Profil (klik foto avatar di pojok kiri atas).
3. Pilih menu "Pengaturan Akun" -> "Ganti Akun" -> Pilih "Akun Moonton".
4. Masukkan Email & Password yang tertera di atas.
5. Setelah login, klik "Ganti Server" lalu pilih Server Advance (${acc.serverInfo}).
6. Selamat! Anda sekarang berada di Advance Server dan bisa menikmati hero & skin baru lebih dulu.
7. Sangat disarankan untuk langsung mengganti password Moonton demi kenyamanan privasi Anda.

Garansi: 100% Anti-Hackback & Dukungan CS 09:00 - 22:00 WIB.
Customer Support WhatsApp ASTERA STORE: ${paymentConfig.adminPhone}
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ASTERA_STORE_Akun_Advance_${currentOrder.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmPayment = () => {
    if (currentOrder.status !== 'PENDING_PAYMENT') return;
    setIsVerifyingPayment(true);

    setTimeout(() => {
      // Keamanan Transaksi: Pembeli HANYA mengubah status menjadi WAITING_VERIFICATION
      // Status Lunas (SUCCESS) HANYA bisa ditetapkan oleh Admin setelah verifikasi mutasi riil.
      const updated = buyerConfirmPayment(currentOrder.id);
      if (updated) {
        setCurrentOrder(updated);
        onOrderUpdated(updated);
      }
      setIsVerifyingPayment(false);
    }, 700);
  };

  const isQris = currentOrder.paymentGroup === 'QRIS' || currentOrder.paymentMethodId === 'pay-qris';
  const isEwallet = currentOrder.paymentGroup === 'E-Wallet';
  const isAccount = currentOrder.productType === 'advance_account';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative my-auto animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Invoice Header */}
        <div className="text-center pb-5 border-b border-neutral-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 mb-2">
            <span>Invoice:</span>
            <strong className="text-blue-400">{currentOrder.id}</strong>
          </div>

          <h3 className="text-xl font-extrabold text-white">
            {currentOrder.status === 'SUCCESS'
              ? isAccount
                ? 'Data Akun Berhasil Dikirimkan!'
                : 'Top Up BB Coin Berhasil Masuk!'
              : currentOrder.status === 'WAITING_VERIFICATION'
              ? 'Menunggu Verifikasi Admin'
              : currentOrder.status === 'EXPIRED'
              ? 'Waktu Pembayaran Habis'
              : currentOrder.status === 'CANCELLED'
              ? 'Pesanan Dibatalkan'
              : 'Menunggu Pembayaran'}
          </h3>

          <div className="mt-2.5 flex items-center justify-center gap-2">
            {currentOrder.status === 'PENDING_PAYMENT' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-full font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Batas Waktu: {timeFormatted}</span>
              </span>
            )}

            {currentOrder.status === 'WAITING_VERIFICATION' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/60 border border-blue-800/80 px-2.5 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span>Menunggu Verifikasi Admin (+62 823-1208-8548)</span>
              </span>
            )}

            {currentOrder.status === 'EXPIRED' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-full font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Kedaluwarsa</span>
              </span>
            )}

            {currentOrder.status === 'CANCELLED' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-950/60 border border-red-800/80 px-2.5 py-1 rounded-full font-medium">
                <X className="w-3.5 h-3.5" />
                <span>Dibatalkan</span>
              </span>
            )}

            {currentOrder.status === 'SUCCESS' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lunas & Terverifikasi Sah</span>
              </span>
            )}
          </div>
        </div>

        {/* Payment Main Body */}
        <div className="py-5">
          {currentOrder.status === 'SUCCESS' ? (
            /* SUCCESS STATE - DIRECT ON-WEBSITE DELIVERY */
            <div className="space-y-4">
              {isAccount && currentOrder.accountDelivered ? (
                /* DELIVERED ACCOUNT CREDENTIALS BOX (Direct on website delivery) */
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-blue-950/60 to-neutral-950 border-2 border-blue-500 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-blue-900/60 mb-3.5">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                      <Key className="w-4 h-4 text-blue-400" />
                      <span>Data Login Akun Advance Server</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                      SIAP LOGIN
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Email Field */}
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
                        <span>Email / Akun Moonton:</span>
                        <button
                          onClick={() => copyToClipboard(currentOrder.accountDelivered!.email, 'acc_email')}
                          className="text-blue-400 hover:text-white flex items-center gap-1 font-semibold"
                        >
                          {copiedField === 'acc_email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'acc_email' ? 'Tersalin' : 'Salin Email'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-sm font-bold text-white select-all break-all">
                        {currentOrder.accountDelivered.email}
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
                        <span>Password Akun:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-neutral-400 hover:text-neutral-200"
                            title="Tampilkan / Sembunyikan"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(currentOrder.accountDelivered!.password, 'acc_pass')}
                            className="text-blue-400 hover:text-white flex items-center gap-1 font-semibold"
                          >
                            {copiedField === 'acc_pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedField === 'acc_pass' ? 'Tersalin' : 'Salin Password'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-sm font-bold text-amber-400 select-all">
                        {showPassword ? currentOrder.accountDelivered.password : '••••••••••••'}
                      </div>
                    </div>

                    {/* Server Info & Notes */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-400 block">Server Target:</span>
                        <span className="font-bold text-white">{currentOrder.accountDelivered.serverInfo}</span>
                      </div>
                      <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-400 block">Tipe Bind:</span>
                        <span className="font-semibold text-emerald-400">{currentOrder.accountDelivered.bindType}</span>
                      </div>
                    </div>

                    {currentOrder.accountDelivered.notes && (
                      <div className="p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800 text-[11px] text-neutral-300">
                        <span className="font-semibold text-white block mb-0.5">Panduan & Catatan Akun:</span>
                        <p>{currentOrder.accountDelivered.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons: Copy All & Download TXT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={copyAllAccountData}
                        className="py-2.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/50 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedField === 'all_account' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Semua Data</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadTxtCredentials}
                        className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>Unduh File (.TXT)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* DELIVERED BB COIN / DIAMOND SUCCESS RECAP */
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-white text-base">Top Up Diamond Sukses!</h4>
                  <p className="text-xs text-neutral-300 mt-1">
                    BB Coin berhasil dikonversi dan Diamond masuk ke akun <strong>{currentOrder.userNickname}</strong> ({currentOrder.userId}).
                  </p>

                  <div className="mt-3 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-left text-xs space-y-2">
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-400">Paket BB Coin:</span>
                      <span className="font-bold text-white">{currentOrder.itemName}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-400">Serial Reff Moonton:</span>
                      <code className="text-blue-400 font-mono font-bold">{currentOrder.serialNumberDelivery}</code>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Jadwal Pengiriman Mailbox:</span>
                      </div>
                      <p className="leading-relaxed text-neutral-300">
                        Pastikan Live Streaming aktif (Min. Rank Master). Diamond otomatis masuk ke Mailbox in-game pukul 20:00 WIB (cut-off order 18:00 WIB).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Recap */}
              <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Merchant Resmi:</span>
                  <span className="font-bold text-white">ASTERA STORE INDONESIA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Pembayaran:</span>
                  <span className="font-mono font-bold text-blue-400">{formatIDR(currentOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Metode Bayar:</span>
                  <span className="text-neutral-200">{currentOrder.paymentMethodName}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/62${currentOrder.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(
                    `*STRUK RESMI ASTERA STORE*\nNomor Pesanan: ${currentOrder.id}\nProduk: ${currentOrder.productTitle}\nItem: ${currentOrder.itemName}\nTotal: ${formatIDR(currentOrder.totalAmount)}\nStatus: SUKSES\n${
                      isAccount && currentOrder.accountDelivered
                        ? `Email Akun: ${currentOrder.accountDelivered.email}\nPassword: ${currentOrder.accountDelivered.password}\nServer: ${currentOrder.accountDelivered.serverInfo}`
                        : `User ID: ${currentOrder.userId || '-'}\nSN: ${currentOrder.serialNumberDelivery || '-'}\nKetentuan: Diamond masuk jam 20:00 WIB di Mailbox (Live streaming aktif & Min. Rank Master)`
                    }\n\nTerima kasih telah berbelanja di ASTERA STORE!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Kirim Struk ke WhatsApp</span>
                </a>
                <button
                  onClick={onClose}
                  className="py-3 px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : currentOrder.status === 'WAITING_VERIFICATION' ? (
            /* WAITING VERIFICATION STATE - BUYER HAS CONFIRMED PAYMENT */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/60 to-neutral-950 border-2 border-blue-500/80 shadow-2xl text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500 flex items-center justify-center mx-auto text-blue-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-black text-white">
                  Konfirmasi Pembayaran Diterima
                </h4>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>Status: Menunggu Verifikasi Admin</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
                  Invoice <strong className="text-blue-400">{currentOrder.id}</strong> sebesar <strong className="text-white font-mono">{formatIDR(currentOrder.totalAmount)}</strong> telah masuk antrean pemeriksaan Admin ASTERA STORE.
                </p>

                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-left text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Kebijakan Keamanan & Anti-Fraud ASTERA STORE:</span>
                  </div>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    Sistem ASTERA STORE <strong>tidak melunaskan pesanan secara instan hanya berdasarkan klaim atau screenshot</strong>. Admin kami akan memeriksa mutasi dana riil yang masuk di rekening/QRIS DANA Admin (<strong>+62 823-1208-8548</strong>).
                  </p>
                  <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px]">
                    ✓ <strong>Layar ini akan otomatis diperbarui</strong> begitu Admin memverifikasi dan menyetujui mutasi dana Anda. {isAccount ? 'Data Email, Password, & Server Akun Advance Server' : 'Diamond MLBB'} akan langsung muncul di kotak layar ini!
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 py-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[11px]">Menunggu persetujuan admin (Halaman sinkron otomatis saat disetujui)...</span>
                </div>
              </div>

              {/* Fast verification via WhatsApp */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 text-center">
                <span className="text-xs text-neutral-400 block font-medium">
                  Kirimkan bukti transfer sekarang agar Admin dapat segera memproses pesanan Anda:
                </span>
                <a
                  href={`https://wa.me/6282312088548?text=${encodeURIComponent(
                    `Halo Admin ASTERA STORE, saya sudah melakukan transfer pembayaran untuk:\nNomor Invoice: ${currentOrder.id}\nProduk: ${currentOrder.productTitle} (${currentOrder.itemName})\nTotal Transfer: ${formatIDR(currentOrder.totalAmount)}\nMetode: ${currentOrder.paymentMethodName}\n\nBerikut bukti transfer yang sah. Mohon dicek mutasinya dan diverifikasi. Terima kasih!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Kirim Bukti Transfer ke WhatsApp Admin (+62 823-1208-8548)</span>
                </a>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl transition-colors"
                >
                  Tutup Jendela (Status dapat dipantau di menu Lacak Pesanan)
                </button>
              </div>
            </div>
          ) : currentOrder.status === 'EXPIRED' ? (
            /* EXPIRED STATE */
            <div className="space-y-4 animate-in fade-in duration-300 text-center">
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Batas Waktu Pembayaran Telah Habis</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Batas waktu pembayaran 15 menit untuk invoice <strong className="text-white">{currentOrder.id}</strong> telah kedaluwarsa.
                </p>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
                  Jika Anda sudah terlanjur transfer dana, silakan hubungi Customer Care WhatsApp Admin (+62 823-1208-8548) dengan melampirkan bukti transfer untuk dibantu secara manual.
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/6282312088548?text=${encodeURIComponent(
                    `Halo Admin ASTERA STORE, pesanan saya ${currentOrder.id} (${formatIDR(currentOrder.totalAmount)}) kedaluwarsa namun saya sudah transfer. Mohon bantuannya.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <span>Bantuan WhatsApp Admin</span>
                </a>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                >
                  Pesan Ulang
                </button>
              </div>
            </div>
          ) : currentOrder.status === 'CANCELLED' ? (
            /* CANCELLED STATE */
            <div className="space-y-4 animate-in fade-in duration-300 text-center">
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
                  <X className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Pesanan Telah Dibatalkan</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Pesanan dengan invoice <strong className="text-white">{currentOrder.id}</strong> telah dibatalkan oleh Admin atau sistem.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          ) : (
            /* PENDING PAYMENT STATE */
            <div className="space-y-5">
              {!isAccount && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/70 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 block mb-0.5">Disclaimer Top Up Diamond Advance:</strong>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Wajib aktifkan Live Streaming (Min. Rank Master). Diamond masuk jam 20:00 WIB ke Mailbox akun MLBB Anda (Order sebelum jam 18:00 WIB masuk hari ini).
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 text-center">
                <span className="text-xs text-neutral-400 block mb-1">Total Pembayaran Persis:</span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-extrabold text-blue-400 font-mono tabular-nums">
                    {formatIDR(currentOrder.totalAmount)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.totalAmount.toString(), 'amount')}
                    className="p-1.5 text-xs text-neutral-400 hover:text-white rounded bg-neutral-800"
                    title="Salin Jumlah"
                  >
                    {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Metode: {currentOrder.paymentMethodName}
                </span>
              </div>

              {/* QRIS Channel View */}
              {isQris && (
                <div className="flex flex-col items-center">
                  <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-neutral-700 max-w-[280px] w-full flex flex-col items-center justify-between relative">
                    <div className="w-full text-center border-b border-neutral-300 pb-1.5 mb-2">
                      <span className="text-[11px] font-black tracking-wider text-neutral-900 block">
                        QRIS STANDAR NASIONAL (GPN)
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 block">
                        {paymentConfig.qrisMerchantName}
                      </span>
                    </div>

                    {paymentConfig.qrisCustomImageUrl ? (
                      <div className="w-full bg-white flex items-center justify-center p-1 rounded-lg border border-neutral-200 shadow-inner overflow-hidden">
                        <img
                          src={paymentConfig.qrisCustomImageUrl}
                          alt={`QRIS ${paymentConfig.qrisMerchantName}`}
                          className="w-full max-h-[340px] object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-neutral-950 p-1.5 rounded-lg grid grid-cols-7 gap-1">
                        <div className="bg-white rounded-sm p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-4 h-4 bg-neutral-950 rounded-xs" />
                        </div>
                        <div className="bg-white rounded-sm col-span-3" />
                        <div className="bg-white rounded-sm p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-4 h-4 bg-neutral-950 rounded-xs" />
                        </div>
                        <div className="bg-white rounded-sm col-span-3" />
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 col-span-1 flex items-center justify-center font-black text-[9px] text-white rounded">
                          DANA
                        </div>
                        <div className="bg-white rounded-sm col-span-2" />
                        <div className="bg-white rounded-sm p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-4 h-4 bg-neutral-950 rounded-xs" />
                        </div>
                        <div className="bg-white rounded-sm col-span-5" />
                      </div>
                    )}

                    <div className="w-full text-center pt-2 mt-1 border-t border-neutral-200">
                      <div className="text-[8px] text-neutral-600 font-mono font-bold">
                        {paymentConfig.qrisNmid}
                      </div>
                      <div className="text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded px-1 py-0.5 mt-0.5">
                        Terkoneksi ke DANA: {paymentConfig.danaNumber}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 text-center mt-3 max-w-xs leading-relaxed">
                    Scan via <strong>DANA</strong>, GoPay, OVO, ShopeePay, atau m-Banking apapun. Dana langsung masuk ke rekening DANA admin.
                  </p>
                </div>
              )}

              {/* E-Wallet Channel View (GoPay & DANA) */}
              {isEwallet && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-xs text-neutral-400 block mb-1">
                      Nomor Akun Transfer DANA / E-Wallet ({currentOrder.paymentMethodName}):
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-lg font-mono font-bold text-white tracking-wider select-all block">
                          {paymentConfig.danaNumber}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          a/n {paymentConfig.danaAccountName} (Admin Resmi)
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(paymentConfig.danaNumber.replace(/[^0-9]/g, ''), 'ewallet')}
                        className="px-3.5 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/50 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        {copiedField === 'ewallet' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin No DANA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-neutral-300 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-blue-300 font-semibold block">Butuh bantuan transaksi?</span>
                      <span className="text-[11px] text-neutral-400">Hubungi langsung admin WhatsApp kami.</span>
                    </div>
                    <a
                      href={`https://wa.me/6282312088548?text=${encodeURIComponent(
                        `Halo Admin ASTERA STORE, saya ingin konfirmasi pembayaran pesanan ${currentOrder.id} (${formatIDR(currentOrder.totalAmount)}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Chat WhatsApp Admin
                    </a>
                  </div>

                  <p className="text-[11px] text-neutral-400 text-center">
                    Buka aplikasi {currentOrder.paymentMethodName}, transfer tepat <strong>{formatIDR(currentOrder.totalAmount)}</strong> ke nomor di atas.
                  </p>
                </div>
              )}

              {/* Notice that credentials are only revealed after Admin verifies */}
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300">
                  <strong className="text-blue-400 block mb-0.5">Alur Verifikasi Pembayaran Resmi:</strong>
                  {isAccount
                    ? 'Setelah transfer atau scan QRIS, klik tombol konfirmasi di bawah. Admin akan memeriksa mutasi dana masuk di rekening sebelum data login akun Advance Server diserahkan.'
                    : 'Setelah transfer atau scan QRIS, klik tombol konfirmasi di bawah. Admin akan memeriksa mutasi dana masuk di rekening sebelum Diamond diinjeksikan ke ID MLBB Anda.'}
                </div>
              </div>

              {/* Payment Actions */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isVerifyingPayment || currentOrder.status !== 'PENDING_PAYMENT'}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  {isVerifyingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Mencatat Konfirmasi Pembayaran...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Saya Sudah Bayar (Konfirmasi Pembayaran)</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://wa.me/6282312088548?text=${encodeURIComponent(
                    `Halo Admin ASTERA STORE, saya ingin konfirmasi pembayaran untuk:\nNomor Invoice: ${currentOrder.id}\nProduk: ${currentOrder.productTitle}\nTotal: ${formatIDR(currentOrder.totalAmount)}\nMetode: ${currentOrder.paymentMethodName}\n\nBerikut bukti transfer saya. Mohon dicek dan diverifikasi. Terima kasih!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kirim Bukti Transfer ke WhatsApp Admin (+62 823-1208-8548)</span>
                </a>

                <p className="text-[10px] text-neutral-500 text-center">
                  Setelah scan QRIS atau transfer selesai, tekan tombol konfirmasi di atas. Pembayaran akan diverifikasi langsung oleh Admin sebelum kredensial diserahkan.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
