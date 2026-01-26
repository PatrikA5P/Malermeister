
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db';
import { Expense } from '../../officeTypes';

interface ExpenseManagerProps {
    isCreating: boolean;
    onCloseCreate: () => void;
    searchTerm: string;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ isCreating, onCloseCreate, searchTerm }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newExp, setNewExp] = useState<Partial<Expense>>({
      date: new Date().toISOString().split('T')[0],
      category: 'Material',
      taxRate: 8.1
  });

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
      setExpenses(await db.expenses.orderBy('date').reverse().toArray());
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
      const net = (newExp.amountGross || 0) / (1 + (newExp.taxRate||0)/100);
      await db.expenses.add({
          ...newExp,
          amountNet: net,
          amountGross: newExp.amountGross || 0,
          description: newExp.description || '',
          supplier: newExp.supplier || '',
          category: newExp.category || 'Allgemein',
          date: newExp.date || new Date().toISOString(),
          taxRate: newExp.taxRate || 8.1
      } as Expense);
      onCloseCreate();
      loadExpenses();
      setNewExp({date: new Date().toISOString().split('T')[0], category: 'Material', taxRate: 8.1});
  };

  const filteredExpenses = expenses.filter(e => 
      e.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
        {isCreating && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-orange-100 mb-8 animate-in slide-in-from-top-4">
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <input type="date" className="bg-zinc-50 border-transparent focus:bg-white focus:border-orange-500 border p-3 rounded-lg w-1/3 outline-none" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} />
                        <select className="bg-zinc-50 border-transparent focus:bg-white focus:border-orange-500 border p-3 rounded-lg w-2/3 outline-none" value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})}>
                            <option>Material</option>
                            <option>Werkzeug</option>
                            <option>Fahrzeug</option>
                            <option>Verpflegung</option>
                            <option>Büro</option>
                        </select>
                    </div>
                    <input className="w-full bg-zinc-50 border-transparent focus:bg-white focus:border-orange-500 border p-3 rounded-lg outline-none" placeholder="Lieferant (z.B. Bauhaus)" value={newExp.supplier} onChange={e => setNewExp({...newExp, supplier: e.target.value})} />
                    <input className="w-full bg-zinc-50 border-transparent focus:bg-white focus:border-orange-500 border p-3 rounded-lg outline-none" placeholder="Beschreibung" value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} />
                    <div className="flex gap-4 items-center">
                        <input className="w-1/2 bg-zinc-50 border-transparent focus:bg-white focus:border-orange-500 border p-3 rounded-lg font-bold outline-none" type="number" placeholder="Betrag Brutto" value={newExp.amountGross} onChange={e => setNewExp({...newExp, amountGross: parseFloat(e.target.value)})} />
                        <div className="flex items-center gap-2">
                             <input type="checkbox" checked={!!newExp.receiptImage} readOnly />
                             <button onClick={() => fileInputRef.current?.click()} className="text-xs uppercase font-bold text-orange-600">Beleg Foto</button>
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFile} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onCloseCreate} className="flex-1 bg-zinc-100 text-zinc-500 py-3 rounded-xl font-bold uppercase">Abbrechen</button>
                        <button onClick={save} className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold uppercase">Speichern</button>
                    </div>
                </div>
            </div>
        )}

        <div className="space-y-3 pb-20">
            {filteredExpenses.map(e => (
                <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 flex justify-between items-center group hover:border-orange-300 transition-colors">
                    <div>
                        <p className="font-bold text-zinc-800">{e.supplier}</p>
                        <p className="text-xs text-zinc-500">{e.description}</p>
                        <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-500 uppercase font-bold mt-1 inline-block">{e.category}</span>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-orange-600">- {e.amountGross.toFixed(2)}</p>
                        <p className="text-[10px] text-zinc-400">{e.date}</p>
                        {e.receiptImage && <span className="text-xs">📎</span>}
                    </div>
                </div>
            ))}
            {filteredExpenses.length === 0 && <p className="text-center text-zinc-400 py-10">Keine Ausgaben gefunden.</p>}
        </div>
    </div>
  );
};

export default ExpenseManager;
