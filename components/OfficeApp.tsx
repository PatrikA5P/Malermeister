
import React, { useState, useEffect, useMemo } from 'react';
import { db, initSettings } from '../db';
import BankManager from '../modules/bank/BankManager';
import SettingsManager from '../modules/settings/SettingsManager';
import CustomerOverview from '../modules/crm/CustomerOverview';
import AccountingManager from '../modules/accounting/AccountingManager';
import ProductOverview from '../modules/products/ProductOverview';
import SalesManager, { SalesTab } from '../modules/sales/SalesManager';
import PurchasingManager from '../modules/purchasing/PurchasingManager';
import DesignShowcase from './DesignShowcase';
import { Project, OfficeDocument, Expense } from '../officeTypes';
import { formatMoney, formatDate } from './SharedUI';

type OfficeView = 'dashboard' | 'crm' | 'sales' | 'purchasing' | 'accounting' | 'products' | 'bank' | 'settings' | 'design-lab';
type TimeRange = 'today' | 'week' | 'month' | 'year' | 'custom';

// --- Simple SVG Chart Component ---
const DashboardChart = ({ data, range }: { data: { label: string, income: number, expense: number }[], range: TimeRange }) => {
    if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-zinc-300 text-xs font-bold uppercase tracking-widest">Keine Daten für diesen Zeitraum</div>;

    const height = 140;
    const width = 100; // percentages
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 100);
    
    // Helper to map value to Y coordinate (inverted because SVG 0 is top)
    const getY = (val: number) => height - (val / maxVal) * height * 0.8; // 0.8 to leave top padding
    const getX = (idx: number) => (idx / (data.length - 1)) * 100;

    // Generate Paths
    let incomePath = `M 0,${height} `;
    
    data.forEach((d, i) => {
        const x = getX(i);
        // Smooth curve would require bezier control points, keeping linear for robustness with variable data points
        incomePath += `L ${x},${getY(d.income)} `;
    });

    // Close paths for area fill
    const incomeArea = `${incomePath} L 100,${height} Z`;
    
    // Expenses as thin bars
    const barWidth = Math.max(1, 60 / data.length); // Dynamic width

    return (
        <div className="relative h-48 w-full animate-in fade-in duration-700">
            <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                <line x1="0" y1={height} x2="100" y2={height} stroke="#f4f4f5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={height*0.66} x2="100" y2={height*0.66} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={height*0.33} x2="100" y2={height*0.33} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
                
                {/* Income Area (Smooth-ish) */}
                <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#84cc16" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={incomeArea} fill="url(#incomeGrad)" stroke="none" />
                <path d={incomePath.trim()} fill="none" stroke="#65a30d" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

                {/* Expense Bars (Overlay) */}
                {data.map((d, i) => (
                    <rect 
                        key={i}
                        x={`${getX(i) - (barWidth/2)}`} 
                        y={getY(d.expense)} 
                        width={barWidth} 
                        height={height - getY(d.expense)} 
                        fill="#fca5a5" 
                        rx="0.2"
                        opacity="0.6"
                    />
                ))}
            </svg>
            
            {/* Labels X-Axis */}
            <div className="flex justify-between mt-2 text-[9px] text-zinc-300 font-bold uppercase tracking-wider px-1">
                <span>{data[0]?.label}</span>
                <span>{data[Math.floor(data.length/2)]?.label}</span>
                <span>{data[data.length-1]?.label}</span>
            </div>
        </div>
    );
};

