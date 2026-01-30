import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../db';
import { OfficeDocument, SupportedCurrency } from '../../../officeTypes';
import { Toast, ToastType, formatDate } from '../../../components/SharedUI';
import DocumentEditor from './DocumentEditor';
import ExpenseManager from '../../expenses/ExpenseManager';
import { ModuleHeader, SearchToolbar } from '../../../components/ui/Layouts';
import { DataDisplay, DataDisplayColumn } from '../../../components/ui/DataDisplay';
import { Badge } from '../../../components/ui/Badge';
import { BulkAction } from '../../../components/ui/Table';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatMoney } from '../../../services/calculationService';

interface InvoiceOverviewProps {
    onBack: () => void;
    preselectedDocId?: number;
    preselectedCustomerId?: number;
    onNavigate?: (module: string) => void;
}

type ListTab = 'invoices' | 'dunning' | 'expenses';

const InvoiceOverview: React.FC<InvoiceOverviewProps> = ({ onBack, preselectedDocId, preselectedCustomerId, onNavigate }) => {
    const { t } = useTranslation();

    const [listTab, setListTab] = useState<ListTab>('invoices');
    const [docs, setDocs] = useState<OfficeDocument[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExpenseCreating, setIsExpenseCreating] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [toast, setToast] = useState<{ msg: string, type: ToastType } | null>(null);

    // Editor State
    const [selectedDoc, setSelectedDoc] = useState<OfficeDocument | null>(null);

    // Table State
    const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => { loadData(); }, []);

    // Deep Link Handling
    useEffect(() => {
        const handleDeepLinks = async () => {
            if (preselectedDocId && !selectedDoc) {
                const target = await db.documents.get(preselectedDocId);
                if (target) setSelectedDoc(target);
            } else if (preselectedCustomerId && !selectedDoc) {
                setListTab('invoices');
            }
        };
        handleDeepLinks();
    }, [preselectedDocId, preselectedCustomerId]);

    const loadData = async () => {
        const [d, s] = await Promise.all([
            db.documents.orderBy('id').reverse().toArray(),
            db.settings.toArray()
        ]);
        setDocs(d);
        setSettings(s[0]);
    };

    // Module navigation
    const moduleOptions = onNavigate ? [
        { label: t('sales.quotes'), onClick: () => onNavigate('quotes') },
        { label: t('sales.orders'), onClick: () => onNavigate('orders') },
        { label: t('sales.invoices'), onClick: () => { } },
        { label: t('sales.dunning'), onClick: () => onNavigate('dunning') }
    ] : undefined;

    const createNewInvoice = () => {
        const year = new Date().getFullYear();
        const num = String(Date.now()).slice(-4);
        const defaultCurrency: SupportedCurrency = settings?.defaultCurrency || 'CHF';

        const newDoc: OfficeDocument = {
            docNumber: `R-${year}-${num}`,
            type: 'invoice',
            status: 'draft',
            date: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            client: { name: '', street: '', zip: '', city: '' },
            items: [],
            totalNet: 0, totalTax: 0, totalGross: 0, dunningLevel: 0,
            currency: defaultCurrency,
            notes: settings?.layouts?.invoice?.introText || '',
            footer: settings?.layouts?.invoice?.outroText || ''
        };
        setSelectedDoc(newDoc);
    };

    const handleExport = () => {
        const exportDocs = filteredDocs;
        const headers = ['Nr', 'Typ', 'Kunde', 'Datum', 'Status', 'Total Netto', 'Total Brutto'];
        const rows = exportDocs.map(d => [d.docNumber, d.type, d.client.name, d.date, d.status, d.totalNet, d.totalGross]
            .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';'));
        const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Rechnungen_Export.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ msg: 'Export heruntergeladen', type: 'success' });
    };

    // Filter Logic
    const filteredDocs = useMemo(() => {
        let data = docs.filter(d => {
            const matchesSearch = d.client.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.docNumber.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (listTab === 'invoices') return d.type === 'invoice' && (filterStatus === 'all' || d.status === filterStatus);
            if (listTab === 'dunning') return d.type === 'invoice' && (d.status === 'overdue' || (d.dunningLevel || 0) > 0);

            return true;
        });

        // Sort
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
    }, [docs, searchTerm, listTab, filterStatus, sortConfig]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredDocs.slice(start, start + rowsPerPage);
    }, [filteredDocs, currentPage, rowsPerPage]);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    // Columns for responsive DataDisplay
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
                    <div className="text-[10px] text-zinc-400">{d.items.length} {t('documents.positions')}</div>
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
                    onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); }}
                    className="p-2 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                >
                    ✏️
                </button>
            )
        }
    ];

    const bulkActions: BulkAction[] = [
        { label: t('common.delete'), onClick: () => alert('Bulk Delete not implemented'), variant: 'danger' },
        { label: `${t('common.status')}: ${t('status.paid')}`, onClick: () => alert('Bulk Status not implemented') },
        { label: 'Export CSV', onClick: handleExport }
    ];

    // Tab Buttons
    const TabButton = ({ id, label, icon }: { id: ListTab, label: string, icon: string }) => (
        <button
            onClick={() => setListTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${listTab === id ? 'border-olive-600 bg-olive-50 text-olive-700' : 'border-transparent text-zinc-400 hover:bg-zinc-50'}`}
        >
            <span className="text-lg">{icon}</span>
            <span className={`font-bold uppercase text-xs ${listTab === id ? 'inline' : 'hidden md:inline'}`}>{label}</span>
        </button>
    );

    // Render Editor
    if (selectedDoc) {
        return (
            <DocumentEditor
                initialDoc={selectedDoc}
                onBack={() => { setSelectedDoc(null); loadData(); if (preselectedDocId) onBack(); }}
                onSave={async (doc) => {
                    if (doc.id) await db.documents.update(doc.id, doc as any);
                    else await db.documents.add(doc);
                    loadData();
                    setSelectedDoc(null);
                    setToast({ msg: t('documents.documentSaved'), type: 'success' });
                }}
            />
        );
    }

    if (preselectedCustomerId && !selectedDoc && listTab === 'invoices') {
        return (
            <DocumentEditor
                initialDoc={null as any}
                preselectedCustomerId={preselectedCustomerId}
                onBack={() => onBack()}
                onSave={async (doc) => {
                    if (doc.id) await db.documents.update(doc.id, doc as any);
                    else await db.documents.add(doc);
                    onBack();
                }}
            />
        );
    }

    const getNewButtonLabel = () => {
        switch (listTab) {
            case 'invoices': return t('documents.invoice');
            case 'dunning': return t('sales.dunning');
            case 'expenses': return t('purchasing.expenses');
        }
    };

    const Tabs = (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mr-auto">
            <TabButton id="invoices" label={t('sales.invoices')} icon="📄" />
            <TabButton id="dunning" label={t('sales.dunning')} icon="🔔" />
            <TabButton id="expenses" label={t('purchasing.expenses')} icon="💸" />
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <ModuleHeader
                title={t('sales.invoices')}
                subtitle={t('sales.invoicesSubtitle')}
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
                        onNewClick={() => {
                            if (listTab === 'expenses') setIsExpenseCreating(true);
                            else createNewInvoice();
                        }}
                        newLabel={getNewButtonLabel()}
                        onFilterClick={listTab === 'invoices' ? () => setShowFilters(!showFilters) : undefined}
                        filterActive={showFilters}
                    />
                </div>

                {/* Filter Panel */}
                {showFilters && listTab === 'invoices' && (
                    <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">{t('common.status')} {t('common.filter')}</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${filterStatus === s ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300'}`}
                                >
                                    {s === 'all' ? t('common.all') : t(`status.${s}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </ModuleHeader>

            <div className="flex-1 p-4 md:p-8 overflow-auto">
                {listTab === 'expenses' ? (
                    <ExpenseManager isCreating={isExpenseCreating} onCloseCreate={() => setIsExpenseCreating(false)} searchTerm={searchTerm} />
                ) : (
                    <DataDisplay
                        columns={columns}
                        data={paginatedData}
                        rowKey="id"
                        onRowClick={(d) => setSelectedDoc(d)}
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
                )}
            </div>

            {/* Mobile FAB */}
            <button
                onClick={() => {
                    if (listTab === 'expenses') setIsExpenseCreating(true);
                    else createNewInvoice();
                }}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90"
            >
                <span className="text-2xl">+</span>
            </button>
        </div>
    );
};

export default InvoiceOverview;
