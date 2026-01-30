
import React, { useState, useMemo } from 'react';
import { Account, AccountGroup } from '../../officeTypes';
import { LedgerBooking } from './AccountingManager';
import { formatMoney, formatDate } from '../../components/SharedUI';

// Declare html2pdf for TypeScript
declare const html2pdf: any;

// --- UTILS ---
const getAccountBalance = (
    accId: number, 
    ledger: LedgerBooking[], 
    fromDate?: string, 
    toDate?: string
) => {
    let debit = 0;
    let credit = 0;
    
    if (!ledger) return { debit: 0, credit: 0, balance: 0 };

    // Standard date comparison strings
    const start = fromDate || '0000-01-01';
    const end = toDate || '9999-12-31';

    ledger.forEach(b => {
        // Simple string comparison works for ISO dates YYYY-MM-DD
        if (b.date >= start && b.date <= end) {
            if (b.debitAccountId === accId) debit += b.amount;
            if (b.creditAccountId === accId) credit += b.amount;
        }
    });
    return { debit, credit, balance: debit - credit };
};

// --- 1. JOURNAL VIEW ---
export const JournalView = ({ ledger }: { ledger: LedgerBooking[] }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden h-full flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-left font-bold text-zinc-500 uppercase tracking-wider w-24">Datum</th>
                            <th className="p-3 text-left font-bold text-zinc-500 uppercase tracking-wider w-32">Referenz</th>
                            <th className="p-3 text-left font-bold text-zinc-500 uppercase tracking-wider w-40">Soll</th>
                            <th className="p-3 text-left font-bold text-zinc-500 uppercase tracking-wider w-40">Haben</th>
                            <th className="p-3 text-left font-bold text-zinc-500 uppercase tracking-wider">Beschreibung</th>
                            <th className="p-3 text-right font-bold text-zinc-500 uppercase tracking-wider w-16">MWST</th>
                            <th className="p-3 text-right font-bold text-zinc-500 uppercase tracking-wider w-16">CCY</th>
                            <th className="p-3 text-right font-bold text-zinc-500 uppercase tracking-wider w-28">Betrag</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {(ledger || []).map((entry) => (
                            <tr key={entry.id} className="hover:bg-zinc-50 transition-colors group h-10">
                                <td className="p-3 text-zinc-500 font-mono whitespace-nowrap">{formatDate(entry.date)}</td>
                                <td className="p-3">
                                    {entry.docRef && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded cursor-pointer hover:underline whitespace-nowrap">
                                            {entry.docRef} ↗
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-zinc-700 truncate max-w-[150px]" title={entry.debitAccountName}>
                                    <span className="font-mono font-bold mr-1">{entry.debitAccountId}</span>
                                    {entry.debitAccountName}
                                </td>
                                <td className="p-3 text-zinc-700 truncate max-w-[150px]" title={entry.creditAccountName}>
                                    <span className="font-mono font-bold mr-1">{entry.creditAccountId}</span>
                                    {entry.creditAccountName}
                                </td>
                                <td className="p-3 text-zinc-900 font-medium truncate max-w-xs" title={entry.text}>
                                    {entry.text}
                                </td>
                                <td className="p-3 text-right text-zinc-400 whitespace-nowrap">8.1%</td> {/* Mocked/Default for View */}
                                <td className="p-3 text-right text-zinc-400 whitespace-nowrap">CHF</td>
                                <td className="p-3 text-right font-mono font-bold text-zinc-900 whitespace-nowrap">
                                    {formatMoney(entry.amount).replace('CHF ', '')}
                                </td>
                            </tr>
                        ))}
                        {(!ledger || ledger.length === 0) && (
                            <tr>
                                <td colSpan={8} className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest">Keine Buchungen vorhanden</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const ReportRow = ({ label, amount, level, bold = false, onClick, number, hideAmount = false, isResultLine = false }: any) => (
    <div 
        onClick={onClick}
        className={`flex justify-between items-center py-1.5 hover:bg-olive-50/50 transition-colors ${onClick ? 'cursor-pointer group' : ''} ${isResultLine ? 'border-t border-zinc-300 mt-2 mb-2 pt-2' : ''}`}
        style={{ paddingLeft: isResultLine ? '0px' : `${level * 16}px` }}
    >
        <div className="flex gap-2 items-center flex-1 min-w-0">
            {number && <span className="font-mono text-zinc-400 text-[10px] w-8 shrink-0">{number}</span>}
            <span className={`${bold || isResultLine ? 'font-black uppercase tracking-wide text-zinc-900 text-xs' : 'font-medium text-zinc-700 text-xs group-hover:text-olive-700 truncate'}`}>
                {label}
            </span>
        </div>
        {!hideAmount && (
            <span className={`font-mono text-xs ${bold || isResultLine ? 'font-black' : 'font-medium text-zinc-600'} ${amount < 0 ? 'text-red-600' : ''}`}>
                {amount === 0 ? '-' : formatMoney(amount).replace('CHF ', '')}
            </span>
        )}
    </div>
);

const RecursiveReportGroup = ({ group, allGroups, accounts, ledger, level, onSelectAccount, fromDate, toDate, showZero, hideAmounts, factor = 1, excludeGroups = [] }: any) => {
    if (excludeGroups.includes(group.number)) return null;

    // 1. Get Subgroups
    const subGroups = allGroups
        .filter((g: AccountGroup) => g.parentGroupId === group.id && !excludeGroups.includes(g.number))
        .sort((a: any, b: any) => a.number.localeCompare(b.number));
    
    // 2. Get Direct Accounts
    const directAccounts = accounts
        .filter((a: Account) => a.groupId === group.id)
        .sort((a: any, b: any) => a.number.localeCompare(b.number));
    
    // 3. Calculate Balance
    const calculateGroupTotal = (grp: AccountGroup): number => {
        if (excludeGroups.includes(grp.number)) return 0;
        const subs = allGroups.filter((g: AccountGroup) => g.parentGroupId === grp.id);
        const subTotal = subs.reduce((sum: number, sg: AccountGroup) => sum + calculateGroupTotal(sg), 0);
        const accs = accounts.filter((a: Account) => a.groupId === grp.id);
        const accTotal = accs.reduce((sum: number, a: Account) => {
            const bal = getAccountBalance(a.id!, ledger, fromDate, toDate);
            return sum + bal.balance;
        }, 0);
        return subTotal + accTotal;
    };

    const groupTotal = calculateGroupTotal(group) * factor; 
    
    // Visibility Check
    // Always show if:
    // 1. showZero is active
    // 2. It has a value != 0
    // 3. It is a root level group passed to this component (level 0) - This ensures Main Headings are always shown
    const isVisible = showZero || Math.abs(groupTotal) >= 0.01 || level === 0;

    if (!isVisible) return null;

    return (
        <div className="mb-1">
            <ReportRow label={group.name} amount={groupTotal} level={level} bold={true} hideAmount={hideAmounts} />
            
            {directAccounts.map((acc: Account) => {
                const bal = getAccountBalance(acc.id!, ledger, fromDate, toDate);
                const val = bal.balance * factor;
                if (!showZero && Math.abs(val) < 0.01) return null;
                return (
                    <ReportRow 
                        key={acc.id} 
                        number={acc.number}
                        label={acc.name} 
                        amount={val} 
                        level={level + 1} 
                        onClick={() => onSelectAccount(acc.id!)}
                        hideAmount={hideAmounts}
                    />
                );
            })}

            {subGroups.map((sg: AccountGroup) => (
                <RecursiveReportGroup 
                    key={sg.id} 
                    group={sg} 
                    allGroups={allGroups} 
                    accounts={accounts} 
                    ledger={ledger} 
                    level={level + 1} 
                    onSelectAccount={onSelectAccount}
                    fromDate={fromDate}
                    toDate={toDate}
                    showZero={showZero}
                    hideAmounts={hideAmounts}
                    factor={factor}
                    excludeGroups={excludeGroups}
                />
            ))}
        </div>
    );
};

// --- 3. BALANCE SHEET VIEW (2-COLUMN) ---
export const BalanceSheetView = ({ accounts, groups, ledger, onSelectAccount }: any) => {
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showZero, setShowZero] = useState(false);
    
    // Groups
    const assetGroup = groups.find((g: AccountGroup) => g.number === '1');
    const liabilityGroup = groups.find((g: AccountGroup) => g.number === '2');

    // Root children (to skip printing "Aktiva" in the list)
    const assetChildren = groups.filter((g: AccountGroup) => g.parentGroupId === assetGroup?.id).sort((a: any, b: any) => a.number.localeCompare(b.number));
    const liabilityChildren = groups.filter((g: AccountGroup) => g.parentGroupId === liabilityGroup?.id).sort((a: any, b: any) => a.number.localeCompare(b.number));

    const calculateTotalForClass = (clsPrefix: string) => {
        return accounts.filter((a: Account) => a.number.startsWith(clsPrefix)).reduce((sum: number, acc: Account) => {
            return sum + getAccountBalance(acc.id!, ledger, undefined, filterDate).balance;
        }, 0);
    };

    const totalAssets = calculateTotalForClass('1');
    const totalLiabilities = calculateTotalForClass('2');
    
    // Profit Calculation (Simplified: Revenue - Expenses)
    const profit = accounts.filter((a: Account) => ['3','4','5','6','7','8'].includes(a.number.charAt(0)))
        .reduce((sum: number, acc: Account) => {
             return sum - getAccountBalance(acc.id!, ledger, undefined, filterDate).balance;
        }, 0);

    // Total Passiva includes Profit to balance
    const totalPassiveSide = -totalLiabilities + profit; 

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col h-full max-h-screen">
            {/* Header / Filter */}
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer select-none">
                        <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded accent-olive-600 w-4 h-4" />
                        0-Werte anzeigen
                    </label>
                </div>
                
                {/* Specific Date Filter */}
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none w-48">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold uppercase text-zinc-400">Bilanz per</label>
                        <input 
                            type="date" 
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold bg-white outline-none focus:border-olive-500"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Split View */}
            <div className="flex flex-1 divide-x divide-zinc-100 overflow-hidden">
                {/* Left Column: ASSETS */}
                <div className="w-1/2 flex flex-col">
                    <div className="p-4 bg-zinc-50/50 border-b border-zinc-100">
                        <h3 className="text-sm font-black brand-font uppercase text-zinc-900">Aktiva</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {assetChildren.map((childGroup: AccountGroup) => (
                            <RecursiveReportGroup 
                                key={childGroup.id}
                                group={childGroup} 
                                allGroups={groups} 
                                accounts={accounts} 
                                ledger={ledger} 
                                level={0}
                                onSelectAccount={onSelectAccount}
                                toDate={filterDate}
                                showZero={showZero}
                            />
                        ))}
                    </div>
                    {/* Fixed Footer Asset */}
                    <div className="p-4 border-t border-black bg-zinc-50 flex justify-between items-center mt-auto flex-shrink-0">
                        <span className="font-black uppercase text-xs">Total Aktiva</span>
                        <span className="font-black font-mono text-sm">{formatMoney(totalAssets)}</span>
                    </div>
                </div>

                {/* Right Column: LIABILITIES */}
                <div className="w-1/2 flex flex-col">
                    <div className="p-4 bg-zinc-50/50 border-b border-zinc-100">
                        <h3 className="text-sm font-black brand-font uppercase text-zinc-900">Passiva</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {liabilityChildren.map((childGroup: AccountGroup) => (
                            <RecursiveReportGroup 
                                key={childGroup.id}
                                group={childGroup} 
                                allGroups={groups} 
                                accounts={accounts} 
                                ledger={ledger} 
                                level={0}
                                onSelectAccount={onSelectAccount}
                                toDate={filterDate}
                                showZero={showZero}
                                factor={-1} 
                            />
                        ))}
                        <div className="mt-4 pt-2 border-t border-dashed border-zinc-300">
                            <div className="flex justify-between items-center py-1.5 px-0">
                                <span className="font-bold text-xs text-zinc-900 uppercase">Jahresergebnis</span>
                                <span className={`font-mono text-xs font-bold ${profit >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
                                    {formatMoney(profit)}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Fixed Footer Liability */}
                    <div className="p-4 border-t border-black bg-zinc-50 flex justify-between items-center mt-auto flex-shrink-0">
                        <span className="font-black uppercase text-xs">Total Passiva</span>
                        <span className="font-black font-mono text-sm">{formatMoney(totalPassiveSide)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 4. INCOME STATEMENT VIEW (2-COLUMN) ---
export const IncomeStatementView = ({ accounts, groups, ledger, onSelectAccount }: any) => {
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showZero, setShowZero] = useState(false);

    // Calculate year start from selected date
    const yearStart = `${filterDate.substring(0, 4)}-01-01`;

    const getGroupTotal = (classPrefix: string, excludeGroups: string[] = []) => {
        const rootGroups = groups.filter((g: AccountGroup) => g.number.startsWith(classPrefix) && g.parentGroupId === undefined);
        let total = 0;
        
        const sumRecursive = (grp: AccountGroup) => {
            if (excludeGroups.includes(grp.number)) return 0;
            const subs = groups.filter((g: AccountGroup) => g.parentGroupId === grp.id);
            const subTotal = subs.reduce((s: number, g: AccountGroup) => s + sumRecursive(g), 0);
            const accs = accounts.filter((a: Account) => a.groupId === grp.id);
            const accTotal = accs.reduce((s: number, a: Account) => s + getAccountBalance(a.id!, ledger, yearStart, filterDate).balance, 0);
            return subTotal + accTotal;
        };

        rootGroups.forEach((g: AccountGroup) => total += sumRecursive(g));
        return total;
    };

    const FACTOR = -1; // Flip signs for display (Revenue positive, Expense negative -> positive display)

    // Calculate Totals for Columns
    const rawExpenses = getGroupTotal('4') + getGroupTotal('5') + getGroupTotal('6') + getGroupTotal('8');
    const rawRevenue = getGroupTotal('3') + getGroupTotal('7');
    
    // Result
    const rawResult = rawRevenue + rawExpenses; // Revenue is negative, Expenses positive in DB usually.
    const displayResult = rawResult * -1; // Profit positive

    const renderBlock = (groupPrefix: string) => {
        const rootGroups = groups.filter((g: AccountGroup) => g.number.startsWith(groupPrefix) && g.parentGroupId === undefined);
        return rootGroups.map((grp: AccountGroup) => (
            <RecursiveReportGroup 
                key={grp.id}
                group={grp}
                allGroups={groups}
                accounts={accounts}
                ledger={ledger}
                level={0}
                onSelectAccount={onSelectAccount}
                fromDate={yearStart}
                toDate={filterDate}
                showZero={showZero}
                factor={groupPrefix === '3' || groupPrefix === '7' ? -1 : 1} // Flip Revenue to appear positive
            />
        ));
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col h-full max-h-screen">
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer select-none">
                        <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded accent-olive-600 w-4 h-4" />
                        0-Werte anzeigen
                    </label>
                </div>
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none w-48">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold uppercase text-zinc-400">Bilanz per</label>
                        <input 
                            type="date" 
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold bg-white outline-none focus:border-olive-500"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Split View */}
            <div className="flex flex-1 divide-x divide-zinc-100 overflow-hidden">
                {/* Left: EXPENSES (Aufwand) */}
                <div className="w-1/2 flex flex-col">
                    <div className="p-4 bg-zinc-50/50 border-b border-zinc-100">
                        <h3 className="text-sm font-black brand-font uppercase text-zinc-900">Aufwand</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div>
                            <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Material & Waren</h4>
                            {renderBlock('4')}
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Personal</h4>
                            {renderBlock('5')}
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Betrieb & Diverses</h4>
                            {renderBlock('6')}
                            {renderBlock('8')}
                        </div>
                        
                        {displayResult > 0 && (
                             <div className="mt-8 pt-4 border-t border-zinc-200">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs uppercase text-green-700">Jahresgewinn</span>
                                    <span className="font-black font-mono text-sm text-green-700">{formatMoney(displayResult)}</span>
                                </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* Right: REVENUE (Ertrag) */}
                <div className="w-1/2 flex flex-col">
                    <div className="p-4 bg-zinc-50/50 border-b border-zinc-100">
                        <h3 className="text-sm font-black brand-font uppercase text-zinc-900">Ertrag</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div>
                            <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Betrieblicher Ertrag</h4>
                            {renderBlock('3')}
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Nebenerfolg</h4>
                            {renderBlock('7')}
                        </div>

                        {displayResult < 0 && (
                             <div className="mt-8 pt-4 border-t border-zinc-200">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs uppercase text-red-700">Jahresverlust</span>
                                    <span className="font-black font-mono text-sm text-red-700">{formatMoney(Math.abs(displayResult))}</span>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Common Total Footer - OUTSIDE scroll area to ensure alignment */}
            <div className="grid grid-cols-2 divide-x divide-white border-t border-zinc-300 bg-zinc-100 flex-shrink-0">
                 <div className="p-4 flex justify-between items-center">
                     <span className="font-black text-xs uppercase text-zinc-500">Total Aufwand</span>
                     {/* Balance the sides visually if profit is positive */}
                     <span className="font-black font-mono text-sm">
                        {formatMoney(displayResult > 0 ? (getGroupTotal('3')*-1 + getGroupTotal('7')*-1) : (getGroupTotal('4') + getGroupTotal('5') + getGroupTotal('6') + getGroupTotal('8')) * 1)}
                     </span>
                 </div>
                 <div className="p-4 flex justify-between items-center">
                     <span className="font-black text-xs uppercase text-zinc-500">Total Ertrag</span>
                     <span className="font-black font-mono text-sm">{formatMoney(getGroupTotal('3')*-1 + getGroupTotal('7')*-1)}</span>
                 </div>
            </div>
        </div>
    );
};
