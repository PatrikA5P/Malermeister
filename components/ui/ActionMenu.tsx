
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ActionMenuItem {
    label: string;
    icon?: string;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success';
}

interface ActionMenuProps {
    items: ActionMenuItem[];
    trigger?: React.ReactNode;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ items, trigger }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ bottom: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextState = !isOpen;
        
        if (nextState && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Position ABOVE the button:
            // bottom value = Viewport Height - Rect Top (distance from bottom to top of element)
            // We add a small gap (8px)
            setCoords({
                bottom: window.innerHeight - rect.top + 8,
                left: Math.min(rect.left, window.innerWidth - 240) // Ensure it doesn't go off-screen right
            });
        }
        setIsOpen(nextState);
    };

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClick = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const MenuPortal = () => {
        if (!isOpen || typeof document === 'undefined') return null;

        return createPortal(
            <div 
                ref={menuRef}
                style={{ bottom: coords.bottom, left: coords.left }}
                className="fixed w-56 origin-bottom-left bg-white rounded-xl shadow-2xl border border-zinc-100 ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999] animate-in fade-in zoom-in-95 duration-100"
            >
                <div className="py-1">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                item.onClick();
                            }}
                            className={`
                                group flex w-full items-center px-4 py-3 text-xs font-bold uppercase tracking-wide
                                transition-colors text-left
                                ${item.variant === 'danger' 
                                    ? 'text-red-600 hover:bg-red-50' 
                                    : item.variant === 'success'
                                        ? 'text-olive-600 hover:bg-olive-50'
                                        : 'text-zinc-700 hover:bg-zinc-50'
                                }
                            `}
                        >
                            {item.icon && <span className="mr-3 text-base opacity-70 group-hover:opacity-100">{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>,
            document.body
        );
    };

    return (
        <>
            <div ref={triggerRef} onClick={toggleMenu} className="inline-block relative">
                {trigger || <Button variant="menu">⋮</Button>}
            </div>
            <MenuPortal />
        </>
    );
};
