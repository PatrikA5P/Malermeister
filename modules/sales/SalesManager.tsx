import React, { useState, useEffect } from 'react';
import QuotesOverview from './quotes/QuotesOverview';
import InvoiceOverview from './invoices/InvoiceOverview';
import ProjectManager from '../projects/ProjectManager';
import { useTranslation } from '../../i18n/useTranslation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export type SalesTab = 'quotes' | 'orders' | 'invoices' | 'dunning';
type SalesView = 'home' | SalesTab;

interface SalesManagerProps {
    onBack: () => void;
    initialTab?: SalesTab;
    preselectedDocId?: number;
    preselectedCustomerId?: number;
}

const SalesManager: React.FC<SalesManagerProps> = ({ onBack, initialTab, preselectedDocId, preselectedCustomerId }) => {
    const { t } = useTranslation();
    const [currentView, setCurrentView] = useState<SalesView>(initialTab ?? 'home');

    useEffect(() => {
        if (initialTab) setCurrentView(initialTab);
    }, [initialTab]);

    // Navigation handler for module switching via dropdown
    const handleNavigate = (module: string) => {
        if (module === 'quotes' || module === 'orders' || module === 'invoices' || module === 'dunning') {
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
                            <h2 className="text-2xl font-black brand-font uppercase">{t('sales.title')}</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Card hoverEffect onClick={() => setCurrentView('quotes')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">📋</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('sales.quotes')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('sales.quotesSubtitle')}</p>
                                </div>
                            </Card>
                            <Card hoverEffect onClick={() => setCurrentView('orders')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">🏗️</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('sales.orders')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('sales.ordersSubtitle')}</p>
                                </div>
                            </Card>
                            <Card hoverEffect onClick={() => setCurrentView('invoices')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">📄</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('sales.invoices')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('sales.invoicesSubtitle')}</p>
                                </div>
                            </Card>
                            <Card hoverEffect onClick={() => setCurrentView('dunning')} className="cursor-pointer">
                                <div className="text-center md:text-left">
                                    <span className="text-3xl mb-3 block">🔔</span>
                                    <h3 className="font-bold text-sm text-zinc-900">{t('sales.dunning')}</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">{t('sales.dunningSubtitle')}</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {currentView === 'quotes' && (
                    <QuotesOverview
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                        preselectedCustomerId={preselectedCustomerId}
                    />
                )}

                {currentView === 'orders' && (
                    <ProjectManager onBack={() => setCurrentView('home')} />
                )}

                {currentView === 'invoices' && (
                    <InvoiceOverview
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                        preselectedDocId={preselectedDocId}
                        preselectedCustomerId={preselectedCustomerId}
                    />
                )}

                {currentView === 'dunning' && (
                    <InvoiceOverview
                        onBack={() => setCurrentView('home')}
                        onNavigate={handleNavigate}
                    />
                )}
            </div>
        </div>
    );
};

export default SalesManager;
