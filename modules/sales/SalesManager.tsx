
import React, { useState, useEffect } from 'react';
import QuotesOverview from './quotes/QuotesOverview';
import ProjectOverview from './orders/ProjectOverview';
import InvoiceOverview from './invoices/InvoiceOverview';

export type SalesTab = 'quotes' | 'orders' | 'invoices' | 'dunning';

interface SalesManagerProps {
    onBack: () => void;
    initialTab?: SalesTab;
    preselectedDocId?: number;
    preselectedCustomerId?: number;
}

const SalesManager: React.FC<SalesManagerProps> = ({ onBack, initialTab = 'quotes', preselectedDocId, preselectedCustomerId }) => {
  const [currentView, setCurrentView] = useState<SalesTab>(initialTab);

  // Sync internal state if prop changes (e.g. external navigation)
  useEffect(() => {
      if(initialTab) setCurrentView(initialTab);
  }, [initialTab]);

  const NavButton = ({ id, label, icon }: { id: SalesTab, label: string, icon: string }) => (
      <button 
        onClick={() => setCurrentView(id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${currentView === id ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
      >
          <span className="text-lg">{icon}</span>
          <span className="hidden md:inline">{label}</span>
      </button>
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
             
             <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                 <NavButton id="quotes" label="Offerten" icon="📋" />
                 <NavButton id="orders" label="Aufträge" icon="🏗️" />
                 <NavButton id="invoices" label="Rechnungen" icon="📄" />
                 <NavButton id="dunning" label="Mahnlauf" icon="🔔" /> 
             </div>
           </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-hidden">
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
