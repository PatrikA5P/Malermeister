import { useState, useEffect } from 'react';
import { Document, LineItem } from '../types';
import { STANDARD_ITEMS } from '../constants';

interface QuoteToolProps {
  onBack?: () => void;
}

const QuoteTool: React.FC<QuoteToolProps> = ({ onBack }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // Load documents on mount
  useEffect(() => {
    const saved = localStorage.getItem('borer_docs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setDocuments(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved documents", e);
      }
    }
  }, []);

  // Save documents whenever they change
  useEffect(() => {
    if (documents && documents.length > 0) {
      localStorage.setItem('borer_docs', JSON.stringify(documents));
    }
  }, [documents]);

  // Handle external updates (like AI drafts)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('borer_docs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setDocuments(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('new-ai-draft', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('new-ai-draft', handleStorageChange);
    };
  }, []);

  const createNewQuote = () => {
    const newDoc: Document = {
      id: `Q-${Date.now().toString().slice(-6)}`,
      type: 'quote',
      clientName: '',
      clientAddress: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      status: 'draft',
    };
    setEditingDoc(newDoc);
    setView('editor');
  };

  const convertToInvoice = (quote: Document) => {
    const newInvoice: Document = {
      ...quote,
      id: `I-${Date.now().toString().slice(-6)}`,
      type: 'invoice',
      relatedQuoteId: quote.id,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      isAiGenerated: false
    };
    setEditingDoc(newInvoice);
    setView('editor');
  };

  const saveDocument = () => {
    if (!editingDoc) return;
    setDocuments(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const exists = safePrev.find(d => d.id === editingDoc.id);
      let updated;
      if (exists) {
        updated = safePrev.map(d => d.id === editingDoc.id ? editingDoc : d);
      } else {
        updated = [editingDoc, ...safePrev];
      }
      localStorage.setItem('borer_docs', JSON.stringify(updated));
      return updated;
    });
    setView('list');
    setEditingDoc(null);
  };

  const deleteDocument = (id: string) => {
    if (confirm('Möchten Sie dieses Dokument wirklich löschen?')) {
      setDocuments(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const updated = safePrev.filter(d => d.id !== id);
        localStorage.setItem('borer_docs', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const addLineItem = (template?: Partial<LineItem>) => {
    if (!editingDoc) return;
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: template?.description || 'Neue Position',
      quantity: template?.quantity || 1,
      unit: template?.unit || 'Stk',
      pricePerUnit: template?.pricePerUnit || 0,
    };
    const currentItems = Array.isArray(editingDoc.items) ? editingDoc.items : [];
    setEditingDoc({ ...editingDoc, items: [...currentItems, newItem] });
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    if (!editingDoc || !editingDoc.items) return;
    setEditingDoc({
      ...editingDoc,
      items: editingDoc.items.map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const removeLineItem = (id: string) => {
    if (!editingDoc || !editingDoc.items) return;
    setEditingDoc({
      ...editingDoc,
      items: editingDoc.items.filter(item => item && item.id !== id)
    });
  };

  const calculateTotal = (items: LineItem[]) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-black text-white p-6 shadow-xl sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="hover:text-olive-400 transition-colors flex items-center space-x-2 text-sm uppercase tracking-widest font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              <span>Website</span>
            </button>
            <div className="h-6 w-px bg-white/20"></div>
            <h1 className="text-xl font-bold brand-font tracking-wider">Admin <span className="text-olive-600">Borer</span></h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="bg-olive-900/50 px-3 py-1 rounded text-[10px] font-bold text-olive-400 border border-olive-800">INTERN</div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 md:p-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold text-black brand-font">Dokumenten <span className="text-olive-600">Übersicht</span></h2>
            <p className="text-black/40 mt-1 uppercase tracking-[0.2em] text-[10px] font-bold">Manage AI-Drafts, Offerten & Rechnungen</p>
          </div>
          {view === 'list' && (
            <button 
              onClick={createNewQuote}
              className="mt-6 md:mt-0 bg-olive-600 hover:bg-olive-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all active:scale-95 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Offerte manuell
            </button>
          )}
        </div>

        {view === 'list' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {!documents || documents.length === 0 ? (
              <div className="p-24 text-center">
                <p className="text-slate-400 font-medium italic">Noch keine Daten vorhanden.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">ID</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Kunde</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Typ</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Total Brutto</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 font-bold text-slate-900">
                          <div className="flex items-center">
                            {doc.id}
                            {doc.isAiGenerated && (
                              <span className="ml-2 bg-olive-100 text-olive-700 text-[8px] px-1 rounded-sm font-black border border-olive-200 animate-pulse">KI DRAFT</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{doc.clientName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{doc.clientAddress}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${doc.type === 'quote' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {doc.type === 'quote' ? 'Offerte' : 'Rechnung'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-right text-slate-900">CHF {(calculateTotal(doc.items || []) * 1.081).toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${doc.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-olive-100 text-olive-700'}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-3">
                          <button onClick={() => { setEditingDoc(doc); setView('editor'); }} className="text-black/40 hover:text-olive-700 font-bold text-[10px] uppercase tracking-widest transition-colors">Edit</button>
                          {doc.type === 'quote' && (
                            <button onClick={() => convertToInvoice(doc)} className="text-olive-600 hover:text-black font-bold text-[10px] uppercase tracking-widest transition-colors">Abrechnen</button>
                          )}
                          <button onClick={() => deleteDocument(doc.id)} className="text-red-300 hover:text-red-600">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-8 md:p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start gap-8 bg-slate-50/30">
                <div className="space-y-4 flex-1 w-full max-w-xl">
                   <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-olive-600">
                    {editingDoc?.type === 'quote' ? 'Offerte' : 'Rechnung'} bearbeiten
                    {editingDoc?.isAiGenerated && " (KI-Entwurf)"}
                  </label>
                  <input 
                    type="text" 
                    className="text-3xl font-bold text-black border-b border-transparent hover:border-slate-200 focus:border-olive-600 outline-none w-full bg-transparent transition-all py-2"
                    placeholder="Kundenname..."
                    value={editingDoc?.clientName || ''}
                    onChange={e => setEditingDoc({ ...editingDoc!, clientName: e.target.value })}
                  />
                  <textarea 
                    className="text-slate-500 w-full bg-transparent border-none outline-none focus:ring-0 placeholder-slate-300 resize-none h-24 text-lg leading-relaxed"
                    placeholder="Adresse..."
                    value={editingDoc?.clientAddress || ''}
                    onChange={e => setEditingDoc({ ...editingDoc!, clientAddress: e.target.value })}
                  />
                </div>
                <div className="text-right w-full md:w-auto">
                  <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-xl shadow-2xl mb-6 ml-auto border-2 border-olive-600 transform -rotate-3">
                    <span className="font-bold text-3xl brand-font">B</span>
                  </div>
                  <p className="font-bold text-lg uppercase tracking-widest brand-font">BORER</p>
                  <p className="text-xs text-slate-400 font-bold uppercase">{editingDoc?.id}</p>
                  {editingDoc?.relatedQuoteId && <p className="text-[9px] text-olive-600 font-bold">RECHNUNG ZU: {editingDoc.relatedQuoteId}</p>}
                </div>
              </div>

              <div className="p-8 md:p-12">
                <table className="w-full text-left">
                  <thead className="border-b-2 border-slate-900">
                    <tr>
                      <th className="pb-4 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Position</th>
                      <th className="pb-4 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 w-24">Menge</th>
                      <th className="pb-4 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 w-24 text-center">Einheit</th>
                      <th className="pb-4 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 w-32 text-right">Preis / Einheit</th>
                      <th className="pb-4 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 w-32 text-right">Total</th>
                      <th className="pb-4 w-12 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(editingDoc?.items || []).map(item => (
                      <tr key={item.id}>
                        <td className="py-4">
                          <input 
                            type="text" 
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-900 font-bold" 
                            value={item.description}
                            onChange={e => updateLineItem(item.id, { description: e.target.value })}
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-900 font-bold text-center" 
                            value={item.quantity}
                            onChange={e => updateLineItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="text" 
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-500 text-xs font-bold text-center" 
                            value={item.unit}
                            onChange={e => updateLineItem(item.id, { unit: e.target.value })}
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-900 font-bold text-right" 
                            value={item.pricePerUnit}
                            onChange={e => updateLineItem(item.id, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="py-4 text-right font-black text-slate-900">
                          {((item.quantity || 0) * (item.pricePerUnit || 0)).toFixed(2)}
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => removeLineItem(item.id)} className="text-slate-300 hover:text-red-600 transition-all p-2">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-12 flex flex-col md:flex-row justify-between items-start gap-12">
                   <div className="flex flex-wrap gap-2">
                      <button onClick={() => addLineItem()} className="px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-olive-600 transition-all">+ Position</button>
                      {STANDARD_ITEMS.map((si, idx) => (
                        <button key={idx} onClick={() => addLineItem(si)} className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-olive-50 hover:text-olive-700 border border-slate-200 transition-all">+ {si.description}</button>
                      ))}
                   </div>
                  
                  <div className="w-full md:w-80 space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                      <span>Netto</span>
                      <span>CHF {calculateTotal(editingDoc?.items || []).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-olive-600">
                      <span>MwSt (8.1%)</span>
                      <span>CHF {(calculateTotal(editingDoc?.items || []) * 0.081).toFixed(2)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-900 flex justify-between items-center">
                      <span className="font-black text-sm uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-black">CHF {(calculateTotal(editingDoc?.items || []) * 1.081).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12 bg-slate-950 flex justify-end space-x-4">
                 <button onClick={() => { setView('list'); setEditingDoc(null); }} className="px-6 py-3 rounded-lg font-bold text-white/50 hover:text-white uppercase tracking-widest text-xs transition-colors">Abbrechen</button>
                 <button onClick={saveDocument} className="px-12 py-4 rounded-xl bg-olive-600 hover:bg-olive-700 text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all">
                   {editingDoc?.type === 'quote' ? 'Offerte speichern' : 'Rechnung speichern'}
                 </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default QuoteTool;