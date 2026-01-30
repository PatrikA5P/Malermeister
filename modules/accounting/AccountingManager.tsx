
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Account, AccountGroup } from '../../officeTypes';
import ChartOfAccounts from './ChartOfAccounts';
import AccountSheet from './AccountSheet';
import { JournalView, BalanceSheetView, IncomeStatementView } from './AccountingReports';

export type AccountingView = 'journal' | 'accounts' | 'sheet' | 'balance' | 'income';

export interface LedgerBooking {
    id: string;
    date: string;
    text: string;
    docRef?: string;
    
    // Double Entry
    debitAccountId: number;
    debitAccountName: string;
    creditAccountId: number;
    creditAccountName: string;
    
    amount: number;
    type: 'invoice' | 'expense' | 'manual';
}

const AccountingManager: React.FC<{ onBack: () => void, onNavigate: (view: 'invoices' | 'expenses', id: number) => void }> = ({ onBack, onNavigate }) => {
  const [currentView, setCurrentView] = useState<AccountingView>('journal');
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [ledger, setLedger] = useState<LedgerBooking[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [acc, grp, docs, exps] = await Promise.all([
        db.accounts.toArray(),
        db.accountGroups.toArray(),
        db.documents.where('type').equals('invoice').toArray(),
        db.expenses.toArray()
    ]);

    setAccounts(acc);
    setGroups(grp);

    // --- GENERATE LEDGER (Simulated Double Entry) ---
    const bookings: LedgerBooking[] = [];

    // 1. Invoices (Revenue)
    const accDebtor = acc.find(a => a.number === '1100') || {id: 1100, number: '1100', name: 'Forderungen', type: 'asset'} as Account;
    const accRevenue = acc.find(a => a.number === '3000') || {id: 3000, number: '3000', name: 'Produktionserlös', type: 'revenue'} as Account;
    
    docs.forEach(d => {
        if(d.status !== 'draft' && d.status !== 'cancelled') {
            bookings.push({
                id: `INV-${d.id}`,
                date: d.date,
                text: `${d.client.name} (${d.title || 'Rechnung'})`,
                docRef: d.docNumber,
                debitAccountId: accDebtor.id!,
                debitAccountName: accDebtor.name,
                creditAccountId: accRevenue.id!,
                creditAccountName: accRevenue.name,
                amount: d.totalGross, // Simplified
                type: 'invoice'
            });
        }
    });

    // 2. Expenses
    const accCreditor = acc.find(a => a.number === '2000') || {id: 2000, number: '2000', name: 'Verbindlichkeiten', type: 'liability'} as Account;
    
    exps.forEach(e => {
        let expAcc = acc.find(a => a.id === e.accountId);
        if(!expAcc) expAcc = acc.find(a => a.number === '4000') || {id: 4000, number: '4000', name: 'Materialaufwand', type: 'expense'} as Account;

        bookings.push({
            id: `EXP-${e.id}`,
            date: e.date,
            text: `${e.supplier}: ${e.description}`,
            docRef: 'Beleg',
            debitAccountId: expAcc.id!,
            debitAccountName: expAcc.name,
            creditAccountId: accCreditor.id!,
            creditAccountName: accCreditor.name,
            amount: e.amountGross, // Simplified
            type: 'expense'
        });
    });

    bookings.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setLedger(bookings);
  };

  const handleGoToAccount = (accountId: number) => {
      setSelectedAccountId(accountId);
      setCurrentView('sheet');
  };

  const NavButton = ({ id, label, icon }: { id: AccountingView, label: string, icon: string }) => (
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
                    <h2 className="text-2xl font-black brand-font uppercase">Buchhaltung</h2>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">Finanzübersicht</p>
                 </div>
             </div>
             
             <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                 <NavButton id="journal" label="Journal" icon="📒" />
                 <NavButton id="sheet" label="Kontenblatt" icon="📑" />
                 <NavButton id="accounts" label="Kontenplan" icon="🗂️" />
                 <NavButton id="balance" label="Bilanz" icon="⚖️" />
                 <NavButton id="income" label="Erfolgsrechnung" icon="📈" />
             </div>
           </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-24 pt-6">
           {currentView === 'accounts' && (
               <ChartOfAccounts 
                   accounts={accounts} 
                   groups={groups} 
                   onRefresh={loadData}
               />
           )}

           {currentView === 'sheet' && (
               <AccountSheet 
                    onBack={() => setCurrentView('accounts')} 
                    preselectedAccountId={selectedAccountId}
               />
           )}

           {currentView === 'journal' && (
               <JournalView ledger={ledger} />
           )}

           {currentView === 'balance' && (
               <BalanceSheetView 
                   accounts={accounts} 
                   groups={groups} 
                   ledger={ledger} 
                   onSelectAccount={handleGoToAccount}
               />
           )}

           {currentView === 'income' && (
               <IncomeStatementView 
                   accounts={accounts} 
                   groups={groups} 
                   ledger={ledger}
                   onSelectAccount={handleGoToAccount} 
               />
           )}
       </div>
    </div>
  );
};

export default AccountingManager;
