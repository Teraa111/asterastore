import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, X, ArrowRight, Database, KeyRound, Mail } from 'lucide-react';
import { verifyAdminPin, DEFAULT_ADMIN_PIN } from '../utils/storage';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

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
  const [authMethod, setAuthMethod] = useState<'pin' | 'supabase'>('pin');

  // PIN state
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Supabase Auth state
  const [sbEmail, setSbEmail] = useState('');
  const [sbPassword, setSbPassword] = useState('');
  const [showSbPassword, setShowSbPassword] = useState(false);
  const [sbError, setSbError] = useState('');
  const [isSubmittingSb, setIsSubmittingSb] = useState(false);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setPinError('Silakan masukkan PIN keamanan.');
      return;
    }

    if (verifyAdminPin(pin)) {
      setPinError('');
      setPin('');
      onAuthenticated();
    } else {
      setPinError('PIN keamanan salah! Akses ke manajemen stok ditolak.');
    }
  };

  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbError('');

    if (!sbEmail.trim() || !sbPassword.trim()) {
      setSbError('Email dan password Supabase wajib diisi.');
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      setSbError('Supabase belum terkonfigurasi. Silakan masuk menggunakan PIN keamanan atau atur kredensial Supabase.');
      return;
    }

    setIsSubmittingSb(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sbEmail.trim(),
        password: sbPassword,
      });

      if (error) {
        setSbError(`Gagal autentikasi Supabase: ${error.message}`);
        setIsSubmittingSb(false);
        return;
      }

      if (data.user) {
        setSbError('');
        onAuthenticated();
      }
    } catch (err: any) {
      setSbError(err?.message || 'Terjadi kesalahan saat menghubungi Supabase Auth.');
    } finally {
      setIsSubmittingSb(false);
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
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 mb-3 border border-red-400/20">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Verifikasi Pemilik ASTERA STORE
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Area khusus pemilik toko untuk mengelola brankas stok akun dan transaksi.
          </p>
        </div>

        {/* Auth Method Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setAuthMethod('pin')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'pin'
                ? 'bg-red-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN Keamanan</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('supabase')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'supabase'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Auth</span>
          </button>
        </div>

        {authMethod === 'pin' ? (
          /* PIN Method Form */
          <>
            <div className="mb-4 p-3 rounded-xl bg-red-950/30 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200">Akses Terproteksi Sandi</p>
                <p className="text-[11px] text-red-300/80 mt-0.5">
                  Pembeli umum tidak dapat mengakses brankas ini tanpa PIN otorisasi Anda.
                </p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
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
                      setPinError('');
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
                {pinError && (
                  <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1.5">
                    <span>⚠️</span> {pinError}
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

            <div className="mt-4 pt-3 border-t border-neutral-800/80 text-center">
              <p className="text-[11px] text-neutral-500">
                PIN Bawaan Awal: <span className="font-mono font-bold text-neutral-300">{DEFAULT_ADMIN_PIN}</span> (dapat diubah di dalam brankas).
              </p>
            </div>
          </>
        ) : (
          /* Supabase Cloud Auth Form */
          <>
            <div className="mb-4 p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-start gap-2.5 text-xs text-blue-300">
              <Database className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-200">Supabase Cloud Authentication</p>
                <p className="text-[11px] text-blue-300/80 mt-0.5">
                  Masuk dengan akun admin Supabase yang terdaftar di proyek Anda.
                </p>
              </div>
            </div>

            <form onSubmit={handleSupabaseSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Email Admin Supabase
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    value={sbEmail}
                    onChange={(e) => {
                      setSbEmail(e.target.value);
                      setSbError('');
                    }}
                    placeholder="admin@asterastore.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-neutral-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showSbPassword ? 'text' : 'password'}
                    value={sbPassword}
                    onChange={(e) => {
                      setSbPassword(e.target.value);
                      setSbError('');
                    }}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-neutral-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSbPassword(!showSbPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-300"
                  >
                    {showSbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {sbError && (
                <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1.5">
                  <span>⚠️</span> {sbError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmittingSb}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2"
              >
                <span>{isSubmittingSb ? 'Memverifikasi Akun...' : 'Masuk via Supabase'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-neutral-800/80 text-center">
              <p className="text-[11px] text-neutral-500">
                Belum membuat user di Supabase? Anda tetap dapat masuk menggunakan tab <button type="button" onClick={() => setAuthMethod('pin')} className="text-red-400 font-bold underline">PIN Keamanan</button>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
