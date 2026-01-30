
import QRCode from 'qrcode';
import { OfficeDocument, OfficeSettings } from '../officeTypes';
import { roundToCurrency, generateQrReference, isQrIban, validateSwissIBAN } from './calculationService';

/**
 * SWISS QR-BILL SERVICE
 *
 * Implementiert gemäss "Swiss Payment Standards 2022"
 * und "Swiss QR Code Implementation Guidelines v2.3"
 *
 * Referenzen:
 * - QRR: QR-Referenz (27 Stellen) - nur mit QR-IBAN
 * - SCOR: Creditor Reference (ISO 11649) - mit normaler IBAN
 * - NON: Ohne Referenz - nur wenn weder QRR noch SCOR
 */

export type QrReferenceType = 'QRR' | 'SCOR' | 'NON';

export interface QrBillData {
  qrType: 'SPC';
  version: '0200';
  coding: '1';
  iban: string;
  creditorAddressType: 'K' | 'S';
  creditorName: string;
  creditorStreet: string;
  creditorBuildingNumber: string;
  creditorPostalCode: string;
  creditorCity: string;
  creditorCountry: string;
  ultimateCreditorAddressType: string;
  ultimateCreditorName: string;
  ultimateCreditorStreet: string;
  ultimateCreditorBuildingNumber: string;
  ultimateCreditorPostalCode: string;
  ultimateCreditorCity: string;
  ultimateCreditorCountry: string;
  amount: string;
  currency: string;
  debtorAddressType: 'K' | 'S';
  debtorName: string;
  debtorStreet: string;
  debtorBuildingNumber: string;
  debtorPostalCode: string;
  debtorCity: string;
  debtorCountry: string;
  referenceType: QrReferenceType;
  reference: string;
  unstructuredMessage: string;
  trailer: 'EPD';
  billingInformation: string;
  alternativeScheme1: string;
  alternativeScheme2: string;
}

/**
 * Bestimmt den korrekten Referenztyp basierend auf IBAN
 */
const determineReferenceType = (iban: string, hasReference: boolean): QrReferenceType => {
  if (isQrIban(iban)) {
    return 'QRR'; // QR-IBAN erfordert QR-Referenz
  }
  if (hasReference) {
    return 'SCOR'; // Normale IBAN mit Creditor Reference
  }
  return 'NON'; // Keine strukturierte Referenz
};

/**
 * Formatiert eine IBAN für die Anzeige (mit Leerzeichen)
 */
export const formatIban = (iban: string): string => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
};

/**
 * Bereinigt einen String für das QR-Code-Format
 * Entfernt ungültige Zeichen und kürzt auf max Länge
 */
const sanitizeQrField = (value: string | undefined, maxLength: number): string => {
  if (!value) return '';
  // Entferne ungültige Zeichen (nur Latin-1 Subset erlaubt)
  const cleaned = value
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim()
    .substring(0, maxLength);
  return cleaned;
};

/**
 * Generiert den Swiss QR Code String gemäss Implementation Guidelines
 */
