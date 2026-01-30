
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { Customer } from '../../officeTypes';
import { Toast, ToastType } from '../../components/SharedUI';

// --- Sub-Components ---
const InputGroup = ({ label, error, children, className = '' }: { label: string, error?: string, children?: React.ReactNode, className?: string }) => (
    <div className={`space-y-1 ${className}`}>
        <label className={`text-[10px] font-bold uppercase tracking-widest ${error ? 'text-red-500' : 'text-zinc-400'}`}>
            {label} {error && `— ${error}`}
        </label>
        {children}
    </div>
);

const InputWithAction = ({ 
    value, 
    onChange, 
    placeholder, 
    type = 'text', 
    actionType 
}: { 
    value: string | undefined, 
    onChange: (val: string) => void, 
    placeholder?: string, 
    type?: string,
    actionType?: 'email' | 'link' 
}) => {
    let icon = null;
    let href = '';
    
    if (value && actionType === 'email') {
        icon = '✉️';
        href = `mailto:${value}`;
    } else if (value && actionType === 'link') {
        icon = '🌍';
        href = value.startsWith('http') ? value : `https://${value}`;
    }

    return (
        <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl focus-within:border-olive-500 focus-within:ring-1 focus-within:ring-olive-500 transition-all overflow-hidden relative">
            <input 
                type={type}
                className="flex-1 bg-transparent p-3 outline-none font-bold text-sm w-full"
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
            />
            {icon && (
                <a 
                  href={href} 
                  target={actionType === 'link' ? '_blank' : undefined}
                  rel="noreferrer"
                  className="flex items-center justify-center w-12 bg-white border-l border-zinc-200 hover:bg-olive-50 cursor-pointer text-lg"
                  title="Direkt öffnen"
                >
                    {icon}
                </a>
            )}
        </div>
    );
};

