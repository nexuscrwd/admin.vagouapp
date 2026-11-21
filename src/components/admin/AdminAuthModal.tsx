import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AdminAuthTab, SystemAdminUser } from '../../types/admin';
import { TriadeAdminLoginForm } from './triade-forms/TriadeAdminLoginForm';
import { TriadeAdminRecoveryForm } from './triade-forms/TriadeAdminRecoveryForm';
import { TriadeAdminRegisterForm } from './triade-forms/TriadeAdminRegisterForm';
import { AdminBootstrapForm } from './AdminBootstrapForm';

interface AdminAuthModalProps {
  isOpen: boolean;
  initialTab?: AdminAuthTab;
  onClose?: () => void;
  onSuccess: (admin: SystemAdminUser) => void;
  isGate?: boolean;
  needsBootstrap?: boolean;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess,
  isGate = false,
  needsBootstrap = false,
}) => {
  const [activeTab, setActiveTab] = useState<AdminAuthTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const safeClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return createPortal(
    <div
      className={`admvapp-shell fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto transition-colors ${
        isGate
          ? 'bg-slate-100 dark:bg-slate-950'
          : 'bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-md animate-fadeIn'
      }`}
      style={isGate ? { backgroundColor: 'var(--admin-app-bg)' } : undefined}
    >
      <div className="relative w-full max-w-md my-auto transition-all duration-200">

        {!isGate && typeof onClose === 'function' && (
          <button
            type="button"
            onClick={safeClose}
            className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-white/90 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-lg"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {needsBootstrap ? (
          <AdminBootstrapForm
            onSuccess={(admin) => {
              onSuccess(admin);
              safeClose();
            }}
          />
        ) : (
          <>

            {activeTab === 'login' && (
              <TriadeAdminLoginForm
                onSuccess={(admin) => {
                  onSuccess(admin);
                  safeClose();
                }}
                onSwitchToRecovery={() => setActiveTab('recovery')}
                onSwitchToRegister={() => setActiveTab('register')}
              />
            )}

            {activeTab === 'recovery' && (
              <TriadeAdminRecoveryForm
                onSuccess={() => {}}
                onSwitchToLogin={() => setActiveTab('login')}
              />
            )}

            {activeTab === 'register' && (
              <TriadeAdminRegisterForm
                onSuccess={(newAdmin) => {
                  onSuccess(newAdmin);
                  safeClose();
                }}
                onSwitchToLogin={() => setActiveTab('login')}
              />
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
