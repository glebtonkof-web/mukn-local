'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Supported language codes
export type LanguageCode = 'ru' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'zh' | 'ja' | 'ko';

// Supported languages
export const LANGUAGES = [
  { code: 'ru' as LanguageCode, name: 'Русский', flag: '🇷🇺' },
  { code: 'en' as LanguageCode, name: 'English', flag: '🇬🇧' },
  { code: 'de' as LanguageCode, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr' as LanguageCode, name: 'Français', flag: '🇫🇷' },
  { code: 'es' as LanguageCode, name: 'Español', flag: '🇪🇸' },
  { code: 'it' as LanguageCode, name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt' as LanguageCode, name: 'Português', flag: '🇵🇹' },
  { code: 'zh' as LanguageCode, name: '中文', flag: '🇨🇳' },
  { code: 'ja' as LanguageCode, name: '日本語', flag: '🇯🇵' },
  { code: 'ko' as LanguageCode, name: '한국어', flag: '🇰🇷' },
];

const STORAGE_KEY = 'muken_language';
const LANGUAGE_CHANGE_EVENT = 'muken_language_change';

interface TranslationCache {
  [key: string]: {
    translated: string;
    timestamp: number;
  };
}

interface UseTranslationOptions {
  defaultLanguage?: LanguageCode;
  cacheEnabled?: boolean;
  cacheExpiry?: number; // milliseconds
}

interface TranslationResult {
  success: boolean;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
  qualityScore?: number;
  error?: string;
}

interface BatchTranslationResult {
  success: boolean;
  results: Array<{
    original: string;
    translated: string;
    sourceLanguage: string;
    cached: boolean;
    qualityScore?: number;
  }>;
  sourceLanguage: string;
  targetLanguage: string;
}

// Get language from localStorage or default
function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'ru';
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some(l => l.code === stored)) {
      return stored as LanguageCode;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'ru';
}

// Store language in localStorage
function storeLanguage(language: LanguageCode): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore localStorage errors
  }
}

export function useTranslation(options: UseTranslationOptions = {}) {
  const {
    defaultLanguage = 'ru',
    cacheEnabled = true,
    cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours
  } = options;

  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(defaultLanguage);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local cache for translations
  const cacheRef = useRef<TranslationCache>({});

  // Initialize language from localStorage
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored !== currentLanguage) {
      setCurrentLanguage(stored);
    }
  }, []);

  // Listen for language changes from other components
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<LanguageCode>) => {
      setCurrentLanguage(event.detail);
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange as EventListener);
    };
  }, []);

  // Clean up expired cache entries
  useEffect(() => {
    if (!cacheEnabled) return;

    const now = Date.now();
    const cache = cacheRef.current;
    
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > cacheExpiry) {
        delete cache[key];
      }
    });
  }, [cacheEnabled, cacheExpiry]);

  // Generate cache key
  const getCacheKey = useCallback((
    text: string,
    targetLang: LanguageCode,
    context?: string
  ): string => {
    return `${text}:${targetLang}:${context || 'default'}`;
  }, []);

  // Translate single text
  const translate = useCallback(async (
    text: string,
    targetLang?: LanguageCode,
    options?: {
      sourceLanguage?: LanguageCode;
      context?: string;
    }
  ): Promise<string> => {
    const target = targetLang || currentLanguage;
    
    // Return original if target is same as source (optimization)
    if (!options?.sourceLanguage && target === 'ru') {
      // Assume source is Russian if not specified and target is Russian
      // This is an optimization to avoid unnecessary API calls
    }

    // Check local cache
    if (cacheEnabled) {
      const cacheKey = getCacheKey(text, target, options?.context);
      const cached = cacheRef.current[cacheKey];
      
      if (cached && Date.now() - cached.timestamp < cacheExpiry) {
        return cached.translated;
      }
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: target,
          sourceLanguage: options?.sourceLanguage,
          context: options?.context
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const result: TranslationResult = await response.json();

      // Cache the result
      if (cacheEnabled && result.success) {
        const cacheKey = getCacheKey(text, target, options?.context);
        cacheRef.current[cacheKey] = {
          translated: result.translatedText,
          timestamp: Date.now()
        };
      }

      return result.translatedText;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      console.error('Translation error:', err);
      return text; // Return original text on error
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, cacheEnabled, cacheExpiry, getCacheKey]);

  // Batch translate multiple texts
  const batchTranslate = useCallback(async (
    texts: string[],
    targetLang?: LanguageCode,
    options?: {
      sourceLanguage?: LanguageCode;
      context?: string;
    }
  ): Promise<Map<string, string>> => {
    const target = targetLang || currentLanguage;
    const result = new Map<string, string>();

    // Find texts not in cache
    const textsToTranslate: string[] = [];
    const textToOriginal = new Map<string, string>();

    if (cacheEnabled) {
      for (const text of texts) {
        const cacheKey = getCacheKey(text, target, options?.context);
        const cached = cacheRef.current[cacheKey];

        if (cached && Date.now() - cached.timestamp < cacheExpiry) {
          result.set(text, cached.translated);
        } else {
          textsToTranslate.push(text);
          textToOriginal.set(text, text);
        }
      }
    } else {
      textsToTranslate.push(...texts);
      texts.forEach(text => textToOriginal.set(text, text));
    }

    // Translate remaining texts
    if (textsToTranslate.length > 0) {
      setIsTranslating(true);
      setError(null);

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: textsToTranslate,
            targetLanguage: target,
            sourceLanguage: options?.sourceLanguage,
            context: options?.context
          })
        });

        if (!response.ok) {
          throw new Error(`Batch translation failed: ${response.statusText}`);
        }

        const batchResult: BatchTranslationResult = await response.json();

        if (batchResult.success && batchResult.results) {
          for (const item of batchResult.results) {
            result.set(item.original, item.translated);

            // Cache the result
            if (cacheEnabled) {
              const cacheKey = getCacheKey(item.original, target, options?.context);
              cacheRef.current[cacheKey] = {
                translated: item.translated,
                timestamp: Date.now()
              };
            }
          }
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Batch translation failed';
        setError(errorMessage);
        console.error('Batch translation error:', err);

        // Return original texts for failed translations
        for (const text of textsToTranslate) {
          result.set(text, text);
        }
      } finally {
        setIsTranslating(false);
      }
    }

    return result;
  }, [currentLanguage, cacheEnabled, cacheExpiry, getCacheKey]);

  // Change language
  const changeLanguage = useCallback((newLanguage: LanguageCode) => {
    setCurrentLanguage(newLanguage);
    storeLanguage(newLanguage);

    // Dispatch custom event for other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, {
        detail: newLanguage
      }));
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  // Get language info
  const getLanguageInfo = useCallback((code: LanguageCode) => {
    return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
  }, []);

  return {
    // State
    currentLanguage,
    isTranslating,
    error,
    languages: LANGUAGES,

    // Actions
    translate,
    batchTranslate,
    changeLanguage,
    clearCache,

    // Helpers
    getLanguageInfo,
    getCacheKey
  };
}

// Simple translate function for use outside of React components
export async function translateText(
  text: string,
  targetLanguage: LanguageCode,
  options?: {
    sourceLanguage?: LanguageCode;
    context?: string;
  }
): Promise<string> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        targetLanguage,
        sourceLanguage: options?.sourceLanguage,
        context: options?.context
      })
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}
