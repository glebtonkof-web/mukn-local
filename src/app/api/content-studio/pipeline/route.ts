import { NextRequest, NextResponse } from 'next/server';
import { getContentStudio } from '@/lib/content-studio';

export async function GET() {
  try {
    const templates = getContentStudio().getPipelineTemplates();
    
    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, templateId, pipelineId, inputs, options } = body;
    
    const studio = getContentStudio();
    
    switch (action) {
      case 'create':
        const pipeline = studio.createPipeline(templateId, options);
        return NextResponse.json({ success: true, data: pipeline });
      
      case 'execute':
        const result = await studio.executePipeline(pipelineId, inputs);
        return NextResponse.json(result);
      
      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
