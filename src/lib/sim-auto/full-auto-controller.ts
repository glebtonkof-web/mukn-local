/**
 * МУКН SIM Auto-Registration - Full Auto Controller
 * One-button automation for complete SIM registration and monetization workflow
 */

import { profitExecutor, Scheme } from './profit-executor';

// Types
export interface SimCard {
  id: string;
  phoneNumber: string;
  operator: string;
  country: string;
  status: 'available' | 'in_use' | 'registered' | 'error';
  registeredPlatforms: string[];
  balance: number;
  detectedAt: Date;
}

export interface RegistrationJob {
  id: string;
  simId: string;
  platform: string;
  status: 'pending' | 'registering' | 'completed' | 'failed';
  progress: number;
  error?: string;
  accountId?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WarmingJob {
  accountId: string;
  platform: string;
  phase: 1 | 2 | 3 | 4;
  dayNumber: number;
  totalDays: number;
  dailyActions: {
    likes: number;
    follows: number;
    comments: number;
    dms: number;
  };
  status: 'pending' | 'active' | 'completed' | 'paused';
  riskLevel: number;
  startedAt?: Date;
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
  };
}

// In-memory storage
const simStore = new Map<string, SimCard>();
const registrationQueue: RegistrationJob[] = [];
const warmingJobs = new Map<string, WarmingJob>();
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
  },
};

let autoRunning = false;
let autoPaused = false;
let abortController: AbortController | null = null;

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
 * Scan for SIM cards (mock implementation)
 */
export async function scanSimCards(): Promise<SimCard[]> {
  // In real implementation, this would connect to SMS gateway or modem
  // For now, return mock data
  const mockSims: SimCard[] = [
    {
      id: 'sim-1',
      phoneNumber: '+7 999 123-45-67',
      operator: 'МТС',
      country: 'RU',
      status: 'available',
      registeredPlatforms: [],
      balance: 150,
      detectedAt: new Date(),
    },
    {
      id: 'sim-2',
      phoneNumber: '+7 999 234-56-78',
      operator: 'Билайн',
      country: 'RU',
      status: 'available',
      registeredPlatforms: [],
      balance: 200,
      detectedAt: new Date(),
    },
    {
      id: 'sim-3',
      phoneNumber: '+7 999 345-67-89',
      operator: 'Мегафон',
      country: 'RU',
      status: 'available',
      registeredPlatforms: [],
      balance: 100,
      detectedAt: new Date(),
    },
    {
      id: 'sim-4',
      phoneNumber: '+7 999 456-78-90',
      operator: 'Tele2',
      country: 'RU',
      status: 'available',
      registeredPlatforms: [],
      balance: 250,
      detectedAt: new Date(),
    },
    {
      id: 'sim-5',
      phoneNumber: '+7 999 567-89-01',
      operator: 'МТС',
      country: 'RU',
      status: 'available',
      registeredPlatforms: [],
      balance: 180,
      detectedAt: new Date(),
    },
  ];

  // Clear and populate store
  simStore.clear();
  for (const sim of mockSims) {
    simStore.set(sim.id, sim);
  }

  return mockSims;
}

/**
 * Calculate registration plan based on available SIMs
 */
export function calculateRegistrationPlan(sims: SimCard[]): RegistrationJob[] {
  const platforms = [
    'Instagram',
    'TikTok',
    'Telegram',
    'X',
    'YouTube',
  ];

  const jobs: RegistrationJob[] = [];
  let jobIndex = 0;

  // Distribute SIMs across platforms
  for (const sim of sims) {
    // Register on 2-3 platforms per SIM
    const numPlatforms = 2 + Math.floor(Math.random() * 2);
    const selectedPlatforms = platforms
      .sort(() => Math.random() - 0.5)
      .slice(0, numPlatforms);

    for (const platform of selectedPlatforms) {
      jobs.push({
        id: `job-${jobIndex++}`,
        simId: sim.id,
        platform,
        status: 'pending',
        progress: 0,
      });
    }
  }

  registrationQueue.length = 0;
  registrationQueue.push(...jobs);

  return jobs;
}

