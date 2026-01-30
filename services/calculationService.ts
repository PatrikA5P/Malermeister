
/**
 * CALCULATION SERVICE - Zentrale Finanzberechnungen
 *
 * Implementiert:
 * - Währungsspezifische Rundung (CH: Rappenrundung 0.05, EUR: 0.01)
 * - Präzise Berechnungen ohne Floating-Point-Fehler
 * - MwSt-Gruppierung nach Steuersatz
 */

import { OfficeLineItem, OfficeDocument, CurrencyConfig } from '../officeTypes';

// Währungskonfigurationen mit Rundungsregeln
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Schweizer Franken',
    decimalPlaces: 2,
    roundingIncrement: 0.05,  // Rappenrundung
    locale: 'de-CH'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    roundingIncrement: 0.01,  // Cent-genau
    locale: 'de-DE'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    roundingIncrement: 0.01,
    locale: 'en-US'
  }
};

/**
 * Rundet einen Betrag gemäss Währungsregeln
 * CHF: auf 0.05 (Rappenrundung)
 * EUR/USD: auf 0.01 (Cent)
 */
export const roundToCurrency = (amount: number, currencyCode: string = 'CHF'): number => {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.CHF;
  const increment = config.roundingIncrement;

  // Präzise Rundung mit Integer-Arithmetik um Floating-Point-Fehler zu vermeiden
  const factor = 1 / increment;
  return Math.round(amount * factor) / factor;
};

/**
 * Multipliziert zwei Zahlen präzise (vermeidet Floating-Point-Fehler)
 * Konvertiert zu Integer-Arithmetik für Präzision
 */
export const preciseMultiply = (a: number, b: number, decimals: number = 4): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(a * factor) * Math.round(b * factor) / (factor * factor);
};

/**
 * Berechnet den Netto-Betrag einer Position
 * Formel: Menge × Preis × (1 - Rabatt/100)
 */
export const calcLineNet = (item: OfficeLineItem, currency: string = 'CHF'): number => {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.price) || 0;
  const discount = Number(item.discount) || 0;

  // Präzise Berechnung
  const gross = quantity * price;
  const discountAmount = gross * (discount / 100);
  const net = gross - discountAmount;

  // Runden auf Währungseinheit
  return roundToCurrency(net, currency);
};

/**
 * Berechnet den MwSt-Betrag einer Position
 */
export const calcLineVat = (
  item: OfficeLineItem,
  defaultVatRate: number = 8.1,
  currency: string = 'CHF'
): number => {
  const net = calcLineNet(item, currency);
  const vatRate = Number(item.vatRate ?? defaultVatRate);
  const vat = net * (vatRate / 100);

  return roundToCurrency(vat, currency);
};

/**
 * Berechnet den Brutto-Betrag einer Position (Netto + MwSt)
 */
export const calcLineGross = (
  item: OfficeLineItem,
  defaultVatRate: number = 8.1,
  currency: string = 'CHF'
): number => {
  const net = calcLineNet(item, currency);
  const vat = calcLineVat(item, defaultVatRate, currency);
  return roundToCurrency(net + vat, currency);
};

/**
 * MwSt-Gruppierung nach Steuersatz
 * Wichtig für Schweizer MwSt-Abrechnung
 */
export interface VatGroup {
  rate: number;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
}

export const groupByVatRate = (
  items: OfficeLineItem[],
  defaultVatRate: number = 8.1,
  currency: string = 'CHF'
): VatGroup[] => {
  const groups = new Map<number, VatGroup>();

  items.forEach(item => {
    if (item.isOptional) return; // Optionale Positionen nicht mitzählen

    const rate = Number(item.vatRate ?? defaultVatRate);
    const net = calcLineNet(item, currency);
    const vat = calcLineVat(item, defaultVatRate, currency);

    const existing = groups.get(rate) || { rate, netTotal: 0, vatTotal: 0, grossTotal: 0 };
    groups.set(rate, {
      rate,
      netTotal: roundToCurrency(existing.netTotal + net, currency),
      vatTotal: roundToCurrency(existing.vatTotal + vat, currency),
      grossTotal: roundToCurrency(existing.netTotal + net + existing.vatTotal + vat, currency)
    });
  });

  // Sortiert nach Steuersatz absteigend
  return Array.from(groups.values()).sort((a, b) => b.rate - a.rate);
};

