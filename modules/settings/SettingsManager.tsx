
import React, { useState, useEffect, useRef } from 'react';
import { db, initSettings } from '../../db'; // Added initSettings import
import { OfficeSettings, VatRate } from '../../officeTypes';

type SettingsTab = 'company' | 'finance' | 'layout' | 'team';

const SettingsManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.settings.toArray().then(s => {
        if(s.length) setSettings(s[0]);
    });
  }, []);

  const save = async () => {
    if (settings && settings.id) {
        await db.settings.put(settings);
        alert("Einstellungen erfolgreich gespeichert.");
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

  const handleBackup = async () => {
      const data = {
          documents: await db.documents.toArray(),
          expenses: await db.expenses.toArray(),
          customers: await db.customers.toArray(),
          projects: await db.projects.toArray(),
          settings: await db.settings.toArray()
      };
      const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_borer_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleResetAccounts = async () => {
      if(confirm("Dies löscht alle bestehenden Konten und Gruppen und lädt den Standard KMU Kontenplan neu. Fortfahren?")) {
          await db.accounts.clear();
          await db.accountGroups.clear();
          await initSettings(); // Re-trigger seed
          alert("Kontenplan wurde zurückgesetzt. Bitte Seite neu laden.");
          window.location.reload();
      }
  };

  if (!settings) return <div className="p-8 text-center text-zinc-400">Lade Einstellungen...</div>;

  const TabButton = ({ id, label, icon }: { id: SettingsTab, label: string, icon: string }) => (
      <button 
        onClick={() => setActiveTab(id)} 
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all ${activeTab === id ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100'}`}
      >
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
      </button>
  );

  return (
    <div className="pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all">←</button>
                <h2 className="text-2xl font-black brand-font uppercase">Einstellungen</h2>
            </div>
            <button onClick={save} className="bg-olive-600 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase shadow-lg hover:bg-olive-700 transition-all">
                Alle Speichern
            </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-zinc-100 overflow-x-auto">
            <TabButton id="company" label="Firma" icon="🏢" />
            <TabButton id="finance" label="Finanzen & MWST" icon="📊" />
            <TabButton id="layout" label="Briefpapier" icon="📄" />
            <TabButton id="team" label="Team & Rechte" icon="👥" />
        </div>

        {/* --- COMPANY TAB --- */}
        {activeTab === 'company' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                    <h3 className="font-black uppercase text-sm mb-6 text-zinc-400 tracking-widest">Stammdaten</h3>
                    <div className="space-y-4">
                        <div className="group">
                            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Firmenname</label>
                            <input className="w-full border p-3 rounded-lg font-bold text-lg bg-zinc-50 focus:bg-white outline-none focus:border-olive-500 transition-colors" value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})} />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">UID / MWST-Nummer</label>
                            <input className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white outline-none focus:border-olive-500 transition-colors" placeholder="CHE-123.456.789 MWST" value={settings.uidMwst || ''} onChange={e => setSettings({...settings, uidMwst: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <input className="col-span-3 border p-3 rounded-lg bg-zinc-50" placeholder="Strasse Nr." value={settings.address.street} onChange={e => setSettings({...settings, address: {...settings.address, street: e.target.value}})} />
                            <input className="col-span-1 border p-3 rounded-lg bg-zinc-50" placeholder="PLZ" value={settings.address.zip} onChange={e => setSettings({...settings, address: {...settings.address, zip: e.target.value}})} />
                            <input className="col-span-2 border p-3 rounded-lg bg-zinc-50" placeholder="Ort" value={settings.address.city} onChange={e => setSettings({...settings, address: {...settings.address, city: e.target.value}})} />
                        </div>
                        <input className="w-full border p-3 rounded-lg bg-zinc-50" placeholder="Email" value={settings.address.email || ''} onChange={e => setSettings({...settings, address: {...settings.address, email: e.target.value}})} />
                        <input className="w-full border p-3 rounded-lg bg-zinc-50" placeholder="Webseite" value={settings.address.website || ''} onChange={e => setSettings({...settings, address: {...settings.address, website: e.target.value}})} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                        <h3 className="font-black uppercase text-sm mb-6 text-zinc-400 tracking-widest">Logo & Branding</h3>
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-200 overflow-hidden relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                {settings.logo ? (
                                    <img src={settings.logo} className="w-full h-full object-contain" alt="Logo" />
                                ) : (
                                    <span className="text-zinc-300 text-2xl font-bold">LOGO</span>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold uppercase transition-opacity">Ändern</div>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-zinc-500 mb-2">Laden Sie Ihr Firmenlogo hoch. Es wird auf allen Dokumenten oben rechts platziert.</p>
                                <button onClick={() => logoInputRef.current?.click()} className="text-[10px] bg-zinc-900 text-white px-4 py-2 rounded-lg font-bold uppercase">Datei wählen</button>
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                        <h3 className="font-black uppercase text-sm mb-6 text-zinc-400 tracking-widest">Bankverbindung</h3>
                        <div className="space-y-3">
                            <input className="w-full border p-3 rounded-lg bg-zinc-50" placeholder="Bankname (z.B. ZKB)" value={settings.bankName} onChange={e => setSettings({...settings, bankName: e.target.value})} />
                            <input className="w-full border p-3 rounded-lg bg-zinc-50 font-mono" placeholder="IBAN (CH...)" value={settings.iban} onChange={e => setSettings({...settings, iban: e.target.value})} />
                            <input className="w-full border p-3 rounded-lg bg-zinc-50 font-mono" placeholder="QR-IBAN (für QR-Rechnungen)" value={settings.qrIban || ''} onChange={e => setSettings({...settings, qrIban: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- FINANCE TAB --- */}
        {activeTab === 'finance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                    <h3 className="font-black uppercase text-sm mb-6 text-zinc-400 tracking-widest">MWST Konfiguration</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Abrechnungsmethode</label>
                            <select className="w-full border p-3 rounded-lg bg-zinc-50" value={settings.vatMethod} onChange={e => setSettings({...settings, vatMethod: e.target.value as any})}>
                                <option value="effective">Effektive Methode</option>
                                <option value="saldo">Saldosteuersatz</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Rhythmus</label>
                            <select className="w-full border p-3 rounded-lg bg-zinc-50" value={settings.vatPeriod} onChange={e => setSettings({...settings, vatPeriod: e.target.value as any})}>
                                <option value="quarter">Vierteljährlich</option>
                                <option value="semester">Halbjährlich</option>
                            </select>
                        </div>
                    </div>
                    
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-2">Steuersätze</label>
                    <div className="space-y-2">
                        {settings.vatRates.map((rate, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input className="w-12 border p-2 rounded bg-zinc-50 text-center font-bold" value={rate.code} onChange={e => updateVatRate(idx, 'code', e.target.value)} />
                                <input className="w-20 border p-2 rounded bg-zinc-50 text-right" type="number" value={rate.rate} onChange={e => updateVatRate(idx, 'rate', parseFloat(e.target.value))} />
                                <span className="text-zinc-400 text-sm">%</span>
                                <input className="flex-1 border p-2 rounded bg-zinc-50" value={rate.description} onChange={e => updateVatRate(idx, 'description', e.target.value)} />
                            </div>
                        ))}
                        <button onClick={() => setSettings({...settings, vatRates: [...settings.vatRates, {code: 'X', rate: 0, description: 'Neu'}]})} className="text-[10px] font-bold uppercase text-olive-600 mt-2">+ Satz hinzufügen</button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                        <h3 className="font-black uppercase text-sm mb-6 text-zinc-400 tracking-widest">Zahlungskonditionen & Mahnwesen</h3>
                        <div className="mb-6">
                            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Standard Zahlungsfrist (Tage)</label>
                            <input type="number" className="w-full border p-3 rounded-lg bg-zinc-50" value={settings.paymentTermsDays} onChange={e => setSettings({...settings, paymentTermsDays: parseInt(e.target.value)})} />
                        </div>
                        
                        <h4 className="font-bold text-xs uppercase mb-3 border-b border-zinc-100 pb-2">Mahnstufen</h4>
                        <div className="space-y-4">
                            {settings.dunningRules.map((rule, idx) => (
                                <div key={idx} className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-sm">Stufe {rule.level}</span>
                                        <div className="flex gap-2">
                                            <input type="number" className="w-16 p-1 text-right text-xs border rounded" placeholder="Tage" value={rule.daysAfterDue} onChange={e => {
                                                const newRules = [...settings.dunningRules];
                                                newRules[idx].daysAfterDue = parseInt(e.target.value);
                                                setSettings({...settings, dunningRules: newRules});
                                            }} />
                                            <span className="text-[10px] text-zinc-400 pt-1">Tage überfällig</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                         <span className="text-[10px] text-zinc-400 pt-1">Gebühr CHF</span>
                                         <input type="number" className="w-16 p-1 text-right text-xs border rounded" value={rule.fee} onChange={e => {
                                                const newRules = [...settings.dunningRules];
                                                newRules[idx].fee = parseInt(e.target.value);
                                                setSettings({...settings, dunningRules: newRules});
                                         }} />
                                    </div>
                                    <textarea className="w-full text-xs p-2 border rounded" rows={2} value={rule.text} onChange={e => {
                                        const newRules = [...settings.dunningRules];
                                        newRules[idx].text = e.target.value;
                                        setSettings({...settings, dunningRules: newRules});
                                    }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                        <h3 className="font-black uppercase text-sm mb-4 text-zinc-400 tracking-widest">Datenbank Aktionen</h3>
                        <p className="text-sm text-zinc-500 mb-4">Falls der Kontenplan fehlt oder beschädigt ist:</p>
                        <button onClick={handleResetAccounts} className="w-full border-2 border-red-100 text-red-500 hover:bg-red-50 p-3 rounded-xl font-bold uppercase text-xs transition-all">
                            ⚠️ Kontenplan neu laden (Reset)
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- LAYOUT TAB --- */}
        {activeTab === 'layout' && (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                {(['quote', 'invoice'] as const).map(type => (
                    <div key={type} className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                        <h3 className="font-black uppercase text-sm mb-6 text-zinc-400 tracking-widest">{type === 'quote' ? 'Offerte Layout' : 'Rechnung Layout'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Einleitungstext (Standard)</label>
                                <textarea className="w-full border p-3 rounded-lg bg-zinc-50 h-32" value={settings.layouts[type].introText} onChange={e => setSettings({...settings, layouts: {...settings.layouts, [type]: {...settings.layouts[type], introText: e.target.value}}})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Fusszeile / Schlusstext</label>
                                <textarea className="w-full border p-3 rounded-lg bg-zinc-50 h-32" value={settings.layouts[type].outroText} onChange={e => setSettings({...settings, layouts: {...settings.layouts, [type]: {...settings.layouts[type], outroText: e.target.value}}})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Kleingedrucktes / AGB Schnipsel</label>
                                <input className="w-full border p-3 rounded-lg bg-zinc-50 text-xs" value={settings.layouts[type].termsSnippet} onChange={e => setSettings({...settings, layouts: {...settings.layouts, [type]: {...settings.layouts[type], termsSnippet: e.target.value}}})} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- TEAM TAB --- */}
        {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                    <div className="flex justify-between mb-6">
                        <h3 className="font-black uppercase text-sm text-zinc-400 tracking-widest">Benutzer & Rollen</h3>
                        <button className="text-[10px] font-bold uppercase bg-zinc-100 px-3 py-1 rounded hover:bg-zinc-200" onClick={() => {
                            setSettings({...settings, users: [...settings.users, {id: Date.now().toString(), name: 'Neu', role: 'worker', permissions: []}]})
                        }}>+ Benutzer</button>
                    </div>
                    
                    <div className="space-y-2">
                        {settings.users.map((user, idx) => (
                            <div key={user.id} className="flex items-center gap-4 p-4 border border-zinc-100 rounded-xl bg-zinc-50">
                                <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-500">
                                    {user.name.charAt(0)}
                                </div>
                                <input className="flex-1 bg-transparent border-b border-zinc-200 focus:border-black outline-none font-bold" value={user.name} onChange={e => {
                                    const newUsers = [...settings.users];
                                    newUsers[idx].name = e.target.value;
                                    setSettings({...settings, users: newUsers});
                                }} />
                                <select className="bg-white border p-2 rounded text-xs uppercase font-bold" value={user.role} onChange={e => {
                                    const newUsers = [...settings.users];
                                    newUsers[idx].role = e.target.value as any;
                                    setSettings({...settings, users: newUsers});
                                }}>
                                    <option value="admin">Administrator</option>
                                    <option value="accountant">Buchhaltung</option>
                                    <option value="worker">Mitarbeiter</option>
                                </select>
                                <button className="text-red-400 hover:text-red-600" onClick={() => {
                                    setSettings({...settings, users: settings.users.filter((_, i) => i !== idx)});
                                }}>×</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                    <h3 className="font-black uppercase text-sm mb-4 text-zinc-400 tracking-widest">Daten-Export</h3>
                    <p className="text-sm text-zinc-500 mb-4">Exportieren Sie alle Datenbank-Inhalte als JSON zur Sicherung oder Migration.</p>
                    <button onClick={handleBackup} className="w-full bg-zinc-900 text-white p-4 rounded-xl font-bold uppercase text-xs hover:bg-zinc-800 transition-all">
                        Vollständiges Backup Herunterladen
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default SettingsManager;
