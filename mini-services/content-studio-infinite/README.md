# Content Studio Infinite

**Бесконечная генерация видео через 10+ бесплатных провайдеров**

МУКН | Трафик - Enterprise AI-powered Content Generation Platform

---

## Ключевая идея

> Лимиты есть у каждого сервиса, но нет лимитов на количество аккаунтов.

Система сама создаёт новые аккаунты через временную почту, когда старые исчерпывают дневной лимит.

## Провайдеры (10 шт., все 100% бесплатны)

| # | Провайдер | Длина | Лимит/аккаунт | Авторегистрация |
|---|-----------|-------|---------------|-----------------|
| 1 | Kling AI | 10 сек | 60-100/день | ✅ (email) |
| 2 | Wan.video | 10 сек | ~30/день | ✅ (email) |
| 3 | Digen.ai | 5 сек | ~25/день | ✅ (email) |
| 4 | Qwen AI | 5-10 сек | ~20/день | ✅ (email) |
| 5 | Runway Gen-3 | 10 сек | 125 разово | ✅ (email) |
| 6 | Luma | 5 сек | 30/месяц | ✅ (Google/Discord) |
| 7 | Pika Labs | 5-10 сек | ~50/месяц | ✅ (email) |
| 8 | Haiper AI | 5-10 сек | ~20/день | ✅ (email) |
| 9 | Vidu Studio | 5-10 сек | ~15/день | ✅ (email) |
| 10 | Meta AI | 60 сек | ~20/день | ❌ (требуется Facebook) |

## Возможности

- **Бесконечная генерация**: Автоматическое создание новых аккаунтов при исчерпании лимитов
- **10 провайдеров**: Ротация между сервисами для максимизации производительности
- **Авторегистрация**: Автоматическая регистрация через временные email (1secmail, Guerrilla Mail, etc.)
- **Многопоточность**: До 10 параллельных генераций
- **Очередь задач**: Приоритетная очередь с персистентностью
- **Склейка видео**: Создание длинных видео из коротких клипов с переходами
- **Генератор промптов**: Автоматическое создание уникальных промптов

## Установка

```bash
# Установка зависимостей Python
cd mini-services/content-studio-infinite
pip install -r requirements.txt

# Установка Playwright браузеров
playwright install chromium

# Установка FFmpeg (для склейки видео)
sudo apt install ffmpeg
```

## Запуск

### API Сервер

```bash
python main.py --server --port 8767
```

### CLI Использование

```bash
# Генерация одного видео
python main.py --generate "A cat playing with a ball"

# Пакетная генерация из файла
python main.py --batch prompts.txt

# Регистрация аккаунта
python main.py --register kling

# Склейка видео
python main.py --stitch videos.txt --transition xfade

# Статус системы
python main.py --status
```

## API Endpoints

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/generate` | POST | Создать задачу на генерацию |
| `/api/generate/batch` | POST | Создать множество задач |
| `/api/task/{id}` | GET | Статус задачи |
| `/api/tasks` | GET | Список задач |
| `/api/providers` | GET | Статус провайдеров |
| `/api/accounts/{provider}` | GET | Аккаунты провайдера |
| `/api/accounts/register` | POST | Зарегистрировать аккаунт |
| `/api/stats` | GET | Статистика системы |
| `/api/prompts/generate` | POST | Генерация промптов |
| `/api/stitch` | POST | Склейка видео |

## Архитектура

```
content-studio-infinite/
├── core/
│   ├── types.py           # Типы данных
│   ├── temp_email.py      # Сервисы временной почты
│   ├── account_pool.py    # Пул аккаунтов
│   ├── auto_register.py   # Авторегистрация
│   ├── task_queue.py      # Очередь задач
│   ├── prompt_variator.py # Генератор промптов
│   ├── video_stitcher.py  # Склейка видео
│   └── infinite_generator.py # Главный класс
├── providers/
│   ├── base.py            # Базовый провайдер
│   └── universal.py       # Универсальный провайдер
├── api/
│   └── server.py          # FastAPI сервер
├── data/
│   ├── accounts/          # Данные аккаунтов
│   ├── queue/             # Очередь задач
│   ├── videos/            # Сгенерированные видео
│   └── logs/              # Логи
├── main.py                # CLI + сервер
├── config.yaml            # Конфигурация
└── requirements.txt       # Зависимости
```

## Расчёт возможностей

При 50 аккаунтах на провайдера:

| Провайдер | Аккаунтов | Ген/день/акк | Сек/день | Минут/день |
|-----------|-----------|--------------|----------|------------|
| Kling | 50 | 100 | 50,000 | 833 |
| Wan | 50 | 30 | 15,000 | 250 |
| Digen | 50 | 25 | 6,250 | 104 |
| Qwen | 50 | 20 | 5,000 | 83 |
| **Итого** | **200** | — | **76,250** | **~1270 минут (21 час)** |

## Интеграция с МУКН

Content Studio Infinite интегрируется в МУКН через:

1. **Next.js API Routes** (`/api/content-studio-infinite/*`)
2. **React UI** (`/components/content-studio/content-studio-pro-panel.tsx`)
3. **View** (`/components/views/content-studio-view.tsx`)

## Важные замечания

| Риск | Решение |
|------|---------|
| Бан по IP | Поддержка прокси / VPN с ротацией |
| Капча | Интеграция сервисов решения капч |
| WeChat/QR | Использовать email-регистрацию |
| Meta AI | Ручное создание Facebook аккаунтов |

## Лицензия

Proprietary - МУКН | Трафик
