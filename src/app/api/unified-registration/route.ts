/**
 * API для унифицированной регистрации
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedRegistrationManager, SUPPORTED_PLATFORMS, type Platform } from '@/lib/unified-registration-manager'
import { type EmailProvider } from '@/lib/email-registration-service'

// GET - Получить статус задач
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('taskId')
    
    const manager = getUnifiedRegistrationManager()
    
    if (taskId) {
      const task = manager.getTask(taskId)
      return NextResponse.json({
        success: true,
        task
      })
    }
    
    const tasks = manager.getAllTasks()
    const stats = manager.getStats()
    
    return NextResponse.json({
      success: true,
      tasks,
      stats,
      supportedPlatforms: SUPPORTED_PLATFORMS
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// POST - Создать задачу или запустить массовую регистрацию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    const manager = getUnifiedRegistrationManager()
    
    // Создать одиночную задачу
    if (action === 'create_task') {
      const { 
        platform, 
        phoneNumber, 
        deviceId, 
        emailProvider, 
        useTempEmail,
        username,
        password,
        firstName,
        lastName 
      } = body
      
      const taskId = await manager.createTask({
        platform: platform as Platform,
        phoneNumber,
        deviceId,
        emailProvider: emailProvider as EmailProvider,
        useTempEmail,
        username,
        password,
        firstName,
        lastName
      })
      
      return NextResponse.json({
        success: true,
        taskId,
        message: `Задача на регистрацию ${platform} создана`
      })
    }
    
    // Массовая регистрация
    if (action === 'batch_register') {
      const { 
        platforms, 
        count, 
        phoneNumber, 
        deviceId, 
        emailProvider, 
        useTempEmail 
      } = body
      
      const taskIds = await manager.batchRegister({
        platforms: platforms as Platform[],
        count: count || 1,
        phoneNumber,
        deviceId,
        emailProvider: emailProvider as EmailProvider,
        useTempEmail
      })
      
      return NextResponse.json({
        success: true,
        taskIds,
        message: `Создано ${taskIds.length} задач на регистрацию`
      })
    }
    
    // Запустить обработку
    if (action === 'start_processing') {
      manager.startProcessing()
      return NextResponse.json({
        success: true,
        message: 'Обработка задач запущена'
      })
    }
    
    // Остановить обработку
    if (action === 'stop_processing') {
      manager.stopProcessing()
      return NextResponse.json({
        success: true,
        message: 'Обработка задач остановлена'
      })
    }
    
    // Обработать конкретную задачу
    if (action === 'process_task') {
      const { taskId } = body
      const result = await manager.processTask(taskId)
      
      return NextResponse.json({
        success: result.success,
        ...result
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Неизвестное действие' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
