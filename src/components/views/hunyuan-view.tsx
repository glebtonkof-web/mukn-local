'use client';

import dynamic from 'next/dynamic';

// Ленивая загрузка профессиональной студии
const HunyuanStudioPro = dynamic(
  () => import('@/components/hunyuan/hunyuan-studio-pro').then(mod => ({ default: mod.HunyuanStudioPro })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-[#0f0f12]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#6C63FF] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#8A8A8A]">Загрузка Hunyuan Studio...</p>
        </div>
      </div>
    )
  }
);

export function HunyuanView() {
  return <HunyuanStudioPro />;
}

export default HunyuanView;
