
import { BankTransaction } from '../officeTypes';

/**
 * CAMT.053 PARSER SERVICE
 *
 * Parst ISO 20022 CAMT.053 (Bank to Customer Statement) XML-Dateien
 * Unterstützt Schweizer Bankformate inkl. QR-Referenzen
 */

/**
 * Extrahiert Text aus einem XML-Element sicher
 */
const getElementText = (parent: Element | null, tagName: string): string => {
  if (!parent) return '';
  const element = parent.getElementsByTagName(tagName)[0];
  return element?.textContent?.trim() || '';
};

/**
 * Extrahiert eine eindeutige Transaktions-ID aus dem CAMT-XML
 * Nutzt AcctSvcrRef oder kombiniert Datum/Betrag/Referenz
 */
const extractTransactionId = (entry: Element): string => {
  // Primär: Account Servicer Reference
  const acctSvcrRef = getElementText(entry, 'AcctSvcrRef');
  if (acctSvcrRef) return acctSvcrRef;

  // Sekundär: Entry Reference
  const entryRef = getElementText(entry, 'NtryRef');
  if (entryRef) return entryRef;

  // Fallback: Hash aus Datum + Betrag + Details
  const bookingDate = getElementText(entry.getElementsByTagName('BookgDt')[0], 'Dt');
  const amount = getElementText(entry, 'Amt');
  const details = getElementText(entry, 'AddtlNtryInf');

  return `${bookingDate}-${amount}-${details.substring(0, 20)}`.replace(/[^a-zA-Z0-9-]/g, '');
};

/**
 * Extrahiert QR-Referenz aus den Transaktionsdetails
 * Schweizer QR-Referenz: 27 Ziffern
 */
const extractQrReference = (entry: Element): string | undefined => {
  // Suche in RmtInf/Strd/CdtrRefInf/Ref
  const txDtls = entry.getElementsByTagName('TxDtls')[0];
  if (txDtls) {
    const strdRef = txDtls.getElementsByTagName('Strd')[0];
    if (strdRef) {
      const ref = getElementText(strdRef.getElementsByTagName('CdtrRefInf')[0], 'Ref');
      if (ref && /^\d{27}$/.test(ref)) {
        return ref;
      }
    }
  }

  // Suche in AddtlNtryInf nach QR-Referenz-Pattern
  const addtlInf = getElementText(entry, 'AddtlNtryInf');
  const qrrMatch = addtlInf.match(/\b(\d{27})\b/);
  if (qrrMatch) {
    return qrrMatch[1];
  }

  return undefined;
};

/**
 * Extrahiert IBAN des Gegenparts
 */
const extractCounterpartyIban = (entry: Element): string | undefined => {
  const txDtls = entry.getElementsByTagName('TxDtls')[0];
  if (!txDtls) return undefined;

  const rltdPties = txDtls.getElementsByTagName('RltdPties')[0];
  if (!rltdPties) return undefined;

  // Bei Gutschrift: Debtor Account
  // Bei Belastung: Creditor Account
  const cdtDbtInd = getElementText(entry, 'CdtDbtInd');

  if (cdtDbtInd === 'CRDT') {
    const dbtrAcct = rltdPties.getElementsByTagName('DbtrAcct')[0];
    return getElementText(dbtrAcct?.getElementsByTagName('Id')[0], 'IBAN');
  } else {
    const cdtrAcct = rltdPties.getElementsByTagName('CdtrAcct')[0];
    return getElementText(cdtrAcct?.getElementsByTagName('Id')[0], 'IBAN');
  }
};

/**
 * Parst eine CAMT.053 XML-Datei und extrahiert Transaktionen
 */
