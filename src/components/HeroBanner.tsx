import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Zap, UserCheck, Coins, Key } from 'lucide-react';
import { getStoreAssets, syncStoreAssetsFromCloud } from '../utils/storage';

interface HeroBannerProps {
  onSelectProduct: (productId: 'mlbb-advance-server' | 'mlbb-bbcoin') => void;
  onQuickTrack: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onSelectProduct,
  onQuickTrack,
}) => {
  const [heroImg, setHeroImg] = useState<string>(getStoreAssets().heroBannerImg);

  useEffect(() => {
    const handleUpdate = () => {
      setHeroImg(getStoreAssets().heroBannerImg);
    };
    window.addEventListener('storeadv_assets_updated', handleUpdate);

    // Initial sync from cloud database
    syncStoreAssetsFromCloud()
      .then((cloud) => {
        if (cloud?.heroBannerImg) {
          setHeroImg(cloud.heroBannerImg);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('storeadv_assets_updated', handleUpdate);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 mb-10 shadow-2xl">
      {/* Background Hero Image with Measured Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg}
          alt="ASTERA STORE Mobile Legends"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center brightness-35 transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/75 to-transparent" />
      </div>

      <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 max-w-4xl">
        {/* Editorial Subtitle / Kicker */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-400 font-bold text-xs tracking-wider uppercase">
            ASTERA STORE · SPESIALIS RESMI MLBB
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-red-400 text-xs font-semibold">Data Akun Langsung Tampil di Website</span>
        </div>

        {/* Display Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-2xl text-balance">
          Akun Advance Server & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-red-500">Top Up Diamond BB Coin</span>
        </h1>

        <p className="mt-3 text-sm sm:text-base text-neutral-300 max-w-xl leading-relaxed">
          Platform resmi <strong>ASTERA STORE</strong> untuk <strong>Akun Mobile Legends Advance Server</strong> (kredensial login email/password langsung muncul di website setelah bayar) dan <strong>Top Up Diamond hemat via BB Coin</strong> auto-konversi 5:1 instan.
        </p>

        {/* Direct Product Selector CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3.5 max-w-xl">
          <button
            onClick={() => onSelectProduct('mlbb-advance-server')}
            className="flex-1 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white border border-blue-500/30 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5"
          >
            <UserCheck className="w-4 h-4 text-white" />
            <span>Beli Akun Advance Server</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectProduct('mlbb-bbcoin')}
            className="flex-1 px-5 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white border border-red-500/30 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2.5"
          >
            <Coins className="w-4 h-4 text-white" />
            <span>Top Up BB Coin (Auto Konversi 5:1)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Highlights Strip */}
        <div className="mt-8 pt-6 border-t border-neutral-800/80 flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-neutral-300">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Key className="w-3.5 h-3.5" />
            <span>Data Akun Kirim Instan di Web</span>
          </div>
          <span className="text-neutral-700">·</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>BB Coin Auto-Konversi 5:1 (1-3 Detik)</span>
          </div>
          <span className="text-neutral-700">·</span>
          <div className="flex items-center gap-1.5 text-red-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Garansi Anti-Hackback 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
