import { NextRequest, NextResponse } from 'next/server'
import crmService from '@/lib/crm-service'

// GET /api/crm/orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const customerEmail = searchParams.get('customerEmail')

    if (orderId) {
      const order = crmService.getOrder(orderId)
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      return NextResponse.json({ order })
    }

    if (status) {
      const orders = crmService.getOrdersByStatus(status as any)
      return NextResponse.json({ orders })
    }

    if (customerEmail) {
      const orders = crmService.getOrdersByCustomer(customerEmail)
      return NextResponse.json({ orders })
    }

    const orders = crmService.getAllOrders()
    return NextResponse.json({ orders })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/crm/orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const order = crmService.createOrder(body)
    return NextResponse.json({ order })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/crm/orders
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const order = crmService.updateOrderStatus(body.orderId, body.status)
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    return NextResponse.json({ order })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
