import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { OfficeDocument, Customer, Project, Product, VatRate, OfficeAddress } from '../officeTypes';
import { Toast, ToastType, formatMoney } from './SharedUI';
import QuoteEditor from './QuoteEditor';

interface OffersProps {
  onBack: () => void;
  preselectedCustomerId?: number;
}

const Offers: React.FC<OffersProps> = ({ onBack, preselectedCustomerId }) => {
  // --- Data State ---
  const [docs, setDocs] = useState<OfficeDocument[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  // --- View State ---
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [selectedDoc, setSelectedDoc] = useState<OfficeDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [d, c, proj, prod, s] = await Promise.all([
      db.documents.where('type').equals('quote').reverse().toArray(),
      db.customers.toArray(),
      db.projects.toArray(),
      db.products.toArray(),
      db.settings.toArray(),
    ]);
    setDocs(d);
    setCustomers(c);
    setProjects(proj);
    setProducts(prod);
    setSettings(s[0]);
  };

  // Deep Link Handling
  useEffect(() => {
      if (preselectedCustomerId && !selectedDoc && customers.length > 0 && view === 'list') {
          handleCreateNew(preselectedCustomerId);
      }
  }, [preselectedCustomerId, customers]);

  const handleCreateNew = (customerId?: number) => {
      const year = new Date().getFullYear();
      const num = String(Date.now()).slice(-4);
      const defaultRate = settings?.vatRates?.find((r: VatRate) => r.code === 'N')?.rate ?? 8.1;

      let initialClient: OfficeAddress = { name: '', street: '', zip: '', city: '' };
      if (customerId) {
          const c = customers.find(x => x.id === customerId);
          if (c) initialClient = { 
              name: c.type === 'business' ? c.companyName! : `${c.firstName} ${c.lastName}`, 
              street: c.address.street, 
              zip: c.address.zip, 
              city: c.address.city,
              email: c.address.email,
              phone: c.address.phone,
              website: c.address.website
          };
      }

      const newDoc: OfficeDocument = {
          docNumber: `O-${year}-${num}`,
          type: 'quote',
          status: 'draft',
          date: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          client: initialClient,
          customerId,
          items: [],
          totalNet: 0, totalTax: 0, totalGross: 0, dunningLevel: 0,
          notes: settings?.layouts?.quote?.introText || '',
          footer: settings?.layouts?.quote?.outroText || ''
      };

      setSelectedDoc(newDoc);
      setView('editor');
  };

  const handleSaveDoc = async (doc: OfficeDocument) => {
      if (doc.id) {
          await db.documents.update(doc.id, doc as any);
      } else {
          await db.documents.add(doc);
      }
      await loadData();
      setToast({ msg: 'Offerte gespeichert', type: 'success' });
      setView('list');
      setSelectedDoc(null);
  };

  const handleDeleteDoc = async (id: number) => {
      await db.documents.delete(id);
      await loadData();
      setToast({ msg: 'Offerte gelöscht', type: 'info' });
      setView('list');
      setSelectedDoc(null);
  };

  const handleConvert = async (doc: OfficeDocument) => {
      const invoice: OfficeDocument = {
          ...doc,
          id: undefined,
          type: 'invoice',
          status: 'draft',
          docNumber: doc.docNumber.replace('O-', 'R-'),
          date: new Date().toISOString().split('T')[0],
          notes: settings?.layouts?.invoice?.introText,
          footer: settings?.layouts?.invoice?.outroText,
      };
      
      // Save original first if needed (usually handled by editor logic but good to be safe)
      if (!doc.id) await db.documents.add(doc);
      
      await db.documents.add(invoice);
      await loadData();
      setToast({ msg: 'Rechnung erstellt!', type: 'success' });
      // Could navigate to invoice here, but for now back to list
      setView('list');
      setSelectedDoc(null);
  };

  const filteredDocs = docs.filter(d => 
      d.client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.docNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Render ---

  if (view === 'editor' && selectedDoc) {
      return (
          <QuoteEditor 
              initialDoc={selectedDoc}
              customers={customers}
              projects={projects}
              products={products}
              settings={settings}
              onSave={handleSaveDoc}
              onCancel={() => { setView('list'); setSelectedDoc(null); if(preselectedCustomerId) onBack(); }}
              onConvert={handleConvert}
              onDelete={handleDeleteDoc}
          />
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50 z-20 pt-2 pb-4 px-1">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all">←</button>
                <h2 className="text-2xl font-black brand-font uppercase">Offerten</h2>
            </div>
        </div>

        <div className="flex gap-4 mb-6 px-1">
            <div className="relative flex-1 transition-all">
                <input className="w-full border border-zinc-200 p-4 pl-12 rounded-2xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" placeholder="Suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <span className="absolute left-4 top-4 text-zinc-400">🔍</span>
            </div>
            <button onClick={() => handleCreateNew()} className="bg-zinc-900 hover:bg-olive-600 text-white px-6 rounded-2xl text-xs font-black uppercase transition-all shadow-lg whitespace-nowrap">+ Neu</button>
        </div>

        <div className="space-y-3 pb-20 px-1">
            {filteredDocs.map((d) => (
                <div key={d.id} onClick={() => { setSelectedDoc(d); setView('editor'); }} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 hover:border-olive-500 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-zinc-800 text-sm">{d.docNumber}</span>
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black border border-blue-100">OFFERTE</span>
                            </div>
                            <p className="font-black text-lg text-zinc-900 leading-tight mb-1">{d.client.name || '—'}</p>
                            <p className="text-xs text-zinc-400">{d.date} • {d.items.length} Positionen</p>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-zinc-900 text-lg">CHF {formatMoney(d.totalGross)}</p>
                            <span className={`inline-block mt-2 text-[9px] font-black uppercase px-2 py-1 rounded ${d.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>{d.status}</span>
                        </div>
                    </div>
                </div>
            ))}
            {filteredDocs.length === 0 && <div className="text-center text-zinc-400 py-10">Keine Offerten gefunden.</div>}
        </div>
    </div>
  );
};

export default Offers;