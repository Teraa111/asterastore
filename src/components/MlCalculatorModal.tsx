import React, { useState } from 'react';
import { X, Calculator, ArrowRight } from 'lucide-react';
import { formatNumber } from '../utils/currency';

interface MlCalculatorModalProps {
  onClose: () => void;
  onGoToTopUp: () => void;
}

export const MlCalculatorModal: React.FC<MlCalculatorModalProps> = ({
  onClose,
  onGoToTopUp,
}) => {
  const [activeTab, setActiveTab] = useState<'winrate' | 'magicwheel'>('winrate');

  // Winrate state
  const [totalMatches, setTotalMatches] = useState<number>(1200);
  const [currentWr, setCurrentWr] = useState<number>(55.4);
  const [targetWr, setTargetWr] = useState<number>(60.0);

  // Magic wheel state
  const [currentPoints, setCurrentPoints] = useState<number>(140);

  const calculateNeededWins = (): number => {
    if (targetWr <= currentWr) return 0;
    if (targetWr >= 100) return -1;
    const currentWins = totalMatches * (currentWr / 100);
    const needed = (targetWr / 100 * totalMatches - currentWins) / (1 - targetWr / 100);
    return Math.ceil(needed);
  };

  const neededWins = calculateNeededWins();

  const remainingPoints = Math.max(0, 200 - currentPoints);
  const estimatedDraws5 = Math.ceil(remainingPoints / 5);
  const estimatedDiamonds = estimatedDraws5 * 270;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-auto animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-neutral-800">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Kalkulator MLBB Gamers - K&F STORE</h3>
            <p className="text-xs text-neutral-400">Hitung target Win Rate & Magic Wheel akurat</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-6">
          <button
            onClick={() => setActiveTab('winrate')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'winrate' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Kalkulator Win Rate
          </button>
          <button
            onClick={() => setActiveTab('magicwheel')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'magicwheel' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Kalkulator Magic Wheel
          </button>
        </div>

        {activeTab === 'winrate' ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">
                Total Pertandingan Saat Ini
              </label>
              <input
                type="number"
                min={1}
                value={totalMatches}
                onChange={(e) => setTotalMatches(Math.max(1, Number(e.target.value)))}
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Win Rate Saat Ini (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={99.9}
                  value={currentWr}
                  onChange={(e) => setCurrentWr(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Target Win Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={99.9}
                  value={targetWr}
                  onChange={(e) => setTargetWr(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono font-bold text-blue-400"
                />
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-600/10 to-red-600/10 border border-blue-500/30 text-center">
              <span className="text-[11px] text-neutral-400 block mb-1">Hasil Perhitungan:</span>
              {neededWins < 0 ? (
                <p className="text-red-400 font-bold">Target Win Rate tidak mungkin tercapai.</p>
              ) : neededWins === 0 ? (
                <p className="text-emerald-400 font-bold">Win Rate Anda saat ini sudah mencapai atau melebihi target!</p>
              ) : (
                <div>
                  <p className="text-neutral-200">
                    Kamu butuh sekitar{' '}
                    <strong className="text-2xl font-extrabold text-blue-400 font-mono tabular-nums block my-1">
                      {formatNumber(neededWins)} Win Streak
                    </strong>
                    kemenangan tanpa kalah untuk mencapai Win Rate <strong>{targetWr}%</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">
                Magic Points Saat Ini (0 - 200)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={currentPoints}
                onChange={(e) => setCurrentPoints(Math.min(200, Math.max(0, Number(e.target.value))))}
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-sm"
              />
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Sisa Poin untuk Magic Crystal:</span>
                <span className="font-mono font-bold text-white">{remainingPoints} Poin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Estimasi Total Diamond Dibutuhkan:</span>
                <span className="font-mono font-bold text-blue-400 text-sm">{formatNumber(estimatedDiamonds)} Diamonds</span>
              </div>
              <p className="text-[10px] text-neutral-400 pt-2 border-t border-neutral-800">
                *Dihitung berdasarkan spin 5x (270 Diamond). Rekomendasi: Beli Weekly Diamond Pass di K&F STORE untuk hemat hingga 60%.
              </p>
            </div>

            <button
              onClick={() => {
                onClose();
                onGoToTopUp();
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
            >
              <span>Top Up Diamond MLBB di K&F STORE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
