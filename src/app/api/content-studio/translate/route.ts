import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/z-ai';

/**
 * Real Translation API
 * Uses z-ai-web-dev-sdk for AI-powered translation
 * NO STUBS, NO SIMULATIONS
 */

// Supported languages
const SUPPORTED_LANGUAGES: Record<string, { name: string; nativeName: string }> = {
  ru: { name: 'Russian', nativeName: 'Русский' },
  en: { name: 'English', nativeName: 'English' },
  zh: { name: 'Chinese', nativeName: '中文' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  de: { name: 'German', nativeName: 'Deutsch' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  it: { name: 'Italian', nativeName: 'Italiano' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  tr: { name: 'Turkish', nativeName: 'Türkçe' },
  pl: { name: 'Polish', nativeName: 'Polski' },
  uk: { name: 'Ukrainian', nativeName: 'Українська' },
  th: { name: 'Thai', nativeName: 'ไทย' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  sv: { name: 'Swedish', nativeName: 'Svenska' },
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      text, 
      source_language = 'auto',
      target_language = 'ru',
      preserve_formatting = true,
      context,
      tone = 'neutral', // neutral, formal, casual, creative
    } = body;

    // Validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Текст обязателен' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { success: false, error: 'Максимум 50000 символов' },
        { status: 400 }
      );
    }

    // Validate target language
    if (!SUPPORTED_LANGUAGES[target_language]) {
      return NextResponse.json(
        { success: false, error: `Неподдерживаемый язык: ${target_language}` },
        { status: 400 }
      );
    }

    // Get ZAI instance
    const zai = await getZAI();

    // Build translation prompt
    let systemPrompt = `You are a professional translator. Translate the given text to ${SUPPORTED_LANGUAGES[target_language].name} (${target_language}).`;
    
    if (source_language !== 'auto' && SUPPORTED_LANGUAGES[source_language]) {
      systemPrompt += ` The source language is ${SUPPORTED_LANGUAGES[source_language].name} (${source_language}).`;
    }

    if (tone === 'formal') {
      systemPrompt += ' Use formal language and professional tone.';
    } else if (tone === 'casual') {
      systemPrompt += ' Use casual, conversational language.';
    } else if (tone === 'creative') {
      systemPrompt += ' Be creative while maintaining the meaning.';
    }

    if (preserve_formatting) {
      systemPrompt += ' Preserve the original formatting, line breaks, and structure.';
    }

    if (context) {
      systemPrompt += ` Context: ${context}`;
    }

    systemPrompt += ' Return only the translated text without any explanations or notes.';

    // Call AI for translation
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
    });

    const translatedText = completion.choices?.[0]?.message?.content || '';

    // Detect source language if auto
    let detectedSourceLanguage = source_language;
    if (source_language === 'auto') {
      // Simple language detection based on character patterns
      if (/[а-яА-ЯёЁ]/.test(text)) {
        detectedSourceLanguage = 'ru';
      } else if (/[\u4e00-\u9fff]/.test(text)) {
        detectedSourceLanguage = 'zh';
      } else if (/[\u3040-\u30ff]/.test(text)) {
        detectedSourceLanguage = 'ja';
      } else if (/[\uac00-\ud7af]/.test(text)) {
        detectedSourceLanguage = 'ko';
      } else if (/[\u0600-\u06ff]/.test(text)) {
        detectedSourceLanguage = 'ar';
      } else if (/[\u0400-\u04ff]/.test(text) && !/[а-яА-ЯёЁ]/.test(text)) {
        detectedSourceLanguage = 'uk';
      } else {
        detectedSourceLanguage = 'en';
      }
    }

    return NextResponse.json({
      success: true,
      translation: {
        original_text: text,
        translated_text: translatedText,
        source_language: detectedSourceLanguage,
        target_language,
        source_language_name: SUPPORTED_LANGUAGES[detectedSourceLanguage]?.name || 'Unknown',
        target_language_name: SUPPORTED_LANGUAGES[target_language].name,
        character_count: {
          original: text.length,
          translated: translatedText.length,
        },
      },
      elapsed_ms: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка перевода',
        elapsed_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    languages: Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
      code,
      name: info.name,
      nativeName: info.nativeName,
    })),
    tones: [
      { id: 'neutral', name: 'Нейтральный', description: 'Стандартный перевод' },
      { id: 'formal', name: 'Формальный', description: 'Деловой стиль' },
      { id: 'casual', name: 'Неформальный', description: 'Разговорный стиль' },
      { id: 'creative', name: 'Креативный', description: 'Творческий перевод' },
    ],
    max_text_length: 50000,
    features: [
      'auto_detection',
      'preserve_formatting',
      'context_aware',
      'tone_adjustment',
    ],
  });
}
