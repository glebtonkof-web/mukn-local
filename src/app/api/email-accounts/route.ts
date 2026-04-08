/**
 * API для управления почтовыми аккаунтами
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getEmailRegistrationService } from '@/lib/email-registration-service';
import { getTempEmailService } from '@/lib/temp-email-service';

// GET /api/email-accounts - Получить список email аккаунтов
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const service = searchParams.get('service');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (service) {
      const serviceRecord = await db.emailService.findUnique({
        where: { name: service }
      });
      if (serviceRecord) {
        where.serviceId = serviceRecord.id;
      }
    }

    const [accounts, total] = await Promise.all([
      db.emailAccount.findMany({
        where,
        include: {
          EmailService: {
            select: {
              name: true,
              displayName: true,
              domain: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.emailAccount.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      accounts: accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        service: acc.EmailService,
        status: acc.status,
        isVerified: acc.isVerified,
        usedCount: acc.usedCount,
        createdAt: acc.createdAt,
        lastLoginAt: acc.lastLoginAt
      })),
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения списка аккаунтов' },
      { status: 500 }
    );
  }
}

// POST /api/email-accounts - Создать новый email аккаунт
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Создание временного email
    if (action === 'create_temp') {
      const tempService = getTempEmailService();
      const email = await tempService.createEmail();
      
      return NextResponse.json({
        success: true,
        email,
        message: 'Временный email создан'
      });
    }

    // Добавление в очередь регистрации
    if (action === 'queue_registration') {
      const { provider, firstName, lastName, customUsername, customPassword, priority } = body;
      
      const emailService = getEmailRegistrationService();
      const jobId = await emailService.addToQueue({
        provider,
        firstName,
        lastName,
        customUsername,
        customPassword,
        priority
      });

      return NextResponse.json({
        success: true,
        jobId,
        message: `Задача на регистрацию ${provider} добавлена в очередь`
      });
    }

    // Регистрация email (синхронная)
    if (action === 'register') {
      const { provider, firstName, lastName, customUsername, customPassword, phoneNumber, deviceId } = body;
      
      const emailService = getEmailRegistrationService();
      const result = await emailService.registerEmail({
        provider,
        firstName,
        lastName,
        customUsername,
        customPassword,
        phoneNumber,
        deviceId
      });

      return NextResponse.json({
        success: result.success,
        email: result.email,
        password: result.password,
        accountId: result.accountId,
        error: result.error,
        requiresManualAction: result.requiresManualAction,
        manualActionType: result.manualActionType
      });
    }

    // Обработка очереди
    if (action === 'process_queue') {
      const { limit = 5 } = body;
      const emailService = getEmailRegistrationService();
      
      await emailService.processQueue(limit);

      return NextResponse.json({
        success: true,
        message: `Обработано ${limit} задач из очереди`
      });
    }

    // Получить доступный email для использования
    if (action === 'get_available') {
      const { service } = body;
      const emailService = getEmailRegistrationService();
      
      const available = await emailService.getAvailableEmail(service);

      return NextResponse.json({
        success: true,
        account: available
      });
    }

    // Инициализация сервисов
    if (action === 'init_services') {
      const emailService = getEmailRegistrationService();
      await emailService.initializeServices();

      return NextResponse.json({
        success: true,
        message: 'Сервисы инициализированы'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Неизвестное действие' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in email accounts API:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/email-accounts - Обновить email аккаунт
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes, tags } = body;

    const updateData: any = { updatedAt: new Date() };
    
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (tags) updateData.tags = JSON.stringify(tags);

    const account = await db.emailAccount.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      account
    });
  } catch (error) {
    console.error('Error updating email account:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления аккаунта' },
      { status: 500 }
    );
  }
}

// DELETE /api/email-accounts - Удалить email аккаунт
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID не указан' },
        { status: 400 }
      );
    }

    await db.emailAccount.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Аккаунт удалён'
    });
  } catch (error) {
    console.error('Error deleting email account:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка удаления аккаунта' },
      { status: 500 }
    );
  }
}
