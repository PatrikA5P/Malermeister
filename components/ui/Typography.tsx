
import React, { useState, useEffect } from 'react';

// --- TYPOGRAPHY COMPONENTS ---

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
}

/**
 * H1: Page Titles
 * Bind to --font-headings
 */
export const H1: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
    <h1 
        style={{ fontFamily: 'var(--font-headings)' }}
        className={`font-black text-3xl md:text-4xl text-zinc-900 tracking-tight leading-none uppercase ${className}`} 
        {...props}
    >
        {children}
    </h1>
);

/**
 * H2: Section Titles
 * Bind to --font-headings
 */
export const H2: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
    <h2 
        style={{ fontFamily: 'var(--font-headings)' }}
        className={`font-bold text-xl md:text-2xl text-zinc-800 tracking-wide uppercase ${className}`} 
        {...props}
    >
        {children}
    </h2>
);

/**
 * H3: Subsections
 * Bind to --font-headings (or body if preferred, but user asked for "Überschrift" category)
 */
export const H3: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
    <h3 
        style={{ fontFamily: 'var(--font-headings)' }}
        className={`font-bold text-base text-zinc-900 ${className}`} 
        {...props}
    >
        {children}
    </h3>
);

/**
 * H4: Small emphasis titles
 */
export const H4: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
    <h4 
        style={{ fontFamily: 'var(--font-headings)' }}
        className={`font-semibold text-sm text-zinc-900 ${className}`} 
        {...props}
    >
        {children}
    </h4>
);

/**
 * P: Standard Body Text
 * Bind to --font-body
 */
export const P: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
    <p 
        style={{ fontFamily: 'var(--font-body)' }}
        className={`font-medium text-sm text-zinc-600 leading-relaxed ${className}`} 
        {...props}
    >
        {children}
    </p>
);

/**
 * Label: For Inputs, Table Headers
 * Bind to --font-labels
 */
export const Label: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
    <span 
        style={{ fontFamily: 'var(--font-labels)' }}
        className={`block text-[10px] font-bold uppercase tracking-widest text-zinc-400 select-none ${className}`} 
        {...props}
    >
        {children}
    </span>
);

/**
 * Mono: For IDs, Dates, Numbers
 * Bind to --font-numbers
 */
export const Mono: React.FC<TypographyProps> = ({ children, className = '', ...props }) => (
    <span 
        style={{ fontFamily: 'var(--font-numbers)' }}
        className={`text-sm ${className}`} 
        {...props}
    >
        {children}
    </span>
);

/**
 * Link: Standardized interactive text
 * Bind to --font-links
 */
export const LinkText: React.FC<TypographyProps & { onClick?: () => void }> = ({ children, className = '', onClick, ...props }) => (
    <span 
        onClick={onClick}
        style={{ fontFamily: 'var(--font-links)' }}
        className={`text-xs font-bold uppercase tracking-wide text-zinc-400 hover:text-black cursor-pointer transition-colors border-b border-transparent hover:border-black pb-0.5 ${className}`} 
        {...props}
    >
        {children}
    </span>
);


// --- FONT DESIGNER / CONFIGURATOR ---

const AVAILABLE_FONTS = [
    { name: 'Inter', category: 'sans-serif' },
    { name: 'Oswald', category: 'sans-serif' },
    { name: 'Montserrat', category: 'sans-serif' },
    { name: 'Roboto', category: 'sans-serif' },
    { name: 'Open Sans', category: 'sans-serif' },
    { name: 'Lato', category: 'sans-serif' },
    { name: 'Poppins', category: 'sans-serif' },
    { name: 'Raleway', category: 'sans-serif' },
    { name: 'Playfair Display', category: 'serif' },
    { name: 'Merriweather', category: 'serif' },
    { name: 'Lora', category: 'serif' },
    { name: 'Roboto Slab', category: 'serif' },
    { name: 'Roboto Mono', category: 'monospace' },
    { name: 'Fira Code', category: 'monospace' },
    { name: 'Source Code Pro', category: 'monospace' },
    { name: 'Courier Prime', category: 'monospace' },
    { name: 'Bebas Neue', category: 'display' },
    { name: 'Caveat', category: 'handwriting' }
];

