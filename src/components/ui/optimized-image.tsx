'use client';

import { useState, useEffect, useRef, useCallback, memo, ImgHTMLAttributes, useMemo } from 'react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'skeleton' | 'shimmer' | 'none';
  blurDataURL?: string;
  fallback?: string;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  lazy?: boolean;
  className?: string;
  containerClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// ==================== BLUR PLACEHOLDER GENERATOR ====================

const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#1E1F26" offset="0%" />
      <stop stop-color="#2A2B32" offset="50%" />
      <stop stop-color="#1E1F26" offset="100%" />
      <animate attributeName="x1" from="-100%" to="100%" dur="1.5s" repeatCount="indefinite" />
      <animate attributeName="x2" from="0%" to="200%" dur="1.5s" repeatCount="indefinite" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#1E1F26" />
  <rect width="${w}" height="${h}" fill="url(#g)" />
</svg>
`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

export const generateBlurDataURL = (w: number = 10, h: number = 10) =>
  `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;

// ==================== OPTIMIZED IMAGE COMPONENT ====================

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  priority = false,
  quality = 75,
  placeholder = 'shimmer',
  blurDataURL,
  fallback = '/placeholder.png',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  lazy = true,
  className,
  containerClassName,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLDivElement>(null);
  
  // Generate blur placeholder if needed
  const blurPlaceholder = blurDataURL || generateBlurDataURL(width, height);
  
  // Stable reference to current src for the Image component
  const currentSrc = useMemo(() => error ? fallback : src, [error, fallback, src]);
  
  // Intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [lazy, priority, isInView]);
  
  const handleLoad = useCallback(() => {
    setLoading(false);
    onLoad?.();
  }, [onLoad]);
  
  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    onError?.();
  }, [onError]);
  
  const objectFitClass = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  }[objectFit];
  
  // Placeholder rendering
  const renderPlaceholder = () => {
    if (placeholder === 'none') return null;
    
    if (placeholder === 'skeleton') {
      return (
        <Skeleton 
          className={cn('absolute inset-0', className)}
          style={{ width, height }}
        />
      );
    }
    
    if (placeholder === 'shimmer') {
      return (
        <div
          className={cn('absolute inset-0 animate-pulse bg-gradient-to-r from-[#1E1F26] via-[#2A2B32] to-[#1E1F26]', className)}
          style={{ width, height }}
        />
      );
    }
    
    if (placeholder === 'blur' && blurPlaceholder) {
      return (
        <Image
          src={blurPlaceholder}
          alt=""
          fill
          className={cn(objectFitClass, 'blur-lg', className)}
          aria-hidden="true"
        />
      );
    }
    
    return null;
  };
  
  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden', containerClassName)}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {loading && renderPlaceholder()}
      
      {/* Main image - only render when in view */}
      {isInView && (
        <Image
          src={currentSrc}
          alt={alt}
          fill={!(width && height)}
          width={!(width && height) ? undefined : width}
          height={!(width && height) ? undefined : height}
          quality={quality}
          priority={priority}
          sizes={sizes}
          placeholder={placeholder === 'blur' && blurPlaceholder ? 'blur' : 'empty'}
          blurDataURL={blurPlaceholder}
          className={cn(
            objectFitClass,
            'transition-opacity duration-300',
            loading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
      
      {/* Error indicator */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1E1F26]">
          <span className="text-[#8A8A8A] text-sm">Failed to load</span>
        </div>
      )}
    </div>
  );
});

// ==================== RESPONSIVE IMAGE ====================

interface ResponsiveImageProps extends OptimizedImageProps {
  breakpoints?: Array<{
    maxWidth: number;
    width: number;
    height: number;
    quality?: number;
  }>;
  srcSet?: string;
}

export const ResponsiveImage = memo(function ResponsiveImage({
  src,
  breakpoints = [
    { maxWidth: 640, width: 320, height: 240, quality: 65 },
    { maxWidth: 768, width: 640, height: 480, quality: 75 },
    { maxWidth: 1024, width: 768, height: 576, quality: 80 },
    { maxWidth: 1280, width: 1024, height: 768, quality: 85 },
  ],
  ...props
}: ResponsiveImageProps) {
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0, quality: 75 });
  
  useEffect(() => {
    const updateSize = () => {
      const windowWidth = window.innerWidth;
      const matchingBreakpoint = breakpoints.find(
        bp => windowWidth <= bp.maxWidth
      ) || breakpoints[breakpoints.length - 1];
      
      setCurrentSize({
        width: matchingBreakpoint.width,
        height: matchingBreakpoint.height,
        quality: matchingBreakpoint.quality || 75,
      });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [breakpoints]);
  
  return (
    <OptimizedImage
      src={src}
      width={currentSize.width}
      height={currentSize.height}
      quality={currentSize.quality}
      {...props}
    />
  );
});

// ==================== AVATAR IMAGE ====================

interface AvatarImageProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
  className?: string;
}

const avatarSizes = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export const AvatarImage = memo(function AvatarImage({
  src,
  alt,
  size = 'md',
  fallbackText,
  className,
}: AvatarImageProps) {
  const sizePx = avatarSizes[size];
  const initials = fallbackText || alt.slice(0, 2).toUpperCase();
  
  if (!src) {
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-[#6C63FF] to-[#4F46E5] flex items-center justify-center text-white font-medium',
          className
        )}
        style={{ width: sizePx, height: sizePx, fontSize: sizePx * 0.4 }}
      >
        {initials}
      </div>
    );
  }
  
  return (
    <div className={cn('rounded-full overflow-hidden', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={sizePx}
        height={sizePx}
        quality={85}
        objectFit="cover"
        className="rounded-full"
        placeholder="skeleton"
      />
    </div>
  );
});

// ==================== IMAGE GALLERY ====================

interface ImageGalleryProps {
  images: Array<{
    id: string;
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
}

export const ImageGallery = memo(function ImageGallery({
  images,
  columns = 3,
  gap = 16,
  className,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  return (
    <>
      <div
        className={cn('grid', className)}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => setSelectedImage(image.src)}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              width={image.width || 300}
              height={image.height || 200}
              lazy={index > 6}
              quality={70}
              className="rounded-lg"
            />
          </div>
        ))}
      </div>
      
      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
          <OptimizedImage
            src={selectedImage}
            alt="Preview"
            width={1200}
            height={800}
            quality={90}
            className="max-w-full max-h-full"
            priority
          />
        </div>
      )}
    </>
  );
});

// ==================== BACKGROUND IMAGE ====================

interface BackgroundImageProps {
  src: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
  blur?: number;
  className?: string;
  priority?: boolean;
}

export const BackgroundImage = memo(function BackgroundImage({
  src,
  children,
  overlay = true,
  overlayOpacity = 0.5,
  blur = 0,
  className,
  priority = false,
}: BackgroundImageProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <OptimizedImage
        src={src}
        alt="Background"
        fill
        priority={priority}
        objectFit="cover"
        className={cn(blur > 0 && `blur-[${blur}px]`)}
      />
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

// ==================== IMAGE PRELOADER ====================

export function useImagePreloader() {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  
  const preload = useCallback((urls: string | string[]) => {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    urlArray.forEach(url => {
      if (loaded.has(url) || errors.has(url)) return;
      
      const img = new window.Image();
      img.onload = () => {
        setLoaded(prev => new Set([...prev, url]));
      };
      img.onerror = () => {
        setErrors(prev => new Set([...prev, url]));
      };
      img.src = url;
    });
  }, [loaded, errors]);
  
  return { loaded, errors, preload };
}

export default OptimizedImage;
