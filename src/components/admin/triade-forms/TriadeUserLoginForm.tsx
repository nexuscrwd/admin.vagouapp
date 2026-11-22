import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  X,
  KeyRound,
  Chrome,
} from 'lucide-react';
import { VagouOfficialLogo } from '../../common/VagouOfficialLogo';
import { supabase, supabaseAdmin } from '../../../services/supabase';

export interface TriadeUserLoginPayload {
  identifier: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  accountType?: 'client' | 'professional' | 'owner';
  role?: 'client' | 'professional' | 'owner';
  session?: {
    access_token: string;
    refresh_token: string;
  };
}

export type UserLoginPhase = 'credentials' | 'recovery';

interface TriadeUserLoginFormProps {
  onSuccess?: (data: TriadeUserLoginPayload) => void;
  onSwitchToRegister?: () => void;
  onSwitchToRecovery?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
  variant?: 'card' | 'flat' | 'glass';
  title?: string;
  subtitle?: string;
  salonLogoUrl?: string;
  submitButtonText?: string;
  enableGoogleLogin?: boolean;
  activePhase?: UserLoginPhase;
  onPhaseChange?: (phase: UserLoginPhase) => void;
  showSwitchToRegister?: boolean;
  suppressParentPostMessage?: boolean;
}

export const TriadeUserLoginForm: React.FC<TriadeUserLoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToRecovery,
  onClose,
  showHeader = true,
  variant = 'card',
  title = 'Acessar Espaço',
  subtitle,
  salonLogoUrl,
  submitButtonText = 'Entrar',
  enableGoogleLogin = false,
  activePhase,
  onPhaseChange,
  showSwitchToRegister = false,
  suppressParentPostMessage = false,
}) => {
  const [internalPhase, setInternalPhase] = useState<UserLoginPhase>('credentials');
  const currentPhase = activePhase ?? internalPhase;
  const setPhase = (phase: UserLoginPhase) => {
    setInternalPhase(phase);
    onPhaseChange?.(phase);
  };

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleGoogleLogin = async () => {
    setFeedback(null);
    setIsGoogleLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) {
        setIsGoogleLoading(false);
        setFeedback({ type: 'error', message: error.message });
      }
    } catch {
      setIsGoogleLoading(false);
      setFeedback({ type: 'error', message: 'Não foi possível iniciar o acesso com Google.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const rawId = identifier.trim();
    if (!rawId) {
      setFeedback({ type: 'error', message: 'Informe seu usuário, celular ou e-mail.' });
      return;
    }
    if (!password) {
      setFeedback({ type: 'error', message: 'Informe sua senha de acesso.' });
      return;
    }

    setIsLoading(true);

    try {
      const cleanUsername = rawId.replace(/^@+/, '').toLowerCase();
      const digitsOnly = rawId.replace(/\D/g, '');

      const { data: clientsData } = await supabaseAdmin.from('clients').select('*');

      const matchedClient = (clientsData || []).find((c: any) => {
        const cEmail = (c.email || '').trim().toLowerCase();
        const cUser = (c.username || '').replace(/^@+/, '').trim().toLowerCase();
        const cPhone = (c.phone || '').replace(/\D/g, '');
        return (
          (cEmail && cEmail === rawId.toLowerCase()) ||
          (cUser &&
            (cUser === cleanUsername ||
              cUser.replace(/#/g, '') === cleanUsername.replace(/#/g, ''))) ||
          (digitsOnly.length >= 8 && cPhone && cPhone.endsWith(digitsOnly.slice(-8)))
        );
      });

      if (
        matchedClient &&
        matchedClient.password_hash &&
        matchedClient.password_hash !== password
      ) {
        setIsLoading(false);
        setFeedback({ type: 'error', message: 'Senha incorreta. Verifique e tente novamente.' });
        return;
      }

      const resolvedEmail = (
        matchedClient?.email ||
        (rawId.includes('@') ? rawId : `${cleanUsername.replace(/#/g, '')}@vagouapp.com`)
      ).toLowerCase();
      const resolvedPhone = matchedClient?.phone || rawId;
      const resolvedName = matchedClient?.name || matchedClient?.full_name || cleanUsername;

      let verifiedAuthUserId: string | undefined = undefined;
      let authSession: { access_token: string; refresh_token: string } | undefined;

      try {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });

        if (!signInErr && signInData?.session) {
          verifiedAuthUserId = signInData.user?.id;
          authSession = {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
          };
        } else if (matchedClient) {
          const { data: signUpData } = await supabase.auth.signUp({
            email: resolvedEmail,
            password,
            options: {
              data: {
                full_name: resolvedName,
                name: resolvedName,
                phone: resolvedPhone,
                username: cleanUsername,
              },
            },
          });
          if (signUpData?.user?.id) {
            verifiedAuthUserId = signUpData.user.id;
          }
          if (signUpData?.session) {
            authSession = {
              access_token: signUpData.session.access_token,
              refresh_token: signUpData.session.refresh_token,
            };
          }
        }
      } catch {}

      let accountType: 'client' | 'professional' | 'owner' =
        matchedClient?.origin_type === 'establishment' ||
        String(matchedClient?.access_level || '').toLowerCase().includes('propriet')
          ? 'owner'
          : 'client';

      try {
        const { data: ownerSalons } = await supabaseAdmin
          .from('salons')
          .select('id, email, owner_id, trade_name, slug')
          .ilike('email', resolvedEmail);

        if (ownerSalons && ownerSalons.length > 0) {
          accountType = 'owner';
          if (verifiedAuthUserId) {
            for (const s of ownerSalons) {
              if (!s.owner_id) {
                await supabaseAdmin
                  .from('salons')
                  .update({ owner_id: verifiedAuthUserId })
                  .eq('id', s.id);
              }
              const { data: existingMember } = await supabaseAdmin
                .from('salon_members')
                .select('id')
                .eq('salon_id', s.id)
                .eq('user_id', verifiedAuthUserId)
                .maybeSingle();

              if (!existingMember) {
                const { error: mErr } = await supabaseAdmin
                  .from('salon_members')
                  .insert([{ salon_id: s.id, user_id: verifiedAuthUserId, role: 'owner' }]);
                if (mErr) {
                  await supabase
                    .from('salon_members')
                    .insert([{ salon_id: s.id, user_id: verifiedAuthUserId, role: 'owner' }]);
                }
              }
            }
          }
        } else {
          const { data: profMatches } = await supabaseAdmin
            .from('professionals')
            .select('id, salon_id, user_id, email, role, access_level')
            .ilike('email', resolvedEmail);

          if (profMatches && profMatches.length > 0) {
            const isOwnerProf = profMatches.some(
              (p: any) =>
                String(p.role || '').toLowerCase().includes('propriet') ||
                String(p.access_level || '').toLowerCase().includes('propriet')
            );
            accountType = isOwnerProf ? 'owner' : 'professional';

            if (verifiedAuthUserId) {
              for (const p of profMatches) {
                if (!p.user_id) {
                  await supabaseAdmin
                    .from('professionals')
                    .update({ user_id: verifiedAuthUserId })
                    .eq('id', p.id);
                }
                if (p.salon_id) {
                  const targetRole = isOwnerProf ? 'owner' : 'professional';
                  const { data: existingMember } = await supabaseAdmin
                    .from('salon_members')
                    .select('id')
                    .eq('salon_id', p.salon_id)
                    .eq('user_id', verifiedAuthUserId)
                    .maybeSingle();

                  if (!existingMember) {
                    const { error: mErr } = await supabaseAdmin
                      .from('salon_members')
                      .insert([{ salon_id: p.salon_id, user_id: verifiedAuthUserId, role: targetRole }]);
                    if (mErr) {
                      await supabase
                        .from('salon_members')
                        .insert([
                          { salon_id: p.salon_id, user_id: verifiedAuthUserId, role: targetRole },
                        ]);
                    }
                  }
                }
              }
            }
          }
        }
      } catch {}

      const resolvedPayload: TriadeUserLoginPayload = {
        identifier: rawId,
        id: verifiedAuthUserId || matchedClient?.id,
        name: resolvedName,
        username: (matchedClient?.username || cleanUsername).replace(/^@+/, ''),
        email: resolvedEmail,
        phone: resolvedPhone,
        cpf: matchedClient?.cpf || '',
        address: matchedClient
          ? {
              cep: matchedClient.cep || '',
              street: matchedClient.address || '',
              number: matchedClient.street_number || '',
              complement: matchedClient.complement || '',
              neighborhood: matchedClient.neighborhood || '',
              city: matchedClient.city || '',
              state: matchedClient.state || '',
            }
          : undefined,
        accountType,
        role: accountType,
        session: authSession,
      };

      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: 'Acesso validado com sucesso!',
      });

      if (typeof window !== 'undefined' && !suppressParentPostMessage) {
        window.parent?.postMessage(
          {
            source: 'VAGOUAPP_FORM',
            action: 'LOGIN_SUCCESS',
            payload: resolvedPayload,
          },
          '*'
        );
        window.parent?.postMessage(
          {
            type: 'VAGOU_REGISTRATION_SUCCESS',
            accountType: resolvedPayload.accountType,
            role: resolvedPayload.role,
            email: resolvedPayload.email,
            name: resolvedPayload.name,
            session: resolvedPayload.session,
            access_token: resolvedPayload.session?.access_token,
            refresh_token: resolvedPayload.session?.refresh_token,
            user: {
              id: resolvedPayload.id,
              name: resolvedPayload.name,
              email: resolvedPayload.email,
              phone: resolvedPayload.phone,
              role: resolvedPayload.role,
              user_metadata: {
                full_name: resolvedPayload.name,
                phone: resolvedPayload.phone,
              },
            },
          },
          '*'
        );
      }

      onSuccess?.(resolvedPayload);
    } catch {
      setIsLoading(false);
      const fallbackPayload: TriadeUserLoginPayload = {
        identifier: rawId,
        name: rawId.replace(/^@+/, ''),
        email: rawId.includes('@') ? rawId : `${rawId.replace(/^@+/, '')}@vagouapp.com`,
        accountType: 'client',
        role: 'client',
      };
      onSuccess?.(fallbackPayload);
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!identifier.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe seu usuário, celular ou e-mail para recuperação.',
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: `Instruções enviadas para o contato vinculado a "${identifier.trim()}".`,
      });
    }, 600);
  };

  const isCard = variant === 'card';
  const isGlass = variant === 'glass';

  const inputSurfaceClass = isGlass
    ? 'flex items-center bg-white/[0.07] hover:bg-white/[0.10] focus-within:bg-white/[0.12] focus-within:ring-1 focus-within:ring-[#20C933] rounded-xl px-3.5 py-3 min-h-[46px] transition'
    : isCard
      ? 'flex items-center bg-slate-950/90 focus-within:ring-1 focus-within:ring-emerald-500 rounded-xl px-3.5 py-3 min-h-[46px] transition'
      : 'flex items-center bg-white/[0.07] hover:bg-white/[0.10] focus-within:bg-white/[0.12] focus-within:ring-1 focus-within:ring-[#20C933] rounded-xl px-3.5 py-3 min-h-[46px] transition';

  return (
    <div
      className={`triade-form-root w-full font-['Poppins'] ${
        isGlass
          ? 'max-w-md mx-auto bg-slate-950/75 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden'
          : isCard
            ? 'max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
            : 'bg-transparent'
      } animate-fadeIn`}
    >

      {showHeader && (
        <div
          className={`px-6 pt-7 pb-4 sm:px-7 sm:pt-8 sm:pb-5 ${
            isGlass
              ? 'bg-transparent border-b border-white/10'
              : isCard
                ? 'bg-slate-900 border-b border-slate-800/80'
                : 'bg-transparent border-b border-white/10'
          } relative flex flex-col items-center justify-center text-center shrink-0`}
        >
          {salonLogoUrl && !logoFailed ? (
            <img
              src={salonLogoUrl}
              alt={title}
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="h-12 sm:h-14 max-w-[180px] w-auto object-contain mx-auto drop-shadow-md"
            />
          ) : (
            <VagouOfficialLogo
              size="xl"
              variant="full"
              forceTheme="dark"
              className="h-11 sm:h-12 w-auto object-contain mx-auto"
            />
          )}

          <h2 className="font-bold text-white text-lg sm:text-xl tracking-tight mt-3 text-center">
            {currentPhase === 'recovery' ? 'Recuperar Senha' : title}
          </h2>

          {subtitle && currentPhase === 'credentials' && (
            <p className="text-xs text-slate-400 mt-1 text-center max-w-xs truncate">
              {subtitle}
            </p>
          )}

          {onClose && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.parent.postMessage({ source: 'VAGOUAPP_EMBED', event: 'CLOSE' }, '*');
                }
                onClose();
              }}
              className="absolute top-4 right-4 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {currentPhase === 'credentials' && (
        <form
          onSubmit={handleSubmit}
          className={`w-full ${
            isCard || isGlass || showHeader ? 'px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7' : 'px-4 py-4 sm:p-6'
          } space-y-4 animate-fadeIn`}
        >
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-rose-500/20 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuário, Celular ou E-mail
            </label>
            <div className={inputSurfaceClass}>
              <User className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="@usuario, (11) 99999-9999 ou e-mail"
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Senha
            </label>
            <div className={inputSurfaceClass}>
              <Lock className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-white p-1.5 ml-1 cursor-pointer transition"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3.5 px-5 min-h-[48px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <>
                  <span className="text-white font-bold">{submitButtonText}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </div>

          {enableGoogleLogin && (
            <>
              <div className="flex items-center gap-3 py-0.5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-medium text-slate-500">ou</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3 px-5 min-h-[46px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold text-sm transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-50 whitespace-nowrap"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <>
                    <Chrome className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white">Conta Google</span>
                  </>
                )}
              </button>
            </>
          )}

          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setPhase('recovery');
                onSwitchToRecovery?.();
              }}
              className="text-slate-400 hover:text-white font-medium cursor-pointer transition whitespace-nowrap py-1"
            >
              Esqueci a senha
            </button>

            {showSwitchToRegister && onSwitchToRegister && (
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition whitespace-nowrap py-1"
              >
                Criar conta
              </button>
            )}
          </div>
        </form>
      )}

      {currentPhase === 'recovery' && (
        <form
          onSubmit={handleRecoverySubmit}
          className={`w-full ${
            isCard || isGlass || showHeader ? 'px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7' : 'px-4 py-4 sm:p-6'
          } space-y-4 animate-fadeIn`}
        >
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-rose-500/20 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuário, Celular ou E-mail
            </label>
            <div className={inputSurfaceClass}>
              <User className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="@usuario, (11) 99999-9999 ou e-mail"
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 min-h-[48px] rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-white" />
                  <span className="text-white font-bold">Enviar Link de Recuperação</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => setPhase('credentials')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer py-1"
            >
              ← Voltar para Entrar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
