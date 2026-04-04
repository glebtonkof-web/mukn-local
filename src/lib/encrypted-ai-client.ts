// Шифрование переписки с AI (AES-256-GCM)
// Все запросы и ответы шифруются end-to-end

import crypto from 'crypto';
import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface EncryptedAIClientConfig {
  encryptionKey?: string; // Если не указан, генерируется автоматически
  algorithm: string;
  keyLength: number;
  ivLength: number;
  authTagLength: number;
  keyRotationInterval: number; // ms
}

export interface EncryptedMessage {
  iv: string; // base64
  authTag: string; // base64
  encrypted: string; // base64
  timestamp: number;
  keyId: string;
}

export interface EncryptionStats {
  totalEncrypted: number;
  totalDecrypted: number;
  keyRotations: number;
  lastKeyRotation: Date | null;
  currentKeyId: string;
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: EncryptedAIClientConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 бит
  ivLength: 16, // 128 бит
  authTagLength: 16,
  keyRotationInterval: 24 * 60 * 60 * 1000, // 24 часа
};

// ==================== ENCRYPTED AI CLIENT ====================

class EncryptedAIClientService extends EventEmitter {
  private config: EncryptedAIClientConfig;
  private currentKey: Buffer;
  private currentKeyId: string;
  private keyHistory: Map<string, Buffer> = new Map();
  private stats: EncryptionStats;
  private keyRotationTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<EncryptedAIClientConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Инициализация ключа
    if (this.config.encryptionKey) {
      this.currentKey = this.deriveKey(this.config.encryptionKey);
    } else {
      this.currentKey = crypto.randomBytes(this.config.keyLength);
    }
    
    this.currentKeyId = this.generateKeyId();
    this.keyHistory.set(this.currentKeyId, this.currentKey);
    
    this.stats = {
      totalEncrypted: 0,
      totalDecrypted: 0,
      keyRotations: 0,
      lastKeyRotation: null,
      currentKeyId: this.currentKeyId,
    };