export const generateSwissQRString = (doc: OfficeDocument, settings: OfficeSettings): string => {
  // IBAN auswählen (QR-IBAN bevorzugt)
  const iban = (settings.qrIban || settings.iban || '').replace(/\s/g, '').toUpperCase();

  if (!iban) {
    console.error('[QR] Keine IBAN konfiguriert');
    return '';
  }

  // IBAN validieren
  if (!validateSwissIBAN(iban)) {
    console.warn('[QR] IBAN-Validierung fehlgeschlagen:', iban);
  }

  // Referenztyp und Referenz bestimmen
  const useQrReference = isQrIban(iban);
  const referenceType = determineReferenceType(iban, useQrReference);

  let reference = '';
  if (referenceType === 'QRR') {
    // QR-Referenz aus Rechnungsnummer generieren
    reference = generateQrReference(doc.docNumber);
  } else if (referenceType === 'SCOR') {
    // SCOR-Referenz (ISO 11649) - vereinfacht
    const numericPart = doc.docNumber.replace(/[^0-9]/g, '').padStart(21, '0');
    reference = `RF00${numericPart}`.substring(0, 25);
  }

  // Betrag runden (CHF auf 0.05, EUR auf 0.01)
  const currency = doc.currency || 'CHF';
  const roundedAmount = roundToCurrency(doc.totalGross, currency);
  const amountStr = roundedAmount > 0 ? roundedAmount.toFixed(2) : '';

  // Adressdaten aufbereiten
  const creditorStreetAndNr = `${settings.address.street}${settings.address.houseNr ? ' ' + settings.address.houseNr : ''}`;
  const creditorZipCity = `${settings.address.zip} ${settings.address.city}`;

  const debtorStreetAndNr = `${doc.client.street}${doc.client.houseNr ? ' ' + doc.client.houseNr : ''}`;
  const debtorZipCity = `${doc.client.zip} ${doc.client.city}`;

  // QR-Daten zusammenstellen (31 Felder, durch Zeilenumbruch getrennt)
  const data: string[] = [
    'SPC',                                                    // QR Type
    '0200',                                                   // Version
    '1',                                                      // Coding Type (UTF-8)
    sanitizeQrField(iban, 21),                               // Account (IBAN)
    'K',                                                      // Creditor Address Type (K=Combined)
    sanitizeQrField(settings.companyName, 70),               // Creditor Name
    sanitizeQrField(creditorStreetAndNr, 70),                // Creditor Street + Nr
    sanitizeQrField(creditorZipCity, 70),                    // Creditor Postal Code + City
    '',                                                       // (Reserved)
    '',                                                       // (Reserved)
    settings.address.country || 'CH',                         // Creditor Country
    '',                                                       // Ultimate Creditor Address Type
    '',                                                       // Ultimate Creditor Name
    '',                                                       // Ultimate Creditor Street
    '',                                                       // Ultimate Creditor Postal Code + City
    '',                                                       // (Reserved)
    '',                                                       // Ultimate Creditor Country
    amountStr,                                                // Amount
    currency,                                                 // Currency
    'K',                                                      // Debtor Address Type
    sanitizeQrField(doc.client.name, 70),                    // Debtor Name
    sanitizeQrField(debtorStreetAndNr, 70),                  // Debtor Street + Nr
    sanitizeQrField(debtorZipCity, 70),                      // Debtor Postal Code + City
    '',                                                       // (Reserved)
    doc.client.country || 'CH',                              // Debtor Country
    referenceType,                                            // Reference Type (QRR/SCOR/NON)
    reference,                                                // Reference
    sanitizeQrField(doc.notes || `Rechnung ${doc.docNumber}`, 140),  // Unstructured Message
    'EPD',                                                    // Trailer
    '',                                                       // Billing Information
    ''                                                        // Alternative Scheme Parameters
  ];

  // Zusammenfügen mit CRLF (Windows-Zeilenumbruch ist Standard)
  return data.join('\r\n');
};

/**
 * Validiert einen Swiss QR String
 */
export const validateSwissQRString = (qrString: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const lines = qrString.split(/\r?\n/);

  if (lines.length < 28) {
    errors.push(`Zu wenige Felder: ${lines.length} statt mindestens 28`);
  }

  if (lines[0] !== 'SPC') {
    errors.push(`Ungültiger QR-Type: ${lines[0]}`);
  }

  if (lines[1] !== '0200') {
    errors.push(`Ungültige Version: ${lines[1]}`);
  }

  if (lines[27] !== 'EPD') {
    errors.push(`Ungültiger Trailer: ${lines[27]}`);
  }

  const referenceType = lines[25];
  const reference = lines[26];

  if (referenceType === 'QRR' && (reference.length !== 27 || !/^\d+$/.test(reference))) {
    errors.push(`Ungültige QR-Referenz: ${reference} (muss 27 Ziffern sein)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Generiert QR-Code als Data URL
 */
export const generateQRCodeDataUrl = async (
  text: string,
  options: { width?: number; margin?: number; errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' } = {}
): Promise<string> => {
  if (!text) return '';

  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      width: options.width || 166, // Swiss QR: 46mm × 46mm ≈ 166px at 92 DPI
      margin: options.margin || 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('[QR] Fehler bei Code-Generierung:', err);
    return '';
  }
};

/**
 * Generiert den vollständigen QR-Code für eine Rechnung
 */
export const generateInvoiceQRCode = async (
  doc: OfficeDocument,
  settings: OfficeSettings
): Promise<{ dataUrl: string; qrString: string; reference: string; valid: boolean; errors: string[] }> => {
  const qrString = generateSwissQRString(doc, settings);

  if (!qrString) {
    return {
      dataUrl: '',
      qrString: '',
      reference: '',
      valid: false,
      errors: ['QR-String konnte nicht generiert werden']
    };
  }

  const validation = validateSwissQRString(qrString);
  const dataUrl = await generateQRCodeDataUrl(qrString);

  // Referenz aus QR-String extrahieren
  const lines = qrString.split(/\r?\n/);
  const reference = lines[26] || '';

  return {
    dataUrl,
    qrString,
    reference,
    valid: validation.valid,
    errors: validation.errors
  };
};
