import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react';
import { TriadeMnvClientLoginForm } from '../admin/triade-forms/TriadeMnvClientLoginForm';
import { TriadeMnvClientRegisterForm } from '../admin/triade-forms/TriadeMnvClientRegisterForm';
import { TriadeEstablishmentMasterForm } from '../admin/triade-forms/TriadeEstablishmentMasterForm';
import { TriadeAdminAuthForm, TriadeAdminLoginForm, TriadeAdminRecoveryForm } from '../admin/triade-forms/TriadeAdminAuthForm';

export type EmbedFormType =
  | 'mnv_login'
  | 'mnv_cadastro'
  | 'estabelecimento'
  | 'admin'
  | 'admin_login'
  | 'admin_recovery';

export interface UniversalFormEmbedViewProps {
  initialForm?: EmbedFormType;
  onExit?: () => void;
}

export const UniversalFormEmbedView: React.FC<UniversalFormEmbedViewProps> = ({
  initialForm,
  onExit,
}) => {
  const [formType, setFormType] = useState<EmbedFormType>(() => {
    if (initialForm) return initialForm;
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const queryForm = params.get('form') || params.get('f');

      if (queryForm === 'mnv_login' || queryForm === 'mnv-login' || queryForm === 'mnv-acesso' || pathname.includes('/embed/mnv-acesso')) {
        return 'mnv_login';
      }
      if (queryForm === 'mnv_cadastro' || queryForm === 'mnv-cadastro' || pathname.includes('/embed/mnv-cadastro')) {
        return 'mnv_cadastro';
      }
      if (queryForm === 'estabelecimento' || queryForm === 'salao' || pathname.includes('/embed/estabelecimento')) {
        return 'estabelecimento';
      }
      if (queryForm === 'admin' || pathname.includes('/embed/admin')) {
        return 'admin';
      }
    }
    return 'mnv_cadastro';
  });

  const [salonName, setSalonName] = useState('Barbearia Rota 99');
  const [serviceName, setServiceName] = useState('Corte Degradê & Barba');
  const [servicePrice, setServicePrice] = useState('R$ 75,00');
  const [isTransparent, setIsTransparent] = useState(false);
  const [isDomainBlocked, setIsDomainBlocked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sName = params.get('salon') || params.get('salonName');
      if (sName) setSalonName(sName);

      const sServ = params.get('service');
      if (sServ) setServiceName(sServ);

      const sPrice = params.get('price');
      if (sPrice) setServicePrice(sPrice);

      const bg = params.get('bg');
      if (bg === 'transparent') setIsTransparent(true);

      // Trava de Domínio para formulário Admin
      if (formType === 'admin') {
        const host = window.location.hostname.toLowerCase();
        const allowedHosts = [
          'admin.vapp.com',
          'adm.vagouapp.com',
          'localhost',
          '127.0.0.1',
        ];
        const isAllowed =
          allowedHosts.some((h) => host.includes(h)) ||
          host.includes('run.app') ||
          host.includes('web.app');

        if (!isAllowed) {
          setIsDomainBlocked(true);
        }
      }
    }
  }, [formType]);

  const dispatchPostMessage = (event: string, payload: any) => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          source: 'VAGOUAPP_EMBED',
          event,
          formType,
          payload,
          timestamp: new Date().toISOString(),
        },
        '*'
      );
    }
  };

  if (isDomainBlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 font-['Poppins']">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-center shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Acesso de Domínio Bloqueado</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              O formulário de acesso Adminvapp só pode ser executado através do domínio corporativo soberano <code>admin.vapp.com</code> ou <code>adm.vagouapp.com</code>.
            </p>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="py-2 px-4 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-4 font-['Poppins'] ${
        isTransparent ? 'bg-transparent' : 'bg-slate-950'
      }`}
    >
      {/* Botão sutil de voltar se aberto fora do iframe */}
      {typeof window !== 'undefined' && window.self === window.top && onExit && (
        <div className="w-full max-w-md mb-2 flex justify-start">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Painel</span>
          </button>
        </div>
      )}

      {/* RENDERIZAÇÃO ISOLADA DO FORMULÁRIO SELECIONADO */}
      <div className="w-full max-w-md animate-fadeIn">
        {formType === 'mnv_login' && (
          <TriadeMnvClientLoginForm
            salonName={salonName}
            onSuccess={(data) => {
              dispatchPostMessage('LOGIN_SUCCESS', data);
            }}
            onSwitchToRegister={() => setFormType('mnv_cadastro')}
          />
        )}

        {formType === 'mnv_cadastro' && (
          <TriadeMnvClientRegisterForm
            salonName={salonName}
            onSuccess={(data) => {
              dispatchPostMessage('REGISTER_SUCCESS', data);
            }}
            onSwitchToLogin={() => setFormType('mnv_login')}
          />
        )}

        {formType === 'estabelecimento' && (
          <div className="w-full max-w-4xl mx-auto">
            <TriadeEstablishmentMasterForm
              initialData={{ tradeName: salonName }}
              isStandalonePreview
              onSuccess={(data) => {
                dispatchPostMessage('SALON_MASTER_SUCCESS', data);
              }}
            />
          </div>
        )}

        {(formType === 'admin' || formType === 'admin_login') && (
          <TriadeAdminLoginForm
            onSuccess={(admin) => {
              dispatchPostMessage('ADMIN_AUTH_SUCCESS', admin);
            }}
            onSwitchToRecovery={() => {
              dispatchPostMessage('SWITCH_TO_RECOVERY', {});
            }}
          />
        )}

        {formType === 'admin_recovery' && (
          <TriadeAdminRecoveryForm
            onSuccess={(info) => {
              dispatchPostMessage('ADMIN_RECOVERY_SUCCESS', info);
            }}
            onSwitchToLogin={() => {
              dispatchPostMessage('SWITCH_TO_LOGIN', {});
            }}
          />
        )}
      </div>
    </div>
  );
};
