import { NextRequest, NextResponse } from 'next/server';
import { getDirectAIProvider, generateWithAI } from '@/lib/ai-direct-provider';

/**
 * Direct AI Provider API
 * Allows testing and managing AI providers
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const provider = getDirectAIProvider();
  await provider.initialize();

  if (action === 'test') {
    // Test generation
    try {
      const result = await provider.generate('Say "Hello" in one word.', { maxTokens: 10 });
      return NextResponse.json({
        success: true,
        result: {
          content: result.content,
          provider: result.provider,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          responseTime: result.responseTime,
        },
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        providers: provider.getAvailableProviders(),
      });
    }
  }

  // Get available providers
  return NextResponse.json({
    success: true,
    providers: provider.getAvailableProviders(),
    hasProviders: provider.hasProviders(),
    message: provider.hasProviders() 
      ? 'AI providers configured. Use ?action=test to test generation.'
      : 'No AI providers configured. Add API keys to environment variables or database.',
    setupInstructions: {
      environmentVariables: [
        'DEEPSEEK_API_KEY - DeepSeek API key',
        'GEMINI_API_KEY - Google Gemini API key',
        'GROQ_API_KEY - Groq API key',
        'CEREBRAS_API_KEY - Cerebras API key',
        'OPENROUTER_API_KEY - OpenRouter API key',
      ],
      database: 'Configure providers in AIProviderSettings table with userId and API keys.',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, systemPrompt, temperature, maxTokens, model } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const provider = getDirectAIProvider();
    await provider.initialize();

    if (!provider.hasProviders()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No AI providers configured. Please add API keys to environment variables or settings.',
          setupInstructions: {
            environmentVariables: [
              'DEEPSEEK_API_KEY',
              'GEMINI_API_KEY',
              'GROQ_API_KEY',
              'CEREBRAS_API_KEY',
              'OPENROUTER_API_KEY',
            ],
          },
        },
        { status: 500 }
      );
    }

    const result = await provider.generate(prompt, {
      systemPrompt,
      temperature: temperature ?? 0.8,
      maxTokens: maxTokens ?? 2000,
      model,
    });

    return NextResponse.json({
      success: true,
      result: {
        content: result.content,
        provider: result.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        cost: result.cost,
        responseTime: result.responseTime,
      },
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      },
      { status: 500 }
    );
  }
}
