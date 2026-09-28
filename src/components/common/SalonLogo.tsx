import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface SalonLogoProps {
  logoUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  primaryColor?: string;
  className?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 rounded-md',
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-11 h-11 rounded-xl',
  xl: 'w-14 h-14 rounded-xl',
  custom: '',
};

const iconSizes = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-4.5 h-4.5',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  custom: 'w-5 h-5',
};

/**
 * Componente oficial de Logotipo do Estabelecimento / Salão da Tríade VagouApp.
 * Exibe a imagem real do logo do estabelecimento quando cadastrado (sem filtros indevidos).
 * Para empresas sem logo ou com URL quebrada, renderiza uma moldura retangular de imagem provisória "LOGO"
 * com ícone de estabelecimento Building2, NUNCA moldura ou ícone de avatar de usuário.
 */
export const SalonLogo: React.FC<SalonLogoProps> = ({
  logoUrl,
  name,
  size = 'md',
  primaryColor,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const isValidLogo = Boolean(
    logoUrl && logoUrl.trim() !== '' && !imageError
  );

  const containerSize = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;

  if (isValidLogo && logoUrl) {
    return (
      <div
        className={`${containerSize} overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 shadow-xs flex items-center justify-center ${className}`}
        style={primaryColor ? { borderColor: `${primaryColor}40` } : undefined}
      >
        <img
          src={logoUrl}
          alt={name || 'Logo do Estabelecimento'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback Provisório Retangular do Estabelecimento (Substitui avatar de usuário por Logo Provisório)
  return (
    <div
      className={`${containerSize} bg-slate-900 border border-slate-800 text-emerald-400 flex flex-col items-center justify-center shrink-0 shadow-xs relative overflow-hidden group ${className}`}
      style={{
        backgroundColor: primaryColor ? `${primaryColor}20` : undefined,
        borderColor: primaryColor ? `${primaryColor}50` : undefined,
      }}
      title={name || 'Estabelecimento (Logo Provisório)'}
    >
      <Building2 className={`${iconSize} text-emerald-400 shrink-0`} />
      {(size === 'lg' || size === 'xl') && (
        <span className="text-[8px] font-bold tracking-widest text-slate-400 uppercase font-mono mt-0.5">
          LOGO
        </span>
      )}
    </div>
  );
};
