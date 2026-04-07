/**
 * Behavior Simulator for Human-like Account Warming
 * Provides utilities to randomize timing, simulate human behavior patterns
 */

// Types for behavior simulation
export interface MouseMovement {
  x: number;
  y: number;
  timestamp: number;
  type: 'move' | 'click' | 'scroll';
}

export interface ReadingPattern {
  wordsPerMinute: number;
  pauseProbability: number;
  scrollBehavior: 'smooth' | 'jump' | 'natural';
}

export interface TypingPattern {
  charsPerMinute: number;
  errorRate: number;
  pauseBetweenWords: number; // ms
  pauseBetweenSentences: number; // ms
}

export interface SessionSchedule {
  startTime: Date;
  endTime: Date;
  actions: ScheduledAction[];
}

export interface ScheduledAction {
  action: string;
  scheduledTime: Date;
  variance: number; // seconds
}

// Default human-like patterns
const DEFAULT_READING_PATTERN: ReadingPattern = {
  wordsPerMinute: 200,
  pauseProbability: 0.15,
  scrollBehavior: 'natural',
};

const DEFAULT_TYPING_PATTERN: TypingPattern = {
  charsPerMinute: 180,
  errorRate: 0.02,
  pauseBetweenWords: 150,
  pauseBetweenSentences: 400,
};

/**
 * Generate random delay between min and max milliseconds
 * Uses weighted distribution to favor middle values
 */
export function randomDelay(minMs: number, maxMs: number): number {
  // Use weighted random for more natural distribution
  const range = maxMs - minMs;
  const random = Math.random();
  // Apply sine function to weight towards middle
  const weighted = Math.sin(random * Math.PI) * 0.5 + 0.5;
  return Math.floor(minMs + weighted * range);
}

/**
 * Generate exponential backoff delay for retries
 */
export function exponentialBackoff(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 60000
): number {
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Simulate typing speed for a given text
 * Returns the total time in milliseconds
 */
export function simulateTyping(
  text: string,
  pattern: TypingPattern = DEFAULT_TYPING_PATTERN
): number {
  const words = text.split(/\s+/);
  const chars = text.length;

  // Base typing time
  const baseTime = (chars / pattern.charsPerMinute) * 60000;

  // Add time for pauses between words
  const wordPauses = words.length * pattern.pauseBetweenWords;

  // Add time for pauses between sentences (., !, ?)
  const sentenceCount = (text.match(/[.!?]/g) || []).length;
  const sentencePauses = sentenceCount * pattern.pauseBetweenSentences;

  // Add random variance (±20%)
  const variance = baseTime * (0.8 + Math.random() * 0.4);

  return Math.floor(baseTime + wordPauses + sentencePauses + variance);
}

/**
 * Simulate reading time for content
 * Returns time in milliseconds
 */
export function simulateReading(
  content: string,
  pattern: ReadingPattern = DEFAULT_READING_PATTERN
): number {
  const words = content.split(/\s+/).length;

  // Base reading time
  const baseTime = (words / pattern.wordsPerMinute) * 60000;

  // Add random pauses
  const pauseCount = Math.floor(words * pattern.pauseProbability);
  const pauseTime = pauseCount * randomDelay(500, 3000);

  // Add variance (±30%)
  const variance = baseTime * (0.7 + Math.random() * 0.6);

  return Math.floor(baseTime + pauseTime + variance);
}

/**
 * Simulate mouse movements between two points
 * Returns array of movement points
 */
export function simulateMouseMovements(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps: number = 10
): MouseMovement[] {
  const movements: MouseMovement[] = [];
  const now = Date.now();

  // Bezier curve control points for natural movement
  const cp1x = startX + (endX - startX) * 0.25 + (Math.random() - 0.5) * 50;
  const cp1y = startY + (endY - startY) * 0.25 + (Math.random() - 0.5) * 50;
  const cp2x = startX + (endX - startX) * 0.75 + (Math.random() - 0.5) * 50;
  const cp2y = startY + (endY - startY) * 0.75 + (Math.random() - 0.5) * 50;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    // Cubic bezier curve
    const x = mt3 * startX + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * endX;
    const y = mt3 * startY + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * endY;

    movements.push({
      x: Math.round(x),
      y: Math.round(y),
      timestamp: now + i * randomDelay(10, 30),
      type: 'move',
    });
  }

  // Add final click
  movements.push({
    x: endX,
    y: endY,
    timestamp: now + steps * 20 + randomDelay(50, 150),
    type: 'click',
  });

  return movements;
}

