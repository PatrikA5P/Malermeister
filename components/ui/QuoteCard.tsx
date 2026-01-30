
import React from 'react';
import { OfficeDocument } from '../../officeTypes';
import { formatMoney, formatDate } from '../SharedUI';
import { Badge } from './Badge';

interface QuoteCardProps {
    doc: OfficeDocument;
    onClick: () => void;
}

const s = {
    container: "bg-white border-zinc-200 shadow-sm hover:border-olive-300",
    title: "text-zinc-900",
    amount: "text-zinc-900",
};

export const QuoteCard: React.FC<QuoteCardProps> = ({ doc, onClick }) => {
    // Helper to count non-optional items for the badge "x Pos."
    const itemsCount = doc.items ? doc.items.length : 0;

    return (
        <div 
            onClick={onClick}
            className={`relative p-5 rounded-xl border transition-all cursor-pointer hover:border-olive-400 active:scale-[0.98] ${s.container} flex flex-col gap-4`}
        >
            {/* Top Row: Client Name + Pos Count + Badge */}
            <div className="flex justify-between items-start">
                <div className="min-w-0 pr-2">
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <h4 className={`font-bold text-sm truncate ${s.title}`}>{doc.client.name || 'Neuer Kunde'}</h4>
                        <span className="text-[10px] text-zinc-400 font-bold bg-zinc-50 px-1.5 rounded">{itemsCount} Pos.</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5 truncate">
                        {doc.title || 'Ohne Titel'}
                    </p>
                </div>
                <Badge label={doc.status} />
            </div>

            {/* Bottom Row: Metadata + Big Amount */}
            <div className="flex justify-between items-end border-t border-zinc-50 pt-3 mt-auto">
                <div className="flex flex-col gap-0.5">
                    {/* Doc Number Bold & Black */}
                    <span className="font-black text-zinc-900 text-xs">{doc.docNumber}</span>
                    <span className="text-[10px] text-zinc-400 font-bold">
                        Gültig bis {doc.validUntil ? formatDate(doc.validUntil) : '—'}
                    </span>
                </div>
                
                <p className={`font-black text-lg whitespace-nowrap ${s.amount}`}>
                    {formatMoney(doc.totalGross)}
                </p>
            </div>
        </div>
    );
};
