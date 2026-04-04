// Fingerprint checking utilities
// Based on 2026 research for anti-detect protection

export interface FingerprintCheck {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  score: number; // 0-100
  details: string;
  recommendation: string | null;
}

export interface FingerprintResult {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  checks: FingerprintCheck[];
  recommendations: string[];
  isUnique: boolean;
}

// Check Canvas fingerprint
export function checkCanvasFingerprint(canvasHash?: string): FingerprintCheck {
  const passed = !!canvasHash && canvasHash.length > 10;
  
  return {
    id: 'canvas',
    name: 'Canvas Hash',
    description: 'Уникальный результат рендеринга графики',
    passed,
    score: passed ? 100 : 0,
    details: passed 
      ? `Canvas hash: ${canvasHash?.substring(0, 16)}...` 
      : 'Canvas hash не обнаружен',
    recommendation: passed ? null : 'Используйте антидетект-браузер для генерации уникального canvas hash',
  };
}

// Check WebGL vendor/renderer
export function checkWebGL(vendor?: string, renderer?: string): FingerprintCheck {
  // Common fake values that get detected
  const suspiciousValues = [
    'Google Inc.',
    'Mozilla',
    'ANGLE',
    'SwiftShader',
  ];
  
  const hasSuspiciousVendor = vendor && suspiciousValues.some(v => vendor.includes(v));
  const hasSuspiciousRenderer = renderer && suspiciousValues.some(r => renderer.includes(r));
  
  // Real GPUs have specific patterns
  const realGPUPatterns = [
    'NVIDIA',
    'AMD',
    'Intel',
    'Radeon',
    'GeForce',
    'Mali',
    'Adreno',
    'Apple',
  ];
  
  const hasRealGPU = renderer && realGPUPatterns.some(p => renderer.includes(p));
  
  const passed = !hasSuspiciousRenderer || hasRealGPU;
  
  return {
    id: 'webgl',
    name: 'WebGL Vendor/Renderer',
    description: 'Информация о видеокарте',
    passed,
    score: passed ? 100 : hasRealGPU ? 70 : 30,
    details: `Vendor: ${vendor || 'Не указан'} | Renderer: ${renderer || 'Не указан'}`,
    recommendation: passed ? null : 'WebGL может выдавать эмулятор. Настройте антидетект на реалистичные значения GPU',
  };
}

// Check WebRTC leak
export function checkWebRTCLeak(realIP?: string, proxyIP?: string): FingerprintCheck {
  const hasLeak = realIP && realIP !== proxyIP;
  
  return {
    id: 'webrtc',
    name: 'WebRTC Leak',
    description: 'Проверка утечки реального IP через WebRTC',
    passed: !hasLeak,
    score: !hasLeak ? 100 : 0,
    details: hasLeak 
      ? `ОБНАРУЖЕНА УТЕЧКА! Реальный IP: ${realIP}` 
      : 'Утечек WebRTC не обнаружено',
    recommendation: hasLeak 
      ? 'Отключите WebRTC в браузере или настройте антидетект на блокировку WebRTC' 
      : null,
  };
}

// Check Audio fingerprint
export function checkAudioFingerprint(audioHash?: string): FingerprintCheck {
  const passed = !!audioHash && audioHash.length > 5;
  
  return {
    id: 'audio',
    name: 'Audio Fingerprint',
    description: 'Характеристики обработки аудио',
    passed,
    score: passed ? 100 : 50,
    details: passed 
      ? `Audio hash: ${audioHash?.substring(0, 16)}...` 
      : 'Audio fingerprint не обнаружен',
    recommendation: passed ? null : 'Антидетект должен генерировать уникальный audio fingerprint',
  };
}

// Check timezone consistency
export function checkTimezone(
  browserTimezone: string,
  proxyTimezone: string,
  languageTimezone?: string
): FingerprintCheck {
  const timezoneMatch = browserTimezone === proxyTimezone;
  const languageMatch = !languageTimezone || languageTimezone === proxyTimezone;
  const passed = timezoneMatch && languageMatch;
  
  return {
    id: 'timezone',
    name: 'Timezone Consistency',
    description: 'Соответствие часового пояса геолокации',
    passed,
    score: passed ? 100 : timezoneMatch ? 70 : 30,
    details: `Браузер: ${browserTimezone} | Прокси: ${proxyTimezone}${languageTimezone ? ` | Язык: ${languageTimezone}` : ''}`,
    recommendation: passed 
      ? null 
      : 'Часовой пояс браузера должен совпадать с геолокацией прокси. Настройте в антидетекте.',
  };
}

