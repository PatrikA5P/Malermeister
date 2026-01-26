
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Account } from '../officeTypes';

type Tab = 'journal' | 'accounts';

// Helper Type for Journal View
interface JournalEntry {
    id: number;
    date: string;
    description: string;
    amount: number;
    type: 'revenue' | 'expense';
    accountName: string;
    sourceType: 'invoice' | 'expense';
    sourceId: number;
    docRef: string;
}

const AccountingManager: React.FC<{ onBack: () => void, onNavigate: (view: 'invoices' | 'expenses', id: number) => void }> = ({ onBack, onNavigate }) => {
  const [tab, setTab] = useState<Tab>('journal');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setAccounts(await db.accounts.orderBy('number').toArray());
    loadJournal();
  };

  const loadJournal = async () => {
      // Aggregate Invoices (Revenue)
      const docs = await db.documents.where('type').equals('invoice').toArray();
      const expenses = await db.expenses.toArray();
      
      const entries: JournalEntry[] = [];

      // Add Invoices (only sent/paid/overdue count as bookings usually, but for draft view we include all valid)
      docs.forEach(d => {
          if(d.status !== 'draft' && d.status !== 'cancelled') {
             entries.push({
                 id: d.id!,
                 date: d.date,
                 description: d.client.name,
                 amount: d.totalNet, // Netto Revenue
                 type: 'revenue',
                 accountName: '3000 Produktionserlös', // Simplified
                 sourceType: 'invoice',
                 sourceId: d.id!,
                 docRef: d.docNumber
             });
          }
      });

      // Add Expenses
      expenses.forEach(e => {
          entries.push({
              id: e.id!,
              date: e.date,
              description: e.supplier + (e.description ? ` - ${e.description}` : ''),
              amount: e.amountNet,
              type: 'expense',
              accountName: e.category, // Map category to account name simplified
              sourceType: 'expense',
              sourceId: e.id!,
              docRef: 'Beleg'
          });
      });

      // Sort by Date Desc
      entries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setJournal(entries);
  };

  return (
    <div>
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-black brand-font uppercase">Buchhaltung</h2>
         <div className="flex gap-2 bg-zinc-100 p-1 rounded-lg overflow-x-auto">
             <button onClick={() => setTab('journal')} className={`px-3 py-1 text-xs font-bold uppercase rounded whitespace-nowrap ${tab === 'journal' ? 'bg-white shadow text-black' : 'text-zinc-500'}`}>Journal</button>
             <button onClick={() => setTab('accounts')} className={`px-3 py-1 text-xs font-bold uppercase rounded whitespace-nowrap ${tab === 'accounts' ? 'bg-white shadow text-black' : 'text-zinc-500'}`}>Konten</button>
         </div>
       </div>
       <button onClick={onBack} className="mb-4 text-xs font-bold text-zinc-400 uppercase hover:text-black">← Zurück</button>

       {/* JOURNAL VIEW */}
       {tab === 'journal' && (
           <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                            <th className="p-4 text-left font-bold text-zinc-500 text-xs uppercase tracking-wider">Datum</th>
                            <th className="p-4 text-left font-bold text-zinc-500 text-xs uppercase tracking-wider">Text / Gegenpartei</th>
                            <th className="p-4 text-left font-bold text-zinc-500 text-xs uppercase tracking-wider">Konto</th>
                            <th className="p-4 text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">Soll</th>
                            <th className="p-4 text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">Haben</th>
                            <th className="p-4 text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">Herkunft</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {journal.map((entry, idx) => (
                            <tr key={`${entry.sourceType}-${entry.id}-${idx}`} className="hover:bg-zinc-50 transition-colors group">
                                <td className="p-4 text-zinc-500 font-mono text-xs">{entry.date}</td>
                                <td className="p-4 font-medium text-zinc-800">
                                    <span className="block">{entry.description}</span>
                                    <span className="text-[10px] text-zinc-400">{entry.docRef}</span>
                                </td>
                                <td className="p-4 text-zinc-500 text-xs">{entry.accountName}</td>
                                <td className="p-4 text-right font-mono text-zinc-600">
                                    {entry.type === 'expense' ? entry.amount.toFixed(2) : '-'}
                                </td>
                                <td className="p-4 text-right font-mono text-zinc-600">
                                    {entry.type === 'revenue' ? entry.amount.toFixed(2) : '-'}
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => onNavigate(entry.sourceType === 'invoice' ? 'invoices' : 'expenses', entry.sourceId)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-olive-600 hover:underline hover:text-olive-800"
                                    >
                                        Bearbeiten ↗
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
               </div>
               {journal.length === 0 && <p className="text-center text-zinc-400 py-10">Keine Buchungen vorhanden.</p>}
           </div>
       )}

       {/* ACCOUNTS VIEW */}
       {tab === 'accounts' && (
           <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
               <table className="w-full text-sm">
                   <thead className="bg-zinc-50 border-b border-zinc-100">
                       <tr>
                           <th className="p-4 text-left font-bold text-zinc-500">Nr.</th>
                           <th className="p-4 text-left font-bold text-zinc-500">Name</th>
                           <th className="p-4 text-left font-bold text-zinc-500">Typ</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-50">
                       {accounts.map(acc => (
                           <tr key={acc.id} className="hover:bg-zinc-50">
                               <td className="p-4 font-mono font-bold">{acc.number}</td>
                               <td className="p-4">{acc.name}</td>
                               <td className="p-4 capitalize text-zinc-400 text-xs">{acc.type}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
               <div className="p-4 border-t border-zinc-100 bg-zinc-50 text-xs text-center text-zinc-400">
                   Standard KMU Kontenplan
               </div>
           </div>
       )}
    </div>
  );
};

export default AccountingManager;
