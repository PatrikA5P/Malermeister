
import React, { useState, useMemo } from "react";
import { ModuleHeader, SearchToolbar, ActionBar } from "../../components/ui/Layouts";
import { Button } from "../../components/ui/Button";
import {
  TextInput,
  Select,
  TextArea,
  SearchableSelect,
  PhoneInput,
  RadioGroup,
  SegmentedControl,
  MultiSelect,
  FileUploadZone,
  SimpleSearchInput,
  SearchInputToolbar,
  SearchInputBig,
} from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Toast, ConfirmModal } from "../../components/ui/Feedback";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { MultiActionButton } from "../../components/ui/MultiActionButton";
import { H1, H2, H3, H4, P, Label, Mono, LinkText, FontDesigner } from "../../components/ui/Typography";
import { Table, TableColumn, BulkAction } from "../../components/ui/Table"; // Updated Import

// Complex Business Components
import { LineItemRow } from "../../components/ui/LineItemRow";
import { TotalsBlock } from "../../components/ui/TotalsBlock";
import { QuoteCard } from "../../components/ui/QuoteCard";

// Accounting Reports
import { JournalView, BalanceSheetView, IncomeStatementView } from "../accounting/AccountingReports";
import { LedgerBooking } from "../accounting/AccountingManager";
import { Account, AccountGroup, OfficeLineItem, OfficeDocument } from "../../officeTypes";

// Form Patterns (separates Demo from Primitives)
import { FormPatterns } from "../../components/ui/FormPatterns";

/* ---------------------------------- */
/* MOCK DATA                           */
/* ---------------------------------- */

const MOCK_ITEM: OfficeLineItem = {
  id: "li-1",
  productCode: "M-102",
  description: "Wandanstrich Wohnzimmer (Q3) inkl. Abdeckarbeiten",
  quantity: 45.5,
  unit: "m²",
  price: 18.5,
  discount: 10,
  vatRate: 8.1,
  type: "service",
  isOptional: false,
} as any;

const MOCK_DOC: OfficeDocument = {
  id: 101,
  docNumber: "O-2025-0042",
  date: "2025-01-18",
  status: "open",
  customerName: "Müller GmbH",
  client: { name: "Müller GmbH" }, // QuoteCard nutzt doc.client.name
  totalGross: 4520.5,
} as any;

const MOCK_ACCOUNTS: Account[] = [
  { id: 1000, number: "1000", name: "Kasse", groupId: 10 },
  { id: 1020, number: "1020", name: "Bank", groupId: 10 },
  { id: 3200, number: "3200", name: "Produktionserlös", groupId: 30 },
  { id: 2000, number: "2000", name: "Verbindlichkeiten", groupId: 20 },
] as any;

const MOCK_GROUPS: AccountGroup[] = [
  { id: 1, number: "1", name: "Aktiven" },
  { id: 10, number: "10", name: "Umlaufvermögen", parentGroupId: 1 },
  { id: 2, number: "2", name: "Passiven" },
  { id: 20, number: "20", name: "Kurzfr. Fremdkapital", parentGroupId: 2 },
  { id: 3, number: "3", name: "Betrieblicher Ertrag" },
  { id: 30, number: "30", name: "Produktionserlös", parentGroupId: 3 },
] as any;

const MOCK_LEDGER: LedgerBooking[] = [
  {
    id: "1",
    date: "2025-01-10",
    text: "Anzahlung Müller",
    debitAccountId: 1020,
    creditAccountId: 3200,
    debitAccountName: "Bank",
    creditAccountName: "Produktionserlös",
    amount: 5000,
    type: "invoice",
  },
] as any;

// Generiere 123 Einträge für Pagination Demo
const LARGE_TABLE_DATA = Array.from({ length: 123 }).map((_, i) => {
    const clients = ['Müller AG', 'Meier Hans', 'Hotel Löwen', 'Bäckerei Hug', 'Architekturbüro Zaugg', 'Immobilienverwaltung Plus'];
    const statuses = ['draft', 'sent', 'paid', 'rejected', 'overdue'];
    return {
        id: i + 1,
        docNumber: `O-2025-${String(i + 1).padStart(4, '0')}`,
        client: clients[i % clients.length],
        date: new Date(2025, 0, 1 + (i % 30)).toISOString().split('T')[0],
        total: 500 + (i * 123.45) % 15000,
        status: statuses[i % statuses.length]
    };
});

/* ---------------------------------- */
/* SECTION HELPER                      */
/* ---------------------------------- */

