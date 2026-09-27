import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  ShieldCheck,
  AlertTriangle,
  Send,
  Copy,
  Check,
  Server,
  Database,
  ExternalLink,
  FileCode,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { TechnicalBulletin, TriadeStatusResponse } from '../../types/admin';
import {
  fetchTriadeStatus,
  fetchTechnicalBulletins,
  createTechnicalBulletin,
} from '../../services/supabaseApi';

export const AdminTriadeGovernance: React.FC = () => {
  const [triadeData, setTriadeData] = useState<TriadeStatusResponse | null>(null);
  const [bulletins, setBulletins] = useState<TechnicalBulletin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New bulletin form state
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TechnicalBulletin['category']>('schema_change');
  const [summary, setSummary] = useState('');
  const [impactedTables, setImpactedTables] = useState('salons, appointments');
  const [sqlMigration, setSqlMigration] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadGovernanceData = async () => {
    setIsLoading(true);
    try {
      const [status, fetchedBulletins] = await Promise.all([
        fetchTriadeStatus(),
        fetchTechnicalBulletins(),
      ]);
      setTriadeData(status);
      setBulletins(fetchedBulletins);
    } catch (err) {
      console.warn('Erro ao carregar dados da Tríade:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGovernanceData();
  }, []);

  const handleCopyBulletin = (bulletin: TechnicalBulletin) => {
    const formatted = `### 📡 COMUNICADO TÉCNICO OFICIAL — TRÍADE VAGOUAPP (7º MANDAMENTO)
**Origem:** ${bulletin.sourceApp}
**Destino:** ${bulletin.targetApps.join(', ')}
**Data:** ${new Date(bulletin.timestamp).toLocaleString('pt-BR')}
**Título:** ${bulletin.title}
**Categoria:** ${bulletin.category}
**Tabelas Impactadas:** ${bulletin.impactedTables.join(', ')}

#### 📝 Resumo do Impacto:
${bulletin.summary}

${bulletin.sqlMigration ? `#### 🛠️ SQL / Schema Migration:\n\`\`\`sql\n${bulletin.sqlMigration}\n\`\`\`\n` : ''}
#### ⚡ Ação Imediata Obrigatória:
${bulletin.instructions}

*Assinado por: ${bulletin.author}*
`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(bulletin.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateBulletin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;

    setIsSubmitting(true);
    try {
      const tablesArray = impactedTables
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await createTechnicalBulletin({
        title,
        category,
        summary,
        impactedTables: tablesArray,
        sqlMigration: sqlMigration.trim() || undefined,
        instructions: instructions.trim() || 'Sincronizar types e models conforme especificado.',
      });

      if (res.success && res.bulletin) {
        setBulletins([res.bulletin, ...bulletins]);
        setSubmitSuccess(true);
        setTitle('');
        setSummary('');
        setSqlMigration('');
        setInstructions('');
        setTimeout(() => {
          setSubmitSuccess(false);
          setIsCreating(false);
        }, 1500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: O 7º Mandamento */}
      <div className="p-5 rounded-xl bg-slate-900 border border-emerald-500/30 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0 shadow-md shadow-emerald-950/50">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Governança da Tríade & O 7º Mandamento
                </h2>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Lei Suprema
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Toda e qualquer alteração de schema no Supabase, colunas, status, triggers, rotas ou design system realizada no <strong>admvapp</strong> DEVE OBRIGATORIAMENTE gerar um Comunicado Técnico Oficial para o <strong>pvapp</strong> e <strong>mnvapp</strong>. Zero pontas soltas na Tríade.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40 shrink-0 self-start md:self-auto"
          >
            <Send className="w-3.5 h-3.5 text-white" />
            <span>Emitir Comunicado Técnico</span>
          </button>
        </div>
      </div>

      {/* Grid: 3 Aplicações da Tríade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* pvapp */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  pvapp
                </span>
                <span className="text-xs font-bold text-white">Portal do Consumidor</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">portal.vagouapp.com</p>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Radar de vagas relâmpago, visualização em mapa com PostGIS e agendamento de horários para clientes finais.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Banco: Supabase (Mesmo Cluster)</span>
            <a
              href="https://portal.vagouapp.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Acessar</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* mnvapp */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  mnvapp
                </span>
                <span className="text-xs font-bold text-white">Meu Negócio Parceiro</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">seunegocio.vagouapp.com</p>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Painel operacional dos donos de salão, gestão da agenda diária, equipe, catálogo de serviços e publicação de vagas no Radar.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Banco: Supabase (Mesmo Cluster)</span>
            <a
              href="https://seunegocio.vagouapp.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Acessar</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* admvapp (Este Projeto) */}
        <div className="p-4 rounded-xl bg-slate-900 border-2 border-emerald-500/50 flex flex-col justify-between shadow-md shadow-emerald-950/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                  admvapp
                </span>
                <span className="text-xs font-bold text-white">Admin Master (Você)</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                Soberano
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">adm.vagouapp.com</p>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Governança central, moderação e aprovação de novos salões, auditoria cadastral, Service Role ativo e gestão de DNS/Cloudflare.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-bold font-mono">Service Role: ATIVO</span>
            <span className="text-[10px] font-mono text-slate-400">Node / Express + Vite</span>
          </div>
        </div>
      </div>

      {/* Form: Emitir Novo Comunicado Técnico (quando ativo) */}
      {isCreating && (
        <form onSubmit={handleCreateBulletin} className="p-5 rounded-xl bg-slate-900 border border-slate-700 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Novo Comunicado Técnico Oficial (7º Mandamento)
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Título do Comunicado *</label>
              <input
                type="text"
                required
                placeholder="Ex: Nova coluna operating_model na tabela salons"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Categoria de Impacto</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
              >
                <option value="schema_change">Alteração de Schema (Tabelas/Colunas)</option>
                <option value="rpc_change">Alteração de RPC / PostGIS</option>
                <option value="status_enum">Novo Status ou Enum de Negócio</option>
                <option value="env_config">Variáveis de Ambiente & DNS</option>
                <option value="breaking_change">Breaking Change / Sincronização Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Tabelas do Supabase Impactadas (separadas por vírgula)</label>
            <input
              type="text"
              value={impactedTables}
              onChange={(e) => setImpactedTables(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Resumo Executivo do Comunicado *</label>
            <textarea
              required
              rows={2}
              placeholder="Explique o que foi alterado e o objetivo de negócio/arquitetura..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Comandos SQL / Migration (Opcional)</label>
            <textarea
              rows={3}
              placeholder="ALTER TABLE salons ADD COLUMN IF NOT EXISTS..."
              value={sqlMigration}
              onChange={(e) => setSqlMigration(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Instruções de Ação para pvapp e mnvapp</label>
            <input
              type="text"
              placeholder="Ex: Atualizar tipos em src/types.ts e reiniciar o dev server"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>{isSubmitting ? 'Emitindo...' : 'Emitir Comunicado Oficial'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Comunicados Emitidos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Histórico de Comunicados Oficiais ({bulletins.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Sincronizados na Tríade</span>
        </div>

        {bulletins.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
            Nenhum comunicado técnico emitido ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {bulletins.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {b.category.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      b.sourceApp === 'mnvapp'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : b.sourceApp === 'pvapp'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}>
                      Origem: {b.sourceApp} ➔ {b.targetApps.join(', ')}
                    </span>
                    <h4 className="text-sm font-bold text-white">{b.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(b.timestamp).toLocaleDateString('pt-BR')} • {new Date(b.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <button
                      onClick={() => handleCopyBulletin(b)}
                      title="Copiar Comunicado Formatado para o pvapp / mnvapp"
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      {copiedId === b.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar Markdown</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{b.summary}</p>

                {b.impactedTables.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">Tabelas:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {b.impactedTables.map((t) => (
                        <span key={t} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {b.sqlMigration && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                    <code>{b.sqlMigration}</code>
                  </div>
                )}

                {b.instructions && (
                  <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <strong className="text-white">Instruções para os projetos irmãos:</strong> {b.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
