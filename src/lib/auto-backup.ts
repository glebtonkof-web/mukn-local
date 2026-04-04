// Авто-бэкап базы данных каждые 5 минут
// Сжатие GZIP, ротация по количеству и размеру

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import zlib from 'zlib';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);
const gzip = promisify(zlib.gzip);

// ==================== КОНФИГУРАЦИЯ ====================

export interface BackupConfig {
  interval: number; // ms - интервал между бэкапами
  maxBackups: number; // максимальное количество хранимых бэкапов
  maxTotalSize: number; // bytes - максимальный общий размер бэкапов
  backupDir: string; // директория для бэкапов
  dbPath: string; // путь к файлу БД
  compress: boolean; // сжимать ли бэкапы
  retentionDays: number; // дней хранения
}

const DEFAULT_CONFIG: BackupConfig = {
  interval: 5 * 60 * 1000, // 5 минут
  maxBackups: 100,
  maxTotalSize: 10 * 1024 * 1024 * 1024, // 10 GB
  backupDir: 'backups',
  dbPath: 'db/custom.db',
  compress: true,
  retentionDays: 30,
};

// ==================== МЕТРИКИ БЭКАПА ====================

export interface BackupMetrics {
  totalBackups: number;
  totalSize: number;
  lastBackupAt: Date | null;
  lastBackupSize: number;
  lastBackupDuration: number; // ms
  failedBackups: number;
  oldestBackup: Date | null;
  newestBackup: Date | null;
}

// ==================== СЕРВИС АВТО-БЭКАПА ====================

class AutoBackupService extends EventEmitter {
  private config: BackupConfig;
  private backupTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private metrics: BackupMetrics = {
    totalBackups: 0,
    totalSize: 0,
    lastBackupAt: null,
    lastBackupSize: 0,
    lastBackupDuration: 0,
    failedBackups: 0,
    oldestBackup: null,
    newestBackup: null,
  };

  constructor(config: Partial<BackupConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureBackupDir();
  }

  // Создать директорию для бэкапов
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  // Запустить автоматический бэкап
  start(): void {
    if (this.isRunning) {
      console.log('[Backup] Service already running');
      return;
    }

    console.log(`[Backup] Starting auto-backup service (interval: ${this.config.interval / 1000}s)`);
    this.isRunning = true;

    // Немедленный бэкап при старте
    this.performBackup();

    // Периодический бэкап
    this.backupTimer = setInterval(() => {
      this.performBackup();
    }, this.config.interval);
  }

  // Остановить автоматический бэкап
  stop(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    this.isRunning = false;
    console.log('[Backup] Service stopped');
  }

