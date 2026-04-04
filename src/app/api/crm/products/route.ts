import { NextRequest, NextResponse } from 'next/server'
import crmService from '@/lib/crm-service'

// GET /api/crm/products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const catalogId = searchParams.get('catalogId')

    if (productId) {
      const product = crmService.getProduct(productId)
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      return NextResponse.json({ product })
    }

    if (catalogId) {
      const catalog = crmService.getCatalog(catalogId)
      return NextResponse.json({ catalog, products: catalog?.products || [] })
    }

    const products = crmService.getAllProducts()
    const catalogs = crmService.getAllCatalogs()
    
    return NextResponse.json({ products, catalogs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/crm/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'create_catalog') {
      const catalog = crmService.createCatalog(body.name, body.description)
      return NextResponse.json({ catalog })
    }

    if (body.action === 'add_product') {
      const product = crmService.addProduct(body.catalogId, body.data)
      return NextResponse.json({ product })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/crm/products/telegram/:catalogId
export async function getTelegramCatalog(request: NextRequest, { params }: { params: { catalogId: string } }) {
  try {
    const catalog = crmService.getCatalogForTelegram(params.catalogId)
    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 })
    }
    return NextResponse.json(catalog)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
