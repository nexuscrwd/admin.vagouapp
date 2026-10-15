import React, { useState } from 'react';
import { TriadeAdminLoginForm } from './TriadeAdminLoginForm';
import { TriadeAdminRecoveryForm } from './TriadeAdminRecoveryForm';
import { TriadeAdminRegisterForm } from './TriadeAdminRegisterForm';

export type AdminAuthMode = 'login' | 'recovery' | 'register';

export interface TriadeAdminAuthFormProps {
  onSuccess?: (admin: any) => void;
  initialMode?: AdminAuthMode;
  onClose?: () => void;
}

export const TriadeAdminAuthForm: React.FC<TriadeAdminAuthFormProps> = ({
  onSuccess,
  initialMode = 'login',
  onClose,
}) => {
  const [currentMode, setCurrentMode] = useState<'login' | 'recovery' | 'register'>(initialMode);

  if (currentMode === 'recovery') {
    return (
      <TriadeAdminRecoveryForm
        onSuccess={() => {}}
        onSwitchToLogin={() => setCurrentMode('login')}
        onClose={onClose}
      />
    );
  }

  if (currentMode === 'register') {
    return (
      <TriadeAdminRegisterForm
        onSuccess={(newAdmin) => {
          onSuccess?.(newAdmin);
          setCurrentMode('login');
        }}
        onSwitchToLogin={() => setCurrentMode('login')}
        onClose={onClose}
      />
    );
  }

  return (
    <TriadeAdminLoginForm
      onSuccess={onSuccess}
      onSwitchToRecovery={() => setCurrentMode('recovery')}
      onSwitchToRegister={() => setCurrentMode('register')}
      onClose={onClose}
    />
  );
};

export { TriadeAdminLoginForm } from './TriadeAdminLoginForm';
export { TriadeAdminRecoveryForm } from './TriadeAdminRecoveryForm';
export { TriadeAdminRegisterForm } from './TriadeAdminRegisterForm';
