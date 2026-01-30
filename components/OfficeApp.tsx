
import React, { useState, useEffect } from 'react';
import { db, initSettings } from '../db';
import { formatMoney } from './SharedUI';
import { Project } from '../officeTypes';
import { useAuth } from '../contexts/AuthContext'; // Import Auth

// UI Components
import { Sidebar } from './ui/Sidebar';
import { Navigationbar, MobileNavView } from './ui/Navigationbar';
import { Card } from './ui/Card';
import { ModuleHeader } from './ui/Layouts'; // Import ModuleHeader

// Modules
import BankManager from '../modules/bank/BankManager';
import SettingsManager from '../modules/settings/SettingsManager';
import CustomerOverview from '../modules/crm/CustomerOverview';
import AccountingManager from '../modules/accounting/AccountingManager';
import ProductOverview from '../modules/products/ProductOverview';
import PurchasingManager from '../modules/purchasing/PurchasingManager';
import SalesManager from '../modules/sales/SalesManager';
import ProjectManager from '../modules/projects/ProjectManager';
import DesignShowcase from '../modules/Design/DesignShowcase';

type OfficeView = 
    | 'dashboard' 
    // Menu Roots (Mobile primarily)
    | 'sales-root' 
    | 'purchasing-root' 
    | 'accounting-root'
    // Functional Modules
    | 'crm' 
    | 'sales' 
    | 'projects' 
    | 'purchasing' 
    | 'accounting' 
    | 'products' 
    | 'bank' 
    | 'settings' 
    | 'design-lab'
    | 'tasks';

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'custom';

interface OfficeAppProps {
  onExit: () => void;
}

