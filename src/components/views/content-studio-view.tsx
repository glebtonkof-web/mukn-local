'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Динамический импорт для избежания SSR проблем
const UnifiedContentStudio = dynamic(
  () => import('@/components/content-studio/unified-content-studio').then(mod => mod.UnifiedContentStudio),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка Content Studio...</p>
        </div>
      </div>
    )
  }
);

export function ContentStudioView() {
  return (
    <div className="container mx-auto py-4 px-4 max-w-[1800px]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Content Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Универсальная студия контента: видео, изображения, аудио, текст — всё в одном месте
        </p>
      </div>
      <UnifiedContentStudio />
    </div>
  );
}

export default ContentStudioView;
