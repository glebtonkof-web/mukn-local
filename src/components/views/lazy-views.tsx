'use client';

import dynamic from 'next/dynamic';
import { ViewSkeleton, TableSkeleton, CardGridSkeleton } from '@/components/ui/lazy-view';

// ==================== LAZY-LOADED VIEW COMPONENTS ====================
// Эти компоненты загружаются динамически с loading skeleton

// Traffic View - lazy loaded
export const LazyTrafficView = dynamic(
  () => import('./traffic-view').then(mod => ({ default: mod.TrafficView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Advanced View - lazy loaded
export const LazyAdvancedView = dynamic(
  () => import('./advanced-view').then(mod => ({ default: mod.AdvancedView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// AI Comments View - lazy loaded
export const LazyAICommentsView = dynamic(
  () => import('./ai-comments-view').then(mod => ({ default: mod.AICommentsView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Monetization View - lazy loaded
export const LazyMonetizationView = dynamic(
  () => import('./monetization-view').then(mod => ({ default: mod.MonetizationView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// OFM View - lazy loaded
export const LazyOFMView = dynamic(
  () => import('./ofm-view').then(mod => ({ default: mod.OFMView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Proxies View - lazy loaded
export const LazyProxiesView = dynamic(
  () => import('./infrastructure-view').then(mod => ({ default: mod.ProxiesView })),
  {
    loading: () => <TableSkeleton rows={5} />,
    ssr: false,
  }
);

// SimCards View - lazy loaded
export const LazySimCardsView = dynamic(
  () => import('./infrastructure-view').then(mod => ({ default: mod.SimCardsView })),
  {
    loading: () => <TableSkeleton rows={5} />,
    ssr: false,
  }
);

// Content View - lazy loaded
export const LazyContentView = dynamic(
  () => import('./content-view').then(mod => ({ default: mod.ContentView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Video Generator View - lazy loaded
export const LazyVideoGeneratorView = dynamic(
  () => import('./content-view').then(mod => ({ default: mod.VideoGeneratorView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Offers View - lazy loaded
export const LazyOffersView = dynamic(
  () => import('./offers-view').then(mod => ({ default: mod.OffersView })),
  {
    loading: () => <CardGridSkeleton count={6} />,
    ssr: false,
  }
);

// Influencers View - lazy loaded
export const LazyInfluencersView = dynamic(
  () => import('./influencers-view').then(mod => ({ default: mod.InfluencersView })),
  {
    loading: () => <CardGridSkeleton count={4} />,
    ssr: false,
  }
);

// Warming View - lazy loaded
export const LazyWarmingView = dynamic(
  () => import('./warming-view').then(mod => ({ default: mod.WarmingView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Shadow Ban View - lazy loaded
export const LazyShadowBanView = dynamic(
  () => import('./shadow-ban-view').then(mod => ({ default: mod.ShadowBanView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// AI Pool View - lazy loaded
export const LazyAIPoolView = dynamic(
  () => import('./ai-pool-view').then(mod => ({ default: mod.AIPoolView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Settings View - lazy loaded
export const LazySettingsView = dynamic(
  () => import('./settings-view').then(mod => ({ default: mod.SettingsView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// Analytics View - lazy loaded
export const LazyAnalyticsView = dynamic(
  () => import('./analytics-view').then(mod => ({ default: mod.AnalyticsView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

// ==================== PRELOAD HELPERS ====================

// Функция для предварительной загрузки компонентов при наведении
export const preloadView = {
  traffic: () => import('./traffic-view'),
  advanced: () => import('./advanced-view'),
  aiComments: () => import('./ai-comments-view'),
  monetization: () => import('./monetization-view'),
  ofm: () => import('./ofm-view'),
  proxies: () => import('./infrastructure-view'),
  content: () => import('./content-view'),
  offers: () => import('./offers-view'),
  influencers: () => import('./influencers-view'),
  warming: () => import('./warming-view'),
  shadowBan: () => import('./shadow-ban-view'),
  aiPool: () => import('./ai-pool-view'),
  settings: () => import('./settings-view'),
  analytics: () => import('./analytics-view'),
};

// ==================== VIEW LOADER HOOK ====================

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseViewLoaderOptions {
  preloadDelay?: number;
  loadOnMount?: boolean;
}

export function useViewLoader(
  viewKey: keyof typeof preloadView,
  options: UseViewLoaderOptions = {}
) {
  const { preloadDelay = 100, loadOnMount = false } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const load = useCallback(() => {
    if (isLoaded || isLoading) return;
    
    setIsLoading(true);
    preloadView[viewKey]()
      .then(() => {
        setIsLoaded(true);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [viewKey, isLoaded, isLoading]);
  
  const preload = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(load, preloadDelay);
  }, [load, preloadDelay]);
  
  const cancelPreload = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    if (loadOnMount) {
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => load());
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOnMount]);
  
  return {
    isLoaded,
    isLoading,
    error,
    load,
    preload,
    cancelPreload,
  };
}

// ==================== PRELOADABLE LINK COMPONENT ====================

import { forwardRef, AnchorHTMLAttributes } from 'react';

interface PreloadableLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  viewKey: keyof typeof preloadView;
  preloadOnHover?: boolean;
}

export const PreloadableLink = forwardRef<HTMLAnchorElement, PreloadableLinkProps>(
  function PreloadableLink(
    { viewKey, preloadOnHover = true, onMouseEnter, ...props },
    ref
  ) {
    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (preloadOnHover) {
        preloadView[viewKey]();
      }
      onMouseEnter?.(e);
    };
    
    return (
      <a
        ref={ref}
        onMouseEnter={handleMouseEnter}
        {...props}
      />
    );
  }
);
