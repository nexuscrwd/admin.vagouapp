import { useState, useEffect } from 'react';

export type DeviceViewportType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceViewportInfo {
  device: DeviceViewportType;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
}

function detectDeviceViewport(): DeviceViewportInfo {
  if (typeof window === 'undefined') {
    return {
      device: 'desktop',
      width: 1280,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
    };
  }

  const width = window.innerWidth;
  const isTouch =
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

  let device: DeviceViewportType = 'desktop';
  if (width < 640) {
    device = 'mobile';
  } else if (width >= 640 && width < 1024) {
    device = 'tablet';
  } else {
    device = 'desktop';
  }

  return {
    device,
    width,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isTouch,
  };
}

export function useDeviceViewport(): DeviceViewportInfo {
  const [viewport, setViewport] = useState<DeviceViewportInfo>(() => detectDeviceViewport());

  useEffect(() => {
    const handleResize = () => {
      const next = detectDeviceViewport();
      setViewport(next);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-device', next.device);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return viewport;
}
