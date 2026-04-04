import { NextRequest, NextResponse } from 'next/server';
import { aiSandbox } from '@/lib/ai-sandbox';
import { encryptedAI } from '@/lib/encrypted-ai-client';
import { trafficObfuscator } from '@/lib/traffic-obfuscator';

// GET /api/system/security - Получение статуса безопасности
export async function GET(request: NextRequest) {
  try {
    const sandboxStats = aiSandbox.getStats();
    const encryptionStats = encryptedAI.getStats();
    const trafficStats = trafficObfuscator.getStats();
    const sandboxConfig = aiSandbox.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        sandbox: {
          stats: sandboxStats,
          config: {
            maxPromptLength: sandboxConfig.maxPromptLength,
            executionTimeout: sandboxConfig.executionTimeout,
            blockedPatternsCount: sandboxConfig.blockedPatterns.length,
          },
        },
        encryption: {
          stats: encryptionStats,
          currentKeyId: encryptedAI.getCurrentKeyId(),
        },
        trafficObfuscation: {
          stats: trafficStats,
          config: trafficObfuscator.getConfig(),
        },
      },
    });
  } catch (error) {
    console.error('Error getting security status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get security status' },
      { status: 500 }
    );
  }
}

// POST /api/system/security - Операции безопасности
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'sanitize_prompt':
        const sanitization = aiSandbox.sanitize(params.prompt);
        return NextResponse.json({ success: true, data: sanitization });

      case 'detect_injection':
        const injection = aiSandbox.detectInjection(params.prompt);
        return NextResponse.json({ success: true, data: injection });

      case 'safe_ask':
        // Выполняем AI запрос через sandbox
        const sandboxResult = await aiSandbox.safeAsk(
          params.prompt,
          async (sanitized) => {
            // Здесь должен быть вызов AI провайдера
            return `Response to: ${sanitized}`;
          }
        );
        return NextResponse.json({ success: true, data: sandboxResult });

      case 'rotate_encryption_key':
        encryptedAI.rotateKey();
        return NextResponse.json({ success: true, message: 'Encryption key rotated' });

      case 'toggle_traffic_obfuscation':
        trafficObfuscator.setEnabled(params.enabled);
        return NextResponse.json({ 
          success: true, 
          message: `Traffic obfuscation ${params.enabled ? 'enabled' : 'disabled'}` 
        });

      case 'add_blocked_pattern':
        aiSandbox.updateConfig({
          blockedPatterns: [...aiSandbox.getConfig().blockedPatterns, params.pattern],
        });
        return NextResponse.json({ success: true, message: 'Pattern added' });

      case 'encrypt_data':
        const encrypted = encryptedAI.encryptForStorage(params.data);
        return NextResponse.json({ success: true, data: encrypted });

      case 'decrypt_data':
        const decrypted = encryptedAI.decryptFromStorage(params.encryptedData);
        return NextResponse.json({ success: true, data: decrypted });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in security action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
