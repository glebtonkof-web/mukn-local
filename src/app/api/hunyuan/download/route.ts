import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

// GET /api/hunyuan/download?contentId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    
    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    }
    
    // Получаем контент из БД
    const content = await db.generatedContent.findUnique({
      where: { id: contentId }
    });
    
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    // Если есть локальный файл
    if (content.mediaUrl && content.mediaUrl.startsWith('/download/')) {
      const filePath = path.join(process.cwd(), content.mediaUrl);
      
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        const filename = `${content.type}_${contentId}.${content.type === 'video' ? 'mp4' : 'png'}`;
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': content.type === 'video' ? 'video/mp4' : 'image/png',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      }
    }
    
    // Если есть внешний URL - проксируем
    if (content.mediaUrl && content.mediaUrl.startsWith('http')) {
      const response = await fetch(content.mediaUrl);
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      
      const filename = `${content.type}_${contentId}.${content.type === 'video' ? 'mp4' : 'png'}`;
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': content.type === 'video' ? 'video/mp4' : 'image/png',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    }
    
    return NextResponse.json({ error: 'No downloadable content' }, { status: 404 });
    
  } catch (error) {
    console.error('[Hunyuan Download] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}
