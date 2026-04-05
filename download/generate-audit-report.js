const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, LevelFormat, PageBreak, Header, Footer, PageNumber } = require('docx');
const fs = require('fs');

// Цвета для документа
const colors = {
  primary: "26211F",      // Deep Charcoal Espresso
  body: "3D3735",         // Dark Umber Gray
  secondary: "6B6361",    // Warm Greige
  accent: "C19A6B",       // Terra Cotta Gold
  tableBg: "FDFCFB",      // Off-White
  critical: "DC2626",     // Red
  warning: "F59E0B",      // Orange
  success: "10B981",      // Green
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: colors.secondary };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: colors.body, font: "Times New Roman" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: colors.secondary, font: "Times New Roman" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-1",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-2",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-3",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-4",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list-5",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ 
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "МУКН — Отчёт аудита", color: colors.secondary, size: 20 })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ 
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Страница ", size: 20 }), new TextRun({ children: [PageNumber.CURRENT], size: 20 }), new TextRun({ text: " из ", size: 20 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 20 })]
      })] })
    },
    children: [
      // Титульная страница
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("ОТЧЁТ АУДИТА")] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [
        new TextRun({ text: "Приложение МУКН", size: 36, color: colors.body })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [
        new TextRun({ text: "Enterprise AI-powered Telegram Automation Platform", size: 24, italics: true, color: colors.secondary })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800 }, children: [
        new TextRun({ text: "Дата: 05.04.2026", size: 24, color: colors.body })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [
        new TextRun({ text: "Версия: 1.0", size: 24, color: colors.body })
      ]}),
      
      // Page break
      new Paragraph({ children: [new PageBreak()] }),
      
      // Раздел 1: Общая статистика
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Общая статистика проекта")] }),
      
      new Table({
        columnWidths: [5000, 4360],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ tableHeader: true, children: [
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 5000, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Метрика", bold: true })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 4360, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Значение", bold: true })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 5000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("API маршрутов")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4360, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("95+")] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 5000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Моделей Prisma")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4360, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("210")] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 5000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("TSX компонентов")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4360, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("162")] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 5000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Заглушек и симуляций")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4360, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "23", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 5000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Критических проблем безопасности")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4360, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", color: colors.critical, bold: true })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 5000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Неиспользуемых моделей БД")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4360, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "61", color: colors.warning })] })] }),
          ]}),
        ]
      }),
      
      new Paragraph({ spacing: { before: 200, after: 200 }, children: [
        new TextRun({ text: "Таблица 1. ", italics: true, size: 20 }),
        new TextRun({ text: "Общая статистика проекта МУКН", italics: true, size: 20, color: colors.secondary })
      ]}),
      
      // Раздел 2: Критические проблемы безопасности
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Критические проблемы безопасности")] }),
      
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun({ text: "Общая оценка безопасности: ", bold: true }),
        new TextRun({ text: "3.2/10", color: colors.critical, bold: true, size: 32 }),
        new TextRun({ text: " — Требуется немедленное вмешательство", color: colors.critical })
      ]}),
      
      // 2.1 Отсутствие авторизации
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1. Отсутствие авторизации (94% маршрутов)")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Почти все API маршруты не имеют проверки авторизации. userId передаётся как параметр запроса или используется значение по умолчанию 'default-user'. Это позволяет любому пользователю получить доступ к данным других пользователей, зная их ID.")
      ]}),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Затронутые маршруты:")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("/api/settings/* — все маршруты настроек")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("/api/campaigns/* — управление кампаниями")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("/api/accounts/* — управление аккаунтами")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("/api/ai/* — AI функции")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("И ещё ~90 маршрутов")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Рекомендация:")] }),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("Создать middleware.ts с проверкой сессии/токена для всех защищённых маршрутов.")
      ]}),
      
      // 2.2 SQL Injection
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2. SQL Injection в database/analyze")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Использование $executeRawUnsafe с непроверенными данными позволяет злоумышленнику выполнить произвольные SQL команды.")
      ]}),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Файл:")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: "src/app/api/database/analyze/route.ts:334, 424", font: "Courier New", size: 20 })
      ]}),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Рекомендация:")] }),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("Использовать whitelist для имён таблиц и колонок, либо Prisma.raw с параметризацией.")
      ]}),
      
      // 2.3 Хранение паролей
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3. Хранение паролей в открытом виде")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Пароли аккаунтов и API ключи хранятся без шифрования в базе данных.")
      ]}),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Затронутые файлы:")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("src/app/api/accounts/route.ts:60")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("src/app/api/api-keys/route.ts:78")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Рекомендация:")] }),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("Реализовать шифрование чувствительных данных с использованием AES-256.")
      ]}),
      
      // 2.4 Rate Limiting
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.4. Отсутствие rate limiting")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Нет защиты от брутфорса и DDoS атак на API endpoints. Злоумышленник может отправить неограниченное количество запросов.")
      ]}),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Рекомендация:")] }),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("Реализовать rate limiting middleware с использованием Redis или rate-limiter-flexible.")
      ]}),
      
      // 2.5 Отсутствие middleware.ts
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.5. Отсутствие middleware.ts")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Файл src/middleware.ts отсутствует, что означает отсутствие централизованной защиты маршрутов.")
      ]}),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Рекомендация:")] }),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("Создать middleware для проверки авторизации, rate limiting, CORS и логирования запросов.")
      ]}),
      
      // Page break
      new Paragraph({ children: [new PageBreak()] }),
      
      // Раздел 3: Заглушки и симуляции
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Заглушки и нереализованный функционал")] }),
      
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("Обнаружено "),
        new TextRun({ text: "23 места", bold: true }),
        new TextRun(" с заглушками, симуляциями и нереализованным функционалом.")
      ]}),
      
      new Table({
        columnWidths: [1000, 3500, 4860],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ tableHeader: true, children: [
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 1000, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "#", bold: true })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Файл", bold: true })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 4860, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Проблема", bold: true })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("auth/2fa/enable/route.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Пароль без хеширования", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("lib/crm-service.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Shopify возвращает mock данные", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("api/shadow-ban/route.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Math.random() вместо реальных API", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("lib/parsing-service.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Парсинг генерирует случайные данные", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", color: colors.warning })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("gif-generator.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "GIF создание не реализовано", color: colors.warning })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6", color: colors.warning })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("full-auto-mode.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Публикация только обновляет БД", color: colors.warning })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "7", color: colors.warning })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("report-sender.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Email отправка только логирует", color: colors.warning })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", color: colors.warning })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("auto-repost.ts")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "findViralPosts возвращает []", color: colors.warning })] })] }),
          ]}),
        ]
      }),
      
      new Paragraph({ spacing: { before: 200, after: 200 }, children: [
        new TextRun({ text: "Таблица 2. ", italics: true, size: 20 }),
        new TextRun({ text: "Основные заглушки и симуляции (первые 8 из 23)", italics: true, size: 20, color: colors.secondary })
      ]}),
      
      // Page break
      new Paragraph({ children: [new PageBreak()] }),
      
      // Раздел 4: Проблемы базы данных
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Проблемы базы данных")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1. Неиспользуемые модели (61 модель)")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Следующие модели определены в схеме, но не найдены в коде приложения:")
      ]}),
      
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun({ text: "aBTest, aBTestVariant, aIDialog, aIDialogMessage, aIPodcast, accountOrder, achievement, auctionBid, autoChannelCreator, autoFormatTester, blueskyIntegration, bundleReview, campaignExtended, competitorBanAnalysis, competitorCampaignClone, conversionFunnel, crossPlatformAnalytics, crowdsourcedScheme, deepSeekAccount, deepSeekCache...", size: 20, color: colors.secondary })
      ]}),
      
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Рекомендация:")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Удалить модели, которые точно не будут использоваться")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Для планируемых моделей — добавить документацию")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2. Отсутствие каскадного удаления")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Только "),
        new TextRun({ text: "19 из 65 связей", bold: true }),
        new TextRun(" имеют onDelete: Cascade. Это может привести к нарушению целостности данных и «сиротским» записям.")
      ]}),
      
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Критические связи без каскадного удаления:")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Account -> User, SimCard")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Campaign -> User")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Influencer -> Account, User")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun("Post -> Campaign, Influencer")] }),
      
      // Раздел 5: Рекомендации
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Рекомендации по исправлению")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Приоритет 1 (Критический)")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Создать middleware.ts с проверкой авторизации для всех защищённых маршрутов")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Реализовать шифрование паролей и API ключей (AES-256)")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Исправить SQL injection в database/analyze")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Добавить rate limiting на все API endpoints")] }),
      new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun("Убрать автоматическое создание admin пользователя")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Приоритет 2 (Высокий)")] }),
      new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun("Внедрить Zod для валидации входных данных")] }),
      new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun("Добавить проверку владения ресурсами во все CRUD операции")] }),
      new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun("Скрыть секретные данные в ответах API")] }),
      new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun("Реализовать CSRF защиту")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Приоритет 3 (Средний)")] }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("Заменить симуляции на реальные API вызовы")] }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("Стандартизировать формат ответов API")] }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("Добавить request ID для трассировки")] }),
      new Paragraph({ numbering: { reference: "numbered-list-3", level: 0 }, children: [new TextRun("Удалить 61 неиспользуемую модель из Prisma схемы")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Приоритет 4 (Низкий)")] }),
      new Paragraph({ numbering: { reference: "numbered-list-4", level: 0 }, children: [new TextRun("Улучшить обработку ошибок")] }),
      new Paragraph({ numbering: { reference: "numbered-list-4", level: 0 }, children: [new TextRun("Добавить Swagger/OpenAPI документацию")] }),
      new Paragraph({ numbering: { reference: "numbered-list-4", level: 0 }, children: [new TextRun("Реализовать API versioning")] }),
      new Paragraph({ numbering: { reference: "numbered-list-4", level: 0 }, children: [new TextRun("Заменить console.log на logger во всех файлах")] }),
      
      // Раздел 6: Сводная таблица безопасности
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Сводная таблица безопасности")] }),
      
      new Table({
        columnWidths: [4000, 2680, 2680],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({ tableHeader: true, children: [
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 4000, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Аспект", bold: true })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 2680, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Статус", bold: true })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 2680, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Оценка", bold: true })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Авторизация")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "❌ Отсутствует", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1/10", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Валидация данных")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⚠️ Частичная", color: colors.warning })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4/10", color: colors.warning })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("SQL Injection защита")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⚠️ Частичная", color: colors.warning })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6/10", color: colors.warning })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("XSS защита")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "❌ Не реализована", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2/10", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CSRF защита")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "❌ Отсутствует", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1/10", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Rate Limiting")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "❌ Отсутствует", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1/10", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Шифрование данных")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "❌ Не реализовано", color: colors.critical })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2/10", color: colors.critical })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Логирование")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✅ Реализовано", color: colors.success })] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "7/10", color: colors.success })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ОБЩАЯ ОЦЕНКА", bold: true })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "🔴 КРИТИЧНО", color: colors.critical, bold: true })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "E8E4E0", type: ShadingType.CLEAR }, width: { size: 2680, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3.2/10", color: colors.critical, bold: true, size: 28 })] })] }),
          ]}),
        ]
      }),
      
      new Paragraph({ spacing: { before: 200, after: 200 }, children: [
        new TextRun({ text: "Таблица 3. ", italics: true, size: 20 }),
        new TextRun({ text: "Сводная оценка безопасности", italics: true, size: 20, color: colors.secondary })
      ]}),
      
      // Заключение
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Заключение")] }),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("Проведённый аудит выявил серьёзные проблемы безопасности и архитектурные недостатки в приложении МУКН. Наиболее критичными являются отсутствие авторизации в 94% API маршрутов, хранение паролей в открытом виде и наличие SQL injection уязвимостей. Требуется немедленное вмешательство для исправления критических проблем безопасности перед развёртыванием в production.")
      ]}),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun("Также обнаружено значительное количество заглушек и симуляций (23 места), которые должны быть заменены на реальные интеграции с внешними API. База данных содержит 61 неиспользуемую модель, что усложняет поддержку схемы.")
      ]}),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun({ text: "Рекомендуется выполнить исправление проблем в соответствии с приоритетами, указанными в разделе 5, перед запуском приложения в production.", bold: true })
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/MUKN_Audit_Report.docx", buffer);
  console.log("Report saved to /home/z/my-project/download/MUKN_Audit_Report.docx");
});
