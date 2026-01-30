import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { parseCamtXml, filterDuplicateTransactions } from '../../services/camtService';
import { BankTransaction, OfficeDocument } from '../../officeTypes';
import { Toast, ToastType, formatMoney, formatDate } from '../../components/SharedUI';
import { roundToCurrency } from '../../services/calculationService';
import { addAuditEvent, AUDIT_EVENTS } from '../../services/documentGuardService';
import { useTranslation } from '../../i18n/useTranslation';
import { Button } from '../../components/ui/Button';
import { DataDisplay, DataDisplayColumn } from '../../components/ui/DataDisplay';
import { Badge } from '../../components/ui/Badge';

/**
 * Matching-Kandidat für eine Transaktion
 */
interface MatchCandidate {
  document: OfficeDocument;
  matchType: 'exact' | 'qr_reference' | 'amount_tolerance' | 'partial' | 'skonto';
  confidence: number;
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

    // 3. Skonto-Abzug
    if (Math.abs(skontoAmount - txAmount) < 0.06) {
      candidates.push({
        document: doc,
        matchType: 'skonto',
        confidence: 85,
        matchedAmount: txAmount
      });
      continue;
    }

    // 4. Teilzahlung
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

  return candidates.sort((a, b) => b.confidence - a.confidence);
};

interface BankManagerProps {
  onBack: () => void;
}

