
import React, { useState } from 'react';
import { formatMoney } from '../SharedUI';
import { baseInputStyles } from './Input';

interface TotalsBlockProps {
    totalNet: number;
    totalVat: number;
    totalGross: number;
    currency?: string;
    
    // Optional discount logic if implemented globally on doc level
    onDiscountChange?: (type: 'percent' | 'amount', value: number) => void;
}

const s = {
    container: "bg-white border-zinc-200 shadow-sm",
    title: "text-zinc-900",
    amount: "text-zinc-900",
    // Use baseInputStyles instead of creating new ones
};

export const TotalsBlock: React.FC<TotalsBlockProps> = ({ 
    totalNet, 
    totalVat, 
    totalGross,
    currency = 'CHF' 
}) => {
    // Local state for demonstration of the exact UI interaction from showcase
    // In a real app, these might come from props if the document supports global discounts
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [useDiscount, setUseDiscount] = useState(false);

    // Calculate display values based on local discount state
    const rawTotal = totalNet; // Assuming totalNet passed is before global discount
    const discountAmount = useDiscount ? (discountType === 'percent' ? rawTotal * (discountValue/100) : discountValue) : 0;
    const netTotal = rawTotal - discountAmount;
    // Recalculate VAT loosely based on ratio for display purposes
    const vatRatio = totalNet > 0 ? totalVat / totalNet : 0.081; 
    const finalVat = netTotal * vatRatio;
    const finalTotal = netTotal + finalVat;

    return (
        <div>
            <h3 className="text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Kalkulation</h3>
            <div className={`p-6 rounded-2xl border ${s.container}`}>
                
                {/* Subtotals */}
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500 font-medium">Zwischensumme</span>
                    <span className={`font-bold ${s.amount}`}>{formatMoney(rawTotal)}</span>
                </div>

                {/* Discount Row */}
                <div className="my-3 py-2 border-t border-b border-dashed border-zinc-200">
                    <div className="flex items-center justify-between">
                        
                        {/* Left: Controls */}
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                checked={useDiscount} 
                                onChange={(e) => setUseDiscount(e.target.checked)}
                                className="w-4 h-4 accent-zinc-800 rounded cursor-pointer"
                            />
                            {useDiscount ? (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                    <div className="flex bg-zinc-100 rounded p-0.5">
                                        <button 
                                            onClick={() => setDiscountType('percent')}
                                            className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${discountType === 'percent' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}
                                        >%</button>
                                        <button 
                                            onClick={() => setDiscountType('amount')}
                                            className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${discountType === 'amount' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}
                                        >CHF</button>
                                    </div>
                                    <input 
                                        type="number" 
                                        className={`w-16 rounded-xl px-2 py-1 font-bold text-xs outline-none text-center bg-white border border-zinc-200 focus:border-zinc-800`} 
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                                    />
                                    <span className="text-[10px] font-bold uppercase text-zinc-400">Rabatt</span>
                                </div>
                            ) : (
                                <span className="text-xs text-zinc-400 font-medium select-none">Kein Rabatt</span>
                            )}
                        </div>

                        {/* Right: Result */}
                        {useDiscount && (
                            <span className="font-bold text-xs text-red-500 animate-in fade-in">
                                - {formatMoney(discountAmount)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Net & Vat */}
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500 font-medium">Netto</span>
                    <span className={`font-bold ${s.amount}`}>{formatMoney(netTotal)}</span>
                </div>
                <div className="flex justify-between text-xs mb-4">
                    <span className="text-zinc-500 font-medium">MWST</span>
                    <span className="font-bold text-zinc-600">{formatMoney(finalVat)}</span>
                </div>

                {/* Grand Total */}
                <div className={`flex justify-between items-center pt-4 border-t border-zinc-200`}>
                    <span className={`text-sm font-black uppercase ${s.title}`}>Total {currency}</span>
                    <span className={`text-2xl font-black ${s.title}`}>{formatMoney(finalTotal).replace('CHF ', '')}</span>
                </div>

            </div>
        </div>
    );
};
