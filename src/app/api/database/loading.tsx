import { Loader2 } from 'lucide-react';

export default function ApiLoading() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
      <span className="ml-2 text-[#8A8A8A]">Загрузка...</span>
    </div>
  );
}
