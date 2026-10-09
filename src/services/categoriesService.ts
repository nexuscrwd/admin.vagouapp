export interface SalonCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  is_default?: boolean;
  description?: string;
}

export const INITIAL_CATEGORIES: SalonCategory[] = [
  { id: 'cat-salao', name: 'Salão de Beleza', slug: 'salao', icon: 'Scissors', is_default: true },
  { id: 'cat-barbearia', name: 'Barbearia', slug: 'barbearia', icon: 'Scissors', is_default: true },
  { id: 'cat-estetica', name: 'Estética & Spa', slug: 'estetica', icon: 'Sparkles', is_default: true },
  { id: 'cat-manicure', name: 'Esmalteria & Unhas', slug: 'manicure', icon: 'Sparkles', is_default: true },
  { id: 'cat-spa', name: 'Spa & Bem-Estar', slug: 'spa', icon: 'Heart', is_default: true },
  { id: 'cat-podologia', name: 'Podologia', slug: 'podologia', icon: 'Sparkles', is_default: false },
  { id: 'cat-massoterapia', name: 'Massoterapia', slug: 'massoterapia', icon: 'Heart', is_default: false },
  { id: 'cat-tatuagem', name: 'Tatuagem & Piercing', slug: 'tatuagem', icon: 'Palette', is_default: false },
  { id: 'cat-outro', name: 'Outro', slug: 'outro', icon: 'Tag', is_default: true },
];

const STORAGE_KEY = 'vagou_admin_categories';
const CATEGORY_CHANGE_EVENT = 'vagou:category-changed';

export function getStoredCategories(): SalonCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[categoriesService] Erro ao carregar categorias do storage:', err);
  }
  return INITIAL_CATEGORIES;
}

export function saveStoredCategories(categories: SalonCategory[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent(CATEGORY_CHANGE_EVENT, { detail: categories }));
  } catch (err) {
    console.warn('[categoriesService] Erro ao salvar categorias no storage:', err);
  }
}

export async function fetchCategories(): Promise<SalonCategory[]> {
  try {
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        saveStoredCategories(data.categories);
        return data.categories;
      }
    }
  } catch (err) {
    console.warn('[categoriesService] Erro na requisição de categorias:', err);
  }
  return getStoredCategories();
}

export async function createCategory(cat: { name: string; slug?: string; icon?: string; description?: string }): Promise<{ success: boolean; category?: SalonCategory; error?: string }> {
  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    const data = await res.json();
    if (data.success && data.category) {
      const current = getStoredCategories();
      const exists = current.some((c) => c.slug === data.category.slug);
      const updated = exists ? current : [...current, data.category];
      saveStoredCategories(updated);
      return { success: true, category: data.category };
    }
    return { success: false, error: data.error || 'Erro ao criar categoria' };
  } catch (err: any) {
    // Fallback local
    const slug = (cat.slug || cat.name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const current = getStoredCategories();
    if (current.some((c) => c.slug === slug)) {
      return { success: false, error: `Categoria com slug "${slug}" já existe.` };
    }

    const newCat: SalonCategory = {
      id: `cat-${Date.now()}`,
      name: cat.name.trim(),
      slug,
      icon: cat.icon || 'Tag',
      is_default: false,
      description: cat.description,
    };
    saveStoredCategories([...current, newCat]);
    return { success: true, category: newCat };
  }
}

export async function deleteCategory(idOrSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/categories/${idOrSlug}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      const current = getStoredCategories().filter((c) => c.id !== idOrSlug && c.slug !== idOrSlug);
      saveStoredCategories(current);
      return { success: true };
    }
    return { success: false, error: data.error };
  } catch {
    const current = getStoredCategories().filter((c) => c.id !== idOrSlug && c.slug !== idOrSlug);
    saveStoredCategories(current);
    return { success: true };
  }
}

export function getCategoryLabel(slug?: string, categories: SalonCategory[] = getStoredCategories()): string {
  if (!slug) return 'Geral';
  const found = categories.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  if (found) return found.name;
  switch (slug) {
    case 'barbearia':
      return 'Barbearia';
    case 'salao':
      return 'Salão de Beleza';
    case 'estetica':
      return 'Estética & Spa';
    case 'manicure':
      return 'Esmalteria & Unhas';
    case 'spa':
      return 'Spa & Bem-Estar';
    case 'outro':
      return 'Outro';
    default:
      return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
}

export function subscribeCategories(callback: (categories: SalonCategory[]) => void) {
  const handler = (e: any) => {
    callback(e.detail || getStoredCategories());
  };
  window.addEventListener(CATEGORY_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener(CATEGORY_CHANGE_EVENT, handler);
  };
}
