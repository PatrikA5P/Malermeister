
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { Project, Customer } from '../../officeTypes';
import { Toast, ToastType, formatMoney } from '../../components/SharedUI';
import { ModuleHeader, SearchToolbar } from '../../components/ui/Layouts';
import { Table, TableColumn } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import ProjectEditor from '../sales/orders/ProjectEditor'; // Reusing existing editor for now

const ProjectManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Record<number, {revenue: number, cost: number}>>({});
  
  const [editing, setEditing] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'planning' | 'done'>('active');
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

  // Table State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const p = await db.projects.toArray();
    setProjects(p);
    setCustomers(await db.customers.toArray());
    
    // Calculate Stats
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
    setEditing(null);
    loadData();
    setToast({ msg: 'Auftrag gespeichert', type: 'success' });
  };

  const createNew = () => {
    setEditing({
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

  // Filter & Sort
  const handleSort = (key: string) => {
      setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredProjects = useMemo(() => {
      let data = [...projects];
      if (searchTerm) {
          const s = searchTerm.toLowerCase();
          data = data.filter(p => p.name.toLowerCase().includes(s));
      }
      if (activeTab === 'active') data = data.filter(p => p.status === 'active');
      if (activeTab === 'planning') data = data.filter(p => p.status === 'planning');
      if (activeTab === 'done') data = data.filter(p => p.status === 'completed' || p.status === 'archived');

      return data.sort((a: any, b: any) => {
          if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
          if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [projects, searchTerm, activeTab, sortConfig]);

  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return filteredProjects.slice(start, start + rowsPerPage);
  }, [filteredProjects, currentPage, rowsPerPage]);

  const columns: TableColumn<Project>[] = [
      { key: 'name', label: 'Projekt', sortable: true, render: (p) => <span className="font-bold text-zinc-900">{p.name}</span> },
      { key: 'customerId', label: 'Kunde', sortable: true, render: (p) => getCustomerName(p.customerId) },
      { key: 'status', label: 'Status', render: (p) => <Badge label={p.status} /> },
      { key: 'startDate', label: 'Start', sortable: true, width: '100px' },
      { key: 'stats', label: 'Finanzen', align: 'right', render: (p) => {
          const s = stats[p.id!] || {revenue:0, cost:0};
          const margin = s.revenue - s.cost;
          return (
              <div className="flex flex-col items-end text-[10px]">
                  <span className="font-bold">{formatMoney(s.revenue)}</span>
                  <span className={`${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>Gewinn: {formatMoney(margin)}</span>
              </div>
          );
      }},
      { key: 'actions', label: '', width: '50px', align: 'right', render: (p) => (
          <button onClick={(e) => { e.stopPropagation(); setEditing(p); }} className="p-2 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black">✏️</button>
      )}
  ];

  const Tabs = (
      <div className="flex bg-zinc-100 p-1 rounded-xl mr-auto">
        {[{id:'active',l:'Laufend'},{id:'planning',l:'Planung'},{id:'done',l:'Erledigt'},{id:'all',l:'Alle'}].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === t.id ? 'bg-white shadow text-black' : 'text-zinc-500'}`}>{t.l}</button>
        ))}
      </div>
  );

  if (editing) {
      return (
          <ProjectEditor 
            initialProject={editing}
            customers={customers}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
      );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       <ModuleHeader 
           title="Aufträge"
           subtitle="Projektmanagement"
           onBack={onBack}
           stats={[{value: projects.length, label: 'Projekte'}]}
       >
           <div className="mt-4">
               <SearchToolbar 
                   searchTerm={searchTerm}
                   onSearchChange={setSearchTerm}
                   placeholder="Projekt suchen..."
                   startAction={Tabs}
                   onNewClick={createNew}
                   newLabel="Auftrag"
               />
           </div>
       </ModuleHeader>

       <div className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
           <Table 
               columns={columns}
               data={paginatedData}
               rowKey="id"
               onRowClick={(p) => setEditing(p)}
               sortConfig={sortConfig}
               onSort={handleSort}
               currentPage={currentPage}
               totalPages={Math.ceil(filteredProjects.length / rowsPerPage)}
               onPageChange={setCurrentPage}
               totalItems={filteredProjects.length}
               rowsPerPage={rowsPerPage}
               onRowsPerPageChange={setRowsPerPage}
           />
       </div>
    </div>
  );
};

export default ProjectManager;
