
/**
 * DOCUMENT GUARD SERVICE - Dokumentenschutz & Compliance
 *
 * Implementiert:
 * - Status-basierte Bearbeitungssperren
 * - Löschschutz für nummerierte Dokumente
 * - Audit-Trail-Funktionalität
 * - GeBüV-konforme Dokumentenverarbeitung
 */

import { OfficeDocument, DocStatus, AuditEvent, DocType } from '../officeTypes';

// Status die ein Dokument unveränderlich machen
const LOCKED_STATUSES: DocStatus[] = ['sent', 'paid', 'accepted', 'cancelled'];

// Status die ein Löschen erlauben
const DELETABLE_STATUSES: DocStatus[] = ['draft'];

/**
 * Prüft ob ein Dokument bearbeitet werden darf
 */
export const canEditDocument = (doc: OfficeDocument): { allowed: boolean; reason?: string } => {
  if (!doc) {
    return { allowed: false, reason: 'Dokument nicht gefunden' };
  }

  if (LOCKED_STATUSES.includes(doc.status)) {
    const statusLabels: Record<DocStatus, string> = {
      draft: 'Entwurf',
      sent: 'Versendet',
      paid: 'Bezahlt',
      accepted: 'Angenommen',
      rejected: 'Abgelehnt',
      overdue: 'Überfällig',
      cancelled: 'Storniert'
    };

    return {
      allowed: false,
      reason: `Dokument mit Status "${statusLabels[doc.status]}" kann nicht mehr bearbeitet werden. ` +
              `Bitte erstellen Sie eine Korrektur oder Gutschrift.`
    };
  }

  return { allowed: true };
};

/**
 * Prüft ob ein Dokument gelöscht werden darf
 */
export const canDeleteDocument = (doc: OfficeDocument): { allowed: boolean; reason?: string } => {
  if (!doc) {
    return { allowed: false, reason: 'Dokument nicht gefunden' };
  }

  // Nur Entwürfe dürfen gelöscht werden
  if (!DELETABLE_STATUSES.includes(doc.status)) {
    return {
      allowed: false,
      reason: `Dokumente mit Status "${doc.status}" können nicht gelöscht werden. ` +
              `Gemäss GeBüV müssen verbuchte Belege aufbewahrt werden.`
    };
  }

  // Rechnungen mit fortlaufender Nummer dürfen nie gelöscht werden
  if (doc.type === 'invoice' && doc.docNumber && doc.id) {
    return {
      allowed: false,
      reason: `Rechnungen mit zugewiesener Nummer (${doc.docNumber}) dürfen nicht gelöscht werden. ` +
              `Dies würde die lückenlose Belegführung verletzen. Bitte stornieren Sie das Dokument stattdessen.`
    };
  }

  return { allowed: true };
};

/**
 * Prüft ob ein Status-Übergang erlaubt ist
 */
export const canChangeStatus = (
  doc: OfficeDocument,
  newStatus: DocStatus
): { allowed: boolean; reason?: string } => {
  if (!doc) {
    return { allowed: false, reason: 'Dokument nicht gefunden' };
  }

  const currentStatus = doc.status;

  // Erlaubte Übergänge
  const allowedTransitions: Record<DocStatus, DocStatus[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['accepted', 'rejected', 'paid', 'overdue', 'cancelled'],
    accepted: ['paid', 'cancelled'],
    rejected: [], // Endstatus
    overdue: ['paid', 'cancelled'],
    paid: [], // Endstatus
    cancelled: [] // Endstatus
  };

  const allowed = allowedTransitions[currentStatus]?.includes(newStatus) || false;

  if (!allowed) {
    return {
      allowed: false,
      reason: `Status-Übergang von "${currentStatus}" zu "${newStatus}" ist nicht erlaubt.`
    };
  }

  return { allowed: true };
};

/**
 * Erstellt einen Audit-Event
 */
export const createAuditEvent = (
  type: string,
  userName?: string,
  meta?: Record<string, any>
): AuditEvent => {
  return {
    ts: new Date().toISOString(),
    type,
    user: userName || 'System',
    meta
  };
};

/**
 * Fügt einen Audit-Event zum Dokument hinzu
 */
export const addAuditEvent = (
  doc: OfficeDocument,
  type: string,
  userName?: string,
  meta?: Record<string, any>
): OfficeDocument => {
  const event = createAuditEvent(type, userName, meta);
  return {
    ...doc,
    auditTrail: [...(doc.auditTrail || []), event]
  };
};

// Vordefinierte Audit-Event-Typen
export const AUDIT_EVENTS = {
  CREATED: 'DOCUMENT_CREATED',
  MODIFIED: 'DOCUMENT_MODIFIED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  SENT: 'DOCUMENT_SENT',
  PAID: 'PAYMENT_RECEIVED',
  CONVERTED: 'CONVERTED_FROM_QUOTE',
  DUNNING_SENT: 'DUNNING_SENT',
  CANCELLED: 'DOCUMENT_CANCELLED',
  PRINTED: 'DOCUMENT_PRINTED',
  EXPORTED: 'DOCUMENT_EXPORTED'
} as const;

/**
 * Hilfsfunktion: Dokument mit Audit-Trail erstellen
 */
export const initializeDocumentWithAudit = (
  doc: OfficeDocument,
  userName?: string
): OfficeDocument => {
  return addAuditEvent(doc, AUDIT_EVENTS.CREATED, userName, {
    docNumber: doc.docNumber,
    type: doc.type
  });
};

/**
 * Hilfsfunktion: Status ändern mit Audit-Trail
 */
export const changeStatusWithAudit = (
  doc: OfficeDocument,
  newStatus: DocStatus,
  userName?: string,
  additionalMeta?: Record<string, any>
): { success: boolean; document?: OfficeDocument; error?: string } => {
  const canChange = canChangeStatus(doc, newStatus);

  if (!canChange.allowed) {
    return { success: false, error: canChange.reason };
  }

  const oldStatus = doc.status;
  const updatedDoc = addAuditEvent(doc, AUDIT_EVENTS.STATUS_CHANGED, userName, {
    from: oldStatus,
    to: newStatus,
    ...additionalMeta
  });

  return {
    success: true,
    document: { ...updatedDoc, status: newStatus }
  };
};

/**
 * Validiert ein Dokument vor dem Speichern
 */
export const validateDocumentForSave = (
  doc: OfficeDocument
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Pflichtfelder prüfen
  if (!doc.docNumber) {
    errors.push('Dokumentnummer fehlt');
  }

  if (!doc.date) {
    errors.push('Dokumentdatum fehlt');
  }

  if (!doc.client?.name) {
    errors.push('Kundenname fehlt');
  }

  if (doc.type === 'invoice' && (!doc.items || doc.items.length === 0)) {
    errors.push('Rechnung muss mindestens eine Position enthalten');
  }

  // Betrag muss >= 0 sein
  if (doc.totalGross < 0) {
    errors.push('Gesamtbetrag darf nicht negativ sein');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Prüft ob das Dokument für den Versand bereit ist
 */
export const validateDocumentForSending = (
  doc: OfficeDocument
): { valid: boolean; errors: string[] } => {
  const baseValidation = validateDocumentForSave(doc);
  const errors = [...baseValidation.errors];

  if (doc.status !== 'draft') {
    errors.push('Nur Entwürfe können versendet werden');
  }

  if (!doc.client?.email && !doc.client?.street) {
    errors.push('Kundenadresse oder E-Mail für Versand erforderlich');
  }

  if (doc.totalGross === 0) {
    errors.push('Dokument mit Betrag CHF 0.00 kann nicht versendet werden');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