// --- Menu Card Component (For Mobile Grids) ---
const MenuCard = ({ title, icon, subtitle, onClick, color = 'zinc' }: { title: string, icon: string, subtitle: string, onClick: () => void, color?: string }) => (
    <div 
        onClick={onClick}
        className={`bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 active:scale-95 transition-all cursor-pointer flex flex-col justify-between h-32 relative overflow-hidden group`}
    >
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity`}></div>
        <span className="text-3xl z-10">{icon}</span>
        <div className="z-10">
            <h3 className="font-bold text-sm text-zinc-900">{title}</h3>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{subtitle}</p>
        </div>
    </div>
);

const OfficeApp: React.FC<OfficeAppProps> = ({ onExit }) => {
  const { user, logout } = useAuth(); // Use Auth Context
  const [view, setView] = useState<OfficeView>('dashboard');
  
  // Dashboard State
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [dashboardStats, setDashboardStats] = useState({
      grossRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      activeProjectsCount: 0,
      activeProjectsList: [] as Project[],
  });

  // Deep Linking Params passed to modules
  const [targetParams, setTargetParams] = useState<{ docId?: number, customerId?: number, initialTab?: any }>({});

  useEffect(() => { initSettings(); }, []);
  useEffect(() => { calculateDashboardStats(); }, [timeRange, view]); 

  const calculateDashboardStats = async () => {
    // Simplified Stats calculation
    const [docs, expenses, projects] = await Promise.all([db.documents.toArray(), db.expenses.toArray(), db.projects.toArray()]);
    const grossRevenue = docs.filter(d => d.type === 'invoice' && d.status !== 'cancelled').reduce((sum, d) => sum + d.totalGross, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amountGross, 0);
    const netIncome = grossRevenue - totalExpenses;
    const activeProjectsList = projects.filter(p => p.status === 'active').slice(0, 5);

    setDashboardStats({ grossRevenue, totalExpenses, netIncome, activeProjectsCount: activeProjectsList.length, activeProjectsList });
  };

  const navigateTo = (viewName: OfficeView, params?: any) => {
      setTargetParams(params || {});
      setView(viewName);
  };

  const handleAccountingNavigate = (viewType: 'invoices' | 'expenses', id: number) => {
     if (viewType === 'invoices') navigateTo('sales', { initialTab: 'invoices', docId: id });
     else navigateTo('purchasing', { initialTab: 'expenses' }); 
  };

  const handleExit = () => {
      logout();
      onExit();
  };

  // --- Sub-View Renders ---

  const renderDashboard = () => (
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
        {/* Header */}
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-black brand-font uppercase text-zinc-900 leading-none">Moin, {user?.name.split(' ')[0]}</h1>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
                    {user?.companyId === 'tenant-001' ? 'Malergeschäft Borer' : user?.companyId}
                </p>
            </div>
            <button onClick={handleExit} className="text-[10px] font-bold text-zinc-300 uppercase hover:text-red-500 transition-colors">Abmelden</button>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-900 text-white border-zinc-800">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Umsatz</span>
                    <span className="w-2 h-2 rounded-full bg-olive-500 animate-pulse"></span>
                </div>
                <div className="text-2xl font-black brand-font">{formatMoney(dashboardStats.grossRevenue).replace('CHF ', '')}</div>
            </Card>
            <Card>
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ausgaben</span>
                </div>
                <div className="text-2xl font-black brand-font text-zinc-900">{formatMoney(dashboardStats.totalExpenses).replace('CHF ', '')}</div>
            </Card>
            <Card>
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Netto</span>
                </div>
                <div className={`text-2xl font-black brand-font ${dashboardStats.netIncome >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                    {formatMoney(dashboardStats.netIncome).replace('CHF ', '')}
                </div>
            </Card>
        </div>

        {/* Einstellungen Sektion (Explicitly requested in Dashboard) */}
        <div>
            <h3 className="text-sm font-black uppercase text-zinc-400 mb-4 tracking-widest">Einstellungen & Stammdaten</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MenuCard title="Firma" icon="🏢" subtitle="Stammdaten" onClick={() => navigateTo('settings')} />
                <MenuCard title="Finanzen" icon="📊" subtitle="MWST & Konten" onClick={() => navigateTo('settings')} />
                <MenuCard title="Vorlagen" icon="🎨" subtitle="Design & Layout" onClick={() => navigateTo('settings')} />
                <MenuCard title="Produkte" icon="📦" subtitle="Katalog" onClick={() => navigateTo('products')} />
                <MenuCard title="Team" icon="👥" subtitle="Rechte" onClick={() => navigateTo('settings')} />
                <MenuCard title="Design" icon="💅" subtitle="Showcase" onClick={() => navigateTo('design-lab')} />
            </div>
        </div>
      </div>
  );

  const renderSalesRoot = () => (
      <div className="flex flex-col h-full bg-slate-50">
          <ModuleHeader 
            title="Verkauf" 
            subtitle="Übersicht" 
            onBack={() => navigateTo('dashboard')} 
          />
          <div className="p-4 md:p-8 animate-in fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <MenuCard title="Aufträge" icon="🏗️" subtitle="Projekte" onClick={() => navigateTo('projects')} color="olive" />
                  <MenuCard title="Offerten" icon="📋" subtitle="Angebote" onClick={() => navigateTo('sales', {initialTab: 'quotes'})} color="blue" />
                  <MenuCard title="Rechnungen" icon="📄" subtitle="Faktura" onClick={() => navigateTo('sales', {initialTab: 'invoices'})} color="green" />
                  <MenuCard title="Gutschriften" icon="↩️" subtitle="Korrekturen" onClick={() => navigateTo('sales', {initialTab: 'invoices'})} />
                  <MenuCard title="Mahnwesen" icon="🔔" subtitle="Inkasso" onClick={() => navigateTo('sales', {initialTab: 'dunning'})} color="red" />
              </div>
          </div>
      </div>
  );

  const renderPurchasingRoot = () => (
      <div className="flex flex-col h-full bg-slate-50">
          <ModuleHeader 
            title="Einkauf" 
            subtitle="Übersicht" 
            onBack={() => navigateTo('dashboard')} 
          />
          <div className="p-4 md:p-8 animate-in fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <MenuCard title="Bestellungen" icon="📦" subtitle="Order" onClick={() => navigateTo('purchasing', {initialTab: 'orders'})} />
                  <MenuCard title="Lieferanten" icon="🚚" subtitle="Rechnungen" onClick={() => navigateTo('purchasing', {initialTab: 'invoices'})} />
                  <MenuCard title="Gutschriften" icon="📥" subtitle="Rückerstattung" onClick={() => navigateTo('purchasing', {initialTab: 'credits'})} />
                  <MenuCard title="Aufwendungen" icon="💸" subtitle="Allgemein" onClick={() => navigateTo('purchasing', {initialTab: 'expenses'})} />
                  <MenuCard title="Spesen" icon="☕" subtitle="Mitarbeiter" onClick={() => navigateTo('purchasing', {initialTab: 'spesen'})} />
              </div>
          </div>
      </div>
  );

  const renderAccountingRoot = () => (
      <div className="flex flex-col h-full bg-slate-50">
          <ModuleHeader 
            title="Buchhaltung" 
            subtitle="Übersicht" 
            onBack={() => navigateTo('dashboard')} 
          />
          <div className="p-4 md:p-8 animate-in fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <MenuCard title="Journal" icon="📒" subtitle="Buchungen" onClick={() => navigateTo('accounting', {initialTab: 'journal'})} />
                  <MenuCard title="Kontenblatt" icon="📑" subtitle="Kontoauszug" onClick={() => navigateTo('accounting', {initialTab: 'sheet'})} />
                  <MenuCard title="Kontenplan" icon="🗂️" subtitle="Struktur" onClick={() => navigateTo('accounting', {initialTab: 'accounts'})} />
                  <MenuCard title="Bilanz" icon="⚖️" subtitle="Abschluss" onClick={() => navigateTo('accounting', {initialTab: 'balance'})} />
                  <MenuCard title="Erfolg" icon="📈" subtitle="GuV" onClick={() => navigateTo('accounting', {initialTab: 'income'})} />
                  <MenuCard title="Bank" icon="🏦" subtitle="Abgleich" onClick={() => navigateTo('bank')} />
              </div>
          </div>
      </div>
  );

  const renderMainContent = () => {
    switch (view) {
      case 'dashboard': return renderDashboard();
      
      // Menu Roots (Grid Views)
      case 'sales-root': return renderSalesRoot();
      case 'purchasing-root': return renderPurchasingRoot();
      case 'accounting-root': return renderAccountingRoot();

      // Functional Modules
      case 'crm': return <CustomerOverview onBack={() => navigateTo('dashboard')} />;
      case 'sales': return <SalesManager onBack={() => navigateTo('sales-root')} initialTab={targetParams.initialTab} preselectedDocId={targetParams.docId} />;
      case 'projects': return <ProjectManager onBack={() => navigateTo('sales-root')} />;
      case 'purchasing': return <PurchasingManager onBack={() => navigateTo('purchasing-root')} />;
      case 'accounting': return <AccountingManager onBack={() => navigateTo('accounting-root')} onNavigate={handleAccountingNavigate} />;
      case 'products': return <ProductOverview onBack={() => navigateTo('dashboard')} />;
      case 'bank': return <BankManager onBack={() => navigateTo('accounting-root')} />;
      case 'settings': return <SettingsManager onBack={() => navigateTo('dashboard')} />;
      case 'design-lab': return <DesignShowcase onBack={() => navigateTo('dashboard')} />;
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* 1. Sidebar (Desktop) */}
      <Sidebar 
        currentView={view} 
        currentParams={targetParams} // Added currentParams prop
        onNavigate={(v, params) => navigateTo(v as OfficeView, params)} 
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full relative">
          {renderMainContent()}
      </main>

      {/* 3. Bottom Nav (Mobile) */}
      <Navigationbar 
        currentView={view} 
        onNavigate={(v) => navigateTo(v as OfficeView)} 
      />
    </div>
  );
};

export default OfficeApp;
