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
  type AdbCommandResult,
  type DeviceInfo as AdbDeviceInfo
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
  createVerificationRequest,
  getVerificationRequest,
  expireOldVerifications
} from './sms-reader';

// Session Manager
export {
  saveSession,
  loadSession,
  deleteSession,
  validateSession,
  encryptData,
  decryptData,
  exportSession,
  importSession
} from './session-manager';

// Playwright Automation
export {
  launchBrowser,
  navigateToRegistration,
  fillPhoneNumber,
  handleSmsVerification,
  completeProfile,
  saveBrowserSession,
  closeBrowser,
  type BrowserSession,
  type ProfileData
} from './playwright-automation';

// Registration Manager
export {
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
  getRegistrationQueue,
  getRegistrationStatus,
  cancelRegistration,
  getPlatformLimits,
  calculateRegistrationPlan,
  type RegistrationJob,
  type RegistrationResult
} from './registration-manager';

// Warming Strategies
export {
  TELEGRAM_WARMING,
  INSTAGRAM_WARMING,
  TIKTOK_WARMING,
  TWITTER_WARMING,
  YOUTUBE_WARMING,
  WHATSAPP_WARMING,
  getWarmingStrategy,
  getActionsForDay,
  getPhaseForDay
} from './warming-strategies';

// Behavior Simulator
export {
  randomDelay,
  simulateTyping,
  simulateReading,
  simulateMouseMovements,
  generateRandomSchedule,
  generateBurstPattern,
  randomChoice,
  randomInt,
  gaussianRandom
} from './behavior-simulator';

// Action Executor
export {
  executeLogin,
  executeView,
  executeLike,
  executeSubscribe,
  executeComment,
  executeReply,
  executePost,
  executeDM,
  executeInvite,
  executeActionBatch,
  checkSuspiciousActivity,
  type WarmingAction,
  type ActionResult
} from './action-executor';

// Warming Manager
export {
  startWarming,
  stopWarming,
  getWarmingStatus,
  calculatePhase,
  executeWarmingAction,
  runWarmingLoop,
  getActiveWarmingSessions,
  pauseWarming,
  resumeWarming,
  type WarmingSession,
  type WarmingStatus
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
  type RiskLevel,
  type Platform
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
  pauseScheme,
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
  startProfitExecution,
  stopProfitExecution,
  trackRevenue,
  getDailyRevenue,
  getWeeklyRevenue,
  getMonthlyRevenue,
  rotateAccountsForProfit,
  monitorPerformance,
  getProfitDashboard,
  type ProfitMetrics
} from './profit-executor';

// Full Auto Controller
export {
  runFullAuto,
  getFullAutoStatus,
  pauseFullAuto,
  resumeFullAuto,
  stopFullAuto,
  subscribeToProgress,
  unsubscribeFromProgress,
  type FullAutoProgress,
  type FullAutoStatus
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
  importSchemesFromJson
} from './seed-schemes';
