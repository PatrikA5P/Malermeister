/**
 * React Hook for i18n translations
 */

import { useState, useEffect, useCallback } from 'react';
import { t, getLanguage, setLanguage, onLanguageChange, getAvailableLanguages, SupportedLanguage } from './index';

export interface UseTranslationReturn {
    t: (key: string, params?: Record<string, string | number>) => string;
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    languages: { code: SupportedLanguage; name: string; nativeName: string; flag: string }[];
}

/**
 * Hook for using translations in React components
 * Automatically re-renders when language changes
 */
export const useTranslation = (): UseTranslationReturn => {
    const [language, setLang] = useState<SupportedLanguage>(getLanguage());

    useEffect(() => {
        // Subscribe to language changes
        const unsubscribe = onLanguageChange(() => {
            setLang(getLanguage());
        });

        return unsubscribe;
    }, []);

    const handleSetLanguage = useCallback((lang: SupportedLanguage) => {
        setLanguage(lang);
    }, []);

    return {
        t,
        language,
        setLanguage: handleSetLanguage,
        languages: getAvailableLanguages()
    };
};

export default useTranslation;
