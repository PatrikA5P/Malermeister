import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { OfficeDocument } from '../../officeTypes';
import { Toast, ToastType, formatMoney } from '../../components/SharedUI';
import DocumentEditor from './DocumentEditor';
import ExpenseManager from '../expenses/ExpenseManager';

interface InvoiceOverviewProps {
    onBack: () => void;
    preselectedDocId?: number;
    preselectedCustomerId?: number;
}

type ListTab = 'invoices' | 'dunning' | 'expenses';

const InvoiceOverview: React.FC<InvoiceOverviewProps> = ({ onBack, preselectedDocId, preselectedCustomerId }) => {
  const [listTab, setListTab] = useState<ListTab>('invoices');
  const [docs, setDocs] = useState<OfficeDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpenseCreating, setIsExpenseCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);
  
  // Editor State
  const [selectedDoc, setSelectedDoc] = useState<OfficeDocument | null>(null);

  useEffect(() => { loadData(); }, []);

  // Deep Link Handling
  useEffect(() => {
      const handleDeepLinks = async () => {
          if (preselectedDocId && !selectedDoc) {
              const target = await db.documents.get(preselectedDocId);
              if (target) setSelectedDoc(target);
          } else if (preselectedCustomerId && !selectedDoc) {
              // Trigger creation in DocumentEditor via prop, handled below
              // For now just ensure view is invoices
              setListTab('invoices');
          }
      };
      handleDeepLinks();
  }, [preselectedDocId, preselectedCustomerId]);

  const loadData = async () => {
    setDocs(await db.documents.orderBy('id').reverse().toArray());
  };

  const createNewInvoice = () => {
      // Create skeleton document to pass to editor
      const year = new Date().getFullYear();
      const num = String(Date.now()).slice(-4);
      const newDoc: OfficeDocument = {
          docNumber: `R-${year}-${num}`,
          type: 'invoice',
          status: 'draft',
          date: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], 
          client: { name: '', street: '', zip: '', city: '' },
          items: [],
          totalNet: 0, totalTax: 0, totalGross: 0, dunningLevel: 0
      };
      setSelectedDoc(newDoc);
  };

  const handleExport = () => {
      const exportDocs = filteredDocs;
      const headers = ['Nr', 'Typ', 'Kunde', 'Datum', 'Status', 'Total Netto', 'Total Brutto'];
      const rows = exportDocs.map(d => [d.docNumber, d.type, d.client.name, d.date, d.status, d.totalNet, d.totalGross]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';'));
      const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rechnungen_Export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: 'Export heruntergeladen', type: 'success' });
  };

  // --- Filter Logic ---
  const filteredDocs = docs.filter(d => {
      const matchesSearch = d.client.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.docNumber.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      if (listTab === 'invoices') return d.type === 'invoice' && (filterStatus === 'all' || d.status === filterStatus);
      if (listTab === 'dunning') return d.type === 'invoice' && (d.status === 'overdue' || (d.dunningLevel || 0) > 0);
      
      return true;
  });

  const getNewButtonLabel = () => {
      switch(listTab) {
          case 'invoices': return 'Rechnung';
          case 'dunning': return 'Mahnlauf';
          case 'expenses': return 'Ausgabe';
      }
  };

  const TabButton = ({ id, label, icon }: { id: ListTab, label: string, icon: string }) => (
      <button onClick={() => setListTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${listTab === id ? 'border-olive-600 bg-olive-50 text-olive-700' : 'border-transparent text-zinc-400 hover:bg-zinc-50'}`}>
          <span className="text-lg">{icon}</span><span className={`font-bold uppercase text-xs ${listTab === id ? 'inline' : 'hidden md:inline'}`}>{label}</span>
      </button>
  );

  // Render Editor
  if (selectedDoc) {
      return (
          <DocumentEditor 
              initialDoc={selectedDoc}
              onBack={() => { setSelectedDoc(null); loadData(); if(preselectedDocId) onBack(); }}
              onSave={async (doc) => {
                  if (doc.id) await db.documents.update(doc.id, doc as any);
                  else await db.documents.add(doc);
                  loadData();
                  setSelectedDoc(null);
                  setToast({ msg: 'Gespeichert', type: 'success' });
              }}
          />
      );
  }

  // Preselection Logic Wrapper (for creating new from Customer ID)
  if (preselectedCustomerId && !selectedDoc && listTab === 'invoices') {
      // This is a bit tricky since we need to fetch customer data first inside the editor. 
      // Instead, we will pass the ID to DocumentEditor and let it handle creation.
      // Or cleaner: Fetch customer here and pass partial doc.
      // For simplicity, we delegate to DocumentEditor by passing the ID as prop IF we are in create mode.
      // But currently DocumentEditor takes an initialDoc.
      // We will render DocumentEditor with a specific prop or fetch here. 
      // Let's render DocumentEditor immediately if we have a preselection request
      return (
          <DocumentEditor 
              initialDoc={null as any} // Special signal or handle inside Editor?
              preselectedCustomerId={preselectedCustomerId} // Pass this prop
              onBack={() => onBack()}
              onSave={async (doc) => {
                  if (doc.id) await db.documents.update(doc.id, doc as any);
                  else await db.documents.add(doc);
                  onBack(); // Go back to main app
              }}
          />
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       <div className="sticky top-0 bg-slate-50 z-20 pt-6 pb-4 px-6 md:px-12 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/90">
         <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-4">
                 <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all shadow-sm">←</button>
                 <div>
                    <h2 className="text-2xl font-black brand-font uppercase">Rechnungen</h2>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">Finanzen</p>
                 </div>
             </div>
             <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <span className="text-3xl font-black brand-font text-zinc-900">{filteredDocs.length}</span>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-widest">Dokumente</span>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 font-bold uppercase text-[10px] hover:border-zinc-400 hover:text-black transition-all shadow-sm">
                    <span className="hidden md:inline">Export</span><span>⬇</span>
                </button>
             </div>
         </div>

         <div className="flex gap-2 overflow-x-auto mb-6 pb-2 no-scrollbar">
            <TabButton id="invoices" label="Rechnungen" icon="📄" />
            <TabButton id="dunning" label="Mahnwesen" icon="🔔" />
            <TabButton id="expenses" label="Ausgaben" icon="💸" />
         </div>

         <div className="flex gap-3">
             <div className="relative flex-1 transition-all">
               <input className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" placeholder="Suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
             </div>
             {listTab === 'invoices' && (
                 <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm ${showFilters ? 'bg-olive-50 border-olive-200 text-olive-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                    <span className="hidden md:inline">Filter</span><span>⚡</span>
                 </button>
             )}
             <button 
                onClick={() => { if(listTab === 'expenses') setIsExpenseCreating(true); else createNewInvoice(); }} 
                className="hidden md:flex bg-zinc-900 hover:bg-olive-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg whitespace-nowrap items-center gap-2"
             >
                 <span>+</span><span>{getNewButtonLabel()}</span>
             </button>
         </div>

         {showFilters && listTab === 'invoices' && (
            <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">Status Filter</label>
                <div className="flex flex-wrap gap-2">
                    {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${filterStatus === s ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300'}`}>
                            {s === 'all' ? 'Alle' : s}
                        </button>
                    ))}
                    <button onClick={() => setFilterStatus('credit')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border bg-zinc-50 text-zinc-300 border-zinc-100 cursor-not-allowed`} title="Demnächst verfügbar">Gutschriften</button>
                </div>
            </div>
         )}
       </div>

       <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-24 pt-4">
           {listTab === 'expenses' ? (
               <ExpenseManager isCreating={isExpenseCreating} onCloseCreate={() => setIsExpenseCreating(false)} searchTerm={searchTerm} />
           ) : (
               <div className="space-y-3">
                   {filteredDocs.map(d => (
                       <div key={d.id} onClick={() => setSelectedDoc(d)} className={`relative p-4 rounded-xl border bg-white shadow-sm transition-all cursor-pointer hover:border-olive-400 active:scale-[0.98] group ${d.status === 'overdue' ? 'border-red-200 bg-red-50/10' : 'border-zinc-200'}`}>
                           <div className="flex justify-between items-start mb-1">
                               <h4 className="font-bold text-base truncate pr-2 text-zinc-900">{d.client.name}</h4>
                               <p className="font-bold text-base whitespace-nowrap text-zinc-900">CHF {formatMoney(d.totalGross)}</p>
                           </div>
                           <p className="text-xs text-zinc-500 font-medium mb-3 truncate">{d.docNumber} • {d.items.length} Pos.</p>
                           <div className="flex justify-between items-end">
                               <div className="flex items-center gap-2 text-[11px]">
                                   <span className="font-bold text-zinc-800 tracking-wider">{d.date}</span>
                                   {d.type === 'invoice' && <span className="text-[9px] bg-olive-50 text-olive-600 px-1 rounded font-bold border border-olive-100">RECHNUNG</span>}
                               </div>
                               <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${d.status === 'paid' ? 'bg-green-100 text-green-700' : d.status === 'sent' ? 'bg-blue-100 text-blue-700' : d.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}>
                                   {d.status}
                               </span>
                           </div>
                       </div>
                   ))}
                   {filteredDocs.length === 0 && <div className="text-center text-zinc-400 py-10">Keine Rechnungen gefunden.</div>}
               </div>
           )}
       </div>

       <button onClick={() => { 
           if(listTab === 'expenses') setIsExpenseCreating(true); 
           else createNewInvoice(); 
       }} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90">
           <span className="text-2xl">+</span>
       </button>
    </div>
  );
};

export default InvoiceOverview;