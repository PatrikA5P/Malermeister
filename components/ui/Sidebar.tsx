
import React from 'react';

export type NavGroup = {
    title: string;
    rootView?: string; // Target view when clicking the title
    items: {
        id: string;
        label: string;
        icon: string;
        view: string;
        params?: any;
    }[];
};

interface SidebarProps {
    currentView: string;
    currentParams?: any; // New prop to check specific tabs
    onNavigate: (view: string, params?: any) => void;
    className?: string;
}

export const SIDEBAR_CONFIG: NavGroup[] = [
    {
        title: 'Übersicht',
        rootView: 'dashboard',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: '🏠', view: 'dashboard' },
            { id: 'tasks', label: 'Aufgaben', icon: '✅', view: 'tasks' },
        ]
    },
    {
        title: 'Verkauf',
        rootView: 'sales-root',
        items: [
            { id: 'projects', label: 'Aufträge', icon: '🏗️', view: 'projects' },
            { id: 'quotes', label: 'Offerten', icon: '📋', view: 'sales', params: { initialTab: 'quotes' } },
            { id: 'invoices', label: 'Rechnungen', icon: '📄', view: 'sales', params: { initialTab: 'invoices' } },
            { id: 'dunning', label: 'Mahnwesen', icon: '🔔', view: 'sales', params: { initialTab: 'dunning' } },
        ]
    },
    {
        title: 'Einkauf',
        rootView: 'purchasing-root',
        items: [
            { id: 'orders', label: 'Bestellungen', icon: '📦', view: 'purchasing', params: { initialTab: 'orders' } },
            { id: 'supplier-inv', label: 'Lieferantenrch.', icon: '📑', view: 'purchasing', params: { initialTab: 'invoices' } },
            { id: 'expenses', label: 'Ausgaben', icon: '💸', view: 'purchasing', params: { initialTab: 'expenses' } },
            { id: 'spesen', label: 'Spesen', icon: '☕', view: 'purchasing', params: { initialTab: 'spesen' } },
        ]
    },
    {
        title: 'Finanzen',
        rootView: 'accounting-root',
        items: [
            { id: 'journal', label: 'Journal', icon: '📒', view: 'accounting', params: { initialTab: 'journal' } },
            { id: 'balance', label: 'Bilanz', icon: '⚖️', view: 'accounting', params: { initialTab: 'balance' } },
            { id: 'income', label: 'Erfolgsrechn.', icon: '📈', view: 'accounting', params: { initialTab: 'income' } },
            { id: 'bank', label: 'Bank', icon: '🏦', view: 'bank' },
        ]
    },
    {
        title: 'Stammdaten',
        items: [
            { id: 'crm', label: 'Kontakte', icon: '👥', view: 'crm' },
            { id: 'products', label: 'Produkte', icon: '📦', view: 'products' },
            { id: 'settings', label: 'Einstellungen', icon: '⚙️', view: 'settings' },
        ]
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, currentParams, onNavigate, className = '' }) => {
    return (
        <aside className={`w-60 bg-white border-r border-zinc-200 flex-col hidden md:flex h-screen sticky top-0 overflow-y-auto ${className}`}>
            {/* Logo Area */}
            <div className="px-5 py-5 border-b border-zinc-100 flex items-center gap-3 shrink-0">
                <div className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center text-white font-black brand-font text-sm">B</div>
                <div>
                    <h1 className="font-black uppercase tracking-widest text-xs text-zinc-900 leading-none">Büro</h1>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Maler Borer</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 px-3 space-y-6">
                {SIDEBAR_CONFIG.map((group, idx) => {
                    // Check if entire group is the active Root View (e.g. clicked on "Einkauf")
                    const isGroupRootActive = group.rootView === currentView;
                    
                    // Check if we are inside this module but on a specific item
                    // (Matches if current view starts with the group root view string, simple heuristic)
                    const isGroupContextActive = group.rootView && currentView.includes(group.rootView.split('-')[0]);

                    return (
                        <div key={idx} className={`rounded-xl transition-all duration-300 ${isGroupRootActive ? 'bg-zinc-100 shadow-sm' : ''}`}>
                            {/* Group Title - Active only if explicitly on the Root View */}
                            <button 
                                onClick={() => group.rootView && onNavigate(group.rootView)}
                                disabled={!group.rootView}
                                className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest mb-1 transition-all rounded-lg ${
                                    isGroupRootActive 
                                        ? 'text-zinc-900' // Dark text on gray bg
                                        : 'text-zinc-400 hover:text-zinc-600'
                                } ${!group.rootView ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                {group.title}
                            </button>
                            
                            <div className="space-y-0.5 px-1 pb-2">
                                {group.items.map((item) => {
                                    // Precise Active Check:
                                    // 1. View must match
                                    // 2. If item has params (like initialTab), they must match the current params
                                    let isActive = currentView === item.view;
                                    
                                    if (isActive && item.params && item.params.initialTab) {
                                        isActive = currentParams?.initialTab === item.params.initialTab;
                                    }

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => onNavigate(item.view, item.params)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                isActive 
                                                    ? 'bg-zinc-200 text-zinc-900 shadow-sm' // Gray background instead of Black
                                                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-black hover:shadow-sm'
                                            }`}
                                        >
                                            <span className="text-base leading-none">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / User */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-olive-100 border border-olive-200 flex items-center justify-center text-olive-700 font-bold text-[10px]">
                        TB
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-zinc-900 truncate">Toni Borer</p>
                        <p className="text-[8px] text-zinc-400 uppercase truncate">Administrator</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
