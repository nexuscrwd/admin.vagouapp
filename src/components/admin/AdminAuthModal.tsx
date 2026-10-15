import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AdminAuthTab, SystemAdminUser } from '../../types/admin';
import { TriadeAdminLoginForm } from './triade-forms/TriadeAdminLoginForm';
import { TriadeAdminRecoveryForm } from './triade-forms/TriadeAdminRecoveryForm';
import { TriadeAdminRegisterForm } from './triade-forms/TriadeAdminRegisterForm';

interface AdminAuthModalProps {
  isOpen: boolean;
  initialTab?: AdminAuthTab;
  onClose?: () => void;
  onSuccess: (admin: SystemAdminUser) => void;
  isGate?: boolean;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess,
  isGate = false,
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto ${
        isGate ? 'bg-slate-950' : 'bg-slate-950/85 backdrop-blur-md animate-fadeIn'
      }`}
    >
      <div
        className={`relative w-full ${
          activeTab === 'register' ? 'max-w-lg' : 'max-w-md'
        } my-auto transition-all duration-200`}
      >
        {/* Botão de Fechar flutuante se não for Gate */}
        {!isGate && typeof onClose === 'function' && (
          <button
            type="button"
            onClick={safeClose}
            className="absolute top-3 right-3 z-30 p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer shadow-lg"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* TAB 1: LOGIN */}
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

        {/* TAB 2: RECUPERAÇÃO DE ACESSO */}
        {activeTab === 'recovery' && (
          <TriadeAdminRecoveryForm
            onSuccess={() => {}}
            onSwitchToLogin={() => setActiveTab('login')}
          />
        )}

        {/* TAB 3: CADASTRO DE NOVO ADMINISTRADOR */}
        {activeTab === 'register' && (
          <TriadeAdminRegisterForm
            onSuccess={(newAdmin) => {
              onSuccess(newAdmin);
              safeClose();
            }}
            onSwitchToLogin={() => setActiveTab('login')}
          />
        )}
      </div>
    </div>,
    document.body
  );
};
