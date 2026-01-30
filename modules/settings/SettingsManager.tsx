import React, { useState, useEffect, useRef } from 'react';
import { db, initSettings } from '../../db';
import { OfficeSettings, VatRate, SupportedCurrency, SupportedLanguage } from '../../officeTypes';
import { backupService } from '../../services/backupService';
import { cloudService } from '../../services/cloudService';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextInput, Select } from '../../components/ui/Input';
import { ModuleHeader, ActionBar } from '../../components/ui/Layouts';
import { Toast, ToastType } from '../../components/SharedUI';
import { useTranslation } from '../../i18n/useTranslation';
import { setLanguage as setI18nLanguage } from '../../i18n';
import { CURRENCY_CONFIGS } from '../../services/calculationService';

type SettingsTab = 'company' | 'finance' | 'language' | 'layout' | 'team' | 'backup';

const CURRENCY_OPTIONS = [
    { value: 'CHF', label: 'CHF - Schweizer Franken' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'USD', label: 'USD - US Dollar' }
];

const LANGUAGE_OPTIONS = [
    { value: 'de', label: '🇩🇪 Deutsch' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'it', label: '🇮🇹 Italiano' }
];

const SettingsManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t, language } = useTranslation();
    const [settings, setSettings] = useState<OfficeSettings | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('company');
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Backup State
    const [backupStatus, setBackupStatus] = useState<'safe' | 'warning' | 'critical'>('safe');
    const [daysSinceLastBackup, setDaysSinceLastBackup] = useState<number>(0);
    const [cloudStatus, setCloudStatus] = useState({ connected: false, provider: 'local', user: '' });

    useEffect(() => {
        loadSettings();
        checkCloudStatus();
    }, []);

    const checkCloudStatus = () => {
        setCloudStatus({
            connected: cloudService.isConnected,
            provider: cloudService.provider,
            user: cloudService.user?.name || ''
        });
    };

    const handleCloudConnect = async (provider: 'google' | 'onedrive') => {
        await cloudService.connect(provider);
        checkCloudStatus();
    };

    const handleCloudDisconnect = async () => {
        await cloudService.disconnect();
        checkCloudStatus();
    };

    const loadSettings = async () => {
        const s = await db.settings.toArray();
        if (s.length) {
            const currentSettings = s[0];
            setSettings(currentSettings);

            // Sync i18n language with settings
            if (currentSettings.language && currentSettings.language !== language) {
                setI18nLanguage(currentSettings.language);
            }

            if (currentSettings.backup?.lastSuccess) {
                const last = new Date(currentSettings.backup.lastSuccess);
                const diff = Date.now() - last.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                setDaysSinceLastBackup(days);

                if (days < 1) setBackupStatus('safe');
                else if (days < 3) setBackupStatus('warning');
                else setBackupStatus('critical');
            } else {
                setBackupStatus('critical');
                setDaysSinceLastBackup(-1);
            }
        }
    };

    const save = async () => {
        if (settings && settings.id) {
            await db.settings.put(settings);

            // Update i18n language
            if (settings.language) {
                setI18nLanguage(settings.language);
            }

            setToast({ msg: t('settings.savedSuccessfully'), type: 'success' });
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (settings) {
                    setSettings({ ...settings, logo: ev.target?.result as string });
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const updateVatRate = (idx: number, field: keyof VatRate, val: any) => {
        if (!settings) return;
        const newRates = [...settings.vatRates];
        newRates[idx] = { ...newRates[idx], [field]: val };
        setSettings({ ...settings, vatRates: newRates });
    };

    // Backup Actions
    const handleForceBackup = async () => {
        await backupService.scheduleBackup('auto_restore');
        setToast({ msg: t('settings.forceBackup') + ' - Job scheduled', type: 'info' });
        setTimeout(loadSettings, 1000);
    };

    const handleExportReadable = async () => {
        await backupService.scheduleBackup('manual_export');
        setToast({ msg: t('settings.manualExport') + '...', type: 'info' });
    };

    const handleResetAccounts = async () => {
        if (confirm("Dies löscht alle bestehenden Konten und Gruppen. Fortfahren?")) {
            await db.accounts.clear();
            await db.accountGroups.clear();
            await initSettings();
            window.location.reload();
        }
    };

    if (!settings) return <div className="p-8 text-center text-zinc-400">{t('common.loading')}</div>;

    const TabButton = ({ id, label, icon, badge }: { id: SettingsTab, label: string, icon: string, badge?: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all whitespace-nowrap relative ${activeTab === id ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100'}`}
        >
            <span className="text-lg">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
            {badge}
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <ModuleHeader
                title={t('settings.title')}
                onBack={onBack}
                actions={
                    <Button variant="solid" onClick={save} label={t('common.save')} />
                }
            />

            <div className="flex-1 overflow-auto p-4 md:p-8">
                {/* Tab Navigation */}
                <div className="flex flex-nowrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-zinc-100 overflow-x-auto no-scrollbar">
                    <TabButton id="company" label={t('settings.company')} icon="🏢" />
                    <TabButton id="finance" label={t('settings.finance')} icon="📊" />
                    <TabButton id="language" label={t('settings.language')} icon="🌐" />
                    <TabButton id="layout" label={t('settings.layout')} icon="📄" />
                    <TabButton id="team" label={t('settings.team')} icon="👥" />
                    <TabButton
                        id="backup"
                        label={t('settings.backup')}
                        icon="☁️"
                        badge={
                            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${backupStatus === 'safe' ? 'bg-green-500' : backupStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                        }
                    />
                </div>

                {/* COMPANY TAB */}
                {activeTab === 'company' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                        <Card title={t('settings.companyInfo')}>
                            <div className="space-y-4">
                                <TextInput
                                    label={t('settings.companyName')}
                                    value={settings.companyName}
                                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                                    fullWidth
                                />
                                <TextInput
                                    label={t('crm.street')}
                                    value={settings.address.street}
                                    onChange={(e) => setSettings({ ...settings, address: { ...settings.address, street: e.target.value } })}
                                    fullWidth
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <TextInput
                                        label={t('crm.zip')}
                                        value={settings.address.zip}
                                        onChange={(e) => setSettings({ ...settings, address: { ...settings.address, zip: e.target.value } })}
                                    />
                                    <div className="col-span-2">
                                        <TextInput
                                            label={t('crm.city')}
                                            value={settings.address.city}
                                            onChange={(e) => setSettings({ ...settings, address: { ...settings.address, city: e.target.value } })}
                                            fullWidth
                                        />
                                    </div>
                                </div>
                                <TextInput
                                    label={t('crm.email')}
                                    type="email"
                                    value={settings.address.email || ''}
                                    onChange={(e) => setSettings({ ...settings, address: { ...settings.address, email: e.target.value } })}
                                    fullWidth
                                />
                                <TextInput
                                    label={t('crm.phone')}
                                    value={settings.address.phone || ''}
                                    onChange={(e) => setSettings({ ...settings, address: { ...settings.address, phone: e.target.value } })}
                                    fullWidth
                                />
                                <TextInput
                                    label={t('crm.website')}
                                    value={settings.address.website || ''}
                                    onChange={(e) => setSettings({ ...settings, address: { ...settings.address, website: e.target.value } })}
                                    fullWidth
                                />
                            </div>
                        </Card>

                        <Card title={t('settings.logo')}>
                            <div className="flex flex-col items-center gap-4">
                                {settings.logo ? (
                                    <div className="relative">
                                        <img src={settings.logo} alt="Logo" className="max-h-32 max-w-full object-contain rounded-xl border border-zinc-200" />
                                        <button
                                            onClick={() => setSettings({ ...settings, logo: undefined })}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-32 h-32 border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center text-zinc-400">
                                        <span className="text-4xl">🖼️</span>
                                    </div>
                                )}
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <Button
                                    variant="outline"
                                    label={t('settings.uploadLogo')}
                                    onClick={() => logoInputRef.current?.click()}
                                />
                            </div>
                        </Card>
                    </div>
                )}

                {/* FINANCE TAB */}
                {activeTab === 'finance' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                        <Card title={t('settings.bankDetails')}>
                            <div className="space-y-4">
                                <TextInput
                                    label={t('settings.bankName')}
                                    value={settings.bankName}
                                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                                    fullWidth
                                />
                                <TextInput
                                    label={t('settings.iban')}
                                    value={settings.iban}
                                    onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                                    fullWidth
                                />
                                <TextInput
                                    label="QR-IBAN"
                                    value={settings.qrIban || ''}
                                    onChange={(e) => setSettings({ ...settings, qrIban: e.target.value })}
                                    hint="Für Swiss QR-Rechnungen mit QR-Referenz"
                                    fullWidth
                                />
                                <TextInput
                                    label="UID/MwSt-Nr."
                                    value={settings.uidMwst || ''}
                                    onChange={(e) => setSettings({ ...settings, uidMwst: e.target.value })}
                                    hint="z.B. CHE-123.456.789 MWST"
                                    fullWidth
                                />
                                <TextInput
                                    label={t('settings.paymentTermsDays')}
                                    type="number"
                                    value={settings.paymentTermsDays.toString()}
                                    onChange={(e) => setSettings({ ...settings, paymentTermsDays: parseInt(e.target.value) || 30 })}
                                    fullWidth
                                />
                            </div>
                        </Card>

                        <Card title={t('settings.vatRates')}>
                            <div className="space-y-4">
                                {settings.vatRates.map((rate, idx) => (
                                    <div key={idx} className="flex gap-3 items-end">
                                        <TextInput
                                            label="Code"
                                            value={rate.code}
                                            onChange={(e) => updateVatRate(idx, 'code', e.target.value)}
                                            className="w-16"
                                        />
                                        <TextInput
                                            label="%"
                                            type="number"
                                            value={rate.rate.toString()}
                                            onChange={(e) => updateVatRate(idx, 'rate', parseFloat(e.target.value) || 0)}
                                            className="w-20"
                                        />
                                        <TextInput
                                            label={t('common.description')}
                                            value={rate.description}
                                            onChange={(e) => updateVatRate(idx, 'description', e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                {/* LANGUAGE & CURRENCY TAB */}
                {activeTab === 'language' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                        <Card title={t('settings.languageSettings')}>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                                        {t('settings.language')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {LANGUAGE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setSettings({ ...settings, language: opt.value as SupportedLanguage })}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${
                                                    settings.language === opt.value
                                                        ? 'border-olive-500 bg-olive-50'
                                                        : 'border-zinc-200 hover:border-zinc-300'
                                                }`}
                                            >
                                                <span className="text-lg font-bold">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-100">
                                    <p className="text-sm text-zinc-500">
                                        {t('settings.language')}: Die Sprache wird nach dem Speichern sofort angewendet.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card title={t('settings.defaultCurrency')}>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                                        {t('settings.defaultCurrency')}
                                    </label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {CURRENCY_OPTIONS.map(opt => {
                                            const config = CURRENCY_CONFIGS[opt.value];
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setSettings({ ...settings, defaultCurrency: opt.value as SupportedCurrency })}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center ${
                                                        settings.defaultCurrency === opt.value
                                                            ? 'border-olive-500 bg-olive-50'
                                                            : 'border-zinc-200 hover:border-zinc-300'
                                                    }`}
                                                >
                                                    <div>
                                                        <span className="font-bold text-zinc-900">{opt.label}</span>
                                                        <span className="text-xs text-zinc-500 block mt-1">
                                                            Rundung: {config?.roundingIncrement || 0.01}
                                                        </span>
                                                    </div>
                                                    {settings.defaultCurrency === opt.value && (
                                                        <Badge label="Standard" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-100">
                                    <p className="text-sm text-zinc-500">
                                        CHF verwendet Rappenrundung (0.05), EUR und USD runden auf 0.01.
                                        Die Währung kann pro Dokument überschrieben werden.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* LAYOUT TAB */}
                {activeTab === 'layout' && (
                    <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                        <Card title={t('documents.quote') + ' - Layout'}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                                        {t('documents.intro')}
                                    </label>
                                    <textarea
                                        className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[80px] focus:border-olive-500 focus:ring-2 focus:ring-olive-100 outline-none"
                                        value={settings.layouts.quote.introText || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            layouts: { ...settings.layouts, quote: { ...settings.layouts.quote, introText: e.target.value } }
                                        })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                                        {t('documents.outro')}
                                    </label>
                                    <textarea
                                        className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[80px] focus:border-olive-500 focus:ring-2 focus:ring-olive-100 outline-none"
                                        value={settings.layouts.quote.outroText || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            layouts: { ...settings.layouts, quote: { ...settings.layouts.quote, outroText: e.target.value } }
                                        })}
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card title={t('documents.invoice') + ' - Layout'}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                                        {t('documents.intro')}
                                    </label>
                                    <textarea
                                        className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[80px] focus:border-olive-500 focus:ring-2 focus:ring-olive-100 outline-none"
                                        value={settings.layouts.invoice.introText || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            layouts: { ...settings.layouts, invoice: { ...settings.layouts.invoice, introText: e.target.value } }
                                        })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                                        {t('documents.outro')}
                                    </label>
                                    <textarea
                                        className="w-full border border-zinc-200 rounded-xl p-3 text-sm min-h-[80px] focus:border-olive-500 focus:ring-2 focus:ring-olive-100 outline-none"
                                        value={settings.layouts.invoice.outroText || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            layouts: { ...settings.layouts, invoice: { ...settings.layouts.invoice, outroText: e.target.value } }
                                        })}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* TEAM TAB */}
                {activeTab === 'team' && (
                    <Card title={t('settings.teamMembers')}>
                        <div className="space-y-4">
                            {settings.users.map((user, idx) => (
                                <div key={user.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
                                    <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center font-bold text-olive-700">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-zinc-900">{user.name}</div>
                                        <div className="text-xs text-zinc-500 uppercase">{user.role}</div>
                                    </div>
                                    <Badge label={user.role} />
                                </div>
                            ))}
                            <Button variant="outline" label="+ Benutzer hinzufügen" onClick={() => alert('Coming soon')} />
                        </div>
                    </Card>
                )}

                {/* BACKUP TAB */}
                {activeTab === 'backup' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                        {/* Status Panel */}
                        <Card
                            className={`${backupStatus === 'safe' ? 'bg-green-50 border-green-100' : backupStatus === 'warning' ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}
                        >
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <h3 className={`font-black uppercase text-sm mb-2 tracking-widest ${backupStatus === 'safe' ? 'text-green-800' : backupStatus === 'warning' ? 'text-yellow-800' : 'text-red-800'}`}>
                                        {t('settings.backupStatus')}
                                    </h3>
                                    <p className="text-lg font-bold text-zinc-800">
                                        {daysSinceLastBackup === -1
                                            ? t('settings.neverBackedUp')
                                            : daysSinceLastBackup === 0
                                                ? t('settings.dataSecure')
                                                : `${t('settings.lastBackup')}: ${daysSinceLastBackup} ${t('units.days')}`}
                                    </p>
                                </div>

                                <Button
                                    variant="outline"
                                    label={`🔄 ${t('settings.forceBackup')}`}
                                    onClick={handleForceBackup}
                                    className="mt-6"
                                />
                            </div>
                        </Card>

                        {/* Cloud Configuration */}
                        <Card title={t('settings.cloudStorage')}>
                            {cloudStatus.connected ? (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                                            {cloudStatus.provider === 'google' ? '🇬' : '🇲'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-blue-900">
                                                {cloudStatus.provider === 'google' ? 'Google Drive' : 'OneDrive'}
                                            </p>
                                            <p className="text-xs text-blue-600">{cloudStatus.user}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" label={t('settings.disconnectCloud')} onClick={handleCloudDisconnect} className="text-red-500" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-zinc-500 mb-4">
                                        {t('settings.connectCloud')}:
                                    </p>
                                    <button
                                        onClick={() => handleCloudConnect('google')}
                                        className="w-full flex items-center justify-center gap-3 p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors font-bold text-sm"
                                    >
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                                        Google Drive
                                    </button>
                                    <button
                                        onClick={() => handleCloudConnect('onedrive')}
                                        className="w-full flex items-center justify-center gap-3 p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors font-bold text-sm"
                                    >
                                        <span className="text-blue-600 text-lg">☁️</span>
                                        OneDrive
                                    </button>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-zinc-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-olive-600 rounded"
                                        checked={settings.backup?.autoInterval === 'daily'}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            backup: { ...settings.backup, autoInterval: e.target.checked ? 'daily' : 'manual' }
                                        })}
                                    />
                                    <div>
                                        <span className="font-bold text-sm block">{t('settings.dailyBackup')}</span>
                                        <span className="text-xs text-zinc-500">{t('settings.autoBackup')}</span>
                                    </div>
                                </label>
                            </div>
                        </Card>

                        {/* Manual Exports */}
                        <Card title={t('settings.manualExport')} className="lg:col-span-2">
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={handleExportReadable}
                                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-6 py-4 rounded-xl font-bold text-xs uppercase transition-all flex flex-col items-center gap-2"
                                >
                                    <span className="text-2xl">📄</span>
                                    <span>Excel/PDF Export</span>
                                </button>

                                <div className="w-px h-12 bg-zinc-200"></div>

                                <button
                                    onClick={() => alert("Nur für Admins.")}
                                    className="flex-1 bg-zinc-50 text-zinc-400 px-6 py-4 rounded-xl font-bold text-xs uppercase flex flex-col items-center gap-2 cursor-not-allowed"
                                >
                                    <span className="text-2xl">💾</span>
                                    <span>System Snapshot</span>
                                </button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsManager;
