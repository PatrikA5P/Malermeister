
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Product, Account } from '../officeTypes';

interface ProductManagerProps {
    onBack: () => void;
    onSelect?: (product: Product) => void;
    initialEditMode?: boolean;
}

const ProductManager: React.FC<ProductManagerProps> = ({ onBack, onSelect, initialEditMode = false }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);
  
  useEffect(() => {
      if(initialEditMode && !editing) createNew();
  }, [initialEditMode]);

  const loadData = async () => {
    setProducts(await db.products.orderBy('code').toArray());
    setAccounts(await db.accounts.where('class').equals(3).toArray());
  };

  const createNew = () => {
      setEditing({code: '', name: '', unit: 'Stk', price: 0, accountId: 3000, type: 'service'});
  };

  const save = async () => {
    if(!editing) return;
    let savedId;
    if(editing.id) {
        await db.products.update(editing.id, editing as any);
        savedId = editing.id;
    } else {
        savedId = await db.products.add(editing);
    }
    
    if (onSelect) {
        onSelect({ ...editing, id: savedId as number });
    } else {
        setEditing(null);
        loadData();
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`flex flex-col h-full bg-slate-50 ${onSelect ? 'p-4' : ''}`}>
       {!editing ? (
         <>
           <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50 z-20 pt-2 pb-4">
             <div className="flex items-center gap-4">
                 <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all">←</button>
                 <h2 className="text-2xl font-black brand-font uppercase">Produkte</h2>
             </div>
           </div>

           <div className="flex gap-4 mb-6">
               <input 
                 className="flex-1 border border-zinc-200 p-4 rounded-2xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" 
                 placeholder="Produkt suchen..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
               <button onClick={createNew} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 rounded-2xl text-xs font-bold uppercase transition-all shadow-lg whitespace-nowrap">
                   + Produkt
               </button>
           </div>

           <div className="space-y-2 pb-20">
               {filteredProducts.map(p => (
                   <div key={p.id} onClick={() => onSelect ? onSelect(p) : setEditing(p)} className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 flex justify-between items-center cursor-pointer hover:border-yellow-500 transition-colors">
                       <div className="flex items-center gap-4">
                           <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${p.type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                               {p.type === 'service' ? 'D' : 'M'}
                           </div>
                           <div>
                               <p className="font-bold text-zinc-800">{p.name}</p>
                               <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-1 rounded">{p.code}</span>
                                   <p className="text-[10px] text-zinc-400">Konto {p.accountId}</p>
                               </div>
                           </div>
                       </div>
                       <div className="text-right">
                           <p className="font-bold text-zinc-900">CHF {p.price.toFixed(2)}</p>
                           <p className="text-[10px] text-zinc-400">pro {p.unit}</p>
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
                         <h2 className="text-xl font-black brand-font uppercase">{editing.id ? 'Bearbeiten' : 'Neues Produkt'}</h2>
                    </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                   <div className="space-y-1">
                       <label className="text-[10px] font-bold uppercase text-zinc-400">Typ</label>
                       <select className="w-full border p-4 rounded-xl bg-zinc-50 font-bold" value={editing.type} onChange={e => setEditing({...editing, type: e.target.value as any})}>
                           <option value="service">Dienstleistung / Arbeit</option>
                           <option value="material">Material / Ware</option>
                       </select>
                   </div>
                   
                   <div className="space-y-1">
                       <label className="text-[10px] font-bold uppercase text-zinc-400">Bezeichnung</label>
                       <input className="w-full border p-4 rounded-xl bg-zinc-50 font-bold" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
                   </div>

                   <div className="flex gap-4">
                       <div className="w-1/3 space-y-1">
                           <label className="text-[10px] font-bold uppercase text-zinc-400">Code</label>
                           <input className="w-full border p-4 rounded-xl bg-zinc-50 font-bold" value={editing.code} onChange={e => setEditing({...editing, code: e.target.value})} />
                       </div>
                       <div className="w-1/3 space-y-1">
                           <label className="text-[10px] font-bold uppercase text-zinc-400">Einheit</label>
                           <input className="w-full border p-4 rounded-xl bg-zinc-50 font-bold" value={editing.unit} onChange={e => setEditing({...editing, unit: e.target.value})} />
                       </div>
                       <div className="flex-1 space-y-1">
                           <label className="text-[10px] font-bold uppercase text-zinc-400">Preis</label>
                           <input type="number" className="w-full border p-4 rounded-xl bg-zinc-50 font-bold" value={editing.price} onChange={e => setEditing({...editing, price: parseFloat(e.target.value)})} />
                       </div>
                   </div>
                   
                   <div className="space-y-1">
                       <label className="text-[10px] uppercase font-bold text-zinc-400">Buchhaltungskonto</label>
                       <select className="w-full border p-4 rounded-xl bg-zinc-50" value={editing.accountId} onChange={e => setEditing({...editing, accountId: parseInt(e.target.value)})}>
                           {accounts.map(a => <option key={a.id} value={a.number}>{a.number} {a.name}</option>)}
                       </select>
                   </div>
               </div>

               <div className="p-4 border-t border-zinc-100 flex gap-4 bg-white">
                   <button onClick={() => { if(onSelect) onBack(); else setEditing(null); }} className="flex-1 bg-zinc-100 text-zinc-500 py-4 rounded-xl font-bold uppercase text-xs">Abbrechen</button>
                   <button onClick={save} className="flex-1 bg-yellow-500 text-white py-4 rounded-xl font-bold uppercase text-xs shadow-lg">Speichern</button>
               </div>
           </div>
       )}
    </div>
  );
};

export default ProductManager;
