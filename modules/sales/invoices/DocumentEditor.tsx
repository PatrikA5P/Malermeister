
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../db';
import { OfficeDocument, OfficeLineItem, Customer, Product, VatRate, SupportedCurrency } from '../../../officeTypes';
import CustomerManager from '../../crm/CustomerManager';
import ProductManager from '../../products/ProductManager';
import { Toast, ToastType, formatMoney, formatDate } from '../../../components/SharedUI';
import {
  calcLineNet,
  calcLineVat,
  calcLineGross,
  calculateDocumentTotals,
  roundToCurrency,
  VatGroup
} from '../../../services/calculationService';
import {
  canEditDocument,
  addAuditEvent,
  AUDIT_EVENTS,
  initializeDocumentWithAudit,
  validateDocumentForSave
} from '../../../services/documentGuardService';

interface DocumentEditorProps {
    initialDoc?: OfficeDocument;
    onBack: () => void;
    onSave: (doc: OfficeDocument) => Promise<void>;
    preselectedCustomerId?: number;
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
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  // Edit Permission
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string>('');

  const isDirty = editing ? JSON.stringify(editing) !== originalDoc : false;

  // Currency from document or settings default
  const currency: SupportedCurrency = (editing?.currency as SupportedCurrency) || settings?.defaultCurrency || 'CHF';

  // Default VAT rate from settings
  const defaultVatRate = useMemo(() => {
    const rate = settings?.vatRates?.find((r: VatRate) => r.code === 'N')?.rate;
    return typeof rate === 'number' ? rate : 8.1;
  }, [settings]);

  const vatRates: VatRate[] = settings?.vatRates || [
    { code: 'N', rate: 8.1, description: 'Normalsatz' },
    { code: 'R', rate: 2.6, description: 'Reduzierter Satz' },
    { code: 'S', rate: 3.8, description: 'Sondersatz' },
    { code: '0', rate: 0, description: 'Keine MwSt' }
  ];

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

