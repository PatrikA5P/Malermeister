
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Customer, Project, OfficeDocument, Expense } from '../officeTypes';

// Country Codes for Phone Input
const COUNTRY_CODES = [
  { code: '+41', flag: '🇨🇭', label: 'Schweiz' },
  { code: '+49', flag: '🇩🇪', label: 'Deutschland' },
  { code: '+43', flag: '🇦🇹', label: 'Österreich' },
];

interface CustomerManagerProps {
    onBack: () => void;
    onSelect?: (customer: Customer) => void;
    initialEditMode?: boolean;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ onBack, onSelect, initialEditMode = false }) => {
  // Main Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Mode & State
  const [editing, setEditing] = useState<Customer | null>(null);
  
  // Sub-Views
  const [activeTab, setActiveTab] = useState<'details' | 'projects'>('details');
  const [phonePrefix, setPhonePrefix] = useState('+41');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => { loadCustomers(); }, []);

  useEffect(() => {
      if(initialEditMode && !editing) {
          createNew();
      }
  }, [initialEditMode]);

  useEffect(() => {
      if (editing && editing.address.phone) {
          const foundPrefix = COUNTRY_CODES.find(c => editing.address.phone?.startsWith(c.code));
          if (foundPrefix) {
              setPhonePrefix(foundPrefix.code);
              setPhoneNumber(editing.address.phone.substring(foundPrefix.code.length).trim());
          } else {
              setPhonePrefix('+41');
              setPhoneNumber(editing.address.phone);
          }
      } else {
          setPhoneNumber('');
      }
  }, [editing?.id]);

  const loadCustomers = async () => {
    setCustomers(await db.customers.toArray());
  };

  const save = async () => {
    if (!editing) return;
    const fullPhone = phoneNumber ? `${phonePrefix} ${phoneNumber.trim()}` : '';
    const customerToSave = { ...editing, address: { ...editing.address, phone: fullPhone } };

    let savedId;
    if (customerToSave.id) {
      await db.customers.update(customerToSave.id, customerToSave);
      savedId = customerToSave.id;
    } else {
      savedId = await db.customers.add(customerToSave);
    }
    
    // If in Selection Mode, return the saved customer
    if (onSelect) {
        onSelect({ ...customerToSave, id: savedId as number });
    } else {
        setEditing(null);
        loadCustomers();
    }
  };

  const createNew = () => {
    setEditing({
      type: 'private',
      firstName: '',
      lastName: '',
      address: { name: '', street: '', zip: '', city: '' },
      defaultDiscount: 0
    });
    setPhonePrefix('+41');
    setPhoneNumber('');
    setActiveTab('details');
  };

  const filteredCustomers = customers.filter(c => 
    (c.lastName + c.firstName + (c.companyName||'')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`flex flex-col h-full bg-slate-50 ${onSelect ? 'p-4' : ''}`}>
       
       {!editing ? (
         <>
           <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50 z-20 pt-2 pb-4">
             <div className="flex items-center gap-4">
                 <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all">←</button>
                 <h2 className="text-2xl font-black brand-font uppercase">Kunden</h2>
             </div>
           </div>

           <div className="flex gap-4 mb-6">
               <input 
                 className="flex-1 border border-zinc-200 p-4 rounded-2xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" 
                 placeholder="Kunde suchen..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
               <button onClick={createNew} className="bg-zinc-900 hover:bg-olive-600 text-white px-6 rounded-2xl text-xs font-bold uppercase transition-all shadow-lg whitespace-nowrap">
                   + Kunde
               </button>
           </div>

           <div className="grid grid-cols-1 gap-3 pb-20">
             {filteredCustomers.map(c => (
               <div key={c.id} onClick={() => onSelect ? onSelect(c) : setEditing(c)} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 hover:border-olive-500 transition-all cursor-pointer">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="font-bold text-lg text-zinc-800 leading-tight mb-1">{c.type === 'business' ? c.companyName : `${c.firstName} ${c.lastName}`}</p>
                          <p className="text-sm text-zinc-500">{c.address.street}, {c.address.zip} {c.address.city}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ml-2 shrink-0 ${c.type === 'business' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>{c.type === 'business' ? 'Firma' : 'Privat'}</span>
                  </div>
               </div>
             ))}
           </div>
         </>
       ) : (
         <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-white sticky top-0 z-30">
                <div className="flex items-center gap-4">
                     <button onClick={() => { if(onSelect) onBack(); else setEditing(null); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors">←</button>
                     <h2 className="text-xl font-black brand-font uppercase">{editing.id ? 'Bearbeiten' : 'Neuer Kunde'}</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex gap-4 p-1 bg-zinc-50 rounded-lg border border-zinc-100">
                    <button onClick={() => setEditing({...editing, type: 'private'})} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${editing.type === 'private' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Privat</button>
                    <button onClick={() => setEditing({...editing, type: 'business'})} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${editing.type === 'business' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Firma</button>
                </div>

                {editing.type === 'business' && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">Firmenname</label>
                        <input className="w-full border p-4 rounded-xl bg-zinc-50 focus:bg-white outline-none font-bold" placeholder="Maler AG" value={editing.companyName || ''} onChange={e => setEditing({...editing, companyName: e.target.value})} />
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">Vorname</label>
                        <input className="w-full border p-4 rounded-xl bg-zinc-50 focus:bg-white outline-none font-bold" value={editing.firstName} onChange={e => setEditing({...editing, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">Nachname</label>
                        <input className="w-full border p-4 rounded-xl bg-zinc-50 focus:bg-white outline-none font-bold" value={editing.lastName} onChange={e => setEditing({...editing, lastName: e.target.value})} />
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold uppercase text-zinc-400 mb-4 tracking-widest">Kontakt & Adresse</h3>
                    <div className="space-y-4">
                        <div className="flex rounded-xl border bg-zinc-50 overflow-hidden">
                             <select className="bg-transparent p-3 outline-none font-bold text-zinc-500 border-r" value={phonePrefix} onChange={e => setPhonePrefix(e.target.value)}>
                                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                             </select>
                             <input className="flex-1 bg-transparent p-3 outline-none font-bold" placeholder="79 000 00 00" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                        </div>
                        <input className="w-full border p-4 rounded-xl bg-zinc-50 focus:bg-white outline-none" placeholder="Email Adresse" value={editing.address.email || ''} onChange={e => setEditing({...editing, address: {...editing.address, email: e.target.value}})} />
                        <input className="w-full border p-4 rounded-xl bg-zinc-50 focus:bg-white outline-none" placeholder="Strasse Nr." value={editing.address.street} onChange={e => setEditing({...editing, address: {...editing.address, street: e.target.value}})} />
                        <div className="flex gap-4">
                            <input className="w-24 border p-4 rounded-xl bg-zinc-50 focus:bg-white outline-none" placeholder="PLZ" value={editing.address.zip} onChange={e => setEditing({...editing, address: {...editing.address, zip: e.target.value}})} />
                            <input className="flex-1 border p-4 rounded-xl bg-zinc-50 focus:bg-white outline-none" placeholder="Ort" value={editing.address.city} onChange={e => setEditing({...editing, address: {...editing.address, city: e.target.value}})} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-100 flex gap-4 bg-white">
                <button onClick={() => { if(onSelect) onBack(); else setEditing(null); }} className="flex-1 bg-zinc-100 text-zinc-500 py-4 rounded-xl font-bold uppercase text-xs">Abbrechen</button>
                <button onClick={save} className="flex-1 bg-olive-600 text-white py-4 rounded-xl font-bold uppercase text-xs shadow-lg">Speichern</button>
            </div>
         </div>
       )}
    </div>
  );
};

export default CustomerManager;
