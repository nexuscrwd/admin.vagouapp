import React, { useState } from 'react';
import { UserCheck, UserPlus, X } from 'lucide-react';
import { TriadeUserLoginForm, TriadeUserLoginPayload } from './TriadeUserLoginForm';
import { TriadeUserRegisterForm, TriadeUserData } from './TriadeUserRegisterForm';

export type UserAuthMode = 'login' | 'register';

export interface TriadeUserAuthCardProps {
  initialMode?: UserAuthMode;
  onSuccess?: (result: { mode: UserAuthMode; data: TriadeUserLoginPayload | TriadeUserData }) => void;
  onClose?: () => void;
  origin?: 'portal' | 'establishment';
  salonId?: string;
  salonName?: string;
  salonLogoUrl?: string;
  salonAccentColor?: string;
  variant?: 'card' | 'flat';
}

/**
 * 🏛️ Componente Unificado de Autenticação do Usuário (Tríade VagouApp)
 * Alterna perfeitamente entre Login e Cadastro com aba superior sincronizada.
 * 100% compatível para importação e reuso no pvapp, mnvapp e admvapp.
 */
export const TriadeUserAuthCard: React.FC<TriadeUserAuthCardProps> = ({
  initialMode = 'login',
  onSuccess,
  onClose,
  origin = 'portal',
  salonId,
  salonName,
  salonLogoUrl,
  salonAccentColor = '#20C933',
  variant = 'card',
}) => {
  const [mode, setMode] = useState<UserAuthMode>(initialMode);

  return (
    <div className={`w-full max-w-md mx-auto ${variant === 'card' ? 'bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden' : ''}`}>
      {/* Barra de alternância rápida Login / Cadastro */}
      <div className="p-2 sm:p-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 flex-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              mode === 'login'
                ? 'bg-[#20C933] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className={`w-3.5 h-3.5 ${mode === 'login' ? 'text-white' : 'text-emerald-400'}`} />
            <span>Já tenho conta</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              mode === 'register'
                ? 'bg-[#20C933] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserPlus className={`w-3.5 h-3.5 ${mode === 'register' ? 'text-white' : 'text-emerald-400'}`} />
            <span>Criar nova conta</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/60 transition cursor-pointer shrink-0"
            title="Fechar formulário"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Exibição do Formulário Selecionado */}
      <div className="p-0">
        {mode === 'login' ? (
          <TriadeUserLoginForm
            variant="flat"
            showHeader={false}
            showSwitchToRegister={true}
            onSwitchToRegister={() => setMode('register')}
            onSuccess={(data) => onSuccess?.({ mode: 'login', data })}
            onClose={onClose}
          />
        ) : (
          <TriadeUserRegisterForm
            variant="flat"
            showHeader={false}
            showSwitchToLogin={true}
            onSwitchToLogin={() => setMode('login')}
            origin={origin}
            salonId={salonId}
            salonName={salonName}
            salonLogoUrl={salonLogoUrl}
            salonAccentColor={salonAccentColor}
            onSuccess={(data) => onSuccess?.({ mode: 'register', data })}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};
