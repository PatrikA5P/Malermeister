import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Project, Customer } from '../../officeTypes';
import { Toast, ToastType, formatMoney } from '../../components/SharedUI';
import ProjectEditor from './ProjectEditor';
import { useTranslation } from '../../i18n/useTranslation';
import { DataDisplay, DataDisplayColumn } from '../../components/ui/DataDisplay';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface ProjectOverviewProps {
  onBack: () => void;
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ onBack }) => {
  const { t } = useTranslation();
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
    setToast({ msg: t('toast.saved'), type: 'success' });
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
      return c ? (c.companyName || `${c.firstName} ${c.lastName}`) : t('common.unknown');
  };

  const handleExport = () => {
      const headers = [t('projects.title'), t('common.customer'), t('common.status'), t('projects.startDate'), t('projects.budget'), t('projects.revenue'), t('projects.cost')];
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
      link.download = `${t('projects.title')}_Export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: t('projects.exportComplete'), type: 'success' });
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

  const statusOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'planning', label: t('projects.statusPlanning') },
    { value: 'active', label: t('status.active') },
    { value: 'completed', label: t('status.completed') },
    { value: 'archived', label: t('status.archived') }
  ];

  const columns: DataDisplayColumn<Project>[] = [
    {
      key: 'name',
      label: t('projects.projectName'),
      cardPosition: 'title',
      render: (row) => row.name
    },
    {
      key: 'customer',
      label: t('common.customer'),
      cardPosition: 'subtitle',
      render: (row) => getCustomerName(row.customerId)
    },
    {
      key: 'status',
      label: t('common.status'),
      cardPosition: 'badge',
      render: (row) => (
        <Badge
          label={row.status === 'planning' ? t('projects.statusPlanning') : t(`status.${row.status}`)}
          variant={row.status === 'active' ? 'success' : row.status === 'completed' ? 'info' : 'default'}
        />
      )
    },
    {
      key: 'startDate',
      label: t('projects.startDate'),
      cardPosition: 'meta',
      render: (row) => row.startDate
    },
    {
      key: 'revenue',
      label: t('projects.revenue'),
      hideOnCard: true,
      align: 'right',
      render: (row) => formatMoney(stats[row.id!]?.revenue || 0)
    },
    {
      key: 'cost',
      label: t('projects.cost'),
      hideOnCard: true,
      align: 'right',
      render: (row) => <span className="text-red-600">{formatMoney(stats[row.id!]?.cost || 0)}</span>
    },
    {
      key: 'margin',
      label: t('projects.margin'),
      cardPosition: 'value',
      align: 'right',
      render: (row) => {
        const stat = stats[row.id!] || { revenue: 0, cost: 0 };
        const margin = stat.revenue - stat.cost;
        return <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>{formatMoney(margin)}</span>;
      }
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       <div className="sticky top-0 bg-slate-50 z-20 pt-6 pb-4 px-4 md:px-12 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/90">
         <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-4">
                 <Button variant="icon" onClick={onBack} icon="←" />
                 <div>
                    <h2 className="text-xl md:text-2xl font-black brand-font uppercase">{t('projects.title')}</h2>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">{t('projects.subtitle')}</p>
                 </div>
             </div>

             <div className="flex items-center gap-4 md:gap-6">
                <div className="text-right hidden md:block">
                    <span className="text-3xl font-black brand-font text-zinc-900">{projects.length}</span>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-widest">{t('projects.title')}</span>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 font-bold uppercase text-[10px] hover:border-zinc-400 hover:text-black transition-all shadow-sm">
                    <span className="hidden md:inline">{t('common.export')}</span>
                    <span>⬇</span>
                </button>
             </div>
         </div>

         <div className="flex gap-3">
             <div className="relative flex-1 transition-all">
                  <input
                    className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold"
                    placeholder={t('common.search')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
             </div>
             <button
               onClick={() => setShowFilters(!showFilters)}
               className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm ${showFilters ? 'bg-olive-50 border-olive-200 text-olive-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
             >
                <span className="hidden md:inline">{t('common.filter')}</span><span>⚡</span>
             </button>
             <Button variant="primary" onClick={createNew} className="hidden md:flex">
                 + {t('common.create')}
             </Button>
         </div>

         {showFilters && (
            <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">{t('common.status')} {t('common.filter')}</label>
                <div className="flex flex-wrap gap-2">
                    {statusOptions.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setFilterStatus(s.value)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${filterStatus === s.value ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300'}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
         )}
       </div>

       <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-24 pt-4">
         <DataDisplay
           columns={columns}
           data={filteredProjects}
           rowKey="id"
           onRowClick={(row) => setEditingProject(row)}
           emptyMessage={t('projects.noProjects')}
         />
       </div>

       <button onClick={createNew} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90">
           <span className="text-2xl">+</span>
       </button>
    </div>
  );
};

export default ProjectOverview;
