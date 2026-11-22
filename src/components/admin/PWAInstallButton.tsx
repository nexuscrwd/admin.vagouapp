import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, Share2, MoreVertical, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const result = await install();
      if (result === 'manual') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === 'banner' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs shadow-sm transition cursor-pointer active:scale-[0.99]"
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <Smartphone className="w-4 h-4 text-white shrink-0" />
            <span>Instalar Admin-Vapp (PWA)</span>
          </span>
          <Download className="w-4 h-4 text-white shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          title="Instalar Admin-Vapp como aplicativo"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      )}

      {showGuide &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Instalar Admin-Vapp
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isIOS ? (
                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <p className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>1. Toque em <strong>Compartilhar</strong> no Safari.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>2. Toque em <strong>Adicionar à Tela de Início</strong>.</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <p className="flex items-center gap-2">
                    <MoreVertical className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>1. Toque no menu <strong>⋮</strong> do navegador.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>2. Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</span>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