/**
 * Berechnet die Gesamtsummen eines Dokuments
 */
export interface DocumentTotals {
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  vatGroups: VatGroup[];
  itemCount: number;
}

export const calculateDocumentTotals = (
  items: OfficeLineItem[],
  defaultVatRate: number = 8.1,
  currency: string = 'CHF',
  includeOptional: boolean = false
): DocumentTotals => {
  const activeItems = includeOptional ? items : items.filter(i => !i.isOptional);
  const vatGroups = groupByVatRate(activeItems, defaultVatRate, currency);

  const netTotal = roundToCurrency(
    vatGroups.reduce((sum, g) => sum + g.netTotal, 0),
    currency
  );

  const vatTotal = roundToCurrency(
    vatGroups.reduce((sum, g) => sum + g.vatTotal, 0),
    currency
  );

  const grossTotal = roundToCurrency(netTotal + vatTotal, currency);

  return {
    netTotal,
    vatTotal,
    grossTotal,
    vatGroups,
    itemCount: activeItems.length
  };
};

/**
 * Generiert die nächste fortlaufende Dokumentnummer
 */
export const generateDocNumber = async (
  type: 'quote' | 'invoice',
  existingDocs: OfficeDocument[]
): Promise<string> => {
  const prefix = type === 'quote' ? 'O' : 'R';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;

  // Filtere Dokumente des aktuellen Jahres und Typs
  const relevantDocs = existingDocs.filter(d =>
    d.type === type &&
    d.docNumber.startsWith(pattern)
  );

  // Finde die höchste Nummer
  let maxNum = 0;
  relevantDocs.forEach(d => {
    const parts = d.docNumber.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  // Nächste Nummer mit führenden Nullen
  const nextNum = String(maxNum + 1).padStart(4, '0');
  return `${prefix}-${year}-${nextNum}`;
};

/**
 * Formatiert einen Geldbetrag mit Währungssymbol
 */
export const formatMoney = (
  amount: number,
  currency: string = 'CHF',
  showSymbol: boolean = true
): string => {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.CHF;
  const rounded = roundToCurrency(amount, currency);

  const formatted = rounded.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces
  });

  if (showSymbol) {
    return currency === 'CHF' ? `CHF ${formatted}` : `${config.symbol}${formatted}`;
  }
  return formatted;
};

/**
 * Validiert eine IBAN (Schweizer Format)
 */
export const validateSwissIBAN = (iban: string): boolean => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  // Schweizer IBAN: CH + 2 Prüfziffern + 5 Stellen Bankcode + 12 Stellen Kontonummer = 21 Zeichen
  if (!/^CH\d{2}[A-Z0-9]{17}$/.test(cleaned)) {
    return false;
  }

  // IBAN-Prüfsumme validieren (Modulo 97)
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, char => String(char.charCodeAt(0) - 55));

  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }

  return remainder === 1;
};

/**
 * Prüft ob eine QR-IBAN vorliegt (für QR-Rechnung)
 */
export const isQrIban = (iban: string): boolean => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!cleaned.startsWith('CH') || cleaned.length !== 21) return false;

  // QR-IBANs haben IID 30000-31999 (Position 5-9)
  const iid = parseInt(cleaned.substring(4, 9), 10);
  return iid >= 30000 && iid <= 31999;
};

/**
 * Generiert eine QR-Referenz (26 Stellen + Prüfziffer)
 */
export const generateQrReference = (invoiceNumber: string): string => {
  // Basis: Rechnungsnummer ohne Sonderzeichen, linksbündig mit Nullen auf 26 Stellen
  const cleaned = invoiceNumber.replace(/[^0-9]/g, '');
  const padded = cleaned.padStart(26, '0').slice(-26);

  // Prüfziffer berechnen (Modulo 10 rekursiv)
  const weights = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const digit of padded) {
    carry = weights[(carry + parseInt(digit, 10)) % 10];
  }
  const checkDigit = (10 - carry) % 10;

  return padded + checkDigit;
};
