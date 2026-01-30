
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { parseCamtXml, filterDuplicateTransactions } from '../../services/camtService';
import { BankTransaction, OfficeDocument } from '../../officeTypes';
import { Toast, ToastType, formatMoney, formatDate } from '../../components/SharedUI';
import { roundToCurrency } from '../../services/calculationService';
import { addAuditEvent, AUDIT_EVENTS } from '../../services/documentGuardService';

/**
 * Matching-Kandidat für eine Transaktion
 */
interface MatchCandidate {
  document: OfficeDocument;
  matchType: 'exact' | 'qr_reference' | 'amount_tolerance' | 'partial' | 'skonto';
  confidence: number; // 0-100
  matchedAmount: number;
  remainingAmount?: number;
}

/**
 * Findet potenzielle Matching-Kandidaten für eine Transaktion
 */
const findMatchCandidates = (
  tx: BankTransaction,
  openInvoices: OfficeDocument[],
  skontoPercent: number = 2
): MatchCandidate[] => {
  const candidates: MatchCandidate[] = [];
  const txAmount = Math.abs(tx.amount);

  for (const doc of openInvoices) {
    const docAmount = doc.totalGross;
    const skontoAmount = roundToCurrency(docAmount * (1 - skontoPercent / 100), doc.currency || 'CHF');

    // 1. QR-Referenz Match (höchste Priorität)
    if (tx.qrReference && doc.qrReference && tx.qrReference === doc.qrReference) {
      candidates.push({
        document: doc,
        matchType: 'qr_reference',
        confidence: 100,
        matchedAmount: txAmount
      });
      continue;
    }

    // 2. Exakter Betrag (±0.05 CHF Toleranz für Rappenrundung)
    if (Math.abs(docAmount - txAmount) < 0.06) {
      candidates.push({
        document: doc,
        matchType: 'exact',
        confidence: 95,
        matchedAmount: txAmount
      });
      continue;
    }

    // 3. Skonto-Abzug (z.B. 2% bei Zahlung innert 10 Tagen)
    if (Math.abs(skontoAmount - txAmount) < 0.06) {
      candidates.push({
        document: doc,
        matchType: 'skonto',
        confidence: 85,
        matchedAmount: txAmount
      });
      continue;
    }

    // 4. Teilzahlung (wenn Transaktion < Rechnungsbetrag)
    if (txAmount < docAmount && txAmount > docAmount * 0.1) {
      candidates.push({
        document: doc,
        matchType: 'partial',
        confidence: 60,
        matchedAmount: txAmount,
        remainingAmount: roundToCurrency(docAmount - txAmount, doc.currency || 'CHF')
      });
    }
  }

  // Sortiere nach Confidence absteigend
  return candidates.sort((a, b) => b.confidence - a.confidence);
};

const BankManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [txs, setTxs] = useState<BankTransaction[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OfficeDocument[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  // Matching Modal State
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'matched'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [transactions, documents, settingsData] = await Promise.all([
      db.transactions.orderBy('bookingDate').reverse().toArray(),
      db.documents.where('type').equals('invoice').toArray(),
      db.settings.toArray()
    ]);

    setTxs(transactions);
    setOpenInvoices(documents.filter(d => d.status !== 'paid' && d.status !== 'cancelled'));
    setSettings(settingsData[0]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      const parsed = parseCamtXml(content);

      // Deduplizierung mit bestehenden Transaktionen
      const existingTxs = await db.transactions.toArray();
      const newTransactions = filterDuplicateTransactions(parsed, existingTxs);

      if (newTransactions.length === 0) {
        setToast({ msg: 'Keine neuen Transaktionen gefunden (Duplikate)', type: 'info' });
        return;
      }

      await db.transactions.bulkAdd(newTransactions);
      await loadData();
      setToast({ msg: `${newTransactions.length} neue Transaktionen importiert`, type: 'success' });

      // Reset file input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const openMatchDialog = (tx: BankTransaction) => {
    const candidates = findMatchCandidates(tx, openInvoices, settings?.skontoPercent || 2);
    setSelectedTx(tx);
    setMatchCandidates(candidates);
    setShowMatchModal(true);
  };

  const executeMatch = async (tx: BankTransaction, candidate: MatchCandidate) => {
    if (!tx.id || !candidate.document.id) return;

    const doc = candidate.document;
    const isFullPayment = candidate.matchType !== 'partial';

    // Dokument aktualisieren
    let updatedDoc = addAuditEvent(doc, AUDIT_EVENTS.PAID, settings?.currentUser?.name, {
      transactionId: tx.id,
      amount: candidate.matchedAmount,
      matchType: candidate.matchType
    });

    if (isFullPayment) {
      updatedDoc = { ...updatedDoc, status: 'paid' as const, paidAt: tx.bookingDate };
    }

    await db.documents.update(doc.id, updatedDoc);

    // Transaktion aktualisieren
    await db.transactions.update(tx.id, {
      status: isFullPayment ? 'matched' : 'partial',
      matchedDocId: doc.id,
      matchedAmount: candidate.matchedAmount
    });

    await loadData();
    setShowMatchModal(false);
    setSelectedTx(null);

    const matchTypeLabels = {
      exact: 'Exakter Betrag',
      qr_reference: 'QR-Referenz',
      amount_tolerance: 'Betragstoleranz',
      partial: 'Teilzahlung',
      skonto: 'Skonto'
    };

    setToast({
      msg: `${doc.docNumber} ${isFullPayment ? 'bezahlt' : 'teilbezahlt'} (${matchTypeLabels[candidate.matchType]})`,
      type: 'success'
    });
  };

  const ignoreTransaction = async (tx: BankTransaction) => {
    if (!tx.id) return;
    await db.transactions.update(tx.id, { status: 'ignored' });
    await loadData();
    setToast({ msg: 'Transaktion ignoriert', type: 'info' });
  };

  // Gefilterte Transaktionen
  const filteredTxs = useMemo(() => {
    return txs.filter(tx => {
      // Status-Filter
      if (filterStatus === 'open' && tx.status !== 'open') return false;
      if (filterStatus === 'matched' && tx.status !== 'matched' && tx.status !== 'partial') return false;

      // Suchbegriff
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          tx.counterparty.toLowerCase().includes(search) ||
          tx.reference.toLowerCase().includes(search) ||
          tx.details.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [txs, filterStatus, searchTerm]);

  // Stats
  const stats = useMemo(() => ({
    total: txs.length,
    open: txs.filter(t => t.status === 'open' && t.amount > 0).length,
    matched: txs.filter(t => t.status === 'matched').length,
    openAmount: txs.filter(t => t.status === 'open' && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  }), [txs]);

  const MatchModal = () => {
    if (!selectedTx) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-zinc-900 text-white p-6">
            <h3 className="font-black uppercase text-lg">Zahlung Zuweisen</h3>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="text-zinc-400">Betrag:</span> <span className="font-bold text-green-400">{formatMoney(selectedTx.amount, selectedTx.currency)}</span></p>
              <p><span className="text-zinc-400">Von:</span> {selectedTx.counterparty}</p>
              <p><span className="text-zinc-400">Datum:</span> {formatDate(selectedTx.bookingDate)}</p>
              {selectedTx.qrReference && <p><span className="text-zinc-400">QR-Ref:</span> <span className="font-mono text-xs">{selectedTx.qrReference}</span></p>}
            </div>
          </div>

          <div className="p-6 max-h-[400px] overflow-y-auto">
            {matchCandidates.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-zinc-400 mb-4">Mögliche Rechnungen ({matchCandidates.length})</p>
                {matchCandidates.map((c, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-olive-500 ${c.confidence >= 95 ? 'border-green-300 bg-green-50' : c.confidence >= 80 ? 'border-amber-200 bg-amber-50' : 'border-zinc-200'}`} onClick={() => executeMatch(selectedTx, c)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{c.document.docNumber}</p>
                        <p className="text-sm text-zinc-600">{c.document.client.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatMoney(c.document.totalGross, c.document.currency)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          c.matchType === 'qr_reference' ? 'bg-purple-100 text-purple-700' :
                          c.matchType === 'exact' ? 'bg-green-100 text-green-700' :
                          c.matchType === 'skonto' ? 'bg-amber-100 text-amber-700' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                          {c.matchType === 'qr_reference' ? 'QR-Match' :
                           c.matchType === 'exact' ? 'Exakt' :
                           c.matchType === 'skonto' ? 'Skonto' :
                           c.matchType === 'partial' ? 'Teilzahlung' : 'Match'}
                        </span>
                      </div>
                    </div>
                    {c.matchType === 'partial' && c.remainingAmount && (
                      <p className="text-xs text-orange-600 mt-2">Restbetrag: {formatMoney(c.remainingAmount, c.document.currency)}</p>
                    )}
                    <div className="mt-2 h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-olive-500" style={{ width: `${c.confidence}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-zinc-400">
                <p className="text-4xl mb-4">🔍</p>
                <p className="font-bold">Keine passenden Rechnungen gefunden</p>
                <p className="text-sm mt-2">Betrag stimmt mit keiner offenen Rechnung überein</p>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 p-4 flex gap-3">
            <button onClick={() => { setShowMatchModal(false); setSelectedTx(null); }} className="flex-1 py-3 text-zinc-500 font-bold uppercase text-xs">Abbrechen</button>
            <button onClick={() => { ignoreTransaction(selectedTx); setShowMatchModal(false); }} className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold uppercase text-xs">Ignorieren</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showMatchModal && <MatchModal />}

      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white transition-colors">←</button>
            <h2 className="text-2xl font-black brand-font uppercase">Bank</h2>
          </div>
          <div className="relative overflow-hidden inline-block">
            <button className="bg-olive-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase shadow-lg hover:bg-olive-700 transition-colors">CAMT Import</button>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xml" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm">
          <div><span className="text-zinc-400">Total:</span> <span className="font-bold">{stats.total}</span></div>
          <div><span className="text-zinc-400">Offen:</span> <span className="font-bold text-amber-600">{stats.open}</span></div>
          <div><span className="text-zinc-400">Verbucht:</span> <span className="font-bold text-green-600">{stats.matched}</span></div>
          <div><span className="text-zinc-400">Offene Summe:</span> <span className="font-bold text-green-600">{formatMoney(stats.openAmount)}</span></div>
        </div>

        {/* Filter */}
        <div className="flex gap-3 mt-4">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            {[{id: 'all', l: 'Alle'}, {id: 'open', l: 'Offen'}, {id: 'matched', l: 'Verbucht'}].map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id as any)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filterStatus === f.id ? 'bg-white shadow text-black' : 'text-zinc-500'}`}>{f.l}</button>
            ))}
          </div>
          <input className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-olive-500" placeholder="Suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {filteredTxs.map(t => (
          <div key={t.id} className={`p-4 rounded-xl shadow-sm border flex justify-between items-center transition-all ${
            t.status === 'matched' ? 'bg-green-50 border-green-200' :
            t.status === 'partial' ? 'bg-amber-50 border-amber-200' :
            t.status === 'ignored' ? 'bg-zinc-50 border-zinc-200 opacity-50' :
            'bg-white border-zinc-200 hover:border-olive-300'
          }`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-800 truncate">{t.counterparty}</p>
              <p className="text-xs text-zinc-500 truncate max-w-[300px]">{t.reference || t.details}</p>
              <div className="flex gap-3 text-[10px] text-zinc-400 mt-1">
                <span>{formatDate(t.bookingDate)}</span>
                {t.qrReference && <span className="font-mono bg-purple-50 text-purple-600 px-1 rounded">QR</span>}
              </div>
            </div>
            <div className="text-right ml-4">
              <p className={`font-bold text-lg ${t.amount > 0 ? 'text-green-600' : 'text-zinc-800'}`}>
                {t.amount > 0 ? '+' : ''}{formatMoney(t.amount, t.currency)}
              </p>
              {t.amount > 0 && t.status === 'open' && (
                <button onClick={() => openMatchDialog(t)} className="mt-1 text-[10px] bg-olive-100 text-olive-700 px-3 py-1 rounded font-bold uppercase hover:bg-olive-200 transition-colors">Zuweisen</button>
              )}
              {t.status === 'matched' && <span className="text-[10px] text-green-700 font-bold uppercase block mt-1">Verbucht</span>}
              {t.status === 'partial' && <span className="text-[10px] text-amber-700 font-bold uppercase block mt-1">Teilzahlung</span>}
              {t.status === 'ignored' && <span className="text-[10px] text-zinc-500 font-bold uppercase block mt-1">Ignoriert</span>}
            </div>
          </div>
        ))}
        {filteredTxs.length === 0 && (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-4xl mb-4">📭</p>
            <p className="font-bold">Keine Transaktionen</p>
            <p className="text-sm mt-2">Importieren Sie eine CAMT-Datei von Ihrer Bank</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankManager;
