
import React from 'react';

export type MobileNavView = 'dashboard' | 'sales-root' | 'purchasing-root' | 'accounting-root' | 'crm';

interface NavigationbarProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

const NAV_ITEMS: { id: string, targetView: MobileNavView, label: string, icon: React.ReactNode }[] = [
    { 
        id: 'home', 
        targetView: 'dashboard', 
        label: 'Home', 
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    },
    { 
        id: 'sales', 
        targetView: 'sales-root', 
        label: 'Verkauf', 
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
    },
    { 
        id: 'purchasing', 
        targetView: 'purchasing-root', 
        label: 'Einkauf', 
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },
    { 
        id: 'accounting', 
        targetView: 'accounting-root', 
        label: 'Finanzen', 
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    },
    { 
        id: 'crm', 
        targetView: 'crm', 
        label: 'Kontakte', 
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    }
];

export const Navigationbar: React.FC<NavigationbarProps> = ({ currentView, onNavigate }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 pb-safe md:hidden z-50">
            <div className="flex justify-around items-center h-16">
                {NAV_ITEMS.map((item) => {
                    // Logic to highlight parent items. 
                    // E.g. if we are in 'quotes' (Sales), 'sales-root' should be active.
                    // This mapping depends on how OfficeApp routes are named.
                    let isActive = false;
                    
                    if (item.targetView === 'dashboard' && (currentView === 'dashboard' || currentView === 'settings')) isActive = true;
                    else if (item.targetView === 'sales-root' && (currentView === 'sales' || currentView === 'sales-root' || currentView === 'projects')) isActive = true;
                    else if (item.targetView === 'purchasing-root' && (currentView === 'purchasing' || currentView === 'purchasing-root')) isActive = true;
                    else if (item.targetView === 'accounting-root' && (currentView === 'accounting' || currentView === 'accounting-root' || currentView === 'bank')) isActive = true;
                    else if (item.targetView === 'crm' && currentView === 'crm') isActive = true;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.targetView)}
                            className={`flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 ${
                                isActive ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                            }`}
                        >
                            <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-zinc-100' : ''}`}>
                                {item.icon}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wide mt-1 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
