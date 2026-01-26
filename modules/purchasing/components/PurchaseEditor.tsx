
import React, { useState, useEffect } from 'react';
import { db } from '../../../db';
import { OfficeDocument, OfficeLineItem, Customer, Product } from '../../../officeTypes';
import CustomerManager from '../../crm/CustomerManager';
import ProductManager from '../../products/ProductManager';
import { formatMoney } from '../../../components/SharedUI';

interface PurchaseEditorProps {
    initialDoc: OfficeDocument;
    onSave: (doc: OfficeDocument) => Promise<void>;
    onCancel: () => void;
    title: string;
}

const PurchaseEditor: React.FC<PurchaseEditorProps> = ({ initialDoc, onSave, onCancel, title }) => {
  const [editing, setEditing] = useState<OfficeDocument>(initialDoc);
  const [originalDoc] = useState<string>(JSON.stringify(initialDoc));
  
  // Overlays
  const [overlay, setOverlay] = useState<'none' | 'supplier' | 'product'>('none');
  
  // Item Entry
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<OfficeLineItem>>({ quantity: 1, unit: 'Stk', price: 0, description: '', discount: 0, type: 'material' });

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => { 
      db.products.toArray().then(setProducts);
  }, []);

  const closeEditor = () => {
      if (JSON.stringify(editing) !== originalDoc) {
          if(!confirm("Änderungen verwerfen?")) return;
      }
      onCancel();
  };

  const handleSaveInternal = async () => {
      if (!editing.client.name) { alert('Bitte Lieferant wählen'); return; }
      
      const activeItems = editing.items.filter(i => !i.isOptional);
      const net = activeItems.reduce((sum, i) => sum + (i.quantity * i.price * (1 - (i.discount || 0) / 100)), 0);
      const tax = net * 0.081; // Simplified default
      const gross = net + tax;

      const docToSave = { ...editing, totalNet: net, totalTax: tax, totalGross: gross };
      await onSave(docToSave);
  };

  const selectSupplier = (c: Customer) => {
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
      setOverlay('none');
  };

  const commitNewItem = () => {
      if (!newItemData.description) return;
      const newItem: OfficeLineItem = {
          id: Date.now().toString(),
          productId: newItemData.productId,
          description: newItemData.description,
          quantity: newItemData.quantity || 1,
          unit: newItemData.unit || 'Stk',
          price: newItemData.price || 0,
          discount: newItemData.discount || 0,
          type: newItemData.type || 'material',
          isOptional: false
      };
      setEditing({...editing, items: [...editing.items, newItem]});
      setIsAddingItem(false);
      setNewItemData({ quantity: 1, unit: 'Stk', price: 0, description: '', discount: 0, type: 'material' });
  };

  const removeItem = (index: number) => {
      const newItems = [...editing.items];
      newItems.splice(index, 1);
      setEditing({ ...editing, items: newItems });
  };

  if (overlay === 'supplier') {
      return ( <div className="fixed inset-0 z-[60] bg-white overflow-y-auto"><CustomerManager onBack={() => setOverlay('none')} onSelect={selectSupplier} initialEditMode={true} /></div> );
  }
  if (overlay === 'product') {
      return ( <div className="fixed inset-0 z-[60] bg-white overflow-y-auto"><ProductManager onBack={() => setOverlay('none')} onSelect={(p) => { 
          setNewItemData({ ...newItemData, productId: p.id, description: p.name, price: p.purchasePrice || 0, unit: p.unit }); 
          setOverlay('none'); 
      }} initialEditMode={true} /></div> );
  }

  return (
      <div className="flex flex-col h-screen bg-slate-50 relative animate-in slide-in-from-right-10">
          <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-4">
                  <button onClick={closeEditor} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors font-bold">✕</button>
                  <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">{title}</p>
                      <h2 className="text-lg font-black brand-font uppercase">{editing.docNumber}</h2>
                  </div>
              </div>
              <div className="flex gap-2">
                   <select 
                    className="bg-zinc-100 border-zinc-200 text-zinc-600 border rounded-lg text-xs font-bold uppercase p-2 outline-none"
                    value={editing.status}
                    onChange={e => setEditing({...editing, status: e.target.value as any})}
                   >
                       <option value="draft">Entwurf</option>
                       <option value="sent">Bestellt/Gesendet</option>
                       <option value="paid">Bezahlt</option>
                   </select>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-40">
              
              {/* Meta & Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                      <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Lieferant</h3>
                      {!editing.client.name ? (
                          <button onClick={() => setOverlay('supplier')} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 font-bold uppercase text-xs hover:border-olive-500 hover:text-olive-600 transition-colors">
                              + Lieferant wählen
                          </button>
                      ) : (
                          <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                              <div><p className="font-black text-zinc-800">{editing.client.name}</p><p className="text-sm text-zinc-500">{editing.client.city}</p></div>
                              <button onClick={() => setOverlay('supplier')} className="text-xs font-bold text-zinc-400 uppercase hover:text-red-500">Ändern</button>
                          </div>
                      )}
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                      <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Details</h3>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 block">Datum</label>
                          <input type="date" className="w-full font-bold bg-zinc-50 border-none rounded-lg p-2" value={editing.date} onChange={e => setEditing({...editing, date: e.target.value})} />
                          <label className="text-[10px] font-bold uppercase text-zinc-400 block">Titel / Referenz</label>
                          <input className="w-full font-bold bg-zinc-50 border-none rounded-lg p-2" placeholder="z.B. Materialbestellung Baustelle X" value={editing.title || ''} onChange={e => setEditing({...editing, title: e.target.value})} />
                      </div>
                  </div>
              </div>
              
              {/* Items */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100"><h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Positionen</h3>
                  <div className="space-y-4 mb-6">
                      {editing.items.map((item, idx) => (
                          <div key={idx} className={`relative p-4 rounded-xl border border-zinc-100 bg-white shadow-sm flex flex-col md:flex-row gap-4 items-start`}>
                              <div className="flex-1 w-full">
                                  <input className="font-bold text-zinc-800 bg-transparent outline-none w-full mb-1" value={item.description} onChange={e => { const newItems = [...editing.items]; newItems[idx].description = e.target.value; setEditing({...editing, items: newItems}); }} />
                                  <div className="flex gap-2">
                                      <input className="w-20 bg-zinc-50 rounded p-1 text-xs" type="number" value={item.quantity} onChange={e => { const newItems = [...editing.items]; newItems[idx].quantity = parseFloat(e.target.value); setEditing({...editing, items: newItems}); }} />
                                      <input className="w-16 bg-zinc-50 rounded p-1 text-xs" value={item.unit} onChange={e => { const newItems = [...editing.items]; newItems[idx].unit = e.target.value; setEditing({...editing, items: newItems}); }} />
                                      <input className="w-24 bg-zinc-50 rounded p-1 text-xs text-right" type="number" value={item.price} onChange={e => { const newItems = [...editing.items]; newItems[idx].price = parseFloat(e.target.value); setEditing({...editing, items: newItems}); }} />
                                  </div>
                              </div>
                              <div className="flex items-center gap-4">
                                  <span className="font-mono font-bold">CHF {(item.quantity * item.price).toFixed(2)}</span>
                                  <button onClick={() => removeItem(idx)} className="text-red-400 font-bold hover:text-red-600">×</button>
                              </div>
                          </div>
                      ))}
                  </div>

                  {isAddingItem ? (
                      <div className="bg-zinc-50 p-4 rounded-xl border border-olive-200">
                          <input className="w-full bg-white border border-zinc-200 p-3 rounded-lg font-bold text-sm mb-3" placeholder="Beschreibung..." value={newItemData.description} onChange={e => setNewItemData({...newItemData, description: e.target.value})} />
                          <div className="grid grid-cols-3 gap-2 mb-3">
                              <input type="number" className="p-2 rounded border" placeholder="Menge" value={newItemData.quantity} onChange={e => setNewItemData({...newItemData, quantity: parseFloat(e.target.value)})} />
                              <input className="p-2 rounded border" placeholder="Einh." value={newItemData.unit} onChange={e => setNewItemData({...newItemData, unit: e.target.value})} />
                              <input type="number" className="p-2 rounded border" placeholder="Preis" value={newItemData.price} onChange={e => setNewItemData({...newItemData, price: parseFloat(e.target.value)})} />
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => setIsAddingItem(false)} className="flex-1 py-2 text-zinc-400 font-bold uppercase text-xs">Abbrechen</button>
                              <button onClick={() => setOverlay('product')} className="flex-1 py-2 text-olive-600 font-bold uppercase text-xs">Aus Produkte</button>
                              <button onClick={commitNewItem} className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-bold uppercase text-xs">OK</button>
                          </div>
                      </div>
                  ) : (
                      <button onClick={() => setIsAddingItem(true)} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 font-bold uppercase text-xs hover:border-olive-500 hover:text-olive-600 transition-colors">+ Position</button>
                  )}
                  
                  <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center">
                      <span className="font-bold text-zinc-500 uppercase text-xs">Total Brutto</span>
                      <span className="font-black text-xl">CHF {editing.items.reduce((s, i) => s + (i.quantity * i.price), 0).toFixed(2)}</span>
                  </div>
              </div>
          </div>
          
          <div className="bg-white border-t border-zinc-200 p-4 shadow-lg z-40">
              <div className="flex justify-between items-center max-w-4xl mx-auto gap-4">
                  <button onClick={closeEditor} className="text-zinc-400 font-bold uppercase text-xs px-2 hover:text-black">Abbrechen</button>
                  <button onClick={handleSaveInternal} className="bg-olive-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg">Speichern</button>
              </div>
          </div>
      </div>
  );
};

export default PurchaseEditor;
