
import React, { useState, useEffect } from 'react';
import { db } from '../../../db';
import { OfficeDocument, OfficeLineItem, Customer, Product } from '../../../officeTypes';
import CustomerManager from '../../crm/CustomerManager';
import ProductManager from '../../products/ProductManager';
import { Toast, ToastType, formatMoney } from '../../../components/SharedUI';

interface DocumentEditorProps {
    initialDoc?: OfficeDocument;
    onBack: () => void;
    onSave: (doc: OfficeDocument) => Promise<void>;
    preselectedCustomerId?: number; // Optional fall-through
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ initialDoc, onBack, onSave, preselectedCustomerId }) => {
  const [editing, setEditing] = useState<OfficeDocument | null>(null);
  const [originalDoc, setOriginalDoc] = useState<string>('');
  
  // Overlays
  const [overlay, setOverlay] = useState<'none' | 'customer' | 'product'>('none');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  
  // Item Entry
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [newItemData, setNewItemData] = useState<Partial<OfficeLineItem>>({ quantity: 1, unit: 'Stk', price: 0, description: '', discount: 0, type: 'service' });

  // Lookup Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const isDirty = editing ? JSON.stringify(editing) !== originalDoc : false;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [c, p, s] = await Promise.all([
        db.customers.toArray(),
        db.products.toArray(),
        db.settings.toArray()
    ]);
    setCustomers(c);
    setProducts(p);
    setSettings(s[0]);

    // Initialization Logic
    if (initialDoc) {
        setEditing(initialDoc);
        setOriginalDoc(JSON.stringify(initialDoc));
    } else if (preselectedCustomerId) {
        // Create new based on customer
        const cust = c.find(x => x.id === preselectedCustomerId);
        createNew(cust);
    } else {
        // Fallback create empty
        createNew();
    }
  };

  const createNew = (customer?: Customer) => {
      const year = new Date().getFullYear();
      const num = String(Date.now()).slice(-4);
      let initialClient = { name: '', street: '', zip: '', city: '' };
      
      if (customer) {
          initialClient = { name: customer.type === 'business' ? customer.companyName! : `${customer.firstName} ${customer.lastName}`, street: customer.address.street, zip: customer.address.zip, city: customer.address.city };
      }

      const newDoc: OfficeDocument = {
          docNumber: `R-${year}-${num}`, // Default Invoice
          type: 'invoice',
          status: 'draft',
          date: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          client: initialClient,
          customerId: customer?.id,
          items: [],
          totalNet: 0, totalTax: 0, totalGross: 0, dunningLevel: 0
      };
      
      if (settings && settings.layouts && settings.layouts.invoice) {
          newDoc.notes = settings.layouts.invoice.introText;
          newDoc.footer = settings.layouts.invoice.outroText;
      }
      setEditing(newDoc);
      setOriginalDoc(JSON.stringify(newDoc));
  };

  const closeEditor = () => {
      if (editing && JSON.stringify(editing) !== originalDoc) {
          if(!confirm("Änderungen verwerfen?")) return;
      }
      onBack();
  };

  const calculateTotals = () => {
      if (!editing) return {net:0, tax:0, gross:0};
      const activeItems = editing.items.filter(i => !i.isOptional);
      const net = activeItems.reduce((sum, i) => sum + (i.quantity * i.price * (1 - (i.discount || 0) / 100)), 0);
      const taxRate = settings?.vatRates?.find((r: any) => r.code === 'N')?.rate || 8.1;
      const tax = net * (taxRate / 100);
      const gross = net + tax;
      return {net, tax, gross};
  };

  const handleSaveInternal = async () => {
      if (!editing) return;
      if (!editing.client.name) { alert('Bitte Kunde wählen'); return; }
      
      const {net, tax, gross} = calculateTotals();
      const docToSave = { ...editing, totalNet: net, totalTax: tax, totalGross: gross };
      
      await onSave(docToSave);
      setOriginalDoc(JSON.stringify(docToSave));
  };

  // ... (Item Logic similar to before, simplified for brevity)
  const commitNewItem = () => {
      if (!editing || !newItemData.description) return;
      const newItem: OfficeLineItem = {
          id: Date.now().toString(),
          productId: newItemData.productId,
          description: newItemData.description,
          quantity: newItemData.quantity || 1,
          unit: newItemData.unit || 'Stk',
          price: newItemData.price || 0,
          discount: newItemData.discount || 0,
          type: newItemData.type || 'service',
          isOptional: false
      };
      setEditing({...editing, items: [...editing.items, newItem]});
      setIsAddingItem(false);
      setItemSearch('');
      setNewItemData({ quantity: 1, unit: 'Stk', price: 0, description: '', discount: 0, type: 'service' });
  };

  const selectProductForItem = (p: Product) => {
      setNewItemData({
          productId: p.id,
          description: p.name,
          quantity: 1,
          unit: p.unit,
          price: p.price,
          type: p.type,
          discount: 0
      });
      setItemSearch(p.name);
  };

  const selectCustomer = (c: Customer) => {
      if (!editing) return;
      setEditing({
          ...editing,
          customerId: c.id,
          client: {
              name: c.type === 'business' ? c.companyName! : `${c.firstName} ${c.lastName}`,
              street: c.address.street,
              zip: c.address.zip,
              city: c.address.city,
              email: c.address.email,
              phone: c.address.phone,
              website: c.address.website
          }
      });
      setCustomerSearch('');
      setShowCustomerResults(false);
  };

  const removeItem = (index: number) => {
      if (!editing) return;
      const newItems = [...editing.items];
      newItems.splice(index, 1);
      setEditing({ ...editing, items: newItems });
  };

  const ActionMenu = () => (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowActionMenu(false)}>
          <div className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl space-y-3 animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <h3 className="font-black uppercase text-sm text-zinc-400 tracking-widest mb-4">Aktionen</h3>
              <button onClick={() => { setShowActionMenu(false); setShowEmailModal(true); }} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800"><span>✉️</span> Per Email senden</button>
              <button onClick={() => alert("PDF wird generiert...")} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800"><span>📄</span> PDF Herunterladen</button>
              <button onClick={() => setShowActionMenu(false)} className="w-full p-4 mt-4 font-bold uppercase text-xs text-zinc-400">Abbrechen</button>
          </div>
      </div>
  );

  const EmailModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="font-black uppercase text-lg brand-font">Dokument Senden</h3>
              <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowEmailModal(false)} className="flex-1 py-3 text-zinc-500 font-bold uppercase text-xs">Abbrechen</button>
                  <button onClick={() => { alert("Email wurde versendet!"); setShowEmailModal(false); setEditing({...editing!, status: 'sent'}); }} className="flex-1 py-3 bg-olive-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Senden</button>
              </div>
          </div>
      </div>
  );

  if (overlay === 'customer') {
      return ( <div className="fixed inset-0 z-[60] bg-white overflow-y-auto"><CustomerManager onBack={() => setOverlay('none')} onSelect={(c) => { selectCustomer(c); setOverlay('none'); }} initialEditMode={true} /></div> );
  }
  if (overlay === 'product') {
      return ( <div className="fixed inset-0 z-[60] bg-white overflow-y-auto"><ProductManager onBack={() => setOverlay('none')} onSelect={(p) => { selectProductForItem(p); setOverlay('none'); }} initialEditMode={true} /></div> );
  }

  if (!editing) return <div className="p-10 text-center">Lade Editor...</div>;

  return (
      <div className="flex flex-col h-screen bg-slate-50 relative">
          {showActionMenu && <ActionMenu />}
          {showEmailModal && <EmailModal />}
          <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-4">
                  <button onClick={closeEditor} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors font-bold">✕</button>
                  <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">{editing.type === 'quote' ? 'Offerte' : 'Rechnung'}</p>
                      <h2 className="text-lg font-black brand-font uppercase">{editing.docNumber}</h2>
                  </div>
              </div>
              <div className="flex gap-2">
                   <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-zinc-100 text-zinc-500 border-zinc-200`}>{editing.status}</span>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-40">
              {/* Meta Data */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Datum</label><input type="date" className="w-full font-bold bg-zinc-50 border-none rounded-lg" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} /></div>
              </div>
              
              {/* Customer */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                  <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Empfänger</h3>
                  {!editing.client.name ? (
                      <div className="relative">
                          <input className="w-full bg-zinc-50 border border-zinc-200 p-4 pl-10 rounded-xl font-bold outline-none" placeholder="Kunde suchen..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }} />
                          <span className="absolute left-4 top-4 text-zinc-400">🔍</span>
                          {showCustomerResults && (
                              <div className="absolute top-full left-0 w-full bg-white border border-zinc-200 shadow-xl rounded-xl mt-2 z-20 overflow-hidden max-h-60 overflow-y-auto">
                                  {customers.filter(c => (c.companyName || c.lastName).toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                      <div key={c.id} onClick={() => selectCustomer(c)} className="p-4 border-b border-zinc-50 hover:bg-olive-50 cursor-pointer">
                                          <p className="font-bold text-sm">{c.type === 'business' ? c.companyName : `${c.firstName} ${c.lastName}`}</p>
                                      </div>
                                  ))}
                                  <button onClick={() => setOverlay('customer')} className="w-full p-4 text-left font-bold text-olive-600 uppercase text-xs hover:bg-olive-50">+ Neuer Kunde</button>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                          <div><p className="font-black text-zinc-800">{editing.client.name}</p></div>
                          <button onClick={() => setEditing({...editing, client: {name: '', street: '', zip: '', city: ''}, customerId: undefined})} className="text-xs font-bold text-zinc-400 uppercase hover:text-red-500">Ändern</button>
                      </div>
                  )}
              </div>
              
              {/* Items */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100"><h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Leistungspositionen</h3>
                  <div className="space-y-6 mb-6">
                      {editing.items.map((item, idx) => (
                          <div key={idx} className={`relative p-4 rounded-xl border border-zinc-100 bg-white shadow-sm`}>
                              <div className="flex justify-between items-start mb-2"><input className="font-bold text-zinc-800 bg-transparent outline-none w-full" value={item.description} onChange={e => { const newItems = [...editing.items]; newItems[idx].description = e.target.value; setEditing({...editing, items: newItems}); }} /></div>
                              <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                                  <div className="w-20"><input type="number" className="w-full bg-zinc-50 rounded p-1 text-sm font-bold" value={item.quantity} onChange={e => { const newItems = [...editing.items]; newItems[idx].quantity = parseFloat(e.target.value); setEditing({...editing, items: newItems}); }} /></div>
                                  <div className="w-24"><input type="number" className="w-full bg-zinc-50 rounded p-1 text-sm font-bold text-right" value={item.price} onChange={e => { const newItems = [...editing.items]; newItems[idx].price = parseFloat(e.target.value); setEditing({...editing, items: newItems}); }} /></div>
                              </div>
                              <button onClick={() => removeItem(idx)} className="mt-2 text-[10px] text-red-400 font-bold uppercase hover:text-red-600">Entfernen</button>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => setIsAddingItem(true)} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 font-bold uppercase text-xs hover:border-olive-500">+ Position</button>
              </div>
          </div>
          
          <div className="bg-white border-t border-zinc-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
              <div className="flex justify-between items-center max-w-4xl mx-auto gap-4">
                  {!isDirty ? (
                      <>
                          <button onClick={closeEditor} className="text-zinc-400 font-bold uppercase text-xs px-2 hover:text-black">Zurück</button>
                          <div className="flex gap-3">
                              <button onClick={() => { if(editing.id) setShowActionMenu(true); else alert("Bitte erst speichern."); }} className="bg-zinc-100 text-zinc-800 w-12 h-12 flex items-center justify-center rounded-xl font-bold text-lg hover:bg-zinc-200">⋮</button>
                          </div>
                      </>
                  ) : (
                      <>
                          <button onClick={closeEditor} className="text-zinc-400 font-bold uppercase text-xs px-2 hover:text-black">Abbrechen</button>
                          <div className="flex gap-3">
                              <button onClick={handleSaveInternal} className="bg-olive-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg">Speichern</button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      </div>
  );
};

export default DocumentEditor;
