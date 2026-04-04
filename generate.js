#!/usr/bin/env node
/**
 * МУКН | Трафик - CLI для генерации креативов
 * 
 * Использование:
 *   node generate.js --casino catcasino --geo RU --count 10
 *   node generate.js --casino frank --geo PL --game gates-of-olympus-1000
 *   node generate.js --list-casinos
 *   node generate.js --list-games --casino catcasino
 */

const fs = require('fs')
const path = require('path')

// Загрузка конфигурации казино
const casinosPath = path.join(__dirname, 'data', 'casinos.json')
let casinos = {}

try {
  casinos = JSON.parse(fs.readFileSync(casinosPath, 'utf-8'))
} catch (e) {
  console.error('Error loading casinos.json:', e.message)
  process.exit(1)
}

// Парсинг аргументов
const args = process.argv.slice(2)
const params = {}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg.startsWith('--')) {
    const key = arg.slice(2)
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true
    params[key] = value
    if (value !== true) i++
  }
}

// Функции CLI

function listCasinos() {
  console.log('\n📋 Доступные казино:\n')
  console.log('ID\t\t\tНазвание\t\tГео')
  console.log('─'.repeat(60))
  
  for (const [id, config] of Object.entries(casinos)) {
    const casino = config
    console.log(`${id.padEnd(16)}\t${casino.name.padEnd(16)}\t${casino.allowed_geo.join(', ')}`)
  }
  
  console.log('')
}

function listGames(casinoId) {
  const casino = casinos[casinoId]
  
  if (!casino) {
    console.error(`❌ Казино "${casinoId}" не найдено`)
    return
  }
  
  console.log(`\n🎮 Игры для ${casino.name}:\n`)
  
  if (casino.allowed_games && casino.allowed_games.length > 0) {
    casino.allowed_games.forEach((game, i) => {
      console.log(`  ${i + 1}. ${game}`)
    })
  } else {
    console.log('  Все игры stream.win разрешены')
  }
  
  console.log('')
}

function showCasinoInfo(casinoId) {
  const casino = casinos[casinoId]
  
  if (!casino) {
    console.error(`❌ Казино "${casinoId}" не найдено`)
    return
  }
  
  console.log(`\n🎰 ${casino.name}\n`)
  console.log(`Основной цвет: ${casino.primary_color}`)
  console.log(`Разрешённые гео: ${casino.allowed_geo.join(', ')}`)
  console.log(`Бонус текст (RU): ${casino.bonus_text?.RU || 'не указан'}`)
  console.log(`CTA по умолчанию: ${casino.cta_text_default}`)
  console.log(`Эмодзи: ${casino.style?.emoji || 'нет'}`)
  console.log(`Тема: ${casino.style?.theme || 'стандартная'}`)
  console.log(`Запрещённые элементы: ${casino.prohibited_elements?.join(', ') || 'нет'}`)
  console.log('')
}

async function generateCreative(params) {
  const { casino: casinoId, geo, game, count = 1, duration = 15, format = 'mp4' } = params
  
  const casino = casinos[casinoId]
  
  if (!casino) {
    console.error(`❌ Казино "${casinoId}" не найдено`)
    console.log('Используйте --list-casinos для просмотра списка')
    return
  }
  
  // Проверка гео
  let selectedGeo = geo
  if (!selectedGeo) {
    selectedGeo = casino.allowed_geo[Math.floor(Math.random() * casino.allowed_geo.length)]
    console.log(`📍 Гео не указано, выбрано случайно: ${selectedGeo}`)
  }
  
  if (!casino.allowed_geo.includes(selectedGeo)) {
    console.error(`❌ Гео "${selectedGeo}" не разрешено для ${casino.name}`)
    console.log(`Разрешённые: ${casino.allowed_geo.join(', ')}`)
    return
  }
  
  // Выбор игры
  let selectedGame = game
  if (!selectedGame && casino.allowed_games?.length > 0) {
    selectedGame = casino.allowed_games[Math.floor(Math.random() * casino.allowed_games.length)]
    console.log(`🎮 Игра не указана, выбрана случайно: ${selectedGame}`)
  }
  
  console.log(`\n🎬 Генерация креатива...\n`)
  console.log(`Казино: ${casino.name}`)
  console.log(`Гео: ${selectedGeo}`)
  console.log(`Игра: ${selectedGame || 'любая'}`)
  console.log(`Длительность: ${duration} сек`)
  console.log(`Формат: ${format}`)
  console.log(`Количество: ${count}`)
  
  // Получаем тексты
  const ctaText = casino.cta_by_geo?.[selectedGeo] || casino.cta_text_default
  const bonusText = casino.bonus_text?.[selectedGeo] || casino.bonus_text?.RU || ''
  
  console.log(`\nCTA: "${ctaText}"`)
  console.log(`Бонус: "${bonusText}"`)
  
  // Симуляция генерации
  for (let i = 0; i < count; i++) {
    console.log(`\n📦 Креатив ${i + 1}/${count}:`)
    
    const steps = [
      { name: 'Проверка параметров', duration: 500 },
      { name: 'Загрузка демо игры', duration: 1500 },
      { name: 'Запись геймплея', duration: 2000 },
      { name: 'Поиск выигрышного момента', duration: 1000 },
      { name: 'Наложение логотипа', duration: 800 },
      { name: 'Добавление CTA кнопки', duration: 600 },
      { name: 'Применение цветовой схемы', duration: 500 },
      { name: 'Экспорт видео', duration: 1000 }
    ]
    
    for (const step of steps) {
      await sleep(step.duration)
      console.log(`  ✓ ${step.name}`)
    }
    
    const filename = `${casinoId}_${selectedGame || 'random'}_${selectedGeo}_${Date.now()}.${format}`
    console.log(`  ✅ Готово: /output/${filename}`)
  }
  
  console.log(`\n🎉 Генерация завершена! Создано ${count} креативов.\n`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Основной обработчик
async function main() {
  if (params['list-casinos']) {
    listCasinos()
  } else if (params['list-games']) {
    listGames(params['list-games'] === true ? params.casino : params['list-games'])
  } else if (params.info) {
    showCasinoInfo(params.info === true ? params.casino : params.info)
  } else if (params.casino) {
    await generateCreative(params)
  } else if (params.help || Object.keys(params).length === 0) {
    console.log(`
🎮 МУКН | Трафик - Генератор гемблинг-креативов

Использование:
  node generate.js [опции]

Опции:
  --casino <id>      ID казино (обязательно для генерации)
  --geo <code>       Код гео (RU, KZ, BR и т.д.)
  --game <slug>      Slug игры (опционально)
  --count <n>        Количество креативов (по умолчанию 1)
  --duration <sec>   Длительность видео (по умолчанию 15)
  --format <fmt>     Формат вывода: mp4, gif, both (по умолчанию mp4)

Команды:
  --list-casinos     Показать список казино
  --list-games <id>  Показать игры для казино
  --info <id>        Показать информацию о казино
  --help             Показать эту справку

Примеры:
  node generate.js --casino catcasino --geo RU --count 5
  node generate.js --casino frank --geo PL --game gates-of-olympus-1000
  node generate.js --list-casinos
  node generate.js --list-games catcasino
`)
  } else {
    console.log('Используйте --help для просмотра справки')
  }
}

main().catch(console.error)
