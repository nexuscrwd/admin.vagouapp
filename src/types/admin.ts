export type AdminScreenId =
  | 'dashboard'
  | 'portal'
  | 'salons'
  | 'users'
  | 'moderation'
  | 'appointments'
  | 'triade'
  | 'forms'
  | 'settings';

export type SalonFilterStatus = 'all' | 'active' | 'pending' | 'incomplete' | 'suspended';

export type SalonSegmentFilter = 'all' | 'barbearia' | 'salao' | 'estetica' | 'outro';

export interface DayOperatingHour {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  label: string;
  isOpen: boolean;
  openTime: string;  // e.g. "08:00"
  closeTime: string; // e.g. "19:00"
  hasBreak?: boolean;
  breakStart?: string; // e.g. "12:00"
  breakEnd?: string;   // e.g. "13:00"
}

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'evp';

export interface SalonPixKeyItem {
  id: string;
  type: PixKeyType;
  key: string;
  holderName?: string;
  institution?: string;
  isPrimary: boolean;
  verified?: boolean;
}

export interface AdminSalonItem {
  id: string;
  trade_name: string;
  legal_name?: string;
  slug: string;
  category: 'barbearia' | 'salao' | 'estetica' | 'outro';
  status: 'active' | 'pending' | 'incomplete' | 'suspended';
  is_verified?: boolean;
  phone_whatsapp?: string;
  phone_landline?: string;
  email?: string;
  document_type?: 'CNPJ' | 'CPF' | string;
  document_number?: string;
  has_cnpj?: boolean;
  owner_cpf?: string;
  operating_model?: 'physical' | 'home_service' | 'hybrid' | string;
  commission_rate?: number;
  billing_plan?: 'subscription' | 'per_booking' | string;
  fee_per_booking?: number;
  monthly_subscription_fee?: number;
  billing_due_day?: number;
  pix_key?: string;
  pix_keys?: SalonPixKeyItem[];
  address?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  logo_url?: string;
  logo_dark_url?: string;
  logo_light_url?: string;
  favicon_url?: string;
  cover_image_url?: string;
  facade_photo_url?: string;
  interior_photo_url?: string;
  description?: string;
  slogan?: string;
  brand_font?: string;
  theme_preset_id?: string;
  primary_color?: string;
  secondary_color?: string;
  operating_hours?: DayOperatingHour[];
  created_at?: string;
  professionals_count?: number;
  active_offers_count?: number;
  fixed_clients_count?: number;
  rating?: number;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_avatar_url?: string;
  // Colunas físicas de UI / Estilos Avançados da Tríade (mnvapp / pvapp / admvapp)
  default_theme?: SalonThemeMode;
  pwa_name?: string;
  show_slogan?: boolean;
  logo_text_fallback?: string;
  logo_text_color?: string;
  show_hero_slides?: boolean;
  welcome_style?: SalonWelcomeStyle;
  section_header_bg_color?: string;
  section_header_text_color?: string;
  section_header_icon_color?: string;
  section_header_bg_style?: SalonSectionHeaderBgStyle;
  section_header_border?: SalonSectionHeaderBorder;
  section_header_btn_bg_color?: string;
  section_header_btn_active_bg_color?: string;
  section_header_btn_border?: string;
  section_header_btn_shadow?: string;
  section_header_btn_blur?: string;
  section_header_btn_font?: string;
  nav_style?: SalonNavStyle;
  nav_shape?: SalonNavShape;
  nav_border?: SalonNavBorder;
  nav_bg_style?: SalonNavBgStyle;
  nav_bg_color?: string;
  nav_btn_bg_color?: string;
  nav_btn_active_bg_color?: string;
  nav_active_color?: string;
  nav_text_color?: string;
  ui_settings?: SalonUiSettings;
  gallery_media?: {
    id: string;
    url: string;
    title?: string;
    type: 'image' | 'video';
    duration_seconds?: number;
    thumbnail_url?: string;
  }[];
}

