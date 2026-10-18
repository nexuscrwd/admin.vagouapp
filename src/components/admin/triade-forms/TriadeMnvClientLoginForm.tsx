import React from 'react';
import {
  TriadeUserLoginForm,
  type UserLoginPhase,
  type TriadeUserLoginPayload,
} from './TriadeUserLoginForm';

export interface TriadeMnvClientLoginFormProps {
  salonName?: string;
  salonColor?: string;
  onSuccess?: (payload: { identifier: string }) => void;
  onSwitchToRegister?: () => void;
  onSwitchToRecovery?: () => void;
  onClose?: () => void;
  activePhase?: UserLoginPhase;
  onPhaseChange?: (phase: UserLoginPhase) => void;
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
}) => {
  const isVagouApp = salonName === 'VagouApp' || !salonName;

  return (
    <TriadeUserLoginForm
      showHeader={true}
      variant="card"
      title={isVagouApp ? 'Acessar Espaço' : `Acessar ${salonName}`}
      submitButtonText="Entrar no App do Salão"
      activePhase={activePhase}
      onPhaseChange={onPhaseChange}
      onClose={onClose}
      onSwitchToRegister={onSwitchToRegister}
      onSwitchToRecovery={onSwitchToRecovery}
      onSuccess={(payload: TriadeUserLoginPayload) => {
        onSuccess?.({ identifier: payload.identifier });
      }}
    />
  );
};
