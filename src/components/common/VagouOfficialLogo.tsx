import React, { useState } from 'react';

export interface VagouOfficialLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'icon' | 'full' | 'symbol';
  className?: string;
  onClick?: () => void;
  title?: string;
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
 * Carrega a imagem do logo oficial direto do Supabase Storage ou Assets com encadeamento automático.
 */
export const VagouOfficialLogo: React.FC<VagouOfficialLogoProps> = ({
  size = 'md',
  variant = 'icon',
  className = '',
  onClick,
  title = 'VagouApp Oficial',
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const containerSize = sizeClasses[size] || sizeClasses.md;
  const fullSize = fullSizeClasses[size] || fullSizeClasses.md;

  const handleImageError = () => {
    if (sourceIndex < LOGO_OFFICIAL_SOURCES.length - 1) {
      setSourceIndex((prev) => prev + 1);
    }
  };

  const currentSource = LOGO_OFFICIAL_SOURCES[sourceIndex];

  if (variant === 'full') {
    return (
      <img
        src={currentSource}
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

  if (variant === 'symbol') {
    return (
      <div
        onClick={onClick}
        title={title}
        className={`${containerSize} flex items-center justify-center shrink-0 select-none ${
          onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition' : ''
        } ${className}`}
      >
        <svg
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full shrink-0"
        >
          <defs>
            <linearGradient id="vagouVSymbolGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#087A2A" />
              <stop offset="50%" stopColor="#20C933" />
              <stop offset="100%" stopColor="#38E54B" />
            </linearGradient>
          </defs>
          <path
            d="M 25 72 C 15 60, 30 42, 46 52 L 72 82 C 80 90, 92 88, 100 78 L 142 22 C 152 8, 168 22, 158 36 L 98 126 C 86 142, 64 142, 52 126 Z"
            fill="url(#vagouVSymbolGrad)"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={currentSource}
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
