
import React, { useState, useEffect } from 'react';
import QuotesOverview from './quotes/QuotesOverview';
import ProjectOverview from './orders/ProjectOverview';
import InvoiceOverview from './invoices/InvoiceOverview';

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

  // Sync internal state if prop changes (e.g. external navigation)
  useEffect(() => {
      if (initialTab) {
          setCurrentView(initialTab);
      }
  }, [initialTab]);

  const SalesSwitcher = () => (
      <label className="relative inline-flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
          <span className="hidden md:inline">Bereich</span>
          <div className="relative">
              <select
                  value={currentView === 'home' ? '' : currentView}
                  onChange={(event) => setCurrentView(event.target.value as SalesTab)}
                  className="appearance-none bg-white border border-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-widest px-4 py-2 pr-9 rounded-xl shadow-sm focus:outline-none focus:border-zinc-400"
              >
                  <option value="" disabled>
                      Bereich wählen
                  </option>
                  <option value="quotes">Offerten</option>
                  <option value="orders">Aufträge</option>
                  <option value="invoices">Rechnungen</option>
                  <option value="dunning">Mahnlauf</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">⌄</span>
          </div>
      </label>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
       {/* Header */}
       <div className="sticky top-0 bg-slate-50 z-30 pt-6 pb-4 px-6 md:px-12 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/90">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
             <div className="flex items-center gap-4 w-full md:w-auto">
                 <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all shadow-sm">←</button>
                 <div>
                    <h2 className="text-2xl font-black brand-font uppercase">Verkauf</h2>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">Sales Management</p>
                 </div>
             </div>
             
             {currentView !== 'home' && (
                 <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                     <SalesSwitcher />
                 </div>
             )}
           </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-hidden">
           {currentView === 'home' && (
               <div className="p-6 md:p-12">
                   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                       <button
                           onClick={() => setCurrentView('quotes')}
                           className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group"
                       >
                           <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">📋</span>
                           <h3 className="font-bold text-sm text-zinc-900">Offerten</h3>
                           <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Angebote & Entwürfe</p>
                       </button>

                       <button
                           onClick={() => setCurrentView('orders')}
                           className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group"
                       >
                           <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">🏗️</span>
                           <h3 className="font-bold text-sm text-zinc-900">Aufträge</h3>
                           <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Projekte & Planung</p>
                       </button>

                       <button
                           onClick={() => setCurrentView('invoices')}
                           className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group"
                       >
                           <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">📄</span>
                           <h3 className="font-bold text-sm text-zinc-900">Rechnungen</h3>
                           <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Faktura & Zahlung</p>
                       </button>

                       <button
                           onClick={() => setCurrentView('dunning')}
                           className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group"
                       >
                           <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">🔔</span>
                           <h3 className="font-bold text-sm text-zinc-900">Mahnlauf</h3>
                           <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Offene Forderungen</p>
                       </button>
                   </div>
               </div>
           )}

           {currentView === 'quotes' && (
               <QuotesOverview 
                   onBack={onBack} 
                   preselectedCustomerId={preselectedCustomerId}
               />
           )}

           {currentView === 'orders' && (
               <ProjectOverview onBack={onBack} />
           )}

           {currentView === 'invoices' && (
               <InvoiceOverview 
                   onBack={onBack} 
                   preselectedDocId={preselectedDocId}
                   preselectedCustomerId={preselectedCustomerId}
               />
           )}
           
           {currentView === 'dunning' && (
               // InvoiceOverview handles dunning logic internally if we don't pass specific props, 
               // but ideally we would tell it to start in dunning mode. 
               // For now, reuse overview.
               <InvoiceOverview onBack={onBack} /> 
           )}
       </div>
    </div>
  );
};

export default SalesManager;
