import React, { useState, useEffect } from 'react';
import { db } from '../../../db';
import { OfficeDocument } from '../../../officeTypes';
import { formatMoney, formatDate, Toast, ToastType } from '../../../components/SharedUI';
import PurchaseEditor from '../components/PurchaseEditor';
import { useTranslation } from '../../../i18n/useTranslation';
import { DataDisplay, DataDisplayColumn } from '../../../components/ui/DataDisplay';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface SupplierCreditListProps {
    onBack?: () => void;
    onNavigate?: (module: string) => void;
}

const SupplierCreditList: React.FC<SupplierCreditListProps> = ({ onBack, onNavigate }) => {
    const { t } = useTranslation();
    const [docs, setDocs] = useState<OfficeDocument[]>([]);
    const [editing, setEditing] = useState<OfficeDocument | null>(null);
    const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        const d = await db.documents.where('type').equals('supplier_credit').reverse().toArray();
        setDocs(d);
    };

    const createNew = () => {
        const year = new Date().getFullYear();
        const num = String(Date.now()).slice(-4);
        setEditing({
            docNumber: `GU-${year}-${num}`,
            type: 'supplier_credit',
            status: 'draft',
            date: new Date().toISOString().split('T')[0],
            client: { name: '', street: '', zip: '', city: '' },
            items: [],
            totalNet: 0, totalTax: 0, totalGross: 0
        });
    };

    const handleSave = async (doc: OfficeDocument) => {
        if (doc.id) await db.documents.update(doc.id, doc as any);
        else await db.documents.add(doc);
        setEditing(null);
        load();
        setToast({ msg: t('toast.saved'), type: 'success' });
    };

    if (editing) {
        return <PurchaseEditor initialDoc={editing} onSave={handleSave} onCancel={() => setEditing(null)} title={t('purchasing.credit')} />;
    }

    const filteredDocs = docs.filter(d =>
        d.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns: DataDisplayColumn<OfficeDocument>[] = [
        {
            key: 'docNumber',
            label: t('common.number'),
            cardPosition: 'subtitle',
            render: (row) => <span className="font-mono font-bold text-zinc-500 text-xs">{row.docNumber}</span>
        },
        {
            key: 'client',
            label: t('common.supplier'),
            cardPosition: 'title',
            render: (row) => row.client.name || t('purchasing.newSupplier')
        },
        {
            key: 'date',
            label: t('common.date'),
            cardPosition: 'meta',
            render: (row) => formatDate(row.date)
        },
        {
            key: 'status',
            label: t('common.status'),
            cardPosition: 'badge',
            render: (row) => (
                <Badge
                    label={t(`status.${row.status}`)}
                    variant={row.status === 'applied' ? 'success' : 'default'}
                />
            )
        },
        {
            key: 'totalGross',
            label: t('common.total'),
            align: 'right',
            cardPosition: 'value',
            render: (row) => <span className="text-green-600">{formatMoney(row.totalGross)}</span>
        }
    ];

    const moduleOptions = [
        { value: 'orders', label: t('purchasing.orders') },
        { value: 'invoices', label: t('purchasing.invoices') },
        { value: 'credits', label: t('purchasing.credits') },
        { value: 'expenses', label: t('purchasing.expenses') },
        { value: 'spesen', label: t('purchasing.employeeExpenses') }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="px-4 md:px-8 pt-4 pb-4">
                <div className="flex items-center gap-4 mb-4">
                    {onBack && <Button variant="icon" onClick={onBack} icon="←" />}
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black brand-font uppercase">{t('purchasing.credits')}</h2>
                            {onNavigate && (
                                <select
                                    className="text-xs bg-zinc-100 border-0 rounded-lg px-2 py-1 font-bold uppercase"
                                    value="credits"
                                    onChange={(e) => onNavigate(e.target.value)}
                                >
                                    {moduleOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">
                            {t('purchasing.creditsSubtitle')}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4">
                    <input
                        className="bg-white border border-zinc-200 p-3 rounded-xl text-sm font-bold w-full md:w-64 outline-none"
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button variant="primary" onClick={createNew}>
                        + {t('purchasing.credit')}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-20">
                <DataDisplay
                    columns={columns}
                    data={filteredDocs}
                    rowKey="id"
                    onRowClick={(row) => setEditing(row)}
                    emptyMessage={t('purchasing.noCredits')}
                />
            </div>
        </div>
    );
};

export default SupplierCreditList;
