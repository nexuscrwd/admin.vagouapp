import React, { useEffect, useState, useRef } from 'react';
import { Bell, BellRing, BellOff, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getAdminPushStatus,
  registerAdminWebPush,
  unregisterAdminWebPush,
  sendTestAdminPush,
} from '../../services/webPushClient';

interface AdminPushToggleProps {
  adminId?: string;
  adminRole?: string;
}

export const AdminPushToggle: React.FC<AdminPushToggleProps> = ({
  adminId,
  adminRole = 'super_admin',
}) => {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const syncStatus = async () => {
    const st = await getAdminPushStatus();
    setSupported(st.supported);
    setSubscribed(st.subscribed);
  };

  useEffect(() => {
    syncStatus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  if (!supported) return null;

  const showTempFeedback = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const res = await registerAdminWebPush(adminRole, adminId);
      if (res.success) {
        setSubscribed(true);
        setMenuOpen(true);
        showTempFeedback('ok', 'Push ativado neste dispositivo');
      } else {
        setMenuOpen(true);
        showTempFeedback('err', res.error || 'Permissão negada');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const res = await sendTestAdminPush();
      if (res.success) {
        showTempFeedback('ok', `Notificação enviada (${res.sent || 1})`);
      } else {
        showTempFeedback('err', res.error || 'Falha no envio');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await unregisterAdminWebPush();
      setSubscribed(false);
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (subscribed) {
            setMenuOpen((prev) => !prev);
          } else {
            handleEnable();
          }
        }}
        title={subscribed ? 'Notificações Push ativas' : 'Ativar Notificações Push'}
        className={`relative p-2 rounded-lg border transition-all duration-150 cursor-pointer active:scale-95 ${
          subscribed
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300'
        }`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
        ) : subscribed ? (
          <BellRing className="w-4 h-4 text-emerald-500" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {subscribed && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
            <span>Notificações Push</span>
            <span className={subscribed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
              {subscribed ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg ${
                feedback.type === 'ok'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              }`}
            >
              {feedback.type === 'ok' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {subscribed ? (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={handleTest}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Testar Push Agora</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDisable}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <BellOff className="w-3.5 h-3.5" />
                <span>Desativar neste aparelho</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={handleEnable}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              <BellRing className="w-3.5 h-3.5 text-white" />
              <span>Ativar Alertas</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
