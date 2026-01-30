import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../../db';
import { OfficeDocument, Customer, OfficeAddress, SupportedCurrency } from '../../../officeTypes';
import { Toast, ToastType, formatDate } from '../../../components/SharedUI';
import QuoteEditor from './QuoteEditor';
import { ModuleHeader, SearchToolbar } from '../../../components/ui/Layouts';
import { DataDisplay, DataDisplayColumn } from '../../../components/ui/DataDisplay';
import { Badge } from '../../../components/ui/Badge';
import { BulkAction } from '../../../components/ui/Table';
import { useTranslation } from '../../../i18n/useTranslation';
import {
    canDeleteDocument,
    addAuditEvent,
    AUDIT_EVENTS,
    initializeDocumentWithAudit
} from '../../../services/documentGuardService';
import { calculateDocumentTotals, formatMoney } from '../../../services/calculationService';

interface OffersProps {
    onBack: () => void;
    preselectedCustomerId?: number;
    onNavigate?: (module: string) => void;
}

const QuotesOverview: React.FC<OffersProps> = ({ onBack, preselectedCustomerId, onNavigate }) => {
    const { t } = useTranslation();

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

    // Module navigation options for dropdown
    const moduleOptions = onNavigate ? [
        { label: t('sales.quotes'), onClick: () => { } },
        { label: t('sales.orders'), onClick: () => onNavigate('orders') },
        { label: t('sales.invoices'), onClick: () => onNavigate('invoices') },
        { label: t('sales.dunning'), onClick: () => onNavigate('dunning') }
    ] : undefined;

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

        newDoc = initializeDocumentWithAudit(newDoc, settings?.currentUser?.name);

        setSelectedDoc(newDoc);
        setView('editor');
    };

    const handleSaveDoc = async (doc: OfficeDocument) => {
        if (doc.id) await db.documents.update(doc.id, doc as any);
        else await db.documents.add(doc);
        await loadData();
        setToast({ msg: t('documents.documentSaved'), type: 'success' });
        setView('list');
        setSelectedDoc(null);
    };

    const handleDeleteDoc = async (id: number) => {
        const doc = await db.documents.get(id);
        if (!doc) {
            setToast({ msg: t('errors.notFound'), type: 'error' });
            return;
        }

        const canDelete = canDeleteDocument(doc);
        if (!canDelete.allowed) {
            setToast({ msg: canDelete.reason || t('documents.cannotDelete'), type: 'error' });
            return;
        }

        if (!confirm(t('confirm.deleteDocument', { docNumber: doc.docNumber }))) {
            return;
        }

        await db.documents.delete(id);
        await loadData();
        setToast({ msg: t('documents.documentDeleted'), type: 'info' });
        setView('list');
        setSelectedDoc(null);
    };

    const handleConvert = async (doc: OfficeDocument) => {
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
            totalNet: totals.netTotal,
            totalTax: totals.vatTotal,
            totalGross: totals.grossTotal
        };

        invoice = addAuditEvent(invoice, AUDIT_EVENTS.CONVERTED, settings?.currentUser?.name, {
            sourceDocNumber: doc.docNumber,
            sourceDocId: doc.id
        });

        if (doc.id && doc.status === 'sent') {
            const acceptedQuote = addAuditEvent(doc, AUDIT_EVENTS.STATUS_CHANGED, settings?.currentUser?.name, {
                from: doc.status, to: 'accepted', reason: 'Converted to invoice'
            });
            await db.documents.update(doc.id, { ...acceptedQuote, status: 'accepted', acceptedAt: new Date().toISOString() });
        } else if (!doc.id) {
            await db.documents.add(doc);
        }

        await db.documents.add(invoice);
        await loadData();
        setToast({ msg: t('sales.convertToInvoice') + ' ✓', type: 'success' });
        setView('list');
        setSelectedDoc(null);
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const filteredDocs = useMemo(() => {
        let data = [...docs];
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            data = data.filter(d =>
                d.docNumber.toLowerCase().includes(s) ||
                d.client.name.toLowerCase().includes(s) ||
                (d.title || '').toLowerCase().includes(s)
            );
        }
        if (activeTab === 'open') data = data.filter(d => ['draft', 'sent'].includes(d.status));
        if (activeTab === 'done') data = data.filter(d => ['accepted', 'paid', 'rejected'].includes(d.status));

        return data.sort((a: any, b: any) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
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

    // Column definitions with card positioning for responsive display
    const columns: DataDisplayColumn<OfficeDocument>[] = [
        {
            key: 'docNumber',
            label: t('common.number'),
            sortable: true,
            cardPosition: 'meta',
            render: (d) => <span className="font-mono font-bold text-zinc-700">{d.docNumber}</span>
        },
        {
            key: 'date',
            label: t('common.date'),
            sortable: true,
            width: '100px',
            cardPosition: 'meta',
            render: (d) => formatDate(d.date)
        },
        {
            key: 'client.name',
            label: t('common.customer'),
            sortable: true,
            cardPosition: 'title',
            render: (d) => (
                <div>
                    <div className="font-bold text-zinc-900">{d.client.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">{d.title || '—'}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: t('common.status'),
            cardPosition: 'badge',
            render: (d) => <Badge label={t(`status.${d.status}`)} />
        },
        {
            key: 'totalGross',
            label: t('common.amount'),
            align: 'right',
            sortable: true,
            cardPosition: 'value',
            render: (d) => <span className="font-bold">{formatMoney(d.totalGross, d.currency || 'CHF')}</span>
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            width: '50px',
            hideOnCard: true,
            render: (d) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); setView('editor'); }}
                    className="p-2 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                >
                    ✏️
                </button>
            )
        }
    ];

    const Tabs = (
        <div className="flex bg-zinc-100 p-1 rounded-xl mr-auto">
            {[
                { id: 'all', l: t('common.all') },
                { id: 'open', l: t('common.open') },
                { id: 'done', l: t('common.done') }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === tab.id ? 'bg-white shadow text-black' : 'text-zinc-500'}`}
                >
                    {tab.l}
                </button>
            ))}
        </div>
    );

    const bulkActions: BulkAction[] = [
        { label: t('common.delete'), onClick: () => alert('Bulk Delete not implemented'), variant: 'danger' },
        { label: `${t('common.status')}: ${t('status.sent')}`, onClick: () => alert('Bulk Status not implemented') }
    ];

    // Editor View
    if (view === 'editor' && selectedDoc) {
        return (
            <QuoteEditor
                initialDoc={selectedDoc}
                customers={customers}
                projects={[]}
                products={[]}
                settings={settings}
                onSave={handleSaveDoc}
                onCancel={() => { setView('list'); setSelectedDoc(null); }}
                onConvert={handleConvert}
                onDelete={handleDeleteDoc}
            />
        );
    }

    // List View with responsive DataDisplay (Table on desktop, Cards on mobile)
    return (
        <div className="h-full flex flex-col bg-slate-50">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <ModuleHeader
                title={t('sales.quotes')}
                subtitle={t('sales.quotesSubtitle')}
                onBack={onBack}
                moduleSelection={moduleOptions}
                stats={[{ value: filteredDocs.length, label: t('sales.documents') }]}
            >
                <div className="mt-4">
                    <SearchToolbar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        placeholder={t('common.search') + '...'}
                        startAction={Tabs}
                        onNewClick={() => handleCreateNew()}
                        newLabel={t('documents.quote')}
                        onFilterClick={() => setShowFilters(!showFilters)}
                        filterActive={showFilters}
                    />
                </div>
            </ModuleHeader>

            <div className="flex-1 p-4 md:p-8 overflow-auto">
                <DataDisplay
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
                    emptyMessage={t('common.noEntries')}
                    bulkActions={bulkActions}
                />
            </div>
        </div>
    );
};

export default QuotesOverview;
