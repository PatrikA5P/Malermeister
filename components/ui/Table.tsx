
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { createPortal } from 'react-dom';

// --- TYPES ---

export interface TableColumn<T> {
    key: string; 
    label: string;
    align?: 'left' | 'center' | 'right';
    width?: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode; 
}

export interface BulkAction {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
    icon?: React.ReactNode;
}

export interface TableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    rowKey: keyof T;
    
    // Interactions
    onRowClick?: (row: T) => void;
    
    // Selection
    selectedIds?: Set<string | number>;
    onSelectRow?: (id: string | number) => void;
    onSelectAll?: (ids: (string | number)[]) => void; 
    
    // Sorting
    sortConfig?: { key: string; direction: 'asc' | 'desc' };
    onSort?: (key: string) => void;
    
    // Pagination
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    rowsPerPage?: number;
    onRowsPerPageChange?: (n: number) => void;
    
    // Empty State
    emptyMessage?: string;

    // Bulk Actions
    bulkActions?: BulkAction[];
    
    // Layout
    maxHeight?: string; // Optional prop to override default max-height
}

// --- BULK ACTION BAR COMPONENT ---
const BulkActionBar = ({ count, actions, onCancel }: { count: number, actions: BulkAction[], onCancel: () => void }) => {
    if (typeof document === 'undefined') return null;
    
    return createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-zinc-900 text-white p-2 pl-6 pr-2 rounded-2xl shadow-2xl flex items-center gap-6 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                    <span className="bg-olive-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                        {count}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide">Ausgewählt</span>
                </div>
                
                <div className="h-6 w-px bg-white/20"></div>
                
                <div className="flex items-center gap-2">
                    {actions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={action.onClick}
                            className={`
                                px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all
                                ${action.variant === 'danger' 
                                    ? 'bg-red-500/20 text-red-200 hover:bg-red-500 hover:text-white' 
                                    : 'bg-white/10 hover:bg-white hover:text-zinc-900'
                                }
                            `}
                        >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={onCancel}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors ml-2"
                >
                    ✕
                </button>
            </div>
        </div>,
        document.body
    );
};

// --- TABLE COMPONENT ---

