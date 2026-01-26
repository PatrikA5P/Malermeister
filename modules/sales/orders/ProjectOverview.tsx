
import React, { useState, useEffect } from 'react';
import { db } from '../../../db';
import { Project, Customer } from '../../../officeTypes';
import { Toast, ToastType } from '../../../components/SharedUI';
import ProjectEditor from './ProjectEditor';

const ProjectOverview: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Record<number, {revenue: number, cost: number}>>({});
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const p = await db.projects.toArray();
    setProjects(p);
    setCustomers(await db.customers.toArray());
    
    const docs = await db.documents.toArray();
    const exps = await db.expenses.toArray();
    const newStats: Record<number, {revenue: number, cost: number}> = {};
    p.forEach(proj => {
        if (!proj.id) return;
        const projRevenue = docs.filter(d => d.projectId === proj.id && d.type === 'invoice' && d.status !== 'cancelled').reduce((sum, d) => sum + d.totalNet, 0);
        const projCost = exps.filter(e => e.projectId === proj.id).reduce((sum, e) => sum + e.amountNet, 0);
        newStats[proj.id] = { revenue: projRevenue, cost: projCost };
    });
    setStats(newStats);
  };

  const handleSave = async (project: Project) => {
    if (project.id) await db.projects.update(project.id, project);
    else await db.projects.add(project);
    setEditingProject(null);
    loadData();
    setToast({ msg: 'Auftrag gespeichert', type: 'success' });
  };

  const createNew = () => {
    setEditingProject({
      customerId: customers[0]?.id || 0,
      name: '',
      status: 'planning',
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const getCustomerName = (id: number) => {
      const c = customers.find(x => x.id === id);
      return c ? (c.companyName || `${c.firstName} ${c.lastName}`) : 'Unbekannt';
  };

  const handleExport = () => {
      const headers = ['Projekt', 'Kunde', 'Status', 'Startdatum', 'Budget', 'Ertrag', 'Aufwand'];
      const rows = projects.map(p => {
          const s = stats[p.id!] || { revenue: 0, cost: 0 };
          return [p.name, getCustomerName(p.customerId), p.status, p.startDate, p.budget, s.revenue, s.cost]
            .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';');
      });
      const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Auftraege_Export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: 'Export fertig', type: 'success' });
  };

  const filteredProjects = projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
  });

  if (editingProject) {
      return (
          <ProjectEditor 
            initialProject={editingProject}
            customers={customers}
            onSave={handleSave}
            onCancel={() => setEditingProject(null)}
          />
      );
  }

  // Remove global Header, keep Toolbar
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       <div className="pt-4 px-6 md:px-12 bg-slate-50 border-b border-zinc-200/50 pb-4">
         <div className="flex gap-3">
             <div className="relative flex-1 transition-all">
                  <input className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" placeholder="Auftrag suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
             </div>
             <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm ${showFilters ? 'bg-olive-50 border-olive-200 text-olive-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                <span className="hidden md:inline">Filter</span><span>⚡</span>
             </button>
             <button onClick={createNew} className="hidden md:flex bg-zinc-900 hover:bg-olive-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg whitespace-nowrap items-center gap-2">
                 <span>+</span><span>Erfassen</span>
             </button>
         </div>

         {showFilters && (
            <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">Status Filter</label>
                <div className="flex flex-wrap gap-2">
                    {['all', 'planning', 'active', 'completed', 'archived'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${filterStatus === s ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300'}`}>
                            {s === 'all' ? 'Alle' : s}
                        </button>
                    ))}
                </div>
            </div>
         )}
       </div>

       <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-24 pt-4">
         <div className="space-y-3">
           {filteredProjects.map(p => {
             const stat = stats[p.id!] || { revenue: 0, cost: 0 };
             const margin = stat.revenue - stat.cost;
             return (
               <div key={p.id} onClick={() => setEditingProject(p)} className="relative p-4 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all cursor-pointer hover:border-olive-400 active:scale-[0.98] group">
                  <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-base truncate pr-2 text-zinc-900">{p.name}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${p.status === 'active' ? 'bg-olive-100 text-olive-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {p.status}
                      </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mb-3 truncate">{getCustomerName(p.customerId)}</p>
                  
                  {/* Financial Mini-Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-50 text-[10px]">
                      <div>
                          <span className="block font-bold text-zinc-400 uppercase tracking-wider">Ertrag</span>
                          <span className="block font-bold text-zinc-900">CHF {stat.revenue.toFixed(0)}</span>
                      </div>
                      <div>
                          <span className="block font-bold text-zinc-400 uppercase tracking-wider">Aufwand</span>
                          <span className="block font-bold text-red-700">CHF {stat.cost.toFixed(0)}</span>
                      </div>
                      <div className="text-right">
                          <span className="block font-bold text-zinc-400 uppercase tracking-wider">Marge</span>
                          <span className={`block font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>CHF {margin.toFixed(0)}</span>
                      </div>
                  </div>
               </div>
             );
           })}
           {filteredProjects.length === 0 && <div className="text-center text-zinc-400 py-10">Keine Aufträge gefunden.</div>}
         </div>
       </div>

       <button onClick={createNew} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90">
           <span className="text-2xl">+</span>
       </button>
    </div>
  );
};

export default ProjectOverview;
