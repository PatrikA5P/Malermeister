
import React, { useState } from 'react';
import PurchaseOrderList from './orders/PurchaseOrderList';
import SupplierInvoiceList from './invoices/SupplierInvoiceList';
import SupplierCreditList from './credits/SupplierCreditList';
import GeneralExpenses from './expenses/GeneralExpenses';
import EmployeeExpenses from './expenses/EmployeeExpenses';

type PurchasingTab = 'orders' | 'invoices' | 'credits' | 'expenses' | 'spesen';

const PurchasingManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<PurchasingTab>('orders');

  const NavButton = ({ id, label, icon }: { id: PurchasingTab, label: string, icon: string }) => (
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
                    <h2 className="text-2xl font-black brand-font uppercase">Einkauf</h2>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">Beschaffung & Ausgaben</p>
                 </div>
             </div>
             
             <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                 <NavButton id="orders" label="Bestellungen" icon="📦" />
                 <NavButton id="invoices" label="Lieferantenrechn." icon="📑" />
                 <NavButton id="credits" label="Gutschriften" icon="↩️" />
                 <NavButton id="expenses" label="Aufwendungen" icon="💸" />
                 <NavButton id="spesen" label="Spesen" icon="☕" />
             </div>
           </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-hidden">
           {currentView === 'orders' && <PurchaseOrderList />}
           {currentView === 'invoices' && <SupplierInvoiceList />}
           {currentView === 'credits' && <SupplierCreditList />}
           {currentView === 'expenses' && <GeneralExpenses />}
           {currentView === 'spesen' && <EmployeeExpenses />}
       </div>
    </div>
  );
};

export default PurchasingManager;
