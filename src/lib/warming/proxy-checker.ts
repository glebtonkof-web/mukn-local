// Proxy validation utilities
// Based on 2026 research for safe proxy usage

export interface ProxyCheck {
  id: string;
  name: string;
  passed: boolean;
  score: number;
  details: string;
  recommendation: string | null;
}

export interface ProxyValidationResult {
  overallScore: number;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'dangerous';
  checks: ProxyCheck[];
  warnings: string[];
  isSafe: boolean;
  proxyType: 'mobile' | 'residential' | 'datacenter' | 'unknown';
  country: string;
  city: string | null;
  isp: string | null;
}

// Check proxy type by IP characteristics
export function detectProxyType(
  ip: string,
  asn?: string,
  isp?: string
): 'mobile' | 'residential' | 'datacenter' | 'unknown' {
  // Mobile indicators
  const mobileKeywords = ['mobile', 'cellular', 'lte', '4g', '5g', 'gsm', 'telecom'];
  const mobileASNs = ['AS...', 'AS...']; // Would have real mobile ASNs
  
  // Datacenter indicators
  const datacenterKeywords = [
    'datacenter', 'server', 'cloud', 'hosting', 'vps', 'dedicated',
    'aws', 'azure', 'gcp', 'digitalocean', 'linode', 'vultr', 'hetzner',
    'ovh', 'leaseweb', 'softlayer', 'ibm', 'amazon', 'microsoft',
  ];
  
  // Residential indicators
  const residentialKeywords = ['residential', 'home', 'consumer', 'dsl', 'cable', 'fiber'];
  
  const ispLower = (isp || '').toLowerCase();
  const asnLower = (asn || '').toLowerCase();
  
  if (mobileKeywords.some(k => ispLower.includes(k) || asnLower.includes(k))) {
    return 'mobile';
  }
  
  if (datacenterKeywords.some(k => ispLower.includes(k) || asnLower.includes(k))) {
    return 'datacenter';
  }
  
  if (residentialKeywords.some(k => ispLower.includes(k) || asnLower.includes(k))) {
    return 'residential';
  }
  
  return 'unknown';
}

// Check if proxy type matches platform requirements
export function checkProxyTypeCompatibility(
  proxyType: 'mobile' | 'residential' | 'datacenter' | 'unknown',
  platform: string
): ProxyCheck {
  const platformRequirements: Record<string, {
    recommended: ('mobile' | 'residential')[];
    allowed: ('mobile' | 'residential' | 'datacenter')[];
  }> = {
    instagram: { recommended: ['mobile', 'residential'], allowed: ['mobile', 'residential'] },
    tiktok: { recommended: ['mobile'], allowed: ['mobile', 'residential'] },
    telegram: { recommended: ['residential', 'mobile'], allowed: ['mobile', 'residential'] },
    facebook: { recommended: ['residential', 'mobile'], allowed: ['mobile', 'residential'] },
    x: { recommended: ['residential', 'mobile'], allowed: ['mobile', 'residential'] },
    linkedin: { recommended: ['residential'], allowed: ['mobile', 'residential'] },
  };
  
  const req = platformRequirements[platform.toLowerCase()] || { recommended: ['residential'], allowed: ['mobile', 'residential'] };
  
  const isRecommended = req.recommended.includes(proxyType as 'mobile' | 'residential');
  const isAllowed = req.allowed.includes(proxyType as 'mobile' | 'residential') || proxyType === 'unknown';
  
  let score = 0;
  if (isRecommended) score = 100;
  else if (isAllowed) score = 50;
  else score = 0;
  
  return {
    id: 'proxy_type',
    name: 'Тип прокси',
    passed: isAllowed,
    score,
    details: `Тип: ${proxyType}. Рекомендуется для ${platform}: ${req.recommended.join(' или ')}`,
    recommendation: !isAllowed 
      ? `ОПАСНО: Дата-центр прокси для ${platform} почти всегда приводят к бану. Используйте мобильные или резидентные.` 
      : !isRecommended 
        ? 'Тип прокси допустим, но не рекомендуется. Мобильные прокси дают лучший результат.' 
        : null,
  };
}

// Check WebRTC leak
export function checkProxyWebRTCLeak(
  realIP: string | undefined,
  proxyIP: string
): ProxyCheck {
  const hasLeak = realIP && realIP !== proxyIP;
  
  return {
    id: 'webrtc_leak',
    name: 'WebRTC утечка',
    passed: !hasLeak,
    score: !hasLeak ? 100 : 0,
    details: hasLeak 
      ? `КРИТИЧНО: Реальный IP утечёт через WebRTC: ${realIP}` 
      : 'WebRTC утечек не обнаружено',
    recommendation: hasLeak 
      ? 'Отключите WebRTC в браузере или используйте антидетект с защитой от WebRTC утечек' 
      : null,
  };
}

