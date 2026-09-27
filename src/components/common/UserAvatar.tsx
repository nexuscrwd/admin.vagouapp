import React, { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
};

const iconSizes = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-4.5 h-4.5',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

const roundedClasses = {
  xs: 'rounded-md',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
};

/**
 * Componente padrão de Avatar da Tríade VagouApp.
 * Anti-Slop: Elimina o uso de fotos genéricas de banco de imagens ou círculos pesados de letras.
 * Modelo Moldura Quadrada (com cantos suavemente arredondados).
 * Em ausência de foto real válida enviada pelo usuário/profissional,
 * renderiza o ícone vetorial User da biblioteca lucide-react com traço fino (stroke-[1.8]).
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Validação rigorosa anti-slop: descarta fotos provisórias de estoque ou vazias
  const isValidPhoto = Boolean(
    photoUrl &&
    photoUrl.trim() !== '' &&
    !photoUrl.includes('unsplash.com') &&
    !photoUrl.includes('images.unsplash') &&
    !imageError
  );

  const containerSize = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;
  const roundedClass = roundedClasses[size] || 'rounded-xl';

  if (isValidPhoto && photoUrl) {
    return (
      <div
        className={`${containerSize} ${roundedClass} overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 ${className}`}
      >
        <img
          src={photoUrl}
          alt={name || 'Avatar do Usuário'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback padrão homologado pela Tríade: Moldura quadrada com cantos arredondados e ícone User de traço fino
  return (
    <div
      className={`${containerSize} ${roundedClass} bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition shadow-xs ${className}`}
      title={name || 'Usuário'}
    >
      <User className={`${iconSize} stroke-[1.8]`} />
    </div>
  );
};
