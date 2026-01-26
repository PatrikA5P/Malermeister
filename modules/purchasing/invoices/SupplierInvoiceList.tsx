
import React, { useState, useEffect } from 'react';
import { db } from '../../../db';
import { OfficeDocument } from '../../../officeTypes';
import { formatMoney, formatDate, Toast, ToastType } from '../../../components/SharedUI';
import SupplierInvoiceEditor from './SupplierInvoiceEditor';

const SupplierInvoiceList: React.FC = () => {
    const [docs, setDocs] = useState<OfficeDocument[]>([]);
    const [editing, setEditing] = useState<OfficeDocument | null>(null);
    const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

    // Determines if we are in "Create" mode (Step 1 of Wizard)
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        const d = await db.documents.where('type').equals('supplier_invoice').reverse().toArray();
        setDocs(d);
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setEditing(null);
    };

    const handleEdit = (doc: OfficeDocument) => {
        setEditing(doc);
        setIsCreating(false);
    };

    const handleSave = async (doc: OfficeDocument) => {
        if (doc.id) await db.documents.update(doc.id, doc as any);
        else await db.documents.add(doc);
        setEditing(null);
        setIsCreating(false);
        load();
        setToast({ msg: 'Rechnung erfasst', type: 'success' });
    };

    const handleDuplicate = async (doc: OfficeDocument) => {
        const copy = { ...doc, id: undefined, docNumber: doc.docNumber + '-COPY', status: 'draft' as const };
        await db.documents.add(copy);
        load();
        setToast({ msg: 'Dupliziert', type: 'success' });
    };

    const handleDelete = async (id: number) => {
        if(confirm("Wirklich löschen?")) {
            await db.documents.delete(id);
            load();
            setEditing(null);
            setToast({ msg: 'Gelöscht', type: 'info' });
        }
    };

    if (editing || isCreating) {
        return (
            <SupplierInvoiceEditor 
                initialDoc={editing} 
                onSave={handleSave} 
                onCancel={() => { setEditing(null); setIsCreating(false); }}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="px-4 md:px-8 pt-4 pb-4">
                <div className="flex justify-between items-center mb-4">
                    <input className="bg-white border border-zinc-200 p-3 rounded-xl text-sm font-bold w-full md:w-64 outline-none" placeholder="Suchen..." />
                    <button onClick={handleCreateNew} className="bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-olive-600 transition-all">+ Eingang</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 space-y-3">
                {docs.map(d => (
                    <div key={d.id} onClick={() => handleEdit(d)} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 hover:border-olive-500 cursor-pointer group transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono font-bold text-zinc-500 text-xs">{d.docNumber}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${d.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{d.status}</span>
                                </div>
                                <h4 className="font-bold text-zinc-900">{d.client.name || 'Lieferant'}</h4>
                                <p className="text-xs text-zinc-400">{d.title ? `Ref: ${d.title}` : formatDate(d.date)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-lg text-zinc-900">{formatMoney(d.totalGross)}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {docs.length === 0 && <div className="text-center text-zinc-400 py-10 font-bold uppercase text-xs tracking-widest">Keine Rechnungen</div>}
            </div>
        </div>
    );
};

export default SupplierInvoiceList;
