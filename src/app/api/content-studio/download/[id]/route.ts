import { NextRequest, NextResponse } from 'next/server';

/**
 * Download API - Serve generated content
 * Provides download links for videos, images, and audio
 */

// Global results store (shared with generate route)
declare global {
  var contentStudioResults: Map<string, { url: string; type: string; created: number }>;
  var contentStudioAudioResults: Map<string, { buffer: Buffer; type: string; created: number }>;
}

if (!global.contentStudioResults) {
  global.contentStudioResults = new Map();
}
if (!global.contentStudioAudioResults) {
  global.contentStudioAudioResults = new Map();
}

const results = global.contentStudioResults;
const audioResults = global.contentStudioAudioResults;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check video/image results first
  const result = results.get(id);
  if (result) {
    try {
      // Fetch the content from the URL
      const response = await fetch(result.url);
      
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: 'Не удалось загрузить контент' },
          { status: 500 }
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine filename
      const ext = result.type.includes('video') ? 'mp4' : 
                  result.type.includes('png') ? 'png' : 
                  result.type.includes('jpeg') ? 'jpg' : 'bin';
      const filename = `content_studio_${id}.${ext}`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': result.type,
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Download error:', error);
      return NextResponse.json(
        { success: false, error: 'Ошибка загрузки' },
        { status: 500 }
      );
    }
  }

  // Check audio results
  const audioResult = audioResults.get(id);
  if (audioResult) {
    const filename = `audio_${id}.wav`;

    return new NextResponse(new Uint8Array(audioResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': audioResult.type,
        'Content-Length': audioResult.buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return NextResponse.json(
    { success: false, error: 'Контент не найден' },
    { status: 404 }
  );
}
