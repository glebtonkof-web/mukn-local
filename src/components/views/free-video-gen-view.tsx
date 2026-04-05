'use client';

import React from 'react';
import { FreeVideoGenPanel } from '@/components/video-gen/free-video-gen-panel';

export function FreeVideoGenView() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Free Video Generator</h1>
        <p className="text-muted-foreground mt-2">
          Бесплатная генерация видео через Kling AI, Luma Dream Machine и Runway Gen-3
        </p>
      </div>
      
      <FreeVideoGenPanel />
      
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-2">🎬 Kling AI</h3>
          <p className="text-sm text-muted-foreground">
            Основной провайдер. 60-100 кредитов/день, видео 5-10 сек, качество близкое к Runway Gen-3.
          </p>
        </div>
        
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-2">✨ Luma Dream Machine</h3>
          <p className="text-sm text-muted-foreground">
            Резервный провайдер. 30 генераций/месяц, отличная физика движения, поддержка продления видео.
          </p>
        </div>
        
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-2">🎥 Runway Gen-3</h3>
          <p className="text-sm text-muted-foreground">
            Профессиональное качество. 125 кредитов разово при регистрации, можно удалять водяные знаки.
          </p>
        </div>
      </div>
      
      {/* Workflow Tips */}
      <div className="mt-6 p-4 border rounded-lg bg-muted/50">
        <h3 className="font-semibold mb-2">🚀 Идеальный workflow для прогрева</h3>
        <ol className="text-sm text-muted-foreground space-y-2">
          <li><strong>Утро:</strong> Запустите 3-5 генераций в Kling AI — получите 15-25 уникальных роликов после нарезки</li>
          <li><strong>Обработка:</strong> Видео автоматически склеиваются с переходами, добавляется озвучка по желанию</li>
          <li><strong>Публикация:</strong> Готовые ролики в папке output/videos для TikTok, Reels, Shorts</li>
        </ol>
      </div>
    </div>
  );
}

export default FreeVideoGenView;
