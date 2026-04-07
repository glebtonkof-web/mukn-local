/**
 * AI Context Route
 * Предоставляет контекст для AI ассистента
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'full'
    
    let contextData: any = {}
    
    try {
      // Получаем кампании
      const campaigns = await db.campaign.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          budget: true,
          spent: true,
          revenue: true,
          niche: true,
          leadsCount: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
      })
      contextData.campaigns = campaigns
      
      // Получаем аккаунты (только существующие поля)
      const accounts = await db.account.findMany({
        select: {
          id: true,
          username: true,
          platform: true,
          status: true,
          banRisk: true,
        },
        take: 50,
      })
      contextData.accounts = accounts
      
      // Получаем офферы (только существующие поля)
      const offers = await db.offer.findMany({
        select: {
          id: true,
          name: true,
          network: true,
          payout: true,
          clicks: true,
          leads: true,
          conversions: true,
          revenue: true,
        },
        take: 50,
      })
      contextData.offers = offers
      
      // Получаем инфлюенсеров (только существующие поля)
      const influencers = await db.influencer.findMany({
        select: {
          id: true,
          name: true,
          leadsCount: true,
          revenue: true,
        },
        take: 20,
      })
      contextData.influencers = influencers
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      contextData.error = 'Database connection error'
    }
    
    // Вычисляем статистику
    const stats = {
      totalCampaigns: contextData.campaigns?.length || 0,
      activeCampaigns: contextData.campaigns?.filter((c: any) => c.status === 'active').length || 0,
      totalBudget: contextData.campaigns?.reduce((sum: number, c: any) => sum + (c.budget || 0), 0) || 0,
      totalSpent: contextData.campaigns?.reduce((sum: number, c: any) => sum + (c.spent || 0), 0) || 0,
      totalRevenue: contextData.campaigns?.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0) || 0,
      totalLeads: contextData.campaigns?.reduce((sum: number, c: any) => sum + (c.leadsCount || 0), 0) || 0,
      accountsCount: contextData.accounts?.length || 0,
      offersCount: contextData.offers?.length || 0,
    }
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        ...contextData,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('AI Context error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
