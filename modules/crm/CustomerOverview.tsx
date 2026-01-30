import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { Customer } from '../../officeTypes';
import { Toast, ToastType } from '../../components/SharedUI';
import CustomerEditor from './CustomerEditor';
import { ModuleHeader, SearchToolbar } from '../../components/ui/Layouts';
import { DataDisplay, DataDisplayColumn } from '../../components/ui/DataDisplay';
import { Badge } from '../../components/ui/Badge';
import { BulkAction } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useTranslation } from '../../i18n/useTranslation';

interface CustomerOverviewProps {
    onBack: () => void;
    onSelect?: (customer: Customer) => void;
    initialEditMode?: boolean;
    editId?: number;
}

const CustomerOverview: React.FC<CustomerOverviewProps> = ({ onBack, onSelect, initialEditMode = false, editId }) => {
    const { t } = useTranslation();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // UI State
    const [toast, setToast] = useState<{ msg: string, type: ToastType } | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

    // Table State
    const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'lastName', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Edit Mode State
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    useEffect(() => { loadCustomers(); }, []);

    useEffect(() => {
        const init = async () => {
            if (editId) {
                const all = await db.customers.toArray();
                const target = all.find(c => c.id === editId);
                if (target) setEditingCustomer(target);
            } else if (initialEditMode && !editingCustomer) {
                const all = await db.customers.toArray();
                setCustomers(all);
                createNew(all);
            }
        };
        init();
    }, [initialEditMode, editId]);

    const loadCustomers = async () => {
        setCustomers(await db.customers.toArray());
    };

    const createNew = (currentList = customers) => {
        const maxNr = currentList.reduce((max, c) => {
            const num = parseInt(c.contactNr || '0', 10);
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        const nextNr = String(maxNr + 1).padStart(4, '0');

        setEditingCustomer({
            type: 'private',
            contactNr: nextNr,
            firstName: '',
            lastName: '',
            salutation: 'Herr',
            formOfAddress: 'Sie',
            address: { name: '', street: '', zip: '', city: '', country: 'Schweiz' },
            defaultDiscount: 0,
            language: 'Deutsch',
            correspondenceType: 'email'
        });
    };

    const handleSave = async (customer: Customer) => {
        let savedId;
        if (customer.id) {
            await db.customers.update(customer.id, customer);
            savedId = customer.id;
        } else {
            savedId = await db.customers.add(customer);
        }

        if (onSelect) {
            onSelect({ ...customer, id: savedId as number });
        } else {
            setEditingCustomer(null);
            loadCustomers();
            setToast({ msg: t('toast.saved'), type: 'success' });
        }
    };

    const handleExport = () => {
        const headers = ['Nr', 'Typ', 'Firma', 'Vorname', 'Nachname', 'Strasse', 'PLZ', 'Ort', 'Email', 'Telefon'];
        const rows = customers.map(c => [
            c.contactNr, c.type, c.companyName, c.firstName, c.lastName,
            c.address.street, c.address.zip, c.address.city, c.address.email, c.address.phone
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';'));

        const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Kontakte_Export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ msg: 'Export heruntergeladen', type: 'success' });
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const filteredCustomers = useMemo(() => {
        let data = customers.filter(c => {
            const name = (c.lastName + c.firstName + (c.companyName || '')).toLowerCase();
            const search = searchTerm.toLowerCase();
            const matchesSearch = name.includes(search) || c.contactNr?.includes(search);
            const matchesType = filterType === 'all' || c.type === filterType;
            return matchesSearch && matchesType;
        });

        // Sort
        return data.sort((a: any, b: any) => {
            let aVal = sortConfig.key === 'name'
                ? (a.type === 'business' ? a.companyName : a.lastName)
                : a[sortConfig.key];
            let bVal = sortConfig.key === 'name'
                ? (b.type === 'business' ? b.companyName : b.lastName)
                : b[sortConfig.key];

            aVal = (aVal || '').toLowerCase();
            bVal = (bVal || '').toLowerCase();

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [customers, searchTerm, filterType, sortConfig]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredCustomers.slice(start, start + rowsPerPage);
    }, [filteredCustomers, currentPage, rowsPerPage]);

    // Column definitions
    const columns: DataDisplayColumn<Customer>[] = [
        {
            key: 'contactNr',
            label: '#',
            width: '80px',
            cardPosition: 'meta',
            render: (c) => <span className="font-mono font-bold text-zinc-500">#{c.contactNr || c.id}</span>
        },
        {
            key: 'name',
            label: t('common.name'),
            sortable: true,
            cardPosition: 'title',
            render: (c) => (
                <div>
                    <div className="font-bold text-zinc-900">
                        {c.type === 'business' ? c.companyName : `${c.firstName} ${c.lastName}`}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                        {c.address.street}, {c.address.zip} {c.address.city}
                    </div>
                </div>
            )
        },
        {
            key: 'type',
            label: t('crm.customerType'),
            cardPosition: 'badge',
            render: (c) => (
                <Badge label={c.type === 'business' ? t('crm.business') : t('crm.private')} />
            )
        },
        {
            key: 'email',
            label: t('crm.email'),
            hideOnCard: true,
            render: (c) => <span className="text-zinc-600">{c.address.email || '—'}</span>
        },
        {
            key: 'phone',
            label: t('crm.phone'),
            hideOnCard: true,
            render: (c) => <span className="text-zinc-600">{c.address.phone || '—'}</span>
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            width: '50px',
            hideOnCard: true,
            render: (c) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); }}
                    className="p-2 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                >
                    ✏️
                </button>
            )
        }
    ];

    const bulkActions: BulkAction[] = [
        { label: t('common.delete'), onClick: () => alert('Bulk Delete not implemented'), variant: 'danger' },
        { label: 'Export CSV', onClick: handleExport }
    ];

    if (editingCustomer) {
        return (
            <CustomerEditor
                initialCustomer={editingCustomer}
                onSave={handleSave}
                onCancel={() => { if (onSelect) onBack(); else setEditingCustomer(null); }}
            />
        );
    }

    return (
        <div className={`flex flex-col h-full bg-slate-50 ${onSelect ? 'p-4' : ''}`}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <ModuleHeader
                title={t('crm.title')}
                subtitle={t('crm.subtitle')}
                onBack={onBack}
                stats={[{ value: customers.length, label: t('common.entries') }]}
                actions={
                    <Button variant="outline" onClick={handleExport} label="Export" icon="⬇" />
                }
            >
                <div className="mt-4">
                    <SearchToolbar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        placeholder={t('common.search') + '...'}
                        onFilterClick={() => setShowFilters(!showFilters)}
                        filterActive={showFilters}
                        onNewClick={() => createNew(customers)}
                        newLabel={t('common.create')}
                    />
                </div>

                {showFilters && (
                    <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">{t('crm.customerType')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {['all', 'private', 'business'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFilterType(type)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${filterType === type ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300'}`}
                                        >
                                            {type === 'all' ? t('common.all') : type === 'private' ? t('crm.private') : t('crm.business')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </ModuleHeader>

            <div className="flex-1 p-4 md:p-8 overflow-auto">
                <DataDisplay
                    columns={columns}
                    data={paginatedData}
                    rowKey="id"
                    onRowClick={(c) => onSelect ? onSelect(c) : setEditingCustomer(c)}
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
                    totalPages={Math.ceil(filteredCustomers.length / rowsPerPage)}
                    onPageChange={setCurrentPage}
                    totalItems={filteredCustomers.length}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={setRowsPerPage}
                    emptyMessage={t('common.noEntries')}
                    bulkActions={bulkActions}
                />
            </div>

            {/* Mobile FAB */}
            <button
                onClick={() => createNew(customers)}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90"
            >
                <span className="text-2xl">+</span>
            </button>
        </div>
    );
};

export default CustomerOverview;
