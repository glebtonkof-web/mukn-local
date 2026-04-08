# МУКН - Автоматизация регистрации аккаунтов

Локальная версия системы автоматизации регистрации аккаунтов с поддержкой ADB.

## Требования

- Node.js 18+
- npm или yarn
- Android Debug Bridge (ADB) - для работы с устройствами
- Подключенное Android-устройство с включенной отладкой по USB

## Установка

```bash
# Клонирование репозитория
git clone https://github.com/glebtonkof-web/mukn-local.git
cd mukn-local

# Установка зависимостей
npm install

# Генерация Prisma клиента
npx prisma generate
```

## Настройка

1. Создайте файл `.env` в корне проекта:

```env
DATABASE_URL="file:./db/custom.db"
```

2. Инициализируйте базу данных:

```bash
npx prisma db push
```

## Запуск

```bash
# Режим разработки
npm run dev

# Сборка для продакшена
npm run build
npm start
```

Приложение будет доступно по адресу: http://localhost:3000

## Функционал

- **SIM-карты**: Автоматическое определение SIM-карт в устройстве
- **Регистрация аккаунтов**: Автоматическая регистрация в приложениях
- **Прокси**: Управление прокси-серверами
- **Мониторинг**: Отслеживание статуса операций в реальном времени

## Структура проекта

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   └── page.tsx           # Главная страница
├── components/            # React компоненты
│   └── ui/               # UI компоненты (shadcn/ui)
├── lib/                   # Библиотеки
│   ├── sim-auto/         # Автоматизация SIM
│   └── prisma.ts         # Prisma клиент
└── types/                 # TypeScript типы
```

## ADB команды

Убедитесь, что ADB установлен и устройство подключено:

```bash
# Проверка подключения
adb devices

# Должно показать:
# List of devices attached
# <device_id>    device
```

## Технологии

- Next.js 16.1.3
- TypeScript
- Prisma ORM + SQLite
- Tailwind CSS
- shadcn/ui
- ADB (Android Debug Bridge)

## Лицензия

MIT
