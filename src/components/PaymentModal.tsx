import React, { useState, useEffect } from 'react';
import { Order } from '../types/store';
import { formatIDR } from '../utils/currency';
import { triggerAutomaticFulfillment } from '../utils/storage';
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
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  useEffect(() => {
    if (currentOrder.status !== 'PENDING_PAYMENT') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentOrder.status]);

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
    const fullText = `*DATA AKUN ADVANCE SERVER - K&F STORE*\nNomor Pesanan: ${currentOrder.id}\nEmail: ${acc.email}\nPassword: ${acc.password}\nServer: ${acc.serverInfo}\nBind: ${acc.bindType}\nPanduan: ${acc.notes || '-'}`;
    copyToClipboard(fullText, 'all_account');
  };

  const handleDownloadTxtCredentials = () => {
    if (!currentOrder.accountDelivered) return;
    const acc = currentOrder.accountDelivered;
    const content = `=====================================================
K&F STORE - BUKTI PENGIRIMAN AKUN ADVANCE SERVER MLBB
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

Garansi: 100% Anti-Hackback & Dukungan CS 24 Jam.
Customer Support WhatsApp K&F STORE: 0812-3456-7890
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KF_STORE_Akun_Advance_${currentOrder.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSimulatePayment = () => {
    if (currentOrder.status !== 'PENDING_PAYMENT') return;
    setIsSimulatingPayment(true);

    triggerAutomaticFulfillment(currentOrder.id, (updated) => {
      setCurrentOrder(updated);
      onOrderUpdated(updated);
      if (updated.status === 'SUCCESS') {
        setIsSimulatingPayment(false);
      }
    });
  };

  const isQris = currentOrder.paymentGroup === 'QRIS';
  const isVA = currentOrder.paymentGroup === 'Virtual Account';
  const vaNumber = currentOrder.virtualAccount || '89201982736152';
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
              : currentOrder.status === 'PROCESSING'
              ? isAccount
                ? 'Mendekripsi Data Akun Advance Server...'
                : 'Mengonversi BB Coin ke Diamond MLBB...'
              : 'Menunggu Pembayaran Otomatis'}
          </h3>

          <div className="mt-2.5 flex items-center justify-center gap-2">
            {currentOrder.status === 'PENDING_PAYMENT' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-950/60 border border-red-800/80 px-2.5 py-1 rounded-full font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Batas Waktu: {timeFormatted}</span>
              </span>
            )}

            {currentOrder.status === 'PROCESSING' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/60 border border-blue-800/80 px-2.5 py-1 rounded-full font-medium animate-pulse">
                <Zap className="w-3.5 h-3.5" />
                <span>{isAccount ? 'Menyiapkan Kredensial Akun...' : 'Injeksi Diamond via BB Coin...'}</span>
              </span>
            )}

            {currentOrder.status === 'SUCCESS' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lunas & Terkirim Langsung di Layar</span>
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
                  <span className="font-bold text-white">K&F STORE INDONESIA</span>
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
                    `*STRUK RESMI K&F STORE*\nNomor Pesanan: ${currentOrder.id}\nProduk: ${currentOrder.productTitle}\nItem: ${currentOrder.itemName}\nTotal: ${formatIDR(currentOrder.totalAmount)}\nStatus: SUKSES\n${
                      isAccount && currentOrder.accountDelivered
                        ? `Email Akun: ${currentOrder.accountDelivered.email}\nPassword: ${currentOrder.accountDelivered.password}\nServer: ${currentOrder.accountDelivered.serverInfo}`
                        : `User ID: ${currentOrder.userId || '-'}\nSN: ${currentOrder.serialNumberDelivery || '-'}\nKetentuan: Diamond masuk jam 20:00 WIB di Mailbox (Live streaming aktif & Min. Rank Master)`
                    }\n\nTerima kasih telah berbelanja di K&F STORE!`
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
                  <div className="p-3 bg-white rounded-2xl shadow-lg border border-neutral-700 max-w-[210px] w-full aspect-square flex flex-col items-center justify-between relative">
                    <div className="w-full h-full bg-white flex flex-col items-center justify-between p-1">
                      <div className="w-full text-center border-b border-black pb-1 mb-1">
                        <span className="text-[10px] font-black tracking-widest text-black">QRIS K&F STORE</span>
                      </div>
                      <div className="w-36 h-36 bg-black p-1 rounded grid grid-cols-7 gap-1">
                        <div className="bg-white rounded-sm p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-4 h-4 bg-black rounded-xs" />
                        </div>
                        <div className="bg-white rounded-sm col-span-3" />
                        <div className="bg-white rounded-sm p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-4 h-4 bg-black rounded-xs" />
                        </div>
                        <div className="bg-white rounded-sm col-span-3" />
                        <div className="bg-gradient-to-r from-blue-600 to-red-600 col-span-1 flex items-center justify-center font-bold text-[8px] text-white">
                          K&F
                        </div>
                        <div className="bg-white rounded-sm col-span-2" />
                        <div className="bg-white rounded-sm p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-4 h-4 bg-black rounded-xs" />
                        </div>
                        <div className="bg-white rounded-sm col-span-5" />
                      </div>
                      <div className="w-full text-center pt-1 text-[8px] text-black font-mono font-bold">
                        NMID: ID99281726481 (K&F STORE)
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 text-center mt-3 max-w-xs">
                    Scan via GoPay, OVO, DANA, ShopeePay, BCA Mobile, atau m-Banking apapun.
                  </p>
                </div>
              )}

              {/* Virtual Account */}
              {isVA && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="text-xs text-neutral-400 block mb-1">Nomor Virtual Account ({currentOrder.paymentMethodName}):</span>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-mono font-bold text-white tracking-wider select-all">
                        {vaNumber}
                      </span>
                      <button
                        onClick={() => copyToClipboard(vaNumber, 'va')}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        {copiedField === 'va' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin VA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice that account will be shown right here */}
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3.5 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300">
                  <strong className="text-blue-400 block mb-0.5">Pengiriman Otomatis di Website:</strong>
                  {isAccount
                    ? 'Begitu pembayaran terverifikasi, kredensial akun Advance Server (Email, Password, Server) akan langsung muncul di kotak layar ini!'
                    : 'Begitu pembayaran terverifikasi, konversi BB Coin ke Diamond akan otomatis diproses ke ID MLBB Anda dalam 1-3 detik.'}
                </div>
              </div>

              {/* Simulation button */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isSimulatingPayment || currentOrder.status !== 'PENDING_PAYMENT'}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {isSimulatingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Pembayaran & Mengirim Data...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Simulasi Bayar Sekarang (Otomatis Lunas)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
