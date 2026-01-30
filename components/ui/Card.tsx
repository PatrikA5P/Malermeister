
import React from 'react';
import { H3, Label } from './Typography';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverEffect?: boolean;
    noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, actions, className = '', onClick, hoverEffect = false, noPadding = false }) => {
    return (
        <div 
            onClick={onClick}
            className={`
                bg-white rounded-2xl shadow-sm border border-zinc-100 relative
                ${noPadding ? '' : 'p-4 md:p-6'} 
                ${hoverEffect ? 'hover:border-olive-400 hover:shadow-md cursor-pointer transition-all active:scale-[0.99]' : ''}
                ${className}
            `}
        >
            {(title || actions) && (
                <div className={`flex justify-between items-start gap-4 ${noPadding ? 'p-4 md:p-6 border-b border-zinc-100' : 'mb-6'}`}>
                    <div className="min-w-0 flex-1">
                        {title && <H3 className="mb-1 truncate">{title}</H3>}
                        {subtitle && <Label className="truncate">{subtitle}</Label>}
                    </div>
                    {/* 
                        Actions container: 
                        justify-end ensures buttons are pushed to the right. 
                        Order is determined by the consumer (e.g. <Cancel/> then <Save/>).
                    */}
                    {actions && (
                        <div className="flex items-center justify-end gap-2 flex-nowrap shrink-0">
                            {actions}
                        </div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};
