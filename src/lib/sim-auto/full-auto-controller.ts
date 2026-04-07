/**
 * МУКН SIM Auto-Registration - Full Auto Controller
 * One-button automation for complete SIM registration and monetization workflow
 * FULLY INTEGRATED - NO MOCKS OR STUBS
 */

import { 
  listDevices, 
  connectDevice, 
  getDeviceInfo, 
  readSimSlots,
  executeCommand,
  type AdbDevice,
  type SimCardSlot
} from './adb-client';
import type { DeviceInfo } from './types';
import { 
  detectAllSimCards, 
  getSimCardStats,
  onScanProgress,
  type SimCardInfo,
  type ScanProgress
} from './sim-scanner';
import { 
  startSmsListener, 
  stopSmsListener, 
  waitForCode, 
  startVerification,
  setWaitingForCode,
  completeVerification,
  type VerificationResult
} from './sms-reader';
// Import improved modules
import { 
  detectAllSimCards as detectAllSimCardsImproved,
  type DetectedSimCard
} from './improved-sim-scanner';
import { 
  startSmsMonitoring,
  waitForVerificationCode,
  type VerificationCode
} from './improved-sms-reader';
import { 
  runRegistration as runRegistrationImproved,
  type RegistrationResult
} from './improved-registration';
import { 
  registrationManager, 
  type RegistrationJob, 
  type RegistrationStatus,
  type PlatformRegistrationConfig
} from './registration-manager';
import { 
  startWarming, 
  stopWarming, 
  getWarmingStatus, 
  getActiveWarmingSessions,
  type WarmingStatus,
  type WarmingConfig
} from './warming-manager';
import { 
  rankSchemes, 
  getQuickRecommendations,
  type RankedScheme,
  type SimCardAccountInfo
} from './scheme-ranker';
import { 
  MONETIZATION_SCHEMES, 
  type MonetizationSchemeDefinition
} from './schemes-library';
import type { Platform } from './session-manager';
import { profitExecutor, type Scheme } from './profit-executor';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Types
export interface SimCard {
  id: string;
  phoneNumber: string;
  operator: string;
  country: string;
  status: 'available' | 'in_use' | 'registered' | 'error' | 'warming';
  registeredPlatforms: string[];
  balance: number;
  detectedAt: Date;
  deviceId?: string;
  slotIndex?: number;
}

export interface FullAutoProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  percentComplete: number;
  estimatedTimeRemaining: number; // seconds
  startedAt: Date;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  message: string;
  details: {
    simsDetected: number;
    registrationsCompleted: number;
    registrationsFailed: number;
    warmingStarted: number;
    schemesApplied: number;
    revenue: number;
    errors: string[];
  };
}

export interface FullAutoConfig {
  platforms?: Platform[];
  maxRegistrationsPerSim?: number;
  warmingDays?: number;
  schemesCount?: number;
  autoStartEarning?: boolean;
  skipRegistration?: boolean;
  skipWarming?: boolean;
  phoneNumbers?: Record<string, string>; // Manually entered phone numbers
  proxyConfig?: {
    enabled: boolean;
    type: 'http' | 'https' | 'socks5';
    host?: string;
    port?: number;
  };
}

// In-memory storage
const simStore = new Map<string, SimCard>();
const registrationQueue: RegistrationJob[] = [];
const warmingJobs = new Map<string, WarmingStatus>();

let currentProgress: FullAutoProgress = {
  step: 0,
  totalSteps: 7,
  currentStep: 'Ожидание запуска',
  percentComplete: 0,
  estimatedTimeRemaining: 0,
  startedAt: new Date(),
  status: 'idle',
  message: '',
  details: {
    simsDetected: 0,
    registrationsCompleted: 0,
    registrationsFailed: 0,
    warmingStarted: 0,
    schemesApplied: 0,
    revenue: 0,
    errors: [],
  },
};

let autoRunning = false;
let autoPaused = false;
let abortController: AbortController | null = null;
let currentConfig: FullAutoConfig = {};

