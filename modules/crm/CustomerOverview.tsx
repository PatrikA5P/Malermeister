
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer } from '../../officeTypes';
import { Toast, ToastType } from '../../components/SharedUI';
import CustomerEditor from './CustomerEditor';
import { ModuleHeader, SearchToolbar } from '../../components/ui/Layouts';

interface CustomerOverviewProps {
    onBack: () => void;
    onSelect?: (customer: Customer) => void;
    initialEditMode?: boolean;
    editId?: number;
}

const CustomerOverview: React.FC<CustomerOverviewProps> = ({ onBack, onSelect, initialEditMode = false, editId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Edit Mode State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => { loadCustomers(); }, []);

  useEffect(() => {
      const init = async () => {
          if (editId) {
              const all = await db.customers.toArray();
              const target = all.find(c => c.id === editId);
              if (target) setEditingCustomer(target);
          } else if (initialEditMode && !editingCustomer) {
              const all = await db.customers.toArray();
              setCustomers(all);
              createNew(all);
          }
      };
      init();
  }, [initialEditMode, editId]);

  const loadCustomers = async () => {
    setCustomers(await db.customers.toArray());
  };

  const createNew = (currentList = customers) => {
    const maxNr = currentList.reduce((max, c) => {
        const num = parseInt(c.contactNr || '0', 10);
        return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const nextNr = String(maxNr + 1).padStart(4, '0');

    setEditingCustomer({
      type: 'private',
      contactNr: nextNr,
      firstName: '',
      lastName: '',
      salutation: 'Herr',
      formOfAddress: 'Sie',
      address: { name: '', street: '', zip: '', city: '', country: 'Schweiz' },
      defaultDiscount: 0,
      language: 'Deutsch',
      correspondenceType: 'email'
    });
  };

  const handleSave = async (customer: Customer) => {
    let savedId;
    if (customer.id) {
      await db.customers.update(customer.id, customer);
      savedId = customer.id;
    } else {
      savedId = await db.customers.add(customer);
    }
    
    if (onSelect) {
        onSelect({ ...customer, id: savedId as number });
    } else {
        setEditingCustomer(null);
        loadCustomers();
        setToast({ msg: 'Kontakt gespeichert', type: 'success' });
    }
  };

  const handleExport = () => {
      const headers = ['Nr', 'Typ', 'Firma', 'Vorname', 'Nachname', 'Strasse', 'PLZ', 'Ort', 'Email', 'Telefon'];
      const rows = customers.map(c => [
          c.contactNr, c.type, c.companyName, c.firstName, c.lastName,
          c.address.street, c.address.zip, c.address.city, c.address.email, c.address.phone
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';'));
      
      const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Kontakte_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: 'Export heruntergeladen', type: 'success' });
  };

  const filteredCustomers = customers
    .filter(c => {
        const name = (c.lastName + c.firstName + (c.companyName||'')).toLowerCase();
        const search = searchTerm.toLowerCase();
        const matchesSearch = name.includes(search) || c.contactNr?.includes(search);
        const matchesType = filterType === 'all' || c.type === filterType;
        return matchesSearch && matchesType;
    })
    .sort((a, b) => {
        const nameA = (a.companyName || a.lastName).toLowerCase();
        const nameB = (b.companyName || b.lastName).toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  if (editingCustomer) {
      return (
          <CustomerEditor 
            initialCustomer={editingCustomer}
            onSave={handleSave}
            onCancel={() => { if(onSelect) onBack(); else setEditingCustomer(null); }}
          />
      );
  }

  return (
    <div className={`flex flex-col h-full bg-slate-50 ${onSelect ? 'p-4' : ''}`}>
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       <ModuleHeader 
           title="Kontakte"
           subtitle="Adressverwaltung"
           onBack={onBack}
           stats={[{value: customers.length, label: 'Einträge'}]}
           actions={
               <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 font-bold uppercase text-[10px] hover:border-zinc-400 hover:text-black transition-all shadow-sm">
                   <span className="hidden md:inline">Export</span>
                   <span>⬇</span>
               </button>
           }
       >
           <SearchToolbar 
               searchTerm={searchTerm}
               onSearchChange={setSearchTerm}
               placeholder="Kontakt suchen..."
               onFilterClick={() => setShowFilters(!showFilters)}
               filterActive={showFilters}
               onNewClick={() => createNew(customers)}
               newLabel="Erfassen"
           />

           {showFilters && (
                <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">Kontakt Typ</label>
                            <div className="flex flex-wrap gap-2">
                                {['all', 'private', 'business'].map(t => (
                                    <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${filterType === t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300'}`}>
                                        {t === 'all' ? 'Alle' : t === 'private' ? 'Privat' : 'Firma'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">Sortierung</label>
                            <div className="flex bg-zinc-50 rounded-lg p-1 border border-zinc-100">
                                <button onClick={() => setSortOrder('asc')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${sortOrder === 'asc' ? 'bg-white shadow-sm text-black' : 'text-zinc-400'}`}>A-Z</button>
                                <button onClick={() => setSortOrder('desc')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${sortOrder === 'desc' ? 'bg-white shadow-sm text-black' : 'text-zinc-400'}`}>Z-A</button>
                            </div>
                        </div>
                    </div>
                </div>
           )}
       </ModuleHeader>

       <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-24 pt-4">
         <div className="space-y-3">
             {filteredCustomers.map(c => (
               <div key={c.id} onClick={() => onSelect ? onSelect(c) : setEditingCustomer(c)} className="relative p-4 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all cursor-pointer hover:border-olive-400 active:scale-[0.98] group">
                  <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-base truncate pr-2 text-zinc-900">
                          {c.type === 'business' ? c.companyName : `${c.firstName} ${c.lastName}`}
                      </h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${c.type === 'business' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                          {c.type === 'business' ? 'Firma' : 'Privat'}
                      </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mb-3 truncate">
                      {c.address.street} {c.address.houseNr}, {c.address.zip} {c.address.city}
                  </p>
                  <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-zinc-800 tracking-wider bg-zinc-100 px-1 rounded">#{c.contactNr || c.id}</span>
                          {c.address.email && <span className="text-zinc-400">✉️</span>}
                          {c.address.phone && <span className="text-zinc-400">📞</span>}
                      </div>
                  </div>
               </div>
             ))}
             {filteredCustomers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-2xl grayscale">👥</div>
                    <p className="font-bold text-sm uppercase tracking-widest">Keine Kontakte gefunden</p>
                </div>
             )}
         </div>
       </div>

       {/* Mobile FAB */}
       <button onClick={() => createNew(customers)} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90">
           <span className="text-2xl">+</span>
       </button>
    </div>
  );
};

export default CustomerOverview;
