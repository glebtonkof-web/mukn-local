/**
 * Antidetect Browser Integration Service
 * Supports: MostLogin, MoreLogin, Multilogin, Octo Browser
 */

import { logger } from './logger';

// Types
export type BrowserType = 'mostlogin' | 'morelogin' | 'multilogin' | 'octo-browser';

export interface BrowserProfile {
  profileId: string;
  profileName?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  proxyType?: 'http' | 'socks5' | 'https';
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  geolocation?: string;
  webglRenderer?: string;
  fingerprint?: string;
}

export interface LaunchResult {
  success: boolean;
  browserUrl?: string;
  debugPort?: number;
  error?: string;
  startedAt?: string;
  pid?: number;
}

export interface StopResult {
  success: boolean;
  error?: string;
}

export interface BrowserApiConfig {
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  port?: number;
}

// MostLogin API Client
export class MostLoginClient {
  private apiUrl: string;
  private apiKey: string;
  private port: number;

  constructor(config: BrowserApiConfig = {}) {
    this.apiUrl = config.apiUrl || 'http://127.0.0.1';
    this.apiKey = config.apiKey || '';
    this.port = config.port || 50215;
  }

  private getBaseUrl(): string {
    return `${this.apiUrl}:${this.port}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/status`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      logger.error('MostLogin connection test failed', error as Error);
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
    };
  }

  async launchProfile(profile: BrowserProfile): Promise<LaunchResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/profile/start`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          profileId: profile.profileId,
          proxy: profile.proxyHost ? {
            host: profile.proxyHost,
            port: profile.proxyPort,
            username: profile.proxyUsername,
            password: profile.proxyPassword,
            type: profile.proxyType || 'http',
          } : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MostLogin API error: ${error}` };
      }

      const data = await response.json();
      
      return {
        success: true,
        browserUrl: data.wsEndpoint || `http://127.0.0.1:${data.debugPort}`,
        debugPort: data.debugPort,
        pid: data.pid,
        startedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('MostLogin launch profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async stopProfile(profileId: string): Promise<StopResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/profile/stop`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MostLogin API error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      logger.error('MostLogin stop profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getProfiles(): Promise<BrowserProfile[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/profiles`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }

      const data = await response.json();
      return data.profiles || [];
    } catch (error) {
      logger.error('MostLogin get profiles failed', error as Error);
      return [];
    }
  }

  async createProfile(profile: BrowserProfile): Promise<{ success: boolean; profileId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/profile/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: profile.profileName,
          proxy: profile.proxyHost ? {
            host: profile.proxyHost,
            port: profile.proxyPort,
            username: profile.proxyUsername,
            password: profile.proxyPassword,
            type: profile.proxyType || 'http',
          } : undefined,
          fingerprint: {
            userAgent: profile.userAgent,
            screenResolution: profile.screenResolution,
            timezone: profile.timezone,
            language: profile.language,
            webglRenderer: profile.webglRenderer,
            geolocation: profile.geolocation,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MostLogin API error: ${error}` };
      }

      const data = await response.json();
      return { success: true, profileId: data.profileId };
    } catch (error) {
      logger.error('MostLogin create profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async deleteProfile(profileId: string): Promise<StopResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/profile/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MostLogin API error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      logger.error('MostLogin delete profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// MoreLogin API Client
export class MoreLoginClient {
  private apiUrl: string;
  private apiKey: string;
  private port: number;

  constructor(config: BrowserApiConfig = {}) {
    this.apiUrl = config.apiUrl || 'http://127.0.0.1';
    this.apiKey = config.apiKey || '';
    this.port = config.port || 35000;
  }

  private getBaseUrl(): string {
    return `${this.apiUrl}:${this.port}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/open/v1/status`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      logger.error('MoreLogin connection test failed', error as Error);
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
    };
  }

  async launchProfile(profile: BrowserProfile): Promise<LaunchResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/open/v1/browser/start`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          id: profile.profileId,
          proxy: profile.proxyHost ? {
            host: profile.proxyHost,
            port: profile.proxyPort,
            user: profile.proxyUsername,
            pass: profile.proxyPassword,
            proxyType: profile.proxyType || 'http',
          } : undefined,
          openMode: 'openInTab',
          headless: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MoreLogin API error: ${error}` };
      }

      const data = await response.json();
      
      return {
        success: true,
        browserUrl: data.wsEndpoint || `http://127.0.0.1:${data.debugPort}`,
        debugPort: data.debugPort,
        pid: data.pid,
        startedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('MoreLogin launch profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async stopProfile(profileId: string): Promise<StopResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/open/v1/browser/stop`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id: profileId }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MoreLogin API error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      logger.error('MoreLogin stop profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getProfiles(): Promise<BrowserProfile[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/open/v1/profiles`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }

      const data = await response.json();
      return (data.data || []).map((p: Record<string, unknown>) => ({
        profileId: p.id,
        profileName: p.name,
        proxyHost: (p.proxyConfig as Record<string, unknown>)?.host as string,
        proxyPort: (p.proxyConfig as Record<string, unknown>)?.port as number,
        proxyUsername: (p.proxyConfig as Record<string, unknown>)?.user as string,
        proxyPassword: (p.proxyConfig as Record<string, unknown>)?.pass as string,
      }));
    } catch (error) {
      logger.error('MoreLogin get profiles failed', error as Error);
      return [];
    }
  }

  async createProfile(profile: BrowserProfile): Promise<{ success: boolean; profileId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/open/v1/profile/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: profile.profileName,
          groupId: 'default',
          proxyConfig: profile.proxyHost ? {
            proxyType: profile.proxyType || 'http',
            host: profile.proxyHost,
            port: profile.proxyPort,
            user: profile.proxyUsername,
            pass: profile.proxyPassword,
          } : undefined,
          fingerprintConfig: {
            ua: profile.userAgent,
            screenResolution: profile.screenResolution,
            timezone: profile.timezone,
            language: profile.language,
            webgl: profile.webglRenderer,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MoreLogin API error: ${error}` };
      }

      const data = await response.json();
      return { success: true, profileId: data.data?.id };
    } catch (error) {
      logger.error('MoreLogin create profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async deleteProfile(profileId: string): Promise<StopResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/open/v1/profile/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id: profileId }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `MoreLogin API error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      logger.error('MoreLogin delete profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Multilogin API Client
export class MultiloginClient {
  private apiUrl: string;
  private apiKey: string;
  private port: number;

  constructor(config: BrowserApiConfig = {}) {
    this.apiUrl = config.apiUrl || 'https://api.multilogin.com';
    this.apiKey = config.apiKey || '';
    this.port = config.port || 45001;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v2/profiles`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      logger.error('Multilogin connection test failed', error as Error);
      return false;
    }
  }

  async launchProfile(profile: BrowserProfile): Promise<LaunchResult> {
    try {
      // Start local Multilogin application first
      const localResponse = await fetch(`http://127.0.0.1:${this.port}/api/v1/profile/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profileId: profile.profileId,
          headless: false,
        }),
      });

      if (!localResponse.ok) {
        const error = await localResponse.text();
        return { success: false, error: `Multilogin local API error: ${error}` };
      }

      const data = await localResponse.json();
      
      return {
        success: true,
        browserUrl: data.webdriver,
        debugPort: data.port,
        pid: data.pid,
        startedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Multilogin launch profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async stopProfile(profileId: string): Promise<StopResult> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/api/v1/profile/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Multilogin API error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      logger.error('Multilogin stop profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Octo Browser API Client
export class OctoBrowserClient {
  private apiUrl: string;
  private apiKey: string;
  private port: number;

  constructor(config: BrowserApiConfig = {}) {
    this.apiUrl = config.apiUrl || 'http://127.0.0.1';
    this.apiKey = config.apiKey || '';
    this.port = config.port || 51445;
  }

  private getBaseUrl(): string {
    return `${this.apiUrl}:${this.port}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/profiles`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      logger.error('Octo Browser connection test failed', error as Error);
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Octo-Api-Token': this.apiKey,
    };
  }

  async launchProfile(profile: BrowserProfile): Promise<LaunchResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/profile/start`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          uuid: profile.profileId,
          headless: false,
          saveua: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Octo Browser API error: ${error}` };
      }

      const data = await response.json();
      
      return {
        success: true,
        browserUrl: data.websocket_link,
        debugPort: data.remote_debugging_port,
        pid: data.pid,
        startedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Octo Browser launch profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async stopProfile(profileId: string): Promise<StopResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/profile/stop`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ uuid: profileId }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Octo Browser API error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      logger.error('Octo Browser stop profile failed', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Factory to create browser client based on type
export function createBrowserClient(browserType: BrowserType, config: BrowserApiConfig = {}) {
  switch (browserType) {
    case 'mostlogin':
      return new MostLoginClient(config);
    case 'morelogin':
      return new MoreLoginClient(config);
    case 'multilogin':
      return new MultiloginClient(config);
    case 'octo-browser':
      return new OctoBrowserClient(config);
    default:
      throw new Error(`Unknown browser type: ${browserType}`);
  }
}

// Get default port for browser type
export function getDefaultPort(browserType: BrowserType): number {
  switch (browserType) {
    case 'mostlogin':
      return 50215;
    case 'morelogin':
      return 35000;
    case 'multilogin':
      return 45001;
    case 'octo-browser':
      return 51445;
    default:
      return 9222;
  }
}

// Browser status check
export async function checkBrowserStatus(browserType: BrowserType, config: BrowserApiConfig = {}): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const client = createBrowserClient(browserType, config);
    const connected = await client.testConnection();
    
    return {
      connected,
      version: connected ? 'Connected' : undefined,
      error: connected ? undefined : 'Cannot connect to browser application',
    };
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message,
    };
  }
}
