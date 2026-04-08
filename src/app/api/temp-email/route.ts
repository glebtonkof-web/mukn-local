/**
 * API для работы с временной почтой
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTempEmailService } from '@/lib/temp-email-service';

/**
 * GET - Проверить сообщения
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'email parameter is required'
      }, { status: 400 });
    }

    const service = getTempEmailService();
    const messages = await service.checkMessages(email);

    return NextResponse.json({
      success: true,
      email,
      messages,
      count: messages.length
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Создать временный email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forPurpose, forId, waitForCode } = body;

    const service = getTempEmailService();
    const email = await service.createEmail(forPurpose, forId);

    // Если нужно сразу ждать код
    if (waitForCode) {
      const code = await service.waitForCode(email, {
        timeout: waitForCode.timeout || 300000,
        pattern: waitForCode.pattern ? new RegExp(waitForCode.pattern) : undefined,
        fromContains: waitForCode.fromContains
      });

      return NextResponse.json({
        success: true,
        email,
        code
      });
    }

    return NextResponse.json({
      success: true,
      email
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE - Удалить временный email
 */
export async function DELETE(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'email is required'
      }, { status: 400 });
    }

    const service = getTempEmailService();
    await service.deleteEmail(email);

    return NextResponse.json({
      success: true,
      message: `Email ${email} удалён`
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
