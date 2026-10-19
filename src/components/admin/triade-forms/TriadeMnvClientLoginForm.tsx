import React from 'react';
import {
  TriadeUserLoginForm,
  type UserLoginPhase,
  type TriadeUserLoginPayload,
} from './TriadeUserLoginForm';

export interface TriadeMnvClientLoginFormProps {
  salonName?: string;
  salonColor?: string;
  onSuccess?: (payload: TriadeUserLoginPayload) => void;
  onSwitchToRegister?: () => void;
  onSwitchToRecovery?: () => void;
  onClose?: () => void;
  activePhase?: UserLoginPhase;
  onPhaseChange?: (phase: UserLoginPhase) => void;
  variant?: 'card' | 'flat';
  showHeader?: boolean;
}

/**
 * TriadeMnvClientLoginForm (Oficial da Tríade)
 * Unificação Soberana: delega 100% para o motor canônico TriadeUserLoginForm.
 * Garante zero duplicação de código, suporte nativo às fases de Credenciais e Recuperação de Senha,
 * e contraste estrito no ecossistema VagouApp.
 */
export const TriadeMnvClientLoginForm: React.FC<TriadeMnvClientLoginFormProps> = ({
  salonName = 'VagouApp',
  onSuccess,
  onSwitchToRegister,
  onSwitchToRecovery,
  onClose,
  activePhase,
  onPhaseChange,
  variant = 'card',
  showHeader = true,
}) => {
  const isVagouApp = salonName === 'VagouApp' || !salonName;

  return (
    <TriadeUserLoginForm
      showHeader={showHeader}
      variant={variant}
      title={isVagouApp ? 'Acessar Espaço' : `Acessar ${salonName}`}
      submitButtonText="Entrar no App do Salão"
      activePhase={activePhase}
      onPhaseChange={onPhaseChange}
      onClose={onClose}
      onSwitchToRegister={onSwitchToRegister}
      showSwitchToRegister={Boolean(onSwitchToRegister)}
      onSwitchToRecovery={onSwitchToRecovery}
      onSuccess={(payload: TriadeUserLoginPayload) => {
        onSuccess?.(payload);
      }}
    />
  );
};
