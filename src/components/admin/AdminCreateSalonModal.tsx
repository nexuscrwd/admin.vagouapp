import React, { useState } from 'react';
import {
  X,
  Building2,
  Save,
  Globe,
  Phone,
  Mail,
  FileText,
  MapPin,
  Palette,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminSalonItem } from '../../types/admin';

interface AdminCreateSalonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (salon: Partial<AdminSalonItem>) => Promise<boolean>;
}

export const AdminCreateSalonModal: React.FC<AdminCreateSalonModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [formData, setFormData] = useState<Partial<AdminSalonItem>>({
    trade_name: '',
    legal_name: '',
    slug: '',
    category: 'salao',
    status: 'active',
    is_verified: true,
    phone_whatsapp: '',
    email: '',
    document_number: '',
    address: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    cep: '',
    logo_url: '',
    primary_color: '#10B981',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (name: string) => {
    const slugified = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 24);

    setFormData((prev) => ({
      ...prev,
      trade_name: name,
      slug: prev.slug ? prev.slug : slugified,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trade_name?.trim() || !formData.slug?.trim()) {
      setStatusMessage({ type: 'error', text: 'Nome e Subdomínio são obrigatórios.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const success = await onCreate(formData);
      if (success) {
        setStatusMessage({ type: 'success', text: 'Estabelecimento cadastrado com sucesso!' });
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setStatusMessage({ type: 'error', text: 'Erro ao cadastrar estabelecimento.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Erro inesperado na criação do salão.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Novo Estabelecimento (Master Admin)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastro soberano direto no banco Supabase com subdomínio wildcard reservado.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Section 1 */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Identificação Básica
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Studio Bela Vista"
                  value={formData.trade_name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-xs dark:shadow-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Razão Social / Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Bela Vista Estetica Me"
                  value={formData.legal_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-xs dark:shadow-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subdomínio (Slug) *</label>
                <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-lg px-2.5 py-1.5 shadow-xs dark:shadow-none">
                  <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="studiobelavista"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Categoria</label>
                <select
                  value={formData.category || 'salao'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none shadow-xs dark:shadow-none"
                >
                  <option value="salao">Salão de Beleza</option>
                  <option value="barbearia">Barbearia</option>
                  <option value="estetica">Estética & Spa</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Inicial</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none font-semibold shadow-xs dark:shadow-none"
                >
                  <option value="active">Ativo (Aprovado)</option>
                  <option value="pending">Pendente (Moderação)</option>
                  <option value="incomplete">Incompleto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Contato & Localização
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={formData.phone_whatsapp || ''}
                  onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none font-mono shadow-xs dark:shadow-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="contato@salao.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-xs dark:shadow-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Bairro</label>
                <input
                  type="text"
                  placeholder="Pinheiros"
                  value={formData.neighborhood || ''}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-xs dark:shadow-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Endereço Completo</label>
                <input
                  type="text"
                  placeholder="Rua Teodoro Sampaio, 1020"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-xs dark:shadow-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Cidade / UF</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.city || 'São Paulo'}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="col-span-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none shadow-xs dark:shadow-none"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state || 'SP'}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none uppercase font-mono text-center shadow-xs dark:shadow-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
            <span>Cadastrar no Supabase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
