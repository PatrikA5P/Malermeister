
import React from 'react';

// --- MODULE HEADER ---
interface ModuleHeaderProps {
    title: string;
    subtitle?: string;
    onBack: () => void;
    stats?: { value: string | number; label: string }[];
    actions?: React.ReactNode; // e.g. Export buttons
    children?: React.ReactNode; // e.g. Tabs
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, subtitle, onBack, stats, actions, children }) => {
    return (
        <div className="sticky top-0 bg-slate-50 z-30 pt-6 pb-4 px-6 md:px-12 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/90">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all shadow-sm">←</button>
                    <div>
                        <h2 className="text-2xl font-black brand-font uppercase">{title}</h2>
                        {subtitle && <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">{subtitle}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {stats && stats.map((stat, idx) => (
                        <div key={idx} className="text-right hidden md:block">
                            <span className="text-3xl font-black brand-font text-zinc-900">{stat.value}</span>
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-widest">{stat.label}</span>
                        </div>
                    ))}
                    {actions}
                </div>
            </div>
            {children}
        </div>
    );
};

// --- SEARCH TOOLBAR ---
interface SearchToolbarProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    placeholder?: string;
    onFilterClick?: () => void;
    isFilterActive?: boolean;
    onNewClick?: () => void;
    newLabel?: string;
    children?: React.ReactNode; // Extra slots (e.g. for Tabs if placed here)
}

export const SearchToolbar: React.FC<SearchToolbarProps> = ({ 
    searchTerm, 
    onSearchChange, 
    placeholder = "Suchen...", 
    onFilterClick, 
    isFilterActive,
    onNewClick, 
    newLabel = "Neu",
    children 
}) => {
    return (
        <div className="flex gap-3 items-center">
            <div className="relative flex-1 transition-all">
                <input 
                    className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" 
                    placeholder={placeholder} 
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                />
                <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
            </div>
            
            {/* Slot for extra buttons/tabs passed from parent */}
            {children}

            {onFilterClick && (
                <button 
                    onClick={onFilterClick} 
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm ${isFilterActive ? 'bg-olive-50 border-olive-200 text-olive-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
                >
                    <span className="hidden md:inline">Filter</span>
                    <span>⚡</span>
                </button>
            )}
            
            {onNewClick && (
                <button 
                    onClick={onNewClick} 
                    className="hidden md:flex bg-zinc-900 hover:bg-olive-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg whitespace-nowrap items-center gap-2"
                >
                    <span>+</span><span>{newLabel}</span>
                </button>
            )}
            
            {/* Mobile FAB Placeholder (Parent should implement actual fixed FAB if needed, or this component can handle it conditionally) */}
        </div>
    );
};
