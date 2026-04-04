// TTS Hook - Голосовые подсказки с использованием z-ai-web-dev-sdk
// Поддержка голосов, скоростей, сохранение в audio buffer

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Типы голосов
export type VoiceGender = 'male' | 'female';
export type VoiceProvider = 'google' | 'elevenlabs' | 'default';

export interface Voice {
  id: string;
  name: string;
  gender: VoiceGender;
  language: string;
  provider: VoiceProvider;
  description?: string;
}

export interface TTSOptions {
  voice?: string;
  speed?: number; // 0.5 - 2.0
  provider?: VoiceProvider;
}

export interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentText: string | null;
  progress: number; // 0-100
}

export interface TTSStats {
  totalPlayed: number;
  totalDuration: number;
  charactersProcessed: number;
}

// Доступные голоса
export const AVAILABLE_VOICES: Voice[] = [
  // Google голоса
  { id: 'female_23', name: 'Женский (молодой)', gender: 'female', language: 'ru', provider: 'google', description: 'Приятный женский голос' },
  { id: 'female_25', name: 'Женский (средний)', gender: 'female', language: 'ru', provider: 'google', description: 'Спокойный женский голос' },
  { id: 'female_30', name: 'Женский (зрелый)', gender: 'female', language: 'ru', provider: 'google', description: 'Деловой женский голос' },
  { id: 'male_25', name: 'Мужской (молодой)', gender: 'male', language: 'ru', provider: 'google', description: 'Энергичный мужской голос' },
  { id: 'male_30', name: 'Мужской (зрелый)', gender: 'male', language: 'ru', provider: 'google', description: 'Уверенный мужской голос' },
  // ElevenLabs голоса (premium)
  { id: 'rachel', name: 'Rachel', gender: 'female', language: 'en', provider: 'elevenlabs', description: 'Natural female voice' },
  { id: 'domi', name: 'Domi', gender: 'female', language: 'en', provider: 'elevenlabs', description: 'Young female voice' },
  { id: 'bella', name: 'Bella', gender: 'female', language: 'en', provider: 'elevenlabs', description: 'Soft female voice' },
  { id: 'antoni', name: 'Antoni', gender: 'male', language: 'en', provider: 'elevenlabs', description: 'Deep male voice' },
  { id: 'josh', name: 'Josh', gender: 'male', language: 'en', provider: 'elevenlabs', description: 'Narrator male voice' },
];

// Дефолтные настройки
const DEFAULT_VOICE = 'female_23';
const DEFAULT_SPEED = 1.0;

/**
 * Хук для работы с TTS (Text-to-Speech)
 */
