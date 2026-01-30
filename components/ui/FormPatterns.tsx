
import React, { useMemo, useState } from "react";
import {
  TextInput,
  Select,
  TextArea,
  SearchableSelect,
  PhoneInput,
  SegmentedControl,
  MultiSelect,
} from "./Input";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { P, H4 } from "./Typography";

/**
 * FormPatterns
 * - Demos fuer echte Formular-Screens (Layout, State, Actions, Validierung)
 * - bewusst separat von components/ui/Input.tsx (Primitives)
 */

export const FormPatterns: React.FC = () => {
  const [status, setStatus] = useState<string | number>("draft");
  const [customerId, setCustomerId] = useState<string | null>("c-1");
  const [phone, setPhone] = useState("+41 79 123 45 67");
  const [docType, setDocType] = useState("offer");
  const [tags, setTags] = useState<string[]>(["vip", "renovation", "innen"]);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<{ customer?: string; title?: string }>({});
  const [title, setTitle] = useState("");

  const statusOptions = [
    { value: "draft", label: "Entwurf" },
    { value: "sent", label: "Gesendet" },
    { value: "accepted", label: "Angenommen" },
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

  const validate = () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Titel ist erforderlich";
    if (!customerId) next.customer = "Bitte Kunde auswählen";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const selectedTags = useMemo(() => tags.map((t) => tagOptions.find((o) => o.value === t)?.label || t), [tags]);

  return (
    <div className="space-y-10">
      {/* Pattern 1: Header + Form + Sticky Actions (visual) */}
      <div className="border border-zinc-200 rounded-3xl overflow-hidden bg-white shadow-sm">
        {/* Responsive Header: Stacks on mobile, row on desktop */}
        <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50 flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
          <div className="min-w-0">
            <H4>Pattern: Dokument erfassen</H4>
            <P className="mt-1 text-sm text-zinc-600">
              Echte Formularstruktur inkl. Validierung, Actions und Tag-Auswahl im Feld.
            </P>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge label="Draft" variant="neutral" />
              <Badge label="Stateful" variant="success" />
              <Badge label="Portal Popups" variant="neutral" />
            </div>
          </div>

          <div className="flex gap-2 flex-none w-full md:w-auto">
            <Button
              variant="outline"
              label="Zurücksetzen"
              className="flex-1 md:flex-none"
              onClick={() => {
                setStatus("draft");
                setCustomerId("c-1");
                setPhone("+41 79 123 45 67");
                setDocType("offer");
                setTags(["vip", "renovation", "innen"]);
                setNotes("");
                setTitle("");
                setErrors({});
              }}
            />
            <Button
              variant="solid"
              label="Speichern"
              className="flex-1 md:flex-none"
              onClick={() => {
                if (!validate()) return;
                alert("Gespeichert");
              }}
            />
          </div>
        </div>

        <form className="p-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Titel"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              placeholder="z.B. Offerte Malerarbeiten EG"
            />
            {/* Status ganz oben (am Containerrand) -> Dropup/Popup darf nicht abgeschnitten werden */}
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
          </div>

          <SearchableSelect
            label="Kunde"
            value={customerId}
            onSelect={setCustomerId}
            items={customerItems}
            placeholder="Kunde suchen..."
            error={errors.customer}
            onCreate={() => alert("Neu: Kunde erstellen")}
            onEdit={(id) => alert("Edit: " + id)}
            hint="Löschen via X im Feld."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhoneInput label="Telefonnummer" value={phone} onChange={setPhone} />
            <SegmentedControl
              label="Dokumenttyp"
              value={docType}
              onChange={setDocType}
              options={[
                { value: "offer", label: "Offerte" },
                { value: "invoice", label: "Rechnung" },
                { value: "credit", label: "Gutschrift" },
              ]}
            />
          </div>

          <MultiSelect
            label="Kategorientags"
            value={tags}
            onChange={setTags}
            options={tagOptions}
            maxBadgesInField={2}
            hint={selectedTags.length ? `Ausgewählt: ${selectedTags.join(", ")}` : "Keine Tags"}
          />

          <TextArea label="Notiz" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kurze Notiz..." />

          {/* Responsive Footer */}
          <div className="pt-4 border-t border-zinc-200 flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
            <P className="text-sm text-zinc-600">Autosave: aus (Demo)</P>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                label="Vorschau" 
                className="flex-1 md:flex-none"
                onClick={() => alert("Vorschau")} 
              />
              <Button
                variant="solid"
                label="Speichern"
                className="flex-1 md:flex-none"
                onClick={() => {
                  if (!validate()) return;
                  alert("Gespeichert");
                }}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Pattern 2: Compact Filter Bar inside Card */}
      <div className="border border-zinc-200 rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50">
          <H4>Pattern: Kompakte Filterleiste</H4>
          <P className="mt-1 text-sm text-zinc-600">
            Typisch für Listen/Tabellen: Filter in einer weißen Container-Card, Popups bleiben sichtbar.
          </P>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <TextInput label="Suche" placeholder="z.B. Müller, O-2025..." icon="🔎" />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
            <Button 
                variant="solid" 
                label="Anwenden" 
                fullWidth={true} 
                className="md:w-auto" // Full width on mobile (via default grid), auto on desktop
                onClick={() => alert("Filter angewendet")} 
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge label="Status: " variant="neutral" />
            <Badge label={String(status)} variant="success" />
          </div>
        </div>
      </div>
    </div>
  );
};