// Check DNS leak
export function checkDNSLeak(
  dnsIP: string | undefined,
  proxyIP: string,
  expectedCountry: string
): ProxyCheck {
  const hasLeak = dnsIP && dnsIP !== proxyIP;
  
  return {
    id: 'dns_leak',
    name: 'DNS утечка',
    passed: !hasLeak,
    score: !hasLeak ? 100 : 0,
    details: hasLeak 
      ? `DNS запросы идут через другой IP: ${dnsIP}` 
      : 'DNS утечек не обнаружено',
    recommendation: hasLeak 
      ? 'Настройте DNS через прокси или используйте DNS сервер в той же стране' 
      : null,
  };
}

// Check geolocation consistency
export function checkProxyGeolocation(
  proxyCountry: string,
  expectedCountry: string,
  accountPhoneCountry?: string,
  accountLanguage?: string
): ProxyCheck {
  const countryMatches = proxyCountry.toLowerCase() === expectedCountry.toLowerCase();
  const phoneMatches = !accountPhoneCountry || proxyCountry.toLowerCase() === accountPhoneCountry.toLowerCase();
  
  // Language to country mapping
  const languageCountries: Record<string, string[]> = {
    'ru': ['RU', 'BY', 'KZ', 'KG', 'UA'],
    'en': ['US', 'GB', 'CA', 'AU', 'NZ'],
    'de': ['DE', 'AT', 'CH'],
    'fr': ['FR', 'BE', 'CA', 'CH'],
    'es': ['ES', 'MX', 'AR', 'CO', 'CL'],
  };
  
  let languageMatches = true;
  if (accountLanguage) {
    const langCode = accountLanguage.split('-')[0].toLowerCase();
    const countries = languageCountries[langCode] || [];
    languageMatches = countries.length === 0 || countries.includes(proxyCountry.toUpperCase());
  }
  
  const passed = countryMatches && phoneMatches && languageMatches;
  
  let details = `Страна прокси: ${proxyCountry}`;
  if (!countryMatches) details += ` (ожидалось: ${expectedCountry})`;
  if (!phoneMatches && accountPhoneCountry) details += ` | Телефон: ${accountPhoneCountry}`;
  if (!languageMatches && accountLanguage) details += ` | Язык: ${accountLanguage}`;
  
  return {
    id: 'geolocation',
    name: 'Геолокация',
    passed,
    score: passed ? 100 : countryMatches ? 50 : 0,
    details,
    recommendation: !passed 
      ? 'Геолокация прокси должна совпадать с настройками аккаунта (телефон, язык, часовой пояс)' 
      : null,
  };
}

// Check proxy quality/score
export function checkProxyQuality(
  fraudScore: number | undefined,
  abuseScore: number | undefined
): ProxyCheck {
  const hasGoodScore = !fraudScore || fraudScore < 30;
  const hasLowAbuse = !abuseScore || abuseScore < 20;
  
  const passed = hasGoodScore && hasLowAbuse;
  let score = 100;
  if (fraudScore && fraudScore >= 70) score = 0;
  else if (fraudScore && fraudScore >= 50) score = 30;
  else if (fraudScore && fraudScore >= 30) score = 60;
  
  return {
    id: 'quality',
    name: 'Качество прокси',
    passed,
    score,
    details: fraudScore 
      ? `Fraud Score: ${fraudScore}/100${abuseScore ? ` | Abuse Score: ${abuseScore}` : ''}` 
      : 'Проверка качества недоступна',
    recommendation: !passed 
      ? 'Прокси имеет высокий fraud score. Возможно, он уже в blacklist платформ.' 
      : null,
  };
}

// Check if IP is blacklisted
export function checkBlacklist(
  blacklistCount: number | undefined
): ProxyCheck {
  const passed = !blacklistCount || blacklistCount < 3;
  
  let score = 100;
  if (blacklistCount) {
    if (blacklistCount >= 10) score = 0;
    else if (blacklistCount >= 5) score = 30;
    else if (blacklistCount >= 3) score = 60;
  }
  
  return {
    id: 'blacklist',
    name: 'Blacklist проверка',
    passed,
    score,
    details: blacklistCount !== undefined 
      ? `Найдено в ${blacklistCount} blacklist базах` 
      : 'Проверка blacklist недоступна',
    recommendation: !passed 
      ? 'IP находится в blacklist. Рекомендуется сменить прокси.' 
      : null,
  };
}

