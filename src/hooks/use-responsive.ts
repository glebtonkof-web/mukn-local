import * as React from "react"

// Breakpoints matching Tailwind defaults
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

interface ResponsiveState {
  isMobile: boolean      // < 768px (md)
  isTablet: boolean      // 768px - 1279px (md to xl)
  isDesktop: boolean     // >= 1280px (xl)
  isXL: boolean          // >= 1280px (xl)
  is2XL: boolean         // >= 1536px (2xl)
  width: number
  breakpoint: Breakpoint | 'xs'
}

/**
 * Hook for responsive breakpoint detection
 * @returns ResponsiveState with boolean flags for each breakpoint
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = React.useState<ResponsiveState>(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isXL: true,
    is2XL: true,
    width: 1280, // Default to desktop for SSR
    breakpoint: 'xl' as Breakpoint,
  }))

  React.useEffect(() => {
    const calculateState = (): ResponsiveState => {
      const width = window.innerWidth
      
      return {
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.xl,
        isDesktop: width >= BREAKPOINTS.xl,
        isXL: width >= BREAKPOINTS.xl,
        is2XL: width >= BREAKPOINTS['2xl'],
        width,
        breakpoint: width < BREAKPOINTS.sm 
          ? 'xs' 
          : width < BREAKPOINTS.md 
            ? 'sm' 
            : width < BREAKPOINTS.lg 
              ? 'md' 
              : width < BREAKPOINTS.xl 
                ? 'lg' 
                : width < BREAKPOINTS['2xl'] 
                  ? 'xl' 
                  : '2xl',
      }
    }

    const mql = window.matchMedia(`(min-width: ${BREAKPOINTS.xl}px)`)
    
    const onChange = () => {
      setState(calculateState())
    }

    // Initial calculation
    setState(calculateState())

    // Listen for changes
    mql.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)
    
    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
    }
  }, [])

  return state
}

/**
 * Simplified hook for AI Panel responsive behavior
 * @returns Object with AI panel specific responsive state
 */
export function useAIPanelResponsive() {
  const responsive = useResponsive()
  
  // AI Panel should be a drawer/modal on screens < 1280px
  const shouldUseDrawer = responsive.isMobile || responsive.isTablet
  
  // On mobile (< 768px), hide panel by default, show only floating button
  const hideByDefault = responsive.isMobile
  
  // Calculate available width for the panel
  const getAvailableWidth = (baseWidth: number = 420, showHistory: boolean = false) => {
    const historyWidth = showHistory ? 280 : 0
    const totalWidth = baseWidth + historyWidth
    
    // On small screens, use full width
    if (responsive.isMobile) {
      return responsive.width
    }
    
    // On tablet, use 80% of screen width
    if (responsive.isTablet) {
      return Math.min(totalWidth, Math.floor(responsive.width * 0.8))
    }
    
    // On desktop, use the calculated width
    return totalWidth
  }
  
  return {
    ...responsive,
    shouldUseDrawer,
    hideByDefault,
    getAvailableWidth,
  }
}
