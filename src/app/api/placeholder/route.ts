import { NextRequest, NextResponse } from 'next/server';

// GET /api/placeholder - Placeholder изображения
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const width = parseInt(searchParams.get('width') || '1024');
  const height = parseInt(searchParams.get('height') || '1024');
  const text = searchParams.get('text') || 'AI Generated';

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
