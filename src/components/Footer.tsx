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
    <footer className="w-full bg-[#0d041c] border-t-2 border-purple-900/80 text-purple-300/80 text-xs mt-20">
      {/* Trust Proposition Strip */}
      <div className="border-b border-purple-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1b0838] border-2 border-purple-600/60 flex items-center justify-center shrink-0 text-purple-300 shadow-[0_2px_0_0_#4c1d95]">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="font-pixel text-white text-sm tracking-wide">KIRIM DI WEBSITE</p>
                <p className="text-purple-300/70 text-xs mt-0.5">Email & Password langsung tampil di layar setelah bayar.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0e2136] border-2 border-cyan-600/60 flex items-center justify-center shrink-0 text-cyan-300 shadow-[0_2px_0_0_#164e63]">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="font-pixel text-white text-sm tracking-wide">BB COIN KONVERSI 5:1</p>
                <p className="text-purple-300/70 text-xs mt-0.5">Top up Diamond via BB Coin 5:1 langsung masuk resmi 1-3 detik.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1b0838] border-2 border-purple-600/60 flex items-center justify-center shrink-0 text-purple-300 shadow-[0_2px_0_0_#4c1d95]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-pixel text-white text-sm tracking-wide">PEMBAYARAN AMAN</p>
                <p className="text-purple-300/70 text-xs mt-0.5">QRIS otomatis dengan verifikasi instan di website.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#280828] border-2 border-pink-600/60 flex items-center justify-center shrink-0 text-pink-300 shadow-[0_2px_0_0_#831843]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-pixel text-white text-sm tracking-wide">GARANSI 100%</p>
                <p className="text-purple-300/70 text-xs mt-0.5">Akun Advance Server bergaransi anti-hackback seumur hidup.</p>
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
                <div className="w-8 h-8 rounded-lg bg-[#1b0838] border border-purple-700 overflow-hidden flex items-center justify-center p-0.5">
                  <img src={storeLogo} alt="ASTERA STORE" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white flex items-center justify-center font-pixel text-xs">
                  AS
                </div>
              )}
              <span className="font-pixel text-base text-white tracking-wide">
                ASTERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400">STORE</span>
              </span>
            </div>
            <p className="text-purple-300/80 max-w-md leading-relaxed text-xs">
              ASTERA STORE adalah toko arcade game spesialis Mobile Legends di Indonesia. Kami menyediakan Akun MLBB Advance Server siap pakai (kredensial login dikirim langsung di layar website) dan Top Up Diamond hemat via jalur konversi resmi BB Coin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-purple-300/70 font-pixel">
              <span className="bg-[#1b0838] border border-purple-800/80 px-2.5 py-1 rounded-lg">PT ASTERA DIGITAL STORE INDONESIA</span>
              <span className="bg-[#1b0838] border border-purple-800/80 px-2.5 py-1 rounded-lg">NIB: 9120019283711</span>
            </div>
          </div>

          <div>
            <p className="font-pixel text-white text-sm mb-3 tracking-wide">METODE PEMBAYARAN RESMI</p>
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="bg-white rounded-lg p-1 h-8 flex items-center shadow-sm">
                <QrisLogo className="h-6 w-auto" />
              </div>
              <div className="bg-[#1b0838] border border-purple-800/80 rounded-lg p-1 h-8 flex items-center shadow-sm overflow-hidden">
                <DanaLogo className="h-6 w-auto" />
              </div>
              <div className="bg-[#1b0838] border border-purple-800/80 rounded-lg p-1 h-8 flex items-center shadow-sm overflow-hidden">
                <GopayLogo className="h-6 w-auto" />
              </div>
            </div>
            <p className="text-[11px] text-purple-400/80 mt-2.5">
              QRIS DANA Bisnis terhubung ke Admin (+62 823-1208-8548). Verifikasi via WhatsApp.
            </p>
          </div>

          <div>
            <p className="font-pixel text-white text-sm mb-3 tracking-wide">BANTUAN & CS</p>
            <ul className="space-y-2 text-purple-300/90 text-xs">
              <li>
                <a href="#cara-login" className="hover:text-purple-200 transition-colors">Panduan Login Advance Server</a>
              </li>
              <li>
                <a href="#garansi" className="hover:text-purple-200 transition-colors">Kebijakan Garansi Akun</a>
              </li>
              <li>
                <a
                  href="https://wa.me/6282312088548"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-300 hover:text-white underline font-semibold"
                >
                  CS WhatsApp (+62 823-1208-8548)
                </a>
              </li>
              <li className="text-[11px] text-amber-300/90 pt-1 font-pixel">
                ★ Buka: 09:00 - 22:00 WIB (Tutup 10 Malam)
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-purple-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-purple-400/80">
          <p>© 2026 ASTERA STORE. Seluruh Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="hover:text-purple-200 cursor-pointer">Syarat & Ketentuan</span>
            <span className="hover:text-purple-200 cursor-pointer">Kebijakan Privasi</span>
            <span className="text-emerald-400 font-pixel">● SISTEM ONLINE</span>
            {onOpenAdminAuth && (
              <button
                onClick={onOpenAdminAuth}
                className="flex items-center gap-1 text-purple-400 hover:text-white transition-colors py-0.5 px-2 rounded hover:bg-[#1b0838] border border-transparent hover:border-purple-800"
                title="Khusus Pemilik ASTERA STORE (Memerlukan PIN)"
              >
                <Lock className="w-3 h-3 text-purple-400" />
                <span>Portal Pemilik</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
