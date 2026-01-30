
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Account } from '../../officeTypes';
import { formatMoney, formatDate } from '../../components/SharedUI';
import { LedgerBooking } from './AccountingManager';

interface AccountSheetProps {
    onBack: () => void;
    preselectedAccountId?: number;
}

const AccountSheet: React.FC<AccountSheetProps> = ({ onBack, preselectedAccountId }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | string>(preselectedAccountId || '');
    const [ledger, setLedger] = useState<LedgerBooking[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<LedgerBooking[]>([]);
    
    // Date Filters
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        loadData();
    }, []);

    // Effect for preselection if passed later or initially
    useEffect(() => {
        if (preselectedAccountId) setSelectedAccountId(preselectedAccountId);
    }, [preselectedAccountId]);

    useEffect(() => {
        if (selectedAccountId) {
            filterLedger();
        } else {
            setFilteredEntries([]);
        }
    }, [selectedAccountId, ledger, year]);

    const loadData = async () => {
        const accs = await db.accounts.orderBy('number').toArray();
        setAccounts(accs);

        // Load Ledger Data (Simplified aggregation similar to AccountingManager)
        // In a real app, this logic should be in a shared service
        const docs = await db.documents.where('type').equals('invoice').toArray();
        const exps = await db.expenses.toArray();
        const bookings: LedgerBooking[] = [];

        // Invoices
        docs.forEach(d => {
            if(d.status !== 'draft' && d.status !== 'cancelled') {
                bookings.push({
                    id: `INV-${d.id}`,
                    date: d.date,
                    text: `${d.client.name} (${d.title || 'Rechnung'})`,
                    docRef: d.docNumber,
                    debitAccountId: 1100, // Default Debtor
                    debitAccountName: 'Forderungen',
                    creditAccountId: 3000, // Default Revenue
                    creditAccountName: 'Produktionserlös',
                    amount: d.totalGross,
                    type: 'invoice'
                });
            }
        });

        // Expenses
        exps.forEach(e => {
            bookings.push({
                id: `EXP-${e.id}`,
                date: e.date,
                text: `${e.supplier}: ${e.description}`,
                docRef: 'Beleg',
                debitAccountId: e.accountId || 4000,
                debitAccountName: 'Aufwand',
                creditAccountId: 2000, // Creditor
                creditAccountName: 'Verbindlichkeiten',
                amount: e.amountGross,
                type: 'expense'
            });
        });

        bookings.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setLedger(bookings);
    };

    const filterLedger = () => {
        const id = Number(selectedAccountId);
        if(!id) return;

        const start = new Date(year, 0, 1).getTime();
        const end = new Date(year, 11, 31).getTime();

        const entries = ledger.filter(b => {
            const t = new Date(b.date).getTime();
            return (b.debitAccountId === id || b.creditAccountId === id) && t >= start && t <= end;
        });
        setFilteredEntries(entries);
    };

    const currentAccount = accounts.find(a => a.id === Number(selectedAccountId));
    let runningBalance = 0;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            {/* Header / Filter */}
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                <div className="space-y-1 w-full md:w-auto">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block">Konto auswählen</label>
                    <select 
                        className="w-full md:w-64 p-2 rounded-lg border border-zinc-200 text-sm font-bold outline-none focus:border-olive-500"
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                    >
                        <option value="">-- Bitte wählen --</option>
                        {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.number} {a.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="space-y-1 w-full md:w-auto">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block">Geschäftsjahr</label>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setYear(year-1)} className="p-2 bg-white rounded border border-zinc-200 text-xs font-bold hover:bg-zinc-100">←</button>
                        <span className="font-mono font-bold text-lg w-16 text-center">{year}</span>
                        <button onClick={() => setYear(year+1)} className="p-2 bg-white rounded border border-zinc-200 text-xs font-bold hover:bg-zinc-100">→</button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {!selectedAccountId ? (
                    <div className="h-full flex items-center justify-center text-zinc-400 font-medium">
                        Bitte wählen Sie ein Konto aus der Liste.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-white border-b border-zinc-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 text-left font-bold text-zinc-500 w-24">Datum</th>
                                <th className="p-4 text-left font-bold text-zinc-500">Buchungstext</th>
                                <th className="p-4 text-left font-bold text-zinc-500">Gegenkonto</th>
                                <th className="p-4 text-right font-bold text-zinc-500 w-32">Soll</th>
                                <th className="p-4 text-right font-bold text-zinc-500 w-32">Haben</th>
                                <th className="p-4 text-right font-bold text-zinc-500 w-32">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            <tr className="bg-zinc-50/50">
                                <td className="p-4 text-xs font-mono">01.01.{year}</td>
                                <td className="p-4 font-bold text-xs uppercase text-zinc-500" colSpan={4}>Saldevortrag</td>
                                <td className="p-4 text-right font-mono font-bold text-zinc-500">0.00</td>
                            </tr>
                            {filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-400 text-xs font-medium">Keine Buchungen in diesem Zeitraum.</td>
                                </tr>
                            )}
                            {filteredEntries.map((e, idx) => {
                                const isDebit = e.debitAccountId === Number(selectedAccountId);
                                const amount = e.amount;
                                runningBalance += isDebit ? amount : -amount;

                                return (
                                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                        <td className="p-4 text-zinc-500 font-mono text-xs">{formatDate(e.date)}</td>
                                        <td className="p-4 font-medium text-zinc-900">
                                            <div className="truncate max-w-xs">{e.text}</div>
                                            <div className="text-[10px] text-zinc-400">{e.docRef}</div>
                                        </td>
                                        <td className="p-4 text-xs text-zinc-500">
                                            {isDebit ? e.creditAccountName : e.debitAccountName}
                                        </td>
                                        <td className="p-4 text-right font-mono text-zinc-600">
                                            {isDebit ? formatMoney(amount) : ''}
                                        </td>
                                        <td className="p-4 text-right font-mono text-zinc-600">
                                            {!isDebit ? formatMoney(amount) : ''}
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold ${runningBalance < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                                            {formatMoney(runningBalance)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-zinc-100 border-t border-zinc-200">
                            <tr>
                                <td colSpan={5} className="p-4 text-right font-bold uppercase text-xs tracking-widest">Endsaldo</td>
                                <td className="p-4 text-right font-mono font-black text-lg">{formatMoney(runningBalance)}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AccountSheet;
