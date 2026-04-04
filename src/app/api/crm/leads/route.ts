import { NextRequest, NextResponse } from 'next/server'
import crmService from '@/lib/crm-service'

// GET /api/crm/leads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const stage = searchParams.get('stage')
    const campaignId = searchParams.get('campaignId')
    const search = searchParams.get('search')

    if (leadId) {
      const lead = crmService.getLead(leadId)
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      return NextResponse.json({ lead })
    }

    if (stage) {
      const leads = crmService.getLeadsByStage(stage as any)
      return NextResponse.json({ leads })
    }

    if (campaignId) {
      const leads = crmService.getLeadsByCampaign(campaignId)
      return NextResponse.json({ leads })
    }

    if (search) {
      const leads = crmService.searchLeads(search)
      return NextResponse.json({ leads })
    }

    const leads = crmService.getAllLeads()
    return NextResponse.json({ leads })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/crm/leads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'move') {
      const lead = crmService.moveLeadToStage(body.leadId, body.stage)
      return NextResponse.json({ lead })
    }

    if (body.action === 'note') {
      const lead = crmService.addLeadNote(body.leadId, body.content, body.authorId)
      return NextResponse.json({ lead })
    }

    const lead = crmService.createLead(body)
    return NextResponse.json({ lead })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/crm/leads
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const lead = crmService.updateLead(body.leadId, body.data)
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    return NextResponse.json({ lead })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
