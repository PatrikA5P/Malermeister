
import React, { useState } from 'react';
import { Project, Customer } from '../../officeTypes';

interface ProjectEditorProps {
    initialProject: Project;
    customers: Customer[];
    onSave: (project: Project) => void;
    onCancel: () => void;
}

const ProjectEditor: React.FC<ProjectEditorProps> = ({ initialProject, customers, onSave, onCancel }) => {
    const [editing, setEditing] = useState<Project>(initialProject);

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                     <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors">←</button>
                     <h2 className="text-xl font-black brand-font uppercase">{editing.id ? 'Bearbeiten' : 'Neuer Auftrag'}</h2>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">Kunde</label>
                        <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none" value={editing.customerId} onChange={e => setEditing({...editing, customerId: parseInt(e.target.value)})}>
                            <option value={0}>Wählen...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.lastName}`}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">Status</label>
                        <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none" value={editing.status} onChange={e => setEditing({...editing, status: e.target.value as any})}>
                            <option value="planning">Planung</option><option value="active">Aktiv</option><option value="completed">Abgeschlossen</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Projektname</label>
                    <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold" placeholder="MFH Renovation..." value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">Startdatum</label>
                        <input type="date" className="w-full border p-3 rounded-xl bg-zinc-50 outline-none" value={editing.startDate} onChange={e => setEditing({...editing, startDate: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">Budget CHF</label>
                        <input type="number" className="w-full border p-3 rounded-xl bg-zinc-50 outline-none" value={editing.budget || ''} onChange={e => setEditing({...editing, budget: parseFloat(e.target.value)})} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400">Notizen</label>
                    <textarea className="w-full border p-3 rounded-xl bg-zinc-50 outline-none h-32 resize-none" value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} />
                </div>
            </div>
            <div className="p-4 border-t border-zinc-100 flex gap-4 bg-white z-40">
                <button onClick={onCancel} className="flex-1 bg-zinc-100 text-zinc-500 py-4 rounded-xl font-bold uppercase text-xs">Abbrechen</button>
                <button onClick={() => onSave(editing)} className="flex-1 bg-olive-600 text-white py-4 rounded-xl font-bold uppercase text-xs shadow-lg">Speichern</button>
            </div>
        </div>
    );
};

export default ProjectEditor;
