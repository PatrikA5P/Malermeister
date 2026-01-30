
import React, { useState, useEffect } from 'react';
import QuotesOverview from './quotes/QuotesOverview';
import InvoiceOverview from './invoices/InvoiceOverview';
import ProjectManager from '../projects/ProjectManager'; // Consolidated

export type SalesTab = 'quotes' | 'orders' | 'invoices' | 'dunning';
type SalesView = 'home' | SalesTab;

interface SalesManagerProps {
    onBack: () => void;
    initialTab?: SalesTab;
    preselectedDocId?: number;
    preselectedCustomerId?: number;
}

const SalesManager: React.FC<SalesManagerProps> = ({ onBack, initialTab, preselectedDocId, preselectedCustomerId }) => {
  const [currentView, setCurrentView] = useState<SalesView>(initialTab ?? 'home');

  useEffect(() => {
      if (initialTab) setCurrentView(initialTab);
  }, [initialTab]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
       {/* Simple Header for Sales Context */}
       {currentView !== 'home' && (
           // Note: Headers are usually inside the specific modules (QuotesOverview etc), 
           // so we might not need a global header here if those modules provide it.
           // However, if we want a tab switcher ALWAYS visible, we render it here.
           // For clean design, let's let the sub-modules handle their headers, or provide a slim nav here.
           // We will rely on the sub-modules to render their full headers.
           <></>
       )}

       <div className="flex-1 overflow-hidden h-full">
           {currentView === 'home' && (
               <div className="p-6 md:p-12">
                   <div className="flex items-center gap-4 mb-8">
                       <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all">←</button>
                       <h2 className="text-2xl font-black brand-font uppercase">Verkauf</h2>
                   </div>
                   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                       <button onClick={() => setCurrentView('quotes')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                           <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform">📋</span>
                           <h3 className="font-bold text-sm text-zinc-900">Offerten</h3>
                           <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Angebote & Entwürfe</p>
                       </button>
                       <button onClick={() => setCurrentView('orders')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                           <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform">🏗️</span>
                           <h3 className="font-bold text-sm text-zinc-900">Aufträge</h3>
                           <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Projekte & Planung</p>
                       </button>
                       <button onClick={() => setCurrentView('invoices')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                           <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform">📄</span>
                           <h3 className="font-bold text-sm text-zinc-900">Rechnungen</h3>
                           <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Faktura & Zahlung</p>
                       </button>
                   </div>
               </div>
           )}

           {currentView === 'quotes' && (
               <QuotesOverview onBack={() => setCurrentView('home')} preselectedCustomerId={preselectedCustomerId} />
           )}

           {currentView === 'orders' && (
               <ProjectManager onBack={() => setCurrentView('home')} />
           )}

           {currentView === 'invoices' && (
               <InvoiceOverview onBack={() => setCurrentView('home')} preselectedDocId={preselectedDocId} preselectedCustomerId={preselectedCustomerId} />
           )}
           
           {currentView === 'dunning' && (
               <InvoiceOverview onBack={() => setCurrentView('home')} /> 
           )}
       </div>
    </div>
  );
};

export default SalesManager;
