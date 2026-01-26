
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../../db';
import { OfficeDocument, OfficeLineItem, Customer, Account, VatRate, BankTransaction } from '../../../officeTypes';
import CustomerManager from '../../crm/CustomerManager';
import { formatMoney, formatDate } from '../../../components/SharedUI';
import { analyzeSupplierInvoice } from '../../../geminiService';

interface SupplierInvoiceEditorProps {
  initialDoc: OfficeDocument | null;
  onSave: (doc: OfficeDocument) => Promise<void>;
  onCancel: () => void;
  onDuplicate?: (doc: OfficeDocument) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

// --- Helper Components ---

const SearchableAccountSelect = ({
  accountId,
  onChange,
  accounts
}: {
  accountId: number | undefined;
  onChange: (id: number) => void;
  accounts: Account[];
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (selectedAccount) {
      setSearch(`${selectedAccount.number} ${selectedAccount.name}`);
    }
  }, [selectedAccount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search to selected value on blur if no new selection made
        if (selectedAccount) {
          setSearch(`${selectedAccount.number} ${selectedAccount.name}`);
        } else {
          setSearch('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedAccount]);

  const filtered = accounts
    .filter(
      (a) =>
        a.number.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 8); // Limit results

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 font-bold text-sm outline-none focus:bg-white focus:border-olive-500 h-[42px]"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Konto suchen (Nr/Name)..."
      />
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border border-zinc-200 shadow-xl rounded-lg mt-1 z-50 max-h-48 overflow-y-auto">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="px-3 py-2 hover:bg-olive-50 cursor-pointer text-xs border-b border-zinc-50 last:border-0"
              onClick={() => {
                onChange(a.id!);
                setIsOpen(false);
              }}
            >
              <span className="font-mono font-bold mr-2">{a.number}</span>
              <span>{a.name}</span>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-2 text-xs text-zinc-400">Kein Konto gefunden</div>}
        </div>
      )}
    </div>
  );
};

type BankAccountLike = { id?: number; name?: string; iban?: string; currency?: string };

type PaymentType = 'bank' | 'qr' | 'manual';

const PaymentModal = ({
  doc,
  bankAccounts,
  onClose,
  onSave
}: {
  doc: OfficeDocument;
  bankAccounts: BankAccountLike[];
  onClose: () => void;
  onSave: (payment: any) => void;
}) => {
  const defaultCurrency = (doc.currency || 'CHF') as string;

  const [type, setType] = useState<PaymentType>('bank');

  // shared
  const [amount, setAmount] = useState<number>(Number(doc.totalGross || 0));
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [executionDate, setExecutionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [debitAccountId, setDebitAccountId] = useState<number | ''>('');
  
  // Data Pre-fill from Doc
  const [reference, setReference] = useState<string>((doc as any).qrReference || doc.qrReference || '');
  const [iban, setIban] = useState<string>((doc as any).iban || '');
  const [recipientName, setRecipientName] = useState<string>(doc.client?.name || '');
  
  const [street, setStreet] = useState<string>(doc.client?.street || '');
  const [streetNo, setStreetNo] = useState<string>(doc.client?.houseNr || '');
  const [zip, setZip] = useState<string>(doc.client?.zip || '');
  const [city, setCity] = useState<string>(doc.client?.city || '');
  const [country, setCountry] = useState<string>(doc.client?.country || 'CH');

  // IBAN extras
  const [fees, setFees] = useState<number>(0);
  const [messageToRecipient, setMessageToRecipient] = useState<string>('');
  const [isSalaryPayment, setIsSalaryPayment] = useState<boolean>(false);
  const [salaryDetails, setSalaryDetails] = useState<string>('');

  // manual
  const [manualBankAccount, setManualBankAccount] = useState<string>('');
  const [manualNote, setManualNote] = useState<string>('');

  const debitAccounts = useMemo(() => bankAccounts || [], [bankAccounts]);

  const debitAccountLabel = (b: BankAccountLike) => {
    const n = (b.name || '').trim();
    const i = (b.iban || '').trim();
    const c = (b.currency || '').trim();
    return `${n || 'Bankkonto'}${i ? ` · ${i}` : ''}${c ? ` · ${c}` : ''}`;
  };

  const canSubmit = useMemo(() => {
    if (!amount || amount <= 0) return false;

    if (type === 'manual') {
      return !!manualBankAccount.trim() && !!executionDate;
    }

    // bank / qr
    // Relaxed validation for UX, but ideally stricter
    if (!recipientName.trim()) return false;
    if (!executionDate) return false;
    if (!debitAccountId) return false;

    return true;
  }, [
    amount,
    type,
    recipientName,
    executionDate,
    debitAccountId,
    manualBankAccount
  ]);

  const submit = () => {
    const base = {
      type,
      amount,
      currency,
      executionDate,
      debitAccountId: debitAccountId || undefined
    };

    if (type === 'manual') {
      onSave({
        ...base,
        bankAccount: manualBankAccount,
        note: manualNote
      });
      return;
    }

    if (type === 'qr') {
      onSave({
        ...base,
        iban,
        recipientName,
        street,
        streetNo,
        zip,
        city,
        country,
        reference
      });
      return;
    }

    // bank (IBAN)
    onSave({
      ...base,
      iban,
      recipientName,
      street,
      streetNo,
      zip,
      country,
      fees,
      messageToRecipient,
      isSalaryPayment,
      salaryDetails
    });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-black uppercase text-lg">Zahlung erfassen</h3>
            <div className="text-xs text-zinc-400 font-bold mt-1">
              Rechnung: <span className="font-mono">{doc.docNumber}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 font-black">
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Zahlungsart</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('bank')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${
                  type === 'bank' ? 'bg-zinc-900 text-white' : 'bg-white border-zinc-200'
                }`}
              >
                IBAN
              </button>
              <button
                type="button"
                onClick={() => setType('qr')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${
                  type === 'qr' ? 'bg-zinc-900 text-white' : 'bg-white border-zinc-200'
                }`}
              >
                QR-Rechnung
              </button>
              <button
                type="button"
                onClick={() => setType('manual')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${
                  type === 'manual' ? 'bg-zinc-900 text-white' : 'bg-white border-zinc-200'
                }`}
              >
                Manuell
              </button>
            </div>
          </div>

          {/* Shared amount/currency row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Betrag</label>
              <input
                type="number"
                className="w-full border p-2.5 rounded-lg font-bold"
                value={Number.isFinite(amount) ? amount : 0}
                onChange={(e) => setAmount(parseFloat(e.target.value || '0'))}
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Währung</label>
              <select
                className="w-full border p-2.5 rounded-lg font-bold"
                value={currency || 'CHF'}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Ausführungsdatum</label>
              <input
                type="date"
                className="w-full border p-2.5 rounded-lg font-bold"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
              />
            </div>
          </div>

          {type === 'manual' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Bankkonto</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={manualBankAccount}
                    onChange={(e) => setManualBankAccount(e.target.value)}
                    placeholder="z.B. Kasse, Bank, Kreditkarte..."
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Notiz / Buchungstext</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                    {type === 'qr' ? 'IBAN / QR-IBAN' : 'IBAN'}
                  </label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold font-mono"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="CH.. .... .... .... .... ...."
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Belastungskonto</label>
                  <select
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={debitAccountId}
                    onChange={(e) => setDebitAccountId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Bitte wählen...</option>
                    {debitAccounts.map((b, i) => (
                      <option key={(b.id ?? i) as any} value={b.id ?? i}>
                        {debitAccountLabel(b)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Name Zahlungsempfänger</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Firma / Person"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Strasse</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Strasse"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Nr.</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={streetNo}
                    onChange={(e) => setStreetNo(e.target.value)}
                    placeholder="Nr."
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">PLZ</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="PLZ"
                  />
                </div>

                {type === 'qr' && (
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Stadt</label>
                    <input
                      className="w-full border p-2.5 rounded-lg font-bold"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Stadt"
                    />
                  </div>
                )}

                <div className={type === 'qr' ? 'md:col-span-2' : 'md:col-span-6'}>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Land</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="CH"
                  />
                </div>
              </div>

              {type === 'qr' ? (
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Referenz / QR-Referenz</label>
                  <input
                    className="w-full border p-2.5 rounded-lg font-bold font-mono"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="QR-Referenz"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Gebühren</label>
                      <input
                        type="number"
                        className="w-full border p-2.5 rounded-lg font-bold"
                        value={Number.isFinite(fees) ? fees : 0}
                        onChange={(e) => setFees(parseFloat(e.target.value || '0'))}
                      />
                    </div>
                    <div className="md:col-span-8">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Nachricht an Empfänger</label>
                      <input
                        className="w-full border p-2.5 rounded-lg font-bold"
                        value={messageToRecipient}
                        onChange={(e) => setMessageToRecipient(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 text-zinc-500 font-bold uppercase text-xs">
            Abbrechen
          </button>
          <button
            disabled={!canSubmit}
            onClick={submit}
            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs shadow-lg ${
              canSubmit ? 'bg-olive-600 text-white hover:bg-olive-700' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            }`}
          >
            Buchen
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const SupplierInvoiceEditor: React.FC<SupplierInvoiceEditorProps> = ({
  initialDoc,
  onSave,
  onCancel,
  onDuplicate,
  onDelete
}) => {
  // Step 1 vs Step 2 State
  const [step, setStep] = useState<1 | 2>(initialDoc ? 2 : 1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data State
  const [doc, setDoc] = useState<OfficeDocument>(() => {
    if (initialDoc) return initialDoc;
    const year = new Date().getFullYear();
    return {
      docNumber: `LR-${year}-${Date.now().toString().slice(-4)}`, // Internal ID
      type: 'supplier_invoice',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      client: { name: '', street: '', zip: '', city: '' },
      items: [],
      totalNet: 0,
      totalTax: 0,
      totalGross: 0,
      currency: 'CHF'
    } as any;
  });

  // Attachments
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Lookups
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // UI State
  const [overlay, setOverlay] = useState<'none' | 'customer' | 'payment'>('none');
  const [bookingMode, setBookingMode] = useState<'general' | 'positions'>('general');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadLookups();
    // Heuristic to detect mode if editing
    if (initialDoc && initialDoc.items.length > 1) setBookingMode('positions');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLookups = async () => {
    setCustomers(await db.customers.toArray());
    setAccounts(await db.accounts.toArray());
    const s = await db.settings.toArray();
    if (s.length) {
      setVatRates(s[0].vatRates);
      setUsers(s[0].users || []);
      setBankAccounts((s[0] as any).bankAccounts || (s[0] as any).linkedBankAccounts || []);
    }
  };

  // --- Step 1 Logic (Wizard) ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = async (f: File) => {
    setFile(f);
    const reader = new FileReader();

    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      setFilePreview(result);

      // Try AI Analysis
      if (f.type.includes('image') || f.type.includes('pdf')) {
        setIsProcessing(true);
        const data = await analyzeSupplierInvoice(result.split(',')[1], f.type);
        if (data) {
          setDoc((prev) => ({
            ...prev,
            // Internal number stays, ref gets invoice number
            qrReference: data.docNumber,
            title: `Rechnung ${data.supplierName || 'Lieferant'}`,
            date: data.date || prev.date,
            validUntil: data.dueDate || prev.validUntil,
            totalGross: data.totalGross || prev.totalGross,
            totalNet: data.totalGross - (data.totalTax || 0) || prev.totalNet,
            totalTax: data.totalTax || prev.totalTax,
            currency: data.currency || 'CHF',
            client: { ...prev.client, name: data.supplierName || prev.client.name },
            // Store IBAN if extracted
            iban: data.iban || (prev as any).iban,
            // Default single item for general booking
            items: [
              {
                id: 'gen',
                description: 'Rechnungsbetrag',
                quantity: 1,
                unit: 'Psch',
                price: data.totalGross - (data.totalTax || 0),
                vatRate: data.items?.[0]?.taxRate || 8.1,
                type: 'material',
                isOptional: false
              }
            ]
          } as any));
        }
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const selectSupplier = (c: Customer) => {
    setDoc((prev) => ({
      ...prev,
      customerId: c.id,
      client: {
        name: c.type === 'business' ? c.companyName! : `${c.firstName} ${c.lastName}`,
        street: c.address.street,
        houseNr: c.address.houseNr,
        zip: c.address.zip,
        city: c.address.city,
        country: c.address.country,
        email: c.address.email,
        phone: c.address.phone,
        website: c.address.website
      }
    }));
    setOverlay('none');
  };

  const proceed = () => {
    // Allow proceeding even without explicit supplier link, just need name (can be typed later)
    setStep(2);
  };

  // --- Step 2 Logic (Editor) ---

  const recalculate = (currentItems: OfficeLineItem[]) => {
    const net = currentItems.reduce((acc, i) => acc + i.quantity * i.price, 0);
    const tax = currentItems.reduce((acc, i) => acc + i.quantity * i.price * (((i.vatRate || 0) as number) / 100), 0);
    return { net, tax, gross: net + tax };
  };

  const updateItem = (idx: number, patch: Partial<OfficeLineItem>) => {
    const newItems = [...doc.items];
    newItems[idx] = { ...newItems[idx], ...patch };
    const { net, tax, gross } = recalculate(newItems);
    setDoc({ ...doc, items: newItems, totalNet: net, totalTax: tax, totalGross: gross });
  };

  const addItem = () => {
    const newItem: OfficeLineItem = {
      id: Math.random().toString(),
      description: '',
      quantity: 1,
      unit: 'Stk',
      price: 0,
      vatRate: 8.1,
      type: 'material',
      isOptional: false
    };
    const newItems = [...doc.items, newItem];
    setDoc({ ...doc, items: newItems });
  };

  const removeItem = (idx: number) => {
    const newItems = [...doc.items];
    newItems.splice(idx, 1);
    const { net, tax, gross } = recalculate(newItems);
    setDoc({ ...doc, items: newItems, totalNet: net, totalTax: tax, totalGross: gross });
  };

  // One-Line Calculation for General Mode
  const handleGeneralBookingChange = (field: 'desc' | 'net' | 'gross' | 'vat' | 'acc', val: any) => {
    // Ensure we have at least one item
    const fallbackItem: OfficeLineItem = {
      id: 'gen',
      quantity: 1,
      unit: 'Psch',
      price: 0,
      vatRate: 8.1,
      description: '',
      type: 'material',
      isOptional: false,
      accountId: undefined
    };

    const currentItems: OfficeLineItem[] = doc.items.length > 0 ? [...doc.items] : [fallbackItem];
    const item = { ...currentItems[0] };

    if (field === 'desc') item.description = val;
    if (field === 'acc') item.accountId = val;
    if (field === 'vat') item.vatRate = parseFloat(val);

    if (field === 'gross') {
      const gross = parseFloat(val) || 0;
      const rate = (item.vatRate as any) || 8.1;
      const net = gross / (1 + rate / 100);
      item.price = net;
    }

    if (field === 'net') {
      const net = parseFloat(val) || 0;
      item.price = net;
    }

    currentItems[0] = item;
    const { net, tax, gross } = recalculate(currentItems);
    setDoc({ ...doc, items: currentItems, totalNet: net, totalTax: tax, totalGross: gross });
  };

  const doSave = async (statusOverride?: string) => {
    const finalDoc = statusOverride ? { ...doc, status: statusOverride } : doc;
    await onSave(finalDoc as any);
  };

  const handlePayment = async (payment: any) => {
    const currency = payment.currency || doc.currency || 'CHF';
    const bookingDate = payment.executionDate || payment.date || new Date().toISOString().split('T')[0];
    const amount = Number(payment.amount || 0);

    // Create Bank Transaction
    const tx: BankTransaction = {
      bookingDate,
      amount: -Math.abs(amount),
      currency,
      counterparty: doc.client.name,
      reference: payment.reference || payment.messageToRecipient || '',
      details: `Zahlung Rechnung ${doc.docNumber}`,
      status: 'matched',
      matchedDocId: doc.id
    } as any;

    // attach extra info (optional)
    (tx as any).debitAccountId = payment.debitAccountId;
    (tx as any).iban = payment.iban;
    (tx as any).fees = payment.fees;
    (tx as any).isSalaryPayment = payment.isSalaryPayment;

    if (doc.id) {
      // Update Invoice status
      await db.documents.update(doc.id, { status: 'paid', paidAt: bookingDate });
      await db.transactions.add(tx);
      setDoc({ ...doc, status: 'paid', paidAt: bookingDate });
      alert('Zahlung verbucht!');
    } else {
      alert('Bitte Rechnung erst speichern.');
    }
    setOverlay('none');
  };

  // --- RENDER ---

  if (overlay === 'customer') {
    return (
      <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
        <CustomerManager onBack={() => setOverlay('none')} onSelect={selectSupplier} initialEditMode={false} />
      </div>
    );
  }

  if (overlay === 'payment') {
    return <PaymentModal doc={doc} bankAccounts={bankAccounts} onClose={() => setOverlay('none')} onSave={handlePayment} />;
  }

  // WIZARD STEP 1
  if (step === 1) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 p-6 items-center justify-center animate-in fade-in">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-2xl border border-zinc-100">
          <h2 className="text-2xl font-black brand-font uppercase mb-2">Neue Lieferantenrechnung</h2>
          <p className="text-zinc-400 mb-8 text-sm">
            Laden Sie den Beleg hoch und wählen Sie den Lieferanten. Die KI unterstützt Sie beim Ausfüllen.
          </p>

          {/* Supplier Selection */}
          <div className="mb-8">
            <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">Lieferant / Kontakt</label>
            <button
              onClick={() => setOverlay('customer')}
              className="w-full text-left p-4 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors flex justify-between items-center group"
            >
              {doc.client.name ? (
                <div>
                  <span className="font-black text-lg block text-zinc-900">{doc.client.name}</span>
                  <span className="text-xs text-zinc-500">{doc.client.city}</span>
                </div>
              ) : (
                <span className="text-zinc-400 font-bold">Kontakt auswählen...</span>
              )}
              <span className="text-xl bg-white w-10 h-10 flex items-center justify-center rounded-full shadow-sm group-hover:scale-110 transition-transform">
                👤
              </span>
            </button>
          </div>

          {/* File Upload */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
              dragActive ? 'border-olive-500 bg-olive-50' : 'border-zinc-200 hover:border-olive-400 hover:bg-zinc-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
            />

            {isProcessing ? (
              <div className="py-8">
                <div className="w-12 h-12 border-4 border-olive-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-bold text-olive-600 uppercase text-xs animate-pulse">KI analysiert Beleg...</p>
              </div>
            ) : file ? (
              <div>
                <div className="text-4xl mb-2">📄</div>
                <p className="font-bold text-zinc-800">{file.name}</p>
                <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setFilePreview(null);
                  }}
                  className="mt-4 text-red-500 text-xs font-bold uppercase hover:underline"
                >
                  Entfernen
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2 text-zinc-300">☁️</div>
                <p className="font-bold text-zinc-600">Beleg hier ablegen</p>
                <p className="text-xs text-zinc-400 mt-1">oder klicken zum Auswählen</p>
                <p className="text-[10px] text-zinc-300 mt-4 uppercase tracking-widest">PDF, JPG, PNG, DOCX, XLSX</p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="mt-8 flex justify-between items-center">
            <button onClick={onCancel} className="text-zinc-400 font-bold uppercase text-xs hover:text-black">
              Abbrechen
            </button>
            <button
              onClick={proceed}
              className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-olive-600 transition-all flex items-center gap-2"
            >
              Weiter
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: MAIN EDITOR
  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors font-bold"
          >
            ✕
          </button>
          <div>
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Lieferantenrechnung</p>
            <div className="flex items-center gap-2">
              <span className="font-black brand-font uppercase text-lg text-zinc-900">{doc.docNumber}</span>
              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">Intern</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
               doc.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
               doc.status === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-200' :
               'bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}>
               {doc.status === 'sent' ? 'Offen' : doc.status}
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Booking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basisdaten Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Basisdaten</h3>

              {/* Title - Full Width */}
              <div className="mb-6">
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Titel / Inhalt</label>
                <input
                  className="w-full bg-zinc-50 rounded-lg p-3 font-bold text-lg outline-none focus:bg-white focus:border-olive-500 border border-transparent transition-all"
                  value={doc.title || ''}
                  onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                  placeholder="z.B. Miete Parkplätze 12.2025"
                />
              </div>

              {/* Grid for other data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier Selection Inline */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Lieferant</label>
                  <div
                    className="flex items-center gap-2 bg-zinc-50 rounded-lg p-2 border border-zinc-100 cursor-pointer hover:bg-zinc-100"
                    onClick={() => setOverlay('customer')}
                  >
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-zinc-500 shadow-sm">
                      👤
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-sm truncate">{doc.client.name || 'Wählen...'}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{doc.client.city}</p>
                    </div>
                    <span className="text-zinc-400 pr-2">▼</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">
                    Referenz (Rechnungs-Nr. Lieferant)
                  </label>
                  <input
                    className="w-full bg-zinc-50 rounded-lg p-3 font-mono text-sm outline-none"
                    value={(doc as any).qrReference || ''}
                    onChange={(e) => setDoc({ ...doc, qrReference: e.target.value } as any)}
                    placeholder="Referenz-Nr."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Buchungsdatum</label>
                    <input
                      type="date"
                      className="w-full bg-zinc-50 rounded-lg p-2 font-bold text-sm outline-none"
                      value={doc.date}
                      onChange={(e) => setDoc({ ...doc, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Fälligkeit</label>
                    <input
                      type="date"
                      className="w-full bg-zinc-50 rounded-lg p-2 font-bold text-sm outline-none"
                      value={doc.validUntil || ''}
                      onChange={(e) => setDoc({ ...doc, validUntil: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Währung</label>
                    <select
                      className="w-full bg-zinc-50 rounded-lg p-2 font-bold text-sm outline-none"
                      value={doc.currency || 'CHF'}
                      onChange={(e) => setDoc({ ...doc, currency: e.target.value })}
                    >
                      <option>CHF</option>
                      <option>EUR</option>
                      <option>USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Int. Kontakt</label>
                    <select
                      className="w-full bg-zinc-50 rounded-lg p-2 font-bold text-sm outline-none"
                      value={(doc as any).internalContact || ''}
                      onChange={(e) => setDoc({ ...doc, internalContact: e.target.value } as any)}
                    >
                      <option value="">Bitte wählen...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Financials / Positions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Buchung</h3>

              {bookingMode === 'general' ? (
                // General Booking Mode (One Line)
                <div className="space-y-4">
                  {/* DESKTOP: alles auf einer Zeile | MOBILE: alles eigene Zeile */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Beschreibung */}
                    <div className="md:col-span-4">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Beschreibung</label>
                      <input
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 font-bold text-sm outline-none h-[42px]"
                        value={doc.items[0]?.description || ''}
                        onChange={(e) => handleGeneralBookingChange('desc', e.target.value)}
                        placeholder="Buchungstext..."
                      />
                    </div>

                    {/* Konto */}
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Konto (Soll)</label>
                      <SearchableAccountSelect
                        accountId={doc.items[0]?.accountId || 4000}
                        accounts={accounts.filter((a) => a.type === 'expense')}
                        onChange={(id) => handleGeneralBookingChange('acc', id)}
                      />
                    </div>

                    {/* MWST */}
                    <div className="md:col-span-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">MWST</label>
                      <select
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 font-bold text-sm outline-none h-[42px]"
                        value={doc.items[0]?.vatRate || 8.1}
                        onChange={(e) => handleGeneralBookingChange('vat', e.target.value)}
                      >
                        {vatRates.map((v) => (
                          <option key={v.code} value={v.rate}>
                            {v.rate}%
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Netto/Steuer/Brutto block */}
                    <div className="md:col-span-4 grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Netto</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 font-bold text-sm outline-none text-right h-[42px]"
                            value={doc.totalNet ? doc.totalNet.toFixed(2) : ''}
                            onChange={(e) => handleGeneralBookingChange('net', e.target.value)}
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Steuer</label>
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 font-bold text-sm text-olive-600 text-right h-[42px] flex items-center justify-end">
                              {formatMoney(doc.totalTax).replace('CHF ', '')}
                          </div>
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Brutto</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 font-black text-sm outline-none text-right focus:border-olive-500 h-[42px]"
                            value={doc.totalGross ? doc.totalGross.toFixed(2) : ''}
                            onChange={(e) => handleGeneralBookingChange('gross', e.target.value)}
                          />
                        </div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => setBookingMode('positions')}
                      className="text-[10px] font-bold uppercase text-olive-600 hover:bg-olive-50 px-3 py-1 rounded"
                    >
                      ↓ In Einzelpositionen aufteilen
                    </button>
                  </div>
                </div>
              ) : (
                // Positions Mode
                <div className="space-y-2">
                  {doc.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-zinc-50 rounded-lg">
                      <div className="col-span-5">
                        <input
                          className="w-full bg-transparent font-bold text-sm outline-none"
                          value={item.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="Beschreibung"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          className="w-full bg-transparent text-xs outline-none"
                          value={item.accountId || 4000}
                          onChange={(e) => updateItem(idx, { accountId: parseInt(e.target.value) })}
                        >
                          {accounts
                            .filter((a) => a.type === 'expense')
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.number} {a.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="col-span-2 text-right">
                        <input
                          type="number"
                          className="w-full bg-transparent text-right font-mono text-sm outline-none"
                          value={item.price}
                          onChange={(e) => updateItem(idx, { price: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="col-span-1 text-right text-xs">{item.vatRate}%</div>
                      <div className="col-span-1 text-center">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={addItem}
                      className="flex-1 py-3 border-2 border-dashed border-zinc-200 rounded-lg text-zinc-400 font-bold uppercase text-[10px] hover:border-olive-500 hover:text-olive-600 transition-colors"
                    >
                      + Position
                    </button>
                    <button
                      onClick={() => setBookingMode('general')}
                      className="px-4 py-3 bg-zinc-100 rounded-lg text-zinc-500 font-bold uppercase text-[10px] hover:bg-zinc-200"
                    >
                      Zurück zu Allgemein
                    </button>
                  </div>

                  <div className="flex justify-end gap-6 mt-4 pt-4 border-t border-zinc-100">
                    <div className="text-right">
                      <span className="block text-[10px] font-bold uppercase text-zinc-400">Netto</span>
                      <span className="font-mono font-bold">{formatMoney(doc.totalNet)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold uppercase text-zinc-400">Steuer</span>
                      <span className="font-mono font-bold text-olive-600">{formatMoney(doc.totalTax)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold uppercase text-zinc-400">Total</span>
                      <span className="font-mono font-black text-xl">{formatMoney(doc.totalGross)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Zahlung erfassen Button unter Buchung */}
              <div className="mt-6 pt-5 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOverlay('payment')}
                  className="px-5 py-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-black uppercase hover:bg-blue-100"
                >
                  Zahlung erfassen
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Meta & File */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Status</h3>
              <div className="mb-4">
                <select
                  className="w-full bg-zinc-50 rounded-lg p-2 font-bold text-sm outline-none"
                  value={doc.status}
                  onChange={(e) => setDoc({ ...doc, status: e.target.value as any })}
                >
                  <option value="draft">Entwurf</option>
                  <option value="sent">Offen / Erhalten</option>
                  <option value="paid">Bezahlt</option>
                </select>
              </div>

              {doc.status === 'paid' && (
                <div className="bg-green-50 p-3 rounded-lg text-green-700 text-xs font-bold text-center">
                  Bezahlt am {formatDate(doc.paidAt || '')}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Beleg</h3>
              {filePreview ? (
                <div className="relative group h-64 bg-zinc-50 rounded-lg flex items-center justify-center border border-zinc-200 overflow-hidden">
                  <img src={filePreview} alt="Beleg" className="w-full h-full object-contain" />
                  <button
                    onClick={() => {
                      setFile(null);
                      setFilePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  className="h-32 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:bg-zinc-50 cursor-pointer"
                  onClick={() => document.getElementById('file-upload-2')?.click()}
                >
                  <span className="text-2xl">📎</span>
                  <span className="text-[10px] font-bold uppercase mt-2">Datei wählen</span>
                  <input
                    id="file-upload-2"
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                  />
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button className="flex-1 bg-zinc-50 py-2 rounded-lg text-[10px] font-bold uppercase text-zinc-500 hover:bg-zinc-100">
                  Aus Posteingang
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="bg-white border-t border-zinc-200 p-4 z-40 shadow-lg">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={() => onDelete(doc.id!)}
                className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold uppercase text-xs hover:bg-red-100"
              >
                Löschen
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(doc)}
                className="px-4 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold uppercase text-xs hover:bg-zinc-200"
              >
                Duplizieren
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-xl bg-zinc-100 text-zinc-500 font-bold uppercase text-xs hover:bg-zinc-200"
            >
              Abbrechen
            </button>
            
            <button
              onClick={() => doSave()}
              className="px-8 py-3 rounded-xl bg-zinc-800 text-white font-black uppercase text-xs shadow-lg hover:bg-black"
            >
              Speichern
            </button>

            {doc.status === 'draft' && (
                <button
                  onClick={() => doSave('sent')}
                  className="px-8 py-3 rounded-xl bg-olive-600 text-white font-black uppercase text-xs shadow-lg hover:bg-olive-700"
                >
                  Als Offen markieren
                </button>
            )}

            {doc.status === 'sent' && (
                <button
                  onClick={() => doSave('draft')}
                  className="px-8 py-3 rounded-xl bg-zinc-200 text-zinc-600 font-black uppercase text-xs shadow-lg hover:bg-zinc-300"
                >
                  Auf Entwurf zurücksetzen
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierInvoiceEditor;
