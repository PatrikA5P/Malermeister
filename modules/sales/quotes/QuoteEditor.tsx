
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  OfficeDocument,
  OfficeLineItem,
  Customer,
  Project,
  Product,
  VatRate,
  OfficeSettings
} from '../../../officeTypes';
import { ConfirmModal, Toast, ToastType, formatMoney, formatDate } from '../../../components/SharedUI';
import CustomerManager from '../../crm/CustomerManager';
import ProductManager from '../../products/ProductManager';
import { ActionBar } from '../../../components/ui/Layouts';
import { Button } from '../../../components/ui/Button';

// Declare html2pdf for TypeScript
declare const html2pdf: any;

interface QuoteEditorProps {
  initialDoc: OfficeDocument;
  customers: Customer[];
  projects: Project[];
  products: Product[];
  settings: OfficeSettings;
  onSave: (doc: OfficeDocument) => Promise<void>;
  onCancel: () => void;
  onConvert?: (doc: OfficeDocument) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

/** -------- Helpers -------- */

const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const isNonEmptyString = (s: any) => typeof s === 'string' && s.trim().length > 0;

const clampNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const calcLineNet = (i: OfficeLineItem) => {
  const q = Number(i.quantity || 0);
  const p = Number(i.price || 0);
  const d = Number(i.discount || 0);
  return q * p * (1 - d / 100);
};

const calcLineVat = (i: OfficeLineItem, defaultVatRate: number) => {
  const r = Number(i.vatRate ?? defaultVatRate);
  return calcLineNet(i) * (r / 100);
};

const calcLineGross = (i: OfficeLineItem, defaultVatRate: number) => calcLineNet(i) + calcLineVat(i, defaultVatRate);

const normalizeCustomerName = (c: Customer) =>
  c.type === 'business' ? (c.companyName || '').trim() : `${c.firstName || ''} ${c.lastName || ''}`.trim();

const getCustomerDisplay = (c: Customer) => ({
  name: normalizeCustomerName(c) || '—',
  street: c.address?.street || '',
  zip: c.address?.zip || '',
  city: c.address?.city || '',
  email: c.address?.email || '',
  phone: c.address?.phone || '',
  website: c.address?.website || ''
});

const makeEmptyDraft = (defaultVatRate: number): OfficeLineItem => ({
  id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  quantity: 1,
  unit: 'Stk',
  price: 0,
  discount: 0,
  vatRate: defaultVatRate,
  type: 'service',
  isOptional: false,
  productId: undefined,
  productCode: undefined
});

const isDraftMeaningful = (i: OfficeLineItem) => {
  if (isNonEmptyString(i.description)) return true;
  if (i.productId) return true;
  if (Number(i.quantity || 0) !== 1) return true;
  if (Number(i.price || 0) !== 0) return true;
  if (Number(i.discount || 0) !== 0) return true;
  if (isNonEmptyString(i.unit) && i.unit !== 'Stk') return true;
  return false;
};

const uniqBy = <T, K extends string | number>(arr: T[], keyFn: (x: T) => K) => {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
};

type DraftMode = 'edit' | 'view';

type DraftRow = {
  id: string;
  data: OfficeLineItem;
  mode: DraftMode;
  snapshot: OfficeLineItem; // for Abbrechen
};

/** -------- SUB-COMPONENTS -------- */

const LineItemCard = React.memo(({
  item,
  idx,
  section,
  isExpanded,
  isDragged,
  setExpandedItemId,
  updateItem,
  deleteItem,
  onDragStart,
  onDragOver,
  onDrop,
  moveUp,
  moveDown,
  defaultVatRate,
  unitOptions,
  vatOptions,
  docLength
}: any) => {
  const vat = Number(item.vatRate ?? defaultVatRate);
  const net = calcLineNet(item);
  const vatAmt = calcLineVat(item, defaultVatRate);
  const gross = calcLineGross(item, defaultVatRate);

  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isExpanded) {
        const t = setTimeout(() => titleRef.current?.focus(), 50);
        return () => clearTimeout(t);
    }
  }, [isExpanded]);

  return (
    <div
      className={`relative rounded-2xl border bg-white flex overflow-hidden transition-all duration-200 ${
        section === 'optional' ? 'border-dashed border-zinc-300 bg-zinc-50/60' : 'border-zinc-100'
      } ${isDragged ? 'opacity-40 border-dashed border-olive-500 bg-olive-50 scale-[0.98]' : 'hover:border-zinc-300'}`}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={(e) => onDrop(e, idx)}
    >
      <div
        className="w-10 bg-zinc-50 border-r border-zinc-100 flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing hover:bg-zinc-100 transition-colors"
        draggable
        onDragStart={(e) => onDragStart(e, idx)}
      >
        <button type="button" onClick={(e) => moveUp(e, idx)} disabled={idx === 0} className="text-zinc-300 hover:text-black disabled:opacity-0 p-1">
          ▲
        </button>
        <span className="text-zinc-300 text-xl leading-none select-none">≡</span>
        <button
          type="button"
          onClick={(e) => moveDown(e, idx)}
          disabled={idx >= docLength - 1}
          className="text-zinc-300 hover:text-black disabled:opacity-0 p-1"
        >
          ▼
        </button>
      </div>

      <div
        className="flex-1 p-3 min-w-0 cursor-pointer flex flex-col justify-between"
        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
      >
        <div className="font-black text-zinc-900 text-sm leading-snug break-words mb-2">{item.description || 'Neue Position'}</div>

        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-500 font-medium font-mono leading-relaxed">
          <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 font-bold">
            {Number(item.quantity || 0).toFixed(2)} {item.unit}
          </span>
          <span className="text-zinc-300">×</span>
          <span>{formatMoney(Number(item.price || 0))}</span>
          {item.discount ? <span className="text-orange-600 font-bold ml-1">(-{item.discount}%)</span> : null}
          <span className="text-zinc-300 mx-1">|</span>
          <span className="text-zinc-400">Netto {formatMoney(net)}</span>
        </div>

        <div className="mt-2 pt-2 border-t border-zinc-50 flex justify-between items-end">
          <div className="text-[10px] font-bold uppercase text-zinc-400">
            MWST {vat.toFixed(1)}% <span className="hidden sm:inline text-zinc-300 ml-1">({formatMoney(vatAmt)})</span>
            {item.isOptional && (
              <span className="ml-2 px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-500">Optional</span>
            )}
          </div>
          <div className="text-lg font-black text-zinc-900 leading-none">{formatMoney(gross)}</div>
        </div>
      </div>

      <div className="w-12 border-l border-zinc-100 flex items-center justify-center bg-zinc-50/30">
         <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(idx);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all"
          title="Löschen"
        >
          🗑️
        </button>
      </div>

      {isExpanded && (
        <div className="absolute inset-x-0 top-full z-10 bg-white border-t border-zinc-100 p-4 shadow-xl -mt-4 rounded-b-2xl cursor-default" onClick={e => e.stopPropagation()}>
          <div className="space-y-4">
            <textarea
              ref={titleRef}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:bg-white focus:border-olive-500 transition-colors"
              value={item.description || ''}
              onChange={(e) => updateItem(idx, { description: e.target.value })}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Menge</label>
                <input
                  type="number"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 font-bold text-sm focus:bg-white focus:border-olive-500"
                  value={item.quantity ?? 0}
                  onChange={(e) => updateItem(idx, { quantity: clampNumber(e.target.value, 0) })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Einheit</label>
                <select
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 font-bold text-sm focus:bg-white focus:border-olive-500"
                  value={item.unit || 'Stk'}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                >
                  {unitOptions.map((u: string) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Preis</label>
                <input
                  type="number"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 font-bold text-sm focus:bg-white focus:border-olive-500"
                  value={item.price ?? 0}
                  onChange={(e) => updateItem(idx, { price: clampNumber(e.target.value, 0) })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Rabatt %</label>
                <input
                  type="number"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 font-bold text-sm text-orange-600 focus:bg-white focus:border-olive-500"
                  value={item.discount ?? 0}
                  onChange={(e) => updateItem(idx, { discount: clampNumber(e.target.value, 0) })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-50 mt-2">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">MWST</label>
                    <select
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 font-bold text-sm focus:bg-white focus:border-olive-500"
                      value={Number(item.vatRate ?? defaultVatRate)}
                      onChange={(e) => updateItem(idx, { vatRate: clampNumber(e.target.value, defaultVatRate) })}
                    >
                      {vatOptions.map((v: any) => (
                        <option key={`${v.rate}-${v.code}`} value={v.rate}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                 </div>
                 <div className="flex items-end">
                    <label className="flex items-center gap-3 text-xs font-bold text-zinc-500 select-none bg-zinc-50 w-full p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100">
                        <input
                          type="checkbox"
                          checked={!!item.isOptional}
                          onChange={(e) => updateItem(idx, { isOptional: e.target.checked })}
                          className="w-5 h-5 accent-olive-600 rounded"
                        />
                        Optional (Nicht im Total)
                    </label>
                 </div>
            </div>

            <div className="flex justify-end items-center pt-2">
              <button type="button" onClick={() => setExpandedItemId(null)} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase hover:bg-olive-600 transition-colors shadow-lg">
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const DraftCard = React.memo(({
  row,
  updateDraft,
  cancelDraftEdit,
  commitDraft,
  setDraftMode,
  activeProductSuggestFor,
  setActiveProductSuggestFor,
  productSuggestions,
  selectProductForDraft,
  setOverlay,
  unitOptions,
  vatOptions,
  defaultVatRate
}: any) => {
  const d = row.data;
  const isEditing = row.mode === 'edit';
  const suggestions = activeProductSuggestFor === row.id ? productSuggestions : [];

  return (
    <div className="relative bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
      <div className="relative">
        <input
          disabled={!isEditing}
          autoFocus={isEditing} 
          className={`w-full border rounded-xl px-4 py-3 font-bold text-sm outline-none transition-colors ${
            isEditing ? 'bg-white border-zinc-200 focus:border-olive-500' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
          }`}
          placeholder="Tippen: Produkt wählen oder Text erfassen..."
          value={d.description || ''}
          onChange={(e) => {
            updateDraft(row.id, { description: e.target.value, productId: undefined, productCode: undefined });
            if(activeProductSuggestFor !== row.id) setActiveProductSuggestFor(row.id);
          }}
          onFocus={() => isEditing && setActiveProductSuggestFor(row.id)}
        />

        {isEditing && suggestions.length > 0 && (
          <div className="absolute top-[52px] left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 overflow-hidden">
            {suggestions.map((p: any) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectProductForDraft(row.id, p)}
                className="w-full text-left p-3 hover:bg-olive-50 border-b border-zinc-50 last:border-0"
              >
                <div className="text-xs font-black">{p.name}</div>
                <div className="text-[10px] text-zinc-400">{formatMoney(p.price || 0)}</div>
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOverlay('product')}
              className="w-full p-3 text-left font-bold text-olive-600 uppercase text-[10px] hover:bg-olive-50 border-t border-zinc-100"
            >
              + Produkt erfassen
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Menge</label>
          <input
            disabled={!isEditing}
            type="number"
            className={`w-full border rounded-xl p-3 font-bold text-sm text-center outline-none ${
              isEditing ? 'bg-white border-zinc-200 focus:border-olive-500' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
            value={d.quantity ?? 1}
            onChange={(e) => updateDraft(row.id, { quantity: clampNumber(e.target.value, 0) })}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Einheit</label>
          <select
            disabled={!isEditing}
            className={`w-full border rounded-xl p-3 font-bold text-sm outline-none ${
              isEditing ? 'bg-white border-zinc-200 focus:border-olive-500' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
            value={d.unit || 'Stk'}
            onChange={(e) => updateDraft(row.id, { unit: e.target.value })}
          >
            {unitOptions.map((u: string) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">MWST</label>
          <select
            disabled={!isEditing}
            className={`w-full border rounded-xl p-3 font-bold text-sm outline-none ${
              isEditing ? 'bg-white border-zinc-200 focus:border-olive-500' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
            value={Number(d.vatRate ?? defaultVatRate)}
            onChange={(e) => updateDraft(row.id, { vatRate: clampNumber(e.target.value, defaultVatRate) })}
          >
            {vatOptions.map((v: any) => (
              <option key={`${v.rate}-${v.code}`} value={v.rate}>{v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Preis</label>
          <input
            disabled={!isEditing}
            type="number"
            className={`w-full border rounded-xl p-3 font-bold text-sm text-right outline-none ${
              isEditing ? 'bg-white border-zinc-200 focus:border-olive-500' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
            value={d.price ?? 0}
            onChange={(e) => updateDraft(row.id, { price: clampNumber(e.target.value, 0) })}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 select-none cursor-pointer">
          <input
            disabled={!isEditing}
            type="checkbox"
            checked={!!d.isOptional}
            onChange={(e) => updateDraft(row.id, { isOptional: e.target.checked })}
            className="accent-olive-600 w-4 h-4 rounded"
          />
          Optional
        </label>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-3 mt-4 border-t border-zinc-50 pt-3">
          <button
            type="button"
            onClick={() => cancelDraftEdit(row.id)}
            className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-black uppercase text-[10px] hover:bg-zinc-200 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => commitDraft(row.id)}
            className="flex-1 py-3 rounded-xl bg-olive-600 text-white font-black uppercase text-[10px] hover:bg-olive-700 shadow-lg transition-all"
          >
            Übernehmen
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-4 border-t border-zinc-50 pt-3">
          <button
            type="button"
            onClick={() => setDraftMode(row.id, 'edit')}
            className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-700 font-black uppercase text-[10px] hover:bg-zinc-200 transition-colors"
          >
            Bearbeiten
          </button>
        </div>
      )}

      <div className="mt-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center">Total sichtbar nach Übernehmen</div>
    </div>
  );
});


/** -------- MAIN COMPONENT -------- */

const QuoteEditor: React.FC<QuoteEditorProps> = ({
  initialDoc,
  customers,
  projects,
  products,
  settings,
  onSave,
  onCancel,
  onConvert,
  onDelete
}) => {
  const [doc, setDoc] = useState<OfficeDocument>(() => deepClone(initialDoc));
  const [originalDoc] = useState<string>(() => JSON.stringify(initialDoc));

  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [confirmData, setConfirmData] = useState<any>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [overlay, setOverlay] = useState<'none' | 'customer' | 'product'>('none');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [customerManagerMode, setCustomerManagerMode] = useState<'search' | 'create' | 'edit'>('search');
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(() => customers || []);
  
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showCustomerSearchInline, setShowCustomerSearchInline] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement | null>(null);

  const [activeProductSuggestFor, setActiveProductSuggestFor] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const draftAreaRef = useRef<HTMLDivElement | null>(null);
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setLocalCustomers(customers || []), [customers]);

  const isDirty = JSON.stringify(doc) !== originalDoc;
  const isNew = !doc.id;

  const vatRates: VatRate[] = (settings as any)?.vatRates || [];
  const defaultVatRate = useMemo(() => {
    const r = vatRates?.find((x: any) => x.code === 'N')?.rate;
    return typeof r === 'number' ? r : 8.1;
  }, [vatRates]);

  const vatOptions = useMemo(() => {
    const base = (vatRates || []).map((v: any) => ({
        code: String(v.code ?? ''),
        rate: clampNumber(v.rate, defaultVatRate),
        label: `${clampNumber(v.rate, defaultVatRate).toFixed(1)}%${v.code ? ` (${v.code})` : ''}`
      })).filter((x) => Number.isFinite(x.rate));
    const withDefault = base.length ? base : [{ code: 'N', rate: defaultVatRate, label: `${defaultVatRate.toFixed(1)}% (N)` }];
    return uniqBy(withDefault, (x) => `${x.rate}-${x.code}`);
  }, [vatRates, defaultVatRate]);

  const unitOptions = useMemo(() => ['Stk', 'Std', 'm²', 'lfm', 'Psch', 'Sack', 'Gebinde'], []);

  const customerProjects = useMemo(() => {
    return doc.customerId ? projects.filter((p: any) => p.customerId === doc.customerId) : [];
  }, [doc.customerId, projects]);

  const itemsWithIndex = useMemo(() => (doc.items || []).map((item, idx) => ({ item, idx })), [doc.items]);
  const normalItems = useMemo(() => itemsWithIndex.filter((x) => !x.item.isOptional), [itemsWithIndex]);
  const optionalItems = useMemo(() => itemsWithIndex.filter((x) => !!x.item.isOptional), [itemsWithIndex]);

  const calcTotal = (items: OfficeLineItem[]) => {
    const net = items.reduce((acc, i) => acc + calcLineNet(i), 0);
    const vat = items.reduce((acc, i) => acc + calcLineVat(i, defaultVatRate), 0);
    return { net, vat, gross: net + vat };
  };

  const totals = useMemo(() => calcTotal(normalItems.map((x) => x.item)), [normalItems, defaultVatRate]);
  const optionalTotals = useMemo(() => calcTotal(optionalItems.map((x) => x.item)), [optionalItems, defaultVatRate]);
  const totalsInclOptional = useMemo(
    () => ({
      net: totals.net + optionalTotals.net,
      vat: totals.vat + optionalTotals.vat,
      gross: totals.gross + optionalTotals.gross
    }),
    [totals, optionalTotals]
  );

  useEffect(() => {
    if (!isNew) return;
    const intro = (settings as any)?.layouts?.quote?.introText;
    const outro = (settings as any)?.layouts?.quote?.outroText;
    setDoc((prev) => {
      const next = deepClone(prev);
      if (!isNonEmptyString((next as any).title)) (next as any).title = (next as any).title ?? '';
      if (!isNonEmptyString((next as any).description)) (next as any).description = (next as any).description ?? '';
      if (!isNonEmptyString(next.notes) && isNonEmptyString(intro)) next.notes = intro;
      if (!isNonEmptyString(next.footer) && isNonEmptyString(outro)) next.footer = outro;
      return next;
    });
  }, [isNew, settings]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!showCustomerSearchInline) return;
      const el = customerSearchRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setShowCustomerResults(false);
        setShowCustomerSearchInline(false);
        setCustomerQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showCustomerSearchInline]);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!printContainerRef.current || typeof html2pdf === 'undefined') {
      setToast({ msg: 'PDF Generator nicht geladen.', type: 'error' });
      return null;
    }
    setIsGeneratingPdf(true);
    const element = printContainerRef.current;
    const opt = {
      margin: [10, 10, 10, 10], 
      filename: `${doc.docNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      setIsGeneratingPdf(false);
      return pdfBlob;
    } catch (e) {
      console.error('PDF Gen Error', e);
      setIsGeneratingPdf(false);
      return null;
    }
  };

  const handleShare = async () => {
    setShowActionMenu(false);
    const blob = await generatePdfBlob();
    if (!blob) return;
    const file = new File([blob], `${doc.docNumber}.pdf`, { type: 'application/pdf' });
    if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Offerte ${doc.docNumber}`,
          text: `Anbei die Offerte.`
        });
        setDoc((prev) => ({ ...prev, status: 'sent' } as any));
        return;
      } catch (e) {
        console.log('Share cancelled', e);
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.docNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ msg: 'PDF heruntergeladen.', type: 'info' });
  };

  const handleDownload = async () => {
    setShowActionMenu(false);
    const blob = await generatePdfBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.docNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ msg: 'Download gestartet', type: 'success' });
    }
  };

  const handleBack = () => {
    const hasDrafts = draftRows.some((r) => isDraftMeaningful(r.data));
    if (hasDrafts || isDirty) {
      setConfirmData({
        title: 'Änderungen verwerfen?',
        message: 'Ungespeicherte Änderungen gehen verloren.',
        onConfirm: () => {
          setConfirmData(null);
          onCancel();
        },
        onCancel: () => setConfirmData(null),
        isDestructive: true
      });
    } else {
      onCancel();
    }
  };

  const executeSave = async () => {
    const finalDoc: OfficeDocument = {
      ...doc,
      totalNet: totals.net,
      totalTax: totals.vat,
      totalGross: totals.gross
    };
    await onSave(finalDoc);
    setToast({ msg: 'Offerte gespeichert', type: 'success' });
  };

  const handleSave = async () => {
    const hasDrafts = draftRows.some((r) => isDraftMeaningful(r.data));
    if (hasDrafts) {
      setConfirmData({
        title: 'Entwurf-Positionen übernehmen?',
        message: 'Bitte Entwürfe speichern oder löschen.',
        onConfirm: () => setConfirmData(null),
        onCancel: () => setConfirmData(null)
      });
      return;
    }
    if (!doc.client?.name) {
      setToast({ msg: 'Bitte Kunde wählen', type: 'error' });
      return;
    }
    await executeSave();
  };

  const handleDelete = () => {
    if (!onDelete || isNew || !doc.id) return;
    setConfirmData({
      title: 'Offerte löschen?',
      message: 'Aktion nicht widerrufbar.',
      onConfirm: async () => {
        setConfirmData(null);
        await onDelete(doc.id!);
      },
      onCancel: () => setConfirmData(null),
      isDestructive: true
    });
  };

  const selectCustomer = (c: Customer) => {
    const client = getCustomerDisplay(c);
    setDoc((prev) => ({ ...prev, customerId: (c as any).id, client, projectId: undefined }));
    setCustomerQuery('');
    setShowCustomerResults(false);
    setShowCustomerSearchInline(false);
    setOverlay('none');
    setLocalCustomers((prev) => {
      const id = (c as any).id;
      const existingIdx = prev.findIndex((x: any) => (x as any).id === id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = c;
        return next;
      }
      return [c, ...prev];
    });
  };

  const clearCustomer = () => {
    setDoc((prev) => ({
      ...prev,
      customerId: undefined,
      projectId: undefined,
      client: { name: '', street: '', zip: '', city: '', email: '', phone: '', website: '' } as any
    }));
    setCustomerQuery('');
    setShowCustomerResults(false);
    setShowCustomerSearchInline(false);
  };

  const openInlineCustomerSearch = () => {
    setShowCustomerSearchInline(true);
    setShowCustomerResults(true);
    setCustomerQuery('');
  };
  const openCustomerCreate = () => {
    setCustomerManagerMode('create');
    setOverlay('customer');
  };
  const openCustomerEdit = () => {
    if (doc.customerId) {
      setCustomerManagerMode('edit');
      setOverlay('customer');
    }
  };

  const customerSuggestions = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return localCustomers.slice(0, 8);
    return localCustomers.filter((c: any) => normalizeCustomerName(c).toLowerCase().includes(q)).slice(0, 8);
  }, [customerQuery, localCustomers]);

  const updateItem = (idx: number, patch: Partial<OfficeLineItem>) => {
    setDoc((prev) => {
      const next = deepClone(prev);
      next.items[idx] = { ...next.items[idx], ...patch };
      return next;
    });
  };

  const deleteItem = (idx: number) => {
    setDoc((prev) => {
      const next = deepClone(prev);
      const removed = next.items.splice(idx, 1);
      if (removed[0]?.id && expandedItemId === removed[0].id) setExpandedItemId(null);
      return next;
    });
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setDoc((prev) => {
      const newItems = [...prev.items];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return { ...prev, items: newItems };
    });
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;
    moveItem(draggedItemIndex, index);
    setDraggedItemIndex(null);
  };

  const moveUp = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (idx > 0) moveItem(idx, idx - 1);
  };

  const moveDown = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (idx < (doc.items?.length || 0) - 1) moveItem(idx, idx + 1);
  };

  const addDraftRow = () => {
    const data = makeEmptyDraft(defaultVatRate);
    const row: DraftRow = { id: data.id as any, data, mode: 'edit', snapshot: deepClone(data) };
    setDraftRows((prev) => [...prev, row]);
    setTimeout(() => draftAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);
  };

  const removeDraftRow = (id: string) => {
    setDraftRows((prev) => prev.filter((r) => r.id !== id));
    if (activeProductSuggestFor === id) setActiveProductSuggestFor(null);
  };

  const setDraftMode = (id: string, mode: DraftMode) => {
    setDraftRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, mode: mode as DraftMode, snapshot: mode === 'edit' ? deepClone(r.data) : r.snapshot }
          : r
      )
    );
  };

  const updateDraft = (id: string, patch: Partial<OfficeLineItem>) => {
    setDraftRows((prev) => prev.map((r) => (r.id === id ? { ...r, data: { ...r.data, ...patch } } : r)));
  };

  const cancelDraftEdit = (id: string) => {
    setDraftRows((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, data: deepClone(r.snapshot), mode: 'view' as DraftMode } : r))
        .filter((r) => r.id !== id || isDraftMeaningful(r.data))
    );
  };

  const commitDraft = (id: string) => {
    const row = draftRows.find((r) => r.id === id);
    if (!row) return;
    if (!isDraftMeaningful(row.data)) {
      removeDraftRow(id);
      return;
    }
    const d = row.data;
    const committed: OfficeLineItem = {
      ...d,
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      description: (d.description || '').trim(),
      quantity: clampNumber(d.quantity, 0),
      price: clampNumber(d.price, 0),
      discount: clampNumber(d.discount, 0),
      unit: (d.unit || 'Stk').trim(),
      vatRate: clampNumber(d.vatRate ?? defaultVatRate, defaultVatRate),
      isOptional: !!d.isOptional
    } as any;
    setDoc((prev) => {
      const next = deepClone(prev);
      next.items = [...(next.items || []), committed];
      return next;
    });
    removeDraftRow(id);
  };

  const productSuggestionsFor = (query: string) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p: any) => {
        const name = ((p as any).name || '').toLowerCase();
        const code = String((p as any).code || (p as any).productCode || '').toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 8);
  };

  const selectProductForDraft = (draftId: string, p: Product) => {
    updateDraft(draftId, {
      productId: (p as any).id,
      productCode: (p as any).code || (p as any).productCode,
      description: (p as any).name,
      unit: (p as any).unit || 'Stk',
      price: clampNumber((p as any).price, 0),
      type: (p as any).type || 'service'
    });
    setActiveProductSuggestFor(null);
  };

  const ActionMenuOverlay = () => (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={() => setShowActionMenu(false)}
    >
      <div
        className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl space-y-3 animate-in slide-in-from-bottom-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black uppercase text-sm text-zinc-400 tracking-widest mb-4">Aktionen</h3>
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800"
        >
          <span>📤</span> Senden
        </button>
        <button
          onClick={handleDownload}
          className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800"
        >
          <span>📄</span> PDF
        </button>
        <button
          onClick={() => {
            setShowActionMenu(false);
            window.print();
          }}
          className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 border border-zinc-100 font-bold text-zinc-800"
        >
          <span>🖨️</span> Drucken
        </button>
        {onConvert && (
          <button
            onClick={() => {
              setShowActionMenu(false);
              onConvert(doc);
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-olive-50 border border-olive-100 font-bold text-olive-700"
          >
            <span>🔄</span> In Rechnung wandeln
          </button>
        )}
        {onDelete && !isNew && (
          <button
            onClick={() => {
              setShowActionMenu(false);
              handleDelete();
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-50 border border-red-100 font-bold text-red-600"
          >
            <span>🗑️</span> Löschen
          </button>
        )}
        <button onClick={() => setShowActionMenu(false)} className="w-full p-4 mt-4 font-bold uppercase text-xs text-zinc-400">
          Abbrechen
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmData && <ConfirmModal {...confirmData} />}
      {showActionMenu && <ActionMenuOverlay />}

      {isGeneratingPdf && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-olive-600 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="font-bold text-xs uppercase tracking-widest">Erstelle PDF...</span>
          </div>
        </div>
      )}

      {overlay === 'customer' && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <CustomerManager
            onBack={() => setOverlay('none')}
            onSelect={(c: Customer) => selectCustomer(c)}
            initialEditMode={customerManagerMode === 'create'}
            editId={customerManagerMode === 'edit' ? doc.customerId : undefined}
          />
        </div>
      )}

      {overlay === 'product' && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <ProductManager
            onBack={() => setOverlay('none')}
            onSelect={(p: Product) => {
              if (activeProductSuggestFor) selectProductForDraft(activeProductSuggestFor, p);
              setOverlay('none');
            }}
            initialEditMode={true}
          />
        </div>
      )}

      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors font-bold"
          >
            ✕
          </button>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Offerte</p>
            <h2 className="text-lg font-black brand-font uppercase truncate">{doc.docNumber}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
              isDirty ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 text-zinc-400'
            }`}
          >
            {isDirty ? 'Ungespeichert' : 'Gespeichert'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-40 print:p-0 print:overflow-visible bg-slate-50 print:bg-white">
        <div
          ref={printContainerRef}
          id="print-content"
          className="absolute left-[-9999px] top-0 w-[210mm] print:static print:w-auto space-y-8 bg-white text-black p-8 mx-auto"
        >
          <div className="flex justify-between items-start border-b pb-8">
            {(settings as any).logo && <img src={(settings as any).logo} className="h-20 object-contain" alt="Logo" />}
            <div className="text-right text-xs text-zinc-500">
              <p className="font-bold text-black">{(settings as any).companyName}</p>
              <p>{(settings as any).address?.street}</p>
              <p>
                {(settings as any).address?.zip} {(settings as any).address?.city}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-start mt-12">
            <div className="text-sm">
              <p className="font-bold">{doc.client?.name}</p>
              <p>{doc.client?.street}</p>
              <p>
                {doc.client?.zip} {doc.client?.city}
              </p>
            </div>
            <div className="text-right text-sm">
              <h1 className="font-bold text-xl uppercase mb-2">Offerte</h1>
              <p>
                <span className="text-zinc-500 w-24 inline-block">Nr.</span> {doc.docNumber}
              </p>
              <p>
                <span className="text-zinc-500 w-24 inline-block">Datum</span> {formatDate(doc.date)}
              </p>
              {doc.validUntil && (
                <p>
                  <span className="text-zinc-500 w-24 inline-block">Gültig bis</span> {formatDate(doc.validUntil)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-bold text-lg mb-2">{(doc as any).title}</h2>
            <div className="whitespace-pre-wrap text-sm text-zinc-700">{doc.notes}</div>
          </div>

          <div className="space-y-4 mt-8">
            <div className="flex border-b-2 border-black pb-2 mb-4 text-xs font-bold uppercase">
              <div className="w-12">Pos.</div>
              <div className="flex-1">Beschreibung</div>
              <div className="w-20 text-right">Menge</div>
              <div className="w-24 text-right">Preis</div>
              <div className="w-16 text-right">Rabatt</div>
              <div className="w-16 text-right">MWST</div>
              <div className="w-24 text-right">Total</div>
            </div>

            {doc.items?.map((item, idx) => (
              <div key={(item as any).id ?? idx} className="flex py-2 border-b border-zinc-100 text-sm break-inside-avoid">
                <div className="w-12 text-zinc-500">{idx + 1}</div>
                <div className="flex-1 pr-4">
                  <p className="font-bold">{item.description}</p>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {(item as any).productCode ? `#${(item as any).productCode}` : ''}
                  </div>
                </div>
                <div className="w-20 text-right">
                  {item.quantity} {item.unit}
                </div>
                <div className="w-24 text-right">{formatMoney(item.price)}</div>
                <div className="w-16 text-right">{item.discount ? `${item.discount}%` : '—'}</div>
                <div className="w-16 text-right">{Number(item.vatRate ?? defaultVatRate).toFixed(1)}%</div>
                <div className="w-24 text-right font-bold">{formatMoney(calcLineGross(item, defaultVatRate))}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-zinc-200 text-sm">
            <div className="flex justify-between mb-1">
              <span>Zwischensumme</span>
              <span className="font-mono font-bold">{formatMoney(totals.net)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>MWST</span>
              <span className="font-mono font-bold">{formatMoney(totals.vat)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-3 mt-3 border-t border-zinc-200">
              <span>Total</span>
              <span className="font-mono">{formatMoney(totals.gross)}</span>
            </div>

            {optionalItems.length > 0 && (
              <div className="mt-6 pt-4 border-t border-dashed border-zinc-300">
                <div className="flex justify-between mb-1 text-zinc-600">
                  <span>Zwischensumme Optional</span>
                  <span className="font-mono font-bold">{formatMoney(optionalTotals.net)}</span>
                </div>
                <div className="flex justify-between mb-1 text-zinc-600">
                  <span>MWST Optional</span>
                  <span className="font-mono font-bold">{formatMoney(optionalTotals.vat)}</span>
                </div>
                <div className="flex justify-between mb-1 text-zinc-800 font-bold">
                  <span>Total inkl. Optional</span>
                  <span className="font-mono font-bold">{formatMoney(totalsInclOptional.gross)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-100 text-sm whitespace-pre-wrap break-inside-avoid">{doc.footer}</div>
        </div>

        <div className="print:hidden space-y-6 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-black uppercase text-xs text-zinc-400 tracking-widest mb-4">Empfänger</h3>

            {!doc.client?.name || showCustomerSearchInline ? (
              <div ref={customerSearchRef} className="relative">
                <input
                  className="w-full bg-zinc-50 border border-zinc-200 p-4 pl-10 rounded-xl font-bold outline-none focus:border-olive-500 text-sm"
                  placeholder="Kunde tippen zum Suchen..."
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setShowCustomerResults(true);
                  }}
                  onFocus={() => setShowCustomerResults(true)}
                />
                <span className="absolute left-4 top-4 text-zinc-400">🔍</span>

                {showCustomerResults && (customerQuery.trim().length > 0 || customerSuggestions.length > 0) && (
                  <div className="absolute top-full left-0 w-full bg-white border border-zinc-200 shadow-xl rounded-xl mt-2 z-20 overflow-hidden max-h-60 overflow-y-auto">
                    {customerSuggestions.length === 0 ? (
                      <div className="p-4 text-xs text-zinc-400 font-bold">Keine Treffer</div>
                    ) : (
                      customerSuggestions.map((c: any) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left p-4 border-b border-zinc-50 hover:bg-olive-50"
                        >
                          <div className="font-bold text-sm">{normalizeCustomerName(c)}</div>
                          <div className="text-xs text-zinc-400">
                            {c.address?.zip || ''} {c.address?.city || ''}
                          </div>
                        </button>
                      ))
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerResults(false);
                        setCustomerManagerMode('create');
                        setOverlay('customer');
                      }}
                      className="w-full p-4 text-left font-bold text-olive-600 uppercase text-xs hover:bg-olive-50"
                    >
                      + Neuer Kunde erfassen
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerResults(false);
                        setShowCustomerSearchInline(false);
                        setCustomerQuery('');
                      }}
                      className="w-full p-3 text-left font-bold uppercase text-[10px] text-zinc-400 hover:bg-zinc-50"
                    >
                      Schliessen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="w-full text-left p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:bg-zinc-100 transition-colors cursor-pointer group"
                onClick={openCustomerEdit}
                title="Klicken zum Bearbeiten der Stammdaten"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-sm text-zinc-900 group-hover:text-olive-700 transition-colors">{doc.client.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {doc.client.street}, {doc.client.zip} {doc.client.city}
                    </p>
                  </div>
                  <span className="text-zinc-300 group-hover:text-olive-500 text-lg">✎</span>
                </div>
              </div>
            )}

            {doc.customerId && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={openInlineCustomerSearch}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold uppercase hover:bg-zinc-200"
                >
                  Ändern
                </button>
                <button
                  onClick={clearCustomer}
                  className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-bold uppercase hover:bg-red-100"
                >
                  Entfernen
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-zinc-50">
              <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Projekt zuweisen</label>
              <select
                className="w-full border p-3 rounded-xl bg-zinc-50 text-sm font-bold outline-none disabled:opacity-50"
                value={doc.projectId || 0}
                onChange={(e) => setDoc((prev) => ({ ...prev, projectId: parseInt(e.target.value) || undefined }))}
                disabled={!doc.customerId}
              >
                <option value={0}>{doc.customerId ? 'Kein Projekt' : 'Erst Kunde wählen...'}</option>
                {customerProjects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || `Projekt #${p.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-black uppercase text-xs text-zinc-400 mb-4 tracking-widest">Kopfdaten</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Titel / Betreff</label>
                <input
                  className="w-full border p-3 rounded-xl font-bold bg-zinc-50 focus:bg-white transition-colors outline-none"
                  value={(doc as any).title || ''}
                  onChange={(e) => setDoc((prev) => ({ ...(prev as any), title: e.target.value }))}
                  placeholder="z.B. Wohnzimmer streichen"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Beschreibung</label>
                <textarea
                  className="w-full border p-3 rounded-xl font-bold bg-zinc-50 focus:bg-white transition-colors outline-none resize-none h-20"
                  value={(doc as any).description || ''}
                  onChange={(e) => setDoc((prev) => ({ ...(prev as any), description: e.target.value }))}
                  placeholder="Kurze Beschreibung (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Datum</label>
                  <input
                    type="date"
                    className="w-full border p-3 rounded-xl bg-zinc-50 text-sm font-bold outline-none"
                    value={doc.date}
                    onChange={(e) => setDoc((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Gültig bis</label>
                  <input
                    type="date"
                    className="w-full border p-3 rounded-xl bg-zinc-50 text-sm font-bold outline-none"
                    value={doc.validUntil || ''}
                    onChange={(e) => setDoc((prev) => ({ ...prev, validUntil: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Ausführung Start</label>
                  <input
                    type="date"
                    className="w-full border p-3 rounded-xl bg-zinc-50 text-sm font-bold outline-none"
                    value={(doc as any).executionStart || ''}
                    onChange={(e) => setDoc((prev) => ({ ...(prev as any), executionStart: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Ausführung Ende</label>
                  <input
                    type="date"
                    className="w-full border p-3 rounded-xl bg-zinc-50 text-sm font-bold outline-none"
                    value={(doc as any).executionEnd || ''}
                    onChange={(e) => setDoc((prev) => ({ ...(prev as any), executionEnd: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-black uppercase text-xs text-zinc-400 mb-4 tracking-widest">Abrechnung</h3>

            <div className="space-y-3">
              {normalItems.length === 0 ? (
                <div className="text-sm text-zinc-400 font-bold bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                  Noch keine Positionen.
                </div>
              ) : (
                normalItems.map((x) => (
                  <LineItemCard
                    key={x.item.id ?? x.idx}
                    item={x.item}
                    idx={x.idx}
                    section="normal"
                    isExpanded={expandedItemId === x.item.id}
                    isDragged={draggedItemIndex === x.idx}
                    setExpandedItemId={setExpandedItemId}
                    updateItem={updateItem}
                    deleteItem={deleteItem}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    moveUp={moveUp}
                    moveDown={moveDown}
                    defaultVatRate={defaultVatRate}
                    unitOptions={unitOptions}
                    vatOptions={vatOptions}
                    docLength={doc.items?.length || 0}
                  />
                ))
              )}
            </div>

            <div ref={draftAreaRef} className="mt-6 space-y-4">
              {draftRows.map((row) => (
                <DraftCard
                  key={row.id}
                  row={row}
                  updateDraft={updateDraft}
                  cancelDraftEdit={cancelDraftEdit}
                  commitDraft={commitDraft}
                  setDraftMode={setDraftMode}
                  activeProductSuggestFor={activeProductSuggestFor}
                  setActiveProductSuggestFor={setActiveProductSuggestFor}
                  productSuggestions={productSuggestionsFor(row.data.description || '')}
                  selectProductForDraft={selectProductForDraft}
                  setOverlay={setOverlay}
                  unitOptions={unitOptions}
                  vatOptions={vatOptions}
                  defaultVatRate={defaultVatRate}
                />
              ))}

              <button
                type="button"
                onClick={addDraftRow}
                className="w-full px-4 py-4 rounded-2xl border-2 border-dashed border-olive-400 text-olive-700 font-black uppercase text-xs bg-transparent hover:bg-olive-50/50 transition-colors"
              >
                + Position hinzufügen
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Optionale Positionen</h4>
              <div className="space-y-3">
                {optionalItems.length === 0 ? (
                  <div className="text-sm text-zinc-400 font-bold bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                    Keine optionalen Positionen.
                  </div>
                ) : (
                  optionalItems.map((x) => (
                    <LineItemCard
                      key={x.item.id ?? x.idx}
                      item={x.item}
                      idx={x.idx}
                      section="optional"
                      isExpanded={expandedItemId === x.item.id}
                      isDragged={draggedItemIndex === x.idx}
                      setExpandedItemId={setExpandedItemId}
                      updateItem={updateItem}
                      deleteItem={deleteItem}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      moveUp={moveUp}
                      moveDown={moveDown}
                      defaultVatRate={defaultVatRate}
                      unitOptions={unitOptions}
                      vatOptions={vatOptions}
                      docLength={doc.items?.length || 0}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 space-y-2">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Zwischensumme</span>
                <span className="font-mono font-bold">{formatMoney(totals.net)}</span>
              </div>
              <div className="flex justify-between text-sm text-olive-700">
                <span>MWST</span>
                <span className="font-mono font-bold">{formatMoney(totals.vat)}</span>
              </div>
              <div className="flex justify-between text-xl font-black mt-4 pt-4 border-t border-zinc-900">
                <span>Total</span>
                <span className="font-mono">{formatMoney(totals.gross)}</span>
              </div>

              {optionalItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-zinc-300 space-y-2">
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Zwischensumme Optional</span>
                    <span className="font-mono font-bold">{formatMoney(optionalTotals.net)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>MWST Optional</span>
                    <span className="font-mono font-bold">{formatMoney(optionalTotals.vat)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-800 font-black pt-2 border-t border-zinc-200">
                    <span>Total inkl. Optional</span>
                    <span className="font-mono">{formatMoney(totalsInclOptional.gross)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <label className="text-[10px] font-bold uppercase text-zinc-300 mb-2 block">Einleitungstext</label>
            <textarea
              className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-sm font-bold outline-none resize-none h-24 focus:bg-white transition-colors"
              value={doc.notes || ''}
              onChange={(e) => setDoc((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Gerne offerieren wir Ihnen..."
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <label className="text-[10px] font-bold uppercase text-zinc-300 mb-2 block">Fusszeile / Konditionen</label>
            <textarea
              className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-sm font-bold outline-none resize-none h-24 focus:bg-white transition-colors"
              value={doc.footer || ''}
              onChange={(e) => setDoc((prev) => ({ ...prev, footer: e.target.value }))}
              placeholder="Zahlungsbedingungen, Ausführung, Gültigkeit..."
            />
          </div>
        </div>
      </div>

      <ActionBar
        onCancel={handleBack}
        onSave={isDirty ? handleSave : undefined}
        saveLabel="Speichern"
        onMenu={() => setShowActionMenu(true)}
      >
        {!isDirty && (
            <>
                <Button variant="ghost" onClick={handleShare} icon="📤" />
                <Button variant="ghost" onClick={handleDownload} icon="📄" />
                <Button variant="ghost" onClick={() => window.print()} icon="🖨️" />
            </>
        )}
      </ActionBar>
    </div>
  );
};

export default QuoteEditor;
