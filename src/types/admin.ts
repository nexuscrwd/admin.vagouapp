export type AdminScreenId =
  | 'dashboard'
  | 'salons'
  | 'moderation'
  | 'appointments'
  | 'triade'
  | 'settings';

export type SalonFilterStatus = 'all' | 'active' | 'pending' | 'incomplete' | 'suspended';

export type SalonSegmentFilter = 'all' | 'barbearia' | 'salao' | 'estetica' | 'outro';

export interface AdminSalonItem {
  id: string;
  trade_name: string;
  legal_name?: string;
  slug: string;
  category: 'barbearia' | 'salao' | 'estetica' | 'outro';
  status: 'active' | 'pending' | 'incomplete' | 'suspended';
  is_verified?: boolean;
  phone_whatsapp?: string;
  email?: string;
  document_number?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  logo_url?: string;
  primary_color?: string;
  created_at?: string;
  professionals_count?: number;
  active_offers_count?: number;
  rating?: number;
}

export interface AdminDashboardMetrics {
  totalSalons: number;
  activeSalons: number;
  pendingSalons: number;
  incompleteSalons: number;
  suspendedSalons: number;
  todayAppointments: number;
  activeFlashOffers: number;
  growthPercent: number;
}

export interface TechnicalBulletin {
  id: string;
  timestamp: string;
  sourceApp: 'admvapp';
  targetApps: ('pvapp' | 'mnvapp')[];
  title: string;
  category: 'schema_change' | 'rpc_change' | 'status_enum' | 'env_config' | 'breaking_change';
  summary: string;
  impactedTables: string[];
  sqlMigration?: string;
  instructions: string;
  author: string;
}

export interface TriadeAppInfo {
  id: 'pvapp' | 'mnvapp' | 'admvapp';
  name: string;
  domain: string;
  role: string;
  status: 'operational' | 'degraded' | 'maintenance';
  isCurrent?: boolean;
  color: string;
  serviceRolePrivilege?: string;
}

export interface TriadeStatusResponse {
  database: {
    connected: boolean;
    supabaseUrl: string;
    serviceRoleActive: boolean;
    error?: string | null;
  };
  apps: TriadeAppInfo[];
  mandamentoSete: {
    rule: string;
    bulletinsCount: number;
    lastBulletin?: TechnicalBulletin | null;
  };
}