const FileSection = ({ filename, children }: { filename: string; children?: React.ReactNode }) => (
  <section className="mb-20 border border-zinc-200 rounded-3xl overflow-hidden shadow-sm bg-white">
    <div className="bg-zinc-100 px-6 py-4 border-b border-zinc-200 flex justify-between items-center">
      <code className="text-sm font-bold text-zinc-600 bg-white px-3 py-1 rounded border border-zinc-200 font-mono">
        {filename}
      </code>
      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Komponente</span>
    </div>
    <div className="p-6 md:p-8 space-y-8">{children}</div>
  </section>
);

const DesignShowcase: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Inputs (stateful)
  const [searchValue, setSearchValue] = useState("");
  const [selectValue, setSelectValue] = useState<string | number>("in_progress");
  const [customerId, setCustomerId] = useState<string | null>("c-2");
  const [phoneNumber, setPhoneNumber] = useState("+41 79 123 45 67");
  const [radioValue, setRadioValue] = useState("b2b");
  const [segment, setSegment] = useState("offer");
  const [multiSelectValue, setMultiSelectValue] = useState<string[]>(["vip", "verwaltung"]);
  const [notes, setNotes] = useState("");

  // Feedback
  const [showToast, setShowToast] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Business widgets
  const [items, setItems] = useState<OfficeLineItem[]>([MOCK_ITEM]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Table State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('all');

  const statusOptions = [
    { value: "in_progress", label: "In Bearbeitung" },
    { value: "sent", label: "Versendet" },
    { value: "paid", label: "Bezahlt" },
  ];

  const customerItems = [
    { value: "c-1", label: "Müller GmbH", description: "B2B, Basel" },
    { value: "c-2", label: "Alexandra Meier", description: "B2C, Liestal" },
    { value: "c-3", label: "Architekturbüro Kunz", description: "B2B, Zürich" },
  ];

  const tagOptions = [
    { value: "vip", label: "VIP Kunde" },
    { value: "verwaltung", label: "Immobilienverwaltung" },
    { value: "neubau", label: "Neubau" },
    { value: "renovation", label: "Renovation" },
    { value: "innen", label: "Innen" },
    { value: "aussen", label: "Aussen" },
  ];

  // Helper for Totals
  const calculateTotals = (items: OfficeLineItem[]) => {
    let net = 0;
    let vat = 0;
    items.forEach(item => {
        const q = Number(item.quantity || 0);
        const p = Number(item.price || 0);
        const d = Number(item.discount || 0);
        const lineNet = q * p * (1 - d / 100);
        const lineVat = lineNet * ((item.vatRate || 8.1) / 100);
        net += lineNet;
        vat += lineVat;
    });
    return { net, vat, gross: net + vat };
  };

  const totals = calculateTotals(items);

  // Table Logic
  const handleSort = (key: string) => {
      setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedData = useMemo(() => {
      // 1. Filter based on tab (Example)
      let data = [...LARGE_TABLE_DATA];
      if (activeTab === 'open') data = data.filter(d => d.status === 'draft' || d.status === 'sent');
      if (activeTab === 'done') data = data.filter(d => d.status === 'paid' || d.status === 'rejected');

      // 2. Sort
      return data.sort((a: any, b: any) => {
          if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
          if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [sortConfig, activeTab]);

  // Pagination Logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const tableColumns: TableColumn<typeof LARGE_TABLE_DATA[0]>[] = [
      { key: 'docNumber', label: 'Nummer', sortable: true, render: (row) => <span className="font-bold font-mono text-zinc-900">{row.docNumber}</span> },
      { key: 'date', label: 'Datum', sortable: true, width: '120px' },
      { key: 'client', label: 'Kunde', sortable: true },
      { key: 'status', label: 'Status', render: (row) => <Badge label={row.status} /> },
      { key: 'total', label: 'Betrag', align: 'right', sortable: true, render: (row) => <span className="font-bold text-zinc-900">CHF {row.total.toFixed(2)}</span> },
      { key: 'actions', label: '', align: 'right', width: '60px', render: () => (
          <MultiActionButton 
            mainIcon="⋮" 
            actions={[
                { label: 'Bearbeiten', onClick: () => alert('Edit') },
                { label: 'Löschen', onClick: () => alert('Delete'), variant: 'danger' }
            ]}
          />
      ) }
  ];

  // Bulk Actions
  const bulkActions: BulkAction[] = [
      { label: 'Löschen', onClick: () => alert('Delete selected'), variant: 'danger' },
      { label: 'Status ändern', onClick: () => alert('Change status'), icon: <span>📝</span> }
  ];

  // Mock Tabs for Header
  const HeaderTabs = (
      <div className="flex bg-zinc-100 p-1 rounded-xl mr-auto">
        {['all', 'open', 'done'].map(t => (
            <button 
                key={t}
                onClick={() => { setActiveTab(t); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === t ? 'bg-white shadow text-black' : 'text-zinc-500'}`}
            >
                {t}
            </button>
        ))}
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans">
      {/* GLOBAL HEADER */}
      <div className="bg-zinc-900 text-white p-6 sticky top-0 z-50 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest font-brand">Design System</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Referenz aller UI-Komponenten</p>
        </div>
        <Button variant="soft" onClick={onBack} label="Schliessen" />
      </div>

      {/* PAGE CONTENT */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-10">
        <div className="mb-12">
          <H1>UI Design Showcase</H1>
          <P className="mt-2">
            Diese Seite zeigt alle Komponenten im echten Kontext. Inputs sind in Formular-Containern, Dropdowns werden
            nicht durch Container abgeschnitten.
          </P>
        </div>

        {/* 9. LAYOUTS */}
        <FileSection filename="components/ui/Layouts.tsx">
          <ModuleHeader 
            title="Offerten" 
            subtitle="Übersicht und Verwaltung" 
            onBack={onBack} 
            stats={[{ value: totalItems, label: "Einträge" }, { value: "CHF 12k", label: "Offen" }]}
            actions={<Button variant="outline" icon="⬇" label="Export" />}
            moduleSelection={[
                { label: 'Offerten', onClick: () => alert('Offerten') },
                { label: 'Rechnungen', onClick: () => alert('Rechnungen') },
            ]}
          >
            <div className="mt-6 space-y-4">
                <SearchToolbar 
                    startAction={HeaderTabs}
                    placeholder="Suchen..." 
                    onNewClick={() => alert("Neu")} 
                    searchTerm={searchValue}
                    onSearchChange={setSearchValue}
                    onFilterClick={() => alert("Filter")}
                />
            </div>
          </ModuleHeader>
          
          <div className="mt-8">
            <ActionBar
              onCancel={() => alert("Cancel")}
              onSave={() => alert("Save")}
            >
                <Badge label="12 Einträge" variant="neutral" />
                <Button variant="outline" label="Mehr" onClick={() => alert("Mehr")} />
            </ActionBar>
          </div>
        </FileSection>

        {/* 10. TABLE */}
        <FileSection filename="components/ui/Table.tsx">
            <Table 
                columns={tableColumns} 
                data={paginatedData} 
                rowKey="id"
                sortConfig={sortConfig}
                onSort={handleSort}
                selectedIds={selectedIds}
                onSelectRow={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                }}
                onSelectAll={(ids) => setSelectedIds(new Set(ids))}
                
                // Pagination Props
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
                
                bulkActions={bulkActions}
            />
        </FileSection>

        {/* 1. TYPOGRAPHY */}
        <FileSection filename="components/ui/Typography.tsx">
          <div className="space-y-6">
            <div>
              <H1>Heading 1</H1>
              <H2 className="mt-3">Heading 2</H2>
              <H3 className="mt-3">Heading 3</H3>
              <H4 className="mt-3">Heading 4</H4>
              <P className="mt-3">
                Dies ist ein Absatz. <LinkText>Dies ist ein Link</LinkText>.
              </P>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
                <Label>Label</Label>
                <P className="mt-2 text-sm text-zinc-600">
                  Labels werden für kleine Bezeichnungen verwendet.
                </P>
              </div>
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
                <Mono>Monospace</Mono>
                <P className="mt-2 text-sm text-zinc-600">
                  Monospace für Code, IDs, Dateinamen.
                </P>
              </div>
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
                <P className="text-sm text-zinc-600">Badges</P>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge label="Neutral" variant="neutral" />
                  <Badge label="Success" variant="success" />
                  <Badge label="Warning" variant="warning" />
                  <Badge label="Danger" variant="danger" />
                </div>
              </div>
            </div>

            <FontDesigner />
          </div>
        </FileSection>

        {/* 2. BUTTONS */}
        <FileSection filename="components/ui/Button.tsx">
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="solid" label="Solid" />
            <Button variant="soft" label="Soft" />
            <Button variant="outline" label="Outline" />
            <Button variant="ghost" label="Ghost" />
            <Button variant="destructive" label="Destructive" />
            <div className="h-8 w-px bg-zinc-200 mx-2" />
            <Button variant="icon" icon="⚙️" />
            <Button variant="menu" icon="⋮" />
          </div>
        </FileSection>

        {/* 3. BADGES */}
        <FileSection filename="components/ui/Badge.tsx">
          <div className="flex flex-wrap gap-3 items-center">
            <Badge label="Neutral" variant="neutral" />
            <Badge label="Success" variant="success" />
            <Badge label="Warning" variant="warning" />
            <Badge label="Danger" variant="danger" />
            <Badge label="Pending" variant="info" />
          </div>
        </FileSection>

        {/* 4. INPUTS */}
        <FileSection filename="components/ui/Input.tsx">
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* BASIC INPUTS */}
              <div className="space-y-4">
                <H4>Basic Inputs</H4>

                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextInput label="Vorname" required placeholder="z.B. Patrik" />
                      <TextInput label="Nachname" required placeholder="z.B. Chavez" />
                    </div>

                    <TextInput label="E-Mail" icon="✉️" placeholder="name@domain.ch" />
                    <TextInput label="Validierung" error="Dieses Feld ist erforderlich" defaultValue="" />
                    <TextArea
                      label="Notiz"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Kurze Notiz..."
                    />
                  </form>
                </div>

                <div className="bg-zinc-100 p-4 rounded-xl">
                  <SearchInputToolbar placeholder="Toolbar Search..." />
                </div>
                <SearchInputBig placeholder="Big Search..." />
              </div>

              {/* ADVANCED INPUTS */}
              <div className="space-y-4">
                <H4>Advanced Inputs</H4>

                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <Select
                      label="Status"
                      value={selectValue}
                      onChange={(e) => setSelectValue(e.target.value)}
                      options={statusOptions}
                      placeholder="Bitte wählen..."
                    />

                    <SearchableSelect
                      label="Kunde"
                      value={customerId}
                      onSelect={setCustomerId}
                      items={customerItems}
                      placeholder="Kunde suchen..."
                      onCreate={() => alert("Neu: Kunde erstellen")}
                      onEdit={(id) => alert("Edit: " + id)}
                    />

                    <PhoneInput
                      label="Telefonnummer"
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      onCall={(e164) => alert("Anruf: " + e164)}
                    />

                    <RadioGroup
                      label="Kundenprofil"
                      value={radioValue}
                      onChange={setRadioValue}
                      options={[
                        { value: "b2b", label: "Geschäftskunde (B2B)", description: "Verwaltung, Architekt, Firma" },
                        { value: "b2c", label: "Privatkunde (B2C)", description: "Wohnung, Haus, Einfamilienhaus" },
                      ]}
                      hint="RadioGroup bleibt ruhig, nur das Innenrund markiert den aktiven Wert."
                    />

                    <SegmentedControl
                      label="Dokumenttyp"
                      value={segment}
                      onChange={setSegment}
                      options={[
                        { value: "offer", label: "Offerte" },
                        { value: "invoice", label: "Rechnung" },
                        { value: "credit", label: "Gutschrift" },
                      ]}
                      hint="Aktiver Button ist gefuellt, Ausrichtung links."
                    />

                    <MultiSelect
                      label="Kategorientags"
                      value={multiSelectValue}
                      onChange={setMultiSelectValue}
                      options={tagOptions}
                      placeholder="Tags wählen..."
                      maxBadgesInField={2}
                      hint="Auswahl wird im Feld als Badges angezeigt. Bei zu vielen erscheint + n."
                    />
                  </form>
                </div>

                <div className="space-y-3">
                  <H4>Special Inputs</H4>
                  <SimpleSearchInput
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="Simple Search..."
                    onClear={() => setSearchValue("")}
                  />
                  <FileUploadZone label="Dateiupload" hint="Drag & Drop oder klicken" onFileSelect={() => {}} />
                </div>
              </div>
            </div>
          </div>
        </FileSection>

        {/* 4b. FORM PATTERNS (separates file) */}
        <FileSection filename="modules/design-system/FormPatterns.tsx">
          <FormPatterns />
        </FileSection>

        {/* 5. CARDS */}
        <FileSection filename="components/ui/Card.tsx">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Card Titel" subtitle="Kurze Beschreibung">
              <P className="text-sm text-zinc-600">Card Content</P>
            </Card>
            <Card title="Card mit Badge" subtitle="Optional">
              <div className="flex gap-2">
                <Badge label="Neu" variant="success" />
                <Badge label="Draft" variant="neutral" />
              </div>
            </Card>
            <Card title="Card Aktionen" subtitle="Buttons etc.">
              <div className="flex gap-2">
                <Button variant="solid" label="Speichern" />
                <Button variant="outline" label="Abbrechen" />
              </div>
            </Card>
          </div>
        </FileSection>

        {/* 6. FEEDBACK */}
        <FileSection filename="components/ui/Feedback.tsx">
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="solid" label="Toast" onClick={() => setShowToast(true)} />
            <Button variant="outline" label="Confirm" onClick={() => setShowConfirm(true)} />
          </div>

          {showToast ? <Toast type="success" message="Gespeichert" onClose={() => setShowToast(false)} /> : null}

          {showConfirm ? (
            <ConfirmModal
              title="Wirklich löschen?"
              message="Diese Aktion kann nicht rückgängig gemacht werden."
              confirmLabel="Löschen"
              cancelLabel="Abbrechen"
              onCancel={() => setShowConfirm(false)}
              onConfirm={() => {
                setShowConfirm(false);
                setShowToast(true);
              }}
            />
          ) : null}
        </FileSection>

        {/* 7. ACTION MENU */}
        <FileSection filename="components/ui/ActionMenu.tsx">
          <ActionMenu
            trigger={<Button variant="outline" label="Aktionen" icon="⋮" />}
            items={[
              { label: "Bearbeiten", icon: "✏️", onClick: () => alert("Bearbeiten") },
              { label: "Duplizieren", icon: "📋", onClick: () => alert("Duplizieren") },
              { label: "Löschen", icon: "🗑️", onClick: () => alert("Löschen"), variant: "danger" },
            ]}
          />
        </FileSection>

        {/* 8. MULTI ACTION BUTTON */}
        <FileSection filename="components/ui/MultiActionButton.tsx">
          <MultiActionButton
            mainLabel="Erstellen"
            actions={[
              { label: "Neue Offerte", icon: <span className="text-lg">📄</span>, onClick: () => alert("Neue Offerte") },
              { label: "Neue Rechnung", icon: <span className="text-lg">💶</span>, onClick: () => alert("Neue Rechnung") },
              { label: "Neue Gutschrift", icon: <span className="text-lg">↩️</span>, onClick: () => alert("Neue Gutschrift") },
            ]}
          />
        </FileSection>

        {/* 11. BUSINESS COMPONENTS */}
        <FileSection filename="components/ui/LineItemRow.tsx">
          <div className="space-y-4">
            {items.map((it, idx) => (
              <LineItemRow
                key={it.id || idx}
                item={it as any}
                index={idx}
                isExpanded={expandedId === it.id}
                onToggle={() => setExpandedId(expandedId === it.id ? null : it.id)}
                onChange={(id, field, val) => {
                  setItems((prev) => {
                    const next = [...prev];
                    const index = next.findIndex(i => i.id === id);
                    if (index > -1) {
                        next[index] = { ...next[index], [field]: val } as any;
                    }
                    return next;
                  });
                }}
                onDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
              />
            ))}
            <Button
              variant="outline"
              label="Zeile hinzufügen"
              onClick={() => setItems((prev) => [...prev, { ...MOCK_ITEM, id: `li-${prev.length + 1}` } as any])}
            />
          </div>
        </FileSection>

        <FileSection filename="components/ui/TotalsBlock.tsx">
          <TotalsBlock totalNet={totals.net} totalVat={totals.vat} totalGross={totals.gross} />
        </FileSection>

        <FileSection filename="components/ui/QuoteCard.tsx">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuoteCard doc={{ ...MOCK_DOC, status: "open" } as any} onClick={() => {}} />
            <QuoteCard doc={{ ...MOCK_DOC, status: "paid" } as any} onClick={() => {}} />
          </div>
        </FileSection>

        {/* 12. ACCOUNTING REPORTS */}
        <FileSection filename="modules/accounting/AccountingReports.tsx">
          <div className="space-y-10">
            <div>
              <H3>Journal</H3>
              <div className="mt-4 bg-white border border-zinc-200 rounded-2xl p-4">
                <JournalView ledger={MOCK_LEDGER as any} />
              </div>
            </div>

            <div>
              <H3>Bilanz</H3>
              <div className="mt-4 bg-white border border-zinc-200 rounded-2xl p-4">
                <BalanceSheetView 
                    accounts={MOCK_ACCOUNTS as any} 
                    groups={MOCK_GROUPS as any} 
                    ledger={MOCK_LEDGER as any} 
                    onSelectAccount={(id) => alert("Go to account: " + id)}
                />
              </div>
            </div>

            <div>
              <H3>Erfolgsrechnung</H3>
              <div className="mt-4 bg-white border border-zinc-200 rounded-2xl p-4">
                <IncomeStatementView 
                    accounts={MOCK_ACCOUNTS as any} 
                    groups={MOCK_GROUPS as any} 
                    ledger={MOCK_LEDGER as any} 
                    onSelectAccount={(id) => alert("Go to account: " + id)}
                />
              </div>
            </div>
          </div>
        </FileSection>
      </div>
    </div>
  );
};

export default DesignShowcase;
