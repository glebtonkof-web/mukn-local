# Free Video Generator Module

Автоматическая генерация коротких и длинных видео через бесплатные AI сервисы.

## 🎯 Возможности

- **Три провайдера**: Kling AI (основной), Luma Dream Machine, Runway Gen-3
- **Короткие видео**: 5-10 секунд за один запрос
- **Длинные видео**: до 3 минут через склейку сцен
- **Переходы**: fade, crossfade, zoom, slide между сценами
- **TTS озвучка**: gTTS, Edge TTS (бесплатно)
- **Фоновая музыка**: Pixabay, Freesound (royalty-free)
- **Кэширование**: повторные запросы не тратят кредиты

## 📦 Установка

```bash
cd mini-services/free-video-gen

# Python 3.10+
pip install -r requirements.txt

# Playwright браузеры
playwright install chromium

# FFmpeg (если не установлен)
# Ubuntu: sudo apt install ffmpeg
# macOS: brew install ffmpeg
# Windows: скачать с ffmpeg.org
```

## 🚀 Запуск

### HTTP API Server

```bash
python main.py --server --port 8766
```

### CLI

```bash
# Короткое видео
python main.py --mode short --prompt "cat playing with ball" --duration 10

# Длинное видео
python main.py --mode long --prompt "A day in Tokyo..." --duration 60 --voiceover

# Из JSON сценария
python main.py --mode script --file script.json

# Статус провайдеров
python main.py --mode status
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Информация о сервисе |
| `/health` | GET | Health check |
| `/status` | GET | Полный статус и провайдеры |
| `/providers` | GET | Статус всех провайдеров |
| `/generate` | POST | Генерация короткого видео |
| `/generate/long` | POST | Генерация длинного видео |
| `/generate/script` | POST | Генерация из JSON сценария |
| `/task/{id}` | GET | Статус задачи |
| `/task/{id}/wait` | GET | Ожидание завершения |
| `/download/{filename}` | GET | Скачивание видео |
| `/split-scenario` | POST | Разбить сценарий на сцены |
| `/enhance-prompt` | POST | Улучшить промпт |

## 📝 Примеры запросов

### Короткое видео

```bash
curl -X POST http://localhost:8766/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over the ocean, cinematic, 4k",
    "duration": 10,
    "ratio": "9:16",
    "style": "cinematic"
  }'
```

### Длинное видео

```bash
curl -X POST http://localhost:8766/generate/long \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Путешествие по Парижу: Эйфелева башня на рассвете, кафе на улице, Лувр, Сена вечером",
    "target_duration": 60,
    "ratio": "9:16",
    "voiceover": true,
    "music_style": "chill"
  }'
```

### JSON сценарий

```json
{
  "title": "Tokyo Trip",
  "ratio": "9:16",
  "scenes": [
    {
      "prompt": "Shibuya crossing, busy people, neon lights, 4k cinematic",
      "duration_sec": 8,
      "transition_out": "crossfade"
    },
    {
      "prompt": "Japanese train passing Mount Fuji, cherry blossoms",
      "duration_sec": 10,
      "transition_out": "fade"
    },
    {
      "prompt": "Tokyo sunset from rooftop, city lights coming on",
      "duration_sec": 8
    }
  ]
}
```

## ⚙️ Конфигурация

Файл `config.yaml`:

```yaml
providers:
  kling:
    enabled: true
    daily_credits: 100
    max_requests_per_hour: 5
    priority: 1
    
  luma:
    enabled: true
    monthly_limit: 30
    priority: 2
    
  runway:
    enabled: true
    initial_credits: 125
    priority: 3

video:
  default_duration: 10
  default_ratio: "9:16"
  output_dir: "./output/videos"
  
audio:
  tts:
    enabled: true
    engine: "gtts"
    default_language: "ru"
```

## 🔐 Первичная настройка провайдеров

### Kling AI

1. Откройте браузер вручную:
```bash
python main.py --mode short --prompt "test" --provider kling
```
2. В открывшемся браузере войдите в аккаунт
3. Cookies сохранятся автоматически

### Luma Dream Machine

1. Зарегистрируйтесь на lumalabs.ai
2. Войдите через Discord или Google
3. Cookies сохранятся после первого логина

### Runway Gen-3

1. Зарегистрируйтесь на runwayml.com
2. Используйте email (карта не требуется)
3. 125 кредитов доступны сразу

## 📊 Лимиты провайдеров

| Провайдер | Лимит | Длительность | Качество |
|-----------|-------|--------------|----------|
| Kling AI | 100 кред/день | 5-10 сек | ~1080p |
| Luma | 30 ген/месяц | 5 сек | Высокое |
| Runway | 125 кред (разово) | 5-10 сек | Профессиональное |

**Комбинированный лимит**: ~20-50 видео в день при использовании всех провайдеров.

## 🎬 Workflow для прогрева

1. **Утро**: Запустите 5-10 генераций в Kling AI
2. **Обработка**: Нарежьте видео на 3-5 частей каждое
3. **Результат**: 15-50 уникальных роликов для TikTok/Reels

## 🔧 Требования

- Python 3.10+
- FFmpeg
- Playwright (Chromium)
- 4+ GB RAM
- Интернет-соединение

## 📁 Структура файлов

```
mini-services/free-video-gen/
├── main.py              # Точка входа
├── config.yaml          # Конфигурация
├── requirements.txt     # Зависимости
├── core/
│   ├── types.py         # Типы данных
│   ├── utils.py         # Утилиты
│   ├── queue.py         # Очередь задач
│   ├── cache.py         # Кэширование
│   ├── video_stitcher.py # Склейка видео
│   ├── scene_splitter.py # Разбиение сцен
│   └── audio_mixer.py   # Аудио
├── providers/
│   ├── base.py          # Базовый класс
│   ├── kling.py         # Kling AI
│   ├── luma.py          # Luma
│   ├── runway.py        # Runway
│   └── manager.py       # Менеджер провайдеров
└── api/
    └── server.py        # FastAPI сервер
```

## 🤝 Интеграция с МУКН

Модуль интегрирован в основное приложение через API роуты:

- `/api/video-gen/generate` - Генерация
- `/api/video-gen/status` - Статус
- `/api/video-gen/task/[id]` - Задача

UI компонент: `src/components/video-gen/free-video-gen-panel.tsx`