// Check proxy speed
export function checkProxySpeed(
  latencyMs: number | undefined,
  downloadSpeed: number | undefined // Mbps
): ProxyCheck {
  const hasGoodLatency = !latencyMs || latencyMs < 500;
  const hasGoodSpeed = !downloadSpeed || downloadSpeed > 5;
  
  let score = 100;
  if (latencyMs) {
    if (latencyMs > 2000) score = Math.max(score - 50, 30);
    else if (latencyMs > 1000) score = Math.max(score - 30, 50);
    else if (latencyMs > 500) score = Math.max(score - 10, 70);
  }
  
  if (downloadSpeed) {
    if (downloadSpeed < 1) score = Math.max(score - 40, 20);
    else if (downloadSpeed < 5) score = Math.max(score - 20, 40);
  }
  
  const passed = hasGoodLatency && hasGoodSpeed;
  
  let details = '';
  if (latencyMs) details += `Latency: ${latencyMs}ms`;
  if (downloadSpeed) details += `${details ? ' | ' : ''}Speed: ${downloadSpeed} Mbps`;
  if (!details) details = 'Проверка скорости недоступна';
  
  return {
    id: 'speed',
    name: 'Скорость',
    passed,
    score,
    details,
    recommendation: !passed 
      ? 'Низкая скорость прокси может повлиять на поведение (медленная работа = признак бота)' 
      : null,
  };
}

// Check proxy uniqueness (one account = one proxy)
export function checkProxyUniqueness(
  accountsUsingSameIP: number
): ProxyCheck {
  const passed = accountsUsingSameIP <= 1;
  
  let score = 100;
  if (accountsUsingSameIP > 5) score = 0;
  else if (accountsUsingSameIP > 3) score = 30;
  else if (accountsUsingSameIP > 1) score = 50;
  
  return {
    id: 'uniqueness',
    name: 'Уникальность',
    passed,
    score,
    details: accountsUsingSameIP === 0 
      ? 'Прокси не используется другими аккаунтами' 
      : `Прокси используется ${accountsUsingSameIP} аккаунтами`,
    recommendation: !passed 
      ? 'Один аккаунт = один выделенный прокси. Не ротируйте прокси между аккаунтами.' 
      : null,
  };
}

// Run all proxy checks
export function runProxyChecks(params: {
  ip: string;
  proxyType?: 'mobile' | 'residential' | 'datacenter' | 'unknown';
  platform: string;
  realIP?: string;
  dnsIP?: string;
  proxyCountry: string;
  expectedCountry: string;
  accountPhoneCountry?: string;
  accountLanguage?: string;
  fraudScore?: number;
  abuseScore?: number;
  blacklistCount?: number;
  latencyMs?: number;
  downloadSpeed?: number;
  accountsUsingSameIP: number;
  asn?: string;
  isp?: string;
}): ProxyValidationResult {
  const proxyType = params.proxyType || detectProxyType(params.ip, params.asn, params.isp);
  
  const checks: ProxyCheck[] = [
    checkProxyTypeCompatibility(proxyType, params.platform),
    checkProxyWebRTCLeak(params.realIP, params.ip),
    checkDNSLeak(params.dnsIP, params.ip, params.expectedCountry),
    checkProxyGeolocation(
      params.proxyCountry,
      params.expectedCountry,
      params.accountPhoneCountry,
      params.accountLanguage
    ),
    checkProxyQuality(params.fraudScore, params.abuseScore),
    checkBlacklist(params.blacklistCount),
    checkProxySpeed(params.latencyMs, params.downloadSpeed),
    checkProxyUniqueness(params.accountsUsingSameIP),
  ];
  
  const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
  const overallScore = Math.round(totalScore / checks.length);
  
  let quality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'dangerous';
  if (overallScore >= 90) quality = 'excellent';
  else if (overallScore >= 75) quality = 'good';
  else if (overallScore >= 50) quality = 'acceptable';
  else if (overallScore >= 30) quality = 'poor';
  else quality = 'dangerous';
  
  const criticalChecks = checks.filter(c => c.score === 0);
  const isSafe = criticalChecks.length === 0 && overallScore >= 50;
  
  const warnings = checks
    .filter(c => c.recommendation)
    .map(c => c.recommendation as string);
  
  return {
    overallScore,
    quality,
    checks,
    warnings,
    isSafe,
    proxyType,
    country: params.proxyCountry,
    city: null, // Would be filled from geo data
    isp: params.isp || null,
  };
}

// Get quality color
export function getQualityColor(
  quality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'dangerous'
): string {
  switch (quality) {
    case 'excellent': return '#00D26A';
    case 'good': return '#8ED163';
    case 'acceptable': return '#FFB800';
    case 'poor': return '#FF6B35';
    case 'dangerous': return '#FF4D4D';
  }
}

// Get quality label
export function getQualityLabel(
  quality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'dangerous'
): string {
  switch (quality) {
    case 'excellent': return 'Отличное';
    case 'good': return 'Хорошее';
    case 'acceptable': return 'Приемлемое';
    case 'poor': return 'Плохое';
    case 'dangerous': return 'Опасное';
  }
}