  // Выполнить бэкап
  async performBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.db`;
    const backupPath = path.join(this.config.backupDir, backupFileName);

    console.log(`[Backup] Starting backup: ${backupFileName}`);

    try {
      // Проверяем существование БД
      if (!fs.existsSync(this.config.dbPath)) {
        throw new Error(`Database file not found: ${this.config.dbPath}`);
      }

      // Копируем файл БД
      const dbStats = fs.statSync(this.config.dbPath);
      const dbSize = dbStats.size;

      // Используем SQLite dump для консистентного бэкапа
      if (this.config.dbPath.endsWith('.db')) {
        await this.sqliteBackup(backupPath);
      } else {
        // Прямое копирование для других типов БД
        fs.copyFileSync(this.config.dbPath, backupPath);
      }

      // Сжимаем бэкап
      let finalPath = backupPath;
      let finalSize: number;

      if (this.config.compress) {
        finalPath = await this.compressBackup(backupPath);
        finalSize = fs.statSync(finalPath).size;
        fs.unlinkSync(backupPath); // удаляем несжатый файл
      } else {
        finalSize = fs.statSync(backupPath).size;
      }

      const duration = Date.now() - startTime;

      // Обновляем метрики
      this.metrics.totalBackups++;
      this.metrics.lastBackupAt = new Date();
      this.metrics.lastBackupSize = finalSize;
      this.metrics.lastBackupDuration = duration;
      this.updateSizeMetrics();

      // Очищаем старые бэкапы
      await this.cleanupOldBackups();

      console.log(`[Backup] Backup completed: ${path.basename(finalPath)} (${this.formatSize(finalSize)}, ${duration}ms)`);

      this.emit('backup:completed', {
        path: finalPath,
        size: finalSize,
        duration,
        originalSize: dbSize,
      });

      return { success: true, path: finalPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Backup] Backup failed:`, errorMessage);
      this.metrics.failedBackups++;

      this.emit('backup:failed', { error: errorMessage });

      return { success: false, error: errorMessage };
    }
  }

  // SQLite-специфичный бэкап
  private async sqliteBackup(backupPath: string): Promise<void> {
    // Используем .backup команду SQLite для консистентного бэкапа
    try {
      await execAsync(`sqlite3 "${this.config.dbPath}" ".backup '${backupPath}'"`);
    } catch {
      // Fallback: простое копирование
      fs.copyFileSync(this.config.dbPath, backupPath);
    }
  }

  // Сжатие бэкапа
  private async compressBackup(backupPath: string): Promise<string> {
    const compressedPath = `${backupPath}.gz`;
    const data = fs.readFileSync(backupPath);
    const compressed = await gzip(data);
    fs.writeFileSync(compressedPath, compressed);
    return compressedPath;
  }

  // Обновить метрики размера
  private updateSizeMetrics(): void {
    const files = this.getBackupFiles();
    this.metrics.totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    if (files.length > 0) {
      this.metrics.oldestBackup = files[0].date;
      this.metrics.newestBackup = files[files.length - 1].date;
    }
  }

  // Получить список файлов бэкапов
  private getBackupFiles(): Array<{ path: string; size: number; date: Date }> {
    if (!fs.existsSync(this.config.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(this.config.backupDir)
      .filter(f => f.startsWith('backup_') && (f.endsWith('.db') || f.endsWith('.db.gz')))
      .map(f => {
        const filePath = path.join(this.config.backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          path: filePath,
          size: stats.size,
          date: stats.mtime,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return files;
  }

  // Очистка старых бэкапов
  private async cleanupOldBackups(): Promise<void> {
    const files = this.getBackupFiles();
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    let deletedSize = 0;

    // Удаляем по возрасту
    for (const file of files) {
      if (now - file.date.getTime() > retentionMs) {
        fs.unlinkSync(file.path);
        deletedCount++;
        deletedSize += file.size;
        console.log(`[Backup] Deleted old backup: ${path.basename(file.path)}`);
      }
    }

    // Удаляем по количеству
    const remainingFiles = this.getBackupFiles();
    if (remainingFiles.length > this.config.maxBackups) {
      const toDelete = remainingFiles.slice(0, remainingFiles.length - this.config.maxBackups);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        deletedCount++;
        deletedSize += file.size;
        console.log(`[Backup] Deleted excess backup: ${path.basename(file.path)}`);
      }
    }

    // Удаляем по общему размеру
    let remainingFilesAfterCount = this.getBackupFiles();
    let totalSize = remainingFilesAfterCount.reduce((sum, f) => sum + f.size, 0);

    while (totalSize > this.config.maxTotalSize && remainingFilesAfterCount.length > 1) {
      const oldest = remainingFilesAfterCount.shift()!;
      fs.unlinkSync(oldest.path);
      totalSize -= oldest.size;
      deletedCount++;
      deletedSize += oldest.size;
      console.log(`[Backup] Deleted backup (size limit): ${path.basename(oldest.path)}`);
    }

    if (deletedCount > 0) {
      this.emit('backup:cleaned', { deletedCount, deletedSize });
    }

    this.updateSizeMetrics();
  }

  // Восстановить из бэкапа
  async restore(backupPath: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[Backup] Restoring from: ${backupPath}`);

    try {
      // Проверяем существование бэкапа
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Создаём бэкап текущей БД перед восстановлением
      const currentDbExists = fs.existsSync(this.config.dbPath);
      if (currentDbExists) {
        const preRestoreBackup = `${this.config.dbPath}.pre-restore-${Date.now()}`;
        fs.copyFileSync(this.config.dbPath, preRestoreBackup);
        console.log(`[Backup] Created pre-restore backup: ${preRestoreBackup}`);
      }

      // Если бэкап сжат - распаковываем
      let sourcePath = backupPath;
      if (backupPath.endsWith('.gz')) {
        const uncompressedPath = backupPath.replace('.gz', '');
        const data = fs.readFileSync(backupPath);
        const uncompressed = zlib.gunzipSync(data);
        fs.writeFileSync(uncompressedPath, uncompressed);
        sourcePath = uncompressedPath;
      }

      // Восстанавливаем
      fs.copyFileSync(sourcePath, this.config.dbPath);

      // Удаляем временный распакованный файл
      if (sourcePath !== backupPath) {
        fs.unlinkSync(sourcePath);
      }

      console.log(`[Backup] Restore completed successfully`);
      this.emit('backup:restored', { path: backupPath });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Backup] Restore failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Получить список доступных бэкапов
  listBackups(): Array<{
    path: string;
    name: string;
    size: number;
    sizeFormatted: string;
    date: Date;
    compressed: boolean;
  }> {
    return this.getBackupFiles().map(f => ({
      path: f.path,
      name: path.basename(f.path),
      size: f.size,
      sizeFormatted: this.formatSize(f.size),
      date: f.date,
      compressed: f.path.endsWith('.gz'),
    }));
  }

  // Получить метрики
  getMetrics(): BackupMetrics {
    return { ...this.metrics };
  }

  // Форматирование размера
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // Статус сервиса
  getStatus(): {
    running: boolean;
    interval: number;
    nextBackupIn: number | null;
  } {
    return {
      running: this.isRunning,
      interval: this.config.interval,
      nextBackupIn: this.backupTimer ? this.config.interval : null,
    };
  }
}

// ==================== SINGLETON ====================

let backupInstance: AutoBackupService | null = null;

export function getAutoBackup(config?: Partial<BackupConfig>): AutoBackupService {
  if (!backupInstance) {
    backupInstance = new AutoBackupService(config);
  }
  return backupInstance;
}

export const autoBackup = {
  start: () => getAutoBackup().start(),
  stop: () => getAutoBackup().stop(),
  performBackup: () => getAutoBackup().performBackup(),
  restore: (path: string) => getAutoBackup().restore(path),
  listBackups: () => getAutoBackup().listBackups(),
  getMetrics: () => getAutoBackup().getMetrics(),
  getStatus: () => getAutoBackup().getStatus(),
};
