import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UIMode = 'simple' | 'expert';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
}

export interface AIAction {
  type: 'create_campaign' | 'open_settings' | 'generate_comment' | 'analyze_channel' | 'apply_settings';
  label: string;
  params?: Record<string, unknown>;
}

export interface AIDialog {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: Date;
  isPinned: boolean;
}

export interface CachedPrompt {
  key: string;
  prompt: string;
  context: string;
  response: string;
  tokensUsed: number;
  timestamp: Date;
}

interface ModeState {
  // UI Mode
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;
  
  // AI Assistant Panel
  aiPanelOpen: boolean;
  aiPanelWidth: number;
  aiPanelExpanded: boolean;
  setAIPanelOpen: (open: boolean) => void;
  setAIPanelWidth: (width: number) => void;
  setAIPanelExpanded: (expanded: boolean) => void;
  
  // AI Chat Messages
  aiMessages: AIMessage[];
  addAIMessage: (message: AIMessage) => void;
  clearAIMessages: () => void;
  
  // Saved dialogs
  aiDialogs: AIDialog[];
  saveAIDialog: (dialog: AIDialog) => void;
  deleteAIDialog: (id: string) => void;
  
  // Token management
  tokensUsed: number;
  tokensLimit: number;
  addTokensUsed: (tokens: number) => void;
  getRemainingTokens: () => number;
  
  // Cache
  promptCache: CachedPrompt[];
  getCachedResponse: (prompt: string, context: string) => CachedPrompt | null;
  cacheResponse: (cache: CachedPrompt) => void;
  clearCache: () => void;
  
  // Onboarding
  onboardingComplete: boolean;
  onboardingStep: number;
  setOnboardingComplete: (complete: boolean) => void;
  setOnboardingStep: (step: number) => void;
  
  // Terminal mode
  terminalMode: boolean;
  setTerminalMode: (mode: boolean) => void;
  terminalHistory: string[];
  addTerminalCommand: (command: string) => void;
  
  // Theme
  theme: 'dark' | 'light' | 'high-contrast';
  setTheme: (theme: 'dark' | 'light' | 'high-contrast') => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set, get) => ({
      // UI Mode
      uiMode: 'simple',
      setUIMode: (mode) => set({ uiMode: mode }),
      
      // AI Assistant Panel
      aiPanelOpen: true,
      aiPanelWidth: 380,
      aiPanelExpanded: false,
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
      setAIPanelWidth: (width) => set({ aiPanelWidth: width }),
      setAIPanelExpanded: (expanded) => set({ aiPanelExpanded: expanded }),
      
      // AI Chat Messages
      aiMessages: [],
      addAIMessage: (message) => set((state) => ({
        aiMessages: [...state.aiMessages, message]
      })),
      clearAIMessages: () => set({ aiMessages: [] }),
      
      // Saved dialogs
      aiDialogs: [],
      saveAIDialog: (dialog) => set((state) => ({
        aiDialogs: [dialog, ...state.aiDialogs].slice(0, 50)
      })),
      deleteAIDialog: (id) => set((state) => ({
        aiDialogs: state.aiDialogs.filter(d => d.id !== id)
      })),
      
      // Token management
      tokensUsed: 0,
      tokensLimit: 5_000_000,
      addTokensUsed: (tokens) => set((state) => ({
        tokensUsed: state.tokensUsed + tokens
      })),
      getRemainingTokens: () => get().tokensLimit - get().tokensUsed,
      
      // Cache
      promptCache: [],
      getCachedResponse: (prompt, context) => {
        const key = `${prompt}|${context}`;
        return get().promptCache.find(c => c.key === key) || null;
      },
      cacheResponse: (cache) => set((state) => ({
        promptCache: [cache, ...state.promptCache].slice(0, 1000)
      })),
      clearCache: () => set({ promptCache: [] }),
      
      // Onboarding
      onboardingComplete: false,
      onboardingStep: 0,
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      
      // Terminal mode
      terminalMode: false,
      setTerminalMode: (mode) => set({ terminalMode: mode }),
      terminalHistory: [],
      addTerminalCommand: (command) => set((state) => ({
        terminalHistory: [...state.terminalHistory, command].slice(-100)
      })),
      
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'mukn-mode-store',
      partialize: (state) => ({
        uiMode: state.uiMode,
        onboardingComplete: state.onboardingComplete,
        theme: state.theme,
        tokensUsed: state.tokensUsed,
        aiDialogs: state.aiDialogs,
        promptCache: state.promptCache,
        terminalHistory: state.terminalHistory,
      }),
    }
  )
);
