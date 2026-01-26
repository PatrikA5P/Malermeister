
import { BankTransaction } from '../officeTypes';

export const parseCamtXml = (xmlContent: string): BankTransaction[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  const entries = doc.getElementsByTagName("Ntry");
  const transactions: BankTransaction[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Booking Date
    const bookgDtNode = entry.getElementsByTagName("BookgDt")[0];
    const dateStr = bookgDtNode?.getElementsByTagName("Dt")[0]?.textContent || new Date().toISOString();

    // Amount & Credit/Debit
    const amtNode = entry.getElementsByTagName("Amt")[0];
    const amountVal = parseFloat(amtNode?.textContent || "0");
    const cdtDbtInd = entry.getElementsByTagName("CdtDbtInd")[0]?.textContent; // CRDT or DBIT
    const finalAmount = cdtDbtInd === 'DBIT' ? -amountVal : amountVal;
    const currency = amtNode?.getAttribute("Ccy") || "CHF";

    // Details
    const detailsNode = entry.getElementsByTagName("NtryDtls")[0];
    const txDetails = detailsNode?.getElementsByTagName("TxDtls")[0];
    
    // Reference / Unstructured info
    const addtlInf = entry.getElementsByTagName("AddtlNtryInf")[0]?.textContent || "";
    const ref = txDetails?.getElementsByTagName("RmtInf")[0]?.textContent || addtlInf;
    
    // Counterparty
    const rltdPties = txDetails?.getElementsByTagName("RltdPties")[0];
    const counterparty = rltdPties?.getElementsByTagName("Cdtr")[0]?.getElementsByTagName("Nm")[0]?.textContent 
                      || rltdPties?.getElementsByTagName("Dbtr")[0]?.getElementsByTagName("Nm")[0]?.textContent 
                      || "Unbekannt";

    transactions.push({
      bookingDate: dateStr,
      amount: finalAmount,
      currency: currency,
      counterparty: counterparty,
      reference: ref,
      details: addtlInf,
      status: 'open'
    });
  }

  return transactions;
};
