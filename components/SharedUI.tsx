
import React, { useEffect } from 'react';
import {
  formatMoney as formatMoneyService,
  roundToCurrency,
  CURRENCY_CONFIGS
} from '../services/calculationService';

// --- Types ---
export type ToastType = 'success' | 'error' | 'info';

// --- Components ---

export const Toast = ({
  message,
  type,
  onClose
}: {
  message: string;
  type: ToastType;
  onClose: () => void;
}) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 cursor-pointer ${
        type === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'
      }`}
      onClick={onClose}
    >
      <span className="text-lg">{type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</span>
      <span className="font-bold text-xs uppercase tracking-widest">{message}</span>
    </div>
  );
};

export const ConfirmModal = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  isDestructive = false
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}) => (
  <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
      <h3 className="font-black uppercase text-lg">{title}</h3>
      <p className="text-sm text-zinc-600 font-medium leading-relaxed">{message}</p>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-zinc-200 font-bold uppercase text-xs hover:bg-zinc-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs shadow-lg ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-zinc-900 hover:bg-black text-white'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// --- Formatters ---

/**
 * Formatiert einen Geldbetrag mit korrekter Währungsrundung
 * CHF: Rappenrundung auf 0.05
 * EUR/USD: Cent-genau auf 0.01
 */
export const formatMoney = (v: number, currency: string = 'CHF', showSymbol: boolean = true): string => {
  return formatMoneyService(v, currency, showSymbol);
};

/**
 * Rundet einen Betrag gemäss Währungsregeln (für Berechnungen)
 */
export { roundToCurrency };

export const formatDate = (d: string) => {
    if(!d) return '—';
    return new Date(d).toLocaleDateString('de-CH');
};