// Progress callback type
type ProgressCallback = (progress: FullAutoProgress) => void;
const progressCallbacks = new Set<ProgressCallback>();

/**
 * Subscribe to progress updates
 */
export function subscribeToProgress(callback: ProgressCallback): () => void {
  progressCallbacks.add(callback);
  return () => progressCallbacks.delete(callback);
}

/**
 * Notify all subscribers of progress update
 */
function notifyProgress(): void {
  for (const callback of progressCallbacks) {
    callback(currentProgress);
  }
}

/**
 * Update progress state
 */
function updateProgress(
  step: number,
  stepName: string,
  percent: number,
  message: string
): void {
  currentProgress = {
    ...currentProgress,
    step,
    currentStep: stepName,
    percentComplete: percent,
    message,
    status: autoPaused ? 'paused' : 'running',
  };
  notifyProgress();
}

/**
 * Add error to progress
 */
function addError(error: string): void {
  currentProgress.details.errors.push(error);
  logger.error('[FullAuto]', new Error(error));
}

/**
 * REAL SIM Card Scanner - uses ADB to detect connected devices and SIM cards
 * Uses improved scanner for better dual-SIM detection
 */
export async function scanSimCards(): Promise<SimCard[]> {
  logger.info('[FullAuto] Starting SIM card scan...');
  
  try {
    // First try the improved scanner for better dual-SIM detection
    let simCards: DetectedSimCard[] = [];
    
    try {
      simCards = await detectAllSimCardsImproved();
      logger.info(`[FullAuto] Improved scanner found ${simCards.length} SIM cards`);
    } catch (improvedError) {
      logger.warn('[FullAuto] Improved scanner failed, falling back to standard scanner', { error: String(improvedError) });
    }
    
    // Fallback to standard scanner if improved found nothing
    if (simCards.length === 0) {
      const scanResult = await detectAllSimCards();
      
      if (!scanResult.success) {
        throw new Error('SIM scan failed: ' + scanResult.errors.map(e => e.error).join(', '));
      }
      
      // Convert to DetectedSimCard format
      simCards = scanResult.simCards.map(sim => ({
        id: `${sim.deviceId}_${sim.slotIndex}`,
        deviceId: sim.deviceId,
        slotIndex: sim.slotIndex,
        phoneNumber: sim.phoneNumber || '',
        operator: sim.operator || 'Unknown',
        country: sim.countryCode || 'XX',
        mcc: '',
        mnc: '',
        iccid: '',
        isActive: sim.isActive,
        networkType: '',
        isRoaming: false
      }));
    }
    
    // Clear and populate store
    simStore.clear();
    
    for (const simInfo of simCards) {
      if (!simInfo.isActive) continue;
      
      const sim: SimCard = {
        id: simInfo.id,
        phoneNumber: simInfo.phoneNumber || '',
        operator: simInfo.operator || 'Unknown',
        country: simInfo.country || 'XX',
        status: 'available',
        registeredPlatforms: [],
        balance: 0,
        detectedAt: new Date(),
        deviceId: simInfo.deviceId,
        slotIndex: simInfo.slotIndex,
      };
      
      simStore.set(sim.id, sim);
    }
    
    logger.info(`[FullAuto] Detected ${simStore.size} active SIM cards`);
    return Array.from(simStore.values());
    
  } catch (error) {
    logger.error('[FullAuto] SIM scan error:', error as Error);
    throw error;
  }
}

/**
 * REAL Platform Account Checker
 */
export async function checkExistingPlatformAccounts(
  phoneNumber: string,
  platforms: Platform[]
): Promise<Map<Platform, boolean>> {
  const results = new Map<Platform, boolean>();
  
  try {
    // Check database for existing accounts
    const existingAccounts = await db.simCardAccount.findMany({
      where: {
        phoneNumber,
        platform: { in: platforms }
      }
    });
    
    for (const platform of platforms) {
      const exists = existingAccounts.some(
        a => a.platform.toLowerCase() === platform.toLowerCase()
      );
      results.set(platform, exists);
    }
    
  } catch (error) {
    logger.error('[FullAuto] Error checking existing accounts:', error as Error);
    // Default to false on error
    for (const platform of platforms) {
      results.set(platform, false);
    }
  }
  
  return results;
}

