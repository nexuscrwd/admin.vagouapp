/**
 * Utilitário Canônico de Resolução de Avatares da Tríade VagouApp
 * Origem: Tríade VagouApp (mnvapp ⇄ pvapp ⇄ admvapp)
 * 
 * Diretriz Inegociável da Tríade: Erradicação Total de Fotos Mock (Unsplash / Pexels)
 * 1. Zero Mocks: É terminantemente proibido manter URLs de fotos de modelos como fallback de usuários sem foto.
 * 2. Avatar Provisório Canônico: Na ausência de upload real (avatar_url), renderiza exclusivamente
 *    o ícone vetorial fino User (stroke-[1.8]) da biblioteca lucide-react.
 * 3. Upload Real: Fotos só existem se o usuário enviar via câmera ou arquivo próprio (CDN própria / Supabase Storage).
 */

export interface ResolveTriadeAvatarParams {
  professionalAvatar?: string | null;
  clientAvatar?: string | null;
  authMetadataAvatar?: string | null;
  salonLogo?: string | null;
  isBusinessContext?: boolean;
}

/**
 * Detecta se uma URL de avatar é proveniente de bancos de mock/modelos (Unsplash, Pexels, placeholders).
 * Zero Mocks na Tríade: Qualquer URL identificada é sumariamente descartada em favor do UserAvatar canônico.
 */
export function isMockAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = url.trim().toLowerCase();
  if (!cleaned) return false;

  const mockPatterns = [
    'images.unsplash.com',
    'unsplash.com',
    'images.pexels.com',
    'pexels.com',
    'placeholder.com',
    'via.placeholder.com',
    'pravatar.cc',
    'randomuser.me',
    'dummyimage.com',
    'placekitten.com',
    'elisa-pires',
    'elisa_pires',
    '1790534282569',
    '1790537020614',
  ];

  return mockPatterns.some((pattern) => cleaned.includes(pattern));
}

/**
 * Resolução Canônica Universal de Avatares da Tríade.
 * Retorna string vazia '' caso o usuário não possua foto de upload real ou se for URL mock,
 * ativando o fallback oficial UserAvatar com traçado vetorial fino User (stroke-[1.8]).
 */
export function resolveTriadeAvatar(params: ResolveTriadeAvatarParams): string {
  // 1. Candidata de pessoa física: Profissional, Cliente ou Metadados do Auth
  const candidatePersonalPhoto =
    params.professionalAvatar?.trim() ||
    params.clientAvatar?.trim() ||
    params.authMetadataAvatar?.trim() ||
    '';

  // Validação estrita: Descarta se for mock ou vazia
  if (candidatePersonalPhoto && !isMockAvatarUrl(candidatePersonalPhoto)) {
    return candidatePersonalPhoto;
  }

  // 2. Logotipo de salão apenas em contexto estritamente empresarial
  if (params.isBusinessContext && params.salonLogo?.trim() && !isMockAvatarUrl(params.salonLogo)) {
    return params.salonLogo.trim();
  }

  // 3. Fallback Canônico: Retorna string vazia para renderizar o ícone vetorial User da lucide-react
  return '';
}

/**
 * Higienização do LocalStorage contra URLs legadas de modelos/mocks.
 * Executada no boot para purgar resíduos de sessões antigas ou testes.
 */
export function sanitizeLocalStorageAvatars(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let cleanedCount = 0;

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) continue;

      // Se for JSON estruturado, examina campos de avatar
      if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawValue);
          let modified = false;

          const sanitizeObject = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            for (const prop of Object.keys(obj)) {
              if (
                (prop === 'avatar_url' || prop === 'avatar' || prop === 'photoUrl') &&
                typeof obj[prop] === 'string' &&
                isMockAvatarUrl(obj[prop])
              ) {
                obj[prop] = '';
                modified = true;
                cleanedCount++;
              } else if (typeof obj[prop] === 'object') {
                sanitizeObject(obj[prop]);
              }
            }
          };

          sanitizeObject(parsed);

          if (modified) {
            window.localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch {
          // Não é JSON válido, segue
        }
      } else if (isMockAvatarUrl(rawValue)) {
        // String pura que contenha mock
        window.localStorage.removeItem(key);
        cleanedCount++;
      }
    }
  } catch (err) {
    console.warn('Erro ao higienizar localStorage de avatares mock:', err);
  }

  return cleanedCount;
}

// Auto-executa a higienização silenciosa ao importar o módulo no navegador
if (typeof window !== 'undefined') {
  sanitizeLocalStorageAvatars();
}

