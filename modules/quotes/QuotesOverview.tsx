import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../db';
import { OfficeDocument, Customer, Project, Product, OfficeAddress } from '../../officeTypes';
import { Toast, ToastType, formatMoney, formatDate } from '../../components/SharedUI';
import QuoteEditor from './QuoteEditor';

interface OffersProps {
  onBack: () => void;
  preselectedCustomerId?: number;
}

const QuotesOverview: React.FC<OffersProps> = ({ onBack, preselectedCustomerId }) => {
  // --- Data State ---
  const [docs, setDocs] = useState<OfficeDocument[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // --- View State ---
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [selectedDoc, setSelectedDoc] = useState<OfficeDocument | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  // --- Advanced Filter State ---
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'partial' | 'done'>('all');
  const [filters, setFilters] = useState({
    search: '',
    docNumber: '',
    projectId: '',
    currency: '',
    account: '',
    status: '',
    isSent: false,
    title: '',
    contactPerson: '',
    language: '',
    dateFrom: '',
    dateTo: '',
    correspondenceType: '',
    contactName: '',
    salesPerson: '',
    paymentMethod: '',
    isRecurring: false
  });

  // --- Sorting & Pagination ---
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [d, c, proj, prod, s] = await Promise.all([
      db.documents.where('type').equals('quote').toArray(),
      db.customers.toArray(),
      db.projects.toArray(),
      db.products.toArray(),
      db.settings.toArray()
    ]);
    setDocs(d);
    setCustomers(c);
    setProjects(proj);
    setProducts(prod);
    setSettings(s[0]);
  };

  // Deep Link Handling
  useEffect(() => {
    if (preselectedCustomerId && !selectedDoc && customers.length > 0 && view === 'list') {
      handleCreateNew(preselectedCustomerId);
    }
  }, [preselectedCustomerId, customers]);

  const handleCreateNew = (customerId?: number) => {
    const year = new Date().getFullYear();
    const num = String(Date.now()).slice(-4);

    let initialClient: OfficeAddress = { name: '', street: '', zip: '', city: '' };
    if (customerId) {
      const c = customers.find(x => x.id === customerId);
      if (c)
        initialClient = {
          name: c.type === 'business' ? c.companyName! : `${c.firstName} ${c.lastName}`,
          street: c.address.street,
          zip: c.address.zip,
          city: c.address.city,
          email: c.address.email,
          phone: c.address.phone,
          website: c.address.website
        };
    }

    const intro = settings?.layouts?.quote?.introText || '';
    const footer = settings?.layouts?.quote?.outroText || '';

    const newDoc: OfficeDocument = {
      docNumber: `O-${year}-${num}`,
      type: 'quote',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      client: initialClient,
      customerId,
      items: [],
      totalNet: 0,
      totalTax: 0,
      totalGross: 0,
      dunningLevel: 0,
      notes: intro,
      footer: footer
    };

    setSelectedDoc(newDoc);
    setView('editor');
  };

  const handleSaveDoc = async (doc: OfficeDocument) => {
    if (doc.id) {
      await db.documents.update(doc.id, doc as any);
    } else {
      await db.documents.add(doc);
    }
    await loadData();
    setToast({ msg: 'Offerte gespeichert', type: 'success' });
    setView('list');
    setSelectedDoc(null);
  };

  const handleDeleteDoc = async (id: number) => {
    await db.documents.delete(id);
    await loadData();
    setToast({ msg: 'Offerte gelöscht', type: 'info' });
    setView('list');
    setSelectedDoc(null);
  };

  const handleDuplicateDoc = async (doc: OfficeDocument) => {
    const newDoc = {
      ...doc,
      id: undefined,
      docNumber: `${doc.docNumber}-COPY`,
      status: 'draft' as const,
      date: new Date().toISOString().split('T')[0]
    };
    await db.documents.add(newDoc);
    await loadData();
    setToast({ msg: 'Offerte kopiert', type: 'success' });
  };

  const handleConvert = async (doc: OfficeDocument) => {
    const invoice: OfficeDocument = {
      ...doc,
      id: undefined,
      type: 'invoice',
      status: 'draft',
      docNumber: doc.docNumber.replace('O-', 'R-'),
      date: new Date().toISOString().split('T')[0],
      notes: settings?.layouts?.invoice?.introText,
      footer: settings?.layouts?.invoice?.outroText,
      relatedQuoteId: doc.id
    };

    if (!doc.id) await db.documents.add(doc);

    await db.documents.add(invoice);
    await loadData();
    setToast({ msg: 'Rechnung erstellt!', type: 'success' });
    setView('list');
    setSelectedDoc(null);
  };

  // --- Filtering & Sorting ---
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortValue = (doc: any, key: string) => {
    if (!key) return '';
    if (key.includes('.')) {
      return key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), doc) ?? '';
    }
    return doc?.[key] ?? '';
  };

  const filteredDocs = useMemo(() => {
    return docs
      .filter(d => {
        // 1. Tab Filter (Quick)
        if (activeTab === 'open' && d.status !== 'draft') return false;
        if (activeTab === 'partial' && d.status !== 'sent') return false;
        if (activeTab === 'done' && !['accepted', 'paid', 'rejected'].includes(d.status)) return false;

        // 2. Advanced Filters
        if (filters.search) {
          const s = filters.search.toLowerCase();
          const match =
            d.client.name.toLowerCase().includes(s) ||
            d.docNumber.toLowerCase().includes(s) ||
            d.title?.toLowerCase().includes(s);
          if (!match) return false;
        }

        if (filters.docNumber && !d.docNumber.toLowerCase().includes(filters.docNumber.toLowerCase())) return false;
        if (filters.projectId && d.projectId !== Number(filters.projectId)) return false;

        if (filters.status && d.status !== filters.status) return false;
        if (filters.isSent && d.status !== 'sent') return false;
        if (filters.title && !d.title?.toLowerCase().includes(filters.title.toLowerCase())) return false;
        if (filters.contactName && !d.client.name.toLowerCase().includes(filters.contactName.toLowerCase())) return false;

        if (filters.dateFrom && new Date(d.date) < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && new Date(d.date) > new Date(filters.dateTo)) return false;

        return true;
      })
      .sort((a: any, b: any) => {
        const aVal = getSortValue(a, sortConfig.key) ?? '';
        const bVal = getSortValue(b, sortConfig.key) ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [docs, activeTab, filters, sortConfig]);

  // --- Pagination Data ---
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / rowsPerPage));

  useEffect(() => {
    // Seite sauber halten, wenn Filter/RowsPerPage sich ändern
    setCurrentPage(p => Math.min(Math.max(1, p), totalPages));
    // Auswahl leeren, damit Bulk nicht "unsichtbar" selektiert bleibt
    setSelectedIds(new Set());
  }, [rowsPerPage, totalPages, activeTab, filters.search, filters.docNumber, filters.projectId, filters.status, filters.dateFrom, filters.dateTo]);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDocs.slice(start, start + rowsPerPage);
  }, [filteredDocs, currentPage, rowsPerPage]);

  const totalNet = paginatedDocs.reduce((sum, d) => sum + d.totalNet, 0);
  const totalGross = paginatedDocs.reduce((sum, d) => sum + d.totalGross, 0);

  // --- Selection ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedDocs.map(d => d.id!).filter(Boolean)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const executeBulkAction = () => {
    if (selectedIds.size === 0) return;
    setToast({ msg: `Aktion "${bulkAction}" für ${selectedIds.size} Elemente ausgeführt`, type: 'info' });
  };

  // --- Export (CSV / XLSX) ---
  const toCsv = (rows: Record<string, any>[]) => {
    const headers = Object.keys(rows[0] ?? {});
    const esc = (v: any) => {
      const s = String(v ?? '');
      const needs = /[;"\n\r]/.test(s);
      const safe = s.replace(/"/g, '""');
      return needs ? `"${safe}"` : safe;
    };
    const lines = [
      headers.map(esc).join(';'),
      ...rows.map(r => headers.map(h => esc(r[h])).join(';'))
    ];
    return lines.join('\n');
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportOffers = async (format: 'csv' | 'xlsx') => {
    try {
      const rows = filteredDocs.map(d => ({
        Nr: d.docNumber,
        Datum: formatDate(d.date),
        Status: d.status,
        Kunde: d.client?.name ?? '',
        Titel: d.title ?? '',
        Netto: Number(d.totalNet ?? 0).toFixed(2),
        MWST: Number(d.totalTax ?? 0).toFixed(2),
        Brutto: Number(d.totalGross ?? 0).toFixed(2),
        Währung: 'CHF',
        Positionen: d.items?.length ?? 0
      }));

      if (format === 'csv') {
        const csv = toCsv(rows);
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `offerten_export_${new Date().toISOString().slice(0, 10)}.csv`);
        setToast({ msg: 'CSV Export erstellt', type: 'success' });
        return;
      }

      // XLSX (optional, via dynamic import)
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Offerten');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(
        new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `offerten_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      setToast({ msg: 'XLSX Export erstellt', type: 'success' });
    } catch (e) {
      // Fallback: CSV
      try {
        const rows = filteredDocs.map(d => ({
          Nr: d.docNumber,
          Datum: formatDate(d.date),
          Status: d.status,
          Kunde: d.client?.name ?? '',
          Titel: d.title ?? '',
          Netto: Number(d.totalNet ?? 0).toFixed(2),
          MWST: Number(d.totalTax ?? 0).toFixed(2),
          Brutto: Number(d.totalGross ?? 0).toFixed(2),
          Währung: 'CHF',
          Positionen: d.items?.length ?? 0
        }));
        const csv = toCsv(rows);
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `offerten_export_${new Date().toISOString().slice(0, 10)}.csv`);
        setToast({ msg: 'XLSX nicht verfügbar, CSV Export erstellt', type: 'info' });
      } catch {
        setToast({ msg: 'Export fehlgeschlagen', type: 'error' });
      }
    }
  };

  // --- Render ---
  if (view === 'editor' && selectedDoc) {
    return (
      <QuoteEditor
        initialDoc={selectedDoc}
        customers={customers}
        projects={projects}
        products={products}
        settings={settings}
        onSave={handleSaveDoc}
        onCancel={() => {
          setView('list');
          setSelectedDoc(null);
          if (preselectedCustomerId) onBack();
        }}
        onConvert={handleConvert}
        onDelete={handleDeleteDoc}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* 1. Header Section */}
      <div className="sticky top-0 bg-slate-50 z-30 pt-6 pb-2 px-4 md:px-8 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/95">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all shadow-sm"
            >
              ←
            </button>
            <div>
              <h2 className="text-2xl font-black brand-font uppercase">Offerten</h2>
            </div>
          </div>

          {/* Export (rechts) */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(v => !v)}
              className="bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-sm flex items-center gap-2"
              title="Export"
            >
              <span>⬇️</span>
              <span className="hidden md:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    exportOffers('xlsx');
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 flex items-center gap-2"
                >
                  <span className="text-base">📄</span>
                  XLSX exportieren
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    exportOffers('csv');
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 flex items-center gap-2 border-t border-zinc-100"
                >
                  <span className="text-base">🧾</span>
                  CSV exportieren
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar Row */}
        <div className="flex flex-col md:flex-row gap-4 pb-4 items-stretch md:items-center">
          {/* Desktop Tabs (Left Aligned) */}
          <div className="hidden md:flex bg-zinc-200/50 p-1 rounded-xl mr-auto">
            {([
              { id: 'all', label: 'Alle' },
              { id: 'open', label: 'Offen' },
              { id: 'partial', label: 'Teilweise' },
              { id: 'done', label: 'Erledigt' }
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

          {/* Controls (Right/Center on Desktop) */}
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 transition-all">
              <input
                className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold"
                placeholder="Suchen..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
              <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-bold uppercase text-xs transition-all shadow-sm ${
                showFilters ? 'bg-olive-50 border-olive-200 text-olive-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
              }`}
              title="Filter"
            >
              {/* Filter Icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                />
              </svg>
              {/* Text: nur Desktop */}
              <span className="hidden md:inline">Filter</span>
            </button>

            <button
              onClick={() => handleCreateNew()}
              className="bg-zinc-900 hover:bg-olive-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span>+</span>
              <span className="hidden md:inline">Neu</span>
            </button>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {showFilters && (
          <div className="mb-4 p-6 bg-white border border-zinc-200 rounded-xl shadow-lg animate-in slide-in-from-top-2 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Nr.</label>
              <input
                className="w-full border p-2 rounded text-sm"
                value={filters.docNumber}
                onChange={e => setFilters({ ...filters, docNumber: e.target.value })}
                placeholder="O-202X..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Projekt</label>
              <select
                className="w-full border p-2 rounded text-sm bg-white"
                value={filters.projectId}
                onChange={e => setFilters({ ...filters, projectId: e.target.value })}
              >
                <option value="">Alle</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Status</label>
              <select
                className="w-full border p-2 rounded text-sm bg-white"
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Alle</option>
                <option value="draft">Entwurf</option>
                <option value="sent">Versendet</option>
                <option value="accepted">Akzeptiert</option>
                <option value="rejected">Abgelehnt</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Währung</label>
              <select
                className="w-full border p-2 rounded text-sm bg-white"
                value={filters.currency}
                onChange={e => setFilters({ ...filters, currency: e.target.value })}
              >
                <option value="">Alle</option>
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Titel</label>
              <input className="w-full border p-2 rounded text-sm" value={filters.title} onChange={e => setFilters({ ...filters, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Kontakt</label>
              <input
                className="w-full border p-2 rounded text-sm"
                value={filters.contactName}
                onChange={e => setFilters({ ...filters, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Datum Von</label>
              <input type="date" className="w-full border p-2 rounded text-sm" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-zinc-400">Datum Bis</label>
              <input type="date" className="w-full border p-2 rounded text-sm" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
            </div>

            <div className="md:col-span-4 pt-2 border-t border-zinc-100 space-y-3">
              {/* Toggles */}
              <div className="flex flex-wrap gap-6 items-center">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.isSent}
                    onChange={e => setFilters({ ...filters, isSent: e.target.checked })}
                    className="accent-olive-600"
                  />
                  Nur Gesendete
                </label>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.isRecurring}
                    onChange={e => setFilters({ ...filters, isRecurring: e.target.checked })}
                    className="accent-olive-600"
                  />
                  Wiederholend
                </label>
              </div>

              {/* Buttons Row: Reset links + Anwenden daneben (schliesst Panel) */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    setFilters({
                      search: '',
                      docNumber: '',
                      projectId: '',
                      currency: '',
                      account: '',
                      status: '',
                      isSent: false,
                      title: '',
                      contactPerson: '',
                      language: '',
                      dateFrom: '',
                      dateTo: '',
                      correspondenceType: '',
                      contactName: '',
                      salesPerson: '',
                      paymentMethod: '',
                      isRecurring: false
                    })
                  }
                  className="text-[10px] uppercase font-bold text-red-500 hover:underline"
                >
                  Filter zurücksetzen
                </button>

                <button
                  onClick={() => setShowFilters(false)}
                  className="ml-auto md:ml-0 bg-zinc-900 hover:bg-olive-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm"
                >
                  Anwenden
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {/* MOBILE LIST */}
        <div className="md:hidden px-4 pb-24 space-y-3 pt-4">
          {filteredDocs.map(d => (
            <div
              key={d.id}
              onClick={() => {
                setSelectedDoc(d);
                setView('editor');
              }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 hover:border-olive-500 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-zinc-800 text-sm">{d.docNumber}</span>
                    <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black border border-blue-100 uppercase">
                      {d.status}
                    </span>
                  </div>
                  <p className="font-black text-lg text-zinc-900 leading-tight mb-1">{d.client.name || '—'}</p>
                  <p className="text-xs text-zinc-400">
                    {formatDate(d.date)} • {d.items.length} Pos.
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-zinc-900 text-lg tabular-nums">{formatMoney(d.totalGross)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block px-8 pb-10 pt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-olive-600 cursor-pointer"
                      onChange={handleSelectAll}
                      checked={paginatedDocs.length > 0 && selectedIds.size === paginatedDocs.length}
                    />
                  </th>
                  {[
                    { k: 'date', l: 'Datum' },
                    { k: 'docNumber', l: 'Nr.' },
                    { k: 'status', l: 'Status' },
                    { k: 'client.name', l: 'Kunde' },
                    { k: 'title', l: 'Titel' },
                    { k: 'currency', l: 'Währung' },
                    { k: 'totalNet', l: 'Netto', r: true },
                    { k: 'totalGross', l: 'Brutto', r: true },
                    { k: 'sent', l: 'Versand' },
                    { k: 'actions', l: 'Aktionen', r: true }
                  ].map(col => (
                    <th
                      key={col.k}
                      onClick={() => col.k !== 'actions' && handleSort(col.k)}
                      className={`p-4 text-[10px] font-bold uppercase text-zinc-500 tracking-wider cursor-pointer hover:text-black hover:bg-zinc-100 transition-colors ${
                        col.r ? 'text-right' : ''
                      }`}
                    >
                      {col.l} {sortConfig.key === col.k && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Einheitliche Schrift/Farbe/Weight (Ausnahme: Nr. fett, Statusbadge frei) */}
              <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700 font-normal">
                {paginatedDocs.map(d => (
                  <tr
                    key={d.id}
                    className={`group hover:bg-olive-50/20 transition-colors ${selectedIds.has(d.id!) ? 'bg-olive-50/40' : ''}`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-olive-600 cursor-pointer"
                        checked={selectedIds.has(d.id!)}
                        onChange={() => handleSelectRow(d.id!)}
                      />
                    </td>

                    <td className="p-4 tabular-nums">{formatDate(d.date)}</td>

                    <td
                      className="p-4 font-bold text-zinc-900 cursor-pointer"
                      onClick={() => {
                        setSelectedDoc(d);
                        setView('editor');
                      }}
                      title="Offerte öffnen"
                    >
                      {d.docNumber}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                          d.status === 'accepted'
                            ? 'bg-green-100 text-green-700'
                            : d.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : d.status === 'sent'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {d.status === 'draft' ? 'Entwurf' : d.status === 'sent' ? 'Versendet' : d.status}
                      </span>
                    </td>

                    <td className="p-4 truncate max-w-[200px]">{d.client.name || '—'}</td>
                    <td className="p-4 truncate max-w-[150px]">{d.title || '—'}</td>
                    <td className="p-4">CHF</td>

                    <td className="p-4 text-right tabular-nums">{formatMoney(d.totalNet).replace('CHF ', '')}</td>
                    <td className="p-4 text-right tabular-nums">{formatMoney(d.totalGross).replace('CHF ', '')}</td>

                    <td className="p-4">{d.status === 'sent' ? '✉️ Ja' : '—'}</td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedDoc(d);
                            setView('editor');
                          }}
                          className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500"
                          title="Bearbeiten"
                        >
                          ✏️
                        </button>
                        <button onClick={() => handleDuplicateDoc(d)} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500" title="Kopieren">
                          📋
                        </button>
                        <button onClick={() => alert('PDF Download...')} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500" title="PDF">
                          📄
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {paginatedDocs.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                      Keine Einträge gefunden
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Sum Footer Row */}
              <tfoot className="bg-zinc-50 border-t border-zinc-200">
                <tr>
                  <td colSpan={7} className="p-4 text-right uppercase text-xs text-zinc-500 tracking-widest">
                    Total (Seite)
                  </td>
                  <td className="p-4 text-right tabular-nums text-zinc-700 font-semibold">{formatMoney(totalNet).replace('CHF ', '')}</td>
                  <td className="p-4 text-right tabular-nums text-zinc-700 font-semibold">{formatMoney(totalGross).replace('CHF ', '')}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>

            {/* Controls: integriert unten in der Tabelle (nicht am Bildschirm) */}
            <div className="border-t border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Pagination + rows per page */}
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 text-xs font-bold"
                      title="Vorherige Seite"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 text-xs font-bold"
                      title="Nächste Seite"
                    >
                      &gt;
                    </button>
                  </div>

                  <select
                    className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                    value={rowsPerPage}
                    onChange={e => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    title="Einträge pro Seite"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>

                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    Einträge {filteredDocs.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}-
                    {Math.min(currentPage * rowsPerPage, filteredDocs.length)} von {filteredDocs.length}
                  </span>
                </div>

                {/* Right: Bulk Action */}
                <div className="flex items-center gap-3">
                  <div className="flex bg-zinc-50 border border-zinc-200 rounded-lg p-1">
                    <select
                      className="bg-transparent text-xs font-bold uppercase text-zinc-700 outline-none px-2 py-1 cursor-pointer"
                      value={bulkAction}
                      onChange={e => setBulkAction(e.target.value)}
                    >
                      <option value="">Aktion wählen...</option>
                      <option value="pdf_logo">Multi-PDF (mit Logo)</option>
                      <option value="pdf_plain">Multi-PDF (ohne Logo)</option>
                      <option value="email">Per Mail senden</option>
                      <option value="excel">Excel-Export</option>
                    </select>
                  </div>

                  <button
                    onClick={executeBulkAction}
                    disabled={selectedIds.size === 0 || !bulkAction}
                    className="bg-zinc-900 text-white px-5 py-2 rounded-lg font-black uppercase text-xs hover:bg-olive-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    GO
                  </button>

                  {selectedIds.size > 0 && <span className="text-xs text-olive-600 font-bold">{selectedIds.size} gewählt</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* kein Sticky Footer mehr */}
    </div>
  );
};

export default QuotesOverview;