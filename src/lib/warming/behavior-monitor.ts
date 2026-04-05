// Behavioral pattern monitoring utilities
// Based on 2026 research for human-like behavior simulation

export interface BehaviorPattern {
  type: string;
  name: string;
  description: string;
  isSuspicious: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface SessionActivity {
  timestamp: Date;
  action: 'like' | 'follow' | 'comment' | 'post' | 'dm' | 'view' | 'scroll';
  target?: string;
  duration?: number; // seconds
}

export interface BehaviorAnalysis {
  overallRisk: number; // 0-100
  patterns: BehaviorPattern[];
  recommendations: string[];
  isHumanLike: boolean;
  sessionScore: number;
}

// Check for perfectly equal intervals (bot behavior)
export function checkIntervalPattern(
  actions: SessionActivity[]
): BehaviorPattern {
  if (actions.length < 3) {
    return {
      type: 'intervals',
      name: 'Интервалы между действиями',
      description: 'Недостаточно данных для анализа',
      isSuspicious: false,
      severity: 'low',
      suggestion: 'Продолжайте работу для анализа паттернов',
    };
  }
  
  const intervals: number[] = [];
  for (let i = 1; i < actions.length; i++) {
    const diff = actions[i].timestamp.getTime() - actions[i-1].timestamp.getTime();
    intervals.push(diff / 1000); // seconds
  }
  
  // Check for equal intervals
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  
  // If standard deviation is very low, intervals are too equal
  const isSuspicious = stdDev < 2 && intervals.length > 5; // Less than 2 seconds variance
  
  return {
    type: 'intervals',
    name: 'Интервалы между действиями',
    description: isSuspicious 
      ? `Подозрительно равные интервалы: ~${Math.round(avgInterval)}с (отклонение: ${stdDev.toFixed(1)}с)` 
      : `Нормальное распределение интервалов: среднее ${Math.round(avgInterval)}с`,
    isSuspicious,
    severity: isSuspicious ? 'critical' : 'low',
    suggestion: isSuspicious 
      ? 'Рандомизируйте паузы: 5-20 секунд, иногда 45 секунд. Никогда не делайте одинаковые паузы.' 
      : 'Продолжайте рандомизировать паузы',
  };
}

// Check for activity spikes
export function checkActivitySpikes(
  actions: SessionActivity[],
  spikeThreshold: number = 20
): BehaviorPattern {
  // Group actions by hour
  const hourlyActions: Record<number, number> = {};
  
  actions.forEach(action => {
    const hour = action.timestamp.getHours();
    hourlyActions[hour] = (hourlyActions[hour] || 0) + 1;
  });
  
  const maxActions = Math.max(...Object.values(hourlyActions));
  const avgActions = Object.values(hourlyActions).reduce((a, b) => a + b, 0) / Object.keys(hourlyActions).length;
  
  const hasSpike = maxActions > avgActions * 3 || maxActions > spikeThreshold;
  
  const spikeHours = Object.entries(hourlyActions)
    .filter(([_, count]) => count > spikeThreshold)
    .map(([hour]) => hour);
  
  return {
    type: 'spikes',
    name: 'Пики активности',
    description: hasSpike 
      ? `Обнаружены пики в ${spikeHours.map(h => `${h}:00`).join(', ')} (${maxActions} действий/час)` 
      : 'Активность распределена равномерно',
    isSuspicious: hasSpike,
    severity: hasSpike ? 'high' : 'low',
    suggestion: hasSpike 
      ? 'Избегайте резких пиков активности. Распределите действия на несколько сессий с перерывами 2-3 часа.' 
      : 'Продолжайте равномерно распределять активность',
  };
}

// Check for off-hours activity
export function checkOffHoursActivity(
  actions: SessionActivity[],
  timezone: string = 'Europe/Moscow',
  workStart: number = 8,
  workEnd: number = 23
): BehaviorPattern {
  const offHoursActions = actions.filter(action => {
    const hour = action.timestamp.getHours();
    return hour < workStart || hour >= workEnd;
  });
  
  const offHoursPercentage = (offHoursActions.length / actions.length) * 100;
  const isSuspicious = offHoursPercentage > 30;
  
  return {
    type: 'off_hours',
    name: 'Активность в нерабочее время',
    description: isSuspicious 
      ? `${Math.round(offHoursPercentage)}% активности в нерабочее время (${workStart}:00-${workEnd}:00)` 
      : 'Активность в разумных часах',
    isSuspicious,
    severity: isSuspicious ? 'medium' : 'low',
    suggestion: isSuspicious 
      ? `Уменьшите активность в ночное время (${workEnd}:00-${workStart}:00 по местному времени аккаунта).` 
      : 'Часы активности выглядят естественно',
  };
}

// Check for single-type actions
export function checkActionDiversity(
  actions: SessionActivity[]
): BehaviorPattern {
  const actionCounts: Record<string, number> = {};
  
  actions.forEach(action => {
    actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
  });
  
  const actionTypes = Object.keys(actionCounts);
  const totalActions = actions.length;
  
  // Check if one action type dominates (>80%)
  const dominantAction = Object.entries(actionCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  const dominantPercentage = dominantAction ? (dominantAction[1] / totalActions) * 100 : 0;
  
  const isSuspicious = actionTypes.length < 3 || dominantPercentage > 80;
  
  return {
    type: 'diversity',
    name: 'Разнообразие действий',
    description: isSuspicious 
      ? `Доминирует "${dominantAction?.[0]}" (${Math.round(dominantPercentage)}%). Типов действий: ${actionTypes.length}` 
      : `Сбалансированные действия: ${actionTypes.map(t => `${t}(${actionCounts[t]})`).join(', ')}`,
    isSuspicious,
    severity: isSuspicious ? 'medium' : 'low',
    suggestion: isSuspicious 
      ? 'Добавляйте "человечные" действия: иногда пролистывайте пост без лайка, заходите в профиль автора, смотрите Stories.' 
      : 'Разнообразие действий в норме',
  };
}

// Check for scroll/view behavior
export function checkViewBehavior(
  actions: SessionActivity[]
): BehaviorPattern {
  const views = actions.filter(a => a.action === 'view' || a.action === 'scroll');
  const likes = actions.filter(a => a.action === 'like');
  
  const viewToLikeRatio = likes.length > 0 ? views.length / likes.length : views.length;
  
  // Humans view many posts before liking one
  const isNatural = viewToLikeRatio > 3 || views.length > likes.length * 2;
  
  return {
    type: 'view_behavior',
    name: 'Поведение просмотра',
    description: isNatural 
      ? `Естественное соотношение: ${views.length} просмотров к ${likes.length} лайкам` 
      : `Подозрительно: лайков почти столько же, сколько просмотров`,
    isSuspicious: !isNatural,
    severity: !isNatural ? 'high' : 'low',
    suggestion: !isNatural 
      ? 'Смотрите больше контента без лайков. Реальные пользователи просматривают много постов, лайкают единицы.' 
      : 'Поведение просмотра естественно',
  };
}

// Check session duration
export function checkSessionDuration(
  sessions: { start: Date; end: Date }[]
): BehaviorPattern {
  if (sessions.length === 0) {
    return {
      type: 'session',
      name: 'Длительность сессий',
      description: 'Нет данных о сессиях',
      isSuspicious: false,
      severity: 'low',
      suggestion: 'Начните работу для анализа сессий',
    };
  }
  
  const durations = sessions.map(s => 
    (s.end.getTime() - s.start.getTime()) / 1000 / 60 // minutes
  );
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  
  // Humans typically have 15-45 minute sessions
  const isNatural = avgDuration >= 10 && avgDuration <= 60;
  
  return {
    type: 'session',
    name: 'Длительность сессий',
    description: `Средняя сессия: ${Math.round(avgDuration)} мин`,
    isSuspicious: !isNatural,
    severity: !isNatural ? 'medium' : 'low',
    suggestion: !isNatural 
      ? avgDuration < 10 
        ? 'Сессии слишком короткие. Проводите в приложении 15-45 минут за раз.' 
        : 'Сессии слишком длинные. Делайте перерывы каждые 30-45 минут.' 
      : 'Длительность сессий естественна',
  };
}

// Check number of sessions per day
export function checkSessionFrequency(
  sessionsPerDay: number
): BehaviorPattern {
  const isNatural = sessionsPerDay >= 2 && sessionsPerDay <= 5;
  
  return {
    type: 'frequency',
    name: 'Частота сессий',
    description: `${sessionsPerDay} сессий в день`,
    isSuspicious: !isNatural,
    severity: !isNatural ? 'medium' : 'low',
    suggestion: !isNatural 
      ? sessionsPerDay < 2 
        ? 'Слишком мало сессий. Заходите в приложение 2-4 раза в день.' 
        : 'Слишком много сессий. 2-4 сессии в день выглядят более естественно.' 
      : 'Частота сессий в норме',
  };
}

// Analyze all behavior patterns
export function analyzeBehaviorPatterns(params: {
  actions: SessionActivity[];
  sessions: { start: Date; end: Date }[];
  timezone?: string;
  sessionsPerDay: number;
}): BehaviorAnalysis {
  const patterns: BehaviorPattern[] = [
    checkIntervalPattern(params.actions),
    checkActivitySpikes(params.actions),
    checkOffHoursActivity(params.actions, params.timezone),
    checkActionDiversity(params.actions),
    checkViewBehavior(params.actions),
    checkSessionDuration(params.sessions),
    checkSessionFrequency(params.sessionsPerDay),
  ];
  
  // Calculate risk score
  const suspiciousPatterns = patterns.filter(p => p.isSuspicious);
  let riskScore = 0;
  
  suspiciousPatterns.forEach(p => {
    switch (p.severity) {
      case 'critical': riskScore += 40; break;
      case 'high': riskScore += 25; break;
      case 'medium': riskScore += 15; break;
      case 'low': riskScore += 5; break;
    }
  });
  
  const overallRisk = Math.min(100, riskScore);
  
  // Session score (inverse of risk for sessions)
  const sessionScore = Math.max(0, 100 - overallRisk);
  
  // Is human-like if risk is low
  const isHumanLike = overallRisk < 30;
  
  // Get recommendations
  const recommendations = suspiciousPatterns
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .map(p => p.suggestion);
  
  return {
    overallRisk,
    patterns,
    recommendations,
    isHumanLike,
    sessionScore,
  };
}

// Generate random delay (human-like)
export function generateHumanDelay(
  minSeconds: number = 5,
  maxSeconds: number = 20
): number {
  // Use a weighted random distribution
  // Most delays should be in the middle range
  
  const range = maxSeconds - minSeconds;
  
  // Generate using beta distribution approximation
  const u1 = Math.random();
  const u2 = Math.random();
  
  // Box-Muller transform for normal-ish distribution
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Map to our range (centered at 0.5)
  const normalized = 0.5 + normal * 0.15;
  const clamped = Math.max(0, Math.min(1, normalized));
  
  // Occasionally add a long pause (10% chance)
  if (Math.random() < 0.1) {
    return minSeconds + range * 0.8 + Math.random() * 25; // Long pause
  }
  
  return minSeconds + range * clamped;
}

// Generate session schedule for the day
export function generateSessionSchedule(
  sessionsCount: number = 3,
  timezone: string = 'Europe/Moscow'
): { start: Date; end: Date }[] {
  const now = new Date();
  const sessions: { start: Date; end: Date }[] = [];
  
  // Define waking hours (8:00 - 23:00)
  const startHour = 8;
  const endHour = 23;
  const availableHours = endHour - startHour;
  
  // Divide available hours into slots
  const slotSize = availableHours / sessionsCount;
  
  for (let i = 0; i < sessionsCount; i++) {
    const slotStart = startHour + i * slotSize;
    const slotEnd = slotStart + slotSize;
    
    // Random start within slot (first 70%)
    const sessionStartHour = slotStart + Math.random() * (slotSize * 0.7);
    const sessionStartMinute = Math.floor(Math.random() * 60);
    
    // Session duration: 15-45 minutes
    const duration = 15 + Math.random() * 30;
    
    const start = new Date(now);
    start.setHours(Math.floor(sessionStartHour), sessionStartMinute, 0, 0);
    
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);
    
    sessions.push({ start, end });
  }
  
  return sessions;
}

// Get risk level label
export function getRiskLevel(risk: number): 'low' | 'medium' | 'high' | 'critical' {
  if (risk < 20) return 'low';
  if (risk < 50) return 'medium';
  if (risk < 75) return 'high';
  return 'critical';
}

// Get risk level color
export function getRiskLevelColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'low': return '#00D26A';
    case 'medium': return '#FFB800';
    case 'high': return '#FF6B35';
    case 'critical': return '#FF4D4D';
  }
}
