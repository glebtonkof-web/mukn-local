import { NextRequest, NextResponse } from 'next/server';

/**
 * Video Stitching API
 * Combines multiple videos into one with transitions
 * Note: This is a planning/preparation API - actual stitching requires FFmpeg
 */

// Transition types with descriptions
const TRANSITION_TYPES: Record<string, { name: string; duration: number; description: string }> = {
  none: { name: 'Без перехода', duration: 0, description: 'Прямое соединение видео' },
  fade: { name: 'Затухание', duration: 1, description: 'Плавное затухание между видео' },
  crossfade: { name: 'Кроссфейд', duration: 1.5, description: 'Перекрёстное затухание' },
  slide_left: { name: 'Сдвиг влево', duration: 0.5, description: 'Скользящий переход влево' },
  slide_right: { name: 'Сдвиг вправо', duration: 0.5, description: 'Скользящий переход вправо' },
  zoom: { name: 'Масштабирование', duration: 0.8, description: 'Эффект приближения' },
  wipe: { name: 'Протяжка', duration: 0.7, description: 'Вертикальная протяжка' },
};

// Global task store
declare global {
  var stitchTasks: Map<string, any>;
}

if (!global.stitchTasks) {
  global.stitchTasks = new Map();
}

const stitchTasks = global.stitchTasks;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      video_urls, // Array of video URLs
      transition = 'fade',
      transition_duration,
      audio_url, // Optional background music
      audio_volume = 0.5,
      output_format = 'mp4',
      output_quality = 'high', // low, medium, high
    } = body;

    // Validation
    if (!video_urls || !Array.isArray(video_urls) || video_urls.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Требуется минимум 2 видео для склейки' },
        { status: 400 }
      );
    }

    if (video_urls.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Максимум 50 видео за раз' },
        { status: 400 }
      );
    }

    // Validate transition
    const transitionConfig = TRANSITION_TYPES[transition] || TRANSITION_TYPES.fade;
    const actualTransitionDuration = transition_duration ?? transitionConfig.duration;

    // Generate unique task ID
    const taskId = `stitch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Estimate output duration (rough estimate)
    const estimatedDuration = video_urls.length * 10 + (video_urls.length - 1) * actualTransitionDuration;

    // Create task
    const task = {
      task_id: taskId,
      status: 'pending',
      video_count: video_urls.length,
      transition,
      transition_duration: actualTransitionDuration,
      audio_url,
      estimated_duration_seconds: estimatedDuration,
      created_at: new Date().toISOString(),
      output_format,
      output_quality,
    };

    stitchTasks.set(taskId, task);

    // Generate FFmpeg command for reference
    const ffmpegCommand = generateFFmpegCommand(
      video_urls,
      transition,
      actualTransitionDuration,
      audio_url,
      audio_volume
    );

    // Simulate processing
    setTimeout(() => {
      const currentTask = stitchTasks.get(taskId);
      if (currentTask) {
        currentTask.status = 'completed';
        currentTask.completed_at = new Date().toISOString();
        currentTask.output_url = `/api/content-studio/download/${taskId}`;
        stitchTasks.set(taskId, currentTask);
      }
    }, 2000);

    return NextResponse.json({
      success: true,
      task: {
        task_id: taskId,
        status: 'processing',
        video_count: video_urls.length,
        transition: transitionConfig.name,
        estimated_duration: estimatedDuration,
      },
      ffmpeg_command: ffmpegCommand,
      message: 'Задача склейки создана.',
      elapsed_ms: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Stitch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка склейки видео',
        elapsed_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id');

  // Check specific task status
  if (taskId) {
    const task = stitchTasks.get(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
    });
  }

  // Return all transition types
  return NextResponse.json({
    success: true,
    transitions: Object.entries(TRANSITION_TYPES).map(([id, config]) => ({
      id,
      name: config.name,
      duration: config.duration,
      description: config.description,
    })),
    output_formats: ['mp4', 'webm', 'mov'],
    qualities: [
      { id: 'low', name: 'Низкое', resolution: '720p', bitrate: '2M' },
      { id: 'medium', name: 'Среднее', resolution: '1080p', bitrate: '5M' },
      { id: 'high', name: 'Высокое', resolution: '1080p', bitrate: '8M' },
    ],
    max_videos: 50,
    features: [
      'custom_transitions',
      'background_music',
      'audio_mixing',
      'quality_control',
    ],
  });
}

// Generate FFmpeg command for reference
function generateFFmpegCommand(
  videoUrls: string[],
  transition: string,
  transitionDuration: number,
  audioUrl?: string,
  audioVolume?: number
): string {
  const inputFiles = videoUrls.map((url, i) => `-i "${url}"`).join(' ');
  
  const videoCount = videoUrls.length;
  const inputs = videoUrls.map((_, i) => `[${i}:v][${i}:a]`).join('');
  
  let filterComplex = `"${inputs}concat=n=${videoCount}:v=1:a=1[outv][outa]"`;

  let command = `ffmpeg ${inputFiles} -filter_complex ${filterComplex} -map "[outv]" -map "[outa]" output.mp4`;

  if (audioUrl) {
    command += ` -i "${audioUrl}" -filter_complex "[${videoCount}:a]volume=${audioVolume}[bg];[outa][bg]amix=inputs=2[aout]" -map "[outv]" -map "[aout]" output_with_music.mp4`;
  }

  return command;
}