const PhoneInput = ({ 
    value, 
    onChange 
}: { 
    value: string | undefined, 
    onChange: (val: string) => void 
}) => {
    const prefixes = ['+41', '+49', '+43', '+33', '+39'];
    const currentPrefix = useMemo(() => {
        if (!value) return '+41';
        return prefixes.find(p => value.startsWith(p)) || '+41';
    }, [value]);

    const currentNumber = useMemo(() => {
        if (!value) return '';
        if (value.startsWith(currentPrefix)) {
            return value.substring(currentPrefix.length).trim();
        }
        return value;
    }, [value, currentPrefix]);

    const handlePrefixChange = (newPrefix: string) => {
        onChange(`${newPrefix} ${currentNumber}`);
    };

    const handleNumberChange = (newNumber: string) => {
        onChange(`${currentPrefix} ${newNumber}`);
    };

    return (
        <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl focus-within:border-olive-500 focus-within:ring-1 focus-within:ring-olive-500 transition-all overflow-hidden relative">
            <div className="border-r border-zinc-200 bg-white relative">
                <select 
                    className="appearance-none bg-transparent p-3 pr-8 outline-none font-bold text-sm h-full cursor-pointer text-zinc-600"
                    value={currentPrefix}
                    onChange={(e) => handlePrefixChange(e.target.value)}
                >
                    {prefixes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none">▼</span>
            </div>
            <input 
                type="tel"
                className="flex-1 bg-transparent p-3 outline-none font-bold text-sm w-full"
                placeholder="79 000 00 00"
                value={currentNumber}
                onChange={(e) => handleNumberChange(e.target.value)}
            />
            {value && (
                <a 
                  href={`tel:${value.replace(/\s/g, '')}`}
                  className="flex items-center justify-center w-12 bg-white border-l border-zinc-200 hover:bg-olive-50 cursor-pointer text-lg"
                  title="Anrufen"
                >
                    📞
                </a>
            )}
        </div>
    );
};

const SectionHeader = ({ title }: { title: string }) => (
    <div className="mt-8 mb-4 border-b border-zinc-100 pb-2">
        <h3 className="font-black uppercase text-xs text-olive-600 tracking-widest">{title}</h3>
    </div>
);

// --- Main Component ---

interface CustomerManagerProps {
    onBack: () => void;
    onSelect?: (customer: Customer) => void;
    initialEditMode?: boolean;
    editId?: number;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ onBack, onSelect, initialEditMode = false, editId }) => {
  // Main Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Edit Mode & State
  const [editing, setEditing] = useState<Customer | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadCustomers(); }, []);

  // Handle Initial Mode
  useEffect(() => {
      const init = async () => {
          if (editId) {
              const all = await db.customers.toArray();
              const target = all.find(c => c.id === editId);
              if (target) setEditing(target);
          } else if (initialEditMode && !editing) {
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

  const validate = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (editing?.type === 'business' && !editing.companyName?.trim()) newErrors.companyName = 'Firmenname ist Pflichtfeld';
      if (editing?.type === 'private' && !editing.lastName?.trim()) newErrors.lastName = 'Nachname ist Pflichtfeld';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const save = async () => {
    if (!editing) return;
    if (!validate()) { alert("Bitte überprüfen Sie die Eingabefelder."); return; }

    let savedId;
    if (editing.id) {
      await db.customers.update(editing.id, editing);
      savedId = editing.id;
    } else {
      savedId = await db.customers.add(editing);
    }
    
    if (onSelect) {
        onSelect({ ...editing, id: savedId as number });
    } else {
        setEditing(null);
        loadCustomers();
        setToast({ msg: 'Kontakt gespeichert', type: 'success' });
    }
  };

  const createNew = (currentList = customers) => {
    const maxNr = currentList.reduce((max, c) => {
        const num = parseInt(c.contactNr || '0', 10);
        return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const nextNr = String(maxNr + 1).padStart(4, '0');

    setEditing({
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
    setErrors({});
  };

  const handleTypeChange = (newType: 'private' | 'business') => {
      if(!editing) return;
      setEditing({ ...editing, type: newType, salutation: newType === 'business' ? 'Firma' : 'Herr' });
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

  // Filter & Sort
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

  return (
    <div className={`flex flex-col h-full bg-slate-50 ${onSelect ? 'p-4' : ''}`}>
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       {!editing ? (
         // --- LIST VIEW (Standardized) ---
         <>
           <div className="sticky top-0 bg-slate-50 z-20 pt-6 pb-4 px-6 md:px-12 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/90">
             <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-4">
                     <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all shadow-sm">←</button>
                     <div>
                        <h2 className="text-2xl font-black brand-font uppercase">Kontakte</h2>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">Adressverwaltung</p>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <span className="text-3xl font-black brand-font text-zinc-900">{customers.length}</span>
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-widest">Einträge</span>
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 font-bold uppercase text-[10px] hover:border-zinc-400 hover:text-black transition-all shadow-sm">
                        <span className="hidden md:inline">Export</span>
                        <span>⬇</span>
                    </button>
                 </div>
             </div>

             <div className="flex gap-3">
                 <div className="relative flex-1 transition-all">
                      <input 
                          className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" 
                          placeholder="Kontakt suchen..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                      <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
                 </div>
                 <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm ${showFilters ? 'bg-olive-50 border-olive-200 text-olive-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                    <span className="hidden md:inline">Filter</span>
                    <span>⚡</span>
                 </button>
                 <button onClick={() => createNew(customers)} className="hidden md:flex bg-zinc-900 hover:bg-olive-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg whitespace-nowrap items-center gap-2">
                     <span>+</span><span>Erfassen</span>
                 </button>
             </div>

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
           </div>

           <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-24 pt-4">
             <div className="space-y-3">
                 {filteredCustomers.map(c => (
                   <div key={c.id} onClick={() => onSelect ? onSelect(c) : setEditing(c)} className="relative p-4 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all cursor-pointer hover:border-olive-400 active:scale-[0.98] group">
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
         </>
       ) : (
         // EDIT FORM VIEW (Standardized with other editors)
         <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                     <button onClick={() => { if(onSelect) onBack(); else setEditing(null); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors">←</button>
                     <div>
                        <h2 className="text-xl font-black brand-font uppercase">{editing.id ? 'Bearbeiten' : 'Neuer Kontakt'}</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{editing.type === 'business' ? 'Firma' : 'Privatperson'}</p>
                     </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <SectionHeader title="Stammdaten" />
                <div className="space-y-4">
                    <div className="flex bg-zinc-50 rounded-xl p-1 border border-zinc-200">
                        <button onClick={() => handleTypeChange('private')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${editing.type === 'private' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Privat</button>
                        <button onClick={() => handleTypeChange('business')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${editing.type === 'business' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Firma</button>
                    </div>
                    <InputGroup label="Kontakt Nr.">
                        <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-mono text-sm" value={editing.contactNr || ''} onChange={e => setEditing({...editing, contactNr: e.target.value})} placeholder="0001" />
                    </InputGroup>
                    {editing.type === 'business' && (
                        <InputGroup label="Firmenname" error={errors.companyName}>
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold focus:bg-white focus:border-olive-500 text-lg" value={editing.companyName || ''} onChange={e => setEditing({...editing, companyName: e.target.value})} placeholder="Firmenname AG" />
                        </InputGroup>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Anrede">
                            <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.salutation || ''} onChange={e => setEditing({...editing, salutation: e.target.value})} disabled={editing.type === 'business'}>
                                {editing.type === 'business' ? (<option value="Firma">Firma</option>) : (<><option value="Herr">Herr</option><option value="Frau">Frau</option><option value="Dr.">Dr.</option><option value="Familie">Familie</option></>)}
                            </select>
                        </InputGroup>
                        <InputGroup label="Anredeform">
                            <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.formOfAddress || 'Sie'} onChange={e => setEditing({...editing, formOfAddress: e.target.value as any})}>
                                <option value="Sie">Sie (Förmlich)</option><option value="Du">Du (Persönlich)</option>
                            </select>
                        </InputGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Vorname">
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.firstName || ''} onChange={e => setEditing({...editing, firstName: e.target.value})} />
                        </InputGroup>
                        <InputGroup label="Nachname" error={errors.lastName}>
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.lastName || ''} onChange={e => setEditing({...editing, lastName: e.target.value})} />
                        </InputGroup>
                    </div>
                    <InputGroup label="Geburtstag" error={errors.birthday}>
                        <input type="date" className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.birthday || ''} onChange={e => setEditing({...editing, birthday: e.target.value})} />
                    </InputGroup>
                </div>

                <SectionHeader title="Adresse" />
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-9"><InputGroup label="Strasse"><input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.street || ''} onChange={e => setEditing({...editing, address: {...editing.address, street: e.target.value}})} placeholder="Musterstrasse" /></InputGroup></div>
                        <div className="col-span-3"><InputGroup label="Nr."><input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.houseNr || ''} onChange={e => setEditing({...editing, address: {...editing.address, houseNr: e.target.value}})} placeholder="10a" /></InputGroup></div>
                    </div>
                    <InputGroup label="Adresszusatz"><input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.addition || ''} onChange={e => setEditing({...editing, address: {...editing.address, addition: e.target.value}})} placeholder="c/o oder Gebäude" /></InputGroup>
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4"><InputGroup label="PLZ"><input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.zip || ''} onChange={e => setEditing({...editing, address: {...editing.address, zip: e.target.value}})} placeholder="8000" /></InputGroup></div>
                        <div className="col-span-8"><InputGroup label="Ort"><input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.city || ''} onChange={e => setEditing({...editing, address: {...editing.address, city: e.target.value}})} placeholder="Zürich" /></InputGroup></div>
                    </div>
                    <InputGroup label="Land"><input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.country || 'Schweiz'} onChange={e => setEditing({...editing, address: {...editing.address, country: e.target.value}})} /></InputGroup>
                </div>

                <SectionHeader title="Kommunikation" />
                <div className="space-y-4">
                    <InputGroup label="E-Mail" error={errors.email}><InputWithAction value={editing.address.email} onChange={v => setEditing({...editing, address: {...editing.address, email: v}})} type="email" placeholder="name@example.com" actionType="email" /></InputGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Telefon"><PhoneInput value={editing.address.phone} onChange={v => setEditing({...editing, address: {...editing.address, phone: v}})} /></InputGroup>
                        <InputGroup label="Mobile"><PhoneInput value={editing.address.mobile} onChange={v => setEditing({...editing, address: {...editing.address, mobile: v}})} /></InputGroup>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-100 flex gap-4 bg-white z-40">
                <button onClick={() => { if(onSelect) onBack(); else setEditing(null); }} className="flex-1 bg-zinc-100 text-zinc-500 py-4 rounded-xl font-bold uppercase text-xs hover:bg-zinc-200 transition-colors">Abbrechen</button>
                <button onClick={save} className="flex-1 bg-olive-600 text-white py-4 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-olive-700 transition-colors">Speichern</button>
            </div>
         </div>
       )}
    </div>
  );
};

export default CustomerManager;
