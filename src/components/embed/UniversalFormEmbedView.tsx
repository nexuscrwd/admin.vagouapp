import React, { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { TriadeMnvClientLoginForm } from '../admin/triade-forms/TriadeMnvClientLoginForm';
import { TriadeEstablishmentMasterForm } from '../admin/triade-forms/TriadeEstablishmentMasterForm';
import { TriadeAdminLoginForm, TriadeAdminRecoveryForm } from '../admin/triade-forms/TriadeAdminAuthForm';
import { TriadeUserRegisterForm } from '../admin/triade-forms/TriadeUserRegisterForm';
import { TriadeUserLoginForm } from '../admin/triade-forms/TriadeUserLoginForm';
import { supabaseAdmin } from '../../services/supabase';

export type EmbedFormType =
  | 'usuario'
  | 'usuario_login'
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

      if (
        queryForm === 'usuario_login' ||
        queryForm === 'user_login' ||
        queryForm === 'login-usuario' ||
        pathname.includes('/embed/usuario-login')
      ) {
        return 'usuario_login';
      }
      if (
        queryForm === 'usuario' ||
        queryForm === 'user' ||
        queryForm === 'cadastro-usuario' ||
        queryForm === 'cadastro_usuario' ||
        pathname.includes('/embed/usuario') ||
        pathname.includes('/embed/user')
      ) {
        return 'usuario';
      }
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

  const [salonId, setSalonId] = useState<string | undefined>(undefined);
  const [salonName, setSalonName] = useState('VagouApp');
  const [salonLogoUrl, setSalonLogoUrl] = useState<string | undefined>(undefined);
  const [salonAccentColor, setSalonAccentColor] = useState<string>('#20C933');
  const [isTransparent, setIsTransparent] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const search = window.location.search.toLowerCase();
    return search.includes('bg=transparent') || search.includes('embed=true');
  });
  const [skipUserCheck] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('skip_user_check') === 'true' ||
      params.get('direct') === 'true' ||
      params.get('step') === 'details' ||
      params.get('mode') === 'direct'
    );
  });
  const [isDomainBlocked, setIsDomainBlocked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sId = params.get('salonId') || params.get('sid');
      if (sId) setSalonId(sId);

      const sName = params.get('salon') || params.get('salonName');
      if (sName) setSalonName(sName);

      const sLogo = params.get('salonLogo') || params.get('logo') || params.get('logoUrl');
      if (sLogo) setSalonLogoUrl(sLogo);

      const sColor = params.get('salonColor') || params.get('color') || params.get('accentColor');
      if (sColor) setSalonAccentColor(sColor);

      const slugParam = params.get('slug')?.trim().toLowerCase();
      if (slugParam) {
        supabaseAdmin
          .from('salons')
          .select('id, trade_name, name, logo_url, primary_color')
          .eq('slug', slugParam)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              if (!sId && data.id) setSalonId(data.id);
              if (!sName && (data.trade_name || data.name)) setSalonName(data.trade_name || data.name);
              if (!sLogo && data.logo_url) setSalonLogoUrl(data.logo_url);
              if (!sColor && data.primary_color) setSalonAccentColor(data.primary_color);
            }
          });
      }

      const bg = params.get('bg');
      if (bg === 'transparent') setIsTransparent(true);

      // Trava de Domínio para formulário Admin
      if (formType === 'admin') {
        const host = window.location.hostname.toLowerCase();
        const allowedHosts = [
          'admin.vapp.com',
          'adm.vagouapp.com',
          'admin.vagouapp.com',
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
      const messageData = {
        source: 'VAGOUAPP_EMBED',
        event,
        action: event,
        formType,
        payload,
        timestamp: new Date().toISOString(),
      };
      window.parent.postMessage(messageData, '*');
      window.parent.postMessage({ ...messageData, source: 'VAGOUAPP_FORM' }, '*');

      if (event === 'CLOSE') {
        window.parent.postMessage({ type: 'VAGOU_MODAL_CLOSE' }, '*');
        window.parent.postMessage({ type: 'CLOSE_MODAL' }, '*');
      } else if (
        event === 'LOGIN_SUCCESS' ||
        event === 'REGISTER_SUCCESS' ||
        event === 'USER_REGISTER_SUCCESS' ||
        event === 'SALON_CLIENT_REGISTERED' ||
        event === 'SALON_MASTER_SUCCESS'
      ) {
        const userName = payload?.fullName || payload?.name || payload?.ownerName || payload?.identifier || 'Usuário';
        const userEmail = payload?.email || payload?.ownerEmail || payload?.identifier || '';
        const userPhone = payload?.phone || payload?.ownerPhone || '';
        const accountType =
          payload?.accountType ||
          (formType === 'estabelecimento' || payload?.origin === 'estabelecimento' || payload?.origin === 'profissional'
            ? 'owner'
            : 'client');

        window.parent.postMessage(
          {
            type: 'VAGOU_REGISTRATION_SUCCESS',
            accountType,
            role: payload?.role || accountType,
            email: userEmail,
            name: userName,
            session: payload?.session,
            access_token: payload?.session?.access_token || payload?.access_token,
            refresh_token: payload?.session?.refresh_token || payload?.refresh_token,
            user: {
              id: payload?.id,
              name: userName,
              email: userEmail,
              phone: userPhone,
              role: payload?.role || accountType,
              user_metadata: {
                full_name: userName,
                phone: userPhone,
              },
            },
          },
          '*'
        );
      }
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

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.parent.postMessage({ source: 'VAGOUAPP_EMBED', event: 'CLOSE' }, '*');
    }
    dispatchPostMessage('CLOSE', {});
    if (onExit) {
      onExit();
    } else if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-0 sm:p-4 font-['Poppins'] ${
        isTransparent ? 'bg-transparent is-embed-transparent' : 'bg-slate-950'
      }`}
    >
      {/* 🔹 Container Oficial do Design System Corporativo — Vidro Jateado (Fullwidth & Zero Padding Mobile) */}
      <div className="w-full max-w-4xl mx-auto p-0 sm:p-8 rounded-none sm:rounded-3xl bg-slate-950/45 backdrop-blur-xl border-0 sm:border sm:border-white/20 shadow-none sm:shadow-[0_16px_56px_rgba(0,0,0,0.75)] text-slate-100 font-['Poppins'] relative animate-fadeIn">
        {/* 🔹 Botão de Fechar Padronizado Oficial da Tríade */}
        <button
          type="button"
          onClick={() => {
            // Comunicação universal com a janela pai
            window.parent.postMessage({ source: 'VAGOUAPP_EMBED', event: 'CLOSE' }, '*');
            handleClose();
          }}
          className="absolute top-3.5 right-3.5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-30"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Formulários Internos em Layout Plano (Flat & Clean — Sem Box Dentro de Box) */}
        {formType === 'usuario' && (
          <div className="w-full">
            <TriadeUserRegisterForm
              origin={salonId ? 'establishment' : 'portal'}
              salonId={salonId}
              salonName={salonName}
              salonLogoUrl={salonLogoUrl}
              salonAccentColor={salonAccentColor}
              variant="flat"
              showHeader={true}
              onSuccess={(data) => {
                dispatchPostMessage('USER_REGISTER_SUCCESS', data);
              }}
              onSwitchToLogin={() => setFormType('mnv_login')}
            />
          </div>
        )}

        {formType === 'usuario_login' && (
          <div className="w-full">
            <TriadeUserLoginForm
              variant="flat"
              showHeader={true}
              onSuccess={(data) => {
                dispatchPostMessage('LOGIN_SUCCESS', data);
              }}
              onSwitchToRegister={() => setFormType('usuario')}
            />
          </div>
        )}

        {formType === 'mnv_login' && (
          <div className="w-full">
            <TriadeMnvClientLoginForm
              salonName={salonName}
              variant="flat"
              showHeader={true}
              onSuccess={(data) => {
                dispatchPostMessage('LOGIN_SUCCESS', data);
              }}
              onSwitchToRegister={() => setFormType('mnv_cadastro')}
            />
          </div>
        )}

        {formType === 'mnv_cadastro' && (
          <div className="w-full">
            <TriadeUserRegisterForm
              origin="establishment"
              salonId={salonId}
              salonName={salonName}
              salonLogoUrl={salonLogoUrl}
              salonAccentColor={salonAccentColor}
              variant="flat"
              showHeader={true}
              onSuccess={(data) => {
                dispatchPostMessage('REGISTER_SUCCESS', data);
                dispatchPostMessage('SALON_CLIENT_REGISTERED', data);
              }}
              onSwitchToLogin={() => setFormType('mnv_login')}
            />
          </div>
        )}

        {formType === 'estabelecimento' && (
          <div className="w-full">
            <TriadeEstablishmentMasterForm
              initialData={salonName && salonName !== 'VagouApp' ? { tradeName: salonName } : undefined}
              isStandalonePreview
              initialStep={skipUserCheck ? 'establishment_details' : 'user_check'}
              onSuccess={(data) => {
                dispatchPostMessage('SALON_MASTER_SUCCESS', data);
              }}
            />
          </div>
        )}

        {(formType === 'admin' || formType === 'admin_login') && (
          <TriadeAdminLoginForm
            variant="flat"
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
            variant="flat"
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
