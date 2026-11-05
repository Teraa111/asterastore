import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Zap, Headphones, Key, Coins, Lock } from 'lucide-react';
import { QrisLogo, GopayLogo, DanaLogo } from './PaymentLogos';
import { getStoreAssets } from '../utils/storage';
import { useTheme } from '../utils/theme';

interface FooterProps {
  onOpenAdminAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminAuth }) => {
  const [theme] = useTheme();
  const isLight = theme === 'light';
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
    <footer className={`w-full border-t-2 text-xs mt-20 transition-colors ${
      isLight 
        ? 'bg-white border-sky-300 text-slate-600' 
        : 'bg-[#0d041c] border-purple-900/80 text-purple-300/80'
    }`}>

      {/* Trust Proposition Strip */}
      <div className={`border-b ${isLight ? 'border-sky-200' : 'border-purple-900/60'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-[0_2px_0_0] ${
                isLight 
                  ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-[#bae6fd]' 
                  : 'bg-[#1b0838] border-purple-600/60 text-purple-300 shadow-[#4c1d95]'
              }`}>
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-pixel text-sm tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>KIRIM DI WEBSITE</p>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-purple-300/70'}`}>Email & Password langsung tampil di layar setelah bayar.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-[0_2px_0_0] ${
                isLight 
                  ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-[#fde68a]' 
                  : 'bg-[#0e2136] border-cyan-600/60 text-cyan-300 shadow-[#164e63]'
              }`}>
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-pixel text-sm tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>BB COIN KONVERSI 5:1</p>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-purple-300/70'}`}>Top up Diamond via BB Coin 5:1 langsung masuk resmi 1-3 detik.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-[0_2px_0_0] ${
                isLight 
                  ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-[#bae6fd]' 
                  : 'bg-[#1b0838] border-purple-600/60 text-purple-300 shadow-[#4c1d95]'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-pixel text-sm tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>PEMBAYARAN AMAN</p>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-purple-300/70'}`}>QRIS otomatis dengan verifikasi instan di website.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-[0_2px_0_0] ${
                isLight 
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-[#fecdd3]' 
                  : 'bg-[#280828] border-pink-600/60 text-pink-300 shadow-[#831843]'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-pixel text-sm tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>GARANSI 100%</p>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-purple-300/70'}`}>Akun Advance Server bergaransi anti-hackback seumur hidup.</p>
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
                <div className={`w-8 h-8 rounded-lg border overflow-hidden flex items-center justify-center p-0.5 ${
                  isLight ? 'bg-white border-sky-300' : 'bg-[#1b0838] border-purple-700'
                }`}>
                  <img src={storeLogo} alt="ASTERA STORE" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-600 text-white flex items-center justify-center font-pixel text-xs">
                  AS
                </div>
              )}
              <span className={`font-pixel text-base tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>
                ASTERA <span className={`text-transparent bg-clip-text ${
                  isLight 
                    ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-amber-600'
                    : 'bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400'
                }`}>STORE</span>
              </span>
            </div>
            <p className={`max-w-md leading-relaxed text-xs ${isLight ? 'text-slate-600' : 'text-purple-300/80'}`}>
              ASTERA STORE adalah toko arcade game spesialis Mobile Legends di Indonesia. Kami menyediakan Akun MLBB Advance Server siap pakai (kredensial login dikirim langsung di layar website) dan Top Up Diamond hemat via jalur konversi resmi BB Coin.
            </p>
            <div className={`mt-4 flex flex-wrap gap-2 text-[11px] font-pixel ${isLight ? 'text-sky-800' : 'text-purple-300/70'}`}>
              <span className={`px-2.5 py-1 rounded-lg border ${
                isLight ? 'bg-sky-50 border-sky-300' : 'bg-[#1b0838] border-purple-800/80'
              }`}>PT ASTERA DIGITAL STORE INDONESIA</span>
              <span className={`px-2.5 py-1 rounded-lg border ${
                isLight ? 'bg-sky-50 border-sky-300' : 'bg-[#1b0838] border-purple-800/80'
              }`}>NIB: 9120019283711</span>
            </div>
          </div>

          <div>
            <p className={`font-pixel text-sm mb-3 tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>METODE PEMBAYARAN RESMI</p>
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="bg-white rounded-lg p-1 h-8 flex items-center shadow-sm border border-slate-200">
                <QrisLogo className="h-6 w-auto" />
              </div>
              <div className={`rounded-lg p-1 h-8 flex items-center shadow-sm overflow-hidden border ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#1b0838] border-purple-800/80'
              }`}>
                <DanaLogo className="h-6 w-auto" />
              </div>
              <div className={`rounded-lg p-1 h-8 flex items-center shadow-sm overflow-hidden border ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#1b0838] border-purple-800/80'
              }`}>
                <GopayLogo className="h-6 w-auto" />
              </div>
            </div>
            <p className={`text-[11px] mt-2.5 ${isLight ? 'text-sky-700' : 'text-purple-400/80'}`}>
              QRIS DANA Bisnis terhubung ke Admin (+62 823-1208-8548). Verifikasi via WhatsApp.
            </p>
          </div>

          <div>
            <p className={`font-pixel text-sm mb-3 tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>BANTUAN & CS</p>
            <ul className={`space-y-2 text-xs ${isLight ? 'text-slate-700' : 'text-purple-300/90'}`}>
              <li>
                <a href="#cara-login" className="hover:underline transition-colors">Panduan Login Advance Server</a>
              </li>
              <li>
                <a href="#garansi" className="hover:underline transition-colors">Kebijakan Garansi Akun</a>
              </li>
              <li>
                <a
                  href="https://wa.me/6282312088548"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline font-semibold ${isLight ? 'text-sky-700 hover:text-sky-900' : 'text-purple-300 hover:text-white'}`}
                >
                  CS WhatsApp (+62 823-1208-8548)
                </a>
              </li>
              <li className={`text-[11px] pt-1 font-pixel ${isLight ? 'text-amber-700 font-bold' : 'text-amber-300/90'}`}>
                ★ Buka: 09:00 - 22:00 WIB (Tutup 10 Malam)
              </li>
            </ul>
          </div>
        </div>

        <div className={`mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] ${
          isLight ? 'border-sky-200 text-slate-500' : 'border-purple-900/60 text-purple-400/80'
        }`}>
          <p>© 2026 ASTERA STORE. Seluruh Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="hover:underline cursor-pointer">Syarat & Ketentuan</span>
            <span className="hover:underline cursor-pointer">Kebijakan Privasi</span>
            <span className="text-emerald-600 font-pixel font-bold">● SISTEM ONLINE</span>
            {onOpenAdminAuth && (
              <button
                onClick={onOpenAdminAuth}
                className={`flex items-center gap-1 transition-colors py-0.5 px-2 rounded border ${
                  isLight 
                    ? 'text-slate-600 hover:text-sky-900 hover:bg-sky-50 border-slate-300' 
                    : 'text-purple-400 hover:text-white hover:bg-[#1b0838] border-purple-800'
                }`}
                title="Khusus Pemilik ASTERA STORE (Memerlukan PIN)"
              >
                <Lock className={`w-3 h-3 ${isLight ? 'text-sky-600' : 'text-purple-400'}`} />
                <span>Portal Pemilik</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
