
import QRCode from 'qrcode';
import { OfficeDocument, OfficeSettings } from '../officeTypes';

// Helper to generate Swiss QR String (Simplified for this demo)
// In a real app, strict validation of reference types (QRR vs SCOR) is needed.
export const generateSwissQRString = (doc: OfficeDocument, settings: OfficeSettings): string => {
  const data = [
    "SPC", // QRType
    "0200", // Version
    "1", // Coding
    settings.qrIban || settings.iban || "", // IBAN
    "K", // Creditor Address Type (K = Combined)
    settings.companyName.substring(0, 70), // Name
    settings.address.street.substring(0, 70), // Street + Nr
    `${settings.address.zip} ${settings.address.city}`.substring(0, 70), // ZIP + City
    "", // Empty
    "", // Empty
    "", // Country (Assumed CH)
    "", // Ult Crd Address Type
    "", // Ult Crd Name
    "", // Ult Crd Street
    "", // Ult Crd Zip City
    "", // Ult Crd Country
    doc.totalGross.toFixed(2), // Amount
    "CHF", // Currency
    "K", // Ult Dbt Address Type
    doc.client.name.substring(0, 70), // Debtor Name
    doc.client.street.substring(0, 70), // Debtor Street
    `${doc.client.zip} ${doc.client.city}`.substring(0, 70), // Debtor Zip City
    "", // Debtor Country
    "NON", // Ref Type (NON, SCOR, QRR) - Using NON for simplicity unless QR-IBAN present
    "", // Reference
    "Unstructured Message", // Msg
    "EPD", // Trailer
    "", // Bill Info
    ""  // Alt Schemes
  ];
  
  // Basic cleanup for nulls
  return data.map(d => d === undefined || d === null ? "" : d).join("\n");
};

export const generateQRCodeDataUrl = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, { errorCorrectionLevel: 'M' });
  } catch (err) {
    console.error(err);
    return '';
  }
};