/**
 * Calculate registration plan based on available SIMs
 */
export async function calculateRegistrationPlan(
  sims: SimCard[],
  config: FullAutoConfig = {}
): Promise<RegistrationJob[]> {
  // Use the session-manager Platform type
  const defaultPlatforms: import('./session-manager').Platform[] = [
    'telegram', 'instagram', 'tiktok', 'twitter', 'youtube', 
    'whatsapp', 'viber', 'signal', 'discord', 'reddit'
  ];
  const platforms = (config.platforms || defaultPlatforms) as import('./session-manager').Platform[];
  
  const jobs: RegistrationJob[] = [];
  const maxPerSim = config.maxRegistrationsPerSim || 3;
  
  for (const sim of sims) {
    if (!sim.phoneNumber) continue;
    
    // Check which platforms already have accounts for this phone
    const existingAccounts = await checkExistingPlatformAccounts(sim.phoneNumber, platforms);
    
    // Get platforms that don't have accounts yet
    const availablePlatforms = platforms.filter(p => !existingAccounts.get(p));
    
    // Limit platforms per SIM
    const platformsToRegister = availablePlatforms.slice(0, maxPerSim);
    
    for (const platform of platformsToRegister) {
      // Check platform limit
      const limitCheck = await registrationManager.checkPlatformLimit(sim.id, platform);
      
      if (limitCheck.allowed) {
        jobs.push({
          id: `job_${sim.id}_${platform}_${Date.now()}`,
          simCardId: sim.id,
          platform,
          phoneNumber: sim.phoneNumber,
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }
  
  registrationQueue.length = 0;
  registrationQueue.push(...jobs);
  
  logger.info(`[FullAuto] Created ${jobs.length} registration jobs for ${sims.length} SIMs`);
  return jobs;
}

/**
 * REAL Account Registration with SMS Verification
 * Uses improved registration module with enhanced anti-bot detection
 */
export async function registerAccount(job: RegistrationJob): Promise<RegistrationJob> {
  logger.info(`[FullAuto] Registering ${job.platform} for ${job.phoneNumber}`);
  
  job.status = 'registering';
  job.startedAt = new Date();
  job.updatedAt = new Date();
  
  // Extract device ID from simCardId
  const deviceId = job.simCardId.split('_')[0] || '';
  
  try {
    // First try the improved registration module
    let result: RegistrationResult;
    
    try {
      result = await runRegistrationImproved({
        platform: job.platform,
        phoneNumber: job.phoneNumber,
        deviceId: deviceId,
        profile: {
          username: job.profileData?.username,
          email: job.profileData?.email,
          firstName: job.profileData?.firstName,
          lastName: job.profileData?.lastName
        }
      });
      
      logger.info(`[FullAuto] Improved registration result: ${result.success ? 'success' : result.error}`);
    } catch (improvedError) {
      logger.warn('[FullAuto] Improved registration failed, falling back to standard', { error: String(improvedError) });
      
      // Fallback to standard registration manager
      const fallbackResult = await registrationManager.registerAccount(
        job.platform,
        job.phoneNumber,
        job.simCardId
      );
      
      result = {
        success: fallbackResult.success,
        error: fallbackResult.error,
        username: fallbackResult.username
      };
    }
    
    if (result.success) {
      job.status = 'completed';
      job.username = result.username;
      job.completedAt = new Date();
      
      // Update SIM card status
      const sim = simStore.get(job.simCardId);
      if (sim) {
        sim.registeredPlatforms.push(job.platform);
        sim.status = 'registered';
        simStore.set(sim.id, sim);
      }
      
      logger.info(`[FullAuto] Successfully registered ${job.platform}: ${result.username}`);
    } else {
      job.status = 'failed';
      job.errorMessage = result.error || 'Registration failed';
      job.updatedAt = new Date();
      
      // Check if manual action is required
      if (result.requiresManualAction) {
        logger.warn(`[FullAuto] Manual action required (${result.manualActionType}) for ${job.platform}`);
        job.errorMessage = `[MANUAL ACTION: ${result.manualActionType}] ${job.errorMessage}`;
      }
      
      logger.error(`[FullAuto] Registration failed: ${job.errorMessage}`);
    }
    
  } catch (error) {
    job.status = 'failed';
    job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    job.updatedAt = new Date();
    
    logger.error(`[FullAuto] Registration error:`, error as Error);
  }
  
  return job;
}

/**
 * Start warming for completed registrations
 */
export async function startAllWarming(): Promise<WarmingStatus[]> {
  const completedJobs = registrationQueue.filter(j => j.status === 'completed' && j.accountId);
  const warmingList: WarmingStatus[] = [];
  
  for (const job of completedJobs) {
    if (!job.accountId) continue;
    
    try {
      // Start warming using real warming manager
      const status = await startWarming(job.accountId, {
        autoStart: true,
        pauseOnError: true,
        pauseOnSuspicious: true,
        maxRiskScore: 70,
      });
      
      warmingJobs.set(job.accountId, status);
      warmingList.push(status);
      
      logger.info(`[FullAuto] Started warming for account ${job.accountId}`);
      
    } catch (error) {
      logger.error(`[FullAuto] Failed to start warming for ${job.accountId}:`, error as Error);
    }
  }
  
  return warmingList;
}

/**
 * Get account info for scheme ranking
 */
async function getAccountInfoForRanking(): Promise<SimCardAccountInfo[]> {
  try {
    const accounts = await db.simCardAccount.findMany({
      where: {
        status: { in: ['registered', 'warming', 'active'] }
      },
      select: {
        id: true,
        platform: true,
        status: true,
        warmingProgress: true,
        warmingStartedAt: true,
        updatedAt: true,
      }
    });
    
    return accounts.map(a => ({
      id: a.id,
      platform: a.platform,
      status: a.status,
      warmingProgress: a.warmingProgress || 0,
      warmingPhase: Math.floor((a.warmingProgress || 0) / 25) + 1,
      warmingStartedAt: a.warmingStartedAt,
      warmingEndsAt: a.warmingStartedAt ? new Date(a.warmingStartedAt.getTime() + 21 * 24 * 60 * 60 * 1000) : null,
      lastActivityAt: a.updatedAt,
    }));
    
  } catch (error) {
    logger.error('[FullAuto] Error getting account info:', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Rank monetization schemes using real ranking algorithm
 */
export async function rankSchemesForUse(): Promise<RankedScheme[]> {
  const accounts = await getAccountInfoForRanking();
  const warmedAccounts = accounts.filter(a => a.status === 'active' && a.warmingProgress >= 50);
  
  // Use real ranking algorithm
  const ranked = rankSchemes(accounts, warmedAccounts, {
    filters: {
      freeOnly: true, // Only free methods as per ТЗ
      riskLevels: ['low', 'medium'], // Exclude high risk by default
    }
  });
  
  logger.info(`[FullAuto] Ranked ${ranked.length} schemes`);
  return ranked;
}

/**
 * Apply top schemes to accounts
 */
export async function applyTopSchemes(rankedSchemes: RankedScheme[]): Promise<{
  applied: number;
  schemes: Scheme[];
}> {
  const appliedSchemes: Scheme[] = [];
  const topSchemes = rankedSchemes.slice(0, currentConfig.schemesCount || 50);
  
  for (const ranked of topSchemes) {
    try {
      const scheme: Scheme = {
        id: ranked.scheme.id,
        name: ranked.scheme.name,
        platform: ranked.scheme.platforms[0] || 'all',
        category: ranked.scheme.category,
        expectedRevenue: ranked.estimatedRevenue.max,
        riskLevel: ranked.scheme.riskLevel as 'low' | 'medium' | 'high',
        conversionRate: ranked.scheme.automationLevel / 100,
        accounts: [],
        score: ranked.score,
        dailyRevenue: 0,
        weeklyRevenue: 0,
        totalRevenue: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await profitExecutor.applyScheme(scheme.id);
      
      if (result.success) {
        appliedSchemes.push(scheme);
        logger.info(`[FullAuto] Applied scheme: ${scheme.name}`);
      }
      
    } catch (error) {
      logger.error('[FullAuto] Failed to apply scheme:', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  return {
    applied: appliedSchemes.length,
    schemes: appliedSchemes,
  };
}

/**
 * Get estimated time remaining
 */
function estimateTimeRemaining(
  step: number,
  totalJobs: number,
  completedJobs: number
): number {
  const avgTimePerStep = [
    30,   // Step 1: Scan (30s)
    10,   // Step 2: Plan (10s)
    totalJobs * 60, // Step 3: Registration (~60s per job)
    20,   // Step 4: Warming init (20s)
    15,   // Step 5: Rank schemes (15s)
    60,   // Step 6: Apply schemes (60s)
    10,   // Step 7: Start earning (10s)
  ];
  
  let remaining = 0;
  for (let i = step; i < avgTimePerStep.length; i++) {
    if (i === 2) {
      // Registration step - calculate based on remaining jobs
      remaining += (totalJobs - completedJobs) * 60;
    } else {
      remaining += avgTimePerStep[i] || 0;
    }
  }
  
  return remaining;
}

/**
 * Main full auto function - one button automation
 */
export async function runFullAuto(config: FullAutoConfig = {}): Promise<FullAutoProgress> {
  if (autoRunning) {
    return currentProgress;
  }
  
  currentConfig = config;
  abortController = new AbortController();
  autoRunning = true;
  autoPaused = false;
  
  const startTime = new Date();
  currentProgress = {
    step: 0,
    totalSteps: 7,
    currentStep: 'Инициализация',
    percentComplete: 0,
    estimatedTimeRemaining: 0,
    startedAt: startTime,
    status: 'running',
    message: 'Запуск полного автомата...',
    details: {
      simsDetected: 0,
      registrationsCompleted: 0,
      registrationsFailed: 0,
      warmingStarted: 0,
      schemesApplied: 0,
      revenue: 0,
      errors: [],
    },
  };
  notifyProgress();
  
  try {
    // Step 1: Scan SIMs (0-10%)
    updateProgress(1, 'Сканирование SIM-карт', 2, 'Подключение к ADB устройствам...');
    
    const sims = await scanSimCards();
    
    // Apply manually entered phone numbers
    if (config.phoneNumbers) {
      logger.info('[FullAuto] Applying manually entered phone numbers');
      for (const sim of sims) {
        if (config.phoneNumbers[sim.id]) {
          sim.phoneNumber = config.phoneNumbers[sim.id];
          simStore.set(sim.id, sim);
          logger.info(`[FullAuto] Set phone number for ${sim.id}: ${sim.phoneNumber}`);
        }
      }
    }
    
    currentProgress.details.simsDetected = sims.length;
    currentProgress.estimatedTimeRemaining = estimateTimeRemaining(1, 0, 0);
    
    // Check if we have any SIMs with phone numbers
    const simsWithPhones = sims.filter(s => s.phoneNumber);
    if (sims.length === 0) {
      throw new Error('SIM-карты не обнаружены. Проверьте подключение устройств через ADB.');
    }
    
    if (simsWithPhones.length === 0) {
      throw new Error('Не указаны номера телефонов. Введите номера в интерфейсе.');
    }
    
    updateProgress(1, 'Сканирование SIM-карт', 10, `Найдено ${sims.length} SIM-карт, ${simsWithPhones.length} с номерами`);
    
    if (abortController.signal.aborted) throw new Error('Aborted');
    
    // Step 2: Plan registrations (10-15%)
    updateProgress(2, 'Планирование регистраций', 12, 'Анализ доступных платформ...');
    
    const plan = await calculateRegistrationPlan(sims, config);
    currentProgress.estimatedTimeRemaining = estimateTimeRemaining(2, plan.length, 0);
    
    if (plan.length === 0) {
      logger.warn('[FullAuto] No registration jobs created - all accounts already exist');
    }
    
    updateProgress(2, 'Планирование регистраций', 15, `Создано ${plan.length} задач на регистрацию`);
    
    if (abortController.signal.aborted) throw new Error('Aborted');
    
    // Step 3: Register accounts (15-50%)
    if (!config.skipRegistration && plan.length > 0) {
      updateProgress(3, 'Регистрация аккаунтов', 17, 'Начало регистрации...');
      
      let registered = 0;
      let failed = 0;
      const totalJobs = plan.length;
      
      for (const job of plan) {
        if (abortController.signal.aborted) throw new Error('Aborted');
        
        while (autoPaused) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const result = await registerAccount(job);
        
        if (result.status === 'completed') {
          registered++;
          currentProgress.details.registrationsCompleted = registered;
        } else {
          failed++;
          currentProgress.details.registrationsFailed = failed;
          if (result.errorMessage) {
            addError(`Registration failed (${job.platform}): ${result.errorMessage}`);
          }
        }
        
        const progress = 17 + ((registered + failed) / totalJobs) * 33;
        currentProgress.estimatedTimeRemaining = estimateTimeRemaining(3, totalJobs, registered + failed);
        
        updateProgress(3, 'Регистрация аккаунтов', progress,
          `Зарегистрировано ${registered}/${totalJobs} (${failed} ошибок)`);
      }
    } else {
      logger.info('[FullAuto] Skipping registration phase');
    }
    
    if (abortController.signal.aborted) throw new Error('Aborted');
    
    // Step 4: Start warming (50-55%)
    if (!config.skipWarming) {
      updateProgress(4, 'Запуск прогрева', 50, 'Инициализация прогрева аккаунтов...');
      
      const warmingList = await startAllWarming();
      currentProgress.details.warmingStarted = warmingList.length;
      currentProgress.estimatedTimeRemaining = estimateTimeRemaining(4, 0, 0);
      
      updateProgress(4, 'Запуск прогрева', 55, `Прогрев запущен для ${warmingList.length} аккаунтов`);
    } else {
      logger.info('[FullAuto] Skipping warming phase');
    }
    
    if (abortController.signal.aborted) throw new Error('Aborted');
    
    // Step 5: Rank schemes (55-60%)
    updateProgress(5, 'Ранжирование схем', 56, 'Анализ схем монетизации...');
    
    const rankedSchemes = await rankSchemesForUse();
    currentProgress.estimatedTimeRemaining = estimateTimeRemaining(5, 0, 0);
    
    updateProgress(5, 'Ранжирование схем', 60, `Отранжировано ${rankedSchemes.length} схем`);
    
    if (abortController.signal.aborted) throw new Error('Aborted');
    
    // Step 6: Apply top schemes (60-95%)
    updateProgress(6, 'Применение схем', 62, 'Применение лучших схем монетизации...');
    
    const applyResult = await applyTopSchemes(rankedSchemes);
    currentProgress.details.schemesApplied = applyResult.applied;
    currentProgress.estimatedTimeRemaining = estimateTimeRemaining(6, 0, 0);
    
    updateProgress(6, 'Применение схем', 95, `Применено ${applyResult.applied} схем`);
    
    if (abortController.signal.aborted) throw new Error('Aborted');
    
    // Step 7: Start profit execution (95-100%)
    if (config.autoStartEarning !== false) {
      updateProgress(7, 'Запуск заработка', 96, 'Запуск автоматического заработка...');
      
      await profitExecutor.startProfitExecution();
      currentProgress.estimatedTimeRemaining = 0;
    }
    
    // Complete
    updateProgress(7, 'Запуск заработка', 100, '🚀 Система работает автоматически!');
    
    currentProgress.status = 'completed';
    currentProgress.message = 'Полный автозапуск завершён успешно!';
    notifyProgress();
    
    logger.info('[FullAuto] Full auto completed successfully', currentProgress.details);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    currentProgress.status = 'error';
    currentProgress.message = `Ошибка: ${errorMessage}`;
    addError(errorMessage);
    notifyProgress();
    
    logger.error('[FullAuto] Full auto failed:', error as Error);
  } finally {
    autoRunning = false;
  }
  
  return currentProgress;
}

/**
 * Pause full auto process
 */
export function pauseFullAuto(): void {
  autoPaused = true;
  currentProgress.status = 'paused';
  currentProgress.message = 'Процесс приостановлен';
  notifyProgress();
  
  logger.info('[FullAuto] Process paused');
}

/**
 * Resume full auto process
 */
export function resumeFullAuto(): void {
  autoPaused = false;
  currentProgress.status = 'running';
  currentProgress.message = 'Процесс продолжен';
  notifyProgress();
  
  logger.info('[FullAuto] Process resumed');
}

/**
 * Stop full auto process completely
 */
export function stopFullAuto(): void {
  if (abortController) {
    abortController.abort();
  }
  
  autoRunning = false;
  autoPaused = false;
  
  // Stop profit executor
  profitExecutor.stopProfitExecution();
  
  // Stop all warming sessions
  for (const [accountId] of warmingJobs) {
    stopWarming(accountId).catch(err => 
      logger.error('[FullAuto] Error stopping warming:', err)
    );
  }
  warmingJobs.clear();
  
  currentProgress = {
    step: 0,
    totalSteps: 7,
    currentStep: 'Ожидание запуска',
    percentComplete: 0,
    estimatedTimeRemaining: 0,
    startedAt: new Date(),
    status: 'idle',
    message: '',
    details: {
      simsDetected: 0,
      registrationsCompleted: 0,
      registrationsFailed: 0,
      warmingStarted: 0,
      schemesApplied: 0,
      revenue: 0,
      errors: [],
    },
  };
  
  notifyProgress();
  logger.info('[FullAuto] Process stopped');
}

/**
 * Get current progress
 */
export function getProgress(): FullAutoProgress {
  return { ...currentProgress };
}

/**
 * Get all SIM cards
 */
export function getSimCards(): SimCard[] {
  return Array.from(simStore.values());
}

/**
 * Get registration queue
 */
export function getRegistrationQueue(): RegistrationJob[] {
  return [...registrationQueue];
}

/**
 * Get warming jobs
 */
export function getWarmingJobs(): WarmingStatus[] {
  return Array.from(warmingJobs.values());
}

/**
 * Get statistics
 */
export async function getStatistics(): Promise<{
  totalSims: number;
  availableSims: number;
  registeredAccounts: number;
  activeWarming: number;
  activeEarning: number;
  totalRevenue: number;
}> {
  const [simStats, accountCount, warmingCount, dailyRevenue] = await Promise.all([
    getSimCardStats(),
    db.simCardAccount.count({ where: { status: 'active' } }),
    db.simCardAccount.count({ where: { status: 'warming' } }),
    profitExecutor.getDailyRevenue(),
  ]);
  
  const schemes = await profitExecutor.getSchemes();
  const activeSchemes = schemes.filter(s => s.status === 'active');
  
  return {
    totalSims: simStats.total,
    availableSims: simStats.available,
    registeredAccounts: accountCount,
    activeWarming: warmingCount,
    activeEarning: activeSchemes.length,
    totalRevenue: dailyRevenue.total,
  };
}

/**
 * Check ADB connection status
 */
export async function checkAdbStatus(): Promise<{
  connected: boolean;
  devices: number;
  error?: string;
}> {
  try {
    const devices = await listDevices();
    return {
      connected: true,
      devices: devices.length,
    };
  } catch (error) {
    return {
      connected: false,
      devices: 0,
      error: error instanceof Error ? error.message : 'ADB not available',
    };
  }
}

export const fullAutoController = {
  runFullAuto,
  pauseFullAuto,
  resumeFullAuto,
  stopFullAuto,
  getProgress,
  subscribeToProgress,
  scanSimCards,
  calculateRegistrationPlan,
  registerAccount,
  startAllWarming,
  rankSchemes: rankSchemesForUse,
  applyTopSchemes,
  getSimCards,
  getRegistrationQueue,
  getWarmingJobs,
  getStatistics,
  checkAdbStatus,
};

export default fullAutoController;
