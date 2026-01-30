
import React from 'react';

// 5 Varianten für eine neutrale, professionelle App
type ButtonVariant = 
    | 'solid'       // Hauptaktion (Schwarz/Dunkel)
    | 'soft'        // Sekundär (Hellgrau Hintergrund)
    | 'outline'     // Tertiär (Rahmen)
    | 'ghost'       // Minimal (Nur Text/Icon)
    | 'destructive' // Warnung/Löschen (Subtiles Rot)
    | 'icon'        // Runder Icon Button (Utility)
    | 'menu';       // Menü Trigger (Utility)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    icon?: React.ReactNode;
    label?: string;
    fullWidth?: boolean;
    /** Wenn true, wird der Text auf Mobile ausgeblendet und nur das Icon gezeigt (Best Practice für Toolbars) */
    responsive?: boolean; 
}

export const Button: React.FC<ButtonProps> = ({ 
    variant = 'solid', 
    icon, 
    label, 
    fullWidth = false, 
    responsive = false, 
    className = '', 
    children,
    ...props 
}) => {
    // Basis: h-12 (48px) für perfekte Touch-Targets. 
    const baseStyles = "inline-flex h-12 items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide text-xs rounded-xl whitespace-nowrap";
    
    // Design Definitionen
    const variants = {
        solid: "bg-zinc-900 text-white hover:bg-black shadow-md hover:shadow-lg px-6",
        soft: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-black px-6",
        outline: "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-black shadow-sm px-6",
        ghost: "bg-transparent text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 px-4",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-100 px-6",
        
        // Utilities (Quadratisch/Kompakt)
        icon: "w-10 h-10 p-0 bg-white border border-zinc-200 text-zinc-400 hover:text-black hover:border-black shadow-sm rounded-full",
        menu: "w-12 px-0 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 text-lg rounded-xl",
    };

    const widthClass = fullWidth ? "w-full" : "";

    // Icon/Menu Button Special Render (Quadratisch/Rund, meist ohne Label)
    if (variant === 'icon' || variant === 'menu') {
        return (
            <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
                {icon || children}
            </button>
        );
    }

    const content = label || children;

    return (
        <button className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} {...props}>
            {/* Icon immer rendern wenn vorhanden */}
            {icon && <span className="text-lg leading-none shrink-0 flex items-center">{icon}</span>}
            
            {/* Text Logic: 
                - Wenn Icon da ist & responsive=true -> Text auf Mobile (hidden), ab md (inline) 
                - Wenn Icon da ist & responsive=false -> Text immer (inline)
                - Wenn kein Icon -> Text immer (inline)
            */}
            {content && (
                <span className={`truncate ${icon && responsive ? 'hidden md:inline' : 'inline'}`}>
                    {content}
                </span>
            )}
        </button>
    );
};