/**
 * Register a single account
 */
export async function registerAccount(job: RegistrationJob): Promise<RegistrationJob> {
  job.status = 'registering';
  job.startedAt = new Date();

  // Simulate registration process
  const steps = [
    { name: 'Initializing', duration: 500 },
    { name: 'Requesting SMS code', duration: 2000 },
    { name: 'Verifying code', duration: 1500 },
    { name: 'Creating profile', duration: 1000 },
    { name: 'Setting up account', duration: 800 },
  ];

  let progress = 0;
  const progressPerStep = 100 / steps.length;

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, step.duration));
    progress += progressPerStep;
    job.progress = Math.min(progress, 100);
  }

  // 90% success rate
  if (Math.random() > 0.1) {
    job.status = 'completed';
    job.progress = 100;
    job.accountId = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    job.completedAt = new Date();

    // Update SIM card status
    const sim = simStore.get(job.simId);
    if (sim) {
      sim.registeredPlatforms.push(job.platform);
      sim.status = 'registered';
      simStore.set(sim.id, sim);
    }
  } else {
    job.status = 'failed';
    job.error = 'SMS code not received';
  }

  return job;
}

/**
 * Start warming for all accounts
 */
export async function startAllWarming(): Promise<WarmingJob[]> {
  const completedJobs = registrationQueue.filter(j => j.status === 'completed');
  const warmingList: WarmingJob[] = [];

  for (const job of completedJobs) {
    if (!job.accountId) continue;

    const warmingJob: WarmingJob = {
      accountId: job.accountId,
      platform: job.platform,
      phase: 1,
      dayNumber: 1,
      totalDays: 21,
      dailyActions: {
        likes: 10,
        follows: 5,
        comments: 0,
        dms: 0,
      },
      status: 'active',
      riskLevel: 0,
      startedAt: new Date(),
    };

    warmingJobs.set(job.accountId, warmingJob);
    warmingList.push(warmingJob);
  }

  return warmingList;
}

/**
 * Rank monetization schemes
 */
export async function rankSchemes(): Promise<Scheme[]> {
  const schemes = await profitExecutor.getSchemes();

  // Calculate score based on multiple factors
  const rankedSchemes = schemes.map(scheme => ({
    ...scheme,
    score: calculateSchemeScore(scheme),
  }));

  return rankedSchemes.sort((a, b) => b.score - a.score);
}

/**
 * Calculate scheme score
 */
function calculateSchemeScore(scheme: Scheme): number {
  let score = 0;

  // Expected revenue factor (0-30 points)
  score += Math.min((scheme.expectedRevenue / 10000) * 30, 30);

  // Risk factor (0-20 points, lower risk = higher score)
  const riskScores = { low: 20, medium: 12, high: 5 };
  score += riskScores[scheme.riskLevel];

  // Conversion rate factor (0-25 points)
  score += Math.min(scheme.conversionRate * 5, 25);

  // Platform popularity factor (0-25 points)
  const platformScores: Record<string, number> = {
    'Instagram': 25,
    'TikTok': 23,
    'YouTube': 22,
    'Telegram': 20,
    'X': 18,
  };
  score += platformScores[scheme.platform] || 15;

  return Math.round(score);
}

/**
 * Apply top schemes
 */
export async function applyTopSchemes(schemes: Scheme[]): Promise<{
  applied: number;
  schemes: Scheme[];
}> {
  const appliedSchemes: Scheme[] = [];

  for (const scheme of schemes) {
    const result = await profitExecutor.applyScheme(scheme.id);
    if (result.success) {
      appliedSchemes.push(scheme);
    }
  }

  return {
    applied: appliedSchemes.length,
    schemes: appliedSchemes,
  };
}

/**
 * Main full auto function - one button automation
 */
