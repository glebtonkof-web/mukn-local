'use client';

import { Suspense, ComponentType, lazy, useState, useEffect, memo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// ==================== LOADING SKELETONS ====================

export function ViewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Content skeleton */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-12 rounded" />
                  <Skeleton className="h-12 rounded" />
                  <Skeleton className="h-12 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-[#1E1F26] rounded-lg">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-5 gap-4 p-4 bg-[#14151A] border border-[#2A2B32] rounded-lg">
          {[...Array(5)].map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ==================== LAZY VIEW WRAPPER ====================

interface LazyViewProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
  className?: string;
}

export function LazyView({ 
  children, 
  fallback = <ViewSkeleton />,
  delay = 0,
  className 
}: LazyViewProps) {
  const [show, setShow] = useState(delay === 0);
  
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);
  
  if (!show) {
    return <>{fallback}</>;
  }
  
  return (
    <Suspense fallback={fallback}>
      <div className={className}>{children}</div>
    </Suspense>
  );
}

// ==================== DYNAMIC IMPORT WRAPPER ====================

export function createLazyView<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    loading?: React.ReactNode;
    ssr?: boolean;
  } = {}
) {
  const { loading = <ViewSkeleton />, ssr = false } = options;
  
  return dynamic(importFn, {
    loading: () => <>{loading}</>,
    ssr,
  });
}

// ==================== PRELOADABLE COMPONENT ====================

interface PreloadableProps {
  children: React.ReactNode;
  preloadOn?: 'hover' | 'viewport' | 'idle';
  fallback?: React.ReactNode;
  className?: string;
}

export function Preloadable({ 
  children, 
  preloadOn = 'hover',
  fallback = <ViewSkeleton />,
  className 
}: PreloadableProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useState<HTMLDivElement | null>(null)[0];
  
  useEffect(() => {
    if (preloadOn === 'idle') {
      const idleCallback = (typeof requestIdleCallback !== 'undefined')
        ? requestIdleCallback
        : (cb: IdleRequestCallback) => setTimeout(cb as unknown as () => void, 1) as unknown as number;
      
      const id = idleCallback(() => setLoaded(true));
      return () => {
        if (typeof cancelIdleCallback !== 'undefined') {
          cancelIdleCallback(id);
        } else {
          clearTimeout(id);
        }
      };
    }
    
    if (preloadOn === 'viewport' && ref) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '100px' }
      );
      
      observer.observe(ref);
      return () => observer.disconnect();
    }
  }, [preloadOn, ref]);
  
  const handleMouseEnter = useCallback(() => {
    if (preloadOn === 'hover') {
      setLoaded(true);
    }
  }, [preloadOn]);
  
  useEffect(() => {
    if (inView && preloadOn === 'viewport') {
      setLoaded(true);
    }
  }, [inView, preloadOn]);
  
  return (
    <div 
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {loaded ? children : fallback}
    </div>
  );
}

// ==================== MEMOIZED COMPONENT WRAPPER ====================

export function memoComponent<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return memo(Component, propsAreEqual);
}

// ==================== STREAMING LIST ====================

interface StreamingListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  batchSize?: number;
  initialCount?: number;
  loader?: React.ReactNode;
  className?: string;
  itemClassName?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function StreamingList<T extends { id: string | number }>({
  items,
  renderItem,
  batchSize = 10,
  initialCount = 10,
  loader = <Skeleton className="h-20 w-full" />,
  className,
  itemClassName,
  onLoadMore,
  hasMore = false,
}: StreamingListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  
  const visibleItems = items.slice(0, visibleCount);
  const hasHiddenItems = items.length > visibleCount;
  
  const loadMore = useCallback(() => {
    if (loading) return;
    
    setLoading(true);
    // Simulate network delay for smoother UX
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + batchSize, items.length));
      setLoading(false);
      onLoadMore?.();
    }, 100);
  }, [batchSize, items.length, loading, onLoadMore]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (
        hasHiddenItems &&
        !loading &&
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500
      ) {
        loadMore();
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasHiddenItems, loading, loadMore]);
  
  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <div key={item.id} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {(loading || (hasMore && !hasHiddenItems)) && (
        <div className="py-4">{loader}</div>
      )}
    </div>
  );
}

// ==================== VIRTUAL LIST FOR LARGE DATASETS ====================

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualList<T extends { id: string | number }>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== PROGRESSIVE IMAGE LOADER ====================

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  priority?: 'high' | 'low' | 'auto';
  threshold?: number;
  placeholder?: React.ReactNode;
}

export function ProgressiveLoader({
  children,
  priority = 'auto',
  threshold = 0,
  placeholder,
}: ProgressiveLoaderProps) {
  const [loaded, setLoaded] = useState(false);
  const ref = useState<HTMLDivElement | null>(null)[0];
  
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), threshold);
    return () => clearTimeout(timer);
  }, [threshold]);
  
  if (!loaded && placeholder) {
    return <>{placeholder}</>;
  }
  
  return <div style={{ contentVisibility: priority === 'low' ? 'auto' : 'visible' }}>{children}</div>;
}

export default LazyView;
