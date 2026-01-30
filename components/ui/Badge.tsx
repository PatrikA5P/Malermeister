
import React from 'react';

interface BadgeProps {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'info' | 'danger' | 'neutral';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', className = '' }) => {
    // Standardize logic based on label content if variant is default
    let activeVariant = variant;
    const lowerLabel = label.toLowerCase();

    if (variant === 'default') {
        if (['paid', 'bezahlt', 'accepted', 'akzeptiert', 'active', 'aktiv', 'verbucht', 'erledigt'].includes(lowerLabel)) activeVariant = 'success';
        else if (['draft', 'entwurf', 'planung'].includes(lowerLabel)) activeVariant = 'neutral';
        else if (['overdue', 'überfällig', 'cancelled', 'storniert', 'rejected', 'abgelehnt'].includes(lowerLabel)) activeVariant = 'danger';
        else if (['sent', 'versendet', 'open', 'offen', 'pending', 'ausstehend'].includes(lowerLabel)) activeVariant = 'info';
    }

    const styles = {
        default: "bg-zinc-100 text-zinc-600",
        neutral: "bg-zinc-100 text-zinc-500 border border-zinc-200",
        success: "bg-green-100 text-green-700 border border-green-200",
        warning: "bg-orange-50 text-orange-700 border border-orange-100",
        info: "bg-blue-50 text-blue-700 border border-blue-100",
        danger: "bg-red-50 text-red-700 border border-red-100"
    };

    return (
        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${styles[activeVariant]} ${className}`}>
            {label}
        </span>
    );
};