export const parseCamtXml = (xmlContent: string): BankTransaction[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  // Fehlerprüfung
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    console.error('[CAMT] XML Parse Error:', parseError.textContent);
    return [];
  }

  const entries = doc.getElementsByTagName('Ntry');
  const transactions: BankTransaction[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Booking Date
    const bookgDtNode = entry.getElementsByTagName('BookgDt')[0];
    const bookingDate = getElementText(bookgDtNode, 'Dt') || new Date().toISOString().split('T')[0];

    // Value Date
    const valDtNode = entry.getElementsByTagName('ValDt')[0];
    const valueDate = getElementText(valDtNode, 'Dt');

    // Amount & Credit/Debit
    const amtNode = entry.getElementsByTagName('Amt')[0];
    const amountVal = parseFloat(amtNode?.textContent || '0');
    const cdtDbtInd = getElementText(entry, 'CdtDbtInd'); // CRDT or DBIT
    const finalAmount = cdtDbtInd === 'DBIT' ? -amountVal : amountVal;
    const currency = amtNode?.getAttribute('Ccy') || 'CHF';

    // Details
    const detailsNode = entry.getElementsByTagName('NtryDtls')[0];
    const txDetails = detailsNode?.getElementsByTagName('TxDtls')[0];

    // Reference / Unstructured info
    const addtlInf = getElementText(entry, 'AddtlNtryInf');

    // Structured reference info
    let reference = '';
    const rmtInf = txDetails?.getElementsByTagName('RmtInf')[0];
    if (rmtInf) {
      // Unstructured
      const ustrd = getElementText(rmtInf, 'Ustrd');
      // Structured
      const strd = rmtInf.getElementsByTagName('Strd')[0];
      const cdtrRefInf = strd?.getElementsByTagName('CdtrRefInf')[0];
      const structuredRef = getElementText(cdtrRefInf, 'Ref');

      reference = structuredRef || ustrd || addtlInf;
    } else {
      reference = addtlInf;
    }

    // QR-Referenz extrahieren
    const qrReference = extractQrReference(entry);

    // Counterparty
    const rltdPties = txDetails?.getElementsByTagName('RltdPties')[0];
    let counterparty = 'Unbekannt';
    if (rltdPties) {
      if (cdtDbtInd === 'CRDT') {
        // Bei Gutschrift: Debtor ist Gegenpartei
        counterparty = getElementText(rltdPties.getElementsByTagName('Dbtr')[0], 'Nm') || counterparty;
      } else {
        // Bei Belastung: Creditor ist Gegenpartei
        counterparty = getElementText(rltdPties.getElementsByTagName('Cdtr')[0], 'Nm') || counterparty;
      }
    }

    // Counterparty IBAN
    const counterpartyIban = extractCounterpartyIban(entry);

    // Unique ID for deduplication
    const externalId = extractTransactionId(entry);

    transactions.push({
      externalId,
      bookingDate,
      valueDate: valueDate || undefined,
      amount: finalAmount,
      currency,
      counterparty,
      counterpartyIban,
      reference,
      qrReference,
      details: addtlInf,
      status: 'open'
    });
  }

  return transactions;
};

/**
 * Prüft ob eine Transaktion bereits in der Datenbank existiert
 */
export const isDuplicateTransaction = (
  newTx: BankTransaction,
  existingTxs: BankTransaction[]
): boolean => {
  // Primär: externalId prüfen
  if (newTx.externalId) {
    const existsById = existingTxs.some(tx => tx.externalId === newTx.externalId);
    if (existsById) return true;
  }

  // Fallback: Kombination aus Datum + Betrag + Referenz
  return existingTxs.some(tx =>
    tx.bookingDate === newTx.bookingDate &&
    Math.abs(tx.amount - newTx.amount) < 0.01 &&
    tx.reference === newTx.reference
  );
};

/**
 * Filtert Duplikate aus einer Liste neuer Transaktionen
 */
export const filterDuplicateTransactions = (
  newTransactions: BankTransaction[],
  existingTransactions: BankTransaction[]
): BankTransaction[] => {
  return newTransactions.filter(newTx => !isDuplicateTransaction(newTx, existingTransactions));
};
