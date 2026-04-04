import { NextRequest, NextResponse } from 'next/server';
import { hunyuanService } from '@/lib/hunyuan-service';
import { db } from '@/lib/db';

// POST /api/hunyuan/generate - Генерация контента
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generateImage':
        const imageResult = await hunyuanService.generateImage(params.prompt, {
          negativePrompt: params.negativePrompt,
          style: params.style,
          size: params.size,
        });
        return NextResponse.json(imageResult);

      case 'generateVideo':
        const videoResult = await hunyuanService.generateVideo({
          text: params.text,
          avatar: params.avatar,
          voice: params.voice,
          language: params.language,
          subtitles: params.subtitles,
          backgroundColor: params.backgroundColor,
        });
        return NextResponse.json(videoResult);

      case 'editImage':
        const editResult = await hunyuanService.editImage(params.imagePath, params.command);
        return NextResponse.json(editResult);

      case 'generateAvatar':
        const avatarResult = await hunyuanService.generateAvatar({
          gender: params.gender,
          age: params.age,
          style: params.style,
          description: params.description,
        });
        return NextResponse.json(avatarResult);

      case 'generateContent':
        const contentResult = await hunyuanService.generateContentForPlatform({
          type: params.type,
          platform: params.platform,
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          templateId: params.templateId,
          influencerId: params.influencerId,
          accountId: params.accountId,
          styleParams: params.styleParams,
        });
        return NextResponse.json(contentResult);

      case 'generateBatch':
        const batchResult = await hunyuanService.generateBatch(params.items);
        return NextResponse.json({ results: batchResult });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API Hunyuan Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/hunyuan/generate - Получение статуса или истории
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    const type = searchParams.get('type');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (contentId) {
      // Получение статуса конкретного контента
      const status = await hunyuanService.getStatus(contentId);
      const content = await db.generatedContent.findUnique({
        where: { id: contentId },
      });
      return NextResponse.json({ status, content });
    }

    // Получение истории контента
    const history = await hunyuanService.getContentHistory({
      type: type as any,
      platform: platform as any,
      limit,
      offset,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('[API Hunyuan Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
