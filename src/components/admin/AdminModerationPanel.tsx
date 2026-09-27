import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Edit,
  Building2,
  Check,
} from 'lucide-react';
import { AdminSalonItem } from '../../types/admin';

interface AdminModerationPanelProps {
  salons: AdminSalonItem[];
  onEditSalon: (salon: AdminSalonItem) => void;
  onUpdateStatus: (salonId: string, status: AdminSalonItem['status']) => void;
  limit?: number;
}

export const AdminModerationPanel: React.FC<AdminModerationPanelProps> = ({
  salons,
  onEditSalon,
  onUpdateStatus,
  limit,
}) => {
  let pendingSalons = salons.filter((s) => s.status === 'pending');
  let incompleteSalons = salons.filter((s) => s.status === 'incomplete');

  if (limit) {
    pendingSalons = pendingSalons.slice(0, limit);
    incompleteSalons = incompleteSalons.slice(0, limit);
  }

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-amber-900 dark:text-white tracking-tight">
            Fila de Moderação & Auditoria de Estabelecimentos
          </h2>
          <p className="text-xs text-amber-800 dark:text-slate-300 mt-0.5">
            Analise e aprove novos salões cadastrados no ecossistema Vagou. Verifique subdomínios, dados de contato e conceda o selo oficial.
          </p>
        </div>
      </div>

      {/* Section 1: Aguardando Aprovação */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Aguardando Aprovação ({pendingSalons.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Salões prontos para análise</span>
        </div>

        {pendingSalons.length === 0 ? (
          <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-slate-900 dark:text-white">Nenhum salão aguardando aprovação no momento.</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Todos os estabelecimentos estão moderados ou ativos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingSalons.map((salon) => (
              <div
                key={salon.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 hover:border-amber-400 dark:hover:border-amber-500/50 transition flex flex-col justify-between shadow-xs dark:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: salon.primary_color || '#F59E0B' }}
                      >
                        {salon.logo_url && !salon.logo_url.includes('unsplash') ? (
                          <img
                            src={salon.logo_url}
                            alt={salon.trade_name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{salon.trade_name}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{salon.legal_name || 'Sem razão social informada'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40">
                      Pendente
                    </span>
                  </div>

                  <div className="space-y-1.5 py-2.5 my-2 border-y border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Subdomínio:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{salon.slug}.vagouapp.com</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">WhatsApp:</span>
                      <span className="font-mono">{salon.phone_whatsapp || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Local:</span>
                      <span>{salon.neighborhood || salon.city} - {salon.state}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => onUpdateStatus(salon.id, 'active')}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Aprovar Imediatamente</span>
                  </button>

                  <button
                    onClick={() => onEditSalon(salon)}
                    className="py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                    <span>Revisar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Cadastros Incompletos */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Cadastros com Dados Incompletos ({incompleteSalons.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Faltam documentos, endereço ou telefone</span>
        </div>

        {incompleteSalons.length === 0 ? (
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nenhum cadastro incompleto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {incompleteSalons.map((salon) => (
              <div
                key={salon.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30 flex items-center justify-between gap-3 shadow-xs dark:shadow-md"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{salon.trade_name}</h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                    {salon.slug}.vagouapp.com
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-1">
                    ⚠️ Pendente de CPF/CNPJ ou Endereço Completo
                  </span>
                </div>

                <button
                  onClick={() => onEditSalon(salon)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-none"
                >
                  Completar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
