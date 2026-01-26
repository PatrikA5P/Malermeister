
import React, { useState, useRef } from 'react';
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
    
    const start = fromDate ? new Date(fromDate).getTime() : -8640000000000000; // Min Date
    const end = toDate ? new Date(toDate).getTime() : 8640000000000000; // Max Date

    ledger.forEach(b => {
        const t = new Date(b.date).getTime();
        if (t >= start && t <= end) {
            if (b.debitAccountId === accId) debit += b.amount;
            if (b.creditAccountId === accId) credit += b.amount;
        }
    });
    return { debit, credit, balance: debit - credit };
};

// --- 1. JOURNAL VIEW ---
export const JournalView = ({ ledger }: { ledger: LedgerBooking[] }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                            <th className="p-4 text-left font-bold text-zinc-500 text-xs uppercase tracking-wider w-24">Datum</th>
                            <th className="p-4 text-left font-bold text-zinc-500 text-xs uppercase tracking-wider">Buchungstext</th>
                            <th className="p-4 text-left font-bold text-zinc-500 text-xs uppercase tracking-wider">Soll</th>
                            <th className="p-4 text-left font-bold text-zinc-500 text-xs uppercase tracking-wider">Haben</th>
                            <th className="p-4 text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">Betrag</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {ledger.map((entry) => (
                            <tr key={entry.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="p-4 text-zinc-500 font-mono text-xs">{formatDate(entry.date)}</td>
                                <td className="p-4 font-medium text-zinc-900">
                                    <span className="block">{entry.text}</span>
                                    <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1 rounded">{entry.docRef}</span>
                                </td>
                                <td className="p-4 text-xs text-zinc-600">{entry.debitAccountName}</td>
                                <td className="p-4 text-xs text-zinc-600">{entry.creditAccountName}</td>
                                <td className="p-4 text-right font-mono font-bold text-zinc-900">
                                    {formatMoney(entry.amount)}
                                </td>
                            </tr>
                        ))}
                        {ledger.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Keine Buchungen vorhanden</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- HELPER COMPONENT FOR TREES ---
const ReportRow = ({ label, amount, level, bold = false, onClick, number, hideAmount = false, isResultLine = false }: any) => (
    <div 
        onClick={onClick}
        className={`flex justify-between items-center py-2 border-b ${isResultLine ? 'border-zinc-300 bg-zinc-50 mt-2 mb-2' : 'border-zinc-50 hover:bg-olive-50/30'} transition-colors ${onClick ? 'cursor-pointer' : ''}`}
        style={{ paddingLeft: isResultLine ? '16px' : `${level * 20 + 16}px`, paddingRight: '16px' }}
    >
        <div className="flex gap-3">
            {number && <span className="font-mono text-zinc-400 text-xs w-10">{number}</span>}
            <span className={`${bold || isResultLine ? 'font-black uppercase tracking-wide text-zinc-900' : 'font-medium text-zinc-700 text-sm'}`}>
                {label}
            </span>
        </div>
        {!hideAmount && (
            <span className={`font-mono ${bold || isResultLine ? 'font-black' : 'font-medium text-zinc-600'} ${amount < 0 ? 'text-red-600' : ''}`}>
                {amount === 0 ? '0.00' : formatMoney(amount)}
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
    
    // 3. Calculate Balance for this group (recursive)
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

    const groupTotal = calculateGroupTotal(group) * factor; // Apply factor (e.g. -1 for expense display)
    
    // Visibility Check
    if (!showZero && Math.abs(groupTotal) < 0.01 && directAccounts.length === 0) return null;

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

// --- 3. BALANCE SHEET VIEW (BILANZ) ---
export const BalanceSheetView = ({ accounts, groups, ledger, onSelectAccount }: any) => {
    const assetGroup = groups.find((g: AccountGroup) => g.number === '1');
    const liabilityGroup = groups.find((g: AccountGroup) => g.number === '2');

    const [viewType, setViewType] = useState<'all'|'assets'|'liabilities'>('all');
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showZero, setShowZero] = useState(false);
    const [showOpening, setShowOpening] = useState(false);
    const [showComparisons, setShowComparisons] = useState(false);
    const [exportMode, setExportMode] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);

    const calculateTotalForClass = (clsPrefix: string) => {
        return accounts.filter((a: Account) => a.number.startsWith(clsPrefix)).reduce((sum: number, acc: Account) => {
            return sum + getAccountBalance(acc.id!, ledger, undefined, filterDate).balance;
        }, 0);
    };

    const totalAssets = calculateTotalForClass('1');
    const totalLiabilities = calculateTotalForClass('2');
    
    const profit = accounts.filter((a: Account) => ['3','4','5','6','7','8'].includes(a.number.charAt(0)))
        .reduce((sum: number, acc: Account) => {
             return sum - getAccountBalance(acc.id!, ledger, undefined, filterDate).balance;
        }, 0);

    const handleExport = (type: 'pdf' | 'csv_values' | 'csv_structure') => {
        if (type === 'pdf') {
            if (typeof html2pdf === 'undefined') { alert('PDF Generator lädt noch...'); return; }
            setExportMode(true);
            setTimeout(() => {
                const element = printRef.current;
                const opt = {
                    margin: 10,
                    filename: `Bilanz_${filterDate}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save().then(() => setExportMode(false));
            }, 500);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                        {['all', 'assets', 'liabilities'].map(v => (
                            <button 
                                key={v}
                                onClick={() => setViewType(v as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewType === v ? 'bg-white shadow text-black' : 'text-zinc-500'}`}
                            >
                                {v === 'all' ? 'Alle' : v === 'assets' ? 'Aktiven' : 'Passiven'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <label className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold uppercase text-zinc-400">Bilanz per</label>
                            <input 
                                type="date" 
                                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold bg-white"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-50">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer">
                        <input type="checkbox" checked={showOpening} onChange={e => setShowOpening(e.target.checked)} className="rounded accent-olive-600" />
                        Nur Eröffnungsbuchungen
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer">
                        <input type="checkbox" checked={showComparisons} onChange={e => setShowComparisons(e.target.checked)} className="rounded accent-olive-600" />
                        Vorjahresvergleich
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer">
                        <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded accent-olive-600" />
                        Konten mit 0-Werten
                    </label>
                    <div className="flex gap-2 justify-end">
                        <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-olive-600 transition-all">Filter anwenden</button>
                        <div className="relative group">
                            <button className="bg-white border border-zinc-200 px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-zinc-50 transition-all">Export ▼</button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl hidden group-hover:block z-10 p-1">
                                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-zinc-50 rounded-lg text-xs font-bold">PDF mit Beträgen</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div ref={printRef} className={`grid grid-cols-1 ${viewType === 'all' ? 'md:grid-cols-2' : ''} gap-8 animate-in fade-in p-2 bg-white md:bg-transparent`}>
                {(viewType === 'all' || viewType === 'assets') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
                        <div className="border-b border-zinc-200 pb-4 mb-4 flex justify-between items-end">
                            <h3 className="text-lg font-black brand-font uppercase text-zinc-900">Aktiven</h3>
                            <span className="text-xs font-mono font-bold">{formatDate(filterDate)}</span>
                        </div>
                        {assetGroup && (
                            <RecursiveReportGroup 
                                group={assetGroup} 
                                allGroups={groups} 
                                accounts={accounts} 
                                ledger={ledger} 
                                level={0}
                                onSelectAccount={onSelectAccount}
                                toDate={filterDate}
                                showZero={showZero}
                                hideAmounts={false}
                            />
                        )}
                        <div className="mt-8 pt-4 border-t-2 border-black flex justify-between items-center">
                            <span className="font-black uppercase text-sm">Total Aktiven</span>
                            <span className="font-black font-mono text-lg">{formatMoney(totalAssets)}</span>
                        </div>
                    </div>
                )}

                {(viewType === 'all' || viewType === 'liabilities') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
                        <div className="border-b border-zinc-200 pb-4 mb-4 flex justify-between items-end">
                            <h3 className="text-lg font-black brand-font uppercase text-zinc-900">Passiven</h3>
                            <span className="text-xs font-mono font-bold">{formatDate(filterDate)}</span>
                        </div>
                        {liabilityGroup && (
                            <RecursiveReportGroup 
                                group={liabilityGroup} 
                                allGroups={groups} 
                                accounts={accounts} 
                                ledger={ledger} 
                                level={0}
                                onSelectAccount={onSelectAccount}
                                toDate={filterDate}
                                showZero={showZero}
                                hideAmounts={false}
                            />
                        )}
                        <div className="mt-4 pt-4 border-t border-zinc-100 mb-4">
                            <div className="flex justify-between items-center py-2 px-4 bg-zinc-50 rounded-lg">
                                <span className="font-bold text-sm text-zinc-600">Jahresgewinn / -verlust</span>
                                <span className={`font-mono font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatMoney(profit)}
                                </span>
                            </div>
                        </div>
                        <div className="mt-8 pt-4 border-t-2 border-black flex justify-between items-center">
                            <span className="font-black uppercase text-sm">Total Passiven</span>
                            <span className="font-black font-mono text-lg">{formatMoney(-totalLiabilities + profit)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 4. INCOME STATEMENT VIEW (ERFOLGSRECHNUNG) ---
export const IncomeStatementView = ({ accounts, groups, ledger, onSelectAccount }: any) => {
    // State
    const [viewType, setViewType] = useState<'all'|'revenue'|'expense'>('all');
    const [dateFrom, setDateFrom] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState<string>(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]);
    const [showZero, setShowZero] = useState(false);
    const [showComparisons, setShowComparisons] = useState(false);
    const [exportMode, setExportMode] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // Helpers
    const getGroupTotal = (classPrefix: string, excludeGroups: string[] = []) => {
        const rootGroups = groups.filter((g: AccountGroup) => g.number.startsWith(classPrefix) && g.parentGroupId === undefined);
        let total = 0;
        
        // Helper to sum recursively
        const sumRecursive = (grp: AccountGroup) => {
            if (excludeGroups.includes(grp.number)) return 0;
            const subs = groups.filter((g: AccountGroup) => g.parentGroupId === grp.id);
            const subTotal = subs.reduce((s: number, g: AccountGroup) => s + sumRecursive(g), 0);
            const accs = accounts.filter((a: Account) => a.groupId === grp.id);
            const accTotal = accs.reduce((s: number, a: Account) => s + getAccountBalance(a.id!, ledger, dateFrom, dateTo).balance, 0);
            return subTotal + accTotal;
        };

        rootGroups.forEach((g: AccountGroup) => total += sumRecursive(g));
        return total;
    };

    const FACTOR = -1;

    const totalRevenue = getGroupTotal('3') * FACTOR;
    const totalMaterial = getGroupTotal('4') * FACTOR;
    const grossProfit1 = totalRevenue + totalMaterial;
    const totalPersonnel = getGroupTotal('5') * FACTOR;
    const totalOperating = getGroupTotal('6', ['69']) * FACTOR;
    const ebit = grossProfit1 + totalPersonnel + totalOperating; 
    const totalFinance = getGroupTotal('69') * FACTOR;
    const totalNonOperating = getGroupTotal('7') * FACTOR;
    const ebt = ebit + totalFinance + totalNonOperating;
    const totalExtraordinary = getGroupTotal('8') * FACTOR; 
    const totalTaxes = getGroupTotal('89') * FACTOR;
    const annualResult = ebt + totalExtraordinary;

    const handleExport = (type: 'pdf') => {
        if (type === 'pdf') {
            if (typeof html2pdf === 'undefined') { alert('PDF Generator lädt noch...'); return; }
            setExportMode(true);
            setTimeout(() => {
                const element = printRef.current;
                const opt = {
                    margin: 10,
                    filename: `Erfolgsrechnung_${dateTo}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save().then(() => setExportMode(false));
            }, 500);
        }
    };

    const renderBlock = (groupPrefix: string, exclude: string[] = []) => {
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
                fromDate={dateFrom}
                toDate={dateTo}
                showZero={showZero}
                hideAmounts={false}
                factor={FACTOR}
                excludeGroups={exclude}
            />
        ));
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                        {['all', 'revenue', 'expense'].map(v => (
                            <button 
                                key={v}
                                onClick={() => setViewType(v as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewType === v ? 'bg-white shadow text-black' : 'text-zinc-500'}`}
                            >
                                {v === 'all' ? 'Alle' : v === 'revenue' ? 'Ertrag' : 'Aufwand'}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                            <input 
                                type="date" 
                                className="bg-transparent text-xs font-bold outline-none"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <span className="text-zinc-400">-</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-xs font-bold outline-none"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-50">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer">
                        <input type="checkbox" checked={showComparisons} onChange={e => setShowComparisons(e.target.checked)} className="rounded accent-olive-600" />
                        Vorjahresvergleich
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer">
                        <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded accent-olive-600" />
                        Konten mit 0-Werten
                    </label>
                    <div className="flex gap-2 justify-end col-span-2">
                        <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-olive-600 transition-all">Filter anwenden</button>
                        <button onClick={() => handleExport('pdf')} className="bg-white border border-zinc-200 px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-zinc-50 transition-all">Export PDF</button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 max-w-5xl mx-auto">
                <div className="border-b border-zinc-200 pb-4 mb-6 flex justify-between items-center">
                    <h3 className="text-xl font-black brand-font uppercase text-zinc-900">Erfolgsrechnung</h3>
                    <div className="text-right">
                        <span className="text-xs font-mono font-bold text-zinc-500">{formatDate(dateTo)}</span>
                    </div>
                </div>

                {(viewType === 'all' || viewType === 'revenue') && (
                    <div className="mb-8">
                        <h4 className="text-sm font-black uppercase text-zinc-400 mb-2 border-b border-zinc-100 pb-1">Betrieblicher Ertrag</h4>
                        {renderBlock('3')}
                        <ReportRow label="Total Betrieblicher Ertrag" amount={totalRevenue} isResultLine={true} />
                    </div>
                )}

                {(viewType === 'all' || viewType === 'expense') && (
                    <div className="mb-8">
                        <h4 className="text-sm font-black uppercase text-zinc-400 mb-2 border-b border-zinc-100 pb-1">Aufwand für Material, Handel, Dienstleistung</h4>
                        {renderBlock('4')}
                        <ReportRow label="Total Aufwand Material" amount={totalMaterial} isResultLine={true} />
                        <div className="mt-4 pt-2 border-t-2 border-zinc-200">
                            <ReportRow label="Bruttoergebnis I (Bruttogewinn)" amount={grossProfit1} bold={true} hideAmount={false} />
                        </div>
                    </div>
                )}

                {(viewType === 'all' || viewType === 'expense') && (
                    <div className="mb-8">
                        <h4 className="text-sm font-black uppercase text-zinc-400 mb-2 border-b border-zinc-100 pb-1">Personalaufwand</h4>
                        {renderBlock('5')}
                        <ReportRow label="Total Personalaufwand" amount={totalPersonnel} isResultLine={true} />
                    </div>
                )}

                {(viewType === 'all' || viewType === 'expense') && (
                    <div className="mb-8">
                        <h4 className="text-sm font-black uppercase text-zinc-400 mb-2 border-b border-zinc-100 pb-1">Betrieblicher Aufwand</h4>
                        {renderBlock('6', ['69'])}
                        <ReportRow label="Total Betrieblicher Aufwand" amount={totalOperating} isResultLine={true} />
                        <div className="mt-4 pt-2 border-t-2 border-zinc-200">
                            <ReportRow label="Betriebsergebnis vor Zinsen und Steuern (EBIT)" amount={ebit} bold={true} hideAmount={false} />
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <h4 className="text-sm font-black uppercase text-zinc-400 mb-2 border-b border-zinc-100 pb-1">Finanz & Nebenerfolg</h4>
                    {renderBlock('69')}
                    {renderBlock('7')}
                    <div className="mt-4 pt-2 border-t-2 border-zinc-200">
                        <ReportRow label="Unternehmenserfolg vor Steuern (EBT)" amount={ebt} bold={true} hideAmount={false} />
                    </div>
                </div>

                <div className="mb-8">
                    <h4 className="text-sm font-black uppercase text-zinc-400 mb-2 border-b border-zinc-100 pb-1">Ausserordentlich & Steuern</h4>
                    {renderBlock('8')}
                    <ReportRow label="Total A.o. / Steuern" amount={totalExtraordinary} isResultLine={true} />
                </div>

                <div className="mt-8 pt-6 border-t-4 border-black">
                    <div className="flex justify-between items-center text-xl">
                        <span className="font-black uppercase">Jahresergebnis</span>
                        <span className={`font-black font-mono ${annualResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMoney(annualResult)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
