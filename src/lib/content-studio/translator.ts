/**
 * Translator Module
 * AI-powered translation with context awareness
 */

import { getZAI } from '@/lib/z-ai';
import { nanoid } from 'nanoid';
import {
  TranslationOptions,
  TranslatedContent,
  ContentStudioResponse,
} from './types';

// Supported languages
const SUPPORTED_LANGUAGES = {
  ru: { name: 'Russian', native: 'Русский' },
  en: { name: 'English', native: 'English' },
  es: { name: 'Spanish', native: 'Español' },
  de: { name: 'German', native: 'Deutsch' },
  fr: { name: 'French', native: 'Français' },
  pt: { name: 'Portuguese', native: 'Português' },
  it: { name: 'Italian', native: 'Italiano' },
  zh: { name: 'Chinese', native: '中文' },
  ja: { name: 'Japanese', native: '日本語' },
  ko: { name: 'Korean', native: '한국어' },
  ar: { name: 'Arabic', native: 'العربية' },
  hi: { name: 'Hindi', native: 'हिन्दी' },
  tr: { name: 'Turkish', native: 'Türkçe' },
  pl: { name: 'Polish', native: 'Polski' },
  uk: { name: 'Ukrainian', native: 'Українська' },
  kk: { name: 'Kazakh', native: 'Қазақ' },
  uz: { name: 'Uzbek', native: 'O\'zbek' },
  th: { name: 'Thai', native: 'ไทย' },
  vi: { name: 'Vietnamese', native: 'Tiếng Việt' },
  id: { name: 'Indonesian', native: 'Bahasa Indonesia' },
};

// Language-specific instructions
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  ru: 'Use natural Russian phrasing, consider cases and gender',
  en: 'Use natural English, consider regional variations (US/UK)',
  es: 'Consider regional Spanish variations (Spain/Latin America)',
  de: 'Use correct German grammar and compound words',
  zh: 'Use simplified Chinese characters, natural phrasing',
  ja: 'Use appropriate politeness levels, natural Japanese',
  ar: 'Use Modern Standard Arabic, right-to-left considerations',
};

export class Translator {
  private zai: any = null;

  private async init() {
    if (!this.zai) {
      this.zai = await getZAI();
    }
    return this.zai;
  }

  /**
   * Translate text
   */
  async translate(options: TranslationOptions): Promise<ContentStudioResponse<TranslatedContent>> {
    try {
      const zai = await this.init();

      // Build translation prompt
      const systemPrompt = this.buildSystemPrompt(options);
      const userPrompt = this.buildUserPrompt(options);

      const response = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for accuracy
      });

      const translatedText = response.choices[0]?.message?.content || '';

      const result: TranslatedContent = {
        original: options.text,
        translated: translatedText,
        sourceLanguage: options.sourceLanguage,
        targetLanguage: options.targetLanguage,
        confidence: 0.9, // Estimated confidence
      };

