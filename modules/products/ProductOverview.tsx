
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { Product } from '../../officeTypes';
import { Toast, ToastType, formatMoney } from '../../components/SharedUI';
import ProductEditor from './ProductEditor';

const ProductOverview: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  
  // UI
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'material' | 'service'>('all');
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setProducts(await db.products.toArray());
  };

  const createNew = () => {
    setEditingProduct({
        code: '',
        name: '',
        type: 'material',
        unit: 'Stk',
        price: 0,
        purchasePrice: 0,
        accountId: 3000, // Default Revenue
        currency: 'CHF'
    });
  };

  const handleSave = async (product: Product) => {
    if (product.id) await db.products.update(product.id, product as any);
    else await db.products.add(product);
    setEditingProduct(null);
    loadData();
    setToast({ msg: 'Produkt gespeichert', type: 'success' });
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
      return products
        .filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTab = activeTab === 'all' || p.type === activeTab;
            return matchesSearch && matchesTab;
        })
        .sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
  }, [products, searchTerm, activeTab, sortConfig]);

  if (editingProduct) {
      return (
          <ProductEditor 
            initialProduct={editingProduct}
            onSave={handleSave}
            onCancel={() => setEditingProduct(null)}
          />
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       {/* Header */}
       <div className="sticky top-0 bg-slate-50 z-20 pt-6 pb-2 px-4 md:px-8 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/95">
         <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-4">
                 <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all shadow-sm">←</button>
                 <div>
                    <h2 className="text-2xl font-black brand-font uppercase">Produkte</h2>
                 </div>
             </div>
             
             <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <span className="text-3xl font-black brand-font text-zinc-900">{products.length}</span>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-widest">Artikel</span>
                </div>
             </div>
         </div>

         {/* Toolbar */}
         <div className="flex flex-col md:flex-row gap-4 pb-4 items-stretch md:items-center">
             
             {/* Tabs */}
             <div className="hidden md:flex bg-zinc-200/50 p-1 rounded-xl mr-auto">
                {([
                  { id: 'all', label: 'Alle' },
                  { id: 'material', label: 'Material' },
                  { id: 'service', label: 'Dienstleistung' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all ${
                      activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
             </div>

             <div className="flex gap-2 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64 transition-all">
                      <input 
                          className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold" 
                          placeholder="Code oder Name..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                      <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
                 </div>
                 <button onClick={createNew} className="bg-zinc-900 hover:bg-olive-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg whitespace-nowrap flex items-center justify-center gap-2">
                     <span>+</span><span className="hidden md:inline">Erfassen</span>
                 </button>
             </div>
         </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto bg-slate-50">
         
         {/* Mobile List */}
         <div className="md:hidden px-4 pb-24 space-y-3 pt-4">
             {filteredProducts.map(p => (
               <div key={p.id} onClick={() => setEditingProduct(p)} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 hover:border-olive-500 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                      <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500 font-bold">{p.code}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase ${p.type === 'service' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                  {p.type === 'service' ? 'DL' : 'MAT'}
                              </span>
                          </div>
                          <p className="font-black text-lg text-zinc-900 leading-tight mb-1">{p.name}</p>
                          <p className="text-xs text-zinc-400">Einheit: {p.unit}</p>
                      </div>
                      <div className="text-right">
                          <p className="font-black text-zinc-900 text-lg tabular-nums">{formatMoney(p.price)}</p>
                          {p.purchasePrice && p.purchasePrice > 0 && (
                              <p className="text-[10px] text-zinc-400 mt-1">Marge: {(((p.price - p.purchasePrice) / p.price) * 100).toFixed(1)}%</p>
                          )}
                      </div>
                  </div>
               </div>
             ))}
         </div>

         {/* Desktop Table */}
         <div className="hidden md:block px-8 pb-10 pt-4">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                        <tr>
                            {[
                                { k: 'code', l: 'Code' },
                                { k: 'name', l: 'Bezeichnung' },
                                { k: 'type', l: 'Art' },
                                { k: 'unit', l: 'Einheit' },
                                { k: 'purchasePrice', l: 'EK Preis', r: true },
                                { k: 'price', l: 'VK Preis', r: true },
                                { k: 'margin', l: 'Marge', r: true }
                            ].map(col => (
                                <th 
                                    key={col.k}
                                    onClick={() => handleSort(col.k)}
                                    className={`p-4 text-[10px] font-bold uppercase text-zinc-500 tracking-wider cursor-pointer hover:text-black hover:bg-zinc-100 transition-colors ${col.r ? 'text-right' : ''}`}
                                >
                                    {col.l} {sortConfig.key === col.k && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700">
                        {filteredProducts.map(p => {
                            const margin = (p.purchasePrice && p.price) ? ((p.price - p.purchasePrice) / p.price * 100) : 0;
                            return (
                                <tr key={p.id} onClick={() => setEditingProduct(p)} className="group hover:bg-olive-50/20 transition-colors cursor-pointer">
                                    <td className="p-4 font-mono text-zinc-500 font-bold">{p.code}</td>
                                    <td className="p-4 font-bold text-zinc-900">{p.name}</td>
                                    <td className="p-4">
                                        <span className={`text-[9px] px-2 py-1 rounded font-black uppercase tracking-widest ${p.type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {p.type === 'service' ? 'Dienstleistung' : 'Material'}
                                        </span>
                                    </td>
                                    <td className="p-4">{p.unit}</td>
                                    <td className="p-4 text-right tabular-nums text-zinc-500">{p.purchasePrice ? formatMoney(p.purchasePrice) : '-'}</td>
                                    <td className="p-4 text-right tabular-nums font-bold text-zinc-900">{formatMoney(p.price)}</td>
                                    <td className="p-4 text-right tabular-nums">
                                        {margin > 0 ? (
                                            <span className={`text-xs font-bold ${margin < 20 ? 'text-red-500' : 'text-green-600'}`}>
                                                {margin.toFixed(1)}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <tr><td colSpan={7} className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Keine Produkte gefunden</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
       </div>

       <button onClick={createNew} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90">
           <span className="text-2xl">+</span>
       </button>
    </div>
  );
};

export default ProductOverview;
