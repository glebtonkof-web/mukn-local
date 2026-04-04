import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/monetization/white-label - Получить информацию о White Label
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseeId = searchParams.get('licenseeId');

    if (licenseeId) {
      const license = await db.whiteLabelLicense.findFirst({
        where: { licenseeId },
        include: {
          WhiteLabelPayment: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
      return NextResponse.json({ success: true, license });
    }

    // Общая статистика White Label
    const licenses = await db.whiteLabelLicense.findMany();

    return NextResponse.json({
      success: true,
      info: {
        licenseFee: 5000,
        royaltyRate: 0.10,
        features: [
          'Полный клон софта под вашим брендом',
          'Кастомный домен и логотип',
          'Настройка цветовой схемы',
          'Техподдержка 24/7',
          'Автоматические обновления',
          '10% роялти с прибыли ваших клиентов',
        ],
        stats: {
          totalLicenses: licenses.length,
          avgLicenseeROI: 340,
        },
      },
      licenses: licenses.slice(0, 10),
    });
  } catch (error) {
    console.error('Error fetching white-label:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch white-label info' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/white-label - Создать запрос на White Label
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      licenseeId,
      licenseeName,
      brandName,
      customDomain,
      customLogo,
      customColors,
    } = body;

    // Проверяем существование лицензии
    const existing = await db.whiteLabelLicense.findFirst({
      where: { licenseeId },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'License already exists',
        license: existing,
      });
    }

    // Создаём лицензию
    const license = await db.whiteLabelLicense.create({
      data: {
        id: nanoid(),
        licenseeId,
        licenseeName,
        brandName,
        customDomain,
        customLogo,
        customColors: customColors ? JSON.stringify(customColors) : null,
        licenseFee: 5000,
        royaltyRate: 0.10,
        status: 'pending_payment',
        updatedAt: new Date(),
      },
    });

    // Создаём платёж
    await db.whiteLabelPayment.create({
      data: {
        id: nanoid(),
        licenseId: license.id,
        amount: 5000,
        type: 'license',
      },
    });

    return NextResponse.json({
      success: true,
      license,
      message: 'Запрос на White Label создан. Ожидает оплаты $5000',
      paymentLink: `/payment/white-label/${license.id}`,
    });
  } catch (error) {
    console.error('Error creating white-label:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create white-label request' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/white-label - Активировать лицензию после оплаты
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseId } = body;

    const license = await db.whiteLabelLicense.update({
      where: { id: licenseId },
      data: {
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      license,
      message: 'White Label лицензия активирована!',
      setupInstructions: [
        '1. Настройте DNS записи для вашего домена',
        '2. Загрузите логотип через админ-панель',
        '3. Настройте цветовую схему',
        '4. Интегрируйте платёжную систему',
        '5. Запустите продвижение',
      ],
    });
  } catch (error) {
    console.error('Error activating white-label:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to activate license' },
      { status: 500 }
    );
  }
}