const OfficeApp: React.FC = () => {
  const [view, setView] = useState<OfficeView>('dashboard');
  
  // Dashboard State
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [showChart, setShowChart] = useState(false);
  
  const [dashboardStats, setDashboardStats] = useState({
      grossRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      activeProjectsCount: 0,
      activeProjectsList: [] as Project[],
      chartData: [] as { label: string, income: number, expense: number }[]
  });

  // Navigation State
  const [salesInitialTab, setSalesInitialTab] = useState<SalesTab | undefined>(undefined);
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(undefined);

  useEffect(() => {
    initSettings();
  }, []);

  useEffect(() => {
      calculateDashboardStats();
  }, [timeRange, customStart, customEnd, view]); 

  const getDateRange = () => {
      const now = new Date();
      let start = new Date();
      let end = new Date();

      switch (timeRange) {
          case 'today':
              start = new Date(now.setHours(0,0,0,0));
              end = new Date(now.setHours(23,59,59,999));
              break;
          case 'week':
              const day = now.getDay() || 7; 
              start.setDate(now.getDate() - day + 1);
              start.setHours(0,0,0,0);
              end = new Date(start);
              end.setDate(start.getDate() + 6);
              end.setHours(23,59,59,999);
              break;
          case 'month':
              start = new Date(now.getFullYear(), now.getMonth(), 1);
              end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
              break;
          case 'year':
              start = new Date(now.getFullYear(), 0, 1);
              end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
              break;
          case 'custom':
              start = new Date(customStart);
              end = new Date(customEnd);
              end.setHours(23, 59, 59);
              break;
      }
      return { start, end };
  };

  const calculateDashboardStats = async () => {
    const { start, end } = getDateRange();
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const [docs, expenses, projects] = await Promise.all([
        db.documents.toArray(),
        db.expenses.toArray(),
        db.projects.toArray()
    ]);

    // 1. Filter Data
    const relevantInvoices = docs.filter(d => 
        d.type === 'invoice' && 
        d.status !== 'cancelled' && 
        d.date >= startStr && d.date <= endStr
    );

    const relevantExpenses = expenses.filter(e => 
        e.date >= startStr && e.date <= endStr
    );

    // 2. Totals
    const grossRevenue = relevantInvoices.reduce((sum, d) => sum + d.totalGross, 0);
    const netRevenue = relevantInvoices.reduce((sum, d) => sum + d.totalNet, 0);
    const totalExpensesGross = relevantExpenses.reduce((sum, e) => sum + e.amountGross, 0);
    const totalExpensesNet = relevantExpenses.reduce((sum, e) => sum + e.amountNet, 0);
    const netIncome = netRevenue - totalExpensesNet;

    // 3. Projects
    const activeProjectsList = projects.filter(p => 
        p.status === 'active' || (p.startDate >= startStr && p.startDate <= endStr && p.status !== 'archived')
    ).slice(0, 5); // Limit for UI

    // 4. Chart Data Generation
    const chartData: { label: string, income: number, expense: number }[] = [];
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    
    // Group by Day (if range <= 31 days) or Month (if range > 31 days)
    const isMonthlyView = daysDiff > 32;

    if (isMonthlyView) {
        // Group by Month
        for (let i = 0; i <= 11; i++) { // Assuming Year view or similar
            const mStart = new Date(start.getFullYear(), i, 1);
            if (mStart > end) break;
            
            const mStr = mStart.toLocaleString('de-CH', { month: 'short' });
            
            // Sum for month
            const mInvoices = relevantInvoices.filter(d => new Date(d.date).getMonth() === i);
            const mExpenses = relevantExpenses.filter(e => new Date(e.date).getMonth() === i);
            
            chartData.push({
                label: mStr,
                income: mInvoices.reduce((s,d) => s + d.totalGross, 0),
                expense: mExpenses.reduce((s,e) => s + e.amountGross, 0)
            });
        }
    } else {
        // Group by Day
        const curr = new Date(start);
        while (curr <= end) {
            const dStr = curr.toISOString().split('T')[0];
            const dLabel = curr.getDate().toString();
            
            const dInvoices = relevantInvoices.filter(d => d.date === dStr);
            const dExpenses = relevantExpenses.filter(e => e.date === dStr);

            chartData.push({
                label: dLabel,
                income: dInvoices.reduce((s,d) => s + d.totalGross, 0),
                expense: dExpenses.reduce((s,e) => s + e.amountGross, 0)
            });
            curr.setDate(curr.getDate() + 1);
        }
    }

    setDashboardStats({
        grossRevenue,
        totalExpenses: totalExpensesGross,
        netIncome,
        activeProjectsCount: activeProjectsList.length,
        activeProjectsList,
        chartData
    });
  };

  const handleNavigate = (targetView: 'invoices' | 'expenses', id: number) => {
     if (targetView === 'invoices') {
        setSelectedDocId(id);
        setSalesInitialTab('invoices');
        setView('sales');
     } else {
         setView('purchasing');
     }
  };

  const openSales = (tab?: SalesTab) => {
      setSalesInitialTab(tab);
      setSelectedDocId(undefined); // Reset deep link
      setView('sales');
  };

  const toggleTimeRange = () => {
      const ranges: TimeRange[] = ['today', 'week', 'month', 'year', 'custom'];
      const nextIdx = (ranges.indexOf(timeRange) + 1) % ranges.length;
      setTimeRange(ranges[nextIdx]);
  };

  const timeRangeLabel = useMemo(() => {
      switch(timeRange) {
          case 'today': return 'Heute';
          case 'week': return 'Diese Woche';
          case 'month': return 'Dieser Monat';
          case 'year': return 'Dieses Jahr';
          case 'custom': return 'Zeitraum';
      }
  }, [timeRange]);

  const renderContent = () => {
    switch (view) {
      case 'crm': return <CustomerOverview onBack={() => { setView('dashboard'); }} />;
      
      case 'sales': return (
          <SalesManager 
            onBack={() => { setView('dashboard'); }}
            initialTab={salesInitialTab}
            preselectedDocId={selectedDocId}
          />
      );

      case 'purchasing': return (
          <PurchasingManager onBack={() => { setView('dashboard'); }} />
      );

      case 'accounting': return (
        <AccountingManager 
            onBack={() => { setView('dashboard'); }} 
            onNavigate={handleNavigate}
        />
      );
      case 'products': return <ProductOverview onBack={() => { setView('dashboard'); }} />;
      case 'bank': return <BankManager onBack={() => { setView('dashboard'); }} />;
      case 'settings': return <SettingsManager onBack={() => setView('dashboard')} />;
      case 'design-lab': return <DesignShowcase onBack={() => setView('dashboard')} />;
      default:
        return (
          <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            
            {/* --- MAIN TITLE --- */}
            <h1 className="text-3xl font-black brand-font uppercase text-zinc-900 leading-none px-2 md:px-0">Büroübersicht</h1>

            {/* --- INTELLIGENT DASHBOARD CONTAINER --- */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-zinc-100 overflow-hidden">
                
                {/* 1. Header (Time Toggle only) */}
                <div className="px-8 pt-6 flex justify-end items-center">
                    <div className="flex flex-col items-end gap-2">
                        <button 
                            onClick={toggleTimeRange}
                            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-pulse"></span>
                            {timeRangeLabel}
                        </button>
                        
                        {timeRange === 'custom' && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2 bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                                <input type="date" className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-[10px] font-bold outline-none" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                                <span className="text-zinc-300 self-center font-black text-[10px]">-</span>
                                <input type="date" className="bg-white border border-zinc-200 rounded-md px-2 py-1 text-[10px] font-bold outline-none" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-50 mt-2">
                    
                    {/* 2. Left: Chart & Clickable KPIs */}
                    <div className="lg:col-span-2 p-8 pt-2 flex flex-col justify-end">
                        
                        {/* CHART (Collapsible) - Appears ABOVE KPIs when open */}
                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showChart ? 'max-h-[300px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
                             <div className="w-full">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="text-[9px] font-bold uppercase text-zinc-300 tracking-widest">Performance Verlauf</span>
                                </div>
                                <DashboardChart data={dashboardStats.chartData} range={timeRange} />
                             </div>
                        </div>

                        {/* CLICKABLE KPI ROW */}
                        <div 
                            onClick={() => setShowChart(!showChart)}
                            className="grid grid-cols-3 gap-4 cursor-pointer group p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100"
                            title={showChart ? "Grafik ausblenden" : "Grafik anzeigen"}
                        >
                            <div className="flex flex-col items-center md:items-start">
                                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 group-hover:text-zinc-600 transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-olive-500"></span>
                                    Umsatz
                                </span>
                                <div className="text-lg md:text-xl font-black brand-font text-zinc-900 truncate">
                                    {formatMoney(dashboardStats.grossRevenue).replace('CHF ', '')}
                                    <span className="text-[10px] text-zinc-400 ml-1 font-sans font-medium">CHF</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 group-hover:text-zinc-600 transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-300"></span>
                                    Ausgaben
                                </span>
                                <div className="text-lg md:text-xl font-black brand-font text-zinc-900 truncate">
                                    {formatMoney(dashboardStats.totalExpenses).replace('CHF ', '')}
                                    <span className="text-[10px] text-zinc-400 ml-1 font-sans font-medium">CHF</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 group-hover:text-zinc-600 transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
                                    Netto
                                </span>
                                <div className={`text-lg md:text-xl font-black brand-font truncate ${dashboardStats.netIncome >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                                    {formatMoney(dashboardStats.netIncome).replace('CHF ', '')}
                                    <span className="text-[10px] text-zinc-400 ml-1 font-sans font-medium">CHF</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-2 text-center">
                             <span className={`text-[10px] font-bold uppercase tracking-widest text-zinc-200 transition-all ${showChart ? 'opacity-0' : 'opacity-100 animate-pulse'}`}>
                                ▼ Details anzeigen
                             </span>
                             {showChart && <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-200">▲ Details ausblenden</span>}
                        </div>
                    </div>

                    {/* 3. Right: Active Projects */}
                    <div className="p-8 bg-zinc-50/30 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">Laufende Aufträge</h3>
                            <button onClick={() => openSales('orders')} className="text-zinc-400 text-[10px] font-bold uppercase hover:text-black transition-colors">Alle →</button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                            {dashboardStats.activeProjectsList.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-300">
                                    <span className="text-2xl mb-2">📭</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Keine aktiven Projekte</span>
                                </div>
                            ) : (
                                dashboardStats.activeProjectsList.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => openSales('orders')} 
                                        className="group bg-white p-3 rounded-xl border border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-olive-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-200 group-hover:bg-olive-500 transition-colors"></div>
                                        <div className="pl-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-xs text-zinc-900 truncate pr-2">{p.name}</h4>
                                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-50 text-zinc-400 group-hover:bg-olive-50 group-hover:text-olive-700 transition-colors`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-zinc-400">{p.startDate}</span>
                                                <span className="text-[10px] font-bold text-zinc-700">{p.budget ? formatMoney(p.budget) : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <button onClick={() => openSales('orders')} className="w-full mt-6 py-3 border border-dashed border-zinc-300 text-zinc-400 rounded-xl text-[10px] font-bold uppercase hover:border-olive-400 hover:text-olive-600 hover:bg-olive-50 transition-all">
                            + Neuer Auftrag
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODULE GRID (Legacy) --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {/* SALES GROUP */}
               <button onClick={() => openSales()} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group relative overflow-hidden">
                    <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">💼</span>
                    <h3 className="font-bold text-sm text-zinc-900">Verkauf</h3>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Offerten & Rechnungen</p>
               </button>

               <button onClick={() => setView('purchasing')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                 <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">🛒</span>
                 <h3 className="font-bold text-sm text-zinc-900">Einkauf</h3>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Kreditoren & Spesen</p>
               </button>

               <button onClick={() => setView('crm')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                 <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">👥</span>
                 <h3 className="font-bold text-sm text-zinc-900">Kontakte</h3>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Kunden & Lieferanten</p>
               </button>
               
               <button onClick={() => setView('accounting')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                 <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">📊</span>
                 <h3 className="font-bold text-sm text-zinc-900">Buchhaltung</h3>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Finanzübersicht</p>
               </button>

               <button onClick={() => openSales('orders')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                 <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">🏗️</span>
                 <h3 className="font-bold text-sm text-zinc-900">Aufträge</h3>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Projektmanagement</p>
               </button>

               <button onClick={() => setView('products')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                 <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">📦</span>
                 <h3 className="font-bold text-sm text-zinc-900">Produkte</h3>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Lager & Leistungen</p>
               </button>
               
               <button onClick={() => setView('bank')} className="bg-white hover:bg-zinc-50 p-6 rounded-2xl shadow-sm border border-zinc-200 transition-all text-left group">
                 <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">🏦</span>
                 <h3 className="font-bold text-sm text-zinc-900">Bank</h3>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Transaktionen</p>
               </button>

               <button onClick={() => setView('design-lab')} className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-6 rounded-2xl shadow-lg border border-zinc-800 transition-all text-left group hover:shadow-xl">
                 <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform duration-300">🎨</span>
                 <h3 className="font-bold text-sm text-white">Design Labor</h3>
                 <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">UI & Styleguide</p>
               </button>
            </div>
            
            <div className="flex justify-center mt-8">
                 <button onClick={() => setView('settings')} className="flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-100 text-zinc-500 font-bold uppercase text-xs hover:bg-zinc-200 transition-colors">
                    <span>⚙️</span> Einstellungen
                 </button>
            </div>
            
            <a href="#home" className="block text-center text-[10px] font-bold text-zinc-300 uppercase mt-8 hover:text-black transition-colors">← Zurück zur Website</a>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="h-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default OfficeApp;
