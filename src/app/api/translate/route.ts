import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// Supported languages with their codes and names
export const SUPPORTED_LANGUAGES = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

interface TranslateRequest {
  text: string;
  targetLanguage: LanguageCode;
  sourceLanguage?: LanguageCode;
  context?: string; // ui, comment, campaign, etc.
}

interface BatchTranslateRequest {
  texts: string[];
  targetLanguage: LanguageCode;
  sourceLanguage?: LanguageCode;
  context?: string;
}

// Language detection using AI
async function detectLanguage(text: string): Promise<string> {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a language detector. Return ONLY the ISO 639-1 language code (ru, en, de, fr, es, it, pt, zh, ja, ko) for the given text. No other text.'
        },
        {
          role: 'user',
          content: text.substring(0, 500)
        }
      ],
      temperature: 0.1,
      max_tokens: 10
    });

    const detected = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'ru';
    // Validate it's a supported language
    if (SUPPORTED_LANGUAGES.some(l => l.code === detected)) {
      return detected;
    }
    return 'ru';
  } catch {
    return 'ru';
  }
}

// AI-based translation
async function translateWithAI(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: string
): Promise<{ translatedText: string; qualityScore: number }> {
  const zai = await ZAI.create();

  const languageNames: Record<string, string> = {
    ru: 'Russian',
    en: 'English',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
  };

  const contextInstructions: Record<string, string> = {
    ui: 'This is a user interface text. Keep it concise and clear.',
    comment: 'This is a social media comment. Keep the tone natural and conversational.',
    campaign: 'This is marketing campaign text. Maintain persuasive language.',
    notification: 'This is a notification message. Keep it brief and actionable.',
    error: 'This is an error message. Be clear and helpful.',
    default: 'Translate naturally and accurately.'
  };

  const instruction = contextInstructions[context || 'default'] || contextInstructions.default;

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. Translate the following text from ${languageNames[sourceLanguage]} to ${languageNames[targetLanguage]}.

Rules:
- ${instruction}
- Preserve the original tone and style
- Keep emojis and formatting
- Do not add explanations or notes
- Return ONLY the translated text
- If the text is already in the target language, return it unchanged`
      },
      {
        role: 'user',
        content: text
      }
    ],
    temperature: 0.3,
    max_tokens: Math.max(text.length * 2, 100)
  });

  const translatedText = completion.choices[0]?.message?.content?.trim() || text;
  
  // Quality score based on length similarity (simple heuristic)
  const lengthRatio = Math.min(text.length, translatedText.length) / Math.max(text.length, translatedText.length);
  const qualityScore = lengthRatio > 0.5 ? 0.8 + (lengthRatio * 0.2) : 0.5;

  return { translatedText, qualityScore };
}

// GET /api/translate - Get cached translations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceText = searchParams.get('sourceText');
    const sourceLanguage = searchParams.get('sourceLanguage') || 'ru';
    const targetLanguage = searchParams.get('targetLanguage');
    const context = searchParams.get('context') || null;

    if (!targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required parameter: targetLanguage' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: {
      sourceLanguage: string;
      targetLanguage: string;
      sourceText?: string;
      context?: string | null;
    } = {
      sourceLanguage,
      targetLanguage,
    };

    if (sourceText) {
      where.sourceText = sourceText;
    }

    if (context) {
      where.context = context;
    }

    const cachedTranslations = await db.translationCache.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({
      success: true,
      translations: cachedTranslations,
      count: cachedTranslations.length
    });

  } catch (error) {
    console.error('Translation cache fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cached translations', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/translate - Translate text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if batch request
    if ('texts' in body && Array.isArray(body.texts)) {
      return handleBatchTranslate(body as BatchTranslateRequest);
    }

    return handleSingleTranslate(body as TranslateRequest);

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate text', details: String(error) },
      { status: 500 }
    );
  }
}

// Handle single text translation
async function handleSingleTranslate(body: TranslateRequest) {
  const { text, targetLanguage, sourceLanguage, context } = body;

  if (!text || !targetLanguage) {
    return NextResponse.json(
      { error: 'Missing required fields: text, targetLanguage' },
      { status: 400 }
    );
  }

  // Validate target language
  if (!SUPPORTED_LANGUAGES.some(l => l.code === targetLanguage)) {
    return NextResponse.json(
      { error: `Unsupported target language: ${targetLanguage}` },
      { status: 400 }
    );
  }

  // Detect source language if not provided
  const detectedSource = sourceLanguage || await detectLanguage(text);

  // Check cache first
  // Note: Prisma compound unique constraint doesn't support null values directly
  // So we use findFirst for null context and findUnique for non-null context
  let cached;
  if (context) {
    cached = await db.translationCache.findUnique({
      where: {
        sourceText_sourceLanguage_targetLanguage_context: {
          sourceText: text,
          sourceLanguage: detectedSource,
          targetLanguage: targetLanguage,
          context: context
        }
      }
    });
  } else {
    cached = await db.translationCache.findFirst({
      where: {
        sourceText: text,
        sourceLanguage: detectedSource,
        targetLanguage: targetLanguage,
        context: null
      }
    });
  }

  if (cached) {
    return NextResponse.json({
      success: true,
      translatedText: cached.translatedText,
      sourceLanguage: detectedSource,
      targetLanguage,
      cached: true,
      qualityScore: cached.qualityScore
    });
  }

  // Perform translation
  const { translatedText, qualityScore } = await translateWithAI(
    text,
    detectedSource,
    targetLanguage,
    context
  );

  // Save to cache
  const savedTranslation = await db.translationCache.create({
    data: {
      id: nanoid(),
      sourceText: text,
      sourceLanguage: detectedSource,
      targetLanguage,
      translatedText,
      context: context || null,
      translator: 'ai',
      qualityScore
    }
  });

  return NextResponse.json({
    success: true,
    translatedText,
    sourceLanguage: detectedSource,
    targetLanguage,
    cached: false,
    qualityScore,
    translationId: savedTranslation.id
  });
}

// Handle batch translation
async function handleBatchTranslate(body: BatchTranslateRequest) {
  const { texts, targetLanguage, sourceLanguage, context } = body;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty texts array' },
      { status: 400 }
    );
  }

  if (!targetLanguage) {
    return NextResponse.json(
      { error: 'Missing required field: targetLanguage' },
      { status: 400 }
    );
  }

  // Validate target language
  if (!SUPPORTED_LANGUAGES.some(l => l.code === targetLanguage)) {
    return NextResponse.json(
      { error: `Unsupported target language: ${targetLanguage}` },
      { status: 400 }
    );
  }

  const results: Array<{
    original: string;
    translated: string;
    sourceLanguage: string;
    cached: boolean;
    qualityScore?: number | null;
  }> = [];

  // Detect source language once for all texts (assuming same language)
  const detectedSource = sourceLanguage || await detectLanguage(texts[0]);

  for (const text of texts) {
    // Check cache
    // Note: Prisma compound unique constraint doesn't support null values directly
    // So we use findFirst for null context and findUnique for non-null context
    let cached;
    if (context) {
      cached = await db.translationCache.findUnique({
        where: {
          sourceText_sourceLanguage_targetLanguage_context: {
            sourceText: text,
            sourceLanguage: detectedSource,
            targetLanguage: targetLanguage,
            context: context
          }
        }
      });
    } else {
      cached = await db.translationCache.findFirst({
        where: {
          sourceText: text,
          sourceLanguage: detectedSource,
          targetLanguage: targetLanguage,
          context: null
        }
      });
    }

    if (cached) {
      results.push({
        original: text,
        translated: cached.translatedText,
        sourceLanguage: detectedSource,
        cached: true,
        qualityScore: cached.qualityScore
      });
      continue;
    }

    // Translate
    const { translatedText, qualityScore } = await translateWithAI(
      text,
      detectedSource,
      targetLanguage,
      context
    );

    // Save to cache
    await db.translationCache.create({
      data: {
        id: nanoid(),
        sourceText: text,
        sourceLanguage: detectedSource,
        targetLanguage,
        translatedText,
        context: context || null,
        translator: 'ai',
        qualityScore
      }
    });

    results.push({
      original: text,
      translated: translatedText,
      sourceLanguage: detectedSource,
      cached: false,
      qualityScore
    });
  }

  return NextResponse.json({
    success: true,
    results,
    sourceLanguage: detectedSource,
    targetLanguage,
    totalProcessed: texts.length
  });
}
