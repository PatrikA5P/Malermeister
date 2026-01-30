
import React, { useState, useEffect } from 'react';
import { Product, Account, VatRate, Customer, ProductTier } from '../../officeTypes';
import { db } from '../../db';
import { InputGroup, SectionHeader } from '../../components/FormComponents';
import CustomerManager from '../crm/CustomerManager';
import { formatMoney } from '../../components/SharedUI';
import { CURRENCIES, UNITS } from '../../officeConstants';
import { STANDARD_PRODUCTS } from './db';

interface ProductEditorProps {
    initialProduct: Product;
    onSave: (product: Product) => void;
    onCancel: () => void;
}

const ProductEditor: React.FC<ProductEditorProps> = ({ initialProduct, onSave, onCancel }) => {
    const [editing, setEditing] = useState<Product>(initialProduct);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [showSupplierOverlay, setShowSupplierOverlay] = useState(false);
    const [supplierName, setSupplierName] = useState('');
    const [existingGroups, setExistingGroups] = useState<string[]>([]);

    useEffect(() => {
        const load = async () => {
            setAccounts(await db.accounts.toArray());
            const s = await db.settings.toArray();
            setSettings(s[0]);
            
            // Load existing products from DB
            const allProducts = await db.products.toArray();
            
            // Combine DB products with Standard products to get all potential groups
            // using 'productGroup' property as primary source
            const sourceList = [...allProducts, ...STANDARD_PRODUCTS];
            
            // Extract unique groups
            const groups = Array.from(new Set(sourceList.map(p => p.productGroup || p.group).filter(g => !!g))).sort();
            setExistingGroups(groups as string[]);

            // Resolve Supplier Name if ID exists
            if (initialProduct.supplierId) {
                const supp = await db.customers.get(initialProduct.supplierId);
                if (supp) setSupplierName(supp.companyName || `${supp.firstName} ${supp.lastName}`);
            }
        };
        load();
    }, [initialProduct.supplierId]);

    // Helpers for Accounts
    const revenueAccounts = accounts.filter(a => a.type === 'revenue' || (a.number && a.number.startsWith('3')));
    const expenseAccounts = accounts.filter(a => a.type === 'expense' || (a.number && a.number.startsWith('4')));
    const vatRates: VatRate[] = settings?.vatRates || [];

    // Calculations
    const handlePurchasePriceChange = (val: number) => {
        const surcharge = editing.surchargePercent || 0;
        const newSalesPrice = val * (1 + surcharge / 100);
        setEditing({ ...editing, purchasePrice: val, price: parseFloat(newSalesPrice.toFixed(2)) });
    };

    const handleSurchargeChange = (val: number) => {
        const purchase = editing.purchasePrice || 0;
        const newSalesPrice = purchase * (1 + val / 100);
        setEditing({ ...editing, surchargePercent: val, price: parseFloat(newSalesPrice.toFixed(2)) });
    };

    const handleSalesPriceChange = (val: number) => {
        // Reverse calculate surcharge
        const purchase = editing.purchasePrice || 0;
        let newSurcharge = 0;
        if (purchase > 0) {
            newSurcharge = ((val - purchase) / purchase) * 100;
        }
        setEditing({ ...editing, price: val, surchargePercent: parseFloat(newSurcharge.toFixed(2)) });
    };

    const margin = (editing.price && editing.purchasePrice) 
        ? ((editing.price - editing.purchasePrice) / editing.price * 100) 
        : 0;

    // Supplier Selection
    const handleSupplierSelect = (c: Customer) => {
        setEditing({ ...editing, supplierId: c.id });
        setSupplierName(c.companyName || `${c.firstName} ${c.lastName}`);
        setShowSupplierOverlay(false);
    };

    // Tiers Logic
    const addTier = () => {
        const tiers = editing.pricingTiers || [];
        setEditing({
            ...editing,
            pricingTiers: [...tiers, { minQty: 10, price: editing.price * 0.9 }]
        });
    };

    const updateTier = (idx: number, field: keyof ProductTier, val: number) => {
        const tiers = [...(editing.pricingTiers || [])];
        tiers[idx] = { ...tiers[idx], [field]: val };
        setEditing({ ...editing, pricingTiers: tiers });
    };

    const removeTier = (idx: number) => {
        const tiers = [...(editing.pricingTiers || [])];
        tiers.splice(idx, 1);
        setEditing({ ...editing, pricingTiers: tiers });
    };

    if (showSupplierOverlay) {
        return (
            <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
                <CustomerManager 
                    onBack={() => setShowSupplierOverlay(false)} 
                    onSelect={handleSupplierSelect} 
                    initialEditMode={false} 
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                     <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors">←</button>
                     <div>
                        <h2 className="text-xl font-black brand-font uppercase">{editing.id ? 'Bearbeiten' : 'Neues Produkt'}</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{editing.code || 'Entwurf'}</p>
                     </div>
                </div>
                <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${editing.type === 'service' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    {editing.type === 'service' ? 'Dienstleistung' : 'Material'}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                
                {/* 1. STAMMDATEN */}
                <section>
                    <SectionHeader title="Stammdaten" />
                    <div className="space-y-4">
                        <div className="flex bg-zinc-50 rounded-xl p-1 border border-zinc-200">
                            <button onClick={() => setEditing({...editing, type: 'material'})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${editing.type === 'material' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Material</button>
                            <button onClick={() => setEditing({...editing, type: 'service'})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${editing.type === 'service' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Dienstleistung</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Produktcode">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-mono text-sm font-bold" value={editing.code} onChange={e => setEditing({...editing, code: e.target.value})} placeholder="ART-001" />
                            </InputGroup>
                            <InputGroup label="Einheit">
                                <input 
                                    className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" 
                                    value={editing.unit} 
                                    onChange={e => setEditing({...editing, unit: e.target.value})} 
                                    placeholder="Stk, m2..." 
                                    list="unit-options"
                                />
                                <datalist id="unit-options">
                                    {UNITS.map(u => <option key={u} value={u} />)}
                                </datalist>
                            </InputGroup>
                        </div>

                        <InputGroup label="Produktname">
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-lg focus:bg-white focus:border-olive-500" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
                        </InputGroup>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Gruppe / Kategorie">
                                <input 
                                    className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm font-bold" 
                                    value={editing.productGroup || ''} 
                                    onChange={e => setEditing({...editing, productGroup: e.target.value, group: e.target.value})} 
                                    placeholder="Wählen oder neu erstellen..." 
                                    list="group-options"
                                />
                                <datalist id="group-options">
                                    {existingGroups.map(g => <option key={g} value={g} />)}
                                </datalist>
                            </InputGroup>
                            <InputGroup label="Ansprechpartner Intern">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm" value={editing.contactPerson || ''} onChange={e => setEditing({...editing, contactPerson: e.target.value})} />
                            </InputGroup>
                        </div>

                        <InputGroup label="Beschreibung">
                            <textarea className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm h-24 resize-none" value={editing.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} />
                        </InputGroup>
                    </div>
                </section>

                {/* 2. PREISANGABEN */}
                <section>
                    <SectionHeader title="Preisangaben" />
                    <div className="space-y-4">
                        {/* Price Calculation Row */}
                        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <InputGroup label="Einkaufspreis">
                                <input type="number" className="w-full border p-3 rounded-lg bg-white outline-none font-mono" value={editing.purchasePrice || ''} onChange={e => handlePurchasePriceChange(parseFloat(e.target.value))} placeholder="0.00" />
                            </InputGroup>
                            <InputGroup label="+ Zuschlag in %">
                                <div className="relative">
                                    <input type="number" className="w-full border p-3 rounded-lg bg-white outline-none font-mono pr-8" value={editing.surchargePercent || ''} onChange={e => handleSurchargeChange(parseFloat(e.target.value))} placeholder="0" />
                                    <span className="absolute right-3 top-3 text-zinc-400 font-bold">%</span>
                                </div>
                            </InputGroup>
                            <InputGroup label="Verkaufspreis">
                                <input type="number" className="w-full border p-3 rounded-lg bg-white outline-none font-mono font-bold text-lg text-olive-600" value={editing.price} onChange={e => handleSalesPriceChange(parseFloat(e.target.value))} />
                            </InputGroup>
                        </div>

                        {/* Margin Info */}
                        <div className="flex justify-between items-center bg-olive-50 p-3 rounded-lg border border-olive-100">
                            <span className="text-xs font-bold text-olive-700 uppercase tracking-widest">Profitmarge</span>
                            <span className="text-lg font-black text-olive-800">{margin.toFixed(2)}%</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Währung">
                                <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.currency || 'CHF'} onChange={e => setEditing({...editing, currency: e.target.value})}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </InputGroup>
                            <div />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Ertragskonto (Verkauf)">
                                <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm" value={editing.revenueAccountId} onChange={e => setEditing({...editing, revenueAccountId: parseInt(e.target.value)})}>
                                    {revenueAccounts.map(a => <option key={a.id} value={a.id}>{a.number} {a.name}</option>)}
                                </select>
                            </InputGroup>
                            <InputGroup label="Aufwandkonto (Einkauf)">
                                <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm" value={editing.expenseAccountId} onChange={e => setEditing({...editing, expenseAccountId: parseInt(e.target.value)})}>
                                    <option value="">(Automatisch)</option>
                                    {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.number} {a.name}</option>)}
                                </select>
                            </InputGroup>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="MWST Umsatzsteuer (Verkauf)">
                                <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm" value={editing.vatSalesCode || 'N'} onChange={e => setEditing({...editing, vatSalesCode: e.target.value})}>
                                    {vatRates.map(v => <option key={v.code} value={v.code}>{v.description} ({v.rate}%)</option>)}
                                </select>
                            </InputGroup>
                            <InputGroup label="MWST Vorsteuer (Einkauf)">
                                <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm" value={editing.vatPurchaseCode || 'N'} onChange={e => setEditing({...editing, vatPurchaseCode: e.target.value})}>
                                    {vatRates.map(v => <option key={v.code} value={v.code}>{v.description} ({v.rate}%)</option>)}
                                </select>
                            </InputGroup>
                        </div>
                    </div>
                </section>

                {/* 3. LIEFERANTEN DATEN */}
                <section>
                    <SectionHeader title="Lieferanten Daten" />
                    <div className="space-y-4">
                        <InputGroup label="Lieferant">
                            <div className="relative">
                                <input 
                                    readOnly
                                    className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm cursor-pointer hover:bg-zinc-100" 
                                    value={supplierName} 
                                    onClick={() => setShowSupplierOverlay(true)}
                                    placeholder="Lieferant auswählen..." 
                                />
                                <span className="absolute right-3 top-3 text-lg cursor-pointer" onClick={() => setShowSupplierOverlay(true)}>🔍</span>
                            </div>
                        </InputGroup>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Produktname Lieferant">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm" value={editing.supplierProductName || ''} onChange={e => setEditing({...editing, supplierProductName: e.target.value})} />
                            </InputGroup>
                            <InputGroup label="Produktcode Lieferant">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm" value={editing.supplierProductCode || ''} onChange={e => setEditing({...editing, supplierProductCode: e.target.value})} />
                            </InputGroup>
                        </div>
                        
                        <InputGroup label="Produktbeschreibung Lieferant">
                            <textarea className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm h-16 resize-none" value={editing.supplierProductDescription || ''} onChange={e => setEditing({...editing, supplierProductDescription: e.target.value})} />
                        </InputGroup>

                        <InputGroup label="Bemerkungen / Notizen">
                            <textarea className="w-full border p-3 rounded-xl bg-zinc-50 outline-none text-sm h-20 resize-none" value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} />
                        </InputGroup>
                    </div>
                </section>

                {/* 4. STAFFELUNGEN */}
                <section>
                    <div className="flex justify-between items-end mb-4 border-b border-zinc-100 pb-2 mt-8">
                        <h3 className="font-black uppercase text-xs text-olive-600 tracking-widest">Staffelungen</h3>
                        <button onClick={addTier} className="text-[10px] font-bold uppercase bg-zinc-100 px-2 py-1 rounded hover:bg-zinc-200">+ Neue Staffelung</button>
                    </div>
                    
                    <div className="bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-100 text-zinc-500 font-bold text-[10px] uppercase">
                                <tr>
                                    <th className="p-3">Menge von</th>
                                    <th className="p-3">Menge bis</th>
                                    <th className="p-3">Rabatt %</th>
                                    <th className="p-3">Preis</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {(editing.pricingTiers || []).map((tier, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2"><input type="number" className="w-full bg-white border rounded p-1" value={tier.minQty} onChange={e => updateTier(idx, 'minQty', parseFloat(e.target.value))} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-white border rounded p-1" placeholder="∞" value={tier.maxQty || ''} onChange={e => updateTier(idx, 'maxQty', parseFloat(e.target.value))} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-white border rounded p-1 text-orange-600" value={tier.discountPercent || ''} onChange={e => updateTier(idx, 'discountPercent', parseFloat(e.target.value))} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-white border rounded p-1 font-bold" value={tier.price} onChange={e => updateTier(idx, 'price', parseFloat(e.target.value))} /></td>
                                        <td className="p-2 text-center"><button onClick={() => removeTier(idx)} className="text-red-400 hover:text-red-600">×</button></td>
                                    </tr>
                                ))}
                                {(!editing.pricingTiers || editing.pricingTiers.length === 0) && (
                                    <tr><td colSpan={5} className="p-6 text-center text-xs text-zinc-400">Keine Einträge vorhanden</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="h-20"></div> {/* Spacer */}
            </div>

            {/* Sticky Footer / Info */}
            <div className="bg-white border-t border-zinc-200 p-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 text-xs w-full md:w-auto bg-zinc-50 p-2 rounded-xl px-4 border border-zinc-100">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase text-zinc-400">Einkauf</span>
                            <span className="font-mono">{formatMoney(editing.purchasePrice || 0)}</span>
                        </div>
                        <div className="w-px bg-zinc-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase text-zinc-400">Verkauf</span>
                            <span className="font-mono font-bold text-olive-600">{formatMoney(editing.price)}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={onCancel} className="flex-1 md:flex-none bg-zinc-100 text-zinc-500 px-6 py-3 rounded-xl font-bold uppercase text-xs hover:bg-zinc-200 transition-colors">Abbrechen</button>
                        <button onClick={() => onSave(editing)} className="flex-1 md:flex-none bg-olive-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-olive-700 transition-colors">Speichern</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductEditor;
