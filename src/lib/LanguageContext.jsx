import React, { createContext, useState, useCallback, useEffect } from 'react';
import { translations, getLanguages } from './translations';

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'pt-BR';
  });

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
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

  return (
    <LanguageContext.Provider value={{
      language,
      t,
      changeLanguage,
      availableLanguages: getLanguages()
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  }
  return context;
}