// Sim-Auto Module Index
// Exports for all SIM-auto modules

// Types
export * from './types';

// ADB Client
export {
  executeAdbCommand,
  connectDevice,
  disconnectDevice,
  listDevices,
  getDeviceInfo,
  readSimSlots,
  readSms,
  startSmsListenerRealtime,
  stopSmsListenerRealtime,
  executeCommand,
  type AdbDevice,
  type DeviceInfo as AdbDeviceInfo,
  type SimCardSlot,
  type AdbCommandResult,
  type SmsMessage
} from './adb-client';

// SIM Scanner
export {
  scanDevices,
  detectAllSimCards,
  getSimCardInfo,
  checkExistingAccounts,
  getScanProgress,
  getScanResult,
  isScanInProgress,
  cancelScan,
  getStoredSimCards,
  getSimCardStats,
  connectAndVerify
} from './sim-scanner';

// SMS Reader
export {
  startSmsListener,
  stopSmsListener,
  parseVerificationCode,
  waitForCode,
  getPendingVerifications,
  startVerification,
  completeVerification,
  cancelVerification,
  getVerification,
  getRecentSms,
  searchVerificationCodes,
  onSmsEvent,
  setWaitingForCode,
  failVerification,
  getActiveListeners
} from './sms-reader';

// Session Manager
export {
  sessionManager,
  saveSession,
  loadSession,
  validateSession,
  encryptData,
  decryptData,
  type PlatformSession,
  PLATFORM_LIMITS,
  PLATFORM_REGISTRATION_URLS
} from './session-manager';

// Playwright Automation
export {
  PlaywrightAutomation,
  launchBrowser,
  navigateToRegistration,
  fillPhoneNumber,
  handleSmsVerification,
  completeProfile,
  saveSession as saveBrowserSession,
  type ProfileData,
  type StealthConfig,
  type RegistrationResult
} from './playwright-automation';

// Registration Automation (New)
export {
  RegistrationAutomation,
  runRegistration,
  type PlatformConfig
} from './registration-automation';

// Registration Manager
export {
  registrationManager,
  registerTelegram,
  registerInstagram,
  registerTikTok,
  registerTwitter,
  registerYouTube,
  registerWhatsApp,
  registerViber,
  registerSignal,
  registerDiscord,
  registerReddit,
  type RegistrationJob,
  type RegistrationStatus,
  type PlatformRegistrationConfig
} from './registration-manager';

// Warming Strategies
export {
  TELEGRAM_WARMING,
  INSTAGRAM_WARMING,
  TIKTOK_WARMING,
  PLATFORM_STRATEGIES,
  getWarmingStrategy,
  getCurrentPhase,
  calculateProgress,
  isTrafficReady,
  getAllowedActions,
  getActionLimits,
  getRandomActionCount,
  isActionAllowed,
  getPhaseRiskLevel,
  generateDailyActionPlan,
  type WarmingActionLimit,
  type WarmingPhase as WarmingPhaseConfig,
  type PlatformWarmingStrategy
} from './warming-strategies';

// Behavior Simulator
export {
  randomDelay,
  simulateTyping,
  simulateReading,
  simulateMouseMovements,
  simulateScroll,
  generateRandomSchedule,
  generateSessionGap,
  generateActionGap,
  generateBurstPattern
} from './behavior-simulator';

// Action Executor
export {
  executeWarmingAction,
  executeActionBatch,
  checkSuspiciousActivity,
  type WarmingAction,
  type ActionResult,
  type ActionContext
} from './action-executor';

// Warming Manager
export {
  startWarming,
  stopWarming,
  getWarmingStatus,
  calculatePhase,
  executeWarmingActionWithCheck,
  getActiveWarmingSessions,
  pauseWarming,
  resumeWarming,
  getWarmingLogs,
  type WarmingStatus,
  type WarmingConfig
} from './warming-manager';

// Schemes Library
export {
  MONETIZATION_SCHEMES,
  getSchemesByCategory,
  getSchemesByPlatform,
  getSchemesByRiskLevel,
  getAllPlatforms,
  getSchemeStats,
  type MonetizationSchemeDefinition,
  type SchemeCategory,
  type RiskLevel
} from './schemes-library';

// Scheme Ranker
export {
  rankSchemes,
  getQuickRecommendations,
  getSchemeDetails,
  analyzeSchemeBatch,
  calculateRequirements,
  type SimCardAccountInfo,
  type RankerConfig,
  type RankedScheme
} from './scheme-ranker';

// Scheme Executor
export {
  startScheme,
  stopScheme,
  pauseScheme as pauseSchemeExecution,
  resumeScheme,
  rotateAccounts,
  getSchemePerformance,
  recordAction,
  getActiveExecutions,
  getExecution,
  estimateRevenue,
  getExecutionSummary,
  isWithinWorkHours,
  getActionDelay,
  type SchemeStatus,
  type SchemeExecution,
  type SchemeMetrics,
  type ExecutionConfig,
  type SchemeError,
  type SchemeLog,
  type SchemePerformance
} from './scheme-executor';

// Profit Executor
export {
  profitExecutor,
  startProfitExecution,
  stopProfitExecution,
  trackRevenue,
  getDailyRevenue,
  getWeeklyRevenue,
  getSchemes,
  getSchemeById,
  applyScheme,
  pauseScheme as pauseProfitScheme,
  addScheme,
  rotateAccounts as rotateAccountsForProfit,
  monitorPerformance,
  type Scheme,
  type RevenueEntry,
  type DailyRevenue,
  type WeeklyRevenue,
  type PerformanceMetrics
} from './profit-executor';

// Full Auto Controller
export {
  fullAutoController,
  runFullAuto,
  pauseFullAuto,
  resumeFullAuto,
  stopFullAuto,
  getProgress,
  subscribeToProgress,
  scanSimCards,
  calculateRegistrationPlan,
  startAllWarming,
  rankSchemesForUse,
  applyTopSchemes,
  getSimCards,
  getRegistrationQueue,
  getStatistics,
  checkAdbStatus,
  type SimCard,
  type FullAutoProgress,
  type FullAutoConfig
} from './full-auto-controller';

// Database Seeder
export {
  seedSchemes,
  clearSchemes,
  reseedSchemes,
  getSeedingStatus,
  seedScheme,
  updateSchemeStats,
  exportSchemesToJson,
  importSchemesFromJson,
  type SeedingStatus
} from './seed-schemes';

// Proxy Manager (Security-First)
export {
  getProxyManager,
  getBestProxyForPlatform,
  getWorkingProxies,
  initializeProxies,
  type ProxyInfo,
  type ProxyValidationResult,
  type ProxyInfoWithType
} from './proxy-manager';

// Improved Registration (with security)
export {
  runRegistration as runSecureRegistration,
  onRegistrationEvent,
  type RegistrationParams,
  type RegistrationResult as SecureRegistrationResult
} from './improved-registration';

// Improved SMS Reader
export {
  startSmsMonitoring,
  waitForVerificationCode,
  readRecentSms as readRecentSmsImproved
} from './improved-sms-reader';

// Improved SIM Scanner
export {
  detectAllSimCards as scanForSimCards,
  type DetectedSimCard
} from './improved-sim-scanner';
