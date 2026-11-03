import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, Plus, Trash2, Edit3, X, Image as ImageIcon, Check } from 'lucide-react';
import heroImg from '../assets/images/hero_gaming_promo_1792561230749.jpg';
import aspirantsImg from '../assets/images/Aspirants Team _ 9 girls 1 crew.jpeg';

import { isAdminSession } from '../utils/storage';

export interface EventBannerItem {
  id: string;
  image: string;
  targetProduct?: 'mlbb-advance-server' | 'mlbb-bbcoin';
}

const STORAGE_KEY_BANNERS = 'storeadv_event_banners_v3';

const DEFAULT_EVENT_BANNERS: EventBannerItem[] = [
  {
    id: 'banner-starlight',
    image: '/assets/promo_starlight_kalea.png',
    targetProduct: 'mlbb-bbcoin',
  },
  {
    id: 'banner-advance',
    image: heroImg,
    targetProduct: 'mlbb-advance-server',
  },
  {
    id: 'banner-aspirants',
    image: aspirantsImg,
    targetProduct: 'mlbb-bbcoin',
  },
];

interface PromoCarouselProps {
  onSelectProduct: (productId: 'mlbb-advance-server' | 'mlbb-bbcoin') => void;
  isAdmin?: boolean;
}

export const PromoCarousel: React.FC<PromoCarouselProps> = ({ onSelectProduct, isAdmin: propIsAdmin }) => {
  const isUserAdmin = propIsAdmin ?? isAdminSession();
  // Load banners from storage or fallback to defaults
  const [banners, setBanners] = useState<EventBannerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BANNERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_EVENT_BANNERS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editList, setEditList] = useState<EventBannerItem[]>(banners);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTarget, setNewTarget] = useState<'mlbb-advance-server' | 'mlbb-bbcoin'>('mlbb-bbcoin');

  const touchStartX = useRef<number | null>(null);

  // Sync edit list when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      setEditList(banners);
    }
  }, [isEditModalOpen, banners]);

  // Auto-slide every 4.5 seconds
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, banners.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  // Save banner updates
  const handleSaveBanners = () => {
    if (editList.length === 0) return;
    setBanners(editList);
    try {
      localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(editList));
    } catch {}
    setCurrentIndex(0);
    setIsEditModalOpen(false);
  };

  const handleAddBanner = () => {
    if (!newImageUrl.trim()) return;
    const newItem: EventBannerItem = {
      id: `banner-${Date.now()}`,
      image: newImageUrl.trim(),
      targetProduct: newTarget,
    };
    setEditList([...editList, newItem]);
    setNewImageUrl('');
  };

  const handleDeleteBanner = (id: string) => {
    if (editList.length <= 1) {
      alert('Minimal harus ada 1 gambar banner!');
      return;
    }
    setEditList(editList.filter((b) => b.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const activeBanner = banners[currentIndex] || banners[0];

  return (
    <section className="mb-10 w-full" aria-label="Kolom Event Arcade">
      {/* Header bar: EVENT text + Ganti Banner action */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-fuchsia-400 animate-pulse" />
          <h2 className="font-pixel text-sm sm:text-base text-white tracking-wide uppercase">
            EVENT
          </h2>
          <span className="hidden sm:inline-block font-pixel text-[11px] text-purple-400 bg-[#1b0838] border border-purple-700/60 px-2 py-0.5 rounded-lg">
            {currentIndex + 1}/{banners.length}
          </span>
        </div>

        {/* Action to change/manage banners (Exclusively for Admin) */}
        {isUserAdmin && (
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="text-[11px] font-pixel text-purple-200 hover:text-white bg-[#1b0838] hover:bg-[#250d4d] border-2 border-purple-600/70 hover:border-purple-400 px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_2px_0_0_#4c1d95] active:scale-95"
            title="Khusus Admin: Klik untuk ganti atau tambah gambar banner event"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-400" />
            <span>GANTI BANNER</span>
          </button>
        )}
      </div>

      {/* Main Banner Slider Container - Pure Clean Artwork ("Polos Aja") */}
      <div
        className="relative w-full rounded-2xl border-2 border-purple-800/80 bg-[#140628] overflow-hidden shadow-[0_6px_0_0_#380b61] cursor-pointer group select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (activeBanner?.targetProduct) {
            onSelectProduct(activeBanner.targetProduct);
          }
        }}
      >
        {/* Banner Frame - Clean, No Overlaid Text */}
        <div className="relative aspect-[21/9] sm:aspect-[24/9] md:aspect-[28/9] min-h-[170px] sm:min-h-[220px] md:min-h-[260px] w-full overflow-hidden bg-[#0c0417] flex items-center justify-center">
          <img
            key={activeBanner?.id || 'banner'}
            src={activeBanner?.image}
            alt="Event Banner"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== '/assets/aistudio/image_8c7a7cc4.png') {
                target.src = '/assets/aistudio/image_8c7a7cc4.png';
              }
            }}
            className="w-full h-full object-cover object-center transform transition-transform duration-500 group-hover:scale-101"
          />

          {/* Left Navigation Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-xl active:scale-90"
            aria-label="Banner Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Right Navigation Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-xl active:scale-90"
            aria-label="Banner Selanjutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Clean Dot Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Pilih Banner ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  currentIndex === idx
                    ? 'w-6 bg-purple-400 shadow-sm shadow-purple-400'
                    : 'w-2 bg-white/40 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Ganti & Atur Banner Event */}
      {isUserAdmin && isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#15072b] border-2 border-purple-700/80 rounded-2xl p-6 shadow-2xl shadow-purple-950/80 text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-purple-900/60 mb-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" />
                <h3 className="font-pixel text-base text-white tracking-wide">
                  GANTI & ATUR BANNER EVENT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-purple-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Current Banners */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1 mb-5">
              <p className="text-xs font-pixel text-purple-300 uppercase">Banner Aktif Saat Ini:</p>
              {editList.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#1d0b38] border border-purple-800/80"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={item.image}
                      alt={`Banner ${idx + 1}`}
                      className="w-16 h-8 object-cover rounded-lg border border-purple-600/40 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <p className="font-pixel text-xs text-white truncate">
                        Banner #{idx + 1}
                      </p>
                      <p className="text-[10px] text-purple-300 truncate">
                        Arahkan ke: {item.targetProduct === 'mlbb-advance-server' ? 'Akun Advance' : 'Top Up BB Coin'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(item.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg transition-colors shrink-0"
                    title="Hapus banner ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Banner Section */}
            <div className="pt-4 border-t-2 border-purple-900/60 mb-6">
              <p className="text-xs font-pixel text-purple-300 uppercase mb-2">Tambah / Ganti Gambar Banner Baru:</p>

              <div className="space-y-3">
                {/* Upload File or URL */}
                <div>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Masukkan URL Gambar (https://... atau /assets/...)"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#100424] border border-purple-700/60 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-purple-300">
                    <span>Atau pilih file dari HP/Laptop:</span>
                    <label className="cursor-pointer font-pixel text-purple-400 hover:text-white underline">
                      Pilih Gambar
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Target Destination */}
                <div className="flex items-center justify-between text-xs font-pixel text-purple-200">
                  <span>Saat Banner Diklik:</span>
                  <select
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value as any)}
                    className="bg-[#100424] border border-purple-700/60 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="mlbb-bbcoin">Buka Top Up BB Coin</option>
                    <option value="mlbb-advance-server">Buka Akun Advance Server</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddBanner}
                  disabled={!newImageUrl.trim()}
                  className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-xs font-pixel tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_0_0_#4c1d95]"
                >
                  <Plus className="w-4 h-4" />
                  <span>TAMBAHKAN BANNER</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-purple-900/60">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-pixel text-purple-300 hover:text-white transition-colors"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleSaveBanners}
                className="arcade-btn-purple px-5 py-2 text-xs font-pixel text-white rounded-xl flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>SIMPAN PERUBAHAN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