    // Автоматическая ротация ключей
    this.startKeyRotation();
  }

  // Генерация ID ключа
  private generateKeyId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  // derive key from password
  private deriveKey(password: string): Buffer {
    return crypto.pbkdf2Sync(
      password,
      'mukn-traffic-salt', // Salt
      100000, // Iterations
      this.config.keyLength,
      'sha256'
    );
  }

  // Запуск автоматической ротации ключей
  private startKeyRotation(): void {
    this.keyRotationTimer = setInterval(() => {
      this.rotateKey();
    }, this.config.keyRotationInterval);
  }

  // Ротация ключа
  rotateKey(): void {
    const newKey = crypto.randomBytes(this.config.keyLength);
    const newKeyId = this.generateKeyId();
    
    // Сохраняем старый ключ для расшифровки
    this.keyHistory.set(this.currentKeyId, this.currentKey);
    
    // Устанавливаем новый ключ
    this.currentKey = newKey;
    this.currentKeyId = newKeyId;
    this.keyHistory.set(newKeyId, newKey);
    
    // Ограничиваем историю ключей (хранить не более 10 старых ключей)
    if (this.keyHistory.size > 11) {
      const oldestKey = this.keyHistory.keys().next().value;
      if (oldestKey !== this.currentKeyId) {
        this.keyHistory.delete(oldestKey);
      }
    }
    
    this.stats.keyRotations++;
    this.stats.lastKeyRotation = new Date();
    this.stats.currentKeyId = newKeyId;
    
    this.emit('key:rotated', { keyId: newKeyId });
    console.log(`[EncryptedAI] Key rotated: ${newKeyId}`);
  }

  // Шифрование сообщения
  encrypt(plaintext: string): EncryptedMessage {
    const iv = crypto.randomBytes(this.config.ivLength);
    
    const cipher = crypto.createCipheriv(
      this.config.algorithm,
      this.currentKey,
      iv,
      { authTagLength: this.config.authTagLength }
    );
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    this.stats.totalEncrypted++;
    
    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encrypted,
      timestamp: Date.now(),
      keyId: this.currentKeyId,
    };
  }

  // Расшифровка сообщения
  decrypt(message: EncryptedMessage): string {
    // Находим нужный ключ по ID
    const key = this.keyHistory.get(message.keyId);
    if (!key) {
      throw new Error(`Decryption key not found for keyId: ${message.keyId}`);
    }
    
    const iv = Buffer.from(message.iv, 'base64');
    const authTag = Buffer.from(message.authTag, 'base64');
    
    const decipher = crypto.createDecipheriv(
      this.config.algorithm,
      key,
      iv,
      { authTagLength: this.config.authTagLength }
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(message.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    this.stats.totalDecrypted++;
    
    return decrypted;
  }

  // Отправка зашифрованного запроса к AI
  async ask(
    prompt: string,
    executor: (encryptedPrompt: string) => Promise<string>
  ): Promise<string> {
    // Шифруем промпт
    const encryptedMessage = this.encrypt(prompt);
    const encryptedPayload = JSON.stringify(encryptedMessage);
    
    // Отправляем зашифрованный запрос
    const encryptedResponse = await executor(encryptedPayload);
    
    // Расшифровываем ответ
    const responseMessage: EncryptedMessage = JSON.parse(encryptedResponse);
    return this.decrypt(responseMessage);
  }

  // Безопасное шифрование для хранения
  encryptForStorage(data: object): string {
    const plaintext = JSON.stringify(data);
    const encrypted = this.encrypt(plaintext);
    return JSON.stringify(encrypted);
  }

  // Безопасное расшифрование из хранилища
  decryptFromStorage<T>(encryptedData: string): T {
    const message: EncryptedMessage = JSON.parse(encryptedData);
    const decrypted = this.decrypt(message);
    return JSON.parse(decrypted);
  }

  // Хеширование данных (одностороннее)
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // HMAC для проверки целостности
  createHmac(data: string): string {
    return crypto.createHmac('sha256', this.currentKey).update(data).digest('hex');
  }

  // Проверка HMAC
  verifyHmac(data: string, hmac: string): boolean {
    const computed = this.createHmac(data);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
  }

  // Получение статистики
  getStats(): EncryptionStats {
    return { ...this.stats };
  }

  // Получение текущего ID ключа
  getCurrentKeyId(): string {
    return this.currentKeyId;
  }

  // Экспорт ключа (для бэкапа)
  exportKey(): { keyId: string; key: string } {
    return {
      keyId: this.currentKeyId,
      key: this.currentKey.toString('base64'),
    };
  }

  // Импорт ключа
  importKey(keyId: string, keyBase64: string): void {
    const key = Buffer.from(keyBase64, 'base64');
    this.keyHistory.set(keyId, key);
    this.emit('key:imported', { keyId });
  }

  // Остановка сервиса
  stop(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
      this.keyRotationTimer = null;
    }
  }
}

// ==================== SINGLETON ====================

let encryptedClientInstance: EncryptedAIClientService | null = null;

export function getEncryptedAIClient(config?: Partial<EncryptedAIClientConfig>): EncryptedAIClientService {
  if (!encryptedClientInstance) {
    encryptedClientInstance = new EncryptedAIClientService(config);
  }
  return encryptedClientInstance;
}

export const encryptedAI = {
  encrypt: (plaintext: string) => getEncryptedAIClient().encrypt(plaintext),
  decrypt: (message: EncryptedMessage) => getEncryptedAIClient().decrypt(message),
  ask: (prompt: string, executor: (p: string) => Promise<string>) => 
    getEncryptedAIClient().ask(prompt, executor),
  encryptForStorage: (data: object) => getEncryptedAIClient().encryptForStorage(data),
  decryptFromStorage: <T>(data: string) => getEncryptedAIClient().decryptFromStorage<T>(data),
  hash: (data: string) => getEncryptedAIClient().hash(data),
  createHmac: (data: string) => getEncryptedAIClient().createHmac(data),
  verifyHmac: (data: string, hmac: string) => getEncryptedAIClient().verifyHmac(data, hmac),
  getStats: () => getEncryptedAIClient().getStats(),
  rotateKey: () => getEncryptedAIClient().rotateKey(),
};