export type SalonNavStyle = 'minimal' | 'floating' | 'classic';
export type SalonNavShape = 'square' | 'rounded' | 'pill' | 'circular';
export type SalonNavBorder = 'bordered' | 'none';
export type SalonNavBgStyle = 'solid' | 'glass' | 'transparent';
export type SalonSectionHeaderBgStyle = 'solid' | 'glass' | 'transparent';
export type SalonSectionHeaderBorder = 'bordered' | 'none';
export type SalonWelcomeStyle = 'atmospheric' | 'minimal' | 'card';
export type SalonThemeMode = 'dark' | 'light' | 'system';

export interface SalonUiSettings {
  id?: string;
  salon_id: string;
  default_theme?: SalonThemeMode;
  pwa_name?: string;
  show_slogan?: boolean;
  logo_text_fallback?: string;
  logo_text_color?: string;
  show_hero_slides?: boolean;
  welcome_style?: SalonWelcomeStyle;
  section_header_bg_color?: string;
  section_header_text_color?: string;
  section_header_icon_color?: string;
  section_header_bg_style?: SalonSectionHeaderBgStyle;
  section_header_border?: SalonSectionHeaderBorder;
  nav_style?: SalonNavStyle;
  nav_shape?: SalonNavShape;
  nav_border?: SalonNavBorder;
  nav_bg_style?: SalonNavBgStyle;
  nav_bg_color?: string;
  nav_btn_bg_color?: string;
  nav_btn_active_bg_color?: string;
  nav_active_color?: string;
  nav_text_color?: string;
  raw_settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
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
  sourceApp: 'admvapp' | 'pvapp' | 'mnvapp';
  targetApps: ('pvapp' | 'mnvapp' | 'admvapp')[];
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

export interface SystemAdminUser {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone_whatsapp: string;
  phone_secondary?: string;
  cpf?: string;
  role: 'superadmin' | 'moderator' | 'support' | 'owner' | 'client';
  access_level?: string;
  is_active: boolean;
  avatar_url?: string;
  address?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  dependents_count?: number;
  total_appointments?: number;
  created_at?: string;
  last_login_at?: string;
  password?: string;
}

export type AdminAuthTab = 'login' | 'recovery' | 'register';
export type AdminRecoveryType = 'access_data' | 'password';

export type AppointmentTransportMode = 'walking' | 'transit' | 'rideshare' | 'driving' | 'motorcycle';

export type AppointmentTrackingStatus =
  | 'idle'
  | 'alerted'
  | 'hurry_confirmed'
  | 'on_way_no_map'
  | 'live_sharing'
  | 'arriving_5min'
  | 'arrived'
  | 'rescheduled'
  | 'cancelled';

export interface RouteStreetCheckpoint {
  id: string;
  street: string;
  neighborhood?: string;
  distanceFromStartKm: number;
  status: 'passed' | 'current' | 'upcoming';
  passedAt?: string;
  adversityLabel?: string;
  addedDelayMinutes?: number;
}

export interface RouteAdversityEvent {
  type: 'traffic' | 'roadwork' | 'weather' | 'parking' | 'transit_delay';
  label: string;
  street: string;
  addedMinutes: number;
  reportedAt: string;
}

export interface AdminAppointmentItem {
  id: string;
  protocol: string;
  salon_id: string;
  salon_name: string;
  salon_slug: string;
  client_id?: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  beneficiary_name?: string;
  beneficiary_relation?: 'self' | 'son' | 'daughter' | 'spouse' | 'parent' | 'other';
  service_title: string;
  service_category?: string;
  service_location_type?: 'in_salon' | 'home_delivery';
  client_address?: string;
  professional_id?: string;
  professional_name?: string;
  price: number;
  appointment_date: string;
  time_slot: string;
  status: 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'no_show';
  is_radar_offer: boolean;
  radar_discount_percent?: number;
  billing_status: 'unbilled' | 'billed' | 'paid';
  fee_charged: number;
  created_at: string;
  // Telemetria de Deslocamento Ao Vivo (10s) & Linha de Ruas (Estilo Shopee/Correios)
  transport_mode?: AppointmentTransportMode;
  tracking_status?: AppointmentTrackingStatus;
  selected_route_summary?: string;
  current_street_name?: string;
  distance_km?: number;
  eta_minutes?: number;
  prep_buffer_minutes?: number;
  delay_minutes?: number;
  route_checkpoints?: RouteStreetCheckpoint[];
  active_adversity?: RouteAdversityEvent | null;
  cancellation_reason?: string;
  rescheduled_date?: string;
  rescheduled_time?: string;
}

export interface SalonMonthlyInvoice {
  salon_id: string;
  salon_name: string;
  salon_slug: string;
  owner_name?: string;
  phone_whatsapp?: string;
  billing_plan: 'subscription' | 'per_booking' | string;
  fee_per_booking: number;
  monthly_subscription_fee: number;
  billing_due_day: number;
  pix_key?: string;
  competence_month: string; // "2026-09"
  total_bookings: number;
  billable_bookings: number;
  cancelled_bookings: number;
  gross_revenue: number;
  total_invoice_amount: number;
  payment_status: 'pending' | 'sent' | 'paid' | 'overdue';
  items: AdminAppointmentItem[];
}

// ==========================================
// 👥 GESTÃO CENTRALIZADA DE USUÁRIOS (CRUD)
// ==========================================

export type UserCategoryTab = 'admins' | 'clients' | 'salon_users' | 'professionals';

// Dependente da Conta Família
export interface UserFamilyDependent {
  id: string;
  parent_client_id: string;
  parent_name?: string;
  full_name: string;
  relationship: 'son' | 'daughter' | 'spouse' | 'parent' | 'other';
  birth_date?: string;
  notes?: string;
  is_unlinked: boolean; // Soft delete / desvinculado pelo titular
  unlinked_at?: string;
  created_at: string;
}

// Usuário Cliente (Titular ou Emancipado)
export interface UserClientItem {
  id: string;
  full_name: string;
  username?: string;
  email: string;
  phone: string;
  phone_secondary?: string;
  cpf?: string;
  password?: string;
  avatar_url?: string;
  auth_provider: 'google' | 'email' | 'phone';
  access_level?: string;
  is_active: boolean;
  address?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  total_appointments: number;
  completed_appointments: number;
  no_show_count: number;
  dependents: UserFamilyDependent[];
  created_at: string;
  last_appointment_at?: string;
}

// Usuário do Salão (Dono, Gerente, Recepção)
export interface UserSalonAccessItem {
  id: string;
  salon_id: string;
  salon_name: string;
  salon_slug: string;
  full_name: string;
  username?: string;
  email: string;
  phone_whatsapp: string;
  phone_secondary?: string;
  cpf?: string;
  password?: string;
  avatar_url?: string;
  role: 'owner' | 'manager' | 'receptionist';
  access_level?: string;
  is_active: boolean;
  address?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  can_manage_financial: boolean;
  can_manage_professionals: boolean;
  total_appointments?: number;
  dependents_count?: number;
  created_at: string;
  last_login_at?: string;
}

// Prestador de Serviço / Profissional
export interface UserProfessionalItem {
  id: string;
  full_name: string;
  username?: string;
  nickname?: string;
  avatar_url?: string;
  specialties: string[];
  document_number?: string;
  cpf?: string;
  phone_whatsapp: string;
  phone_secondary?: string;
  email?: string;
  password?: string;
  contract_type: 'partner_mei' | 'clt' | 'solo_autonomous';
  access_level?: string;
  current_salon_id: string | null;
  current_salon_name?: string;
  current_salon_slug?: string;
  commission_percent: number;
  status: 'active' | 'vacation' | 'unlinked_from_salon' | 'suspended';
  address?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  unlinked_from_salon_at?: string;
  historical_salons_count?: number;
  total_services_done: number;
  total_appointments?: number;
  dependents_count?: number;
  rating: number;
  created_at: string;
}

export interface SalonServiceMediaItem {
  id: string;
  url: string;
  title?: string;
  duration_seconds?: number;
}

// Procedimento / Serviço do Estabelecimento (Tabela 'services' da Tríade)
export interface SalonServiceRecord {
  id: string;
  salon_id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  duration_minutes: number;
  commission_rate?: number;
  is_active: boolean;
  target_audience?: 'all' | 'men' | 'women' | 'kids';
  order_index?: number;
  created_at?: string;
  photos?: string[];
  videos?: SalonServiceMediaItem[];
  slides?: string[]; // Slide com limite de 5 imagens
}

