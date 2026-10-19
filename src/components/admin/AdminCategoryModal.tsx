import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Loader2,
  Layers,
  Scissors,
  Sparkles,
  Heart,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import {
  SalonCategory,
  fetchCategories,
  createCategory,
  deleteCategory,
} from '../../services/categoriesService';
import { AdminSalonItem } from '../../types/admin';

interface AdminCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  salons?: AdminSalonItem[];
  onCategoryCreated?: (category: SalonCategory) => void;
}

export const AdminCategoryModal: React.FC<AdminCategoryModalProps> = ({
  isOpen,
  onClose,
  salons = [],
  onCategoryCreated,
}) => {
  const [categories, setCategories] = useState<SalonCategory[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setName('');
      setSlug('');
      setIcon('Tag');
      setDescription('');
      setIsSlugManuallyEdited(false);
      setFeedback(null);
    }
  }, [isOpen]);

  const loadCategories = async () => {
    const list = await fetchCategories();
    setCategories(list);
  };

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
      setSlug(autoSlug);
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Informe o nome da categoria.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await createCategory({
      name: name.trim(),
      slug: slug.trim() || undefined,
      icon,
      description: description.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.category) {
      setFeedback({ type: 'success', text: `Categoria "${res.category.name}" criada com sucesso!` });
      setName('');
      setSlug('');
      setDescription('');
      setIsSlugManuallyEdited(false);
      await loadCategories();
      if (onCategoryCreated) {
        onCategoryCreated(res.category);
      }
    } else {
      setFeedback({ type: 'error', text: res.error || 'Erro ao cadastrar categoria.' });
    }
  };

  const handleDelete = async (category: SalonCategory) => {
    if (category.is_default) {
      setFeedback({ type: 'error', text: 'Categorias padrão do sistema não podem ser removidas.' });
      return;
    }

    const salonCount = salons.filter((s) => s.category === category.slug).length;
    if (salonCount > 0) {
      const confirmRemove = window.confirm(
        `Existem ${salonCount} estabelecimento(s) vinculados à categoria "${category.name}". Deseja realmente remover?`
      );
      if (!confirmRemove) return;
    }

    const res = await deleteCategory(category.id);
    if (res.success) {
      setFeedback({ type: 'success', text: `Categoria "${category.name}" removida com sucesso.` });
      await loadCategories();
    } else {
      setFeedback({ type: 'error', text: res.error || 'Erro ao remover categoria.' });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col my-auto max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <FolderPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Gestão de Categorias
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {categories.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Segmentos comerciais dos estabelecimentos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className="px-4 pt-3">
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/90 border border-rose-500/40 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Formulário de Criação */}
          <form onSubmit={handleCreate} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Criar Nova Categoria</span>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Podologia, Esmalteria..."
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="podologia"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono outline-none lowercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Ícone Temático
                  </label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Tag">🏷️ Etiqueta Geral</option>
                    <option value="Scissors">✂️ Tesoura / Cabelo</option>
                    <option value="Sparkles">✨ Beleza & Brilho</option>
                    <option value="Heart">❤️ Bem-Estar / Spa</option>
                    <option value="Palette">🎨 Arte / Tatuagem</option>
                    <option value="Layers">📑 Especialidades</option>
                  </select>
                </div>

                <div className="sm:col-span-7">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cuidados para os pés..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-4 py-2 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Salvar Categoria</span>
                </button>
              </div>
            </div>
          </form>

          {/* Lista de Categorias Existentes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between px-1">
              <span>Categorias Ativas ({categories.length})</span>
              <span className="text-[10px] text-slate-500 font-normal">Estabelecimentos vinculados</span>
            </label>

            <div className="border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
              {categories.map((c) => {
                const count = salons.filter((s) => s.category === c.slug).length;
                return (
                  <div
                    key={c.id || c.slug}
                    className="p-3 flex items-center justify-between hover:bg-slate-900/60 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Tag className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 truncate">{c.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">({c.slug})</span>
                          {c.is_default && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                              Padrão
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-[10px] text-slate-500 truncate">{c.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {count} salões
                      </span>

                      {!c.is_default && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                          title="Remover categoria customizada"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Sincronizado com os formulários de cadastro e filtros de catálogo.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
