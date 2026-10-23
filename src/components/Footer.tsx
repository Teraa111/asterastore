import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Zap, Headphones, Key, Coins, Lock } from 'lucide-react';
import { QrisLogo, GopayLogo, DanaLogo } from './PaymentLogos';
import { getStoreAssets } from '../utils/storage';

interface FooterProps {
  onOpenAdminAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminAuth }) => {
  const [storeLogo, setStoreLogo] = useState<string | undefined>(getStoreAssets().storeLogoImg);

  useEffect(() => {
    const handleAssetsChange = () => {
      setStoreLogo(getStoreAssets().storeLogoImg);
    };
    window.addEventListener('storeadv_assets_updated', handleAssetsChange);
    return () => {
      window.removeEventListener('storeadv_assets_updated', handleAssetsChange);
    };
  }, []);
  return (
    <footer className="w-full bg-neutral-950 border-t border-neutral-900 text-neutral-400 text-xs mt-20">
      {/* Trust Proposition Strip */}
      <div className="border-b border-neutral-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-blue-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Kirim Akun di Website</p>
                <p className="text-neutral-500 mt-0.5">Email & Password Akun Advance Server langsung tampil di website setelah bayar.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-red-400">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">BB Coin Auto-Konversi 5:1</p>
                <p className="text-neutral-500 mt-0.5">Top up Diamond via BB Coin rasio 5:1 langsung masuk ke akun MLBB secara resmi 1-3 detik.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Pembayaran Otomatis</p>
                <p className="text-neutral-500 mt-0.5">QRIS & E-Wallet (GoPay & DANA) terverifikasi instan tanpa antre.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-red-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Garansi 100% Aman</p>
                <p className="text-neutral-500 mt-0.5">Semua akun Advance Server bergaransi anti-hackback seumur hidup.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              {storeLogo ? (
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 overflow-hidden flex items-center justify-center p-0.5">
                  <img src={storeLogo} alt="ASTERA STORE" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 text-white flex items-center justify-center font-black text-xs">
                  AS
                </div>
              )}
              <span className="text-base font-extrabold text-white tracking-tight">
                ASTERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">STORE</span>
              </span>
            </div>
            <p className="text-neutral-400 max-w-md leading-relaxed text-xs">
              ASTERA STORE adalah platform spesialis Mobile Legends terpercaya di Indonesia. Kami menyediakan Akun MLBB Advance Server siap pakai (kredensial login dikirim langsung di layar website) dan Top Up Diamond hemat via jalur konversi resmi BB Coin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-neutral-400">
              <span className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">PT ASTERA DIGITAL STORE INDONESIA</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">NIB: 9120019283711</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white text-sm mb-3">Metode Pembayaran Resmi</p>
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="bg-white rounded-lg p-1 h-8 flex items-center shadow-sm">
                <QrisLogo className="h-6 w-auto" />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-1 h-8 flex items-center shadow-sm overflow-hidden">
                <DanaLogo className="h-6 w-auto" />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-1 h-8 flex items-center shadow-sm overflow-hidden">
                <GopayLogo className="h-6 w-auto" />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2.5">
              Pembayaran otomatis QRIS terhubung ke DANA Admin (+62 823-1208-8548).
            </p>
          </div>

          <div>
            <p className="font-semibold text-white text-sm mb-3">Bantuan & Customer Care</p>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <a href="#cara-login" className="hover:text-blue-400 transition-colors">Panduan Login Advance Server</a>
              </li>
              <li>
                <a href="#garansi" className="hover:text-blue-400 transition-colors">Kebijakan Garansi Akun</a>
              </li>
              <li>
                <a
                  href="https://wa.me/6282312088548"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                >
                  CS WhatsApp ASTERA STORE (+62 823-1208-8548)
                </a>
              </li>
              <li className="text-[11px] text-amber-400/90 pt-1 font-medium">
                🕒 Jam Operasional: 09:00 - 22:00 WIB (Tutup Jam 10 Malam)
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
          <p>© 2026 ASTERA STORE. Seluruh Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="hover:text-neutral-400 cursor-pointer">Syarat & Ketentuan</span>
            <span className="hover:text-neutral-400 cursor-pointer">Kebijakan Privasi</span>
            <span className="text-emerald-400">● Sistem Pembayaran Normal</span>
            {onOpenAdminAuth && (
              <button
                onClick={onOpenAdminAuth}
                className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200 transition-colors py-0.5 px-2 rounded hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
                title="Khusus Pemilik ASTERA STORE (Memerlukan PIN)"
              >
                <Lock className="w-3 h-3 text-neutral-400" />
                <span>Portal Pemilik</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
