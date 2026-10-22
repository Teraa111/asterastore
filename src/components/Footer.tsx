import React from 'react';
import { ShieldCheck, Clock, Zap, Headphones, Key, Coins, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdminAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminAuth }) => {
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
                <p className="text-neutral-500 mt-0.5">QRIS & Virtual Account terverifikasi otomatis 24 jam tanpa antre.</p>
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 text-white flex items-center justify-center font-black text-xs">
                A4
              </div>
              <span className="text-base font-extrabold text-white tracking-tight">
                Aster4 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-500">STORE</span>
              </span>
            </div>
            <p className="text-neutral-400 max-w-md leading-relaxed text-xs">
              Aster4 STORE adalah platform spesialis Mobile Legends terpercaya di Indonesia. Kami menyediakan Akun MLBB Advance Server siap pakai (kredensial login dikirim langsung di layar website) dan Top Up Diamond hemat via jalur konversi resmi BB Coin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-neutral-400">
              <span className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">PT ASTER4 DIGITAL STORE INDONESIA</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">NIB: 9120019283711</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white text-sm mb-3">Metode Pembayaran</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300 font-mono text-[11px]">QRIS</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300 font-mono text-[11px]">GoPay</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300 font-mono text-[11px]">DANA</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300 font-mono text-[11px]">ShopeePay</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300 font-mono text-[11px]">BCA VA</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300 font-mono text-[11px]">Mandiri VA</span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-neutral-300 font-mono text-[11px]">BRIVA</span>
            </div>
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
                <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  CS WhatsApp Aster4 STORE (0812-3456-7890)
                </a>
              </li>
              <li className="text-[11px] text-neutral-400 pt-1">
                Jam Operasional: 24 Jam Nonstop
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
          <p>© 2026 Aster4 STORE. Seluruh Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="hover:text-neutral-400 cursor-pointer">Syarat & Ketentuan</span>
            <span className="hover:text-neutral-400 cursor-pointer">Kebijakan Privasi</span>
            <span className="text-emerald-400">● Sistem Pembayaran Normal</span>
            {onOpenAdminAuth && (
              <button
                onClick={onOpenAdminAuth}
                className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200 transition-colors py-0.5 px-2 rounded hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
                title="Khusus Pemilik Aster4 STORE (Memerlukan PIN)"
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
