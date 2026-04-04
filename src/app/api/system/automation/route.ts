import { NextRequest, NextResponse } from 'next/server';
import { scenariosService } from '@/lib/scenarios-service';
import { dragDropService } from '@/lib/drag-drop-service';
import { asyncTemplateCompiler } from '@/lib/async-template-compiler';

// GET /api/system/automation - Получение статуса автоматизации
export async function GET(request: NextRequest) {
  try {
    const scenarios = scenariosService.getAllScenarios();
    const templates = asyncTemplateCompiler.getAllTemplates();
    const compilerStats = asyncTemplateCompiler.getStats();
    const dragDropStats = dragDropService.getStats();

    return NextResponse.json({
      success: true,
      data: {
        scenarios: {
          total: scenarios.length,
          running: scenarios.filter(s => s.status === 'running').length,
          scheduled: scenarios.filter(s => s.schedule?.enabled).length,
          list: scenarios.map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            status: s.status,
            runCount: s.runCount,
            lastRunAt: s.lastRunAt,
          })),
          templates: scenariosService.getScenarioTemplates(),
        },
        templates: {
          total: templates.length,
          list: templates.map(t => ({
            id: t.id,
            name: t.name,
            status: t.status,
            variables: t.variables,
          })),
          stats: compilerStats,
        },
        dragDrop: dragDropStats,
      },
    });
  } catch (error) {
    console.error('Error getting automation status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get automation status' },
      { status: 500 }
    );
  }
}

// POST /api/system/automation - Операции автоматизации
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      // Scenarios
      case 'create_scenario':
        const newScenario = scenariosService.createScenario(
          params.name,
          params.description,
          params.category
        );
        return NextResponse.json({ success: true, data: newScenario });

      case 'start_recording':
        const recordingScenario = scenariosService.startRecording(
          params.name,
          params.category
        );
        return NextResponse.json({ success: true, data: recordingScenario });

      case 'record_action':
        const recordedAction = scenariosService.recordAction(
          params.type,
          params.params
        );
        return NextResponse.json({ success: true, data: recordedAction });

      case 'stop_recording':
        const completedScenario = scenariosService.stopRecording();
        return NextResponse.json({ success: true, data: completedScenario });

      case 'run_scenario':
        const runResult = await scenariosService.runScenario(
          params.scenarioId,
          params.variables
        );
        return NextResponse.json({ success: true, data: runResult });

      case 'pause_scenario':
        scenariosService.pauseScenario(params.scenarioId);
        return NextResponse.json({ success: true, message: 'Scenario paused' });

      case 'resume_scenario':
        scenariosService.resumeScenario(params.scenarioId);
        return NextResponse.json({ success: true, message: 'Scenario resumed' });

      case 'abort_scenario':
        scenariosService.abortScenario(params.scenarioId);
        return NextResponse.json({ success: true, message: 'Scenario aborted' });

      case 'set_scenario_schedule':
        scenariosService.setSchedule(params.scenarioId, params.schedule);
        return NextResponse.json({ success: true, message: 'Schedule set' });

      case 'delete_scenario':
        scenariosService.deleteScenario(params.scenarioId);
        return NextResponse.json({ success: true, message: 'Scenario deleted' });

      // Templates
      case 'register_template':
        const template = asyncTemplateCompiler.registerTemplate(
          params.id,
          params.name,
          params.content
        );
        return NextResponse.json({ success: true, data: template });

      case 'render_template':
        const rendered = await asyncTemplateCompiler.render(
          params.templateId,
          params.variables
        );
        return NextResponse.json({ success: true, data: rendered });

      case 'invalidate_template_cache':
        asyncTemplateCompiler.invalidateCache(params.templateId);
        return NextResponse.json({ success: true, message: 'Cache invalidated' });

      // Drag and Drop
      case 'start_drag':
        dragDropService.startDrag(params.item);
        return NextResponse.json({ success: true, message: 'Drag started' });

      case 'end_drag':
        dragDropService.endDrag();
        return NextResponse.json({ success: true, message: 'Drag ended' });

      case 'drop':
        const dropResult = await dragDropService.drop(params.targetId);
        return NextResponse.json({ success: true, data: dropResult });

      case 'register_drop_target':
        dragDropService.registerDropTarget(params.target);
        return NextResponse.json({ success: true, message: 'Target registered' });

      case 'undo_drag':
        const undoResult = await dragDropService.undo();
        return NextResponse.json({ success: true, data: undoResult });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in automation action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
