import { NextResponse } from 'next/server';
import { contentStudio } from '@/lib/content-studio';

export async function GET() {
  const status = contentStudio.status();
  const capabilities = contentStudio.capabilities();
  
  return NextResponse.json({
    success: true,
    data: {
      ...status,
      capabilities,
    },
  });
}
