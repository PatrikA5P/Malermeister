
import React, { useMemo } from 'react';

export const InputGroup = ({ label, error, children, className = '' }: { label: string, error?: string, children?: React.ReactNode, className?: string }) => (
    <div className={`space-y-1 ${className}`}>
        <label className={`text-[10px] font-bold uppercase tracking-widest ${error ? 'text-red-500' : 'text-zinc-400'}`}>
            {label} {error && `— ${error}`}
        </label>
        {children}
    </div>
);

export const InputWithAction = ({ 
    value, 
    onChange, 
    placeholder, 
    type = 'text', 
    actionType 
}: { 
    value: string | undefined, 
    onChange: (val: string) => void, 
    placeholder?: string, 
    type?: string,
    actionType?: 'email' | 'link' 
}) => {
    let icon = null;
    let href = '';
    
    if (value && actionType === 'email') {
        icon = '✉️';
        href = `mailto:${value}`;
    } else if (value && actionType === 'link') {
        icon = '🌍';
        href = value.startsWith('http') ? value : `https://${value}`;
    }

    return (
        <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl focus-within:border-olive-500 focus-within:ring-1 focus-within:ring-olive-500 transition-all overflow-hidden relative">
            <input 
                type={type}
                className="flex-1 bg-transparent p-3 outline-none font-bold text-sm w-full"
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
            />
            {icon && (
                <a 
                  href={href} 
                  target={actionType === 'link' ? '_blank' : undefined}
                  rel="noreferrer"
                  className="flex items-center justify-center w-12 bg-white border-l border-zinc-200 hover:bg-olive-50 cursor-pointer text-lg"
                  title="Direkt öffnen"
                >
                    {icon}
                </a>
            )}
        </div>
    );
};

export const PhoneInput = ({ 
    value, 
    onChange 
}: { 
    value: string | undefined, 
    onChange: (val: string) => void 
}) => {
    const prefixes = ['+41', '+49', '+43', '+33', '+39'];
    const currentPrefix = useMemo(() => {
        if (!value) return '+41';
        return prefixes.find(p => value.startsWith(p)) || '+41';
    }, [value]);

    const currentNumber = useMemo(() => {
        if (!value) return '';
        if (value.startsWith(currentPrefix)) {
            return value.substring(currentPrefix.length).trim();
        }
        return value;
    }, [value, currentPrefix]);

    const handlePrefixChange = (newPrefix: string) => {
        onChange(`${newPrefix} ${currentNumber}`);
    };

    const handleNumberChange = (newNumber: string) => {
        onChange(`${currentPrefix} ${newNumber}`);
    };

    return (
        <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl focus-within:border-olive-500 focus-within:ring-1 focus-within:ring-olive-500 transition-all overflow-hidden relative">
            <div className="border-r border-zinc-200 bg-white relative">
                <select 
                    className="appearance-none bg-transparent p-3 pr-8 outline-none font-bold text-sm h-full cursor-pointer text-zinc-600"
                    value={currentPrefix}
                    onChange={(e) => handlePrefixChange(e.target.value)}
                >
                    {prefixes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none">▼</span>
            </div>
            <input 
                type="tel"
                className="flex-1 bg-transparent p-3 outline-none font-bold text-sm w-full"
                placeholder="79 000 00 00"
                value={currentNumber}
                onChange={(e) => handleNumberChange(e.target.value)}
            />
            {value && (
                <a 
                  href={`tel:${value.replace(/\s/g, '')}`}
                  className="flex items-center justify-center w-12 bg-white border-l border-zinc-200 hover:bg-olive-50 cursor-pointer text-lg"
                  title="Anrufen"
                >
                    📞
                </a>
            )}
        </div>
    );
};

export const SectionHeader = ({ title }: { title: string }) => (
    <div className="mt-8 mb-4 border-b border-zinc-100 pb-2">
        <h3 className="font-black uppercase text-xs text-olive-600 tracking-widest">{title}</h3>
    </div>
);