// Check language consistency
export function checkLanguage(
  browserLanguage: string,
  proxyCountry: string
): FingerprintCheck {
  const languageToCountry: Record<string, string[]> = {
    'ru-RU': ['RU', 'BY', 'KZ', 'UA'],
    'en-US': ['US'],
    'en-GB': ['GB', 'UK'],
    'de-DE': ['DE', 'AT', 'CH'],
    'fr-FR': ['FR', 'BE', 'CA'],
    'es-ES': ['ES', 'MX', 'AR'],
  };
  
  const countries = languageToCountry[browserLanguage] || [];
  const passed = countries.includes(proxyCountry);
  
  return {
    id: 'language',
    name: 'Language Consistency',
    description: 'Соответствие языка геолокации',
    passed,
    score: passed ? 100 : 50,
    details: `Язык браузера: ${browserLanguage} | Страна прокси: ${proxyCountry}`,
    recommendation: passed 
      ? null 
      : `Язык браузера ${browserLanguage} не соответствует стране прокси ${proxyCountry}. Измените язык или используйте другой прокси.`,
  };
}

// Check fonts
export function checkFonts(fonts: string[], os: string): FingerprintCheck {
  // Common fonts by OS
  const windowsFonts = ['Arial', 'Times New Roman', 'Calibri', 'Segoe UI'];
  const macFonts = ['Helvetica', 'San Francisco', 'Lucida Grande'];
  const linuxFonts = ['Ubuntu', 'DejaVu Sans', 'Liberation Sans'];
  
  let expectedFonts: string[] = [];
  if (os.toLowerCase().includes('windows')) expectedFonts = windowsFonts;
  else if (os.toLowerCase().includes('mac')) expectedFonts = macFonts;
  else if (os.toLowerCase().includes('linux')) expectedFonts = linuxFonts;
  
  const hasExpectedFonts = expectedFonts.some(f => fonts.includes(f));
  const passed = fonts.length > 0 && hasExpectedFonts;
  
  return {
    id: 'fonts',
    name: 'System Fonts',
    description: 'Установленные шрифты системы',
    passed,
    score: passed ? 100 : 50,
    details: `Найдено ${fonts.length} шрифтов. OS: ${os}`,
    recommendation: passed 
      ? null 
      : 'Шрифты должны соответствовать заявленной ОС. Настройте антидетект на реалистичный набор шрифтов.',
  };
}

// Check screen resolution
export function checkScreenResolution(
  width: number,
  height: number,
  devicePixelRatio: number
): FingerprintCheck {
  // Common suspicious resolutions
  const suspiciousResolutions = [
    [800, 600],
    [1024, 768],
    [1280, 1024],
  ];
  
  const isSuspicious = suspiciousResolutions.some(
    ([w, h]) => w === width && h === height
  );
  
  // Common real resolutions
  const realResolutions = [
    [1920, 1080],
    [1366, 768],
    [1536, 864],
    [1440, 900],
    [2560, 1440],
    [3840, 2160],
  ];
  
  const isReal = realResolutions.some(
    ([w, h]) => w === width && h === height
  );
  
  const passed = !isSuspicious;
  
  return {
    id: 'screen',
    name: 'Screen Resolution',
    description: 'Разрешение экрана и devicePixelRatio',
    passed,
    score: passed ? (isReal ? 100 : 70) : 30,
    details: `${width}x${height} | DPR: ${devicePixelRatio}`,
    recommendation: isSuspicious 
      ? 'Разрешение экрана выглядит подозрительно. Используйте популярные разрешения (1920x1080 и т.д.)' 
      : null,
  };
}