    if (initialDoc) {
        const editCheck = canEditDocument(initialDoc);
        if (!editCheck.allowed) {
            setIsReadOnly(true);
            setReadOnlyReason(editCheck.reason || '');
        }
        setEditing(initialDoc);
        setOriginalDoc(JSON.stringify(initialDoc));
    } else if (preselectedCustomerId) {
        const cust = c.find(x => x.id === preselectedCustomerId);
        createNew(cust, s[0]);
    } else {
        createNew(undefined, s[0]);
    }
  };

  const createNew = (customer?: Customer, currentSettings?: any) => {
      const year = new Date().getFullYear();
      const num = String(Date.now()).slice(-4);
      let initialClient = { name: '', street: '', zip: '', city: '' };

      if (customer) {
          initialClient = {
            name: customer.type === 'business' ? customer.companyName! : `${customer.firstName} ${customer.lastName}`,
            street: customer.address.street,
            zip: customer.address.zip,
            city: customer.address.city
          };
      }

      const effectiveSettings = currentSettings || settings;
      const docCurrency = effectiveSettings?.defaultCurrency || 'CHF';

      let newDoc: OfficeDocument = {
          docNumber: `R-${year}-${num}`,
          type: 'invoice',
          status: 'draft',
          date: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          client: initialClient,
          customerId: customer?.id,
          items: [],
          totalNet: 0, totalTax: 0, totalGross: 0, dunningLevel: 0,
          currency: docCurrency
      };

      if (effectiveSettings?.layouts?.invoice) {
          newDoc.notes = effectiveSettings.layouts.invoice.introText;
          newDoc.footer = effectiveSettings.layouts.invoice.outroText;
      }

      newDoc = initializeDocumentWithAudit(newDoc, effectiveSettings?.currentUser?.name);
      setEditing(newDoc);
      setOriginalDoc(JSON.stringify(newDoc));
  };

  const closeEditor = () => {
      if (editing && JSON.stringify(editing) !== originalDoc) {
          if(!confirm("Änderungen verwerfen?")) return;
      }
      onBack();
  };

  // Calculate totals using the new calculation service with per-item VAT rates
  const totals = useMemo(() => {
    if (!editing) return { netTotal: 0, vatTotal: 0, grossTotal: 0, vatGroups: [], itemCount: 0 };
    return calculateDocumentTotals(editing.items, defaultVatRate, currency);
  }, [editing?.items, defaultVatRate, currency]);

  const handleSaveInternal = async () => {
      if (!editing) return;

      const validation = validateDocumentForSave(editing);
      if (!validation.valid) {
          setToast({ msg: validation.errors[0], type: 'error' });
          return;
      }

      if (isReadOnly) {
          setToast({ msg: readOnlyReason, type: 'error' });
          return;
      }

      let docToSave = editing;
      if (editing.id) {
          docToSave = addAuditEvent(editing, AUDIT_EVENTS.MODIFIED, settings?.currentUser?.name);
      }

      docToSave = {
        ...docToSave,
        totalNet: totals.netTotal,
        totalTax: totals.vatTotal,
        totalGross: totals.grossTotal
      };

      await onSave(docToSave);
      setOriginalDoc(JSON.stringify(docToSave));
      setToast({ msg: 'Gespeichert', type: 'success' });
  };

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
          vatRate: newItemData.vatRate || defaultVatRate,
          isOptional: false
      };
      setEditing({...editing, items: [...editing.items, newItem]});
      setIsAddingItem(false);
      setItemSearch('');
      setNewItemData({ quantity: 1, unit: 'Stk', price: 0, description: '', discount: 0, type: 'service', vatRate: defaultVatRate });
  };

  const selectProductForItem = (p: Product) => {
      const productVatRate = vatRates.find(v => v.code === p.vatSalesCode)?.rate || defaultVatRate;
      setNewItemData({
          productId: p.id,
          description: p.name,
          quantity: 1,
          unit: p.unit,
          price: p.price,
          type: p.type,
          discount: 0,
          vatRate: productVatRate
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
      if (!editing || isReadOnly) return;
      const newItems = [...editing.items];
      newItems.splice(index, 1);
      setEditing({ ...editing, items: newItems });
  };

  const updateItem = (index: number, updates: Partial<OfficeLineItem>) => {
      if (!editing || isReadOnly) return;
      const newItems = [...editing.items];
      newItems[index] = { ...newItems[index], ...updates };
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
                  <button onClick={() => {
                    const updatedDoc = addAuditEvent(editing!, AUDIT_EVENTS.SENT, settings?.currentUser?.name);
                    setEditing({...updatedDoc, status: 'sent'});
                    setShowEmailModal(false);
                    setToast({ msg: 'Email wurde versendet!', type: 'success' });
                  }} className="flex-1 py-3 bg-olive-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Senden</button>
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
          {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
          {showActionMenu && <ActionMenu />}
          {showEmailModal && <EmailModal />}

          {isReadOnly && (
              <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 text-amber-800 text-sm font-bold">
                  <span>🔒 Schreibgeschützt: </span>{readOnlyReason}
              </div>
          )}

          <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-4">
                  <button onClick={closeEditor} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors font-bold">✕</button>
                  <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">{editing.type === 'quote' ? 'Offerte' : 'Rechnung'}</p>
                      <h2 className="text-lg font-black brand-font uppercase">{editing.docNumber}</h2>
                  </div>
              </div>
              <div className="flex gap-2 items-center">
                   <select
                       value={currency}
                       onChange={(e) => setEditing({...editing, currency: e.target.value as SupportedCurrency})}
                       disabled={isReadOnly}
                       className="px-2 py-1 border border-zinc-200 rounded-lg text-xs font-bold bg-white disabled:bg-zinc-50"
                   >
                       {(settings?.supportedCurrencies || ['CHF', 'EUR', 'USD']).map((c: string) => (
                           <option key={c} value={c}>{c}</option>
                       ))}
                   </select>
                   <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                       editing.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                       editing.status === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                       'bg-zinc-100 text-zinc-500 border-zinc-200'
                   }`}>{editing.status}</span>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-40">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Datum</label>
                    <input type="date" className="w-full font-bold bg-zinc-50 border border-zinc-200 rounded-lg p-2 disabled:opacity-50" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} disabled={isReadOnly} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Fällig bis</label>
                    <input type="date" className="w-full font-bold bg-zinc-50 border border-zinc-200 rounded-lg p-2 disabled:opacity-50" value={editing.validUntil || ''} onChange={e => setEditing({...editing, validUntil: e.target.value})} disabled={isReadOnly} />
                  </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                  <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Empfänger</h3>
                  {!editing.client.name ? (
                      <div className="relative">
                          <input className="w-full bg-zinc-50 border border-zinc-200 p-4 pl-10 rounded-xl font-bold outline-none disabled:opacity-50" placeholder="Kunde suchen..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }} disabled={isReadOnly} />
                          <span className="absolute left-4 top-4 text-zinc-400">🔍</span>
                          {showCustomerResults && !isReadOnly && (
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
                          {!isReadOnly && <button onClick={() => setEditing({...editing, client: {name: '', street: '', zip: '', city: ''}, customerId: undefined})} className="text-xs font-bold text-zinc-400 uppercase hover:text-red-500">Ändern</button>}
                      </div>
                  )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Leistungspositionen</h3>
                  <div className="space-y-4 mb-6">
                      {editing.items.map((item, idx) => {
                        const lineNet = calcLineNet(item, currency);
                        const lineVat = calcLineVat(item, defaultVatRate, currency);
                        const lineGross = calcLineGross(item, defaultVatRate, currency);
                        const itemVatRate = item.vatRate ?? defaultVatRate;

                        return (
                          <div key={idx} className="relative p-4 rounded-xl border border-zinc-100 bg-white shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <input className="font-bold text-zinc-800 bg-transparent outline-none w-full disabled:text-zinc-500" value={item.description} onChange={e => updateItem(idx, { description: e.target.value })} disabled={isReadOnly} />
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-zinc-400">Menge</label>
                                    <input type="number" className="w-full bg-zinc-50 rounded p-2 text-sm font-bold disabled:opacity-50" value={item.quantity} onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} disabled={isReadOnly} />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-zinc-400">Einheit</label>
                                    <select className="w-full bg-zinc-50 rounded p-2 text-sm font-bold disabled:opacity-50" value={item.unit} onChange={e => updateItem(idx, { unit: e.target.value })} disabled={isReadOnly}>
                                      {['Stk', 'Std', 'm²', 'lfm', 'Psch', 'Sack', 'Gebinde'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-zinc-400">Preis</label>
                                    <input type="number" step="0.05" className="w-full bg-zinc-50 rounded p-2 text-sm font-bold text-right disabled:opacity-50" value={item.price} onChange={e => updateItem(idx, { price: parseFloat(e.target.value) || 0 })} disabled={isReadOnly} />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-zinc-400">Rabatt %</label>
                                    <input type="number" className="w-full bg-zinc-50 rounded p-2 text-sm font-bold text-orange-600 disabled:opacity-50" value={item.discount || 0} onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} disabled={isReadOnly} />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-zinc-400">MwSt</label>
                                    <select className="w-full bg-zinc-50 rounded p-2 text-sm font-bold disabled:opacity-50" value={itemVatRate} onChange={e => updateItem(idx, { vatRate: parseFloat(e.target.value) })} disabled={isReadOnly}>
                                      {vatRates.map(v => <option key={v.code} value={v.rate}>{v.rate}% ({v.code})</option>)}
                                    </select>
                                  </div>
                              </div>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-50">
                                  <div className="text-xs text-zinc-500">Netto: {formatMoney(lineNet, currency)} | MwSt {itemVatRate}%: {formatMoney(lineVat, currency)}</div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-bold">{formatMoney(lineGross, currency)}</span>
                                    {!isReadOnly && <button onClick={() => removeItem(idx)} className="text-[10px] text-red-400 font-bold uppercase hover:text-red-600">Entfernen</button>}
                                  </div>
                              </div>
                          </div>
                        );
                      })}
                  </div>

                  {!isReadOnly && <button onClick={() => setIsAddingItem(true)} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 font-bold uppercase text-xs hover:border-olive-500">+ Position</button>}

                  {isAddingItem && (
                    <div className="mt-4 p-4 bg-olive-50 rounded-xl border border-olive-200">
                      <h4 className="text-xs font-bold uppercase text-olive-700 mb-3">Neue Position</h4>
                      <div className="relative mb-3">
                        <input className="w-full bg-white border border-zinc-200 p-3 rounded-lg font-bold" placeholder="Produkt suchen oder Beschreibung eingeben..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                        {itemSearch && (
                          <div className="absolute top-full left-0 w-full bg-white border border-zinc-200 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                            {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 5).map(p => (
                              <button key={p.id} onClick={() => selectProductForItem(p)} className="w-full text-left p-3 hover:bg-zinc-50 border-b border-zinc-50">
                                <div className="font-bold text-sm">{p.name}</div>
                                <div className="text-xs text-zinc-400">{formatMoney(p.price, currency)}/{p.unit}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input className="w-full bg-white border border-zinc-200 p-3 rounded-lg font-bold mb-3" placeholder="Beschreibung" value={newItemData.description || ''} onChange={e => setNewItemData({...newItemData, description: e.target.value})} />
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <input type="number" placeholder="Menge" className="bg-white border border-zinc-200 p-2 rounded-lg" value={newItemData.quantity} onChange={e => setNewItemData({...newItemData, quantity: parseFloat(e.target.value) || 1})} />
                        <input type="number" placeholder="Preis" className="bg-white border border-zinc-200 p-2 rounded-lg" value={newItemData.price} onChange={e => setNewItemData({...newItemData, price: parseFloat(e.target.value) || 0})} />
                        <select className="bg-white border border-zinc-200 p-2 rounded-lg" value={newItemData.unit} onChange={e => setNewItemData({...newItemData, unit: e.target.value})}>
                          {['Stk', 'Std', 'm²', 'lfm', 'Psch'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select className="bg-white border border-zinc-200 p-2 rounded-lg" value={newItemData.vatRate || defaultVatRate} onChange={e => setNewItemData({...newItemData, vatRate: parseFloat(e.target.value)})}>
                          {vatRates.map(v => <option key={v.code} value={v.rate}>{v.rate}%</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setIsAddingItem(false); setItemSearch(''); setNewItemData({ quantity: 1, unit: 'Stk', price: 0, description: '', discount: 0, type: 'service' }); }} className="flex-1 py-2 bg-zinc-100 text-zinc-600 rounded-lg font-bold text-xs uppercase">Abbrechen</button>
                        <button onClick={commitNewItem} className="flex-1 py-2 bg-olive-600 text-white rounded-lg font-bold text-xs uppercase">Hinzufügen</button>
                      </div>
                    </div>
                  )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Zusammenfassung</h3>
                <div className="space-y-2 mb-4">
                  {totals.vatGroups.map((group: VatGroup) => (
                    <div key={group.rate} className="flex justify-between text-sm">
                      <span className="text-zinc-500">Netto ({group.rate}% MwSt)</span>
                      <span className="font-mono">{formatMoney(group.netTotal, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Zwischensumme Netto</span>
                    <span className="font-mono font-bold">{formatMoney(totals.netTotal, currency)}</span>
                  </div>
                  {totals.vatGroups.map((group: VatGroup) => (
                    <div key={`vat-${group.rate}`} className="flex justify-between text-sm text-olive-700">
                      <span>MwSt {group.rate}%</span>
                      <span className="font-mono">{formatMoney(group.vatTotal, currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-lg font-black pt-3 border-t border-zinc-200">
                    <span>Total inkl. MwSt</span>
                    <span className="font-mono">{formatMoney(totals.grossTotal, currency)}</span>
                  </div>
                </div>
              </div>
          </div>

          <div className="bg-white border-t border-zinc-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
              <div className="flex justify-between items-center max-w-4xl mx-auto gap-4">
                  {!isDirty || isReadOnly ? (
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
