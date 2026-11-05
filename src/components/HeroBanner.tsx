import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Zap, UserCheck, Coins, Key } from 'lucide-react';
import { getStoreAssets, syncStoreAssetsFromCloud } from '../utils/storage';
import { useTheme } from '../utils/theme';

interface HeroBannerProps {
  onSelectProduct: (productId: 'mlbb-advance-server' | 'mlbb-bbcoin') => void;
  onQuickTrack: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onSelectProduct,
  onQuickTrack,
}) => {
  const [theme] = useTheme();
  const isLight = theme === 'light';
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
    <div className={`hero-arcade-banner relative w-full overflow-hidden rounded-2xl border-2 mb-10 transition-all ${
      isLight
        ? 'border-sky-300 bg-sky-950/90 shadow-[0_8px_0_0_#0284c7]'
        : 'border-purple-800/80 bg-[#16082b]/90 shadow-[0_8px_0_0_#3b0764]'
    }`}>
      {/* Background Hero Image with Measured Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg}
          alt="ASTERA STORE Mobile Legends"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center brightness-30 transition-all duration-300"
        />
        <div className={`absolute inset-0 ${
          isLight
            ? 'bg-gradient-to-t from-[#0c2340] via-[#0c2340]/85 to-[#0c2340]/50'
            : 'bg-gradient-to-t from-[#0e051e] via-[#0e051e]/85 to-[#0e051e]/50'
        }`} />
        <div className={`absolute inset-0 ${
          isLight
            ? 'bg-gradient-to-r from-[#0c2340]/95 via-[#0f3460]/85 to-transparent'
            : 'bg-gradient-to-r from-[#0e051e]/95 via-[#1a0833]/80 to-transparent'
        }`} />
      </div>


      <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 max-w-4xl">
        {/* Editorial Subtitle / Kicker with Pixel Gamer Aesthetic */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="font-pixel !text-amber-300 text-xs tracking-widest uppercase font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            ★ ASTERA STORE · ARCADE SPECIALIST ★
          </span>
          <span className="!text-white/60 font-bold">·</span>
          <span className="font-pixel !text-cyan-300 text-xs tracking-wider font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            DATA AKUN INSTAN DI WEB
          </span>
        </div>

        {/* Display Headline with Pixel Gamer Font */}
        <h1 className="hero-banner-title text-3xl sm:text-4xl md:text-5xl font-pixel tracking-wide !text-white leading-tight max-w-2xl text-balance drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
          AKUN ADVANCE SERVER &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            TOP UP BB COIN
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base !text-slate-100 max-w-xl leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          Toko arcade game resmi <strong className="!text-amber-300 font-bold">ASTERA STORE</strong>. Menyediakan{' '}
          <strong className="!text-white font-bold">Akun Mobile Legends Advance Server</strong> (kredensial login email/password langsung muncul di website setelah bayar) dan{' '}
          <strong className="!text-cyan-300 font-bold">Top Up Diamond BB Coin</strong> auto-konversi 5:1 instan.
        </p>

        {/* 3D Retro Arcade Button CTAs (Modeled after arcade button plates) */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 max-w-xl">
          <button
            onClick={() => onSelectProduct('mlbb-advance-server')}
            className={`${
              isLight ? 'arcade-btn-coral' : 'arcade-btn-purple'
            } flex-1 px-6 py-4 rounded-xl text-white font-pixel text-sm tracking-wider flex items-center justify-center gap-2.5 drop-shadow-md`}
          >
            <UserCheck className="w-4 h-4 text-white" />
            <span>BELI AKUN ADVANCE</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectProduct('mlbb-bbcoin')}
            className="arcade-btn-cyan flex-1 px-6 py-4 rounded-xl text-white font-pixel text-sm tracking-wider flex items-center justify-center gap-2.5 drop-shadow-md"
          >
            <Coins className="w-4 h-4 text-white" />
            <span>TOP UP BB COIN (5:1)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Highlights Strip in Arcade Style */}
        <div className="mt-8 pt-6 border-t-2 border-white/20 flex flex-wrap items-center gap-y-3 gap-x-6 text-xs">
          <div className="flex items-center gap-2 !text-white font-pixel font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            <Key className="w-4 h-4 text-amber-400 shrink-0" />
            <span>KIRIM DATA DI WEBSITE</span>
          </div>
          <span className="text-white/50">·</span>
          <div className="flex items-center gap-2 !text-cyan-300 font-pixel font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>AUTO-KONVERSI 5:1 (INSTAN)</span>
          </div>
          <span className="text-white/50">·</span>
          <div className="flex items-center gap-2 !text-amber-300 font-pixel font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>GARANSI ANTI-HACKBACK</span>
          </div>
        </div>
      </div>
    </div>
  );
};