/**
 * Simulate scroll behavior
 * Returns array of scroll positions
 */
export function simulateScroll(
  startScroll: number,
  endScroll: number,
  durationMs: number
): number[] {
  const scrolls: number[] = [];
  const steps = Math.max(5, Math.floor(durationMs / 50));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Ease out cubic for natural deceleration
    const eased = 1 - Math.pow(1 - t, 3);
    const position = Math.round(startScroll + (endScroll - startScroll) * eased);
    scrolls.push(position);
  }

  return scrolls;
}

/**
 * Generate random activity schedule for a day
 */
export function generateRandomSchedule(
  actions: string[],
  startHour: number,
  endHour: number,
  minSessions: number,
  maxSessions: number
): SessionSchedule[] {
  const sessions: SessionSchedule[] = [];
  const sessionCount =
    Math.floor(Math.random() * (maxSessions - minSessions + 1)) + minSessions;

  const totalMinutes = (endHour - startHour) * 60;
  const sessionLength = Math.floor(totalMinutes / sessionCount);

  for (let i = 0; i < sessionCount; i++) {
    const sessionStart = new Date();
    sessionStart.setHours(startHour, 0, 0, 0);
    sessionStart.setMinutes(i * sessionLength + Math.random() * (sessionLength * 0.3));

    const sessionEnd = new Date(sessionStart);
    sessionEnd.setMinutes(
      sessionEnd.getMinutes() + randomDelay(15, 45) / 60000
    );

    // Distribute actions across sessions
    const actionsPerSession = Math.ceil(actions.length / sessionCount);
    const sessionActions: ScheduledAction[] = [];

    for (let j = 0; j < actionsPerSession; j++) {
      const actionIndex = i * actionsPerSession + j;
      if (actionIndex < actions.length) {
        const actionTime = new Date(sessionStart);
        actionTime.setMinutes(
          actionTime.getMinutes() +
            (j / actionsPerSession) * (sessionEnd.getTime() - sessionStart.getTime()) / 60000
        );

        sessionActions.push({
          action: actions[actionIndex],
          scheduledTime: actionTime,
          variance: randomDelay(30, 300) / 1000, // 30-300 seconds variance
        });
      }
    }

    sessions.push({
      startTime: sessionStart,
      endTime: sessionEnd,
      actions: sessionActions,
    });
  }

  return sessions;
}

/**
 * Generate human-like session gaps
 * Returns delay in milliseconds before next session
 */
export function generateSessionGap(): number {
  // Humans typically take breaks of 30-180 minutes between sessions
  const gaps = [
    { min: 1800000, max: 3600000, weight: 0.4 }, // 30-60 min (40%)
    { min: 3600000, max: 7200000, weight: 0.3 }, // 60-120 min (30%)
    { min: 7200000, max: 14400000, weight: 0.2 }, // 2-4 hours (20%)
    { min: 14400000, max: 28800000, weight: 0.1 }, // 4-8 hours (10%)
  ];

  const random = Math.random();
  let cumulative = 0;

  for (const gap of gaps) {
    cumulative += gap.weight;
    if (random <= cumulative) {
      return randomDelay(gap.min, gap.max);
    }
  }

  return randomDelay(gaps[0].min, gaps[0].max);
}

/**
 * Generate time between actions within a session
 */
