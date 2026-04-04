import { NextRequest, NextResponse } from 'next/server'
import creativeGeneratorService, { CreativeResult } from '@/lib/creative-generator'

// GET /api/creatives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const creativeId = searchParams.get('creativeId')
    const casinoId = searchParams.get('casinoId')

    // Получение конкретного креатива
    if (creativeId) {
      const creative = creativeGeneratorService.getCreative(creativeId)
      if (!creative) {
        return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
      }
      return NextResponse.json({ creative })
    }

    // Получение списка казино
    if (action === 'casinos') {
      const casinos = creativeGeneratorService.getCasinos()
      return NextResponse.json({ casinos })
    }

    // Получение игр для казино
    if (action === 'games' && casinoId) {
      const games = creativeGeneratorService.getGamesForCasino(casinoId)
      return NextResponse.json({ games, total: games.length })
    }

    // Получение всех игр
    if (action === 'all_games') {
      const games = creativeGeneratorService.getAllGames()
      return NextResponse.json({ games, total: games.length })
    }

    // Получение конфигурации казино
    if (action === 'config' && casinoId) {
      const casino = creativeGeneratorService.getCasino(casinoId)
      if (!casino) {
        return NextResponse.json({ error: 'Casino not found' }, { status: 404 })
      }
      return NextResponse.json({ casino })
    }

    // Получение статистики
    if (action === 'stats') {
      const stats = creativeGeneratorService.getStats()
      return NextResponse.json({ stats })
    }

    // Получение всех креативов
    const creatives = creativeGeneratorService.getAllCreatives()
    return NextResponse.json({ creatives, total: creatives.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/creatives
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Генерация одного креатива
    if (body.action === 'generate' || !body.action) {
      const result = await creativeGeneratorService.generateCreative({
        casino_id: body.casino_id,
        geo: body.geo,
        game_slug: body.game_slug,
        duration: body.duration || 15,
        output_format: body.output_format || 'mp4'
      })

      return NextResponse.json({ 
        success: result.status === 'completed',
        creative: result
      })
    }

    // Генерация пачки креативов
    if (body.action === 'generate_batch') {
      const results = await creativeGeneratorService.generateBatch({
        casino_id: body.casino_id,
        geo: body.geo,
        game_slug: body.game_slug,
        duration: body.duration || 15,
        output_format: body.output_format || 'mp4',
        count: body.count || 5
      })

      const completed = results.filter(r => r.status === 'completed').length

      return NextResponse.json({
        success: true,
        total: results.length,
        completed,
        creatives: results
      })
    }

    // Массовая генерация для всех казино
    if (body.action === 'generate_all') {
      const casinos = creativeGeneratorService.getCasinos()
      const allResults: CreativeResult[] = []

      for (const casino of casinos) {
        const results = await creativeGeneratorService.generateBatch({
          casino_id: casino.id,
          count: body.count_per_casino || 3
        })
        allResults.push(...results)
      }

      return NextResponse.json({
        success: true,
        total: allResults.length,
        creatives: allResults
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/creatives
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creativeId = searchParams.get('creativeId')

    if (!creativeId) {
      return NextResponse.json({ error: 'creativeId required' }, { status: 400 })
    }

    const deleted = creativeGeneratorService.deleteCreative(creativeId)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
