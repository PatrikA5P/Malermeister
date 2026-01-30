
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../../db';
import { OfficeDocument, Customer, Project, Product, OfficeAddress, SupportedCurrency } from '../../../officeTypes';
import { Toast, ToastType, formatMoney, formatDate } from '../../../components/SharedUI';
import QuoteEditor from './QuoteEditor';
import { ModuleHeader, SearchToolbar } from '../../../components/ui/Layouts';
import { Table, TableColumn, BulkAction } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { MultiActionButton } from '../../../components/ui/MultiActionButton';
import {
  canDeleteDocument,
  addAuditEvent,
  AUDIT_EVENTS,
  initializeDocumentWithAudit
} from '../../../services/documentGuardService';
import { calculateDocumentTotals } from '../../../services/calculationService';

interface OffersProps {
  onBack: () => void;
  preselectedCustomerId?: number;
}

const QuotesOverview: React.FC<OffersProps> = ({ onBack, preselectedCustomerId }) => {
  // Data
  const [docs, setDocs] = useState<OfficeDocument[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // View & UI
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [selectedDoc, setSelectedDoc] = useState<OfficeDocument | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'done'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Table State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [d, c, s] = await Promise.all([
      db.documents.where('type').equals('quote').toArray(),
      db.customers.toArray(),
      db.settings.toArray()
    ]);
    setDocs(d);
    setCustomers(c);
    setSettings(s[0]);
  };

  // Deep Link
  useEffect(() => {
    if (preselectedCustomerId && !selectedDoc && customers.length > 0 && view === 'list') {
      handleCreateNew(preselectedCustomerId);
    }
  }, [preselectedCustomerId, customers]);

  // Actions
  const handleCreateNew = (customerId?: number) => {
    const year = new Date().getFullYear();
    const num = String(Date.now()).slice(-4);
    let initialClient: OfficeAddress = { name: '', street: '', zip: '', city: '' };

    if (customerId) {
      const c = customers.find(x => x.id === customerId);
      if (c) initialClient = {
          name: c.type === 'business' ? c.companyName! : `${c.firstName} ${c.lastName}`,
          street: c.address.street, zip: c.address.zip, city: c.address.city,
          email: c.address.email, phone: c.address.phone, website: c.address.website
      };
    }

    // Use default currency from settings
    const defaultCurrency: SupportedCurrency = settings?.defaultCurrency || 'CHF';

    let newDoc: OfficeDocument = {
      docNumber: `O-${year}-${num}`,
      type: 'quote',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      client: initialClient,
      customerId,
      items: [],
      totalNet: 0, totalTax: 0, totalGross: 0, dunningLevel: 0,
      currency: defaultCurrency,
      notes: settings?.layouts?.quote?.introText || '',
      footer: settings?.layouts?.quote?.outroText || ''
    };

    // Initialize with audit trail
    newDoc = initializeDocumentWithAudit(newDoc, settings?.currentUser?.name);

    setSelectedDoc(newDoc);
    setView('editor');
  };

  const handleSaveDoc = async (doc: OfficeDocument) => {
    if (doc.id) await db.documents.update(doc.id, doc as any);
    else await db.documents.add(doc);
    await loadData();
    setToast({ msg: 'Offerte gespeichert', type: 'success' });
    setView('list');
    setSelectedDoc(null);
  };

  const handleDeleteDoc = async (id: number) => {
    // Fetch the document first to check if deletion is allowed
    const doc = await db.documents.get(id);
    if (!doc) {
      setToast({ msg: 'Dokument nicht gefunden', type: 'error' });
      return;
    }

    // Check if deletion is allowed (GeBüV compliance)
    const canDelete = canDeleteDocument(doc);
    if (!canDelete.allowed) {
      setToast({ msg: canDelete.reason || 'Löschen nicht erlaubt', type: 'error' });
      return;
    }

    // Confirm deletion
    if (!confirm(`Offerte ${doc.docNumber} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    await db.documents.delete(id);
    await loadData();
    setToast({ msg: 'Offerte gelöscht', type: 'info' });
    setView('list');
    setSelectedDoc(null);
  };

  const handleConvert = async (doc: OfficeDocument) => {
    // Recalculate totals with proper currency rounding
    const currency = (doc.currency as SupportedCurrency) || settings?.defaultCurrency || 'CHF';
    const defaultVatRate = settings?.vatRates?.find((r: any) => r.code === 'N')?.rate || 8.1;
    const totals = calculateDocumentTotals(doc.items, defaultVatRate, currency);

    let invoice: OfficeDocument = {
      ...doc,
      id: undefined,
      type: 'invoice',
      status: 'draft',
      docNumber: doc.docNumber.replace('O-', 'R-'),
      date: new Date().toISOString().split('T')[0],
      notes: settings?.layouts?.invoice?.introText,
      footer: settings?.layouts?.invoice?.outroText,
      relatedQuoteId: doc.id,
      // Update totals with properly rounded values
      totalNet: totals.netTotal,
      totalTax: totals.vatTotal,
      totalGross: totals.grossTotal
    };

    // Add audit trail for conversion
    invoice = addAuditEvent(invoice, AUDIT_EVENTS.CONVERTED, settings?.currentUser?.name, {
      sourceDocNumber: doc.docNumber,
      sourceDocId: doc.id
    });

    // Also mark the quote as accepted if not already
    if (doc.id && doc.status === 'sent') {
      const acceptedQuote = addAuditEvent(doc, AUDIT_EVENTS.STATUS_CHANGED, settings?.currentUser?.name, {
        from: doc.status,
        to: 'accepted',
        reason: 'Converted to invoice'
      });
      await db.documents.update(doc.id, { ...acceptedQuote, status: 'accepted', acceptedAt: new Date().toISOString() });
    } else if (!doc.id) {
      await db.documents.add(doc);
    }

    await db.documents.add(invoice);
    await loadData();
    setToast({ msg: 'Rechnung erstellt!', type: 'success' });
    setView('list');
    setSelectedDoc(null);
  };

  // Logic
  const handleSort = (key: string) => {
      setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredDocs = useMemo(() => {
      let data = [...docs];
      // Search
      if (searchTerm) {
          const s = searchTerm.toLowerCase();
          data = data.filter(d => 
              d.docNumber.toLowerCase().includes(s) || 
              d.client.name.toLowerCase().includes(s) || 
              (d.title || '').toLowerCase().includes(s)
          );
      }
      // Tab
      if (activeTab === 'open') data = data.filter(d => ['draft', 'sent'].includes(d.status));
      if (activeTab === 'done') data = data.filter(d => ['accepted', 'paid', 'rejected'].includes(d.status));

      // Sort
      return data.sort((a: any, b: any) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          // Handle nested keys like client.name
          if (sortConfig.key === 'client.name') {
              aVal = a.client.name; bVal = b.client.name;
          }
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [docs, searchTerm, activeTab, sortConfig]);

  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return filteredDocs.slice(start, start + rowsPerPage);
  }, [filteredDocs, currentPage, rowsPerPage]);

  const columns: TableColumn<OfficeDocument>[] = [
      { key: 'docNumber', label: 'Nummer', sortable: true, render: (d) => <span className="font-mono font-bold text-zinc-700">{d.docNumber}</span> },
      { key: 'date', label: 'Datum', sortable: true, width: '100px', render: (d) => formatDate(d.date) },
      { key: 'client.name', label: 'Kunde', sortable: true, render: (d) => (
          <div>
              <div className="font-bold text-zinc-900">{d.client.name}</div>
              <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">{d.title || '—'}</div>
          </div>
      )},
      { key: 'status', label: 'Status', render: (d) => <Badge label={d.status} /> },
      { key: 'totalGross', label: 'Betrag', align: 'right', sortable: true, render: (d) => <span className="font-bold">{formatMoney(d.totalGross)}</span> },
      { key: 'actions', label: '', align: 'right', width: '50px', render: (d) => (
          <button onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); setView('editor'); }} className="p-2 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black">✏️</button>
      )}
  ];

  const Tabs = (
      <div className="flex bg-zinc-100 p-1 rounded-xl mr-auto">
        {[{id:'all',l:'Alle'},{id:'open',l:'Offen'},{id:'done',l:'Erledigt'}].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === t.id ? 'bg-white shadow text-black' : 'text-zinc-500'}`}>{t.l}</button>
        ))}
      </div>
  );

  const bulkActions: BulkAction[] = [
      { label: 'Löschen', onClick: () => alert('Bulk Delete not implemented'), variant: 'danger' },
      { label: 'Status: Gesendet', onClick: () => alert('Bulk Status not implemented') }
  ];

  // Render
  if (view === 'editor' && selectedDoc) {
      return (
          <QuoteEditor 
              initialDoc={selectedDoc}
              customers={customers}
              projects={[]} // Passed empty as not strictly needed for this edit flow context, or load if needed
              products={[]} // Loaded inside Editor via ProductManager normally, or pass down
              settings={settings}
              onSave={handleSaveDoc}
              onCancel={() => { setView('list'); setSelectedDoc(null); }}
              onConvert={handleConvert}
              onDelete={handleDeleteDoc}
          />
      );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        
        <ModuleHeader 
            title="Offerten" 
            subtitle="Angebotswesen" 
            onBack={onBack}
            stats={[{ value: filteredDocs.length, label: 'Dokumente' }]}
        >
            <div className="mt-4">
                <SearchToolbar 
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    startAction={Tabs}
                    onNewClick={() => handleCreateNew()}
                    newLabel="Offerte"
                    onFilterClick={() => setShowFilters(!showFilters)}
                    filterActive={showFilters}
                />
            </div>
        </ModuleHeader>

        <div className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
            <Table 
                columns={columns}
                data={paginatedData}
                rowKey="id"
                onRowClick={(d) => { setSelectedDoc(d); setView('editor'); }}
                sortConfig={sortConfig}
                onSort={handleSort}
                selectedIds={selectedIds}
                onSelectRow={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                }}
                onSelectAll={(ids) => setSelectedIds(new Set(ids))}
                currentPage={currentPage}
                totalPages={Math.ceil(filteredDocs.length / rowsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredDocs.length}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
                bulkActions={bulkActions}
            />
        </div>
    </div>
  );
};

export default QuotesOverview;
