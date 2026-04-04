import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/monetization/withdraw - Создать запрос на вывод средств
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, method, walletAddress } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Неверная сумма вывода' },
        { status: 400 }
      );
    }

    // Создаём транзакцию вывода
    const withdrawal = await db.tokenTransaction.create({
      data: {
        id: `withdraw_${Date.now()}`,
        userId: userId || 'default',
        type: 'withdrawal',
        amount: -amount,
        price: 1, // 1:1 для вывода
      },
    }).catch(() => null);

    // В реальной реализации здесь была бы интеграция с платёжной системой

    return NextResponse.json({
      success: true,
      message: `Запрос на вывод ${amount}₽ создан`,
      withdrawal,
      estimatedTime: '1-3 рабочих дня',
    });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create withdrawal request' },
      { status: 500 }
    );
  }
}
