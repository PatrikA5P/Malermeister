
import React, { useEffect } from 'react';

// --- TOAST ---
export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);

    // Soft colors as requested: Green, Orange (Info), Red
    const styles = {
        success: "bg-emerald-50 border-emerald-200 text-emerald-800",
        error: "bg-rose-50 border-rose-200 text-rose-800",
        info: "bg-amber-50 border-amber-200 text-amber-800"
    };

    const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';

    return (
        <div 
            className={`
                fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] 
                px-6 py-3 rounded-xl shadow-xl border flex items-center gap-3 w-fit 
                animate-in slide-in-from-bottom-5 fade-in duration-300 cursor-pointer 
                ${styles[type]}
            `} 
            onClick={onClose}
        >
            <span className="text-lg font-bold">{icon}</span>
            <span className="font-bold text-xs uppercase tracking-widest">{message}</span>
        </div>
    );
};

// --- CONFIRM MODAL ---
interface ConfirmModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmLabel = "Löschen", 
    cancelLabel = "Abbrechen",
    isDestructive = false 
}) => {
    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-zinc-100 animate-in zoom-in-95">
                <h3 className="font-black uppercase text-lg">{title}</h3>
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">{message}</p>
                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl border border-zinc-200 font-bold uppercase text-xs hover:bg-zinc-50 text-zinc-600 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`
                            flex-1 py-3 rounded-xl font-bold uppercase text-xs shadow-lg text-white transition-colors
                            ${isDestructive
                                ? 'bg-rose-600 hover:bg-rose-700'  
                                : 'bg-zinc-900 hover:bg-black'
                            }
                        `}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
