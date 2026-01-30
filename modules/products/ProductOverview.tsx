import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { Product } from '../../officeTypes';
import { Toast, ToastType } from '../../components/SharedUI';
import ProductEditor from './ProductEditor';
import { ModuleHeader, SearchToolbar } from '../../components/ui/Layouts';
import { DataDisplay, DataDisplayColumn } from '../../components/ui/DataDisplay';
import { Badge } from '../../components/ui/Badge';
import { BulkAction } from '../../components/ui/Table';
import { useTranslation } from '../../i18n/useTranslation';
import { formatMoney } from '../../services/calculationService';

const ProductOverview: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();

    // Data
    const [products, setProducts] = useState<Product[]>([]);

    // UI
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'material' | 'service'>('all');
    const [toast, setToast] = useState<{ msg: string, type: ToastType } | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Table State
    const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setProducts(await db.products.toArray());
    };

    const createNew = () => {
        setEditingProduct({
            code: '',
            name: '',
            type: 'material',
            unit: 'Stk',
            price: 0,
            purchasePrice: 0,
            accountId: 3000,
            currency: 'CHF'
        });
    };

    const handleSave = async (product: Product) => {
        if (product.id) await db.products.update(product.id, product as any);
        else await db.products.add(product);
        setEditingProduct(null);
        loadData();
        setToast({ msg: t('toast.saved'), type: 'success' });
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Filter & Sort Logic
    const filteredProducts = useMemo(() => {
        return products
            .filter(p => {
                const matchesSearch =
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.code.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesTab = activeTab === 'all' || p.type === activeTab;
                return matchesSearch && matchesTab;
            })
            .sort((a: any, b: any) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [products, searchTerm, activeTab, sortConfig]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredProducts.slice(start, start + rowsPerPage);
    }, [filteredProducts, currentPage, rowsPerPage]);

    // Columns
    const columns: DataDisplayColumn<Product>[] = [
        {
            key: 'code',
            label: t('products.articleNumber'),
            sortable: true,
            width: '100px',
            cardPosition: 'meta',
            render: (p) => <span className="font-mono font-bold text-zinc-500">{p.code}</span>
        },
        {
            key: 'name',
            label: t('common.name'),
            sortable: true,
            cardPosition: 'title',
            render: (p) => (
                <div>
                    <div className="font-bold text-zinc-900">{p.name}</div>
                    <div className="text-[10px] text-zinc-400">{t('products.unit')}: {p.unit}</div>
                </div>
            )
        },
        {
            key: 'type',
            label: t('products.category'),
            cardPosition: 'badge',
            render: (p) => (
                <Badge label={p.type === 'service' ? 'Dienstleistung' : 'Material'} />
            )
        },
        {
            key: 'purchasePrice',
            label: t('products.purchasePrice'),
            align: 'right',
            sortable: true,
            hideOnCard: true,
            render: (p) => <span className="text-zinc-500">{p.purchasePrice ? formatMoney(p.purchasePrice) : '—'}</span>
        },
        {
            key: 'price',
            label: t('products.salesPrice'),
            align: 'right',
            sortable: true,
            cardPosition: 'value',
            render: (p) => <span className="font-bold">{formatMoney(p.price)}</span>
        },
        {
            key: 'margin',
            label: t('products.margin'),
            align: 'right',
            hideOnCard: true,
            render: (p) => {
                const margin = (p.purchasePrice && p.price) ? ((p.price - p.purchasePrice) / p.price * 100) : 0;
                return margin > 0 ? (
                    <span className={`font-bold ${margin < 20 ? 'text-red-500' : 'text-green-600'}`}>
                        {margin.toFixed(1)}%
                    </span>
                ) : <span className="text-zinc-400">—</span>;
            }
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            width: '50px',
            hideOnCard: true,
            render: (p) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }}
                    className="p-2 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                >
                    ✏️
                </button>
            )
        }
    ];

    const bulkActions: BulkAction[] = [
        { label: t('common.delete'), onClick: () => alert('Bulk Delete not implemented'), variant: 'danger' }
    ];

    // Tabs
    const Tabs = (
        <div className="flex bg-zinc-100 p-1 rounded-xl mr-auto">
            {[
                { id: 'all', l: t('common.all') },
                { id: 'material', l: 'Material' },
                { id: 'service', l: 'Dienstleistung' }
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

    if (editingProduct) {
        return (
            <ProductEditor
                initialProduct={editingProduct}
                onSave={handleSave}
                onCancel={() => setEditingProduct(null)}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <ModuleHeader
                title={t('products.title')}
                subtitle={t('products.subtitle')}
                onBack={onBack}
                stats={[{ value: products.length, label: t('common.entries') }]}
            >
                <div className="mt-4">
                    <SearchToolbar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        placeholder={t('common.search') + '...'}
                        startAction={Tabs}
                        onNewClick={createNew}
                        newLabel={t('products.newProduct')}
                    />
                </div>
            </ModuleHeader>

            <div className="flex-1 p-4 md:p-8 overflow-auto">
                <DataDisplay
                    columns={columns}
                    data={paginatedData}
                    rowKey="id"
                    onRowClick={(p) => setEditingProduct(p)}
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
                    totalPages={Math.ceil(filteredProducts.length / rowsPerPage)}
                    onPageChange={setCurrentPage}
                    totalItems={filteredProducts.length}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={setRowsPerPage}
                    emptyMessage={t('common.noEntries')}
                    bulkActions={bulkActions}
                />
            </div>

            {/* Mobile FAB */}
            <button
                onClick={createNew}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-olive-600 transition-all z-50 active:scale-90"
            >
                <span className="text-2xl">+</span>
            </button>
        </div>
    );
};

export default ProductOverview;