type FontCategory = 'headings' | 'body' | 'labels' | 'numbers' | 'links';

export const FontDesigner: React.FC = () => {
    // Initial State must match CSS defaults in index.html for correct first render sync
    const [config, setConfig] = useState<Record<FontCategory, string>>({
        headings: 'Oswald',
        body: 'Inter',
        labels: 'Inter',
        numbers: 'monospace', // Or a specific mono font if you prefer
        links: 'Inter'
    });

    // Dynamically load font from Google Fonts when changed
    const loadFont = (fontName: string) => {
        if (!fontName || fontName === 'monospace' || fontName === 'sans-serif' || fontName === 'serif') return;
        
        const id = `font-${fontName.replace(/\s+/g, '-')}`;
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
            document.head.appendChild(link);
        }
    };

    // Update CSS variables when config changes
    useEffect(() => {
        const root = document.documentElement;
        
        // Helper to format font stack
        const formatStack = (font: string) => {
            const type = AVAILABLE_FONTS.find(f => f.name === font)?.category || 'sans-serif';
            return `'${font}', ${type}`;
        };

        // Load and Apply
        Object.entries(config).forEach(([key, fontName]) => {
            loadFont(fontName as string);
            const varName = `--font-${key}`;
            const value = formatStack(fontName as string);
            root.style.setProperty(varName, value);
        });

    }, [config]);

    const handleFontChange = (category: FontCategory, fontName: string) => {
        setConfig(prev => ({ ...prev, [category]: fontName }));
    };

    const SelectControl = ({ label, category }: { label: string, category: FontCategory }) => (
        <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">{label}</label>
            <select 
                value={config[category]} 
                onChange={(e) => handleFontChange(category, e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-olive-500 transition-colors"
            >
                {AVAILABLE_FONTS.map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-2xl border border-zinc-800 mb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-zinc-800 pb-4 gap-4">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-olive-500">Typografie System</h2>
                    <p className="text-zinc-400 text-[10px] font-bold uppercase mt-1">Live Vorschau & Konfiguration</p>
                </div>
                <button 
                    onClick={() => setConfig({ headings: 'Oswald', body: 'Inter', labels: 'Inter', numbers: 'Roboto Mono', links: 'Inter' })} 
                    className="text-[9px] bg-zinc-800 hover:bg-white hover:text-black px-4 py-2 rounded-lg transition-colors uppercase font-black"
                >
                    Reset Defaults
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <SelectControl label="Überschriften (H1-H4)" category="headings" />
                <SelectControl label="Body Text (P)" category="body" />
                <SelectControl label="Labels / UI" category="labels" />
                <SelectControl label="Zahlen (Mono)" category="numbers" />
                <SelectControl label="Links / Actions" category="links" />
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800 flex gap-4 overflow-x-auto pb-2">
                <div className="flex-1 min-w-[200px] p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                    <h1 style={{ fontFamily: config.headings }} className="text-2xl font-bold uppercase mb-2">Vorschau Titel</h1>
                    <p style={{ fontFamily: config.body }} className="text-sm text-zinc-400">Das ist ein Beispieltext für den Body. Er sollte gut lesbar sein.</p>
                </div>
                <div className="flex-1 min-w-[200px] p-4 bg-zinc-800/50 rounded-xl border border-zinc-800 flex flex-col justify-center gap-2">
                    <span style={{ fontFamily: config.labels }} className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Beispiel Label</span>
                    <span style={{ fontFamily: config.numbers }} className="text-lg font-bold">123.456,78 CHF</span>
                    <span style={{ fontFamily: config.links }} className="text-xs font-bold underline decoration-olive-500 underline-offset-4">Interaktiver Link</span>
                </div>
            </div>
        </div>
    );
};
