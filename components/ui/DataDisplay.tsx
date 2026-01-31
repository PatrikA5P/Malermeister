
/**
 * DataDisplay - Responsive Data Display Component
 *
 * Mobile-First: Shows Cards on mobile, Table on desktop
 * Automatically switches based on screen width
 */

import React, { useState, useEffect } from 'react';
import { Table, TableColumn, BulkAction } from './Table';
import { Card } from './Card';
import { Badge } from './Badge';

// Breakpoint for switching between card and table view
const DESKTOP_BREAKPOINT = 768; // md in Tailwind

export interface DataDisplayColumn<T> {
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    width?: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode;
    // Card-specific
    hideOnCard?: boolean;
    cardPosition?: 'title' | 'subtitle' | 'badge' | 'value' | 'meta';
}

export interface DataDisplayProps<T> {
    columns: DataDisplayColumn<T>[];
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

    // Card-specific rendering
    renderCard?: (row: T, columns: DataDisplayColumn<T>[]) => React.ReactNode;

    // Force a specific view
    forceView?: 'table' | 'cards';
}

interface DefaultCardProps<T> {
    row: T;
    columns: DataDisplayColumn<T>[];
    rowKey: keyof T;
    isSelected?: boolean;
    onSelect?: (id: string | number) => void;
    onClick?: (row: T) => void;
}

/**
 * Default card renderer using column configuration
 */
function DefaultCard<T extends Record<string, any>>({
    row,
    columns,
    rowKey,
    isSelected,
    onSelect,
    onClick
}: DefaultCardProps<T>) {
    // Find columns by card position
    const titleCol = columns.find(c => c.cardPosition === 'title') || columns[0];
    const subtitleCol = columns.find(c => c.cardPosition === 'subtitle');
    const badgeCol = columns.find(c => c.cardPosition === 'badge');
    const valueCol = columns.find(c => c.cardPosition === 'value');
    const metaCols = columns.filter(c => c.cardPosition === 'meta' || (!c.cardPosition && !c.hideOnCard));

    const id = row[rowKey];

    return (
        <div
            onClick={() => onClick?.(row)}
            className={`
                bg-white rounded-2xl border p-4 transition-all
                ${onClick ? 'cursor-pointer hover:border-olive-400 hover:shadow-md active:scale-[0.99]' : ''}
                ${isSelected ? 'border-olive-500 bg-olive-50/30' : 'border-zinc-100'}
            `}
        >
            {/* Header Row */}
            <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    {onSelect && (
                        <input
                            type="checkbox"
                            className="w-4 h-4 mt-1 rounded accent-zinc-900 cursor-pointer border-zinc-300 shrink-0"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                onSelect(id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    {/* Title & Subtitle */}
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-900 truncate">
                            {titleCol.render ? titleCol.render(row) : row[titleCol.key]}
                        </div>
                        {subtitleCol && (
                            <div className="text-xs text-zinc-500 truncate mt-0.5">
                                {subtitleCol.render ? subtitleCol.render(row) : row[subtitleCol.key]}
                            </div>
                        )}
                    </div>
                </div>

                {/* Badge */}
                {badgeCol && (
                    <div className="shrink-0">
                        {badgeCol.render ? badgeCol.render(row) : <Badge label={row[badgeCol.key]} />}
                    </div>
                )}
            </div>

            {/* Value Row */}
            {valueCol && (
                <div className="text-right mb-3">
                    <span className="text-lg font-black text-zinc-900">
                        {valueCol.render ? valueCol.render(row) : row[valueCol.key]}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide ml-2">
                        {valueCol.label}
                    </span>
                </div>
            )}

            {/* Meta Row */}
            {metaCols.length > 0 && (
                <div className="flex flex-wrap gap-4 pt-3 border-t border-zinc-100">
                    {metaCols.slice(0, 3).map(col => (
                        <div key={col.key} className="text-xs">
                            <span className="text-zinc-400 uppercase tracking-wide">{col.label}: </span>
                            <span className="font-bold text-zinc-700">
                                {col.render ? col.render(row) : row[col.key]}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Mobile pagination component
 */
function MobilePagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
}) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-zinc-100 mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 rounded-xl bg-zinc-100 font-bold text-xs uppercase disabled:opacity-30"
            >
                ‹ Zurück
            </button>

            <span className="text-xs font-bold text-zinc-500">
                {currentPage} / {totalPages}
            </span>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 rounded-xl bg-zinc-100 font-bold text-xs uppercase disabled:opacity-30"
            >
                Weiter ›
            </button>
        </div>
    );
}

export function DataDisplay<T extends Record<string, any>>({
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
    emptyMessage,
    bulkActions,
    renderCard,
    forceView
}: DataDisplayProps<T>) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < DESKTOP_BREAKPOINT);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const showCards = forceView === 'cards' || (forceView !== 'table' && isMobile);

    // Convert DataDisplayColumn to TableColumn
    const tableColumns: TableColumn<T>[] = columns.map(col => ({
        key: col.key,
        label: col.label,
        align: col.align,
        width: col.width,
        sortable: col.sortable,
        render: col.render
    }));

    if (showCards) {
        // Card View (Mobile)
        return (
            <div className="space-y-3">
                {data.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
                            {emptyMessage || 'Keine Einträge gefunden'}
                        </p>
                    </div>
                ) : (
                    <>
                        {data.map((row) => {
                            const id = row[rowKey];
                            const isSelected = selectedIds?.has(id);

                            if (renderCard) {
                                return (
                                    <div key={String(id)}>
                                        {renderCard(row, columns)}
                                    </div>
                                );
                            }

                            return (
                                <React.Fragment key={String(id)}>
                                    <DefaultCard
                                        row={row}
                                        columns={columns}
                                        rowKey={rowKey}
                                        isSelected={isSelected}
                                        onSelect={onSelectRow}
                                        onClick={onRowClick}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {onPageChange && (
                            <MobilePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={onPageChange}
                                totalItems={totalItems || 0}
                            />
                        )}
                    </>
                )}
            </div>
        );
    }

    // Table View (Desktop)
    return (
        <Table
            columns={tableColumns}
            data={data}
            rowKey={rowKey}
            onRowClick={onRowClick}
            selectedIds={selectedIds}
            onSelectRow={onSelectRow}
            onSelectAll={onSelectAll}
            sortConfig={sortConfig}
            onSort={onSort}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalItems={totalItems}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            emptyMessage={emptyMessage}
            bulkActions={bulkActions}
        />
    );
}

export default DataDisplay;
