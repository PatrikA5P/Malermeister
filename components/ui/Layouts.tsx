
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

// --- STICKY BOTTOM ACTION BAR ---
interface ActionBarProps {
    onCancel: () => void;
    onSave?: () => void;
    saveLabel?: string;
    onMenu?: () => void;
    children?: React.ReactNode; 
}

export const ActionBar: React.FC<ActionBarProps> = ({ onCancel, onSave, saveLabel = "Speichern", onMenu, children }) => {
    return (
        <div className="bg-white border-t border-zinc-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] sticky bottom-0 z-40">
            <div className="flex justify-between items-center max-w-4xl mx-auto gap-4">
                <Button variant="soft" onClick={onCancel} label="Abbrechen" />
                
                <div className="flex gap-3">
                    {children}
                    
                    {onMenu && (
                        <Button variant="menu" onClick={onMenu}>⋮</Button>
                    )}
                    
                    {onSave && (
                        <Button variant="solid" onClick={onSave} label={saveLabel} />
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODULE HEADER ---
interface ModuleOption {
    label: string;
    onClick: () => void;
}

interface ModuleHeaderProps {
    title: string;
    subtitle?: string;
    onBack: () => void;
    stats?: { value: string | number; label: string }[];
    actions?: React.ReactNode;
    children?: React.ReactNode;
    moduleSelection?: ModuleOption[];
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, subtitle, onBack, stats, actions, children, moduleSelection }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if(isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    return (
        <div className="sticky top-0 bg-slate-50 z-20 pt-6 pb-4 px-6 md:px-12 border-b border-zinc-200/50 backdrop-blur-sm bg-slate-50/90">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="icon" onClick={onBack} icon="←" />
                    <div className="relative" ref={menuRef}>
                        <div 
                            className={`group flex flex-col justify-center ${moduleSelection ? 'cursor-pointer' : ''}`} 
                            onClick={() => moduleSelection && setIsMenuOpen(!isMenuOpen)}
                        >
                            {/* Title Row with Centered Chevron */}
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black brand-font uppercase select-none text-zinc-900">
                                    {title}
                                </h2>
                                {moduleSelection && (
                                    <svg 
                                        className={`w-6 h-6 text-zinc-400 group-hover:text-zinc-800 transition-colors transform ${isMenuOpen ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </div>
                            
                            {subtitle && (
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest hidden md:block mt-0.5 select-none">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        {/* Module Dropdown */}
                        {isMenuOpen && moduleSelection && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-zinc-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-left">
                                <div className="p-1">
                                    {moduleSelection.map((opt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => { opt.onClick(); setIsMenuOpen(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 rounded-lg text-sm font-bold text-zinc-700 uppercase tracking-wide transition-colors"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {stats && stats.map((stat, idx) => (
                        <div key={idx} className="text-right hidden md:block">
                            <span className="text-3xl font-black brand-font text-zinc-900">{stat.value}</span>
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-widest">{stat.label}</span>
                        </div>
                    ))}
                    {actions}
                </div>
            </div>
            {children}
        </div>
    );
};

// --- SEARCH TOOLBAR ---
interface SearchToolbarProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    placeholder?: string;
    filterActive?: boolean;
    onFilterClick?: () => void;
    onNewClick?: () => void;
    newLabel?: string;
    startAction?: React.ReactNode; // Slot BEFORE search (e.g. tabs)
    children?: React.ReactNode; // Slot AFTER search
}

export const SearchToolbar: React.FC<SearchToolbarProps> = ({ 
    searchTerm, 
    onSearchChange, 
    placeholder = "Suchen...", 
    filterActive,
    onFilterClick,
    onNewClick, 
    newLabel = "Neu",
    startAction,
    children 
}) => {
    return (
        <div className="flex gap-3 items-center w-full">
            {/* Optional Left Slot (e.g. Tabs) */}
            {startAction && (
                <div className="flex-none">
                    {startAction}
                </div>
            )}

            {/* Search Input expands to fill available space */}
            <div className="relative flex-1 transition-all min-w-0">
                <input 
                    className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm outline-none focus:border-olive-600 shadow-sm bg-white font-bold h-12"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                />
                <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>
            </div>
            
            {/* Custom Slot (e.g. for extra dropdowns) */}
            {children}

            {onFilterClick && (
                <Button 
                    onClick={onFilterClick} 
                    variant={filterActive ? 'soft' : 'outline'}
                    className={filterActive ? 'bg-olive-50 border-olive-200 text-olive-700' : ''}
                    label="Filter"
                    responsive={true}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    }
                />
            )}
            
            {onNewClick && (
                <Button 
                    onClick={onNewClick} 
                    variant="solid"
                    label={newLabel}
                    responsive={true}
                    icon={<span>+</span>}
                />
            )}
        </div>
    );
};
