import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export interface VagouOfficialLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'icon' | 'full' | 'symbol';
  className?: string;
  onClick?: () => void;
  title?: string;
  forceTheme?: 'dark' | 'light';
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
  '2xl': 'w-14 h-14',
};

const fullSizeClasses = {
  xs: 'h-6',
  sm: 'h-7',
  md: 'h-8 sm:h-9',
  lg: 'h-9 sm:h-10',
  xl: 'h-11 sm:h-12',
  '2xl': 'h-14',
};

// Lista encadeada de fontes oficiais do logotipo no Supabase e em Assets locais
const LOGO_OFFICIAL_SOURCES = [
  'https://xemenxdhuoekytyhmgyt.supabase.co/storage/v1/object/public/branding/vagou-logo.png',
  'https://xemenxdhuoekytyhmgyt.supabase.co/storage/v1/object/public/assets/logo.png',
  '/logo.png',
  '/vagou-logo.png',
  '/logo_light.png',
  '/icon.svg',
];

/**
 * Logotipo Oficial do VagouApp (Ícone Squircle, Full Logo Horizontal ou Símbolo Vetorial).
 * Respeita em tempo real os logotipos (Dark/Light) e ícones customizados na ferramenta "Preferências" do Admin Master.
 */
export const VagouOfficialLogo: React.FC<VagouOfficialLogoProps> = ({
  size = 'md',
  variant = 'icon',
  className = '',
  onClick,
  title = 'VagouApp Oficial',
  forceTheme,
}) => {
  const { isDark, preferences } = useTheme();
  const [sourceIndex, setSourceIndex] = useState(0);
  const [customFailed, setCustomFailed] = useState(false);

  const effectiveIsDark = forceTheme ? forceTheme === 'dark' : isDark;

  const customFullSource = effectiveIsDark
    ? preferences?.logoDarkUrl || preferences?.logoLightUrl || ''
    : preferences?.logoLightUrl || preferences?.logoDarkUrl || '';

  const customIconSource =
    preferences?.mobileAppIconUrl ||
    preferences?.faviconUrl ||
    customFullSource ||
    '';

  useEffect(() => {
    setCustomFailed(false);
  }, [
    preferences?.logoDarkUrl,
    preferences?.logoLightUrl,
    preferences?.mobileAppIconUrl,
    preferences?.faviconUrl,
    effectiveIsDark,
  ]);

  const containerSize = sizeClasses[size] || sizeClasses.md;
  const fullSize = fullSizeClasses[size] || fullSizeClasses.md;

  const handleImageError = () => {
    if (!customFailed && ((variant === 'full' && customFullSource) || (variant !== 'full' && customIconSource))) {
      setCustomFailed(true);
      return;
    }
    if (sourceIndex < LOGO_OFFICIAL_SOURCES.length - 1) {
      setSourceIndex((prev) => prev + 1);
    }
  };

  const currentFullSource =
    !customFailed && customFullSource ? customFullSource : LOGO_OFFICIAL_SOURCES[sourceIndex];
  const currentIconSource =
    !customFailed && customIconSource ? customIconSource : LOGO_OFFICIAL_SOURCES[sourceIndex];

  if (variant === 'full') {
    return (
      <img
        src={currentFullSource}
        alt="VagouApp Oficial"
        title={title}
        className={`${fullSize} object-contain select-none shrink-0 ${
          onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition' : ''
        } ${className}`}
        onClick={onClick}
        onError={handleImageError}
      />
    );
  }

  return (
    <img
      src={currentIconSource}
      alt="VagouApp Oficial"
      title={title}
      className={`${containerSize} object-contain rounded-xl select-none shrink-0 ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition' : ''
      } ${className}`}
      onClick={onClick}
      onError={handleImageError}
    />
  );
};

export default VagouOfficialLogo;

