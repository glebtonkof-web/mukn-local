import { NextRequest, NextResponse } from 'next/server'
import crmService from '@/lib/crm-service'

// GET /api/crm/shopify
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'funnel') {
      const funnel = crmService.getSalesFunnel()
      return NextResponse.json({ funnel })
    }

    if (action === 'stats') {
      const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'month'
      const stats = crmService.getSalesStats(period)
      return NextResponse.json({ stats })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/crm/shopify
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'configure') {
      crmService.configureShopify(body.config)
      return NextResponse.json({ success: true })
    }

    if (body.action === 'sync_products') {
      const products = await crmService.syncShopifyProducts()
      return NextResponse.json({ products })
    }

    if (body.action === 'import_orders') {
      const orders = await crmService.importShopifyOrders()
      return NextResponse.json({ orders })
    }

    if (body.action === 'create_order') {
      const result = await crmService.createShopifyOrder(body.order)
      return NextResponse.json(result)
    }

    if (body.action === 'webhook') {
      crmService.handleShopifyWebhook(body.event, body.data)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