export function generateActionGap(actionType: string): number {
  // Different actions have different natural delays
  const gaps: Record<string, { min: number; max: number }> = {
    view: { min: 3000, max: 15000 }, // 3-15 seconds to view content
    like: { min: 1000, max: 5000 }, // 1-5 seconds before liking
    comment: { min: 5000, max: 20000 }, // 5-20 seconds to write comment
    follow: { min: 2000, max: 8000 }, // 2-8 seconds before following
    share: { min: 3000, max: 10000 }, // 3-10 seconds to share
    dm: { min: 10000, max: 30000 }, // 10-30 seconds for DM
    post: { min: 30000, max: 120000 }, // 30-120 seconds to create post
    scroll: { min: 500, max: 3000 }, // 0.5-3 seconds between scrolls
    search: { min: 2000, max: 8000 }, // 2-8 seconds to search
    login: { min: 5000, max: 15000 }, // 5-15 seconds to login
  };

  const gap = gaps[actionType] || { min: 2000, max: 5000 };
  return randomDelay(gap.min, gap.max);
}

/**
 * Simulate decision making time
 * Accounts for cognitive load and hesitation
 */
export function simulateDecisionTime(
  complexity: 'simple' | 'medium' | 'complex'
): number {
  const times = {
    simple: { min: 500, max: 2000 }, // Simple decisions: 0.5-2 seconds
    medium: { min: 2000, max: 8000 }, // Medium decisions: 2-8 seconds
    complex: { min: 5000, max: 20000 }, // Complex decisions: 5-20 seconds
  };

  return randomDelay(times[complexity].min, times[complexity].max);
}

/**
 * Generate natural activity burst pattern
 * Humans often do several actions in quick succession then pause
 */
export function generateBurstPattern(
  totalActions: number
): { actionsInBurst: number; pauseAfterBurst: number }[] {
  const bursts: { actionsInBurst: number; pauseAfterBurst: number }[] = [];
  let remaining = totalActions;

  while (remaining > 0) {
    // Generate burst size (2-5 actions typically)
    const burstSize = Math.min(
      remaining,
      Math.floor(Math.random() * 4) + 2
    );

    // Generate pause after burst (10-60 seconds)
    const pause = randomDelay(10000, 60000);

    bursts.push({
      actionsInBurst: burstSize,
      pauseAfterBurst: pause,
    });

    remaining -= burstSize;
  }

  return bursts;
}

/**
 * Check if current time is within active hours
 */
export function isActiveTime(
  startHour: number,
  endHour: number,
  currentTime: Date = new Date()
): boolean {
  const currentHour = currentTime.getHours();
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Get next active time
 */
export function getNextActiveTime(
  startHour: number,
  endHour: number,
  currentTime: Date = new Date()
): Date {
  const next = new Date(currentTime);

  if (currentTime.getHours() >= endHour) {
    // After active hours, schedule for next day
    next.setDate(next.getDate() + 1);
    next.setHours(startHour, 0, 0, 0);
  } else if (currentTime.getHours() < startHour) {
    // Before active hours, schedule for today
    next.setHours(startHour, 0, 0, 0);
  } else {
    // Within active hours, add small random delay
    next.setMinutes(next.getMinutes() + Math.floor(Math.random() * 30));
  }

  return next;
}

/**
 * Add random human-like jitter to scheduled time
 */
export function addJitter(scheduledTime: Date, maxJitterSeconds: number): Date {
  const jitter = (Math.random() - 0.5) * 2 * maxJitterSeconds * 1000;
  return new Date(scheduledTime.getTime() + jitter);
}

/**
 * Simulate network latency
 */
export function simulateNetworkLatency(): number {
  // Real network latency follows a log-normal distribution
  const base = 50 + Math.random() * 100; // 50-150ms base
  const spike = Math.random() < 0.1 ? Math.random() * 500 : 0; // 10% chance of spike
  return Math.floor(base + spike);
}

/**
 * Export types
 */
export type {
  MouseMovement,
  ReadingPattern,
  TypingPattern,
  SessionSchedule,
  ScheduledAction,
};
