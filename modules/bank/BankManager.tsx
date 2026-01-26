
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { parseCamtXml } from '../../services/camtService';
import { BankTransaction } from '../../officeTypes';

const BankManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [txs, setTxs] = useState<BankTransaction[]>([]);

  useEffect(() => { loadTxs(); }, []);

  const loadTxs = async () => {
      setTxs(await db.transactions.orderBy('bookingDate').reverse().toArray());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
          const content = ev.target?.result as string;
          const parsed = parseCamtXml(content);
          // Simple dedup based on details/amount/date (MVP)
          // In prod, use transaction IDs from XML
          await db.transactions.bulkAdd(parsed);
          loadTxs();
          alert(`${parsed.length} Transaktionen importiert.`);
      };
      reader.readAsText(file);
  };

  const matchTransaction = async (tx: BankTransaction) => {
      // Simple automatch logic
      const docs = await db.documents.toArray();
      // Try match by amount + open status
      const match = docs.find(d => 
          d.type === 'invoice' && 
          d.status !== 'paid' && 
          Math.abs(d.totalGross - tx.amount) < 0.05
      );

      if (match && match.id) {
          if (confirm(`Rechnung ${match.docNumber} (${match.totalGross}) als bezahlt markieren?`)) {
              await db.documents.update(match.id, { status: 'paid', paidAt: tx.bookingDate });
              if (tx.id) await db.transactions.update(tx.id, { status: 'matched', matchedDocId: match.id });
              loadTxs();
          }
      } else {
          alert("Keine eindeutige offene Rechnung mit diesem Betrag gefunden.");
      }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black brand-font uppercase">Bank</h2>
            <div className="relative overflow-hidden inline-block">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">XML Import</button>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xml" onChange={handleFileUpload} />
            </div>
        </div>
        <button onClick={onBack} className="mb-4 text-xs font-bold text-zinc-400 uppercase hover:text-black">← Zurück</button>

        <div className="space-y-2">
            {txs.map(t => (
                <div key={t.id} className={`p-4 rounded-xl shadow-sm border flex justify-between items-center ${t.status === 'matched' ? 'bg-green-50 border-green-100' : 'bg-white border-zinc-100'}`}>
                    <div>
                        <p className="font-bold text-zinc-800">{t.counterparty}</p>
                        <p className="text-xs text-zinc-500 max-w-[200px] truncate">{t.details}</p>
                        <p className="text-[10px] text-zinc-400">{t.bookingDate}</p>
                    </div>
                    <div className="text-right">
                        <p className={`font-bold ${t.amount > 0 ? 'text-green-600' : 'text-zinc-800'}`}>{t.amount > 0 ? '+' : ''} {t.amount.toFixed(2)}</p>
                        {t.amount > 0 && t.status === 'open' && (
                            <button onClick={() => matchTransaction(t)} className="mt-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Zuweisen</button>
                        )}
                        {t.status === 'matched' && <span className="text-[10px] text-green-700 font-bold uppercase">Verbucht</span>}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default BankManager;
