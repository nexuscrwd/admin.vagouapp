import React from 'react';
import {
  TriadeUserRegisterForm,
  type TriadeUserData,
  type UserRegisterPhase,
} from './TriadeUserRegisterForm';

export interface ClientAddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ClientRegistrationPayload {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  address: ClientAddressData;
  salonId?: string;
  salonName?: string;
}

export interface TriadeMnvClientRegisterFormProps {
  salonId?: string;
  salonName?: string;
  salonLogoUrl?: string;
  salonAccentColor?: string;
  onSuccess?: (payload: ClientRegistrationPayload) => void;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  activePhase?: UserRegisterPhase;
  onPhaseChange?: (phase: UserRegisterPhase) => void;
}

/**
 * TriadeMnvClientRegisterForm (Oficial da Tríade)
 * Unificação Soberana: delega 100% para o formulário oficial TriadeUserRegisterForm em modo establishment.
 * Garante design limpo, stepper de 5 fases, CEP isolado, branding do salão parceiro e sincronização instantânea.
 */
export const TriadeMnvClientRegisterForm: React.FC<TriadeMnvClientRegisterFormProps> = ({
  salonId = 'sal-vagouapp',
  salonName = 'VagouApp',
  salonLogoUrl,
  salonAccentColor = '#20C933',
  onSuccess,
  onSwitchToLogin,
  onClose,
  activePhase,
  onPhaseChange,
}) => {
  return (
    <TriadeUserRegisterForm
      origin="establishment"
      salonId={salonId}
      salonName={salonName}
      salonLogoUrl={salonLogoUrl}
      salonAccentColor={salonAccentColor}
      showHeader={true}
      variant="card"
      onClose={onClose}
      onSwitchToLogin={onSwitchToLogin}
      activePhase={activePhase}
      onPhaseChange={onPhaseChange}
      onSuccess={(userData: TriadeUserData) => {
        const payload: ClientRegistrationPayload = {
          fullName: userData.fullName,
          username: userData.username,
          phone: userData.phone,
          email: userData.email,
          salonId: userData.salonId || salonId,
          salonName: userData.salonName || salonName,
          address: {
            cep: userData.address.cep,
            street: userData.address.street,
            number: userData.address.number,
            complement: userData.address.complement || '',
            neighborhood: userData.address.neighborhood,
            city: userData.address.city,
            state: userData.address.state,
          },
        };
        onSuccess?.(payload);
      }}
    />
  );
};
