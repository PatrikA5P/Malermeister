
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { OfficeDocument, OfficeLineItem, Customer, Product } from '../officeTypes';
import CustomerManager from './CustomerManager';
import ProductManager from './ProductManager';
import ExpenseManager from './ExpenseManager';

interface DocumentEditorProps {
    onBack: () => void;
    preselectedCustomerId?: number;
    preselectedType?: 'quote' | 'invoice';
    preselectedDocId?: number;
}

type ListTab = 'quotes' | 'invoices' | 'dunning' | 'expenses';

const DocumentEditor: React.FC<DocumentEditorProps> = ({ onBack, preselectedCustomerId, preselectedType, preselectedDocId }) => {
  // --- Global State ---
  const [listTab, setListTab] = useState<ListTab>('invoices');
  const [docs, setDocs] = useState<OfficeDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpenseCreating, setIsExpenseCreating] = useState(false);
  
  // --- Editor State ---
  const [editing, setEditing] = useState<OfficeDocument | null>(null);
  const [originalDoc, setOriginalDoc] = useState<string>('');
  
  // --- Overlays & Modals ---
  const [overlay, setOverlay] = useState<'none' | 'customer' | 'product'>('none');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  
  // --- Item Entry State ---
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [newItemData, setNewItemData] = useState<Partial<OfficeLineItem>>({ quantity: 1, unit: 'Stk', price: 0, description: '', discount: 0, type: 'service' });

  // --- Lookup Data ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  // Deep Linking
  useEffect(() => {
      if (preselectedDocId && docs.length > 0 && !editing) {
          const target = docs.find(d => d.id === preselectedDocId);
          if (target) startEditing(target);
      } else if (preselectedCustomerId && !editing && customers.length > 0) {
          createNew(preselectedType || 'invoice', preselectedCustomerId);
      }
  }, [preselectedDocId, preselectedCustomerId, docs, customers]);

  const loadData = async () => {
    const [d, c, p, s] = await Promise.all([
        db.documents.orderBy('id').reverse().toArray(),
        db.customers.toArray(),
        db.products.toArray(),
        db.settings.toArray()
    ]);
    setDocs(d);
    setCustomers(c);
    setProducts(p);
    setSettings(s[0]);
  };

  const startEditing = (doc: OfficeDocument) => {
      setEditing(JSON.parse(JSON.stringify(doc)));
      setOriginalDoc(JSON.stringify(doc));
  };

  const createNew = (type: 'quote' | 'invoice', customerId?: number) => {
      const year = new Date().getFullYear();
      const num = String(Date.now()).slice(-4);
      let initialClient = { name: '', street: '', zip: '', city: '' };
      
      if (customerId) {
          const c = customers.find(x => x.id === customerId);
          if (c) initialClient = { name: c.type === 'business' ? c.companyName! : `${c.firstName} ${c.lastName}`, street: c.address.street, zip: c.address.zip, city: c.address.city };
      }

      const newDoc: OfficeDocument = {
          docNumber: `${type === 'invoice' ? 'R' : 'O'}-${year}-${num}`,
          type,
          status: 'draft',
          date: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // +30 days
          client: initialClient,
          customerId: customerId,
          items: [],
          totalNet: 0, totalTax: 0, totalGross: 0, dunningLevel: 0
      };
      
      if (settings && settings.layouts && settings.layouts[type]) {
          newDoc.notes = settings.layouts[type].introText;
          newDoc.footer = settings.layouts[type].outroText;
      }
      startEditing(newDoc);
  };

  const closeEditor = () => {
      if (editing && JSON.stringify(editing) !== originalDoc) {
          if(!confirm("Änderungen verwerfen?")) return;
      }
      setEditing(null);
      setOriginalDoc('');
      setShowActionMenu(false);
      if (preselectedCustomerId || preselectedDocId) onBack();
  };

  const handleSave = async () => {
      if (!editing) return;
      if (!editing.client.name) { alert('Bitte Kunde wählen'); return; }
      
      const activeItems = editing.items.filter(i => !i.isOptional);
      const net = activeItems.reduce((sum, i) => sum + (i.quantity * i.price * (1 - (i.discount || 0) / 100)), 0);
      const taxRate = settings?.vatRates?.find((r: any) => r.code === 'N')?.rate || 8.1;
      const tax = net * (taxRate / 100);
      const gross = net + tax;

      const docToSave = { ...editing, totalNet: net, totalTax: tax, totalGross: gross };

      if (docToSave.id) await db.documents.update(docToSave.id, docToSave);
      else await db.documents.add(docToSave);

      loadData();
      setEditing(docToSave);
      setOriginalDoc(JSON.stringify(docToSave));
      return docToSave; // Return for chain actions
  };

  const handleConvert = async () => {
      if (!editing || editing.type !== 'quote') return;
      await handleSave();
      if (!confirm("Offerte in Rechnung umwandeln?")) return;
      
      const newInvoice: OfficeDocument = {
          ...editing,
          id: undefined,
          type: 'invoice',
          status: 'draft',
          docNumber: editing.docNumber.replace('O-', 'R-'), // Simple replace
          date: new Date().toISOString().split('T')[0]
      };
      
      // Update intro text for invoice
      if (settings?.layouts?.invoice) {
          newInvoice.notes = settings.layouts.invoice.introText;
          newInvoice.footer = settings.layouts.invoice.outroText;
      }
      
      const id = await db.documents.add(newInvoice);
      setEditing({ ...newInvoice, id: id as number });
      setShowActionMenu(false);
      loadData();
  };

  // --- Item Logic ---
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

  // --- Helper Functions ---
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

  // --- UI Components ---
  
  // Action Sheet / Menu
  const ActionMenu = () => (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowActionMenu(false)}>
          <div className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl space-y-3 animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <h3 className="font-black uppercase text-sm text-zinc-400 tracking-widest mb-4">Aktionen</h3>
              
              <button onClick={() => { setShowActionMenu(false); setShowEmailModal(true); }} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800">
                  <span>✉️</span> Per Email senden
              </button>
              
              <button onClick={() => alert("PDF wird generiert...")} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800">
                  <span>📄</span> PDF Herunterladen
              </button>
              
              <button onClick={() => alert("Druckdialog...")} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800">
                  <span>🖨️</span> Drucken
              </button>
              
              {editing?.type === 'quote' && (
                  <button onClick={handleConvert} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-olive-50 border border-olive-100 font-bold text-olive-700">
                      <span>🔄</span> In Rechnung wandeln
                  </button>
              )}
              
              <button onClick={() => setShowActionMenu(false)} className="w-full p-4 mt-4 font-bold uppercase text-xs text-zinc-400">Abbrechen</button>
          </div>
      </div>
  );

  const EmailModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="font-black uppercase text-lg brand-font">Dokument Senden</h3>
              <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-xl bg-zinc-50">
                      <input type="checkbox" className="w-5 h-5 accent-olive-600" defaultChecked />
                      <div className="flex-1">
                          <p className="font-bold text-sm">PDF Anhang</p>
                          <p className="text-xs text-zinc-400">Generiertes PDF mitsenden</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-xl bg-zinc-50">
                      <input type="checkbox" className="w-5 h-5 accent-olive-600" />
                      <div className="flex-1">
                          <p className="font-bold text-sm">Lesebestätigung</p>
                          <p className="text-xs text-zinc-400">Benachrichtigung wenn geöffnet</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-xl bg-zinc-50">
                      <input type="checkbox" className="w-5 h-5 accent-olive-600" />
                      <div className="flex-1">
                          <p className="font-bold text-sm">Digitale Unterschrift</p>
                          <p className="text-xs text-zinc-400">Kunde kann digital signieren</p>
                      </div>
                  </div>
              </div>
              <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowEmailModal(false)} className="flex-1 py-3 text-zinc-500 font-bold uppercase text-xs">Abbrechen</button>
                  <button onClick={() => { 
                      alert("Email wurde versendet!"); 
                      setShowEmailModal(false); 
                      setEditing({...editing!, status: 'sent'});
                  }} className="flex-1 py-3 bg-olive-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">
                      Senden
                  </button>
              </div>
          </div>
      </div>
  );

  // --- RENDER ---

  // Overlays with full background to prevent seeing content underneath
  if (overlay === 'customer') {
      return (
          <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
             <CustomerManager 
                onBack={() => setOverlay('none')} 
                onSelect={(c) => { selectCustomer(c); setOverlay('none'); }}
                initialEditMode={true}
             />
          </div>
      );
  }

  if (overlay === 'product') {
      return (
          <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
             <ProductManager 
                onBack={() => setOverlay('none')}
                onSelect={(p) => { selectProductForItem(p); setOverlay('none'); }}
                initialEditMode={true}
             />
          </div>
      );
  }

  // Editor View
  if (editing) {
      return (
          <div className="flex flex-col h-screen bg-slate-50 relative">
              {showActionMenu && <ActionMenu />}
              {showEmailModal && <EmailModal />}

              {/* Header */}
              <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                  <div className="flex items-center gap-4">
                      <button onClick={closeEditor} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors font-bold">✕</button>
                      <div>
                          <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">{editing.type === 'quote' ? 'Offerte' : 'Rechnung'}</p>
                          <h2 className="text-lg font-black brand-font uppercase">{editing.docNumber}</h2>
                      </div>
                  </div>
                  <div className="flex gap-2">
                       {/* Status Indicator (Read-only here, changed at bottom) */}
                       <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                           editing.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                           editing.status === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                           'bg-zinc-100 text-zinc-500 border-zinc-200'
                       }`}>
                           {editing.status}
                       </span>
                  </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-40">
                  
                  {/* Meta Data */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Datum</label>
                          <input type="date" className="w-full font-bold bg-zinc-50 border-none rounded-lg focus:ring-1 focus:ring-olive-500" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
                      </div>
                      {editing.type === 'quote' && (
                          <>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Gültig bis</label>
                                <input type="date" className="w-full font-bold bg-zinc-50 border-none rounded-lg focus:ring-1 focus:ring-olive-500" value={editing.validUntil || ''} onChange={e => setEditing({...editing, validUntil: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Titel (Optional)</label>
                                <input className="w-full font-bold bg-zinc-50 border-none rounded-lg focus:ring-1 focus:ring-olive-500" placeholder="z.B. Wohnzimmer Streichen" value={editing.title || ''} onChange={e => setEditing({...editing, title: e.target.value})} />
                            </div>
                            <div className="md:col-span-3 grid grid-cols-2 gap-6 pt-2 border-t border-zinc-50">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Ausführung Start</label>
                                    <input type="date" className="w-full text-sm bg-zinc-50 border-none rounded-lg" value={editing.executionStart || ''} onChange={e => setEditing({...editing, executionStart: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Ausführung Ende</label>
                                    <input type="date" className="w-full text-sm bg-zinc-50 border-none rounded-lg" value={editing.executionEnd || ''} onChange={e => setEditing({...editing, executionEnd: e.target.value})} />
                                </div>
                            </div>
                          </>
                      )}
                  </div>

                  {/* Customer */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                      <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Empfänger</h3>
                      {!editing.client.name ? (
                          <div className="relative">
                              <input 
                                className="w-full bg-zinc-50 border border-zinc-200 p-4 pl-10 rounded-xl font-bold outline-none focus:border-olive-500"
                                placeholder="Kunde suchen..."
                                value={customerSearch}
                                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }}
                              />
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
                              <div>
                                  <p className="font-black text-zinc-800">{editing.client.name}</p>
                                  <p className="text-sm text-zinc-500">{editing.client.street}, {editing.client.zip} {editing.client.city}</p>
                              </div>
                              <button onClick={() => setEditing({...editing, client: {name: '', street: '', zip: '', city: ''}, customerId: undefined})} className="text-xs font-bold text-zinc-400 uppercase hover:text-red-500">Ändern</button>
                          </div>
                      )}
                  </div>

                  {/* Intro Text */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                      <label className="text-[10px] font-bold uppercase text-zinc-300 mb-2 block">Einleitungstext</label>
                      <textarea className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-sm outline-none resize-none h-20" value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} />
                  </div>

                  {/* Items */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                      <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Leistungspositionen</h3>
                      
                      <div className="space-y-6 mb-6">
                          {editing.items.map((item, idx) => (
                              <div key={idx} className={`relative p-4 rounded-xl border ${item.isOptional ? 'border-dashed border-zinc-300 bg-zinc-50/50' : 'border-zinc-100 bg-white shadow-sm'}`}>
                                  <div className="flex flex-col md:flex-row gap-4 items-start">
                                      <div className="flex-1 w-full">
                                          <div className="flex justify-between items-start mb-2">
                                              <input className="font-bold text-zinc-800 bg-transparent outline-none w-full" value={item.description} onChange={e => {
                                                  const newItems = [...editing.items];
                                                  newItems[idx].description = e.target.value;
                                                  setEditing({...editing, items: newItems});
                                              }} />
                                          </div>
                                          <div className="flex gap-2 items-center text-xs">
                                              <select className="bg-zinc-50 border rounded px-1 py-0.5" value={item.type} onChange={e => {
                                                  const newItems = [...editing.items];
                                                  newItems[idx].type = e.target.value as any;
                                                  setEditing({...editing, items: newItems});
                                              }}>
                                                  <option value="service">Dienstleistung</option>
                                                  <option value="material">Material</option>
                                              </select>
                                              <label className="flex items-center gap-1 cursor-pointer select-none">
                                                  <input type="checkbox" checked={item.isOptional} onChange={e => {
                                                      const newItems = [...editing.items];
                                                      newItems[idx].isOptional = e.target.checked;
                                                      setEditing({...editing, items: newItems});
                                                  }} />
                                                  <span className="text-zinc-400">Optional (Variante)</span>
                                              </label>
                                          </div>
                                      </div>
                                      
                                      <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                                          <div className="w-20 shrink-0">
                                              <label className="text-[9px] uppercase font-bold text-zinc-300 block">Menge</label>
                                              <input type="number" className="w-full bg-zinc-50 rounded p-1 text-sm font-bold" value={item.quantity} onChange={e => {
                                                  const newItems = [...editing.items];
                                                  newItems[idx].quantity = parseFloat(e.target.value);
                                                  setEditing({...editing, items: newItems});
                                              }} />
                                          </div>
                                          <div className="w-16 shrink-0">
                                              <label className="text-[9px] uppercase font-bold text-zinc-300 block">Einheit</label>
                                              <input className="w-full bg-zinc-50 rounded p-1 text-sm font-bold" value={item.unit} onChange={e => {
                                                  const newItems = [...editing.items];
                                                  newItems[idx].unit = e.target.value;
                                                  setEditing({...editing, items: newItems});
                                              }} />
                                          </div>
                                          <div className="w-24 shrink-0">
                                              <label className="text-[9px] uppercase font-bold text-zinc-300 block">Preis</label>
                                              <input type="number" className="w-full bg-zinc-50 rounded p-1 text-sm font-bold text-right" value={item.price} onChange={e => {
                                                  const newItems = [...editing.items];
                                                  newItems[idx].price = parseFloat(e.target.value);
                                                  setEditing({...editing, items: newItems});
                                              }} />
                                          </div>
                                          <div className="w-16 shrink-0">
                                              <label className="text-[9px] uppercase font-bold text-zinc-300 block">Rabatt %</label>
                                              <input type="number" className="w-full bg-zinc-50 rounded p-1 text-sm font-bold text-right text-orange-500" value={item.discount} onChange={e => {
                                                  const newItems = [...editing.items];
                                                  newItems[idx].discount = parseFloat(e.target.value);
                                                  setEditing({...editing, items: newItems});
                                              }} />
                                          </div>
                                      </div>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-between items-center">
                                      <button onClick={() => removeItem(idx)} className="text-[10px] text-red-400 font-bold uppercase hover:text-red-600">Entfernen</button>
                                      <span className={`font-mono font-bold ${item.isOptional ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                                          CHF {(item.quantity * item.price * (1 - (item.discount || 0)/100)).toFixed(2)}
                                      </span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      {isAddingItem ? (
                          <div className="bg-zinc-50 p-4 rounded-xl border border-olive-200 animate-in fade-in">
                              {/* New Item Form */}
                              <input 
                                className="w-full bg-white border border-zinc-200 p-3 rounded-lg font-bold text-sm mb-3"
                                placeholder="Beschreibung..."
                                value={itemSearch}
                                onChange={e => { setItemSearch(e.target.value); setNewItemData({...newItemData, description: e.target.value}); }}
                              />
                               {itemSearch && !newItemData.productId && (
                                     <div className="bg-white border border-zinc-100 rounded-lg mb-3 max-h-40 overflow-y-auto">
                                          {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).map(p => (
                                              <div key={p.id} onClick={() => selectProductForItem(p)} className="p-2 hover:bg-olive-50 cursor-pointer border-b border-zinc-50 text-xs font-bold">
                                                  {p.name}
                                              </div>
                                          ))}
                                          <button onClick={() => setOverlay('product')} className="w-full p-2 text-left font-bold text-olive-600 uppercase text-[10px] hover:bg-olive-50">+ Neues Produkt</button>
                                     </div>
                               )}
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                  <input type="number" className="p-2 rounded border" placeholder="Menge" value={newItemData.quantity} onChange={e => setNewItemData({...newItemData, quantity: parseFloat(e.target.value)})} />
                                  <input className="p-2 rounded border" placeholder="Einh." value={newItemData.unit} onChange={e => setNewItemData({...newItemData, unit: e.target.value})} />
                                  <input type="number" className="p-2 rounded border" placeholder="Preis" value={newItemData.price} onChange={e => setNewItemData({...newItemData, price: parseFloat(e.target.value)})} />
                                  <input type="number" className="p-2 rounded border text-orange-600" placeholder="Rabatt %" value={newItemData.discount} onChange={e => setNewItemData({...newItemData, discount: parseFloat(e.target.value)})} />
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => setIsAddingItem(false)} className="flex-1 py-3 text-zinc-400 font-bold uppercase text-xs">Abbrechen</button>
                                  <button onClick={commitNewItem} className="flex-1 py-3 bg-zinc-900 text-white rounded-lg font-bold uppercase text-xs">Hinzufügen</button>
                              </div>
                          </div>
                      ) : (
                          <button onClick={() => setIsAddingItem(true)} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 font-bold uppercase text-xs hover:border-olive-500 hover:text-olive-600 transition-colors">
                              + Position hinzufügen
                          </button>
                      )}
                  </div>

                  {/* Footer Text */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                      <label className="text-[10px] font-bold uppercase text-zinc-300 mb-2 block">Fusszeile / Konditionen</label>
                      <textarea className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-sm outline-none resize-none h-20" value={editing.footer || ''} onChange={e => setEditing({...editing, footer: e.target.value})} />
                      <div className="mt-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Rechtliche Hinweise</p>
                          <p className="text-xs text-zinc-500">Es gelten die AGB von Maler Borer. Zahlbar innert {settings?.paymentTermsDays || 30} Tagen netto. Material bleibt bis zur vollständigen Bezahlung Eigentum der Firma.</p>
                      </div>
                  </div>

                  {/* Status & Totals */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                      <div className="mb-6">
                           <label className="text-[10px] font-bold uppercase text-zinc-300 mb-2 block">Dokument Status</label>
                           <div className="relative">
                               <select 
                                className="w-full appearance-none bg-zinc-50 border border-zinc-200 font-bold text-sm py-3 px-4 pr-8 rounded-xl outline-none"
                                value={editing.status}
                                onChange={e => setEditing({...editing, status: e.target.value as any})}
                               >
                                   <option value="draft">Entwurf</option>
                                   <option value="sent">Versendet</option>
                                   <option value="accepted">Akzeptiert</option>
                                   <option value="paid">Bezahlt</option>
                                   <option value="cancelled">Storniert</option>
                               </select>
                               <span className="absolute right-3 top-3.5 text-zinc-500 text-[10px]">▼</span>
                           </div>
                      </div>

                      <div className="space-y-2 border-t border-zinc-100 pt-4">
                          <div className="flex justify-between text-sm">
                              <span className="text-zinc-500">Netto (Material)</span>
                              <span className="font-bold">CHF {editing.items.filter(i => !i.isOptional && i.type === 'material').reduce((acc, i) => acc + (i.quantity*i.price*(1-(i.discount||0)/100)), 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-zinc-500">Netto (Arbeit)</span>
                              <span className="font-bold">CHF {editing.items.filter(i => !i.isOptional && i.type !== 'material').reduce((acc, i) => acc + (i.quantity*i.price*(1-(i.discount||0)/100)), 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-olive-600">
                              <span>MWST 8.1%</span>
                              <span>CHF {(editing.items.filter(i => !i.isOptional).reduce((acc, i) => acc + (i.quantity*i.price*(1-(i.discount||0)/100)), 0) * 0.081).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xl font-black mt-4 pt-4 border-t border-zinc-900">
                              <span>Total</span>
                              <span>CHF {(editing.items.filter(i => !i.isOptional).reduce((acc, i) => acc + (i.quantity*i.price*(1-(i.discount||0)/100)), 0) * 1.081).toFixed(2)}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Bottom Nav / Actions */}
              <div className="bg-white border-t border-zinc-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
                  <div className="flex justify-between items-center max-w-4xl mx-auto gap-4">
                      <button onClick={closeEditor} className="text-zinc-400 font-bold uppercase text-xs px-2 hover:text-black">
                          Abbrechen
                      </button>
                      
                      <div className="flex gap-3">
                          <button onClick={() => { if(editing.id) setShowActionMenu(true); else alert("Bitte erst speichern."); }} className="bg-zinc-100 text-zinc-800 w-12 h-12 flex items-center justify-center rounded-xl font-bold text-lg hover:bg-zinc-200 transition-colors">
                              ⋮
                          </button>
                          <button onClick={() => handleSave().then(() => alert("Gespeichert"))} className="bg-olive-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-olive-700 transition-transform active:scale-95">
                              Speichern
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // 3. List View (Default - unchanged logic mostly)
  const filteredDocs = docs.filter(d => {
      const matchesSearch = d.client.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.docNumber.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (listTab === 'quotes') return d.type === 'quote';
      if (listTab === 'invoices') return d.type === 'invoice';
      if (listTab === 'dunning') return d.type === 'invoice' && (d.status === 'overdue' || (d.dunningLevel || 0) > 0);
      return true;
  });

  const getNewButtonLabel = () => {
      switch(listTab) {
          case 'quotes': return 'Offerte';
          case 'invoices': return 'Rechnung';
          case 'dunning': return 'Mahnlauf';
          case 'expenses': return 'Ausgabe';
      }
  };

  const TabButton = ({ id, label, icon }: { id: ListTab, label: string, icon: string }) => (
      <button 
        onClick={() => setListTab(id)} 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${listTab === id ? 'border-olive-600 bg-olive-50 text-olive-700' : 'border-transparent text-zinc-400 hover:bg-zinc-50'}`}
      >
          <span className="text-lg">{icon}</span>
          <span className={`font-bold uppercase text-xs ${listTab === id ? 'inline' : 'hidden md:inline'}`}>{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col h-full">
       <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50 z-20 pt-2 pb-4">
         <div className="flex items-center gap-4">
             <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all">←</button>
             <h2 className="text-2xl font-black brand-font uppercase">Rechnungen</h2>
         </div>
       </div>

       <div className="flex gap-2 overflow-x-auto mb-6 pb-2 no-scrollbar">
          <TabButton id="invoices" label="Rechnungen" icon="📄" />
          <TabButton id="dunning" label="Mahnwesen" icon="🔔" />
          <TabButton id="expenses" label="Ausgaben" icon="💸" />
       </div>

       <div className="flex gap-4 mb-6">
           <div className="relative flex-1 transition-all">
               <input 
                 className="w-full border border-zinc-200 p-4 pl-12 rounded-2xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" 
                 placeholder="Suchen..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
               <span className="absolute left-4 top-4 text-zinc-400">🔍</span>
           </div>
           <button onClick={() => { if(listTab === 'expenses') setIsExpenseCreating(true); else if(listTab==='quotes') createNew('quote'); else createNew('invoice'); }} className="bg-zinc-900 hover:bg-olive-600 text-white px-6 rounded-2xl text-xs font-bold uppercase transition-all shadow-lg whitespace-nowrap">
               + {getNewButtonLabel()}
           </button>
       </div>

       <div className="space-y-3 pb-20">
           {listTab === 'expenses' ? (
               <ExpenseManager isCreating={isExpenseCreating} onCloseCreate={() => setIsExpenseCreating(false)} searchTerm={searchTerm} />
           ) : (
               <>
                   {filteredDocs.map(d => (
                       <div key={d.id} onClick={() => startEditing(d)} className={`bg-white p-5 rounded-2xl shadow-sm border cursor-pointer hover:border-olive-500 transition-all active:scale-[0.98] ${d.status === 'overdue' ? 'border-red-200 bg-red-50/20' : 'border-zinc-100'}`}>
                           <div className="flex justify-between items-start">
                               <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-2">
                                       <span className="font-bold text-zinc-800 text-sm">{d.docNumber}</span>
                                       {d.type === 'quote' && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">OFFERTE</span>}
                                       {d.type === 'invoice' && <span className="text-[9px] bg-olive-50 text-olive-600 px-1.5 py-0.5 rounded font-bold border border-olive-100">RECHNUNG</span>}
                                   </div>
                                   <p className="font-bold text-lg text-zinc-900 leading-tight mb-1">{d.client.name}</p>
                                   <p className="text-xs text-zinc-400">{d.date} • {d.items.length} Positionen</p>
                               </div>
                               <div className="text-right">
                                   <p className="font-black text-zinc-900 text-lg">CHF {d.totalGross.toLocaleString('de-CH', {minimumFractionDigits: 2})}</p>
                                   <span className={`inline-block mt-2 text-[9px] font-black uppercase px-2 py-1 rounded ${d.status === 'paid' ? 'bg-green-100 text-green-700' : d.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                       {d.status}
                                   </span>
                               </div>
                           </div>
                       </div>
                   ))}
               </>
           )}
       </div>
    </div>
  );
};

export default DocumentEditor;