const BankManager: React.FC<BankManagerProps> = ({ onBack }) => {
  const { t } = useTranslation();
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

      const existingTxs = await db.transactions.toArray();
      const newTransactions = filterDuplicateTransactions(parsed, existingTxs);

      if (newTransactions.length === 0) {
        setToast({ msg: t('bank.noDuplicates'), type: 'info' });
        return;
      }

      await db.transactions.bulkAdd(newTransactions);
      await loadData();
      setToast({ msg: t('bank.importedCount', { count: newTransactions.length }), type: 'success' });

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

    let updatedDoc = addAuditEvent(doc, AUDIT_EVENTS.PAID, settings?.currentUser?.name, {
      transactionId: tx.id,
      amount: candidate.matchedAmount,
      matchType: candidate.matchType
    });

    if (isFullPayment) {
      updatedDoc = { ...updatedDoc, status: 'paid' as const, paidAt: tx.bookingDate };
    }

    await db.documents.update(doc.id, updatedDoc);

    await db.transactions.update(tx.id, {
      status: isFullPayment ? 'matched' : 'partial',
      matchedDocId: doc.id,
      matchedAmount: candidate.matchedAmount
    });

    await loadData();
    setShowMatchModal(false);
    setSelectedTx(null);

    const matchTypeLabels: Record<string, string> = {
      exact: t('bank.matchExact'),
      qr_reference: t('bank.matchQR'),
      amount_tolerance: t('bank.matchTolerance'),
      partial: t('bank.matchPartial'),
      skonto: t('bank.matchSkonto')
    };

    setToast({
      msg: `${doc.docNumber} ${isFullPayment ? t('status.paid') : t('bank.partiallyPaid')} (${matchTypeLabels[candidate.matchType]})`,
      type: 'success'
    });
  };

  const ignoreTransaction = async (tx: BankTransaction) => {
    if (!tx.id) return;
    await db.transactions.update(tx.id, { status: 'ignored' });
    await loadData();
    setToast({ msg: t('bank.transactionIgnored'), type: 'info' });
  };

  const filteredTxs = useMemo(() => {
    return txs.filter(tx => {
      if (filterStatus === 'open' && tx.status !== 'open') return false;
      if (filterStatus === 'matched' && tx.status !== 'matched' && tx.status !== 'partial') return false;

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

  const stats = useMemo(() => ({
    total: txs.length,
    open: txs.filter(t => t.status === 'open' && t.amount > 0).length,
    matched: txs.filter(t => t.status === 'matched').length,
    openAmount: txs.filter(t => t.status === 'open' && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  }), [txs]);

  const columns: DataDisplayColumn<BankTransaction>[] = [
    {
      key: 'counterparty',
      label: t('bank.counterparty'),
      cardPosition: 'title',
      render: (row) => row.counterparty
    },
    {
      key: 'reference',
      label: t('bank.reference'),
      cardPosition: 'subtitle',
      render: (row) => row.reference || row.details
    },
    {
      key: 'bookingDate',
      label: t('common.date'),
      cardPosition: 'meta',
      render: (row) => formatDate(row.bookingDate)
    },
    {
      key: 'qr',
      label: 'QR',
      hideOnCard: true,
      render: (row) => row.qrReference ? <span className="font-mono bg-purple-50 text-purple-600 px-1 rounded text-[10px]">QR</span> : null
    },
    {
      key: 'status',
      label: t('common.status'),
      cardPosition: 'badge',
      render: (row) => (
        <Badge
          label={
            row.status === 'matched' ? t('bank.booked') :
            row.status === 'partial' ? t('bank.partialPayment') :
            row.status === 'ignored' ? t('bank.ignored') :
            t('common.open')
          }
          variant={
            row.status === 'matched' ? 'success' :
            row.status === 'partial' ? 'warning' :
            row.status === 'ignored' ? 'default' :
            'info'
          }
        />
      )
    },
    {
      key: 'amount',
      label: t('common.amount'),
      align: 'right',
      cardPosition: 'value',
      render: (row) => (
        <span className={row.amount > 0 ? 'text-green-600 font-bold' : ''}>
          {row.amount > 0 ? '+' : ''}{formatMoney(row.amount, row.currency)}
        </span>
      )
    }
  ];

  const MatchModal = () => {
    if (!selectedTx) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-zinc-900 text-white p-6">
            <h3 className="font-black uppercase text-lg">{t('bank.assignPayment')}</h3>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="text-zinc-400">{t('common.amount')}:</span> <span className="font-bold text-green-400">{formatMoney(selectedTx.amount, selectedTx.currency)}</span></p>
              <p><span className="text-zinc-400">{t('bank.from')}:</span> {selectedTx.counterparty}</p>
              <p><span className="text-zinc-400">{t('common.date')}:</span> {formatDate(selectedTx.bookingDate)}</p>
              {selectedTx.qrReference && <p><span className="text-zinc-400">QR-Ref:</span> <span className="font-mono text-xs">{selectedTx.qrReference}</span></p>}
            </div>
          </div>

          <div className="p-6 max-h-[400px] overflow-y-auto">
            {matchCandidates.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-zinc-400 mb-4">{t('bank.possibleInvoices')} ({matchCandidates.length})</p>
                {matchCandidates.map((c, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-olive-500 ${c.confidence >= 95 ? 'border-green-300 bg-green-50' : c.confidence >= 80 ? 'border-amber-200 bg-amber-50' : 'border-zinc-200'}`} onClick={() => executeMatch(selectedTx, c)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{c.document.docNumber}</p>
                        <p className="text-sm text-zinc-600">{c.document.client.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatMoney(c.document.totalGross, c.document.currency)}</p>
                        <Badge
                          label={
                            c.matchType === 'qr_reference' ? 'QR-Match' :
                            c.matchType === 'exact' ? t('bank.matchExact') :
                            c.matchType === 'skonto' ? t('bank.matchSkonto') :
                            c.matchType === 'partial' ? t('bank.matchPartial') : 'Match'
                          }
                          variant={
                            c.matchType === 'qr_reference' ? 'info' :
                            c.matchType === 'exact' ? 'success' :
                            c.matchType === 'skonto' ? 'warning' :
                            'default'
                          }
                        />
                      </div>
                    </div>
                    {c.matchType === 'partial' && c.remainingAmount && (
                      <p className="text-xs text-orange-600 mt-2">{t('bank.remainingAmount')}: {formatMoney(c.remainingAmount, c.document.currency)}</p>
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
                <p className="font-bold">{t('bank.noMatchingInvoices')}</p>
                <p className="text-sm mt-2">{t('bank.noMatchingInvoicesHint')}</p>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 p-4 flex gap-3">
            <Button variant="ghost" onClick={() => { setShowMatchModal(false); setSelectedTx(null); }} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button variant="secondary" onClick={() => { ignoreTransaction(selectedTx); setShowMatchModal(false); }} className="flex-1">
              {t('bank.ignore')}
            </Button>
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
      <div className="bg-white border-b border-zinc-200 px-4 md:px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Button variant="icon" onClick={onBack} icon="←" />
            <div>
              <h2 className="text-xl md:text-2xl font-black brand-font uppercase">{t('finance.bank')}</h2>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block">
                {t('finance.bankSubtitle')}
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden inline-block">
            <Button variant="primary">{t('finance.camtImport')}</Button>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xml" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 md:gap-6 text-sm">
          <div><span className="text-zinc-400">{t('common.total')}:</span> <span className="font-bold">{stats.total}</span></div>
          <div><span className="text-zinc-400">{t('common.open')}:</span> <span className="font-bold text-amber-600">{stats.open}</span></div>
          <div><span className="text-zinc-400">{t('bank.booked')}:</span> <span className="font-bold text-green-600">{stats.matched}</span></div>
          <div className="hidden md:block"><span className="text-zinc-400">{t('bank.openSum')}:</span> <span className="font-bold text-green-600">{formatMoney(stats.openAmount)}</span></div>
        </div>

        {/* Filter */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            {[
              { id: 'all', l: t('common.all') },
              { id: 'open', l: t('common.open') },
              { id: 'matched', l: t('bank.booked') }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  filterStatus === f.id ? 'bg-white shadow text-black' : 'text-zinc-500'
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
          <input
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-olive-500"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <DataDisplay
          columns={columns}
          data={filteredTxs}
          rowKey="id"
          onRowClick={(row) => row.amount > 0 && row.status === 'open' && openMatchDialog(row)}
          emptyMessage={t('bank.noTransactions')}
        />
      </div>
    </div>
  );
};

export default BankManager;
