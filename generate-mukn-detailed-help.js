const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType, 
        TableOfContents, ShadingType, VerticalAlign, PageNumber, LevelFormat, PageBreak } = require('docx');
const fs = require('fs');

// Colors - Midnight Code palette
const colors = {
  primary: "020617",
  body: "1E293B",
  secondary: "64748B",
  accent: "94A3B8",
  tableBg: "F8FAFC",
  headerBg: "E2E8F0"
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// Helper functions
function createTextParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: options.afterSpacing || 200, line: 312 },
    children: [new TextRun({ text, size: options.size || 24, ...options.runOptions })]
  });
}

function createBulletPoint(text, reference = "bullet-main") {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { line: 312 },
    children: [new TextRun({ text, size: 24 })]
  });
}

function createNumberedItem(text, reference) {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { line: 312 },
    children: [new TextRun({ text, size: 24 })]
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun(text)]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun(text)]
  });
}

function createHeading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun(text)]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: colors.body, font: "Times New Roman" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: colors.secondary, font: "Times New Roman" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-main", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-features", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-tools", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-earn", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-api", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-faq", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-methods", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-config", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-telegram", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-instagram", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-tiktok", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-ofm", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-campaign", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-warming", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-case1", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-case2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-case3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-trouble", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-best", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [
    // Cover Section
    {
      properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
      children: [
        new Paragraph({ spacing: { before: 5000 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "МУКН | Трафик", size: 72, bold: true, color: colors.primary })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: "Enterprise AI-Powered Traffic Management Platform", size: 32, color: colors.secondary })] }),
        new Paragraph({ spacing: { before: 1000 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Полное руководство пользователя", size: 40, color: colors.body })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "Детальная документация, API-справочник, практические кейсы", size: 28, color: colors.secondary })] }),
        new Paragraph({ spacing: { before: 7000 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Версия 2.0 — Расширенное издание", size: 24, color: colors.accent })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "2025", size: 24, color: colors.accent })] })
      ]
    },
    // TOC Section
    {
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Содержание")] }),
        new TableOfContents("Содержание", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "Примечание: Для обновления номеров страниц нажмите правой кнопкой мыши на оглавлении и выберите \u00abОбновить поле\u00bb.", size: 18, color: "999999" })] }),
        new Paragraph({ children: [new PageBreak()] })
      ]
    },
    // Main Content Section
    {
      properties: { page: { margin: { top: 1800, right: 1440, bottom: 1440, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "МУКН | Полное руководство пользователя v2.0", size: 20, color: colors.secondary })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "\u2014 ", size: 20, color: colors.accent }), new TextRun({ children: [PageNumber.CURRENT], size: 20, color: colors.accent }), new TextRun({ text: " \u2014", size: 20, color: colors.accent })] })] }) },
      children: [
        // ==================== SECTION 1: INTRODUCTION ====================
        createHeading1("1. Введение в платформу МУКН"),
        createTextParagraph("МУКН | Трафик представляет собой корпоративную AI-платформу управления трафиком и автоматизации, разработанную специально для работы в режиме 24/7/365. Платформа объединяет передовые технологии искусственного интеллекта с мощными инструментами управления трафиком, позволяя пользователям эффективно монетизировать социальные медиа-платформы и автоматизировать рутинные процессы. Система построена на принципе модульности, что позволяет пользователям гибко настраивать функциональность под конкретные бизнес-задачи."),
        createTextParagraph("Основная концепция платформы заключается в управлении \"роем\" AI-инфлюенсеров \u2014 виртуальных персон, которые автоматически создают контент, взаимодействуют с аудиторией и генерируют трафик на множестве социальных платформ одновременно. Это позволяет масштабировать операции без пропорционального увеличения временных затрат оператора, что критически важно для арбитража трафика и партнёрского маркетинга."),
        
        createHeading2("1.1 Технологический стек и архитектура"),
        createTextParagraph("Платформа МУКН построена на проверенном технологическом стеке корпоративного уровня, обеспечивающем надёжность, масштабируемость и производительность. Каждый компонент выбран с учётом требований к непрерывной работе и возможности горизонтального масштабирования."),
        
        new Table({
          columnWidths: [2800, 3280, 3280],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Слой", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Технология", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Назначение", bold: true, size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Frontend", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Next.js 16, React 19", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "UI, SSR, маршрутизация", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Язык", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "TypeScript 5.x", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Типобезопасность", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Стилизация", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Tailwind CSS 4, shadcn/ui", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "UI-компоненты", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "База данных", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "SQLite / PostgreSQL", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Хранение данных", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ORM", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Prisma ORM", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Работа с БД", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Состояние", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Zustand + persist", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Клиентское состояние", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Real-time", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Socket.io", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "WebSocket соединения", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "AI", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "DeepSeek, Gemini, Groq, etc.", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Генерация контента", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Графики", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Recharts", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Визуализация данных", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Контейнеры", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Docker + Compose", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Деплой и масштабирование", size: 22 })] })] })
            ]})
          ]
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 300 }, children: [new TextRun({ text: "Таблица 1. Технологический стек платформы МУКН", size: 18, italics: true, color: colors.secondary })] }),

        createHeading2("1.2 Архитектура системы"),
        createTextParagraph("Платформа построена по микросервисной архитектуре, где каждый компонент выполняет специфическую функцию и может масштабироваться независимо. Основное приложение Next.js обслуживает веб-интерфейс и API-эндпоинты, в то время как специализированные мини-сервисы обрабатывают фоновые задачи, AI-операции и real-time коммуникации."),
        createTextParagraph("Модульная структура позволяет легко добавлять новые функциональные блоки без влияния на существующий код. Система поддерживает горизонтальное масштабирование через Docker-контейнеры и может разворачиваться как на отдельном сервере, так и в кластере для обработки высоких нагрузок."),

        // ==================== SECTION 2: MAIN FEATURES ====================
        createHeading1("2. Основные возможности платформы"),
        createTextParagraph("Платформа МУКН предоставляет обширный набор функций для полного цикла управления трафиком: от создания контента до анализа эффективности кампаний. Все инструменты интегрированы в единую экосистему, что обеспечивает бесшовный рабочий процесс и максимальную производительность."),

        createHeading2("2.1 Дашборд и аналитика"),
        createTextParagraph("Центральный дашборд является командным центром платформы, предоставляя мгновенный доступ ко всем ключевым метрикам и показателям эффективности. Интерфейс дашборда разделён на логические блоки, каждый из которых отвечает за определённый аспект работы системы. Пользователи могут отслеживать результаты в реальном времени, принимать обоснованные решения на основе данных и быстро реагировать на изменения в performanсе кампаний."),
        
        createHeading3("2.1.1 KPI-карточки"),
        createTextParagraph("Главный блок дашборда содержит карточки с ключевыми показателями эффективности, обновляющимися в реальном времени. Каждая карточка отображает текущее значение, динамику изменений и позволяет быстро перейти к детальному просмотру."),
        createBulletPoint("Общий доход \u2014 сумма всех зачислений по всем кампаниям и источникам за выбранный период"),
        createBulletPoint("Активные кампании \u2014 количество запущенных кампаний с разбивкой по статусу (активные, на паузе, завершённые)"),
        createBulletPoint("Конверсия \u2014 средний процент конверсии по всем кампаниям с динамикой относительно предыдущего периода"),
        createBulletPoint("ROI \u2014 возврат инвестиций с учётом всех затрат на рекламу и AI-операции"),
        createBulletPoint("AI-запросы \u2014 количество запросов к AI-провайдерам с информацией о стоимости и оставшихся квотах"),
        createBulletPoint("Аккаунты \u2014 статус подключённых аккаунтов с индикацией проблем (баны, ограничения, shadow ban)"),

        createHeading3("2.1.2 Графики и визуализация"),
        createTextParagraph("Блок визуализации представляет данные в форме интерактивных графиков, позволяющих анализировать тренды и выявлять паттерны. Все графики поддерживают интерактивное масштабирование, фильтрацию по периодам и экспорт данных."),
        createBulletPoint("Линейный график доходности \u2014 динамика дохода по дням/неделям с возможностью наложения нескольких периодов для сравнения"),
        createBulletPoint("Столбчатая диаграмма по кампаниям \u2014 распределение дохода и конверсий между кампаниями"),
        createBulletPoint("Круговая диаграмма источников \u2014 структура трафика по платформам (Telegram, Instagram, TikTok, другие)"),
        createBulletPoint("Тепловая карта активности \u2014 визуализация времени пиковой активности для оптимизации постинга"),

        createHeading3("2.1.3 Лента активности"),
        createTextParagraph("Лента активности в правой части дашборда отображает все события системы в хронологическом порядке. События группируются по типам и приоритетам, что позволяет быстро находить важную информацию."),
        createBulletPoint("Успешные публикации \u2014 сообщения о размещённом контенте с ссылками на посты"),
        createBulletPoint("Достижение целей \u2014 уведомления о достижении целевых показателей кампаний"),
        createBulletPoint("Предупреждения \u2014 оповещения о потенциальных проблемах (низкая конверсия, риск бана)"),
        createBulletPoint("Ошибки \u2014 информация о сбоях с рекомендациями по исправлению"),

        createHeading2("2.2 Управление кампаниями"),
        createTextParagraph("Модуль управления кампаниями является центральным звеном платформы, позволяя создавать, настраивать и оптимизировать рекламные кампании различного типа. Система поддерживает работу с множеством партнёрских сетей и офферов, предоставляя инструменты для детального анализа эффективности каждой кампании."),
        
        createHeading3("2.2.1 Создание кампании"),
        createTextParagraph("Процесс создания кампании включает несколько этапов, каждый из которых содержит детальные настройки для максимальной гибкости. Мастер создания проведёт через все необходимые шаги с подсказками и рекомендациями."),
        createNumberedItem("Выбор типа оффера \u2014 определите категорию: казино/гемблинг, криптовалюты, дейтинг, нутра/здоровье, финансы, e-commerce. Каждая категория имеет специфические настройки и рекомендации по методам трафика.", "numbered-campaign"),
        createNumberedItem("Настройка базовых параметров \u2014 укажите название кампании, бюджет, целевые показатели (CPA, CPC, CPM), период работы и географическое таргетирование.", "numbered-campaign"),
        createNumberedItem("Привязка оффера \u2014 выберите оффер из базы или добавьте новый с указанием партнёрской сети, ставки и условий конверсии.", "numbered-campaign"),
        createNumberedItem("Настройка источников трафика \u2014 привяжите аккаунты социальных платформ и выберите методы трафика из библиотеки.", "numbered-campaign"),
        createNumberedItem("Конфигурация AI-параметров \u2014 настройте генерацию контента: тональность, стиль, частота публикаций, автоматизация ответов.", "numbered-campaign"),
        createNumberedItem("Запуск и мониторинг \u2014 активируйте кампанию и отслеживайте результаты через дашборд.", "numbered-campaign"),

        createHeading3("2.2.2 Типы офферов и их особенности"),
        createTextParagraph("Платформа оптимизирована для работы с различными типами офферов, каждый из которых имеет специфические требования и стратегии продвижения."),
        
        new Table({
          columnWidths: [2340, 3510, 3510],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Тип оффера", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Особенности", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Рекомендуемые платформы", bold: true, size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Казино/Гемблинг", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Высокие ставки, строгая модерация", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Telegram, TikTok", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Криптовалюты", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Техническая аудитория, высокий чек", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Telegram, YouTube", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Дейтинг", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Массовая аудитория, высокий объём", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Instagram, TikTok", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Нутра/Здоровье", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Доверие, testimonials", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Instagram, YouTube", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Финансы", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Требовательная аудитория", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Telegram, YouTube", size: 22 })] })] })
            ]})
          ]
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 300 }, children: [new TextRun({ text: "Таблица 2. Типы офферов и рекомендуемые платформы", size: 18, italics: true, color: colors.secondary })] }),

        createHeading2("2.3 Управление AI-инфлюенсерами"),
        createTextParagraph("Революционная функция создания и управления виртуальными инфлюенсерами с полной настройкой персоны. AI-инфлюенсеры могут работать на нескольких платформах одновременно, генерируя контент и привлекая аудиторию без постоянного участия пользователя. Это ключевой элемент автоматизации, позволяющий масштабировать присутствие в социальных медиа."),

        createHeading3("2.3.1 Создание персоны инфлюенсера"),
        createTextParagraph("Персона \u2014 это виртуальный образ с уникальными характеристиками, определяющими стиль коммуникации и тип контента. Качественная проработка персоны критически важна для естественного восприятия аудиторией."),
        createBulletPoint("Базовые характеристики \u2014 имя, возраст, пол, местоположение, язык общения. Эти параметры определяют базовый портрет аудитории."),
        createBulletPoint("Ниша и специализация \u2014 тематика контента (фитнес, лайфстайл, финансы, технологии, развлечения). Выбор ниши влияет на доступные методы трафика."),
        createBulletPoint("Стиль и тон \u2014 формальный/неформальный, серьёзный/юмористический, экспертный/дружелюбный. Определяет восприятие аудиторией."),
        createBulletPoint("Психологические черты \u2014 экстраверсия/интроверсия, открытость опыту, добросовестность. Влияет на стиль генерируемого контента."),
        createBulletPoint("Визуальный образ \u2014 настройки генерации изображений (если применимо), цветовая схема, эстетика."),

        createHeading3("2.3.2 Мультиплатформенное присутствие"),
        createTextParagraph("Каждый AI-инфлюенсер может быть привязан к нескольким платформам с адаптацией контента под специфику каждой. Система автоматически оптимизирует контент для различных форматов."),
        
        new Table({
          columnWidths: [2340, 3510, 3510],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Платформа", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Форматы контента", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Особенности AI-генерации", bold: true, size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Telegram", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Посты, Stories, голосовые", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Длинный текст, TTS-сообщения", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Instagram", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Posts, Reels, Stories", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Визуальный контент, короткие тексты", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "TikTok", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Короткие видео", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "AI-сценарии, генерация видео", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2340, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "YouTube", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Длинные видео, Shorts", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3510, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Сценарии, описание, субтитры", size: 22 })] })] })
            ]})
          ]
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 300 }, children: [new TextRun({ text: "Таблица 3. Мультиплатформенное присутствие AI-инфлюенсеров", size: 18, italics: true, color: colors.secondary })] }),

        createHeading2("2.4 Методы трафика (130+ методов)"),
        createTextParagraph("Библиотека методов трафика представляет собой обширную базу проверенных техник привлечения аудитории, классифицированных по платформам, типам и уровню риска. Каждый метод содержит детальное описание, пошаговую инструкцию, требования к ресурсам и рекомендации по применению."),

        createHeading3("2.4.1 Классификация по уровню риска"),
        createTextParagraph("Каждый метод имеет оценку риска, помогающую выбрать безопасную стратегию. Риск определяется вероятностью блокировки аккаунта и эффективностью метода."),
        createBulletPoint("Низкий риск \u2014 методы с минимальной вероятностью блокировки: органический контент, взаимодействие с аудиторией, кросс-промоушн. Рекомендуются для долгосрочного построения присутствия."),
        createBulletPoint("Средний риск \u2014 методы с умеренным риском: массовые действия с ограничениями, автоматизированный постинг по расписанию. Требуют соблюдения лимитов платформы."),
        createBulletPoint("Высокий риск \u2014 агрессивные методы: массфолловинг, масслайкинг, автоматические комментарии. Высокая эффективность, но значительный риск бана."),
        createBulletPoint("Экстремальный риск \u2014 методы с высокой вероятностью блокировки: спам, накрутка, запрещённые техники. Используются только опытными арбитражниками с резервом аккаунтов."),

        createHeading3("2.4.2 Методы трафика для Telegram"),
        createTextParagraph("Telegram предоставляет уникальные возможности для трафика благодаря отсутствию жёсткой модерации и развитой экосистеме каналов. Основные методы включают:"),
        createNumberedItem("Комментинг в каналах \u2014 размещение ссылок в комментариях популярных каналов. Требует качественных аккаунтов и естественного текста.", "numbered-telegram"),
        createNumberedItem("Репосты с водяными знаками \u2014 массовый репост контента с добавлением ссылки. Автоматизируется через ботов.", "numbered-telegram"),
        createNumberedItem("Инвайт-маркетинг \u2014 приглашение пользователей в каналы через личные сообщения. Требует тёплых аккаунтов.", "numbered-telegram"),
        createNumberedItem("Боты-воронки \u2014 создание цепочек ботов, ведущих пользователя к целевому действию.", "numbered-telegram"),
        createNumberedItem("Закупка рекламы \u2014 размещение в тематических каналах через биржи или напрямую.", "numbered-telegram"),

        createHeading3("2.4.3 Методы трафика для Instagram"),
        createTextParagraph("Instagram требует более осторожного подхода из-за развитых алгоритмов детекции. Платформа предоставляет разнообразные форматы для работы с аудиторией."),
        createNumberedItem("Reels-маркетинг \u2014 создание вирусных коротких видео с органическим охватом. AI генерирует сценарии и визуальный контент.", "numbered-instagram"),
        createNumberedItem("Stories-воронки \u2014 последовательности сторис с призывом к действию. Высокая вовлечённость аудитории.", "numbered-instagram"),
        createNumberedItem("Комментинг под постами \u2014 размещение комментариев на целевых аккаунтах. Требует естественного текста и тёплых аккаунтов.", "numbered-instagram"),
        createNumberedItem("DM-маркетинг \u2014 прямые сообщения в ответ на взаимодействия (лайки, подписки).", "numbered-instagram"),
        createNumberedItem("Collaborations \u2014 совместные посты с другими аккаунтами для кросс-промоушна.", "numbered-instagram"),

        createHeading3("2.4.4 Методы трафика для TikTok"),
        createTextParagraph("TikTok характеризуется высоким органическим охватом и алгоритмической лентой, что создаёт уникальные возможности для вирусного контента."),
        createNumberedItem("Трендовый контент \u2014 создание видео на актуальные тренды с интеграцией оффера.", "numbered-tiktok"),
        createNumberedItem("Duets и Stitches \u2014 взаимодействие с популярным контентом для получения охвата.", "numbered-tiktok"),
        createNumberedItem("Серийный контент \u2014 создание серий видео, удерживающих аудиторию.", "numbered-tiktok"),
        createNumberedItem("Hashtag-стратегии \u2014 использование трендовых хештегов для повышения видимости.", "numbered-tiktok"),
        createNumberedItem("Байты на комментарии \u2014 ответы на комментарии в видео-формате для повышения вовлечённости.", "numbered-tiktok"),

        createHeading2("2.5 Движок AI-комментариев"),
        createTextParagraph("Интеллектуальная система генерации комментариев представляет собой ключевой инструмент автоматизации взаимодействия с аудиторией. Движок использует несколько AI-моделей для создания контекстно-релевантных, естественных комментариев, которые не вызывают подозрений у алгоритмов платформ."),

        createHeading3("2.5.1 Принципы работы"),
        createTextParagraph("Система анализирует контент целевого поста, определяет тематику, тональность и ключевые темы, после чего генерирует комментарий, соответствующий контексту и стилю персоны инфлюенсера. Важные параметры генерации:"),
        createBulletPoint("Контекстный анализ \u2014 понимание тематики и настроения поста для релевантного ответа"),
        createBulletPoint("Вариативность \u2014 генерация нескольких вариантов комментария для A/B тестирования"),
        createBulletPoint("Естественность \u2014 использование эмодзи, сленга, разговорных оборотов в зависимости от аудитории"),
        createBulletPoint("Call-to-Action \u2014 интеграция призыва к действию без явной рекламы"),
        createBulletPoint("Адаптация к платформе \u2014 учёт специфики каждой социальной сети (длина, формат, лимиты)"),

        createHeading3("2.5.2 Настройка стратегии комментирования"),
        createTextParagraph("Эффективное комментирование требует настройки стратегии размещения. Система предоставляет гибкие параметры для оптимизации процесса."),
        createBulletPoint("Выбор целевых каналов/аккаунтов \u2014 определение источников для размещения комментариев"),
        createBulletPoint("Фильтрация по критериям \u2014 охват аудитории, активность, тематика, конкурентная среда"),
        createBulletPoint("Расписание размещения \u2014 оптимальное время для каждой платформы и аудитории"),
        createBulletPoint("Лимиты безопасности \u2014 максимальное количество комментариев в день с учётом риска бана"),
        createBulletPoint("Ротация аккаунтов \u2014 распределение нагрузки между несколькими аккаунтами"),

        createHeading2("2.6 Управление аккаунтами"),
        createTextParagraph("Комплексная система управления множественными аккаунтами обеспечивает централизованный контроль над всеми аккаунтами на различных платформах. Модуль включает функции безопасности, разминки, мониторинга и интеграции с антидетект-браузерами."),

        createHeading3("2.6.1 Добавление и настройка аккаунтов"),
        createTextParagraph("Процесс добавления аккаунта включает несколько этапов для обеспечения безопасной работы. Каждый аккаунт проходит валидацию и получает уникальную конфигурацию."),
        createBulletPoint("Импорт credentials \u2014 добавление логина/пароля или сессии через файлы куки"),
        createBulletPoint("Привязка прокси \u2014 назначение статического прокси для консистентности отпечатка"),
        createBulletPoint("Настройка fingerprint \u2014 конфигурация User-Agent, языка, часового пояса, экрана"),
        createBulletPoint("Интеграция с антидетект \u2014 синхронизация с Dolphin{anty}, AdsPower, GoLogin"),
        createBulletPoint("Валидация \u2014 проверка работоспособности и статуса аккаунта"),

        createHeading3("2.6.2 Прокси-менеджмент"),
        createTextParagraph("Качественные прокси критически важны для безопасной работы. Система поддерживает различные типы прокси и обеспечивает их ротацию."),
        createBulletPoint("Типы прокси \u2014 HTTP, HTTPS, SOCKS5, мобильные прокси с вращением IP"),
        createBulletPoint("Гео-соответствие \u2014 автоматическое匹配 прокси с регионом аккаунта"),
        createBulletPoint("Мониторинг \u2014 проверка доступности, скорости и качества прокси в реальном времени"),
        createBulletPoint("Автозамена \u2014 автоматическая замена неработающих прокси из резерва"),
        createBulletPoint("Отчётность \u2014 логирование всех соединений для анализа и оптимизации"),

        createHeading2("2.7 Система разминки (Warming)"),
        createTextParagraph("Разминка \u2014 критически важный процесс подготовки новых аккаунтов к активной работе. Система имитирует естественное поведение пользователя, что снижает вероятность блокировки при начале активных действий. Правильная разминка может занимать от нескольких дней до нескольких недель в зависимости от интенсивности планируемой работы."),

        createHeading3("2.7.1 Фазы разминки"),
        createTextParagraph("Процесс разминки разделён на фазы с постепенно увеличивающейся активностью. Каждая фаза имеет свои цели и параметры."),
        createNumberedItem("Фаза 1: Базовая активация (1-3 дня) \u2014 вход в аккаунт, просмотр ленты, подписка на несколько каналов, базовые действия без активности.", "numbered-warming"),
        createNumberedItem("Фаза 2: Пассивная активность (3-7 дней) \u2014 регулярные заходы, просмотр контента, лайки, сохранение постов, изучение рекомендаций.", "numbered-warming"),
        createNumberedItem("Фаза 3: Ограниченная активность (7-14 дней) \u2014 единичные комментарии, ответы на сообщения, подписки на релевантные аккаунты.", "numbered-warming"),
        createNumberedItem("Фаза 4: Нормальная работа (14+ дней) \u2014 постепенное увеличение активности до целевого уровня с мониторингом реакции платформы.", "numbered-warming"),

        createHeading3("2.7.2 Симуляция поведения"),
        createTextParagraph("Система имитирует паттерны поведения реального пользователя для обхода алгоритмов детекции. Ключевые элементы симуляции:"),
        createBulletPoint("Случайные интервалы \u2014 вариативность времени между действиями"),
        createBulletPoint("Естественные паттерны \u2014 типичные последовательности действий реальных пользователей"),
        createBulletPoint("Временные зоны \u2014 активность в соответствии с часовым поясом \"проживания\""),
        createBulletPoint("Интересы \u2014 взаимодействие с контентом, релевантным \"интересам\" аккаунта"),
        createBulletPoint("Ошибки \u2014 имитация человеческих ошибок (опечатки, отмены действий)"),

        createHeading2("2.8 Контент-студия"),
        createTextParagraph("Единый центр генерации всех типов контента с использованием AI-технологий. Контент-студия объединяет инструменты для создания текстов, изображений, видео и аудио, обеспечивая полноценный производственный конвейер для социальных медиа."),

        createHeading3("2.8.1 Текстовая генерация"),
        createTextParagraph("AI-генерация текстов для различных целей с поддержкой множества языков и стилей. Ключевые возможности:"),
        createBulletPoint("Посты для соцсетей \u2014 генерация текстов с учётом оптимальной длины для каждой платформы"),
        createBulletPoint("Сценарии видео \u2014 полные сценарии для Reels, TikTok, YouTube с таймкодами"),
        createBulletPoint("Комментарии и ответы \u2014 контекстные ответы для взаимодействия с аудиторией"),
        createBulletPoint("Описания и подписи \u2014 SEO-оптимизированные описания с хештегами"),
        createBulletPoint("Рекламные тексты \u2014 продающие тексты для офферов с учётом ЦА"),

        createHeading3("2.8.2 Генерация изображений"),
        createTextParagraph("Интеграция с AI-сервисами генерации изображений (Hunyuan Studio, DALL-E, Midjourney через API) для создания уникального визуального контента."),
        createBulletPoint("Постеры и обложки \u2014 изображения для постов и Stories"),
        createBulletPoint("Инфографика \u2014 визуализация данных и статистики"),
        createBulletPoint("Мемы \u2014 генерация мемов на актуальные темы"),
        createBulletPoint("Баннеры \u2014 рекламные креативы для кампаний"),
        createBulletPoint("Аватары \u2014 портреты для AI-инфлюенсеров"),

        createHeading3("2.8.3 Text-to-Speech (TTS)"),
        createTextParagraph("Мультиязычная система синтеза речи для создания аудиоконтента. Поддерживает множество голосов и языков."),
        createBulletPoint("Голосовые сообщения \u2014 для Telegram и других мессенджеров"),
        createBulletPoint("Озвучка видео \u2014 закадровый голос для Reels и TikTok"),
        createBulletPoint("Подкасты \u2014 создание аудиоконтента из текстовых материалов"),
        createBulletPoint("Мультиязычность \u2014 поддержка 50+ языков с различными акцентами"),
        createBulletPoint("Клонирование голоса \u2014 создание уникального голоса для персоны"),

        createHeading2("2.9 OFM-менеджмент (OnlyFans)"),
        createTextParagraph("Специализированный модуль для управления моделями OnlyFans с AI-поддержкой автоматизации. OFM-менеджмент позволяет масштабировать работу с несколькими моделями одновременно, автоматизируя рутинные задачи взаимодействия с подписчиками."),

        createHeading3("2.9.1 Настройка профиля модели"),
        createTextParagraph("Создание профиля модели включает настройку всех аспектов присутствия на платформе."),
        createNumberedItem("Базовая информация \u2014 имя, описание, категория контента, геолокация.", "numbered-ofm"),
        createNumberedItem("Визуальный стиль \u2014 настройки генерации изображений, цветовая схема, эстетика.", "numbered-ofm"),
        createNumberedItem("Прайс-лист \u2014 стоимость подписки, PPV-контента, кастомных запросов.", "numbered-ofm"),
        createNumberedItem("Тональность \u2014 стиль общения с фанатами (игривый, доминирующий, дружелюбный).", "numbered-ofm"),
        createNumberedItem("Расписание \u2014 частота публикаций и livestreams.", "numbered-ofm"),

        createHeading3("2.9.2 Автоматизация общения"),
        createTextParagraph("AI-система автоматизирует значительную часть взаимодействия с подписчиками, освобождая время для создания премиум-контента."),
        createBulletPoint("Автоответы на сообщения \u2014 мгновенные ответы на типовые запросы"),
        createBulletPoint("Массовые рассылки \u2014 персонализированные PPV-предложения для всех подписчиков"),
        createBulletPoint("Удержание \u2014 автоматические сообщения для продления подписки"),
        createBulletPoint("Upselling \u2014 предложения премиум-контента на основе поведения"),
        createBulletPoint("Fan-взаимодействие \u2014 ответы на комментарии и лайки"),

        // ==================== SECTION 3: TOOLS ====================
        createHeading1("3. Инструменты и интеграции"),
        
        createHeading2("3.1 AI-провайдеры"),
        createTextParagraph("Платформа поддерживает множественные AI-провайдеры с автоматическим переключением при сбоях. Это обеспечивает бесперебойную работу даже при недоступности отдельных сервисов. Система автоматически выбирает оптимального провайдера на основе задачи, стоимости и доступности."),

        createHeading3("3.1.1 OpenRouter"),
        createTextParagraph("OpenRouter \u2014 агрегатор AI-моделей, предоставляющий доступ к множеству LLM через единый API. Основные доступные модели:"),
        createBulletPoint("DeepSeek V3 \u2014 мощная модель с отличным соотношением цена/качество"),
        createBulletPoint("Claude 3.5 Sonnet \u2014 высокое качество генерации, подходит для сложных задач"),
        createBulletPoint("GPT-4o \u2014 мультимодальная модель с поддержкой изображений"),
        createBulletPoint("Gemini Pro \u2014 модели Google с большим контекстным окном"),
        createBulletPoint("Llama 3.1 \u2014 open-source модели различного размера"),

        createHeading3("3.1.2 Прямые интеграции"),
        createTextParagraph("Помимо OpenRouter, платформа поддерживает прямые интеграции с провайдерами для оптимизации скорости и стоимости."),
        createBulletPoint("Google Gemini \u2014 прямая интеграция с доступом к моделям Gemini Pro и Ultra"),
        createBulletPoint("Groq \u2014 сверхбыстрый инференс на специализированных чипах LPU"),
        createBulletPoint("DeepSeek \u2014 собственный пул бесплатных аккаунтов с авто-регистрацией"),
        createBulletPoint("Cerebras \u2014 инференс на wafer-scale процессорах"),

        createHeading3("3.1.3 Управление AI-пулом"),
        createTextParagraph("Раздел AI Pool позволяет настраивать приоритеты провайдеров, управлять квотами и отслеживать расходы. Ключевые функции:"),
        createBulletPoint("Приоритизация \u2014 настройка порядка использования провайдеров"),
        createBulletPoint("Балансировка нагрузки \u2014 распределение запросов между провайдерами"),
        createBulletPoint("Квоты \u2014 ограничение суточных/месячных расходов"),
        createBulletPoint("Кэширование \u2014 семантический кэш для экономии на повторяющихся запросах"),
        createBulletPoint("Мониторинг \u2014 отслеживание качества ответов и времени отклика"),

        createHeading2("3.2 Расширенные модули (19+ модулей)"),
        createTextParagraph("Платформа включает 19+ специализированных модулей, каждый из которых решает конкретные задачи в рабочем процессе управления трафиком. Модули работают независимо и могут комбинироваться для создания сложных автоматизаций."),

        new Table({
          columnWidths: [2800, 3280, 3280],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Модуль", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Функция", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Применение", bold: true, size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Пошаговая генерация", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Контент в этапы", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Сложный контент", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Маскировка трафика", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Обход детекции", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Снижение банов", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Генератор сторис", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Авто-Stories", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Instagram, Telegram", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Генератор мемов", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Виральный контент", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "TikTok, Instagram", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Полный авто-режим", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "24/7 автономность", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Минимум вмешательства", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Адаптер трендов", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Отслеживание трендов", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Актуальный контент", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Предиктор времени", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Оптимальный постинг", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Максимум охвата", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Анализатор эмоций", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Реакции аудитории", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3280, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Оптимизация контента", size: 22 })] })] })
            ]})
          ]
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 300 }, children: [new TextRun({ text: "Таблица 4. Основные расширенные модули", size: 18, italics: true, color: colors.secondary })] }),

        createHeading2("3.3 Внешние интеграции"),
        createTextParagraph("Платформа интегрируется с множеством внешних сервисов для расширения функциональности и обеспечения бесшовного рабочего процесса."),
        
        createHeading3("3.3.1 Telegram Bot API"),
        createTextParagraph("Полная интеграция с Telegram Bot API для автоматизации каналов и ботов. Возможности:"),
        createBulletPoint("Управление каналами \u2014 создание, настройка, администрирование"),
        createBulletPoint("Автопостинг \u2014 публикация контента по расписанию"),
        createBulletPoint("Обработка команд \u2014 интерактивные боты для взаимодействия"),
        createBulletPoint("Webhook-интеграция \u2014 обработка событий в реальном времени"),

        createHeading3("3.3.2 Google Sheets"),
        createTextParagraph("Двусторонняя интеграция с Google Sheets для импорта/экспорта данных."),
        createBulletPoint("Импорт офферов \u2014 массовая загрузка офферов из таблиц"),
        createBulletPoint("Экспорт статистики \u2014 автоматическое обновление отчётов"),
        createBulletPoint("Синхронизация \u2014 real-time обновление данных"),

        createHeading3("3.3.3 Webhooks"),
        createTextParagraph("Гибкая система webhook-уведомлений для интеграции с внешними системами."),
        createBulletPoint("События \u2014 уведомления о ключевых событиях (конверсии, ошибки, достижения целей)"),
        createBulletPoint("Форматы \u2014 JSON, XML, форм-data"),
        createBulletPoint("Retry \u2014 автоматические повторные попытки при ошибках"),

        // ==================== SECTION 4: EARNING ====================
        createHeading1("4. Способы заработка"),
        createTextParagraph("Платформа МУКН предоставляет множество механизмов монетизации, позволяя пользователям диверсифицировать источники дохода и максимизировать прибыль. Каждый способ заработка интегрирован в общую экосистему и поддерживается соответствующими инструментами аналитики и автоматизации."),

        createHeading2("4.1 CPA и партнёрский маркетинг"),
        createTextParagraph("Основной источник дохода для большинства пользователей \u2014 работа с CPA-сетями и партнёрскими программами. Платформа оптимизирована для работы с высокодоходными вертикалями и предоставляет все необходимые инструменты для масштабирования."),
        
        createHeading3("4.1.1 Ключевые метрики"),
        createTextParagraph("Для эффективной работы с CPA важно отслеживать ключевые показатели эффективности. Платформа автоматически рассчитывает все метрики:"),
        createBulletPoint("EPC (Earnings Per Click) \u2014 доход на клик, ключевой показатель эффективности трафика"),
        createBulletPoint("CR (Conversion Rate) \u2014 процент конверсии из клика в лид"),
        createBulletPoint("ROI (Return on Investment) \u2014 возврат инвестиций с учётом всех затрат"),
        createBulletPoint("CPA (Cost Per Action) \u2014 стоимость целевого действия"),
        createBulletPoint("LTV (Lifetime Value) \u2014 пожизненная ценность привлечённого пользователя"),

        createHeading3("4.1.2 Рекомендации по оптимизации"),
        createTextParagraph("Для максимизации дохода от CPA-маркетинга следуйте рекомендациям:"),
        createBulletPoint("Тестирование офферов \u2014 A/B тестирование нескольких офферов в каждой нише"),
        createBulletPoint("Оптимизация времени \u2014 публикация в часы пиковой активности ЦА"),
        createBulletPoint("Креативы \u2014 регулярное обновление визуального контента"),
        createBulletPoint("Пренетинг \u2014 фильтрация нецелевой аудитории до клика"),

        createHeading2("4.2 OFM-менеджмент"),
        createTextParagraph("Управление моделями OnlyFans \u2014 высокодоходная ниша с возможностью значительной автоматизации. При правильной организации OFM может генерировать стабильный пассивный доход."),
        
        createHeading3("4.2.1 Модель дохода"),
        createTextParagraph("Доход от OFM формируется из нескольких источников:"),
        createBulletPoint("Подписки \u2014 регулярный доход от подписчиков"),
        createBulletPoint("PPV-контент \u2014 разовые продажи эксклюзивного контента"),
        createBulletPoint("Tips \u2014 чаевые от фанатов"),
        createBulletPoint("Кастом-контент \u2014 персонализированные запросы"),
        createBulletPoint("Referral \u2014 реферальная программа OnlyFans (5% от дохода реферала)"),

        createHeading2("4.3 Маркетплейс аккаунтов"),
        createTextParagraph("Продажа размеченных аккаунтов \u2014 востребованный сервис для арбитражников. Система разминки создаёт аккаунты с историей активности, которые ценятся на рынке."),
        createBulletPoint("Telegram-аккаунты \u2014 размеченные аккаунты с историей стоят $5-50 в зависимости от возраста и активности"),
        createBulletPoint("Instagram-аккаунты \u2014 размеченные аккаунты без теневого бана ценятся выше"),
        createBulletPoint("Тёплые каналы \u2014 каналы с аудиторией можно продавать через аукцион"),

        createHeading2("4.4 Дополнительные источники"),
        createTextParagraph("Платформа предоставляет несколько дополнительных возможностей для монетизации:"),
        createNumberedItem("White-Label решения \u2014 предоставление платформы как SaaS для других пользователей с настройкой под их бренд", "numbered-methods"),
        createNumberedItem("P2P-транзакции \u2014 одноранговые переводы и обмен внутри экосистемы", "numbered-methods"),
        createNumberedItem("Аукционы юзернеймов \u2014 торговля премиальными именами пользователей (@handles)", "numbered-methods"),
        createNumberedItem("Токен-система \u2014 внутренняя валюта для операций на платформе с возможностью конвертации", "numbered-methods"),
        createNumberedItem("Бандлы кампаний \u2014 продажа проверенных конфигураций кампаний с документацией", "numbered-methods"),

        // ==================== SECTION 5: SECURITY ====================
        createHeading1("5. Безопасность и инфраструктура"),
        createTextParagraph("МУКН построена с учётом корпоративных требований к безопасности и надёжности. Платформа спроектирована для работы в режиме 24/7 с минимальным вмешательством оператора."),

        createHeading2("5.1 Функции безопасности"),
        createBulletPoint("2FA аутентификация \u2014 двухфакторная защита с поддержкой TOTP-приложений"),
        createBulletPoint("Управление сессиями \u2014 контроль активных сессий с возможностью удалённого выхода"),
        createBulletPoint("RBAC (Role-Based Access Control) \u2014 ролевая модель доступа с гранулярными правами"),
        createBulletPoint("Rate limiting \u2014 защита от злоупотреблений API с настраиваемыми лимитами"),
        createBulletPoint("Аудит-логи \u2014 полная история действий пользователей с возможностью экспорта"),
        createBulletPoint("Health checks \u2014 мониторинг состояния всех компонентов системы"),
        createBulletPoint("Auto-backup \u2014 автоматическое резервное копирование данных"),

        createHeading2("5.2 Надёжность 24/7"),
        createTextParagraph("Платформа спроектирована для непрерывной работы с корпоративным уровнем надёжности. Ключевые механизмы обеспечения отказоустойчивости:"),
        createBulletPoint("Retry logic \u2014 автоматические повторные попытки при временных сбоях"),
        createBulletPoint("Circuit breakers \u2014 защита от каскадных сбоев при недоступности сервисов"),
        createBulletPoint("Graceful degradation \u2014 работа с ограниченной функциональностью при проблемах"),
        createBulletPoint("Комплексный мониторинг \u2014 отслеживание всех компонентов системы"),
        createBulletPoint("Docker-оркестрация \u2014 контейнеризация для простого масштабирования"),

        // ==================== SECTION 6: API ====================
        createHeading1("6. API и программные интерфейсы"),
        createTextParagraph("Платформа предоставляет более 200 API-эндпоинтов для программного доступа ко всем функциям. API следует REST-принципам и возвращает данные в формате JSON. Все запросы требуют аутентификации через API-ключ или Bearer token."),

        createHeading2("6.1 Аутентификация"),
        createTextParagraph("API поддерживает два метода аутентификации:"),
        createBulletPoint("API Key \u2014 ключ передаётся в заголовке X-API-Key"),
        createBulletPoint("Bearer Token \u2014 JWT-токен в заголовке Authorization: Bearer <token>"),

        createHeading2("6.2 Основные эндпоинты"),
        new Table({
          columnWidths: [3500, 5860],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Эндпоинт", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, shading: { fill: colors.headerBg, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Описание", bold: true, size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "GET /api/health", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Проверка состояния системы", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "GET /api/dashboard/kpi", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "KPI-метрики дашборда", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "GET/POST /api/campaigns", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Управление кампаниями", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "GET/POST /api/accounts", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Управление аккаунтами", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "POST /api/ai/generate", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "AI-генерация контента", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "POST /api/ai/tts", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Text-to-Speech синтез", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "GET /api/traffic/methods", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Библиотека методов трафика", size: 22 })] })] })
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3500, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "POST /api/telegram/webhook", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5860, type: WidthType.DXA }, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Telegram Bot webhook", size: 22 })] })] })
            ]})
          ]
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 300 }, children: [new TextRun({ text: "Таблица 5. Основные API-эндпоинты", size: 18, italics: true, color: colors.secondary })] }),

        createHeading2("6.3 Примеры запросов"),
        createTextParagraph("Пример запроса на генерацию контента через API:"),
        new Paragraph({
          spacing: { after: 200 },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "POST /api/ai/generate\nContent-Type: application/json\nAuthorization: Bearer <token>\n\n{\n  \"prompt\": \"Создай пост для Instagram о криптовалюте\",\n  \"model\": \"deepseek-v3\",\n  \"maxTokens\": 500,\n  \"tone\": \"professional\"\n}", size: 20, font: "Courier New" })]
        }),

        // ==================== SECTION 7: CASES ====================
        createHeading1("7. Практические кейсы использования"),
        createTextParagraph("В данном разделе рассмотрены практические сценарии использования платформы МУКН для различных бизнес-задач. Каждый кейс включает пошаговую инструкцию и ожидаемые результаты."),

        createHeading2("7.1 Кейс: Арбитраж трафика на казино"),
        createTextParagraph("Рассмотрим типичный сценарий работы с гемблинг-офферами через Telegram. Данный кейс демонстрирует полный цикл от настройки до получения прибыли."),
        createNumberedItem("Подготовка аккаунтов: импорт 20 Telegram-аккаунтов, назначение уникальных прокси для каждого, запуск 7-дневной разминки.", "numbered-case1"),
        createNumberedItem("Создание персоны: разработка AI-инфлюенсера \"успешный игрок\" с соответствующим стилем коммуникации.", "numbered-case1"),
        createNumberedItem("Настройка кампании: выбор оффера казино, установка бюджета $500, целевой CPA $15.", "numbered-case1"),
        createNumberedItem("Конфигурация трафика: выбор методов \"комментинг в каналах\" и \"репосты\", настройка таргетинга по гео.", "numbered-case1"),
        createNumberedItem("Запуск AI-генерации: настройка автоматической генерации комментариев с rotating CTAs.", "numbered-case1"),
        createNumberedItem("Мониторинг и оптимизация: отслеживание конверсий, A/B тестирование креативов.", "numbered-case1"),
        createTextParagraph("Ожидаемые результаты: при качественной настройке и достаточном бюджете можно достичь ROI 150-300% в течение первого месяца работы."),

        createHeading2("7.2 Кейс: OFM-менеджмент"),
        createTextParagraph("Автоматизация работы с моделями OnlyFans для создания пассивного дохода."),
        createNumberedItem("Создание профиля: настройка персоны модели, визуальный стиль, прайс-лист.", "numbered-case2"),
        createNumberedItem("Контент-план: генерация контента на 30 дней вперёд с учётом трендов.", "numbered-case2"),
        createNumberedItem("Автоматизация общения: настройка AI-ответов на типовые запросы фанатов.", "numbered-case2"),
        createNumberedItem("Продвижение: интеграция с Instagram и TikTok для привлечения аудитории.", "numbered-case2"),
        createNumberedItem("Аналитика: отслеживание удержания, LTV, эффективности контента.", "numbered-case2"),
        createTextParagraph("Ожидаемые результаты: при правильной настройке одна модель может генерировать $2000-10000 в месяц с минимальным участием оператора."),

        createHeading2("7.3 Кейс: Создание AI-инфлюенсера"),
        createTextParagraph("Построение долгосрочного присутствия через AI-инфлюенсера на нескольких платформах."),
        createNumberedItem("Разработка персоны: детальная проработка характера, стиля, тематики контента.", "numbered-case3"),
        createNumberedItem("Мультиплатформенный запуск: создание аккаунтов на Instagram, TikTok, YouTube с единой персоной.", "numbered-case3"),
        createNumberedItem("Контент-стратегия: смешивание органического контента с интеграцией офферов.", "numbered-case3"),
        createNumberedItem("Монетизация: по достижении 10K+ подписчиков \u2014 подключение партнёрских офферов.", "numbered-case3"),
        createNumberedItem("Масштабирование: создание \"сетей\" связанных инфлюенсеров для кросс-промоушна.", "numbered-case3"),
        createTextParagraph("Ожидаемые результаты: органический рост аудитории 5-15% в месяц, возможность монетизации через несколько каналов одновременно."),

        // ==================== SECTION 8: FAQ ====================
        createHeading1("8. FAQ и устранение неполадок"),
        createTextParagraph("В данном разделе собраны ответы на часто задаваемые вопросы и решения типичных проблем при работе с платформой."),

        createHeading2("8.1 Часто задаваемые вопросы"),
        
        createHeading3("Вопрос: Как быстро окупается платформа?"),
        createTextParagraph("Ответ: При правильной настройке и наличии стартового бюджета окупаемость достигается за 2-4 недели. Ключевые факторы: выбор ниши, качество аккаунтов, выбранные методы трафика. Рекомендуется начинать с тестового бюджета $200-500 для отладки стратегий."),

        createHeading3("Вопрос: Какое минимальное количество аккаунтов нужно?"),
        createTextParagraph("Ответ: Минимум для старта \u2014 5-10 аккаунтов на платформу. Оптимально для масштабирования \u2014 50+ аккаунтов. Количество зависит от интенсивности работы: для агрессивных методов требуется больше аккаунтов из-за риска банов."),

        createHeading3("Вопрос: Можно ли использовать платформу без AI-функций?"),
        createTextParagraph("Ответ: Да, все функции платформы доступны для ручного использования. AI-функции предназначены для автоматизации и масштабирования, но не являются обязательными. Можно использовать платформу исключительно для управления аккаунтами и аналитики."),

        createHeading3("Вопрос: Как обеспечить безопасность аккаунтов?"),
        createTextParagraph("Ответ: Ключевые меры безопасности: качественные мобильные прокси, правильная разминка, соблюдение лимитов платформ, использование антидетект-браузеров, регулярный мониторинг статуса аккаунтов. Платформа предоставляет все инструменты для безопасной работы."),

        createHeading2("8.2 Устранение неполадок"),
        createTextParagraph("Типичные проблемы и их решения:"),

        createHeading3("Проблема: Аккаунты попадают в теневой бан"),
        createTextParagraph("Решение: Проверьте качество прокси (должны быть мобильными и соответствовать гео), увеличьте период разминки, снизьте интенсивность действий, проверьте fingerprint на консистентность."),

        createHeading3("Проблема: Низкая конверсия кампаний"),
        createTextParagraph("Решение: Проанализируйте целевую аудиторию, протестируйте разные креативы, оптимизируйте время постинга, проверьте релевантность оффера выбранной нише. Используйте A/B тестирование для оптимизации."),

        createHeading3("Проблема: AI-генерация даёт некачественный контент"),
        createTextParagraph("Решение: Улучшите промпты с учётом контекста, настройте тональность персоны, попробуйте разные модели, увеличьте контекст для генерации. Используйте систему рейтинга для улучшения качества."),

        createHeading3("Проблема: Высокий расход AI-квот"),
        createTextParagraph("Решение: Включите семантическое кэширование, оптимизируйте промпты, настройте приоритеты провайдеров с учётом стоимости, используйте более дешёвые модели для простых задач."),

        // ==================== SECTION 9: BEST PRACTICES ====================
        createHeading1("9. Лучшие практики и рекомендации"),
        createTextParagraph("Данный раздел содержит обобщённые рекомендации по эффективному использованию платформы, основанные на опыте успешных пользователей."),

        createHeading2("9.1 Рекомендации по безопасности"),
        createNumberedItem("Всегда используйте качественные мобильные прокси \u2014 экономия на прокси приводит к блокировкам аккаунтов и потере инвестиций.", "numbered-best"),
        createNumberedItem("Соблюдайте период разминки \u2014 rushing приводит к банам. Лучше потратить 2 недели на разминку, чем потерять аккаунт.", "numbered-best"),
        createNumberedItem("Диверсифицируйте аккаунты \u2014 не храните все аккаунты на одном прокси-провайдере.", "numbered-best"),
        createNumberedItem("Регулярно проверяйте статус \u2014 мониторинг shadow ban и ограничений позволяет реагировать оперативно.", "numbered-best"),
        createNumberedItem("Резервируйте аккаунты \u2014 всегда имейте резерв тёплых аккаунтов на случай блокировок.", "numbered-best"),

        createHeading2("9.2 Рекомендации по эффективности"),
        createNumberedItem("Начинайте с тестов \u2014 тестируйте гипотезы с минимальным бюджетом перед масштабированием.", "numbered-best"),
        createNumberedItem("Автоматизируйте постепенно \u2014 внедряйте AI-функции по мере освоения платформы.", "numbered-best"),
        createNumberedItem("Анализируйте данные \u2014 регулярно изучайте аналитику для оптимизации стратегий.", "numbered-best"),
        createNumberedItem("Следите за трендами \u2014 используйте модуль адаптера трендов для актуального контента.", "numbered-best"),
        createNumberedItem("Документируйте результаты \u20104 ведите записи успешных и неудачных стратегий для обучения.", "numbered-best"),

        createHeading2("9.3 Рекомендации по масштабированию"),
        createNumberedItem("Горизонтальное масштабирование \u2014 увеличивайте количество аккаунтов и кампаний.", "numbered-best"),
        createNumberedItem("Вертикальное масштабирование \u20104 углубляйте автоматизацию существующих процессов.", "numbered-best"),
        createNumberedItem("Диверсификация ниш \u2014 работайте с несколькими вертикалями для снижения рисков.", "numbered-best"),
        createNumberedItem("Реинвестирование \u2014 направляйте часть прибыли на расширение инфраструктуры.", "numbered-best"),
        createNumberedItem("Командная работа \u20104 при масштабировании рассмотрите привлечение операторов.", "numbered-best"),

        // ==================== SECTION 10: CONCLUSION ====================
        createHeading1("10. Заключение"),
        createTextParagraph("МУКН | Трафик представляет собой комплексную корпоративную платформу для управления AI-приводимым трафиком на множестве социальных медиа-платформ. Сочетание передовых технологий искусственного интеллекта с мощными инструментами автоматизации позволяет пользователям эффективно масштабировать операции и диверсифицировать источники дохода."),
        createTextParagraph("Платформа постоянно развивается, добавляются новые функции и интеграции. Для получения актуальной информации о обновлениях следите за разделом Settings и проверяйте наличие новых версий системы. Техническая поддержка доступна через встроенную систему тикетов и документацию API."),
        createTextParagraph("Данное руководство охватывает все основные аспекты работы с платформой. Для углублённого изучения отдельных модулей рекомендуется практическая работа с системой и эксперименты с различными настройками. Успешная работа с МУКН требует комбинации технических навыков, понимания маркетинга и дисциплинированного подхода к управлению рисками.")
      ]
    }
  ]
});

// Generate document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/MUKN_Polnoe_Rukovodstvo_v2.docx", buffer);
  console.log("Document created: /home/z/my-project/download/MUKN_Polnoe_Rukovodstvo_v2.docx");
});
