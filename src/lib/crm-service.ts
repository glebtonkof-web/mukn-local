/**
 * МУКН | Трафик - CRM Сервис
 * Лиды, заказы, платежи, Shopify интеграция
 * Реальная интеграция с Shopify API
 */

import { db } from './db'
import { logger } from './logger'

export interface Lead {
  id: string
  source: string // telegram, instagram, tiktok, facebook
  sourceId?: string // ID кампании или канала
  name?: string
  email?: string
  phone?: string
  telegramUsername?: string
  instagramUsername?: string
  
  // Интересы
  interests?: string[]
  budget?: string
  timeline?: string
  
  // Статус в воронке
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  score: number // 0-100
  
  // Связи
  assignedTo?: string
  campaignId?: string
  influencerId?: string
  
  // Метаданные
  tags: string[]
  notes: LeadNote[]
  customFields: Record<string, any>
  
  // Временные метки
  createdAt: Date
  updatedAt: Date
  lastContactAt?: Date
  nextFollowUpAt?: Date
  convertedAt?: Date
}

export interface LeadNote {
  id: string
  content: string
  authorId: string
  createdAt: Date
}

export interface Order {
  id: string
  leadId?: string
  
  // Товары
  items: OrderItem[]
  
  // Суммы
  subtotal: number
  discount: number
  tax: number
  total: number
  currency: string
  
  // Статус
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded'
  
  // Покупатель
  customerId?: string
  customerEmail: string
  customerName?: string
  customerPhone?: string
  customerAddress?: Address
  
  // Источник
  source: 'direct' | 'telegram' | 'instagram' | 'tiktok' | 'shopify' | 'other'
  campaignId?: string
  
  // Даты
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productSku?: string
  quantity: number
  unitPrice: number
  total: number
  imageUrl?: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface Payment {
  id: string
  orderId: string
  
  // Сумма
  amount: number
  currency: string
  
  // Метод
  method: 'card' | 'crypto' | 'bank_transfer' | 'cash' | 'other'
  provider?: string // stripe, paypal, crypto_bot, etc.
  
  // Статус
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  
  // Детали транзакции
  transactionId?: string
  receiptUrl?: string
  
  // Метаданные
  metadata: Record<string, any>
  
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface ProductCatalog {
  id: string
  name: string
  description?: string
  products: Product[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  catalogId: string
  name: string
  description?: string
  sku?: string
  price: number
  currency: string
  imageUrl?: string
  images?: string[]
  category?: string
  tags?: string[]
  inventory?: number
  isActive: boolean
  metadata: Record<string, any>
}

export interface SalesFunnel {
  id: string
  name: string
  stages: FunnelStage[]
  conversionRates: Record<string, number>
  totalLeads: number
  totalRevenue: number
  createdAt: Date
  updatedAt: Date
}

export interface FunnelStage {
  id: string
  name: string
  order: number
  leadsCount: number
  conversionRate: number
  avgTimeInStage: number // дни
}

export interface ShopifyConfig {
  storeUrl: string
  apiKey: string
  apiSecret: string
  accessToken: string
  webhookSecret?: string
  syncProducts: boolean
  syncOrders: boolean
  syncCustomers: boolean
}

// Shopify API Types
interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  vendor?: string
  product_type?: string
  handle?: string
  variants: ShopifyVariant[]
  images?: { src: string }[]
  tags?: string
  status: string
}

interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  price: string
  sku?: string
  inventory_quantity?: number
}

interface ShopifyOrder {
  id: number
  email?: string
  name: string
  total_price: string
  currency: string
  financial_status: string
  fulfillment_status?: string
  created_at: string
  updated_at: string
  customer?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }
  line_items: {
    id: number
    product_id?: number
    title: string
    variant_id?: number
    quantity: number
    price: string
    sku?: string
  }[]
  shipping_address?: {
    address1: string
    address2?: string
    city: string
    province?: string
    zip: string
    country: string
  }
}