export function useTTS() {
  // Состояние
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isLoading: false,
    error: null,
    currentText: null,
    progress: 0,
  });

  // Настройки
  const [settings, setSettings] = useState<TTSOptions>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tts_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return {
      voice: DEFAULT_VOICE,
      speed: DEFAULT_SPEED,
      provider: 'google' as VoiceProvider,
    };
  });

  // Статистика
  const [stats, setStats] = useState<TTSStats>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tts_stats');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return {
      totalPlayed: 0,
      totalDuration: 0,
      charactersProcessed: 0,
    };
  });

  // Audio буфер
  const audioBuffer = useRef<Map<string, { audioData: string; timestamp: number }>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Сохранение настроек
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Сохранение статистики
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_stats', JSON.stringify(stats));
    }
  }, [stats]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Генерация речи из текста
   */
  const generate = useCallback(async (text: string, options?: TTSOptions): Promise<string> => {
    const voice = options?.voice || settings.voice || DEFAULT_VOICE;
    const speed = options?.speed || settings.speed || DEFAULT_SPEED;
    
    // Проверка кэша
    const cacheKey = `${text}_${voice}_${speed}`;
    const cached = audioBuffer.current.get(cacheKey);
    
    // Если есть в кэше и не старше 24 часов
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.audioData;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice,
          speed,
          provider: options?.provider || settings.provider,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `TTS API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Сохраняем в буфер
      audioBuffer.current.set(cacheKey, {
        audioData: data.audio,
        timestamp: Date.now(),
      });

      // Обновляем статистику
      setStats(prev => ({
        totalPlayed: prev.totalPlayed,
        totalDuration: prev.totalDuration + (data.duration || 0),
        charactersProcessed: prev.charactersProcessed + text.length,
      }));

      setState(prev => ({ ...prev, isLoading: false }));
      
      return data.audio;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [settings]);

  /**
   * Воспроизведение текста
   */
  const speak = useCallback(async (text: string, options?: TTSOptions): Promise<void> => {
    // Останавливаем предыдущее воспроизведение
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setState(prev => ({ ...prev, isPlaying: false, progress: 0, currentText: text }));

    try {
      const audioBase64 = await generate(text, options);
      
      // Создаем audio элемент
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = audio;

      // Обработчики событий
      audio.onplay = () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      };

      audio.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false, progress: 100, currentText: null }));
        setStats(prev => ({
          ...prev,
          totalPlayed: prev.totalPlayed + 1,
        }));
      };

      audio.onpause = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      };

      audio.ontimeupdate = () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        setState(prev => ({ ...prev, progress: Math.round(progress) }));
      };

      audio.onerror = (e) => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          error: `Audio playback error: ${e}`,
        }));
      };

      // Воспроизводим
      await audio.play();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        isPlaying: false,
        error: errorMessage,
        currentText: null,
      }));
    }
  }, [generate]);

  /**
   * Остановка воспроизведения
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setState(prev => ({ ...prev, isPlaying: false, progress: 0, currentText: null }));
  }, []);

  /**
   * Пауза воспроизведения
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  /**
   * Продолжение воспроизведения
   */
  const resume = useCallback(async () => {
    if (audioRef.current && audioRef.current.paused) {
      await audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, []);

  /**
   * Установка голоса
   */
  const setVoice = useCallback((voiceId: string) => {
    setSettings(prev => ({ ...prev, voice: voiceId }));
  }, []);

  /**
   * Установка скорости
   */
  const setSpeed = useCallback((speed: number) => {
    setSettings(prev => ({ ...prev, speed: Math.max(0.5, Math.min(2.0, speed)) }));
  }, []);

  /**
   * Установка провайдера
   */
  const setProvider = useCallback((provider: VoiceProvider) => {
    setSettings(prev => ({ ...prev, provider }));
  }, []);

  /**
   * Получение информации о голосе
   */
  const getVoiceInfo = useCallback((voiceId: string): Voice | undefined => {
    return AVAILABLE_VOICES.find(v => v.id === voiceId);
  }, []);

  /**
   * Получение голосов по языку
   */
  const getVoicesByLanguage = useCallback((language: string): Voice[] => {
    return AVAILABLE_VOICES.filter(v => v.language === language);
  }, []);

  /**
   * Получение голосов по полу
   */
  const getVoicesByGender = useCallback((gender: VoiceGender): Voice[] => {
    return AVAILABLE_VOICES.filter(v => v.gender === gender);
  }, []);

  /**
   * Очистка буфера
   */
  const clearBuffer = useCallback(() => {
    audioBuffer.current.clear();
  }, []);

  /**
   * Сброс статистики
   */
  const resetStats = useCallback(() => {
    setStats({
      totalPlayed: 0,
      totalDuration: 0,
      charactersProcessed: 0,
    });
  }, []);

  /**
   * Сброс ошибки
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // Состояние
    ...state,
    
    // Настройки
    settings,
    stats,
    
    // Методы воспроизведения
    speak,
    stop,
    pause,
    resume,
    generate,
    
    // Настройка голоса
    setVoice,
    setSpeed,
    setProvider,
    
    // Информация
    getVoiceInfo,
    getVoicesByLanguage,
    getVoicesByGender,
    
    // Утилиты
    clearBuffer,
    resetStats,
    clearError,
    
    // Константы
    availableVoices: AVAILABLE_VOICES,
    defaultVoice: DEFAULT_VOICE,
    defaultSpeed: DEFAULT_SPEED,
  };
}

export default useTTS;
