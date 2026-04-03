# Video Generator - Автоматическая генерация видео

Автоматический генератор видео из текстовых сценариев с публикацией в TikTok, Instagram Reels, YouTube Shorts.

## Возможности

- ✅ Генерация видео из текстовых сценариев (JSON)
- ✅ Автоматическая озвучка (Edge-TTS - бесплатно, 14+ голосов)
- ✅ Поиск стоковых видео (Pexels API - бесплатно)
- ✅ Субтитры (опционально)
- ✅ Разные ориентации (9:16, 16:9, 1:1)
- ✅ Публикация на TikTok, Instagram, YouTube (через API)

## Быстрый старт

### 1. Установка зависимостей

```bash
# Node.js зависимости
npm install

# Python зависимости (для Edge-TTS)
pip install edge-tts

# FFmpeg (если не установлен)
# Ubuntu/Debian:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Windows:
# Скачайте с https://ffmpeg.org/download.html
```

### 2. Настройка API ключей

Создайте файл `.env.local` в корне проекта:

```env
# Pexels API (бесплатно) - https://www.pexels.com/api/
PEXELS_API_KEY=your_key_here

# Pixabay API (опционально) - https://pixabay.com/api/docs/
PIXABAY_API_KEY=your_key_here

# Для публикации (опционально)
UPLOAD_POST_API_KEY=your_key_here
```

### 3. Запуск генерации

```bash
# Запуск веб-интерфейса
npm run dev

# Или через CLI:
npm run generate
```

## Формат сценария

```json
{
  "id": "video-1",
  "title": "Название видео",
  "orientation": "portrait",
  "voice": "ru-RU-SvetlanaNeural",
  "script": "[Visual: описание] Текст сцены 1.\n\n[Visual: другое описание] Текст сцены 2.",
  "hashtags": ["#тег1", "#тег2"],
  "description": "Описание видео"
}
```

### Доступные голоса

| ID | Название | Язык | Пол |
|----|----------|------|-----|
| ru-RU-SvetlanaNeural | Светлана | RU | Ж |
| ru-RU-DmitryNeural | Дмитрий | RU | М |
| en-US-JennyNeural | Jenny | EN | Ж |
| en-US-GuyNeural | Guy | EN | М |
| en-GB-SoniaNeural | Sonia | EN-GB | Ж |
| en-GB-RyanNeural | Ryan | EN-GB | М |

### Ориентации

- `portrait` - 9:16 (TikTok, Reels, Shorts)
- `landscape` - 16:9 (YouTube)
- `square` - 1:1 (Instagram)

## Визуальные теги

Используйте `[Visual: описание]` для указания что искать:

```
[Visual: bitcoin chart growth] Текст сцены...
[Visual: beautiful sunset] Продолжение текста...
```

Система автоматически найдёт подходящие стоковые видео на Pexels/Pixabay.

## Примеры сценариев

Примеры находятся в файле `input/input-scripts.json`.

## Структура проекта

```
src/lib/video-generator/
├── types.ts          # Типы данных
├── parser/           # Парсинг сценариев
├── tts/              # Генерация озвучки
├── visual/           # Поиск стоковых видео
├── assembly/         # Сборка видео (FFmpeg)
├── publisher/        # Публикация на платформы
└── index.ts          # Главный класс VideoGenerator

input/
└── input-scripts.json  # Примеры сценариев

output/
├── videos/            # Готовые видео
├── audio/             # Временные аудио файлы
└── frames/            # Временные кадры
```

## Требования к системе

- Node.js 18+
- Python 3.8+ (для Edge-TTS)
- FFmpeg в PATH
- Минимум 4GB RAM
- 1GB свободного места на диске

## Лицензия

MIT License - свободное использование

## Кредиты

- [Edge-TTS](https://github.com/rany2/edge-tts) - бесплатная озвучка от Microsoft
- [Pexels API](https://www.pexels.com/api/) - бесплатные стоковые видео
- [Pixabay API](https://pixabay.com/api/docs/) - бесплатные стоковые видео
- [FFmpeg](https://ffmpeg.org/) - обработка видео
