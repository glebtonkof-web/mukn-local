/**
 * Text Generator Module
 * AI-powered text generation for various content types
 * Uses DirectAIProvider for API calls
 */

import { nanoid } from 'nanoid';
import { getDirectAIProvider, generateWithAI, GenerationResult } from '../ai-direct-provider';
import {
  TextGenerationOptions,
  GeneratedText,
  ContentStudioResponse,
} from './types';

// Text generation templates
const TEXT_TEMPLATES = {
  article: {
    structure: ['introduction', 'main_points', 'conclusion'],
    maxLength: 2000,
  },
  post: {
    structure: ['hook', 'content', 'cta'],
    maxLength: 500,
  },
  caption: {
    structure: ['headline', 'body', 'hashtags'],
    maxLength: 200,
  },
  script: {
    structure: ['intro', 'scenes', 'outro'],
    maxLength: 3000,
  },
  meme: {
    structure: ['top_text', 'bottom_text'],
    maxLength: 100,
  },
  'ad-copy': {
    structure: ['headline', 'benefits', 'cta'],
    maxLength: 300,
  },
};

// Tone modifiers
const TONE_MODIFIERS = {
  formal: 'Use professional and formal language, avoid slang',
  casual: 'Use casual and conversational language, friendly tone',
  humorous: 'Add humor and wit, make it entertaining',
  professional: 'Maintain professional business tone',
  emotional: 'Evoke emotions, use vivid language',
};

export class TextGenerator {
  private lastResult: GenerationResult | null = null;

  /**
   * Generate text content
   */
  async generate(options: TextGenerationOptions): Promise<ContentStudioResponse<GeneratedText>> {
    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(options);
      
      // Build user prompt
      const userPrompt = this.buildUserPrompt(options);

      // Use DirectAIProvider
      const result = await generateWithAI(userPrompt, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: this.getMaxTokens(options),
      });

      this.lastResult = result;
      const content = result.content;
      
      // Generate suggestions for improvement
      const suggestions = await this.generateSuggestions(content, options);

      const text: GeneratedText = {
        id: `text_${nanoid(8)}`,
        content,
        type: options.type,
        wordCount: content.split(/\s+/).length,
        language: options.language || 'ru',
        suggestions,
      };

