
import React, { useState, useEffect } from 'react';
import { db } from '../../../db';
import { OfficeDocument } from '../../../officeTypes';
import { formatMoney, formatDate, Toast, ToastType } from '../../../components/SharedUI';
import PurchaseEditor from '../components/PurchaseEditor';

const SupplierCreditList: React.FC = () => {
    const [docs, setDocs] = useState<OfficeDocument[]>([]);
    const [editing, setEditing] = useState<OfficeDocument | null>(null);
    const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        const d = await db.documents.where('type').equals('supplier_credit').reverse().toArray();
        setDocs(d);
    };

    const createNew = () => {
        const year = new Date().getFullYear();
        const num = String(Date.now()).slice(-4);
        setEditing({
            docNumber: `GU-${year}-${num}`,
            type: 'supplier_credit',
            status: 'draft',
            date: new Date().toISOString().split('T')[0],
            client: { name: '', street: '', zip: '', city: '' },
            items: [],
            totalNet: 0, totalTax: 0, totalGross: 0
        });
    };

    const handleSave = async (doc: OfficeDocument) => {
        if (doc.id) await db.documents.update(doc.id, doc as any);
        else await db.documents.add(doc);
        setEditing(null);
        load();
        setToast({ msg: 'Gutschrift gespeichert', type: 'success' });
    };

    if (editing) {
        return <PurchaseEditor initialDoc={editing} onSave={handleSave} onCancel={() => setEditing(null)} title="Gutschrift" />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="px-4 md:px-8 pt-4 pb-4">
                <div className="flex justify-between items-center mb-4">
                    <input className="bg-white border border-zinc-200 p-3 rounded-xl text-sm font-bold w-full md:w-64 outline-none" placeholder="Suchen..." />
                    <button onClick={createNew} className="bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-olive-600 transition-all">+ Gutschrift</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 space-y-3">
                {docs.map(d => (
                    <div key={d.id} onClick={() => setEditing(d)} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 hover:border-olive-500 cursor-pointer group transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono font-bold text-zinc-500 text-xs">{d.docNumber}</span>
                                </div>
                                <h4 className="font-bold text-zinc-900">{d.client.name}</h4>
                                <p className="text-xs text-zinc-400">{formatDate(d.date)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-lg text-green-600">{formatMoney(d.totalGross)}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {docs.length === 0 && <div className="text-center text-zinc-400 py-10 font-bold uppercase text-xs tracking-widest">Keine Gutschriften</div>}
            </div>
        </div>
    );
};

export default SupplierCreditList;
