
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Project, Customer, OfficeDocument, Expense } from '../officeTypes';

const ProjectManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [stats, setStats] = useState<Record<number, {revenue: number, cost: number}>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await db.projects.toArray();
    setProjects(p);
    setCustomers(await db.customers.toArray());
    
    // Calculate Project Financials
    const docs = await db.documents.toArray();
    const exps = await db.expenses.toArray();
    const newStats: Record<number, {revenue: number, cost: number}> = {};
    
    p.forEach(proj => {
        if (!proj.id) return;
        const projRevenue = docs
            .filter(d => d.projectId === proj.id && d.type === 'invoice' && d.status !== 'cancelled')
            .reduce((sum, d) => sum + d.totalNet, 0);
        const projCost = exps
            .filter(e => e.projectId === proj.id)
            .reduce((sum, e) => sum + e.amountNet, 0);
        newStats[proj.id] = { revenue: projRevenue, cost: projCost };
    });
    setStats(newStats);
  };

  const save = async () => {
    if (!editing) return;
    if (editing.id) {
      await db.projects.update(editing.id, editing);
    } else {
      await db.projects.add(editing);
    }
    setEditing(null);
    loadData();
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

  return (
    <div>
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-black brand-font uppercase">Aufträge</h2>
         <button onClick={createNew} className="bg-olive-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-olive-700">+ Neuer Auftrag</button>
       </div>
       <button onClick={onBack} className="mb-4 text-xs font-bold text-zinc-400 uppercase hover:text-black">← Zurück</button>

       {editing ? (
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 max-w-2xl animate-in slide-in-from-right-4">
            <h3 className="font-bold uppercase text-sm mb-4">Auftrag / Projekt bearbeiten</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <select className="border p-2 rounded" value={editing.customerId} onChange={e => setEditing({...editing, customerId: parseInt(e.target.value)})}>
                        <option value={0}>Kunde wählen...</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.lastName}`}</option>
                        ))}
                    </select>
                    <select className="border p-2 rounded" value={editing.status} onChange={e => setEditing({...editing, status: e.target.value as any})}>
                        <option value="planning">Planung</option>
                        <option value="active">Aktiv / In Ausführung</option>
                        <option value="completed">Abgeschlossen</option>
                    </select>
                </div>
                <input className="w-full border p-2 rounded" placeholder="Projektbezeichnung (z.B. Renovation MFH Müller)" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="border p-2 rounded" value={editing.startDate} onChange={e => setEditing({...editing, startDate: e.target.value})} />
                    <input type="number" className="border p-2 rounded" placeholder="Budget CHF" value={editing.budget || ''} onChange={e => setEditing({...editing, budget: parseFloat(e.target.value)})} />
                </div>
                <textarea className="w-full border p-2 rounded h-24" placeholder="Projektnotizen..." value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} />
                
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setEditing(null)} className="px-4 py-2 text-zinc-500 font-bold uppercase text-xs">Abbrechen</button>
                    <button onClick={save} className="px-6 py-2 bg-zinc-900 text-white rounded font-bold uppercase text-xs">Speichern</button>
                </div>
            </div>
         </div>
       ) : (
         <div className="space-y-4">
           {projects.map(p => {
             const stat = stats[p.id!] || { revenue: 0, cost: 0 };
             const margin = stat.revenue - stat.cost;
             return (
               <div key={p.id} onClick={() => setEditing(p)} className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 hover:border-olive-500 cursor-pointer transition-all">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h4 className="font-bold text-lg">{p.name}</h4>
                          <p className="text-sm text-zinc-500">{getCustomerName(p.customerId)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold ${
                          p.status === 'active' ? 'bg-olive-100 text-olive-700' : 
                          p.status === 'completed' ? 'bg-zinc-100 text-zinc-500' : 'bg-yellow-50 text-yellow-600'
                      }`}>
                          {p.status}
                      </span>
                  </div>
                  
                  {/* Financial Mini-Dashboard */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-100">
                      <div>
                          <span className="block text-[9px] uppercase font-bold text-zinc-400">Ertrag (Rechn.)</span>
                          <span className="block font-bold text-zinc-800">CHF {stat.revenue.toLocaleString('de-CH', {minimumFractionDigits: 0})}</span>
                      </div>
                      <div>
                          <span className="block text-[9px] uppercase font-bold text-zinc-400">Aufwand</span>
                          <span className="block font-bold text-red-800">CHF {stat.cost.toLocaleString('de-CH', {minimumFractionDigits: 0})}</span>
                      </div>
                      <div className="text-right">
                          <span className="block text-[9px] uppercase font-bold text-zinc-400">Marge</span>
                          <span className={`block font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>CHF {margin.toLocaleString('de-CH', {minimumFractionDigits: 0})}</span>
                      </div>
                  </div>
               </div>
             );
           })}
         </div>
       )}
    </div>
  );
};

export default ProjectManager;
