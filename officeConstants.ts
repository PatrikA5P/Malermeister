
export const CURRENCIES = ['CHF', 'EUR', 'USD'];

export const LANGUAGES = ['Deutsch', 'Englisch', 'Französisch', 'Italienisch'];

export const UNITS = ['Stk', 'Std', 'm²', 'lfm', 'Psch', 'Sack', 'Gebinde', 'Kg', 'Liter'];

export const SALUTATIONS = ['Herr', 'Frau', 'Familie', 'Dr.'];

export const PAYMENT_METHODS = [
    { id: 'bank', label: 'IBAN' },
    { id: 'qr', label: 'QR-Rechnung' },
    { id: 'cash', label: 'Bar' }
];

export const CORRESPONDENCE_TYPES = [
    { id: 'email', label: 'Per E-Mail' },
    { id: 'post', label: 'Per Post' }
];

export const DOC_STATUS_LABELS: Record<string, string> = {
    draft: 'Entwurf',
    sent: 'Offen / Gesendet',
    accepted: 'Akzeptiert',
    rejected: 'Abgelehnt',
    paid: 'Bezahlt',
    overdue: 'Überfällig',
    cancelled: 'Storniert'
};
