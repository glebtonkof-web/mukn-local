import { NextRequest, NextResponse } from 'next/server'
import aiCharactersService from '@/lib/ai-characters-service'

// GET /api/ai-characters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')
    const category = searchParams.get('category')
    const action = searchParams.get('action')

    if (characterId) {
      if (action === 'prompt') {
        const prompt = aiCharactersService.generateSystemPrompt(characterId)
        return NextResponse.json({ prompt })
      }
      if (action === 'memory') {
        const query = searchParams.get('query') || ''
        const context = aiCharactersService.getMemoryContext(characterId, query)
        return NextResponse.json({ context })
      }
      const character = aiCharactersService.getCharacter(characterId)
      if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      return NextResponse.json({ character })
    }

    if (category) {
      const characters = aiCharactersService.getCharactersByCategory(category)
      return NextResponse.json({ characters })
    }

    if (action === 'templates') {
      const templates = aiCharactersService.getTemplates()
      return NextResponse.json({ templates })
    }

    if (action === 'popular') {
      const limit = parseInt(searchParams.get('limit') || '10')
      const characters = aiCharactersService.getPopularCharacters(limit)
      return NextResponse.json({ characters })
    }

    if (action === 'public') {
      const characters = aiCharactersService.getPublicCharacters()
      return NextResponse.json({ characters })
    }

    if (action === 'search') {
      const query = searchParams.get('query') || ''
      const characters = aiCharactersService.searchCharacters(query)
      return NextResponse.json({ characters })
    }

    const characters = aiCharactersService.getAllCharacters()
    return NextResponse.json({ characters })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/ai-characters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'from_template') {
      const character = aiCharactersService.createFromTemplate(body.templateId, body.customizations)
      if (!character) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      return NextResponse.json({ character })
    }

    if (body.action === 'clone') {
      const character = aiCharactersService.cloneCharacter(body.characterId, body.newName)
      if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      return NextResponse.json({ character })
    }

    if (body.action === 'add_memory') {
      const memory = aiCharactersService.addMemory(body.characterId, body.content, body.importance)
      return NextResponse.json({ memory })
    }

    if (body.action === 'import') {
      const character = aiCharactersService.importCharacter(body.data)
      if (!character) {
        return NextResponse.json({ error: 'Invalid character data' }, { status: 400 })
      }
      return NextResponse.json({ character })
    }

    if (body.action === 'export') {
      const data = aiCharactersService.exportCharacter(body.characterId)
      if (!data) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      return NextResponse.json({ data })
    }

    if (body.action === 'increment_usage') {
      aiCharactersService.incrementUsage(body.characterId)
      return NextResponse.json({ success: true })
    }

    if (body.action === 'rate') {
      aiCharactersService.updateRating(body.characterId, body.rating)
      return NextResponse.json({ success: true })
    }

    const character = aiCharactersService.createCharacter(body)
    return NextResponse.json({ character })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/ai-characters
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const character = aiCharactersService.updateCharacter(body.characterId, body.data)
    
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }
    
    return NextResponse.json({ character })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/ai-characters
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')

    if (!characterId) {
      return NextResponse.json({ error: 'characterId required' }, { status: 400 })
    }

    const deleted = aiCharactersService.deleteCharacter(characterId)
    return NextResponse.json({ deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
