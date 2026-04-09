import { SimpleContentStudio } from '@/components/content-studio/simple-content-studio';

export const metadata = {
  title: 'Content Studio - AI генерация видео и изображений',
  description: 'Генерируйте видео и изображения с помощью AI. Введите промпт - получите результат.',
};

export default function ContentStudioPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <SimpleContentStudio />
    </div>
  );
}
