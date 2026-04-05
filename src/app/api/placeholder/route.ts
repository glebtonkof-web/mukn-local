import { NextRequest, NextResponse } from 'next/server';

// GET /api/placeholder - Placeholder изображения и видео
export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url);
  
  // Проверяем если это запрос видео плейсхолдера
  const pathParts = pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  
  if (lastPart === 'video' || searchParams.get('type') === 'video') {
    return getVideoPlaceholder(searchParams);
  }
  
  const width = parseInt(searchParams.get('width') || pathParts[2] || '1024');
  const height = parseInt(searchParams.get('height') || pathParts[3] || '1024');
  const text = searchParams.get('text') || 'AI Generated';
  
  return getImagePlaceholder(width, height, text);
}

// Placeholder для изображений
function getImagePlaceholder(width: number, height: number, text: string) {
  // Создаём SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6C63FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#00D26A;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect x="10%" y="10%" width="80%" height="80%" rx="20" fill="rgba(255,255,255,0.1)"/>
      <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.9">
        🎨 AI Image
      </text>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.7">
        ${text.slice(0, 40)}
      </text>
      <text x="50%" y="85%" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.5">
        ${width} × ${height}
      </text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

// Placeholder для видео
function getVideoPlaceholder(searchParams: URLSearchParams) {
  const text = searchParams.get('text') || 'AI Video';
  const duration = searchParams.get('duration') || '5';
  
  // Создаём SVG placeholder для видео (будет показываться как превью)
  const svg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6C63FF;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#00D26A;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6C63FF;stop-opacity:1" />
        </linearGradient>
        <animateTransform 
          id="anim1"
          attributeName="transform" 
          type="translate"
          values="-1280,0;1280,0" 
          dur="3s"
          repeatCount="indefinite"/>
      </defs>
      <rect width="100%" height="100%" fill="#1a1a2e"/>
      <rect x="-1280" width="2560" height="100%" fill="url(#vgrad)" opacity="0.3">
        <animateTransform 
          attributeName="transform" 
          type="translate"
          values="0,0;1280,0" 
          dur="3s"
          repeatCount="indefinite"/>
      </rect>
      
      <!-- Video frame border -->
      <rect x="40" y="40" width="1200" height="640" rx="16" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
      
      <!-- Play button -->
      <circle cx="640" cy="360" r="60" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="3">
        <animate attributeName="r" values="60;65;60" dur="2s" repeatCount="indefinite"/>
      </circle>
      <polygon points="620,330 620,390 670,360" fill="white" opacity="0.9"/>
      
      <!-- Title -->
      <text x="640" y="200" font-family="Arial, sans-serif" font-size="56" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.9">
        🎬 Hunyuan Video
      </text>
      <text x="640" y="260" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.7">
        ${text.slice(0, 50)}
      </text>
      
      <!-- Duration badge -->
      <rect x="1100" y="620" width="100" height="40" rx="8" fill="rgba(0,0,0,0.5)"/>
      <text x="1150" y="642" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" dominant-baseline="middle">
        0:0${duration}
      </text>
      
      <!-- Resolution badge -->
      <rect x="80" y="620" width="100" height="40" rx="8" fill="rgba(0,0,0,0.5)"/>
      <text x="130" y="642" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle">
        720p HD
      </text>
      
      <!-- Model badge -->
      <rect x="540" y="620" width="200" height="40" rx="8" fill="rgba(108,99,255,0.3)"/>
      <text x="640" y="642" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle" dominant-baseline="middle">
        🧠 13B Parameters
      </text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
