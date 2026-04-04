import { NextRequest, NextResponse } from 'next/server'
import telegramAIAgentsService from '@/lib/telegram-ai-agents-service'

// GET /api/telegram-agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const action = searchParams.get('action')

    if (agentId) {
      if (action === 'stats') {
        const stats = telegramAIAgentsService.getAgentStats(agentId)
        return NextResponse.json({ stats })
      }
      if (action === 'messages') {
        const chatId = searchParams.get('chatId') || undefined
        const limit = parseInt(searchParams.get('limit') || '50')
        const messages = telegramAIAgentsService.getMessageHistory(agentId, chatId, limit)
        return NextResponse.json({ messages })
      }
      const agent = telegramAIAgentsService.getAgent(agentId)
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      return NextResponse.json({ agent })
    }

    if (action === 'switches') {
      const switches = telegramAIAgentsService.getModelSwitchHistory(agentId || undefined)
      return NextResponse.json({ switches })
    }

    const agents = telegramAIAgentsService.getAllAgents()
    return NextResponse.json({ agents })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/telegram-agents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'assign_chat') {
      const chat = telegramAIAgentsService.assignChatToAgent(
        body.agentId,
        body.chatId,
        body.chatType,
        body.settings
      )
      return NextResponse.json({ chat })
    }

    if (body.action === 'remove_chat') {
      const result = telegramAIAgentsService.removeChatFromAgent(body.agentId, body.chatId)
      return NextResponse.json({ success: result })
    }

    if (body.action === 'switch_model') {
      const event = telegramAIAgentsService.switchModel(
        body.agentId,
        body.newModel,
        body.reason
      )
      return NextResponse.json({ event })
    }

    if (body.action === 'auto_switch') {
      const newModel = telegramAIAgentsService.autoSwitchIfNeeded(body.agentId)
      return NextResponse.json({ switched: !!newModel, newModel })
    }

    if (body.action === 'process_message') {
      const result = await telegramAIAgentsService.processMessage(body.agentId, body.message)
      return NextResponse.json(result)
    }

    const agent = telegramAIAgentsService.createAgent(body)
    return NextResponse.json({ agent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/telegram-agents
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === 'pause') {
      const result = telegramAIAgentsService.pauseAgent(body.agentId)
      return NextResponse.json({ success: result })
    }

    if (body.action === 'resume') {
      const result = telegramAIAgentsService.resumeAgent(body.agentId)
      return NextResponse.json({ success: result })
    }

    const agent = telegramAIAgentsService.updateAgent(body.agentId, body.data)
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    return NextResponse.json({ agent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/telegram-agents
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }

    const deleted = telegramAIAgentsService.deleteAgent(agentId)
    return NextResponse.json({ deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
