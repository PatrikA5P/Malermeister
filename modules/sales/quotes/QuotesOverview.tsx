
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../../db';
import { OfficeDocument, Customer, Project, Product, OfficeAddress } from '../../../officeTypes';
import { Toast, ToastType, formatMoney, formatDate } from '../../../components/SharedUI';
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
      currency: 'CHF',
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
    setCurrentPage(p => Math.min(Math.max(1, p), totalPages));
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

  // --- Export ---
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
      setToast({ msg: 'Export fehlgeschlagen', type: 'error' });
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

  // Remove the header here because the SalesManager handles the global module header
  // We only keep the specific controls for this sub-module
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="pt-2 px-4 md:px-8 bg-slate-50 border-b border-zinc-200">
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
              <span className="hidden md:inline">Filter</span>
              <span>⚡</span>
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
             {/* ... (Same filters as original) ... */}
             <div className="space-y-1"><label className="text-[9px] font-bold uppercase text-zinc-400">Nr.</label><input className="w-full border p-2 rounded text-sm" value={filters.docNumber} onChange={e => setFilters({ ...filters, docNumber: e.target.value })} placeholder="O-202X..." /></div>
             <div className="space-y-1"><label className="text-[9px] font-bold uppercase text-zinc-400">Titel</label><input className="w-full border p-2 rounded text-sm" value={filters.title} onChange={e => setFilters({ ...filters, title: e.target.value })} /></div>
             <div className="space-y-1"><label className="text-[9px] font-bold uppercase text-zinc-400">Status</label><select className="w-full border p-2 rounded text-sm bg-white" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">Alle</option><option value="draft">Entwurf</option><option value="sent">Versendet</option><option value="accepted">Akzeptiert</option></select></div>
             <div className="flex items-end"><button onClick={() => setShowFilters(false)} className="w-full bg-zinc-100 p-2 rounded text-xs font-bold uppercase">Schliessen</button></div>
          </div>
        )}
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 md:px-8 pb-10 pt-4">
          <div className="space-y-3 md:hidden">
            {paginatedDocs.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDoc(d);
                  setView('editor');
                }}
                className="w-full text-left"
              >
                <div className="relative p-4 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-olive-400 active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-base truncate pr-2 text-zinc-900">{d.client?.name || '—'}</h4>
                    <p className="font-bold text-base whitespace-nowrap text-zinc-900">{formatMoney(d.totalGross)}</p>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mb-3 truncate">
                    {d.title || 'Ohne Titel'} • {d.items?.length ?? 0} Pos.
                  </p>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-bold text-zinc-800 tracking-wider">{d.docNumber}</span>
                      <span className="text-zinc-300">•</span>
                      <span className="text-zinc-500">{formatDate(d.date)}</span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                        d.status === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : d.status === 'sent'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {paginatedDocs.length === 0 && (
              <div className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs bg-white border border-zinc-200 rounded-2xl">
                Keine Einträge gefunden
              </div>
            )}
          </div>

          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                <tr>
                  <th className="p-4 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded accent-olive-600 cursor-pointer" onChange={handleSelectAll} checked={paginatedDocs.length > 0 && selectedIds.size === paginatedDocs.length} /></th>
                  {[{ k: 'date', l: 'Datum' }, { k: 'docNumber', l: 'Nr.' }, { k: 'status', l: 'Status' }, { k: 'client.name', l: 'Kunde' }, { k: 'title', l: 'Titel' }, { k: 'totalGross', l: 'Brutto', r: true }, { k: 'actions', l: '', r: true }].map(col => (
                    <th key={col.k} onClick={() => col.k !== 'actions' && handleSort(col.k)} className={`p-4 text-[10px] font-bold uppercase text-zinc-500 tracking-wider cursor-pointer ${col.r ? 'text-right' : ''}`}>{col.l} {sortConfig.key === col.k && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700 font-normal">
                {paginatedDocs.map(d => (
                  <tr key={d.id} className={`group hover:bg-olive-50/20 transition-colors ${selectedIds.has(d.id!) ? 'bg-olive-50/40' : ''}`}>
                    <td className="p-4 text-center"><input type="checkbox" className="w-4 h-4 rounded accent-olive-600 cursor-pointer" checked={selectedIds.has(d.id!)} onChange={() => handleSelectRow(d.id!)} /></td>
                    <td className="p-4 tabular-nums">{formatDate(d.date)}</td>
                    <td className="p-4 font-bold text-zinc-900 cursor-pointer" onClick={() => { setSelectedDoc(d); setView('editor'); }}>{d.docNumber}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${d.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>{d.status}</span></td>
                    <td className="p-4 truncate max-w-[200px]">{d.client.name || '—'}</td>
                    <td className="p-4 truncate max-w-[150px]">{d.title || '—'}</td>
                    <td className="p-4 text-right tabular-nums">{formatMoney(d.totalGross).replace('CHF ', '')}</td>
                    <td className="p-4 text-right"><button onClick={() => { setSelectedDoc(d); setView('editor'); }} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500">✏️</button></td>
                  </tr>
                ))}
                {paginatedDocs.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Keine Einträge gefunden</td></tr>}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default QuotesOverview;
