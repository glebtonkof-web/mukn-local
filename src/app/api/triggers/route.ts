import { NextRequest, NextResponse } from 'next/server'
import keywordTriggersService from '@/lib/keyword-triggers-service'

// GET /api/triggers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const triggerId = searchParams.get('triggerId')
    const action = searchParams.get('action')

    if (triggerId) {
      if (action === 'stats') {
        const stats = keywordTriggersService.getTriggerStats(triggerId)
        return NextResponse.json({ stats })
      }
      const trigger = keywordTriggersService.getTrigger(triggerId)
      if (!trigger) {
        return NextResponse.json({ error: 'Trigger not found' }, { status: 404 })
      }
      return NextResponse.json({ trigger })
    }

    if (action === 'events') {
      const limit = parseInt(searchParams.get('limit') || '100')
      const events = keywordTriggersService.getEvents(limit)
      return NextResponse.json({ events })
    }

    const triggers = keywordTriggersService.getAllTriggers()
    return NextResponse.json({ triggers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/triggers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'process') {
      const result = keywordTriggersService.processMessage(body.message)
      return NextResponse.json(result)
    }

    if (body.action === 'import') {
      const count = keywordTriggersService.importTriggers(body.data)
      return NextResponse.json({ imported: count })
    }

    const trigger = keywordTriggersService.createTrigger(body)
    return NextResponse.json({ trigger })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/triggers
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const trigger = keywordTriggersService.updateTrigger(body.triggerId, body.data)
    
    if (!trigger) {
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404 })
    }
    
    return NextResponse.json({ trigger })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/triggers
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const triggerId = searchParams.get('triggerId')

    if (!triggerId) {
      return NextResponse.json({ error: 'triggerId required' }, { status: 400 })
    }

    const deleted = keywordTriggersService.deleteTrigger(triggerId)
    return NextResponse.json({ deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
