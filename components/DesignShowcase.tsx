
import React, { useState } from 'react';

// --- HELPERS ---
const formatMoney = (v: number, currency = 'CHF') =>
  `${currency} ${(Number.isFinite(v) ? v : 0).toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

// --- MOCK DATA ---
const MOCK_ITEM = {
  id: '1',
  productCode: 'M-102',
  description: 'Wandanstrich Wohnzimmer (Q3) inkl. Abdeckarbeiten',
  quantity: 45.5,
  unit: 'm²',
  price: 18.50,
  currency: 'CHF',
  discount: 10,
  discountType: 'percent', // 'percent' | 'amount'
  vatRate: 8.1,
  totalNet: 757.58,
  isOptional: false,
};

const MOCK_QUOTE = {
  id: 101,
  docNumber: 'O-2025-0042',
  title: 'Renovation Attika',
  client: { name: 'Familie Müller', city: '8000 Zürich' },
  date: '20.05.2025',
  totalGross: 4520.50,
  status: 'Entwurf',
  itemsCount: 8
};

// --- TYPES ---
type StyleVariant = 'favorite';

const DesignShowcase: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // State for Line Items expansion
  const [expandedId, setExpandedId] = useState<string | null>('pos-fav');
  
  // State for Totals
  const [generalDiscountType, setGeneralDiscountType] = useState<'percent' | 'amount'>('percent');
  const [generalDiscountValue, setGeneralDiscountValue] = useState<number>(5);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans selection:bg-olive-200">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-50 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-black hover:text-white transition-all font-bold">←</button>
            <h1 className="text-xl font-black brand-font uppercase">Design System</h1>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hidden md:block">Final Selection</div>
      </div>

      <div className="container mx-auto p-4 md:p-8 space-y-20 max-w-6xl">
        
        {/* ==========================================================================================
            GROUP 1: POSITIONEN (LINE ITEMS)
           ========================================================================================== */}
        <section>
            <div className="mb-8 border-b border-zinc-200 pb-4">
                <h2 className="text-3xl font-black brand-font mb-2">1. Positionen</h2>
                <p className="text-zinc-500 text-sm">Update: Produktcode Feld, Währungs-Dropdown, MWST separat.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <LineItemShowcase 
                    variant="favorite" 
                    title="Standard Ansicht (Eingeklappt & Ausgeklappt)" 
                    isExpanded={expandedId === 'pos-fav'} 
                    onToggle={() => toggle('pos-fav')} 
                />
            </div>
        </section>


        {/* ==========================================================================================
            GROUP 2: OFFERTEN (QUOTES)
           ========================================================================================== */}
        <section>
            <div className="mb-8 border-b border-zinc-200 pb-4">
                <h2 className="text-3xl font-black brand-font mb-2">2. Offerten Cards</h2>
                <p className="text-zinc-500 text-sm">Kompakt, optimierte Höhe, volle Breite.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <QuoteCardShowcase variant="favorite" title="Card Preview" />
            </div>
        </section>


        {/* ==========================================================================================
            GROUP 3: TOTALS & RABATTE
           ========================================================================================== */}
        <section>
            <div className="mb-8 border-b border-zinc-200 pb-4">
                <h2 className="text-3xl font-black brand-font mb-2">3. Totals Block</h2>
                <p className="text-zinc-500 text-sm">Toggle Links, Minus-Betrag Oben, volle Breite.</p>
            </div>

            <div className="grid grid-cols-1 gap-12">
                <TotalShowcase 
                    variant="favorite" 
                    title="Kalkulation"
                    discountType={generalDiscountType}
                    setDiscountType={setGeneralDiscountType}
                    discountValue={generalDiscountValue}
                    setDiscountValue={setGeneralDiscountValue}
                />
            </div>
        </section>

      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// SUB-COMPONENTS & STYLES
// ---------------------------------------------------------------------------

/**
 * Styles Configuration
 */
const styles: Record<StyleVariant, any> = {
    favorite: {
        container: "bg-white border-zinc-200 shadow-sm hover:border-olive-300",
        expandedContainer: "ring-1 ring-olive-500 border-olive-500 shadow-lg",
        dragHandle: "bg-zinc-50 border-r border-zinc-100 text-zinc-300",
        title: "text-zinc-900",
        amount: "text-zinc-900",
        meta: "text-zinc-500 bg-zinc-50 text-zinc-600",
        metaLabel: "text-zinc-400",
        expandedBg: "bg-zinc-50 border-t border-zinc-200",
        input: "bg-white border-zinc-200 focus:border-olive-500",
        button: "bg-zinc-900 text-white hover:bg-olive-600",
        tag: "bg-zinc-100 text-zinc-600",
        accentText: "text-olive-600",
        overlay: "bg-white/95 backdrop-blur-sm"
    }
};


// ---------------------------------------------------------------------------
// 1. LINE ITEM COMPONENT
// ---------------------------------------------------------------------------
const LineItemShowcase = ({ variant, title, isExpanded, onToggle }: { variant: StyleVariant, title: string, isExpanded: boolean, onToggle: () => void }) => {
    const s = styles[variant];
    const [rowDiscountType, setRowDiscountType] = useState<'percent'|'amount'>('percent');
    const [enableDiscount, setEnableDiscount] = useState(true);
    const [isOptional, setIsOptional] = useState(false);

    return (
        <div>
            <h3 className="text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">{title}</h3>
            
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${isExpanded ? s.expandedContainer : s.container}`}>
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
                                <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded mr-2 border border-zinc-200">
                                    {MOCK_ITEM.productCode}
                                </span>
                                <span className={`font-bold text-sm ${s.title}`}>{MOCK_ITEM.description}</span>
                            </div>
                            <span className={`font-bold text-sm whitespace-nowrap ${s.amount}`}>{formatMoney(757.60)}</span>
                        </div>
                        
                        {/* Line 2: Single Line Metadata */}
                        <div className="flex items-center gap-2 text-[11px] overflow-hidden whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${s.meta}`}>
                                {MOCK_ITEM.quantity} {MOCK_ITEM.unit}
                            </span>
                            <span className={s.metaLabel}>×</span>
                            <span className={s.metaLabel}>{formatMoney(MOCK_ITEM.price)}</span>
                            {enableDiscount && (
                                <span className="text-orange-600 font-bold bg-orange-50 px-1 rounded ml-1">-{MOCK_ITEM.discount}%</span>
                            )}
                            <span className="text-zinc-300 mx-1">|</span>
                            <span className={s.metaLabel}>MWST {MOCK_ITEM.vatRate}%</span>
                            {isOptional && <span className="ml-2 text-[9px] font-bold uppercase border border-zinc-200 px-1 rounded text-zinc-400">Optional</span>}
                        </div>
                    </div>
                </div>

                {/* EXPANDED FORM */}
                {isExpanded && (
                    <div className={`p-5 animate-in slide-in-from-top-2 duration-200 ${s.expandedBg}`}>
                        
                        {/* 1. Code & Description */}
                        <div className="mb-4 space-y-3">
                             <div>
                                <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Code</label>
                                <input 
                                    className={`w-full rounded-lg px-3 py-2 font-mono text-sm outline-none transition-colors ${s.input}`} 
                                    defaultValue={MOCK_ITEM.productCode}
                                />
                             </div>
                             <div>
                                <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Beschreibung</label>
                                <textarea 
                                    className={`w-full rounded-lg px-3 py-2 font-bold text-sm outline-none transition-colors ${s.input}`} 
                                    rows={2} 
                                    defaultValue={MOCK_ITEM.description}
                                />
                             </div>
                        </div>

                        {/* 2. Menge & Einheit (Row) */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Menge</label>
                                <input type="number" className={`w-full rounded-lg px-3 py-2.5 font-bold text-sm outline-none ${s.input}`} defaultValue={MOCK_ITEM.quantity} />
                            </div>
                            <div>
                                <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Einheit</label>
                                <select className={`w-full rounded-lg px-3 py-2.5 font-bold text-sm outline-none ${s.input}`}>
                                    <option>m²</option><option>Stk</option><option>Std</option><option>Psch</option>
                                </select>
                            </div>
                        </div>

                        {/* 3. Währung & Preis (Row) */}
                        <div className="mb-4">
                            <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>Preis</label>
                            <div className="flex gap-2">
                                <select className={`w-24 rounded-lg px-2 py-2.5 font-bold text-sm outline-none bg-zinc-50 border border-zinc-200`}>
                                    <option>CHF</option>
                                    <option>EUR</option>
                                    <option>USD</option>
                                </select>
                                <input type="number" className={`flex-1 rounded-lg px-3 py-2.5 font-bold text-sm outline-none ${s.input}`} defaultValue={MOCK_ITEM.price} />
                            </div>
                        </div>

                        {/* 4. MWST (Separate Row) */}
                        <div className="mb-4">
                            <label className={`text-[9px] font-bold uppercase mb-1 block ${s.metaLabel}`}>MWST</label>
                            <select className={`w-full rounded-lg px-3 py-2.5 font-bold text-sm outline-none ${s.input}`}>
                                <option>8.1% (Normal)</option><option>2.6% (Reduziert)</option><option>0.0%</option>
                            </select>
                        </div>

                        {/* 5. Rabatt Sektion */}
                        <div className="mb-4 p-3 bg-white rounded-lg border border-zinc-100">
                            <div className="flex items-center gap-2 mb-2">
                                <input 
                                    type="checkbox" 
                                    checked={enableDiscount}
                                    onChange={(e) => setEnableDiscount(e.target.checked)}
                                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                                />
                                <label className="text-xs font-bold text-zinc-600 select-none cursor-pointer" onClick={() => setEnableDiscount(!enableDiscount)}>Rabatt gewähren</label>
                            </div>
                            
                            {enableDiscount && (
                                <div className="flex gap-2 animate-in slide-in-from-top-1">
                                    <div className="flex rounded-lg overflow-hidden border border-zinc-200">
                                        <button 
                                            onClick={() => setRowDiscountType('percent')}
                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${rowDiscountType === 'percent' ? 'bg-zinc-800 text-white' : 'bg-zinc-50 text-zinc-500'}`}
                                        >%</button>
                                        <button 
                                            onClick={() => setRowDiscountType('amount')}
                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${rowDiscountType === 'amount' ? 'bg-zinc-800 text-white' : 'bg-zinc-50 text-zinc-500'}`}
                                        >CHF</button>
                                    </div>
                                    <input 
                                        type="number" 
                                        className={`w-24 rounded-lg px-3 py-1.5 font-bold text-sm outline-none text-orange-600 border border-zinc-200 focus:border-orange-500`} 
                                        defaultValue={10} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* 6. Optional Checkbox */}
                        <div className="mb-6">
                             <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={isOptional}
                                    onChange={(e) => setIsOptional(e.target.checked)}
                                    className="w-4 h-4 accent-zinc-600 rounded cursor-pointer"
                                />
                                <label className="text-xs font-bold text-zinc-500 select-none cursor-pointer" onClick={() => setIsOptional(!isOptional)}>
                                    Als "Optional" markieren (Nicht im Total berechnet)
                                </label>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-end gap-2 border-t border-black/5 pt-4">
                            <button className={`px-4 py-2 bg-white text-red-500 rounded-lg font-bold uppercase text-[10px] hover:bg-red-50 transition-colors`}>Löschen</button>
                            <button className={`px-8 py-2 rounded-lg font-bold uppercase text-[10px] shadow-sm transition-all active:scale-95 ${s.button}`}>Speichern</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------------
// 2. QUOTE CARD COMPONENT
// ---------------------------------------------------------------------------
const QuoteCardShowcase = ({ variant, title }: { variant: StyleVariant, title: string }) => {
    const s = styles[variant];

    return (
        <div>
            <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">{title}</h3>
            </div>

            <div 
                className={`relative p-4 rounded-xl border transition-all cursor-pointer hover:border-olive-400 active:scale-[0.98] ${s.container}`}
            >
                {/* Header: Name + Amount */}
                <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-bold text-base truncate pr-2 ${s.title}`}>{MOCK_QUOTE.client.name}</h4>
                    <p className={`font-bold text-base whitespace-nowrap ${s.amount}`}>{formatMoney(MOCK_QUOTE.totalGross)}</p>
                </div>

                {/* Sub: Title */}
                <p className="text-xs text-zinc-500 font-medium mb-3 truncate">{MOCK_QUOTE.title} • {MOCK_QUOTE.itemsCount} Pos.</p>
                
                {/* Footer: DocNum, Date, Status */}
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-bold text-zinc-800 tracking-wider">{MOCK_QUOTE.docNumber}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-zinc-500">{MOCK_QUOTE.date}</span>
                    </div>
                    
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest bg-zinc-100 text-zinc-600`}>
                        {MOCK_QUOTE.status}
                    </span>
                </div>
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------------
// 3. TOTALS COMPONENT
// ---------------------------------------------------------------------------
const TotalShowcase = ({ variant, title, discountType, setDiscountType, discountValue, setDiscountValue }: any) => {
    const s = styles[variant];
    const rawTotal = 4200;
    const discountAmount = discountType === 'percent' ? rawTotal * (discountValue/100) : discountValue;
    const netTotal = rawTotal - discountAmount;
    const vat = netTotal * 0.081;
    const finalTotal = netTotal + vat;

    const [useDiscount, setUseDiscount] = useState(true);

    return (
        <div>
            <h3 className="text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">{title}</h3>
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
                                className="w-4 h-4 accent-olive-600 rounded cursor-pointer"
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
                                        className={`w-16 rounded px-2 py-1 font-bold text-xs outline-none text-center ${s.input}`} 
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
                    <span className="text-olive-600 font-medium">MWST 8.1%</span>
                    <span className="font-bold text-olive-600">{formatMoney(vat)}</span>
                </div>

                {/* Grand Total */}
                <div className={`flex justify-between items-center pt-4 border-t border-zinc-200`}>
                    <span className={`text-sm font-black uppercase ${s.title}`}>Total CHF</span>
                    <span className={`text-2xl font-black ${s.title}`}>{formatMoney(finalTotal).replace('CHF ', '')}</span>
                </div>

            </div>
        </div>
    );
};

export default DesignShowcase;
