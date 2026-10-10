import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface SalonLogoProps {
  logoUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  primaryColor?: string;
  className?: string;
  alwaysShow?: boolean;
}

// Medidas padrões retangulares (proporção padrão 16:9 / 16:10 de logotipo)
const sizeClasses = {
  xs: 'w-12 h-7 rounded-md',
  sm: 'w-14 h-8 rounded-lg',
  md: 'w-16 h-9 rounded-lg',
  lg: 'w-20 h-11 rounded-xl',
  xl: 'w-24 h-14 rounded-xl',
  custom: '',
};

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4.5 h-4.5',
  xl: 'w-5 h-5',
  custom: 'w-4 h-4',
};

/**
 * Componente oficial de Logotipo do Estabelecimento / Salão da Tríade VagouApp.
 * Regra: Exibe o logotipo da empresa quando em hover; caso contrário (se não / sem hover / sem logo),
 * exibe um logo provisório, retangular, na medida padrão, com fundo transparente e a legenda "Logotipo".
 */
export const SalonLogo: React.FC<SalonLogoProps> = ({
  logoUrl,
  name,
  size = 'md',
  primaryColor,
  className = '',
  alwaysShow = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const isValidLogo = Boolean(
    logoUrl && logoUrl.trim() !== '' && !imageError
  );

  const containerSize = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;

  // Mostra o logotipo da empresa quando hover ou se alwaysShow for verdadeiro
  const showCompanyLogo = isValidLogo && logoUrl && (isHovered || alwaysShow);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative ${containerSize} bg-transparent border border-slate-300 dark:border-slate-800 border-dashed hover:border-emerald-500/80 transition-all duration-200 shrink-0 flex items-center justify-center cursor-default select-none overflow-visible ${className}`}
      style={primaryColor ? { borderColor: isHovered ? primaryColor : undefined } : undefined}
      title={name ? `${name} - Logotipo` : 'Logotipo do Estabelecimento'}
    >
      {showCompanyLogo ? (
        /* Logotipo real da empresa exibido quando em hover */
        <div className="w-full h-full p-1 flex items-center justify-center animate-fadeIn overflow-hidden rounded-lg">
          <img
            src={logoUrl}
            alt={name || 'Logotipo da Empresa'}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        /* Logo provisório: retangular, na medida padrão, fundo transparente com a legenda Logotipo */
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-center p-1">
          <Building2 className={`${iconSize} text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors shrink-0`} />
          <span className="text-[8px] sm:text-[9px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase font-mono leading-none">
            Logotipo
          </span>
          {/* Indicador sutil quando a empresa possui logotipo para exibição no hover */}
          {isValidLogo && (
            <span
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs"
              title="Logotipo oficial disponível (passe o mouse para visualizar)"
            />
          )}
        </div>
      )}

      {/* Card Flutuante de Zoom em Alta Resolução quando em Hover (se houver logotipo válido) */}
      {isValidLogo && logoUrl && isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-fadeIn">
          <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 min-w-[150px] max-w-[220px]">
            <div className="w-28 h-16 bg-slate-900/90 rounded-lg p-1.5 border border-slate-800 flex items-center justify-center overflow-hidden">
              <img
                src={logoUrl}
                alt={name || 'Logotipo'}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[11px] font-bold text-white truncate max-w-full text-center">
              {name || 'Logotipo Oficial'}
            </span>
            <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">
              Logotipo da Empresa
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
