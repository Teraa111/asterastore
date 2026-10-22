import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, X, Check, ArrowRight } from 'lucide-react';
import { verifyAdminPin, DEFAULT_ADMIN_PIN } from '../utils/storage';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Silakan masukkan PIN keamanan.');
      return;
    }

    if (verifyAdminPin(pin)) {
      setError('');
      setPin('');
      onAuthenticated();
    } else {
      setAttempts((prev) => prev + 1);
      setError('PIN keamanan salah! Akses ke manajemen stok ditolak.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-red-950/20">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-xl transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Security Shield Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 mb-3 border border-red-400/20">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Verifikasi Pemilik Aster4 STORE
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Area ini khusus untuk pemilik toko mengelola brankas stok akun, margin harga, dan keuangan.
          </p>
        </div>

        {/* Security Notice */}
        <div className="mb-5 p-3 rounded-xl bg-red-950/30 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Akses Terproteksi Sandi</p>
            <p className="text-[11px] text-red-300/80 mt-0.5">
              Pembeli umum tidak dapat mengakses brankas ini tanpa memasukkan PIN keamanan Anda.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Masukkan PIN Keamanan Admin
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                maxLength={12}
                placeholder="••••"
                autoFocus
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white placeholder-neutral-600 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-neutral-300"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1.5">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
          >
            <span>Buka Brankas Manajemen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Hint for owner */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80 text-center">
          <p className="text-[11px] text-neutral-500">
            PIN Bawaan Awal: <span className="font-mono font-bold text-neutral-300">{DEFAULT_ADMIN_PIN}</span> (bisa Anda ubah kapan saja setelah masuk).
          </p>
        </div>
      </div>
    </div>
  );
};