class CRMService {
  private leads: Map<string, Lead> = new Map()
  private orders: Map<string, Order> = new Map()
  private payments: Map<string, Payment> = new Map()
  private products: Map<string, Product> = new Map()
  private catalogs: Map<string, ProductCatalog> = new Map()
  private shopifyConfig: ShopifyConfig | null = null

  constructor() {
    this.initializeSampleData()
  }

  // ==================== ЛИДЫ ====================

  /**
   * Создать нового лида
   */
  createLead(data: Partial<Lead>): Lead {
    const lead: Lead = {
      id: `lead_${Date.now()}`,
      source: data.source || 'direct',
      sourceId: data.sourceId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      telegramUsername: data.telegramUsername,
      instagramUsername: data.instagramUsername,
      interests: data.interests || [],
      budget: data.budget,
      timeline: data.timeline,
      stage: data.stage || 'new',
      score: data.score || this.calculateLeadScore(data),
      assignedTo: data.assignedTo,
      campaignId: data.campaignId,
      influencerId: data.influencerId,
      tags: data.tags || [],
      notes: data.notes || [],
      customFields: data.customFields || {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.leads.set(lead.id, lead)
    return lead
  }

  /**
   * Рассчитать скор лида
   */
  private calculateLeadScore(data: Partial<Lead>): number {
    let score = 0
    
    if (data.email) score += 15
    if (data.phone) score += 20
    if (data.telegramUsername) score += 15
    if (data.instagramUsername) score += 10
    if (data.budget) score += 15
    if (data.timeline) score += 10
    if (data.interests && data.interests.length > 0) score += 15
    
    return Math.min(score, 100)
  }

  /**
   * Обновить лид
   */
  updateLead(leadId: string, data: Partial<Lead>): Lead | null {
    const lead = this.leads.get(leadId)
    if (!lead) return null

    Object.assign(lead, data, { updatedAt: new Date() })
    return lead
  }

  /**
   * Переместить лид по воронке
   */
  moveLeadToStage(leadId: string, stage: Lead['stage']): Lead | null {
    const lead = this.leads.get(leadId)
    if (!lead) return null

    lead.stage = stage
    lead.updatedAt = new Date()

    if (stage === 'closed_won') {
      lead.convertedAt = new Date()
    }

    return lead
  }

  /**
   * Добавить заметку к лиду
   */
  addLeadNote(leadId: string, content: string, authorId: string): Lead | null {
    const lead = this.leads.get(leadId)
    if (!lead) return null

    lead.notes.push({
      id: `note_${Date.now()}`,
      content,
      authorId,
      createdAt: new Date()
    })

    lead.updatedAt = new Date()
    return lead
  }

  /**
   * Получить лиды по стадии
   */
  getLeadsByStage(stage: Lead['stage']): Lead[] {
    return Array.from(this.leads.values()).filter(l => l.stage === stage)
  }

  /**
   * Получить лиды по кампании
   */
  getLeadsByCampaign(campaignId: string): Lead[] {
    return Array.from(this.leads.values()).filter(l => l.campaignId === campaignId)
  }

  /**
   * Поиск лидов
   */
  searchLeads(query: string): Lead[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.leads.values()).filter(l => 
      l.name?.toLowerCase().includes(lowerQuery) ||
      l.email?.toLowerCase().includes(lowerQuery) ||
      l.telegramUsername?.toLowerCase().includes(lowerQuery) ||
      l.tags.some(t => t.toLowerCase().includes(lowerQuery))
    )
  }

  // ==================== ЗАКАЗЫ ====================

  /**
   * Создать заказ
   */
  createOrder(data: Partial<Order>): Order {
    const order: Order = {
      id: `order_${Date.now()}`,
      leadId: data.leadId,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      total: data.total || data.subtotal || 0,
      currency: data.currency || 'USD',
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'pending',
      customerId: data.customerId,
      customerEmail: data.customerEmail || '',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      source: data.source || 'direct',
      campaignId: data.campaignId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.orders.set(order.id, order)
    return order
  }

  /**
   * Обновить статус заказа
   */
  updateOrderStatus(orderId: string, status: Order['status']): Order | null {
    const order = this.orders.get(orderId)
    if (!order) return null

    order.status = status
    order.updatedAt = new Date()

    if (status === 'shipped') order.shippedAt = new Date()
    if (status === 'delivered') order.deliveredAt = new Date()

    return order
  }

  /**
   * Получить заказы по статусу
   */
  getOrdersByStatus(status: Order['status']): Order[] {
    return Array.from(this.orders.values()).filter(o => o.status === status)
  }

  /**
   * Получить заказы клиента
   */
  getOrdersByCustomer(email: string): Order[] {
    return Array.from(this.orders.values()).filter(o => o.customerEmail === email)
  }

  // ==================== ПЛАТЕЖИ ====================

  /**
   * Создать платеж
   */
  createPayment(data: Partial<Payment>): Payment {
    const payment: Payment = {
      id: `payment_${Date.now()}`,
      orderId: data.orderId || '',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      method: data.method || 'card',
      provider: data.provider,
      status: data.status || 'pending',
      transactionId: data.transactionId,
      receiptUrl: data.receiptUrl,
      metadata: data.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.payments.set(payment.id, payment)
    return payment
  }

  /**
   * Обновить статус платежа
   */
  updatePaymentStatus(paymentId: string, status: Payment['status']): Payment | null {
    const payment = this.payments.get(paymentId)
    if (!payment) return null

    payment.status = status
    payment.updatedAt = new Date()

    if (status === 'completed') {
      payment.completedAt = new Date()
      
      // Обновляем статус заказа
      const order = this.orders.get(payment.orderId)
      if (order) {
        order.paymentStatus = 'paid'
        order.paidAt = new Date()
        order.updatedAt = new Date()
      }
    }

    return payment
  }

  // ==================== КАТАЛОГИ ТОВАРОВ ====================

  /**
   * Создать каталог
   */
  createCatalog(name: string, description?: string): ProductCatalog {
    const catalog: ProductCatalog = {
      id: `catalog_${Date.now()}`,
      name,
      description,
      products: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.catalogs.set(catalog.id, catalog)
    return catalog
  }

  /**
   * Добавить товар
   */
  addProduct(catalogId: string, data: Partial<Product>): Product | null {
    const catalog = this.catalogs.get(catalogId)
    if (!catalog) return null

    const product: Product = {
      id: `product_${Date.now()}`,
      catalogId,
      name: data.name || '',
      description: data.description,
      sku: data.sku,
      price: data.price || 0,
      currency: data.currency || 'USD',
      imageUrl: data.imageUrl,
      images: data.images,
      category: data.category,
      tags: data.tags,
      inventory: data.inventory,
      isActive: data.isActive ?? true,
      metadata: data.metadata || {}
    }

    this.products.set(product.id, product)
    catalog.products.push(product)
    catalog.updatedAt = new Date()

    return product
  }

  /**
   * Получить каталог для Telegram
   */
  getCatalogForTelegram(catalogId: string): any {
    const catalog = this.catalogs.get(catalogId)
    if (!catalog) return null

    return {
      title: catalog.name,
      description: catalog.description,
      items: catalog.products.map(p => ({
        id: p.id,
        title: p.name,
        description: p.description,
        price: {
          amount: p.price * 100, // в копейках
          currency: p.currency,
          label: `${p.price} ${p.currency}`
        },
        photo_url: p.imageUrl
      }))
    }
  }

  // ==================== SHOPIFY ИНТЕГРАЦИЯ ====================

  /**
   * Настройка Shopify
   */
  configureShopify(config: ShopifyConfig): void {
    this.shopifyConfig = config
    logger.info('Shopify configured', { storeUrl: config.storeUrl })
  }

  /**
   * Выполнить запрос к Shopify API
   */
  private async shopifyRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    if (!this.shopifyConfig) {
      throw new Error('Shopify not configured')
    }

    const { storeUrl, accessToken } = this.shopifyConfig
    const url = `https://${storeUrl}/admin/api/2024-01/${endpoint}.json`

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Shopify API request failed', error as Error, { endpoint, method })
      throw error
    }
  }

  /**
   * Синхронизация товаров с Shopify
   */
  async syncShopifyProducts(): Promise<Product[]> {
    if (!this.shopifyConfig) {
      throw new Error('Shopify not configured')
    }

    try {
      const response = await this.shopifyRequest<{ products: ShopifyProduct[] }>('products')
      const syncedProducts: Product[] = []

      for (const shopifyProduct of response.products) {
        // Берем первый вариант для цены
        const firstVariant = shopifyProduct.variants[0]
        
        const product: Product = {
          id: `shopify_${shopifyProduct.id}`,
          catalogId: 'shopify_sync',
          name: shopifyProduct.title,
          description: shopifyProduct.body_html,
          sku: firstVariant?.sku,
          price: parseFloat(firstVariant?.price || '0'),
          currency: 'USD', // Shopify usually uses store default currency
          imageUrl: shopifyProduct.images?.[0]?.src,
          images: shopifyProduct.images?.map(img => img.src),
          category: shopifyProduct.product_type,
          tags: shopifyProduct.tags?.split(', ') || [],
          inventory: firstVariant?.inventory_quantity,
          isActive: shopifyProduct.status === 'active',
          metadata: { 
            shopifyId: shopifyProduct.id,
            handle: shopifyProduct.handle,
            vendor: shopifyProduct.vendor
          }
        }

        this.products.set(product.id, product)
        syncedProducts.push(product)
      }

      logger.info('Shopify products synced', { count: syncedProducts.length })
      return syncedProducts
    } catch (error) {
      logger.error('Failed to sync Shopify products', error as Error)
      throw error
    }
  }

  /**
   * Импорт заказов из Shopify
   */
  async importShopifyOrders(limit: number = 50): Promise<Order[]> {
    if (!this.shopifyConfig) {
      throw new Error('Shopify not configured')
    }

    try {
      const response = await this.shopifyRequest<{ orders: ShopifyOrder[] }>(`orders?limit=${limit}&status=any`)
      const importedOrders: Order[] = []

      for (const shopifyOrder of response.orders) {
        const order: Order = {
          id: `shopify_order_${shopifyOrder.id}`,
          customerEmail: shopifyOrder.email || shopifyOrder.customer?.email || '',
          customerName: shopifyOrder.customer 
            ? `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim()
            : undefined,
          customerPhone: shopifyOrder.customer?.phone,
          customerAddress: shopifyOrder.shipping_address ? {
            line1: shopifyOrder.shipping_address.address1,
            line2: shopifyOrder.shipping_address.address2,
            city: shopifyOrder.shipping_address.city,
            state: shopifyOrder.shipping_address.province,
            postalCode: shopifyOrder.shipping_address.zip,
            country: shopifyOrder.shipping_address.country
          } : undefined,
          items: shopifyOrder.line_items.map(item => ({
            id: `item_${item.id}`,
            productId: item.product_id?.toString() || '',
            productName: item.title,
            productSku: item.sku,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            total: parseFloat(item.price) * item.quantity
          })),
          subtotal: parseFloat(shopifyOrder.total_price),
          discount: 0,
          tax: 0,
          total: parseFloat(shopifyOrder.total_price),
          currency: shopifyOrder.currency,
          status: this.mapShopifyFulfillmentStatus(shopifyOrder.fulfillment_status),
          paymentStatus: this.mapShopifyPaymentStatus(shopifyOrder.financial_status),
          source: 'shopify',
          createdAt: new Date(shopifyOrder.created_at),
          updatedAt: new Date(shopifyOrder.updated_at)
        }

        this.orders.set(order.id, order)
        importedOrders.push(order)
      }

      logger.info('Shopify orders imported', { count: importedOrders.length })
      return importedOrders
    } catch (error) {
      logger.error('Failed to import Shopify orders', error as Error)
      throw error
    }
  }

  /**
   * Маппинг статусов выполнения Shopify
   */
  private mapShopifyFulfillmentStatus(status?: string): Order['status'] {
    switch (status) {
      case 'fulfilled':
        return 'delivered'
      case 'partial':
        return 'shipped'
      case 'restocked':
        return 'cancelled'
      case null:
      case undefined:
        return 'confirmed'
      default:
        return 'processing'
    }
  }

  /**
   * Маппинг статусов оплаты Shopify
   */
  private mapShopifyPaymentStatus(status: string): Order['paymentStatus'] {
    switch (status) {
      case 'paid':
        return 'paid'
      case 'partially_paid':
        return 'partial'
      case 'refunded':
        return 'refunded'
      case 'voided':
        return 'refunded'
      default:
        return 'pending'
    }
  }

  /**
   * Отправить заказ в Shopify
   */
  async createShopifyOrder(order: Order): Promise<{ success: boolean; shopifyOrderId?: string; error?: string }> {
    if (!this.shopifyConfig) {
      throw new Error('Shopify not configured')
    }

    try {
      const shopifyOrder = {
        order: {
          email: order.customerEmail,
          line_items: order.items.map(item => ({
            title: item.productName,
            quantity: item.quantity,
            price: item.unitPrice.toString()
          })),
          customer: order.customerName ? {
            first_name: order.customerName.split(' ')[0],
            last_name: order.customerName.split(' ').slice(1).join(' ')
          } : undefined,
          billing_address: order.customerAddress ? {
            address1: order.customerAddress.line1,
            address2: order.customerAddress.line2,
            city: order.customerAddress.city,
            province: order.customerAddress.state,
            zip: order.customerAddress.postalCode,
            country: order.customerAddress.country
          } : undefined,
          shipping_address: order.customerAddress ? {
            address1: order.customerAddress.line1,
            address2: order.customerAddress.line2,
            city: order.customerAddress.city,
            province: order.customerAddress.state,
            zip: order.customerAddress.postalCode,
            country: order.customerAddress.country
          } : undefined,
          tags: order.source,
          metafields: [
            {
              namespace: 'mukn',
              key: 'original_order_id',
              value: order.id,
              type: 'single_line_text_field'
            }
          ]
        }
      }

      const response = await this.shopifyRequest<{ order: { id: number } }>('orders', 'POST', shopifyOrder)
      
      logger.info('Shopify order created', { 
        localOrderId: order.id, 
        shopifyOrderId: response.order.id 
      })

      return { 
        success: true, 
        shopifyOrderId: `shopify_${response.order.id}` 
      }
    } catch (error) {
      logger.error('Failed to create Shopify order', error as Error, { orderId: order.id })
      return { 
        success: false, 
        error: (error as Error).message 
      }
    }
  }

  /**
   * Обработка вебхука Shopify
   */
  handleShopifyWebhook(event: string, data: any): void {
    logger.info('Processing Shopify webhook', { event })

    switch (event) {
      case 'orders/create':
        this.handleShopifyOrderCreated(data)
        break
      case 'orders/updated':
        this.handleShopifyOrderUpdated(data)
        break
      case 'orders/cancelled':
        this.handleShopifyOrderCancelled(data)
        break
      case 'products/create':
        this.handleShopifyProductCreated(data)
        break
      case 'products/update':
        this.handleShopifyProductUpdated(data)
        break
      case 'inventory_levels/update':
        this.handleShopifyInventoryUpdated(data)
        break
    }
  }

  private handleShopifyOrderCreated(data: ShopifyOrder): void {
    const order = this.createOrder({
      id: `shopify_order_${data.id}`,
      source: 'shopify',
      customerEmail: data.email || '',
      customerName: data.customer 
        ? `${data.customer.first_name} ${data.customer.last_name}`.trim()
        : undefined,
      items: data.line_items.map(item => ({
        id: `item_${item.id}`,
        productId: item.product_id?.toString() || '',
        productName: item.title,
        quantity: item.quantity,
        unitPrice: parseFloat(item.price),
        total: parseFloat(item.price) * item.quantity
      })),
      total: parseFloat(data.total_price),
      currency: data.currency,
      status: this.mapShopifyFulfillmentStatus(data.fulfillment_status),
      paymentStatus: this.mapShopifyPaymentStatus(data.financial_status)
    })

    logger.info('Shopify order created via webhook', { orderId: order.id })
  }

  private handleShopifyOrderUpdated(data: ShopifyOrder): void {
    const orderId = `shopify_order_${data.id}`
    const order = this.orders.get(orderId)
    
    if (order) {
      order.status = this.mapShopifyFulfillmentStatus(data.fulfillment_status)
      order.paymentStatus = this.mapShopifyPaymentStatus(data.financial_status)
      order.updatedAt = new Date()
      logger.info('Shopify order updated via webhook', { orderId })
    }
  }

  private handleShopifyOrderCancelled(data: ShopifyOrder): void {
    const orderId = `shopify_order_${data.id}`
    const order = this.orders.get(orderId)
    
    if (order) {
      order.status = 'cancelled'
      order.updatedAt = new Date()
      logger.info('Shopify order cancelled via webhook', { orderId })
    }
  }

  private handleShopifyProductCreated(data: ShopifyProduct): void {
    const product: Product = {
      id: `shopify_${data.id}`,
      catalogId: 'shopify_sync',
      name: data.title,
      description: data.body_html,
      price: parseFloat(data.variants[0]?.price || '0'),
      currency: 'USD',
      imageUrl: data.images?.[0]?.src,
      isActive: data.status === 'active',
      metadata: { shopifyId: data.id }
    }

    this.products.set(product.id, product)
    logger.info('Shopify product created via webhook', { productId: product.id })
  }

  private handleShopifyProductUpdated(data: ShopifyProduct): void {
    const productId = `shopify_${data.id}`
    const product = this.products.get(productId)
    
    if (product) {
      product.name = data.title
      product.description = data.body_html
      product.price = parseFloat(data.variants[0]?.price || '0')
      product.isActive = data.status === 'active'
      logger.info('Shopify product updated via webhook', { productId })
    }
  }

  private handleShopifyInventoryUpdated(data: any): void {
    // Обновление инвентаря
    logger.info('Shopify inventory updated via webhook', { inventoryItemId: data.inventory_item_id })
  }

  // ==================== АНАЛИТИКА ====================

  /**
   * Получить воронку продаж
   */
  getSalesFunnel(): SalesFunnel {
    const stages: FunnelStage[] = [
      { id: 'new', name: 'Новые', order: 1, leadsCount: 0, conversionRate: 100, avgTimeInStage: 1 },
      { id: 'contacted', name: 'Контакт', order: 2, leadsCount: 0, conversionRate: 0, avgTimeInStage: 2 },
      { id: 'qualified', name: 'Квалификация', order: 3, leadsCount: 0, conversionRate: 0, avgTimeInStage: 3 },
      { id: 'proposal', name: 'Предложение', order: 4, leadsCount: 0, conversionRate: 0, avgTimeInStage: 5 },
      { id: 'negotiation', name: 'Переговоры', order: 5, leadsCount: 0, conversionRate: 0, avgTimeInStage: 7 },
      { id: 'closed_won', name: 'Успех', order: 6, leadsCount: 0, conversionRate: 0, avgTimeInStage: 0 },
      { id: 'closed_lost', name: 'Потеря', order: 7, leadsCount: 0, conversionRate: 0, avgTimeInStage: 0 }
    ]

    // Подсчет лидов по стадиям
    const leads = Array.from(this.leads.values())
    for (const lead of leads) {
      const stage = stages.find(s => s.id === lead.stage)
      if (stage) stage.leadsCount++
    }

    // Расчет конверсии
    const totalLeads = leads.length
    for (let i = 0; i < stages.length; i++) {
      stages[i].conversionRate = totalLeads > 0 
        ? Math.round((stages[i].leadsCount / totalLeads) * 100) 
        : 0
    }

    const revenue = Array.from(this.orders.values())
      .filter(o => o.status === 'delivered' || o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0)

    return {
      id: 'main_funnel',
      name: 'Основная воронка',
      stages,
      conversionRates: stages.reduce((acc, s) => ({ ...acc, [s.id]: s.conversionRate }), {}),
      totalLeads,
      totalRevenue: revenue,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Статистика продаж
   */
  getSalesStats(period: 'day' | 'week' | 'month' = 'month'): {
    totalOrders: number
    totalRevenue: number
    avgOrderValue: number
    newLeads: number
    conversionRate: number
  } {
    const now = new Date()
    const start = new Date()
    
    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
    }

    const orders = Array.from(this.orders.values())
      .filter(o => o.createdAt >= start && o.createdAt <= now)
    
    const leads = Array.from(this.leads.values())
      .filter(l => l.createdAt >= start && l.createdAt <= now)

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const convertedLeads = leads.filter(l => l.stage === 'closed_won').length

    return {
      totalOrders: orders.length,
      totalRevenue,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      newLeads: leads.length,
      conversionRate: leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0
    }
  }

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================

  private initializeSampleData(): void {
    // Создаем демо-данные
    this.createLead({
      name: 'Иван Петров',
      email: 'ivan@example.com',
      telegramUsername: '@ivan_petrov',
      stage: 'new',
      source: 'telegram',
      tags: ['crypto', 'premium']
    })

    this.createLead({
      name: 'Мария Сидорова',
      email: 'maria@example.com',
      phone: '+79001234567',
      stage: 'qualified',
      source: 'instagram',
      tags: ['lifestyle']
    })

    this.createOrder({
      customerEmail: 'customer@example.com',
      customerName: 'Тестовый клиент',
      items: [
        {
          id: 'item_1',
          productId: 'product_1',
          productName: 'Тестовый товар',
          quantity: 2,
          unitPrice: 1500,
          total: 3000
        }
      ],
      subtotal: 3000,
      total: 3000,
      currency: 'RUB',
      status: 'confirmed',
      paymentStatus: 'paid',
      source: 'telegram'
    })

    // Создаем каталог
    const catalog = this.createCatalog('Основной каталог', 'Товары для наших клиентов')
    this.addProduct(catalog.id, {
      name: 'Премиум курс',
      description: 'Обучающий курс премиум уровня',
      price: 9990,
      currency: 'RUB',
      category: 'education'
    })
    this.addProduct(catalog.id, {
      name: 'Консультация',
      description: 'Персональная консультация',
      price: 5000,
      currency: 'RUB',
      category: 'services'
    })
  }

  // ==================== ГЕТТЕРЫ ====================

  getLead(id: string): Lead | undefined {
    return this.leads.get(id)
  }

  getAllLeads(): Lead[] {
    return Array.from(this.leads.values())
  }

  getOrder(id: string): Order | undefined {
    return this.orders.get(id)
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values())
  }

  getProduct(id: string): Product | undefined {
    return this.products.get(id)
  }

  getAllProducts(): Product[] {
    return Array.from(this.products.values())
  }

  getCatalog(id: string): ProductCatalog | undefined {
    return this.catalogs.get(id)
  }

  getAllCatalogs(): ProductCatalog[] {
    return Array.from(this.catalogs.values())
  }
}

export const crmService = new CRMService()
export default crmService
