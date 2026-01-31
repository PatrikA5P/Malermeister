/**
 * i18n - Internationalization System
 *
 * Lightweight i18n implementation without external dependencies.
 * Supports: German (de), English (en), French (fr), Italian (it)
 */

// Import from TypeScript files now
import de from './locales/de';
import en from './locales/en';
import fr from './locales/fr';
import it from './locales/it';

export type SupportedLanguage = 'de' | 'en' | 'fr' | 'it';

export const LANGUAGES: Record<SupportedLanguage, { name: string; nativeName: string; flag: string }> = {
    de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
    fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' }
};

const translations: Record<SupportedLanguage, Record<string, any>> = { 
    de, 
    en, 
    fr, 
    it 
};

let currentLanguage: SupportedLanguage = 'de';
const listeners: Set<() => void> = new Set();

/**
 * Get nested value from object using dot notation
 */
const getNestedValue = (obj: any, path: string): string | undefined => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

/**
 * Translate a key with optional interpolation
 * @param key - The translation key (dot notation supported, e.g., 'common.save')
 * @param params - Optional parameters for interpolation { name: 'John' } -> 'Hello {{name}}'
 */
export const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[currentLanguage], key)
        || getNestedValue(translations.de, key) // Fallback to German
        || key; // Fallback to key itself

    if (!params) return translation;

    // Replace {{param}} with actual values
    return translation.replace(/\{\{(\w+)\}\}/g, (_, paramKey) =>
        String(params[paramKey] ?? `{{${paramKey}}}`)
    );
};

/**
 * Set the current language
 */
export const setLanguage = (lang: SupportedLanguage): void => {
    if (translations[lang]) {
        currentLanguage = lang;
        // Notify all listeners
        listeners.forEach(fn => fn());
        // Persist to localStorage
        try {
            localStorage.setItem('malermeister_language', lang);
        } catch (e) {
            // localStorage not available
        }
    }
};

/**
 * Get the current language
 */
export const getLanguage = (): SupportedLanguage => currentLanguage;

/**
 * Initialize language from localStorage or browser settings
 */
export const initLanguage = (): SupportedLanguage => {
    try {
        // Try localStorage first
        const stored = localStorage.getItem('malermeister_language') as SupportedLanguage;
        if (stored && translations[stored]) {
            currentLanguage = stored;
            return currentLanguage;
        }

        // Try browser language
        const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
        if (translations[browserLang]) {
            currentLanguage = browserLang;
            return currentLanguage;
        }
    } catch (e) {
        // Fallback to default
    }

    return currentLanguage;
};

/**
 * Subscribe to language changes
 */
export const onLanguageChange = (callback: () => void): (() => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

/**
 * Get all available languages
 */
export const getAvailableLanguages = (): { code: SupportedLanguage; name: string; nativeName: string; flag: string }[] => {
    return Object.entries(LANGUAGES).map(([code, data]) => ({
        code: code as SupportedLanguage,
        ...data
    }));
};

// Initialize on module load
initLanguage();
