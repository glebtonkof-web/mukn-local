'use client';

import dynamic from 'next/dynamic';

// Ленивая загрузка компонента
const HunyuanContentStudio = dynamic(
  () => import('@/components/hunyuan/hunyuan-content-studio').then(mod => ({ default: mod.HunyuanContentStudio })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-[#6C63FF] border-t-transparent rounded-full"></div>
      </div>
    )
  }
);

export function HunyuanView() {
  return <HunyuanContentStudio />;
}

export default HunyuanView;
