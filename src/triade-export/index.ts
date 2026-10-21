/**
 * =========================================================================
 * 🏛️ VAGOUAPP — PACOTE OFICIAL DE FORMULÁRIOS DA TRÍADE
 * =========================================================================
 * 
 * Este pacote exporta a suíte definitiva e soberana de formulários do ecossistema VagouApp,
 * unificada para consumo por todos os nós da Tríade:
 * 
 * 1. pvapp   (portal.vagouapp.com)     - Marketplace do Consumidor
 * 2. mnvapp  (seunegocio.vagouapp.com) - Aplicativo de Gestão do Salão Parceiro
 * 3. admvapp (adm.vagouapp.com)        - Painel de Governança Master
 * 
 * DIRETRIZES DE DESIGN CONSOLIDADAS:
 * - Botão Fechar (X) Padronizado: Presente em 100% dos formulários para fechamento suave ou postMessage
 * - Anti-Slop & Síntese Mobile (pouco texto, máximo contraste e ícones objetivos)
 * - Trava do Fundo Verde: bg-[#20C933] / bg-emerald-500 = SEMPRE texto e ícones brancos (text-white)
 * - Sem "Box dentro de Box": Layout flat e respiração visual elegante
 * - Modal "Mesmo Endereço do Usuário" no cadastro do estabelecimento
 * - 100% Lucide-React
 * =========================================================================
 */

// Formulário Master de Cadastro de Estabelecimento / Salão
export {
  TriadeEstablishmentMasterForm,
  type TriadeEstablishmentMasterFormProps,
  type EstablishmentMasterPayload,
} from '../components/admin/triade-forms/TriadeEstablishmentMasterForm';

export {
  TriadeEstablishmentModal,
  type TriadeEstablishmentModalProps,
} from '../components/admin/triade-forms/TriadeEstablishmentModal';

// Formulários do Usuário / Cliente (mnvapp e pvapp)
export {
  TriadeUserRegisterForm,
  type TriadeUserRegisterFormProps,
  type TriadeUserData,
  type UserRegisterPhase,
} from '../components/admin/triade-forms/TriadeUserRegisterForm';

export {
  TriadeUserLoginForm,
  type TriadeUserLoginFormProps,
  type UserLoginPhase,
} from '../components/admin/triade-forms/TriadeUserLoginForm';

export {
  TriadeMnvClientLoginForm,
  type TriadeMnvClientLoginFormProps,
} from '../components/admin/triade-forms/TriadeMnvClientLoginForm';

// Formulários de Governança Admin Master
export {
  TriadeAdminAuthForm,
  TriadeAdminLoginForm,
  TriadeAdminRecoveryForm,
  type TriadeAdminAuthFormProps,
  type AdminAuthMode,
} from '../components/admin/triade-forms/TriadeAdminAuthForm';

export {
  TriadeAdminRegisterForm,
  type TriadeAdminRegisterFormProps,
} from '../components/admin/triade-forms/TriadeAdminRegisterForm';

// Visualizador Universal de Embed (Iframe / Standalone URL)
export {
  UniversalFormEmbedView,
  type UniversalFormEmbedViewProps,
  type EmbedFormType,
} from '../components/embed/UniversalFormEmbedView';