      return {
        success: true,
        data: result,
        metadata: {
          id: `trans_${nanoid(8)}`,
          type: 'text',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Translation failed',
      };
    }
  }

  /**
   * Translate to multiple languages
   */
  async translateToMany(
    text: string,
    sourceLanguage: string,
    targetLanguages: string[]
  ): Promise<ContentStudioResponse<Record<string, TranslatedContent>>> {
    const results: Record<string, TranslatedContent> = {};

    for (const targetLang of targetLanguages) {
      const result = await this.translate({
        text,
        sourceLanguage,
        targetLanguage: targetLang,
      });

      if (result.success && result.data) {
        results[targetLang] = result.data;
      }
    }

    return {
      success: Object.keys(results).length > 0,
      data: results,
    };
  }

  /**
   * Detect language
   */
  async detectLanguage(text: string): Promise<ContentStudioResponse<string>> {
    try {
      const zai = await this.init();

      const response = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Identify the language of the text. Return only the ISO 639-1 language code (e.g., "ru", "en", "es").',
          },
          {
            role: 'user',
            content: text.substring(0, 500),
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const langCode = response.choices[0]?.message?.content?.trim().toLowerCase() || 'en';

      return {
        success: true,
        data: langCode in SUPPORTED_LANGUAGES ? langCode : 'en',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Localize content (translate + adapt)
   */
  async localize(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    culturalContext?: string
  ): Promise<ContentStudioResponse<TranslatedContent>> {
    try {
      const zai = await this.init();

      const sourceLang = SUPPORTED_LANGUAGES[sourceLanguage as keyof typeof SUPPORTED_LANGUAGES];
      const targetLang = SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES];

      const systemPrompt = `You are a professional localization expert.
Translate and adapt the content from ${sourceLang?.name || sourceLanguage} to ${targetLang?.name || targetLanguage}.

Important localization rules:
- Adapt cultural references, idioms, and humor
- Consider local preferences and sensitivities
- Use natural native expressions
- Maintain the original intent and tone
${culturalContext ? `\nContext: ${culturalContext}` : ''}

Return ONLY the localized text, nothing else.`;

      const response = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.4,
      });

      const localizedText = response.choices[0]?.message?.content || '';

      const result: TranslatedContent = {
        original: text,
        translated: localizedText,
        sourceLanguage,
        targetLanguage,
        confidence: 0.85,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build system prompt for translation
   */
  private buildSystemPrompt(options: TranslationOptions): string {
    const sourceLang = SUPPORTED_LANGUAGES[options.sourceLanguage as keyof typeof SUPPORTED_LANGUAGES];
    const targetLang = SUPPORTED_LANGUAGES[options.targetLanguage as keyof typeof SUPPORTED_LANGUAGES];

    const sourceInstruction = LANGUAGE_INSTRUCTIONS[options.targetLanguage] || '';
    const preserveFormatting = options.preserveFormatting
      ? 'Preserve all formatting, line breaks, and special characters.'
      : '';

    return `You are a professional translator from ${sourceLang?.name || options.sourceLanguage} to ${targetLang?.name || options.targetLanguage}.

Translation rules:
- Translate accurately while maintaining natural flow
- ${sourceInstruction}
- ${preserveFormatting}
${options.context ? `- Context: ${options.context}` : ''}

Return ONLY the translated text, no explanations or notes.`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(options: TranslationOptions): string {
    return options.text;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Get popular language pairs
   */
  getPopularLanguagePairs(): Array<{ source: string; target: string; name: string }> {
    return [
      { source: 'ru', target: 'en', name: 'Russian → English' },
      { source: 'en', target: 'ru', name: 'English → Russian' },
      { source: 'ru', target: 'de', name: 'Russian → German' },
      { source: 'ru', target: 'es', name: 'Russian → Spanish' },
      { source: 'en', target: 'es', name: 'English → Spanish' },
      { source: 'en', target: 'zh', name: 'English → Chinese' },
      { source: 'en', target: 'ja', name: 'English → Japanese' },
      { source: 'en', target: 'ar', name: 'English → Arabic' },
    ];
  }
}

// Singleton
let translatorInstance: Translator | null = null;

export function getTranslator(): Translator {
  if (!translatorInstance) {
    translatorInstance = new Translator();
  }
  return translatorInstance;
}

// Convenience exports
export const translate = {
  translate: (options: TranslationOptions) => getTranslator().translate(options),
  toMany: (text: string, source: string, targets: string[]) =>
    getTranslator().translateToMany(text, source, targets),
  detect: (text: string) => getTranslator().detectLanguage(text),
  localize: (text: string, source: string, target: string, context?: string) =>
    getTranslator().localize(text, source, target, context),
  getLanguages: () => getTranslator().getSupportedLanguages(),
  getPopularPairs: () => getTranslator().getPopularLanguagePairs(),
};
