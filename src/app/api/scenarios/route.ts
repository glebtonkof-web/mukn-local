import { NextRequest, NextResponse } from 'next/server'
import scenarioBuilderService from '@/lib/scenario-builder-service'

// GET /api/scenarios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('scenarioId')
    const action = searchParams.get('action')

    if (scenarioId) {
      if (action === 'export') {
        const data = scenarioBuilderService.exportScenario(scenarioId)
        if (!data) {
          return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
        }
        return NextResponse.json({ data })
      }
      
      if (action === 'executions') {
        const executions = scenarioBuilderService.getScenarioExecutions(scenarioId)
        return NextResponse.json({ executions })
      }
      
      const scenario = scenarioBuilderService.getScenario(scenarioId)
      if (!scenario) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
      }
      return NextResponse.json({ scenario })
    }

    if (action === 'templates') {
      const templates = scenarioBuilderService.getNodeTemplates()
      return NextResponse.json({ templates })
    }

    if (action === 'execution') {
      const executionId = searchParams.get('executionId')
      if (!executionId) {
        return NextResponse.json({ error: 'executionId required' }, { status: 400 })
      }
      const execution = scenarioBuilderService.getExecution(executionId)
      return NextResponse.json({ execution })
    }

    const scenarios = scenarioBuilderService.getAllScenarios()
    return NextResponse.json({ scenarios })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/scenarios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'execute') {
      const execution = await scenarioBuilderService.executeScenario(body.scenarioId, body.context)
      return NextResponse.json({ execution })
    }

    if (body.action === 'import') {
      const scenario = scenarioBuilderService.importScenario(body.data)
      if (!scenario) {
        return NextResponse.json({ error: 'Invalid scenario data' }, { status: 400 })
      }
      return NextResponse.json({ scenario })
    }

    if (body.action === 'add_node') {
      const node = scenarioBuilderService.addNode(body.scenarioId, body.node)
      return NextResponse.json({ node })
    }

    if (body.action === 'update_node') {
      const node = scenarioBuilderService.updateNode(body.scenarioId, body.nodeId, body.data)
      return NextResponse.json({ node })
    }

    if (body.action === 'delete_node') {
      const result = scenarioBuilderService.deleteNode(body.scenarioId, body.nodeId)
      return NextResponse.json({ success: result })
    }

    if (body.action === 'add_edge') {
      const edge = scenarioBuilderService.addEdge(body.scenarioId, body.edge)
      return NextResponse.json({ edge })
    }

    if (body.action === 'delete_edge') {
      const result = scenarioBuilderService.deleteEdge(body.scenarioId, body.edgeId)
      return NextResponse.json({ success: result })
    }

    const scenario = scenarioBuilderService.createScenario(body)
    return NextResponse.json({ scenario })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/scenarios
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === 'activate') {
      const result = scenarioBuilderService.activateScenario(body.scenarioId)
      return NextResponse.json({ success: result })
    }

    if (body.action === 'pause') {
      const result = scenarioBuilderService.pauseScenario(body.scenarioId)
      return NextResponse.json({ success: result })
    }

    const scenario = scenarioBuilderService.updateScenario(body.scenarioId, body.data)
    
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }
    
    return NextResponse.json({ scenario })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/scenarios
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('scenarioId')

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId required' }, { status: 400 })
    }

    // В реальной реализации - удаление из базы
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
