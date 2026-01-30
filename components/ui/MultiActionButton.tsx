
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface MultiActionItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger'; 
}

interface MultiActionButtonProps {
    mainLabel?: string; 
    mainIcon?: React.ReactNode; 
    actions: MultiActionItem[];
}

export const MultiActionButton: React.FC<MultiActionButtonProps> = ({ 
    mainLabel = "Aktionen", 
    mainIcon = '+', 
    actions 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        
        const handleClick = (e: MouseEvent) => {
            // Only close if the click is NOT on the main button
            // If it IS on the main button, the onClick handler of the button will handle the toggle
            if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        setIsOpen(false);
        action();
    };

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const ActionsPortal = () => {
        if (!isOpen || typeof document === 'undefined') return null;

        return createPortal(
            <div 
                className="fixed bottom-24 right-6 flex flex-col items-end gap-3 z-[9999] pointer-events-auto"
            >
                {actions.map((action, idx) => (
                    <button
                        key={idx}
                        onMouseDown={(e) => handleAction(e, action.onClick)}
                        style={{ 
                            transitionDelay: `${(actions.length - 1 - idx) * 30}ms` 
                        }}
                        className={`
                            group flex items-center gap-3 pl-5 pr-2 py-2 rounded-full shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in
                            hover:scale-105 active:scale-95
                            ${action.variant === 'danger' 
                                ? 'bg-red-50/95 border-red-100 text-red-600 hover:bg-red-100' 
                                : 'bg-white/95 border-zinc-100 text-zinc-700 hover:bg-zinc-50 hover:text-black'}
                        `}
                    >
                        <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm">{action.label}</span>
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner
                            ${action.variant === 'danger' ? 'bg-white text-red-500' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-800 group-hover:text-white transition-colors'}
                        `}>
                            {action.icon}
                        </div>
                    </button>
                ))}
            </div>,
            document.body
        );
    };

    return (
        <>
            <ActionsPortal />
            {/* Main FAB - Fixed Position */}
            <button 
                ref={buttonRef}
                onClick={toggle}
                className={`
                    fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light text-white transition-all duration-300 z-[100] border-4 border-white/20
                    ${isOpen 
                        ? 'bg-zinc-800 rotate-45 scale-90' 
                        : 'bg-zinc-900 hover:bg-white hover:text-zinc-900 hover:border-zinc-200 hover:scale-105 active:scale-95'
                    }
                `}
                aria-label={mainLabel}
            >
                {mainIcon}
            </button>
        </>
    );
};
