
import React, { useState } from 'react';
import { Customer } from '../../officeTypes';
import { InputGroup, InputWithAction, PhoneInput, SectionHeader } from '../../components/FormComponents';
import { LANGUAGES, SALUTATIONS, CORRESPONDENCE_TYPES } from '../../officeConstants';

interface CustomerEditorProps {
    initialCustomer: Customer;
    onSave: (customer: Customer) => void;
    onCancel: () => void;
}

const CustomerEditor: React.FC<CustomerEditorProps> = ({ initialCustomer, onSave, onCancel }) => {
    const [editing, setEditing] = useState<Customer>(initialCustomer);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        if (editing.type === 'business' && !editing.companyName?.trim()) {
            newErrors.companyName = 'Firmenname ist Pflichtfeld';
        }
        if (editing.type === 'private' && !editing.lastName?.trim()) {
            newErrors.lastName = 'Nachname ist Pflichtfeld';
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (editing.address?.email && !emailRegex.test(editing.address.email)) {
            newErrors.email = 'Ungültiges E-Mail Format';
        }
        if (editing.address?.email2 && !emailRegex.test(editing.address.email2)) {
            newErrors.email2 = 'Ungültiges E-Mail Format';
        }

        if (editing.birthday) {
            const bday = new Date(editing.birthday);
            if (bday > new Date()) {
                newErrors.birthday = 'Geburtstag kann nicht in der Zukunft liegen';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) {
            alert("Bitte überprüfen Sie die Eingabefelder.");
            return;
        }
        onSave(editing);
    };

    const handleTypeChange = (newType: 'private' | 'business') => {
        setEditing({
            ...editing, 
            type: newType,
            salutation: newType === 'business' ? 'Firma' : 'Herr'
        });
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                     <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors">←</button>
                     <div>
                        <h2 className="text-xl font-black brand-font uppercase">{editing.id ? 'Bearbeiten' : 'Neuer Kontakt'}</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{editing.type === 'business' ? 'Firma' : 'Privatperson'}</p>
                     </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                
                {/* 1. STAMMDATEN */}
                <SectionHeader title="Stammdaten" />
                
                <div className="space-y-4">
                    <div className="flex bg-zinc-50 rounded-xl p-1 border border-zinc-200">
                        <button onClick={() => handleTypeChange('private')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${editing.type === 'private' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Privat</button>
                        <button onClick={() => handleTypeChange('business')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${editing.type === 'business' ? 'bg-white shadow text-black' : 'text-zinc-400'}`}>Firma</button>
                    </div>

                    <InputGroup label="Kontakt Nr.">
                        <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-mono text-sm" value={editing.contactNr || ''} onChange={e => setEditing({...editing, contactNr: e.target.value})} placeholder="0001" />
                    </InputGroup>

                    {editing.type === 'business' && (
                        <InputGroup label="Firmenname" error={errors.companyName}>
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold focus:bg-white focus:border-olive-500 text-lg" value={editing.companyName || ''} onChange={e => setEditing({...editing, companyName: e.target.value})} placeholder="Firmenname AG" />
                        </InputGroup>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Anrede">
                            <select 
                                className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" 
                                value={editing.salutation || ''} 
                                onChange={e => setEditing({...editing, salutation: e.target.value})}
                                disabled={editing.type === 'business'}
                            >
                                {editing.type === 'business' ? (
                                    <option value="Firma">Firma</option>
                                ) : (
                                    SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)
                                )}
                            </select>
                        </InputGroup>
                        <InputGroup label="Anredeform">
                            <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.formOfAddress || 'Sie'} onChange={e => setEditing({...editing, formOfAddress: e.target.value as any})}>
                                <option value="Sie">Sie (Förmlich)</option>
                                <option value="Du">Du (Persönlich)</option>
                            </select>
                        </InputGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Vorname">
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.firstName || ''} onChange={e => setEditing({...editing, firstName: e.target.value})} />
                        </InputGroup>
                        <InputGroup label="Nachname" error={errors.lastName}>
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.lastName || ''} onChange={e => setEditing({...editing, lastName: e.target.value})} />
                        </InputGroup>
                    </div>

                    <InputGroup label="Geburtstag" error={errors.birthday}>
                        <input type="date" className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.birthday || ''} onChange={e => setEditing({...editing, birthday: e.target.value})} />
                    </InputGroup>
                </div>

                {/* 2. ADRESSE */}
                <SectionHeader title="Adresse" />
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-9">
                            <InputGroup label="Strasse">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.street || ''} onChange={e => setEditing({...editing, address: {...editing.address, street: e.target.value}})} placeholder="Musterstrasse" />
                            </InputGroup>
                        </div>
                        <div className="col-span-3">
                            <InputGroup label="Nr.">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.houseNr || ''} onChange={e => setEditing({...editing, address: {...editing.address, houseNr: e.target.value}})} placeholder="10a" />
                            </InputGroup>
                        </div>
                    </div>
                    
                    <InputGroup label="Adresszusatz">
                        <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.addition || ''} onChange={e => setEditing({...editing, address: {...editing.address, addition: e.target.value}})} placeholder="c/o oder Gebäude" />
                    </InputGroup>

                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <InputGroup label="PLZ">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.zip || ''} onChange={e => setEditing({...editing, address: {...editing.address, zip: e.target.value}})} placeholder="8000" />
                            </InputGroup>
                        </div>
                        <div className="col-span-8">
                            <InputGroup label="Ort">
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.city || ''} onChange={e => setEditing({...editing, address: {...editing.address, city: e.target.value}})} placeholder="Zürich" />
                            </InputGroup>
                        </div>
                    </div>

                    <InputGroup label="Land">
                        <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.address.country || 'Schweiz'} onChange={e => setEditing({...editing, address: {...editing.address, country: e.target.value}})} />
                    </InputGroup>
                </div>

                {/* 3. KOMMUNIKATION */}
                <SectionHeader title="Kommunikation" />
                <div className="space-y-4">
                    <InputGroup label="E-Mail" error={errors.email}>
                        <InputWithAction value={editing.address.email} onChange={v => setEditing({...editing, address: {...editing.address, email: v}})} type="email" placeholder="name@example.com" actionType="email" />
                    </InputGroup>
                    <InputGroup label="E-Mail 2" error={errors.email2}>
                        <InputWithAction value={editing.address.email2} onChange={v => setEditing({...editing, address: {...editing.address, email2: v}})} type="email" placeholder="sekretariat@example.com" actionType="email" />
                    </InputGroup>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Telefon">
                            <PhoneInput value={editing.address.phone} onChange={v => setEditing({...editing, address: {...editing.address, phone: v}})} />
                        </InputGroup>
                        <InputGroup label="Telefon 2">
                            <PhoneInput value={editing.address.phone2} onChange={v => setEditing({...editing, address: {...editing.address, phone2: v}})} />
                        </InputGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Mobile">
                            <PhoneInput value={editing.address.mobile} onChange={v => setEditing({...editing, address: {...editing.address, mobile: v}})} />
                        </InputGroup>
                        <InputGroup label="Fax">
                            <PhoneInput value={editing.address.fax} onChange={v => setEditing({...editing, address: {...editing.address, fax: v}})} />
                        </InputGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Website">
                            <InputWithAction value={editing.address.website} onChange={v => setEditing({...editing, address: {...editing.address, website: v}})} placeholder="www.firma.ch" actionType="link" />
                        </InputGroup>
                        <InputGroup label="Skype / Teams">
                            <InputWithAction value={editing.address.skype} onChange={v => setEditing({...editing, address: {...editing.address, skype: v}})} placeholder="Skype ID" />
                        </InputGroup>
                    </div>
                </div>

                {/* 4. ZUSATZINFORMATIONEN */}
                <SectionHeader title="Zusatzinformationen" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Kategorie">
                            <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.category || ''} onChange={e => setEditing({...editing, category: e.target.value})}>
                                <option value="">Wählen...</option>
                                <option value="A-Kunde">A-Kunde (VIP)</option>
                                <option value="B-Kunde">B-Kunde</option>
                                <option value="C-Kunde">C-Kunde</option>
                                <option value="Verwaltung">Verwaltung</option>
                                <option value="Architekt">Architekt</option>
                                <option value="Lieferant">Lieferant</option>
                            </select>
                        </InputGroup>
                        <InputGroup label="Branche">
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.industry || ''} onChange={e => setEditing({...editing, industry: e.target.value})} placeholder="z.B. Immobilien" />
                        </InputGroup>
                    </div>

                    <InputGroup label="Ansprechpartner (Intern/Extern)">
                        <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.contactPerson || ''} onChange={e => setEditing({...editing, contactPerson: e.target.value})} />
                    </InputGroup>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Korrespondenz">
                            <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.correspondenceType || 'email'} onChange={e => setEditing({...editing, correspondenceType: e.target.value as any})}>
                                {CORRESPONDENCE_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </InputGroup>
                        <InputGroup label="Sprache">
                            <select className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.language || 'Deutsch'} onChange={e => setEditing({...editing, language: e.target.value})}>
                                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </InputGroup>
                    </div>

                    <InputGroup label="Bemerkungen">
                        <textarea className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm h-24 resize-none" value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} placeholder="Interne Notizen..." />
                    </InputGroup>
                </div>

                {/* 5. WEITERE KONTAKTINFORMATIONEN */}
                <SectionHeader title="Weitere Kontaktinformationen" />
                <div className="space-y-4 pb-20">
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Anzahl Mitarbeitende">
                            <input type="number" className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.employeeCount || ''} onChange={e => setEditing({...editing, employeeCount: parseInt(e.target.value)})} />
                        </InputGroup>
                        <InputGroup label="Handelsregister-Nr.">
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.hrNumber || ''} onChange={e => setEditing({...editing, hrNumber: e.target.value})} />
                        </InputGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="MWST-Nummer">
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.vatNumber || ''} onChange={e => setEditing({...editing, vatNumber: e.target.value})} placeholder="CHE-..." />
                        </InputGroup>
                        <InputGroup label="Umsatzsteuer-ID">
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 outline-none font-bold text-sm" value={editing.taxId || ''} onChange={e => setEditing({...editing, taxId: e.target.value})} />
                        </InputGroup>
                    </div>
                </div>

            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-zinc-100 flex gap-4 bg-white z-40">
                <button onClick={onCancel} className="flex-1 bg-zinc-100 text-zinc-500 py-4 rounded-xl font-bold uppercase text-xs hover:bg-zinc-200 transition-colors">Abbrechen</button>
                <button onClick={handleSave} className="flex-1 bg-olive-600 text-white py-4 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-olive-700 transition-colors">Speichern</button>
            </div>
        </div>
    );
};

export default CustomerEditor;