      return {
        success: true,
        data: text,
        metadata: {
          id: `text_gen_${nanoid(8)}`,
          type: 'text',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          prompt: options.prompt?.substring(0, 100),
          provider: result.provider,
          model: result.model,
          tokensUsed: result.tokensIn + result.tokensOut,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Text generation failed',
      };
    }
  }

  /**
   * Generate multiple variations
   */
  async generateVariations(
    options: TextGenerationOptions,
    count: number = 3
  ): Promise<ContentStudioResponse<GeneratedText[]>> {
    const variations: GeneratedText[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.generate({
        ...options,
        prompt: `${options.prompt} (variation ${i + 1})`,
      });

      if (result.success && result.data) {
        variations.push(result.data);
      }
    }

    return {
      success: variations.length > 0,
      data: variations,
    };
  }

  /**
   * Improve/rewrite text
   */
  async improve(
    existingText: string,
    instructions: string
  ): Promise<ContentStudioResponse<GeneratedText>> {
    try {
      const result = await generateWithAI(
        `Original text:\n${existingText}\n\nInstructions: ${instructions}`,
        {
          systemPrompt: 'You are an expert text editor. Improve the given text according to instructions.',
          temperature: 0.5,
        }
      );

      const content = result.content;

      const text: GeneratedText = {
        id: `text_improved_${nanoid(8)}`,
        content,
        type: 'article',
        wordCount: content.split(/\s+/).length,
        language: 'ru',
      };

      return {
        success: true,
        data: text,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate hashtags
   */
  async generateHashtags(
    content: string,
    platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube',
    count: number = 10
  ): Promise<ContentStudioResponse<string[]>> {
    try {
      const platformRules: Record<string, string> = {
        instagram: 'Use 20-30 hashtags, mix popular and niche',
        tiktok: 'Use 3-5 trending hashtags',
        twitter: 'Use 2-3 hashtags maximum',
        youtube: 'Use 5-10 relevant tags',
      };

      const result = await generateWithAI(
        `Content: ${content.substring(0, 500)}\nPlatform: ${platform}\nRules: ${platformRules[platform]}\n\nGenerate ${count} hashtags. Return only hashtags separated by spaces, each starting with #`,
        {
          systemPrompt: 'Generate relevant hashtags for social media content.',
          temperature: 0.8,
        }
      );

      const responseContent = result.content;
      const hashtags = responseContent
        .match(/#\w+/g)
        ?.slice(0, count) || [];

      return {
        success: true,
        data: hashtags,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(options: TextGenerationOptions): string {
    const template = TEXT_TEMPLATES[options.type] || TEXT_TEMPLATES.article;
    const toneModifier = TONE_MODIFIERS[options.tone || 'casual'];

    return `You are a professional content writer specializing in ${options.type} content.
    
${toneModifier}

Structure your content with these sections: ${template.structure.join(', ')}.

${options.targetAudience ? `Target audience: ${options.targetAudience}` : ''}

${options.keywords?.length ? `Include these keywords naturally: ${options.keywords.join(', ')}` : ''}

Write in ${options.language || 'Russian'}. Be engaging and authentic.`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(options: TextGenerationOptions): string {
    const lengthGuide = {
      short: 'Keep it brief (50-100 words)',
      medium: 'Moderate length (200-400 words)',
      long: 'Detailed and comprehensive (500+ words)',
    };

    return `${options.prompt}

${lengthGuide[options.length || 'medium']}`;
  }

  /**
   * Get max tokens based on content type
   */
  private getMaxTokens(options: TextGenerationOptions): number {
    const template = TEXT_TEMPLATES[options.type] || TEXT_TEMPLATES.article;
    
    const lengthMultiplier = {
      short: 0.5,
      medium: 1,
      long: 2,
    };

    return Math.min(
      template.maxLength * 2,
      2000 * (lengthMultiplier[options.length || 'medium'] || 1)
    );
  }

  /**
   * Generate suggestions for improvement
   */
  private async generateSuggestions(
    content: string,
    options: TextGenerationOptions
  ): Promise<string[]> {
    // Quick suggestions based on content analysis
    const suggestions: string[] = [];

    if (content.length < 100 && options.type !== 'caption' && options.type !== 'meme') {
      suggestions.push('Consider expanding the content for better engagement');
    }

    if (!content.includes('?') && options.type === 'post') {
      suggestions.push('Add a question to encourage audience interaction');
    }

    if (options.keywords?.length) {
      const missingKeywords = options.keywords.filter(
        k => !content.toLowerCase().includes(k.toLowerCase())
      );
      if (missingKeywords.length > 0) {
        suggestions.push(`Consider incorporating: ${missingKeywords.join(', ')}`);
      }
    }

    return suggestions;
  }

  /**
   * Get available content types
   */
  getContentTypes(): string[] {
    return Object.keys(TEXT_TEMPLATES);
  }

  /**
   * Get available tones
   */
  getTones(): string[] {
    return Object.keys(TONE_MODIFIERS);
  }

  /**
   * Get last generation result
   */
  getLastResult(): GenerationResult | null {
    return this.lastResult;
  }
}

// Singleton
let textGeneratorInstance: TextGenerator | null = null;

export function getTextGenerator(): TextGenerator {
  if (!textGeneratorInstance) {
    textGeneratorInstance = new TextGenerator();
  }
  return textGeneratorInstance;
}

// Convenience exports
export const textGen = {
  generate: (options: TextGenerationOptions) => getTextGenerator().generate(options),
  variations: (options: TextGenerationOptions, count?: number) =>
    getTextGenerator().generateVariations(options, count),
  improve: (text: string, instructions: string) =>
    getTextGenerator().improve(text, instructions),
  hashtags: (content: string, platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube', count?: number) =>
    getTextGenerator().generateHashtags(content, platform, count),
  getContentTypes: () => getTextGenerator().getContentTypes(),
  getTones: () => getTextGenerator().getTones(),
};
