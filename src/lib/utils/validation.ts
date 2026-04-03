/**
 * Утилиты для валидации данных
 */

// Валидация email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Валидация телефона
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{10,14}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

// Валидация username Telegram
export function isValidTelegramUsername(username: string): boolean {
  const usernameRegex = /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
  return usernameRegex.test(username);
}

// Валидация URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Валидация API ID Telegram
export function isValidApiId(apiId: string | number): boolean {
  const id = typeof apiId === 'string' ? parseInt(apiId, 10) : apiId;
  return !isNaN(id) && id > 0 && id < 2147483647;
}

// Валидация API Hash Telegram
export function isValidApiHash(hash: string): boolean {
  return /^[a-f0-9]{32}$/i.test(hash);
}

// Валидация пароля
export function isStrongPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Минимум 8 символов');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Минимум одна строчная буква');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Минимум одна заглавная буква');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Минимум одна цифра');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Минимум один специальный символ');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Валидация возраста
export function isValidAge(age: number): boolean {
  return age >= 18 && age <= 100;
}

// Валидация риска бана (0-100)
export function isValidBanRisk(risk: number): boolean {
  return risk >= 0 && risk <= 100;
}

// Валидация суммы
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && amount >= 0 && amount < 1000000000;
}

// Очистка номера телефона
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

// Форматирование номера телефона
export function formatPhoneNumber(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.startsWith('8')) {
    return '+7' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  return cleaned;
}
