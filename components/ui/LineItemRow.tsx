
import React, { useState, useRef, useEffect } from 'react';
import { OfficeLineItem, VatRate } from '../../officeTypes';
import { formatMoney } from '../SharedUI';
import { Button } from './Button';
import { baseInputStyles } from './Input';

interface LineItemRowProps {
    item: OfficeLineItem;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onChange: (id: string, field: keyof OfficeLineItem, value: any) => void;
    onDelete: (id: string) => void;
    currency?: string;
    vatOptions?: VatRate[];
}

// Neutral styles matching Input.tsx
const s = {
    container: "bg-white border-zinc-200 shadow-sm hover:border-zinc-300",
    expandedContainer: "ring-1 ring-zinc-800 border-zinc-800 shadow-lg",
    dragHandle: "bg-zinc-50 border-r border-zinc-100 text-zinc-300",
    title: "text-zinc-900",
    amount: "text-zinc-900",
    meta: "text-zinc-500 bg-zinc-50 text-zinc-600",
    metaLabel: "text-zinc-400",
    expandedBg: "bg-zinc-50 border-t border-zinc-200",
    // Use imported baseInputStyles for input class
};

export const LineItemRow: React.FC<LineItemRowProps> = ({ 
    item, 
    index, 
    isExpanded, 
    onToggle, 
    onChange, 
    onDelete, 
    currency = 'CHF',
    vatOptions = []
}) => {
    // Local state for UI logic (discount toggle)
    const [enableDiscount, setEnableDiscount] = useState(!!item.discount);
    const [discountType, setDiscountType] = useState<'percent'|'amount'>('percent'); // Visual only, backend uses percent usually

    // Update discount when checkbox changes
    useEffect(() => {
        if (!enableDiscount && item.discount !== 0) {
            onChange(item.id, 'discount', 0);
        }
    }, [enableDiscount]);

    // Calc visuals
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 0);
    const discount = Number(item.discount || 0);
    const net = qty * price * (1 - discount / 100);
    const vat = net * ((item.vatRate || 8.1) / 100);
    const gross = net + vat;

    const handleChange = (field: keyof OfficeLineItem, val: any) => {
        onChange(item.id, field, val);
    };

    return (
        <div className={`rounded-xl border transition-all duration-200 overflow-hidden mb-3 ${isExpanded ? s.expandedContainer : s.container}`}>
            {/* COLLAPSED ROW */}
            <div className="flex cursor-pointer group" onClick={onToggle}>
                {/* Drag Handle */}
                <div className={`w-10 flex flex-col items-center justify-center transition-colors ${s.dragHandle}`}>
                    <span className="text-lg leading-none">≡</span>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-3 min-w-0">
                    {/* Line 1: Title & Amount */}
                    <div className="flex justify-between items-start mb-1.5 gap-4">
                        <div className="flex-1 min-w-0 truncate">
                            {item.productCode && (
                                <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded mr-2 border border-zinc-200">
                                    {item.productCode}
                                </span>
                            )}
                            <span className={`font-bold text-sm ${s.title}`}>{item.description || 'Neue Position'}</span>
                        </div>
                        <span className={`font-bold text-sm whitespace-nowrap ${s.amount}`}>{formatMoney(gross)}</span>
                    </div>
                    
                    {/* Line 2: Single Line Metadata */}
                    <div className="flex items-center gap-2 text-[11px] overflow-hidden whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${s.meta}`}>
                            {qty} {item.unit}
                        </span>
                        <span className={s.metaLabel}>×</span>
                        <span className={s.metaLabel}>{formatMoney(price)}</span>
                        {item.discount ? (
                            <span className="text-orange-600 font-bold bg-orange-50 px-1 rounded ml-1">-{item.discount}%</span>
                        ) : null}
                        <span className="text-zinc-300 mx-1">|</span>
                        <span className={s.metaLabel}>MWST {item.vatRate}%</span>
                        {item.isOptional && <span className="ml-2 text-[9px] font-bold uppercase border border-zinc-200 px-1 rounded text-zinc-400">Optional</span>}
                    </div>
                </div>
            </div>

            {/* EXPANDED FORM */}
            {isExpanded && (
                <div className={`p-5 animate-in slide-in-from-top-2 duration-200 cursor-default ${s.expandedBg}`} onClick={e => e.stopPropagation()}>
                    
                    {/* 1. Code & Description */}
                    <div className="mb-4 space-y-3">
                            <div>
                            <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Code</label>
                            <input 
                                className={`${baseInputStyles} px-3 py-2 font-mono`} 
                                value={item.productCode || ''}
                                onChange={e => handleChange('productCode', e.target.value)}
                            />
                            </div>
                            <div>
                            <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Beschreibung</label>
                            <textarea 
                                className={`${baseInputStyles} px-3 py-2 h-auto`} 
                                rows={2} 
                                value={item.description || ''}
                                onChange={e => handleChange('description', e.target.value)}
                            />
                            </div>
                    </div>

                    {/* 2. Menge & Einheit (Row) */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Menge</label>
                            <input 
                                type="number" 
                                className={`${baseInputStyles} px-3`} 
                                value={item.quantity} 
                                onChange={e => handleChange('quantity', parseFloat(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Einheit</label>
                            <input 
                                list={`units-${index}`}
                                className={`${baseInputStyles} px-3`}
                                value={item.unit}
                                onChange={e => handleChange('unit', e.target.value)}
                            />
                            <datalist id={`units-${index}`}>
                                <option value="m²" />
                                <option value="Stk" />
                                <option value="Std" />
                                <option value="Psch" />
                                <option value="lfm" />
                            </datalist>
                        </div>
                    </div>

                    {/* 3. Währung & Preis (Row) */}
                    <div className="mb-4">
                        <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Preis</label>
                        <div className="flex gap-2">
                            <select 
                                className={`w-24 rounded-xl px-2 font-bold text-sm outline-none bg-zinc-50 border border-zinc-200`}
                                disabled // Currency usually global per doc
                            >
                                <option>{currency}</option>
                            </select>
                            <input 
                                type="number" 
                                className={`${baseInputStyles} flex-1 px-3`} 
                                value={item.price} 
                                onChange={e => handleChange('price', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* 4. MWST (Separate Row) */}
                    <div className="mb-4">
                        <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>MWST</label>
                        <select 
                            className={`${baseInputStyles} px-3`}
                            value={item.vatRate}
                            onChange={e => handleChange('vatRate', parseFloat(e.target.value))}
                        >
                            {vatOptions.length > 0 ? vatOptions.map(v => (
                                <option key={v.code} value={v.rate}>{v.description} ({v.rate}%)</option>
                            )) : (
                                <>
                                <option value={8.1}>8.1% (Normal)</option>
                                <option value={2.6}>2.6% (Reduziert)</option>
                                <option value={0}>0.0%</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* 5. Rabatt Sektion */}
                    <div className="mb-4 p-3 bg-white rounded-lg border border-zinc-100">
                        <div className="flex items-center gap-2 mb-2">
                            <input 
                                type="checkbox" 
                                checked={enableDiscount}
                                onChange={(e) => setEnableDiscount(e.target.checked)}
                                className="w-4 h-4 accent-zinc-800 rounded cursor-pointer"
                            />
                            <label className="text-xs font-bold text-zinc-600 select-none cursor-pointer" onClick={() => setEnableDiscount(!enableDiscount)}>Rabatt gewähren</label>
                        </div>
                        
                        {enableDiscount && (
                            <div className="flex gap-2 animate-in slide-in-from-top-1">
                                <div className="flex rounded-lg overflow-hidden border border-zinc-200">
                                    <button 
                                        onClick={() => setDiscountType('percent')}
                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${discountType === 'percent' ? 'bg-zinc-800 text-white' : 'bg-zinc-50 text-zinc-500'}`}
                                    >%</button>
                                    <button 
                                        onClick={() => setDiscountType('amount')}
                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${discountType === 'amount' ? 'bg-zinc-800 text-white' : 'bg-zinc-50 text-zinc-500'}`}
                                    >CHF</button>
                                </div>
                                <input 
                                    type="number" 
                                    className={`w-24 rounded-lg px-3 py-1.5 font-bold text-sm outline-none text-orange-600 border border-zinc-200 focus:border-zinc-800`} 
                                    value={item.discount}
                                    onChange={e => handleChange('discount', parseFloat(e.target.value))}
                                />
                            </div>
                        )}
                    </div>

                    {/* 6. Optional Checkbox */}
                    <div className="mb-6">
                            <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={!!item.isOptional}
                                onChange={(e) => handleChange('isOptional', e.target.checked)}
                                className="w-4 h-4 accent-zinc-800 rounded cursor-pointer"
                            />
                            <label className="text-xs font-bold text-zinc-500 select-none cursor-pointer" onClick={() => handleChange('isOptional', !item.isOptional)}>
                                Als "Optional" markieren (Nicht im Total berechnet)
                            </label>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-2 border-t border-black/5 pt-4">
                        <Button variant="destructive" onClick={() => onDelete(item.id)} label="Löschen" />
                        <Button variant="solid" onClick={onToggle} label="Fertig" />
                    </div>
                </div>
            )}
        </div>
    );
};
