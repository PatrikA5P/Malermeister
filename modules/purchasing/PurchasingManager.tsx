import React, { useState, useEffect } from 'react';
import PurchaseOrderList from './orders/PurchaseOrderList';
import SupplierInvoiceList from './invoices/SupplierInvoiceList';
import SupplierCreditList from './credits/SupplierCreditList';
import GeneralExpenses from './expenses/GeneralExpenses';
import EmployeeExpenses from './expenses/EmployeeExpenses';
import { useTranslation } from '../../i18n/useTranslation';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export type PurchasingTab = 'orders' | 'invoices' | 'credits' | 'expenses' | 'spesen';
type PurchasingView = 'home' | PurchasingTab;

interface PurchasingManagerProps {
    onBack: () => void;
    initialTab?: PurchasingTab;
}

const PurchasingManager: React.FC<PurchasingManagerProps> = ({ onBack, initialTab }) => {
    const { t } = useTranslation();
    const [currentView, setCurrentView] = useState<PurchasingView>(initialTab ?? 'home');

    useEffect(() => {
        if (initialTab) setCurrentView(initialTab);
    }, [initialTab]);

    // Navigation handler for module switching via dropdown
    const handleNavigate = (module: string) => {
        if (module === 'orders' || module === 'invoices' || module === 'credits' || module === 'expenses' || module === 'spesen') {
            setCurrentView(module);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="flex-1 overflow-hidden h-full">
                {currentView === 'home' && (
                    <div className="p-6 md:p-12">
                        <div className="flex items-center gap-4 mb-8">
                            <Button variant="icon" onClick={onBack} icon="←" />
                            <div>
                                <h2 className="text-2xl font-black brand-font uppercase">{t('purchasing.title')}</h2>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">
                                    {t('purchasing.ordersSubtitle')}
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Card hoverEffect onClick={() => setCurrentView('orders')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">📦</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('purchasing.orders')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('purchasing.ordersSubtitle')}</p>
                                </div>
                            </Card>
                            <Card hoverEffect onClick={() => setCurrentView('invoices')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">📑</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('purchasing.invoices')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('purchasing.invoicesSubtitle')}</p>
                                </div>
                            </Card>
                            <Card hoverEffect onClick={() => setCurrentView('credits')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">↩️</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('purchasing.credits')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('purchasing.creditsSubtitle')}</p>
                                </div>
                            </Card>
                            <Card hoverEffect onClick={() => setCurrentView('expenses')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">💸</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('purchasing.expenses')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('purchasing.expensesSubtitle')}</p>
                                </div>
                            </Card>
                            <Card hoverEffect onClick={() => setCurrentView('spesen')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">☕</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('purchasing.employeeExpenses')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('purchasing.employeeExpensesSubtitle')}</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {currentView === 'orders' && (
                    <PurchaseOrderList
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                    />
                )}
                {currentView === 'invoices' && (
                    <SupplierInvoiceList
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                    />
                )}
                {currentView === 'credits' && (
                    <SupplierCreditList
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                    />
                )}
                {currentView === 'expenses' && (
                    <GeneralExpenses
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                    />
                )}
                {currentView === 'spesen' && (
                    <EmployeeExpenses
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                    />
                )}
            </div>
        </div>
    );
};

export default PurchasingManager;
