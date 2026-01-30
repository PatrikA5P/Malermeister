import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../db';
import { Expense } from '../../../officeTypes';
import { formatMoney } from '../../../components/SharedUI';
import { useTranslation } from '../../../i18n/useTranslation';
import { DataDisplay, DataDisplayColumn } from '../../../components/ui/DataDisplay';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface EmployeeExpensesProps {
    onBack?: () => void;
    onNavigate?: (module: string) => void;
}

const EmployeeExpenses: React.FC<EmployeeExpensesProps> = ({ onBack, onNavigate }) => {
    const { t } = useTranslation();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newExp, setNewExp] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        category: 'Spesen',
        supplier: 'Mitarbeiter',
        taxRate: 0
    });

    useEffect(() => { loadExpenses(); }, []);

    const loadExpenses = async () => {
        const all = await db.expenses.orderBy('date').reverse().toArray();
        setExpenses(all.filter(e => e.category === 'Spesen' || e.category === 'Personal'));
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setNewExp({...newExp, receiptImage: ev.target?.result as string});
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const save = async () => {
        if (!newExp.description || !newExp.amountGross) return;
        const net = (newExp.amountGross || 0);
        await db.expenses.add({
            ...newExp,
            amountNet: net,
            amountGross: newExp.amountGross || 0,
            description: newExp.description || '',
            supplier: newExp.supplier || 'Mitarbeiter',
            category: 'Spesen',
            date: newExp.date || new Date().toISOString(),
            taxRate: newExp.taxRate || 0
        } as Expense);
        setIsCreating(false);
        loadExpenses();
        setNewExp({date: new Date().toISOString().split('T')[0], category: 'Spesen', supplier: 'Mitarbeiter', taxRate: 0});
    };

    const filteredExpenses = expenses.filter(e =>
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const employeeOptions = [
        { value: 'Mitarbeiter', label: t('purchasing.employee') },
        { value: 'Geschäftsleitung', label: t('purchasing.management') }
    ];

    const columns: DataDisplayColumn<Expense>[] = [
        {
            key: 'supplier',
            label: t('purchasing.employee'),
            cardPosition: 'title',
            render: (row) => row.supplier
        },
        {
            key: 'description',
            label: t('common.description'),
            cardPosition: 'subtitle',
            render: (row) => row.description
        },
        {
            key: 'category',
            label: t('common.type'),
            cardPosition: 'badge',
            render: () => <Badge label={t('purchasing.employeeExpense')} variant="info" />
        },
        {
            key: 'date',
            label: t('common.date'),
            cardPosition: 'meta',
            render: (row) => row.date
        },
        {
            key: 'receipt',
            label: t('purchasing.receipt'),
            hideOnCard: true,
            render: (row) => row.receiptImage ? '📎' : ''
        },
        {
            key: 'amountGross',
            label: t('common.total'),
            align: 'right',
            cardPosition: 'value',
            render: (row) => formatMoney(row.amountGross)
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
            {/* Header */}
            <div className="px-4 md:px-8 pt-4 pb-4">
                <div className="flex items-center gap-4 mb-4">
                    {onBack && <Button variant="icon" onClick={onBack} icon="←" />}
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black brand-font uppercase">{t('purchasing.employeeExpenses')}</h2>
                            {onNavigate && (
                                <select
                                    className="text-xs bg-zinc-100 border-0 rounded-lg px-2 py-1 font-bold uppercase"
                                    value="spesen"
                                    onChange={(e) => onNavigate(e.target.value)}
                                >
                                    {moduleOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">
                            {t('purchasing.employeeExpensesSubtitle')}
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
                    <Button variant="primary" onClick={() => setIsCreating(true)}>
                        + {t('purchasing.employeeExpense')}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 space-y-3">
                {/* Create Form */}
                {isCreating && (
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 mb-4 animate-in slide-in-from-top-4">
                        <h3 className="text-xs font-black uppercase text-blue-600 mb-4">{t('purchasing.newEmployeeExpense')}</h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <input
                                    type="date"
                                    className="bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg w-1/3 outline-none"
                                    value={newExp.date}
                                    onChange={e => setNewExp({...newExp, date: e.target.value})}
                                />
                                <select
                                    className="bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg w-2/3 outline-none"
                                    value={newExp.supplier}
                                    onChange={e => setNewExp({...newExp, supplier: e.target.value})}
                                >
                                    {employeeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <input
                                className="w-full bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg outline-none"
                                placeholder={t('purchasing.expenseDescriptionPlaceholder')}
                                value={newExp.description || ''}
                                onChange={e => setNewExp({...newExp, description: e.target.value})}
                            />
                            <div className="flex gap-4 items-center">
                                <input
                                    className="w-1/2 bg-zinc-50 border-transparent focus:bg-white focus:border-blue-500 border p-3 rounded-lg font-bold outline-none"
                                    type="number"
                                    placeholder={t('common.amount')}
                                    value={newExp.amountGross || ''}
                                    onChange={e => setNewExp({...newExp, amountGross: parseFloat(e.target.value)})}
                                />
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!newExp.receiptImage} readOnly />
                                    <button onClick={() => fileInputRef.current?.click()} className="text-xs uppercase font-bold text-blue-600">
                                        {t('purchasing.receipt')}
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFile} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setIsCreating(false)} className="flex-1">
                                    {t('common.cancel')}
                                </Button>
                                <Button variant="primary" onClick={save} className="flex-1">
                                    {t('common.save')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* List */}
                <DataDisplay
                    columns={columns}
                    data={filteredExpenses}
                    rowKey="id"
                    emptyMessage={t('purchasing.noEmployeeExpenses')}
                />
            </div>
        </div>
    );
};

export default EmployeeExpenses;
