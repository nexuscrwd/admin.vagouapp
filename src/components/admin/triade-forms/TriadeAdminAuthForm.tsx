import React, { useState } from 'react';
import { TriadeAdminLoginForm } from './TriadeAdminLoginForm';
import { TriadeAdminRecoveryForm } from './TriadeAdminRecoveryForm';

export interface TriadeAdminAuthFormProps {
  onSuccess?: (admin: any) => void;
  initialMode?: 'login' | 'recovery';
}

export const TriadeAdminAuthForm: React.FC<TriadeAdminAuthFormProps> = ({
  onSuccess,
  initialMode = 'login',
}) => {
  const [currentMode, setCurrentMode] = useState<'login' | 'recovery'>(initialMode);

  if (currentMode === 'recovery') {
    return (
      <TriadeAdminRecoveryForm
        onSuccess={() => {}}
        onSwitchToLogin={() => setCurrentMode('login')}
      />
    );
  }

  return (
    <TriadeAdminLoginForm
      onSuccess={onSuccess}
      onSwitchToRecovery={() => setCurrentMode('recovery')}
    />
  );
};

export { TriadeAdminLoginForm } from './TriadeAdminLoginForm';
export { TriadeAdminRecoveryForm } from './TriadeAdminRecoveryForm';