// Check user agent consistency
export function checkUserAgent(
  userAgent: string,
  os: string,
  browser: string
): FingerprintCheck {
  const hasOS = userAgent.toLowerCase().includes(os.toLowerCase());
  const hasBrowser = userAgent.toLowerCase().includes(browser.toLowerCase());
  
  // Check for bot-like patterns
  const botPatterns = ['bot', 'crawler', 'spider', 'headless', 'phantom', 'selenium'];
  const hasBotPattern = botPatterns.some(p => userAgent.toLowerCase().includes(p));
  
  const passed = (hasOS || os === 'unknown') && (hasBrowser || browser === 'unknown') && !hasBotPattern;
  
  return {
    id: 'useragent',
    name: 'User Agent',
    description: 'Консистентность User Agent',
    passed,
    score: passed ? 100 : hasBotPattern ? 0 : 50,
    details: `UA: ${userAgent.substring(0, 50)}...`,
    recommendation: hasBotPattern 
      ? 'КРИТИЧНО: User Agent содержит паттерны бота! Замените на реальный UA.' 
      : !passed 
        ? 'User Agent не соответствует заявленным OS/браузеру' 
        : null,
  };
}

// Check hardware concurrency (CPU cores)
export function checkHardwareConcurrency(cores: number): FingerprintCheck {
  // Most common values
  const commonCores = [2, 4, 6, 8, 12, 16];
  const passed = commonCores.includes(cores);
  
  return {
    id: 'cpu',
    name: 'CPU Cores',
    description: 'Количество ядер процессора',
    passed,
    score: passed ? 100 : 70,
    details: `Обнаружено ${cores} ядер`,
    recommendation: !passed && cores === 1 
      ? '1 ядро выглядит подозрительно. Настройте 4-8 ядер в антидетекте.' 
      : null,
  };
}

// Check device memory
export function checkDeviceMemory(memory: number): FingerprintCheck {
  // Common values in GB
  const commonMemory = [4, 8, 16, 32];
  const passed = commonMemory.includes(memory);
  
  return {
    id: 'memory',
    name: 'Device Memory',
    description: 'Объём оперативной памяти',
    passed,
    score: passed ? 100 : 70,
    details: `${memory} GB RAM`,
    recommendation: null,
  };
}

// Run all fingerprint checks
export function runFingerprintChecks(params: {
  canvasHash?: string;
  webglVendor?: string;
  webglRenderer?: string;
  webrtcRealIP?: string;
  proxyIP?: string;
  browserTimezone: string;
  proxyTimezone: string;
  languageTimezone?: string;
  browserLanguage: string;
  proxyCountry: string;
  fonts: string[];
  os: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  userAgent: string;
  browser: string;
  cpuCores: number;
  deviceMemory: number;
}): FingerprintResult {
  const checks: FingerprintCheck[] = [
    checkCanvasFingerprint(params.canvasHash),
    checkWebGL(params.webglVendor, params.webglRenderer),
    checkWebRTCLeak(params.webrtcRealIP, params.proxyIP),
    checkAudioFingerprint(undefined), // Would need actual audio context check
    checkTimezone(params.browserTimezone, params.proxyTimezone, params.languageTimezone),
    checkLanguage(params.browserLanguage, params.proxyCountry),
    checkFonts(params.fonts, params.os),
    checkScreenResolution(params.screenWidth, params.screenHeight, params.devicePixelRatio),
    checkUserAgent(params.userAgent, params.os, params.browser),
    checkHardwareConcurrency(params.cpuCores),
    checkDeviceMemory(params.deviceMemory),
  ];
  
  const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
  const overallScore = Math.round(totalScore / checks.length);
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (overallScore >= 80) riskLevel = 'low';
  else if (overallScore >= 60) riskLevel = 'medium';
  else if (overallScore >= 40) riskLevel = 'high';
  else riskLevel = 'critical';
  
  const recommendations = checks
    .filter(c => c.recommendation)
    .map(c => c.recommendation as string);
  
  // Check for critical issues
  const criticalIssues = checks.filter(c => c.score === 0);
  const isUnique = overallScore >= 70 && criticalIssues.length === 0;
  
  return {
    overallScore,
    riskLevel,
    checks,
    recommendations,
    isUnique,
  };
}

// Get risk color
export function getRiskColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'low': return '#00D26A';
    case 'medium': return '#FFB800';
    case 'high': return '#FF6B35';
    case 'critical': return '#FF4D4D';
  }
}

// Get risk label
export function getRiskLabel(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'low': return 'Низкий риск';
    case 'medium': return 'Средний риск';
    case 'high': return 'Высокий риск';
    case 'critical': return 'Критический риск';
  }
}
