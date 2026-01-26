
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../db';
import { Expense } from '../../../officeTypes';
import { formatMoney } from '../../../components/SharedUI';

const EmployeeExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newExp, setNewExp] = useState<Partial<Expense>>({
      date: new Date().toISOString().split('T')[0],
      category: 'Spesen',
      supplier: 'Mitarbeiter',
      taxRate: 0 // Often 0 for reimbursement, or specific rule
  });

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
      const all = await db.expenses.orderBy('date').reverse().toArray();
      // Filter for Spesen/Personal categories
      setExpenses(all.filter(e => e.category === 'Spesen' || e.category === 'Personal'));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              setNewExp({...newExp, receiptImage: ev.target?.result as string});
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const save = async () => {
      if (!newExp.description || !newExp.amountGross) return;
      const net = (newExp.amountGross || 0); // Spesen usually gross=net or handled differently
      await db.expenses.add({
          ...newExp,
          amountNet: net,
          amountGross: newExp.amountGross || 0,
          description: newExp.description || '',
          supplier: newExp.supplier || 'Mitarbeiter',
          category: 'Spesen',
          date: newExp.date || new Date().toISOString(),
          taxRate: newExp.taxRate || 0
      } as Expense);
      setIsCreating(false);
      loadExpenses();
      setNewExp({date: new Date().toISOString().split('T')[0], category: 'Spesen', supplier: 'Mitarbeiter', taxRate: 0});
  };

  const filteredExpenses = expenses.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="px-4 md:px-8 pt-4 pb-4">
            <div className="flex justify-between items-center mb-4">
                <input className="bg-white border border-zinc-200 p-3 rounded-xl text-sm font-bold w-full md:w-64 outline-none" placeholder="Suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <button onClick={() => setIsCreating(true)} className="bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-olive-600 transition-all">+ Spesen</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 space-y-3">
            {isCreating && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 mb-8 animate-in slide-in-from-top-4">
                    <h3 className="text-xs font-black uppercase text-blue-600 mb-4">Spesen Erfassen</h3>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <input type="date" className="bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg w-1/3 outline-none" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} />
                            <select className="bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg w-2/3 outline-none" value={newExp.supplier} onChange={e => setNewExp({...newExp, supplier: e.target.value})}>
                                <option value="Mitarbeiter">Mitarbeiter</option>
                                <option value="Geschäftsleitung">Geschäftsleitung</option>
                            </select>
                        </div>
                        <input className="w-full bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg outline-none" placeholder="Beschreibung (z.B. Mittagessen Kunde X)" value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} />
                        <div className="flex gap-4 items-center">
                            <input className="w-1/2 bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg font-bold outline-none" type="number" placeholder="Betrag" value={newExp.amountGross} onChange={e => setNewExp({...newExp, amountGross: parseFloat(e.target.value)})} />
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!newExp.receiptImage} readOnly />
                                <button onClick={() => fileInputRef.current?.click()} className="text-xs uppercase font-bold text-blue-600">Beleg</button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFile} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsCreating(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-3 rounded-xl font-bold uppercase text-xs">Abbrechen</button>
                            <button onClick={save} className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold uppercase text-xs">Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {filteredExpenses.map(e => (
                <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 flex justify-between items-center group hover:border-blue-300 transition-colors">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-zinc-800">{e.supplier}</span>
                            <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Spesen</span>
                        </div>
                        <p className="text-xs text-zinc-500">{e.description}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-zinc-900">{formatMoney(e.amountGross)}</p>
                        <p className="text-[10px] text-zinc-400">{e.date}</p>
                        {e.receiptImage && <span className="text-xs">📎</span>}
                    </div>
                </div>
            ))}
            {filteredExpenses.length === 0 && <p className="text-center text-zinc-400 py-10">Keine Spesen gefunden.</p>}
        </div>
    </div>
  );
};

export default EmployeeExpenses;
