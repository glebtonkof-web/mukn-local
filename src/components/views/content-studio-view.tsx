'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Динамический импорт для избежания SSR проблем
const ContentStudioProPanel = dynamic(
  () => import('@/components/content-studio/content-studio-pro-panel').then(mod => mod.ContentStudioProPanel),
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
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Content Studio Infinite</h1>
        <p className="text-muted-foreground mt-1">
          Бесконечная генерация видео через 10+ бесплатных провайдеров с авто-регистрацией аккаунтов
        </p>
      </div>
      <ContentStudioProPanel />
    </div>
  );
}

export default ContentStudioView;