export async function runFullAuto(): Promise<FullAutoProgress> {
  if (autoRunning) {
    return currentProgress;
  }

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
    },
  };
  notifyProgress();

  try {
    // Step 1: Scan SIMs (10%)
    updateProgress(1, 'Сканирование SIM-карт', 5, 'Поиск доступных SIM-карт...');
    const sims = await scanSimCards();
    currentProgress.details.simsDetected = sims.length;
    updateProgress(1, 'Сканирование SIM-карт', 10, `Найдено ${sims.length} SIM-карт`);

    if (abortController.signal.aborted) throw new Error('Aborted');

    // Step 2: Plan registrations (15%)
    updateProgress(2, 'Планирование регистраций', 12, 'Распределение SIM по платформам...');
    const plan = calculateRegistrationPlan(sims);
    updateProgress(2, 'Планирование регистраций', 15, `Создано ${plan.length} задач на регистрацию`);

    if (abortController.signal.aborted) throw new Error('Aborted');

    // Step 3: Register accounts (15-50%)
    updateProgress(3, 'Регистрация аккаунтов', 17, 'Начало регистрации...');
    
    let registered = 0;
    let failed = 0;
    const totalJobs = plan.length;
    const baseProgress = 17;
    const progressRange = 33; // 17 to 50

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
      }

      const progress = baseProgress + ((registered + failed) / totalJobs) * progressRange;
      updateProgress(3, 'Регистрация аккаунтов', progress,
        `Зарегистрировано ${registered}/${totalJobs} (${failed} ошибок)`);
    }

    if (abortController.signal.aborted) throw new Error('Aborted');

    // Step 4: Start warming (50-55%)
    updateProgress(4, 'Запуск прогрева', 50, 'Инициализация прогрева аккаунтов...');
    const warmingList = await startAllWarming();
    currentProgress.details.warmingStarted = warmingList.length;
    updateProgress(4, 'Запуск прогрева', 55, `Прогрев запущен для ${warmingList.length} аккаунтов`);

    if (abortController.signal.aborted) throw new Error('Aborted');

    // Step 5: Rank schemes (55-60%)
    updateProgress(5, 'Ранжирование схем', 56, 'Анализ схем монетизации...');
    const rankedSchemes = await rankSchemes();
    updateProgress(5, 'Ранжирование схем', 60, `Отранжировано ${rankedSchemes.length} схем`);

    if (abortController.signal.aborted) throw new Error('Aborted');

    // Step 6: Apply top 50 schemes (60-95%)
    updateProgress(6, 'Применение схем', 62, 'Применение лучших схем...');
    const top50 = rankedSchemes.slice(0, 50);
    const applyResult = await applyTopSchemes(top50);
    currentProgress.details.schemesApplied = applyResult.applied;
    updateProgress(6, 'Применение схем', 95, `Применено ${applyResult.applied} схем`);

    if (abortController.signal.aborted) throw new Error('Aborted');

    // Step 7: Start profit execution (95-100%)
    updateProgress(7, 'Запуск заработка', 96, 'Запуск автоматического заработка...');
    await profitExecutor.startProfitExecution();
    updateProgress(7, 'Запуск заработка', 100, '🚀 Система работает автоматически!');

    // Complete
    currentProgress.status = 'completed';
    currentProgress.message = 'Полный автозапуск завершён успешно!';
    currentProgress.percentComplete = 100;
    notifyProgress();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    currentProgress.status = 'error';
    currentProgress.message = `Ошибка: ${errorMessage}`;
    notifyProgress();
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
}

/**
 * Resume full auto process
 */
export function resumeFullAuto(): void {
  autoPaused = false;
  currentProgress.status = 'running';
  notifyProgress();
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
  
  profitExecutor.stopProfitExecution();
  
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
    },
  };
  notifyProgress();
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
export function getWarmingJobs(): WarmingJob[] {
  return Array.from(warmingJobs.values());
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
  rankSchemes,
  applyTopSchemes,
  getSimCards,
  getRegistrationQueue,
  getWarmingJobs,
};

export default fullAutoController;
