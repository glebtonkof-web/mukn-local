import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

// POST /api/hunyuan/edit - Редактирование изображений и видео
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      type = 'image', // 'image' | 'video'
      sourceUrl,      // URL исходного файла
      contentId,      // ID контента в БД
      editPrompt,     // Описание правок
      editType,       // 'modify' | 'extend' | 'style_transfer' | 'enhance'
    } = body;
    
    if (!editPrompt) {
      return NextResponse.json({ error: 'editPrompt is required' }, { status: 400 });
    }
    
    if (!sourceUrl && !contentId) {
      return NextResponse.json({ error: 'sourceUrl or contentId is required' }, { status: 400 });
    }
    
    let sourceMediaUrl = sourceUrl;
    
    // Если указан contentId, получаем URL из БД
    if (contentId && !sourceUrl) {
      const content = await db.generatedContent.findUnique({
        where: { id: contentId }
      });
      
      if (!content) {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 });
      }
      
      sourceMediaUrl = content.mediaUrl;
    }
    
    const zai = await ZAI.create();
    
    if (type === 'image') {
      // Редактирование изображения
      const enhancedPrompt = `Edit this image: ${editPrompt}. Maintain quality and composition.`;
      
      const response = await zai.images.generations.create({
        prompt: enhancedPrompt,
        size: '1024x1024',
        // Для редактирования можно использовать reference image
      });
      
      const imageBase64 = response.data[0]?.base64;
      
      if (!imageBase64) {
        throw new Error('No image data received');
      }
      
      // Сохраняем изображение
      const downloadDir = path.join(process.cwd(), 'download', 'hunyuan', 'edited');
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      const filename = `edited_${Date.now()}.png`;
      const imagePath = path.join(downloadDir, filename);
      const buffer = Buffer.from(imageBase64, 'base64');
      await fs.promises.writeFile(imagePath, buffer);
      
      // Создаём запись в БД
      const content = await db.generatedContent.create({
        data: {
          id: nanoid(),
          type: 'image',
          platform: 'telegram',
          source: 'z-ai-sdk-edit',
          prompt: editPrompt,
          mediaUrl: `/download/hunyuan/edited/${filename}`,
          mediaBase64: imageBase64.substring(0, 1000) + '...',
          width: 1024,
          height: 1024,
          fileSize: buffer.length,
          status: 'completed',
          generationTime: Date.now() - startTime,
          editCommand: editPrompt,
          editHistory: JSON.stringify([{
            sourceUrl: sourceMediaUrl,
            editPrompt,
            editType,
            timestamp: new Date()
          }]),
          updatedAt: new Date()
        }
      });
      
      // Сохраняем в историю правок
      await db.userEditHistory.create({
        data: {
          id: nanoid(),
          contentId: content.id,
          editType: 'image',
          userCommand: editPrompt,
          beforeState: JSON.stringify({ originalUrl: sourceMediaUrl }),
          afterState: JSON.stringify({ editedUrl: content.mediaUrl }),
          understood: true,
          satisfied: true
        }
      });
      
      return NextResponse.json({
        success: true,
        imageUrl: `data:image/png;base64,${imageBase64}`,
        mediaUrl: content.mediaUrl,
        contentId: content.id,
        editPrompt,
        generationTime: Date.now() - startTime,
      });
      
    } else if (type === 'video') {
      // Для видео - генерируем новое видео с учётом правок
      const enhancedPrompt = `${editPrompt}. High quality, professional.`;
      
      const task = await zai.video.generations.create({
        prompt: enhancedPrompt,
        quality: 'quality',
        size: '1280x720',
        fps: 30,
        duration: 5,
        with_audio: false,
      });
      
      console.log('[Hunyuan Edit] Video task created:', task.id);
      
      // Poll for results
      let result = await zai.async.result.query(task.id);
      let pollCount = 0;
      const maxPolls = 120;
      const pollInterval = 5000;
      
      while (result.task_status === 'PROCESSING' && pollCount < maxPolls) {
        pollCount++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        result = await zai.async.result.query(task.id);
      }
      
      if (result.task_status === 'SUCCESS') {
        const videoUrl = (result as any).video_result?.[0]?.url ||
                        (result as any).video_url ||
                        (result as any).url;
        
        // Создаём запись в БД
        const content = await db.generatedContent.create({
          data: {
            id: nanoid(),
            type: 'video',
            platform: 'telegram',
            source: 'z-ai-sdk-edit',
            prompt: editPrompt,
            mediaUrl: videoUrl || null,
            status: 'completed',
            generationTime: Date.now() - startTime,
            editCommand: editPrompt,
            metadata: JSON.stringify({
              taskId: task.id,
              originalUrl: sourceMediaUrl,
              editType,
            }),
            updatedAt: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          videoUrl,
          contentId: content.id,
          taskId: task.id,
          editPrompt,
          generationTime: Date.now() - startTime,
        });
      } else {
        throw new Error('Video edit generation failed or timed out');
      }
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    
  } catch (error) {
    console.error('[Hunyuan Edit] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      generationTime: Date.now() - startTime,
    }, { status: 500 });
  }
}

// GET /api/hunyuan/edit - История редактирования
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    
    if (contentId) {
      const history = await db.userEditHistory.findMany({
        where: { contentId },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json({ success: true, history });
    }
    
    // Общая история
    const history = await db.userEditHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return NextResponse.json({ success: true, history });
    
  } catch (error) {
    console.error('[Hunyuan Edit] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
