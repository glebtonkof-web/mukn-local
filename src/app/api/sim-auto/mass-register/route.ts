/**
 * API Endpoint: Mass Registration
 * Массовая регистрация аккаунтов
 */

import { NextRequest, NextResponse } from 'next/server'
import { runMassRegistration, runSingleRegistration, type MassRegistrationConfig } from '@/lib/sim-auto/register-all'
import { getServiceConfig, getAllServices, getServicesForRussia, canRegister } from '@/lib/sim-auto/services-registry'

// GET: Получить список доступных сервисов
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  try {
    // Получить список всех сервисов
    if (action === 'services') {
      const services = getAllServices().map(s => ({
        id: s.id,
        name: s.name,
        nameRu: s.nameRu,
        requiresPhone: s.requiresPhone,
        requiresEmail: s.requiresEmail,
        requiresVpn: s.requiresVpn,
        requiresManual: s.requiresManual,
        riskLevel: s.riskLevel,
        blockedInRussia: s.blockedInRussia,
        extremistOrganization: s.extremistOrganization,
        maxAccountsPerPhone: s.maxAccountsPerPhone,
        minPauseBetweenRegs: s.minPauseBetweenRegs,
        warnings: s.warnings,
        notes: s.notes
      }))
      
      return NextResponse.json({
        success: true,
        count: services.length,
        services
      })
    }
    
    // Получить сервисы, работающие в РФ
    if (action === 'services-ru') {
      const services = getServicesForRussia().map(s => ({
        id: s.id,
        name: s.name,
        nameRu: s.nameRu,
        requiresPhone: s.requiresPhone,
        requiresVpn: s.requiresVpn,
        riskLevel: s.riskLevel
      }))
      
      return NextResponse.json({
        success: true,
        count: services.length,
        services
      })
    }
    
    // Получить информацию о конкретном сервисе
    if (action === 'service') {
      const serviceId = searchParams.get('id')
      
      if (!serviceId) {
        return NextResponse.json({
          success: false,
          error: 'Не указан id сервиса'
        }, { status: 400 })
      }
      
      const service = getServiceConfig(serviceId)
      
      if (!service) {
        return NextResponse.json({
          success: false,
          error: `Сервис не найден: ${serviceId}`
        }, { status: 404 })
      }
      
      const registerCheck = canRegister(serviceId)
      
      return NextResponse.json({
        success: true,
        service: {
          id: service.id,
          name: service.name,
          nameRu: service.nameRu,
          url: service.url,
          requiresPhone: service.requiresPhone,
          requiresEmail: service.requiresEmail,
          requiresSms: service.requiresSms,
          requiresVpn: service.requiresVpn,
          requiresManual: service.requiresManual,
          riskLevel: service.riskLevel,
          requiresMobileFingerprint: service.requiresMobileFingerprint,
          maxAccountsPerPhone: service.maxAccountsPerPhone,
          minPauseBetweenRegs: service.minPauseBetweenRegs,
          blockedInRussia: service.blockedInRussia,
          extremistOrganization: service.extremistOrganization,
          warnings: service.warnings,
          notes: service.notes,
          canRegister: registerCheck.canRegister,
          registrationWarnings: registerCheck.reasons
        }
      })
    }
    
    // Default: информация о API
    return NextResponse.json({
      success: true,
      message: 'SIM Auto-Registration Mass Registration API',
      endpoints: {
        'GET ?action=services': 'Получить список всех сервисов',
        'GET ?action=services-ru': 'Получить сервисы для РФ',
        'GET ?action=service&id=<id>': 'Получить информацию о сервисе',
        'POST': 'Запустить массовую регистрацию',
        'POST ?action=single': 'Запустить одиночную регистрацию'
      }
    })
    
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST: Запустить регистрацию
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  try {
    const body = await request.json()
    
    // Одиночная регистрация
    if (action === 'single') {
      const { serviceId, phoneNumber, deviceId, config } = body
      
      if (!serviceId || !phoneNumber || !deviceId) {
        return NextResponse.json({
          success: false,
          error: 'Не указаны обязательные параметры: serviceId, phoneNumber, deviceId'
        }, { status: 400 })
      }
      
      // Проверяем сервис
      const service = getServiceConfig(serviceId)
      if (!service) {
        return NextResponse.json({
          success: false,
          error: `Сервис не найден: ${serviceId}`
        }, { status: 404 })
      }
      
      // Проверяем ограничения
      const registerCheck = canRegister(serviceId)
      
      // Запускаем регистрацию
      console.log(`[API] Запуск регистрации: ${serviceId} для ${phoneNumber}`)
      
      const result = await runSingleRegistration({
        serviceId,
        phoneNumber,
        deviceId,
        config
      })
      
      return NextResponse.json({
        success: result.success,
        result,
        warnings: registerCheck.reasons
      })
    }
    
    // Массовая регистрация
    const { tasks, config } = body as {
      tasks: Array<{
        serviceId: string
        phoneNumber: string
        deviceId: string
      }>
      config?: Partial<MassRegistrationConfig>
    }
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Не указан массив tasks или массив пуст'
      }, { status: 400 })
    }
    
    // Проверяем задачи
    for (const task of tasks) {
      if (!task.serviceId || !task.phoneNumber || !task.deviceId) {
        return NextResponse.json({
          success: false,
          error: 'Каждая задача должна содержать: serviceId, phoneNumber, deviceId'
        }, { status: 400 })
      }
      
      const service = getServiceConfig(task.serviceId)
      if (!service) {
        return NextResponse.json({
          success: false,
          error: `Сервис не найден: ${task.serviceId}`
        }, { status: 400 })
      }
    }
    
    console.log(`[API] Запуск массовой регистрации: ${tasks.length} задач`)
    
    // Запускаем массовую регистрацию
    const results = await runMassRegistration({
      tasks,
      config
    })
    
    // Статистика
    const stats = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      cancelled: results.filter(r => r.status === 'cancelled').length
    }
    
    return NextResponse.json({
      success: stats.success > 0,
      stats,
      results: results.map(r => ({
        id: r.id,
        serviceId: r.serviceId,
        phoneNumber: r.phoneNumber,
        status: r.status,
        error: r.error,
        result: r.result,
        startedAt: r.startedAt,
        completedAt: r.completedAt
      }))
    })
    
  } catch (error) {
    console.error('[API] Registration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