export function Table<T extends Record<string, any>>({
    columns,
    data,
    rowKey,
    onRowClick,
    selectedIds,
    onSelectRow,
    onSelectAll,
    sortConfig,
    onSort,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems,
    rowsPerPage = 10,
    onRowsPerPageChange,
    emptyMessage = "Keine Einträge gefunden.",
    bulkActions,
    maxHeight = "max-h-[70vh]" // Default max height to keep it responsive but contained
}: TableProps<T>) {

    // For the editable page input
    const [pageInput, setPageInput] = useState(currentPage.toString());

    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    const isAllSelected = data.length > 0 && data.every(row => selectedIds?.has(row[rowKey]));
    const isIndeterminate = data.some(row => selectedIds?.has(row[rowKey])) && !isAllSelected;

    const handleSelectAll = () => {
        if (!onSelectAll) return;
        if (isAllSelected) {
            onSelectAll([]); // Deselect all
        } else {
            onSelectAll(data.map(row => row[rowKey])); // Select all
        }
    };

    const handleManualPageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const p = parseInt(pageInput);
            if (!isNaN(p) && p >= 1 && p <= totalPages && onPageChange) {
                onPageChange(p);
            } else {
                setPageInput(currentPage.toString()); // Reset on invalid
            }
        }
    };

    // Calculate pagination range
    const startItem = (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(startItem + data.length - 1, totalItems || 0);

    return (
        <>
            {/* Removed h-full, added w-full. Now acts as a flexible card that grows up to a limit */}
            <div className="flex flex-col w-full bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                
                {/* Scrollable Container with Max Height */}
                <div className={`overflow-auto ${maxHeight} flex-1`}>
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        
                        {/* HEADER (Sticky) */}
                        <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {/* Checkbox Column */}
                                {onSelectRow && (
                                    <th className="p-4 w-12 text-center bg-zinc-50">
                                        <div className="flex items-center justify-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded accent-zinc-900 cursor-pointer border-zinc-300"
                                                checked={isAllSelected}
                                                ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                                onChange={handleSelectAll}
                                            />
                                        </div>
                                    </th>
                                )}

                                {/* Data Columns */}
                                {columns.map((col) => (
                                    <th 
                                        key={col.key}
                                        onClick={() => col.sortable && onSort && onSort(col.key)}
                                        className={`
                                            p-4 text-[10px] font-bold uppercase text-zinc-500 tracking-wider whitespace-nowrap bg-zinc-50
                                            ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                                            ${col.sortable ? 'cursor-pointer hover:bg-zinc-100 hover:text-black transition-colors select-none' : ''}
                                        `}
                                        style={{ width: col.width }}
                                    >
                                        {col.label}
                                        {sortConfig?.key === col.key && (
                                            <span className="ml-1 inline-block">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* BODY */}
                        <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700 bg-white">
                            {data.map((row) => {
                                const id = row[rowKey];
                                const isSelected = selectedIds?.has(id);

                                return (
                                    <tr 
                                        key={String(id)} 
                                        onClick={() => onRowClick && onRowClick(row)}
                                        className={`
                                            group transition-colors border-b border-zinc-50 last:border-0
                                            ${onRowClick ? 'cursor-pointer' : ''}
                                            ${isSelected ? 'bg-olive-50/30' : 'hover:bg-zinc-50'}
                                        `}
                                    >
                                        {/* Checkbox Cell */}
                                        {onSelectRow && (
                                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded accent-zinc-900 cursor-pointer border-zinc-300"
                                                        checked={isSelected}
                                                        onChange={() => onSelectRow(id)}
                                                    />
                                                </div>
                                            </td>
                                        )}

                                        {/* Data Cells */}
                                        {columns.map((col) => (
                                            <td 
                                                key={col.key} 
                                                className={`
                                                    p-4 
                                                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                                                `}
                                            >
                                                {col.render ? col.render(row) : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}

                            {/* EMPTY STATE */}
                            {data.length === 0 && (
                                <tr>
                                    <td 
                                        colSpan={columns.length + (onSelectRow ? 1 : 0)} 
                                        className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs"
                                    >
                                        {emptyMessage}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                {onPageChange && (
                    <div className="border-t border-zinc-200 bg-zinc-50 p-2 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                        
                        {/* Left: Rows Per Page + Label */}
                        <div className="flex items-center gap-2 order-2 md:order-1 w-full md:w-auto justify-center md:justify-start">
                            {onRowsPerPageChange && (
                                <>
                                    <select 
                                        className="bg-white border border-zinc-200 text-xs font-bold rounded-lg px-2 py-1 outline-none hover:border-zinc-300 cursor-pointer h-8 shadow-sm text-zinc-700"
                                        value={rowsPerPage}
                                        onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                                    >
                                        {[10, 20, 30, 50, 100, 200, 500].map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">pro Seite</span>
                                </>
                            )}
                        </div>

                        {/* Center: Navigation Controls */}
                        <div className="flex items-center gap-1 order-1 md:order-2">
                            <button 
                                onClick={() => onPageChange(1)}
                                disabled={currentPage <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-white text-zinc-600 font-bold text-xs shadow-sm transition-colors"
                                title="Erste Seite"
                            >
                                «
                            </button>
                            <button 
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-white text-zinc-600 font-bold text-xs shadow-sm transition-colors"
                                title="Vorherige"
                            >
                                ‹
                            </button>
                            
                            <div className="flex items-center gap-1 px-2">
                                <span className="text-[10px] font-bold uppercase text-zinc-400 hidden sm:inline mr-1">Seite</span>
                                <input 
                                    className="w-10 h-8 text-center bg-white border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-all"
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onKeyDown={handleManualPageInput}
                                    onBlur={() => setPageInput(currentPage.toString())}
                                />
                                <span className="text-zinc-400 font-bold text-xs mx-1">/</span>
                                <span className="text-xs font-bold text-zinc-600 min-w-[20px] text-center">{totalPages}</span>
                            </div>

                            <button 
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-white text-zinc-600 font-bold text-xs shadow-sm transition-colors"
                                title="Nächste"
                            >
                                ›
                            </button>
                            <button 
                                onClick={() => onPageChange(totalPages)}
                                disabled={currentPage >= totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-white text-zinc-600 font-bold text-xs shadow-sm transition-colors"
                                title="Letzte Seite"
                            >
                                »
                            </button>
                        </div>

                        {/* Right: Info */}
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide order-3 w-full md:w-auto text-center md:text-right">
                            {totalItems > 0 ? (
                                <span><span className="font-black text-zinc-800">{startItem}-{endItem}</span> von <span className="font-black text-zinc-800">{totalItems}</span> Einträgen</span>
                            ) : (
                                <span>Keine Einträge</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* BULK ACTION BAR */}
            {selectedIds && selectedIds.size > 0 && bulkActions && (
                <BulkActionBar 
                    count={selectedIds.size} 
                    actions={bulkActions} 
                    onCancel={() => onSelectAll && onSelectAll([])} 
                />
            )}
        </>
    );
}
