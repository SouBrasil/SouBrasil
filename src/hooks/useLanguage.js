import { useState, useEffect, useCallback } from 'react';
import { translations, getLanguages } from '@/lib/translations';

export function useLanguage() {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'pt-BR';
  });

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key) => {
    const parts = key.split('.');
    let value = translations[language];
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return key;
      }
    }
    
    return value || key;
  }, [language]);

  const changeLanguage = useCallback((newLanguage) => {
    setLanguage(newLanguage);
  }, []);

  return {
    language,
    t,
    changeLanguage,
    availableLanguages: getLanguages()
  };
}