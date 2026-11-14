/**
 * Database Types oficiais da Tríade VagouApp
 * Sincronizados com o Script Mestre de Convergência Soberana v5.0 (bol-159 / bol-160)
 * Homologação: mnvapp ⇄ pvapp ⇄ admvapp
 */

export type AppointmentStatus =
  | 'pendente'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'no_show'
  | 'BLOQUEADO';

export type SalonStatus = 'active' | 'pending' | 'incomplete' | 'suspended';

export type UserRole = 'client' | 'professional' | 'owner' | 'manager' | 'receptionist' | 'superadmin' | 'moderator';

export interface Database {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string;
          trade_name: string;
          legal_name: string | null;
          slug: string;
          category: string;
          status: SalonStatus;
          is_active: boolean;
          is_verified: boolean;
          phone_whatsapp: string | null;
          phone_landline: string | null;
          email: string | null;
          document_type: string | null;
          document_number: string | null;
          owner_cpf: string | null;
          operating_model: string | null;
          home_delivery_enabled: boolean;
          billing_plan: string;
          fee_per_booking: number;
          billing_fee_value: number;
          monthly_subscription_fee: number;
          billing_due_day: number;
          pix_key: string | null;
          pix_keys: Record<string, unknown>[];
          default_theme: 'light' | 'dark' | 'system';
          primary_color: string;
          secondary_color: string;
          nav_style: string;
          nav_shape: string;
          nav_border: string;
          nav_icon_border: string;
          nav_bg_style: string;
          nav_bg_color: string;
          nav_active_color: string;
          nav_text_color: string | null;
          section_header_bg_color: string;
          section_header_text_color: string;
          section_header_icon_color: string;
          section_header_bg_style: string;
          section_header_border: string;
          address: string | null;
          street_number: string | null;
          complement: string | null;
          neighborhood: string | null;
          city: string | null;
          state: string | null;
          cep: string | null;
          latitude: number | null;
          longitude: number | null;
          formatted_address: string | null;
          google_place_id: string | null;
          amenities: string[];
          is_emergency_paused: boolean;
          emergency_pause_reason: string | null;
          emergency_paused_at: string | null;
          created_via: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['salons']['Row']>;
        Update: Partial<Database['public']['Tables']['salons']['Row']>;
      };
      salon_ui_settings: {
        Row: {
          id: string;
          salon_id: string;
          default_theme: string;
          primary_color: string;
          secondary_color: string;
          pwa_name: string | null;
          show_slogan: boolean;
          logo_text_fallback: string | null;
          logo_text_color: string | null;
          show_hero_slides: boolean;
          welcome_style: string;
          section_header_bg_color: string;
          section_header_text_color: string;
          section_header_icon_color: string;
          section_header_bg_style: string;
          section_header_border: string;
          nav_style: string;
          nav_shape: string;
          nav_border: string;
          nav_icon_border: string;
          nav_bg_style: string;
          nav_bg_color: string;
          nav_btn_bg_color: string | null;
          nav_btn_active_bg_color: string | null;
          nav_active_color: string;
          nav_text_color: string | null;
          branding_snapshot: Record<string, unknown>;
          raw_settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['salon_ui_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['salon_ui_settings']['Row']>;
      };
      clients: {
        Row: {
          id: string;
          name: string;
          full_name: string | null;
          username: string | null;
          email: string | null;
          phone: string | null;
          cpf: string | null;
          avatar_url: string | null;
          photo_url: string | null;
          address: string | null;
          street_number: string | null;
          complement: string | null;
          neighborhood: string | null;
          city: string | null;
          state: string | null;
          cep: string | null;
          latitude: number | null;
          longitude: number | null;
          formatted_address: string | null;
          google_place_id: string | null;
          security_question_code: string | null;
          security_answer_normalized: string | null;
          is_active: boolean;
          dependents_count: number;
          origin_type: string | null;
          created_via: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['clients']['Row']>;
        Update: Partial<Database['public']['Tables']['clients']['Row']>;
      };
      security_questions: {
        Row: {
          id: string;
          code: string;
          category_label: string;
          question_text: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['security_questions']['Row']>;
        Update: Partial<Database['public']['Tables']['security_questions']['Row']>;
      };
      user_security_answers: {
        Row: {
          id: string;
          client_id: string;
          user_id: string | null;
          phone: string | null;
          email: string | null;
          question_code: string;
          answer_hash: string;
          answer_normalized: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_security_answers']['Row']>;
        Update: Partial<Database['public']['Tables']['user_security_answers']['Row']>;
      };
      professionals: {
        Row: {
          id: string;
          salon_id: string | null;
          name: string;
          full_name: string | null;
          username: string | null;
          nickname: string | null;
          email: string | null;
          phone: string | null;
          phone_whatsapp: string | null;
          phone_secondary: string | null;
          cpf: string | null;
          avatar_url: string | null;
          photo_url: string | null;
          role: string | null;
          access_level: string | null;
          commission_rate: number;
          product_commission_rate: number;
          status: string;
          is_active: boolean;
          address: string | null;
          street_number: string | null;
          complement: string | null;
          neighborhood: string | null;
          city: string | null;
          state: string | null;
          cep: string | null;
          latitude: number | null;
          longitude: number | null;
          formatted_address: string | null;
          google_place_id: string | null;
          created_via: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['professionals']['Row']>;
        Update: Partial<Database['public']['Tables']['professionals']['Row']>;
      };
      appointments: {
        Row: {
          id: string;
          protocol: string;
          protocol_code: string | null;
          salon_id: string;
          salon_name: string;
          salon_slug: string;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          client_email: string | null;
          beneficiary_name: string | null;
          beneficiary_relation: string | null;
          professional_id: string | null;
          professional_name: string | null;
          service_title: string;
          service_category: string | null;
          price: number;
          discount: number;
          final_price: number | null;
          commission_fee: number;
          is_paid: boolean;
          paid_at: string | null;
          payment_status: 'pending' | 'paid' | 'refunded' | string;
          payment_method: string | null;
          appointment_date: string;
          date_str: string | null;
          time_slot: string;
          start_time: string | null;
          end_time: string | null;
          status: AppointmentStatus;
          is_blocked_slot: boolean;
          block_reason: string | null;
          pause_reason: string | null;
          swap_state: Record<string, unknown> | null;
          is_radar_offer: boolean;
          radar_discount_percent: number | null;
          billing_status: string;
          fee_charged: number;
          tracking_status: string;
          transport_mode: string;
          eta_minutes: number | null;
          distance_km: number | null;
          prep_buffer_minutes: number;
          selected_route_summary: string | null;
          route_polyline: unknown | null;
          current_street_name: string | null;
          route_checkpoints: unknown[];
          client_lat: number | null;
          client_lng: number | null;
          origin_lat: number | null;
          origin_lng: number | null;
          salon_lat: number | null;
          salon_lng: number | null;
          origin_formatted_address: string | null;
          last_location_update: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['appointments']['Row']>;
        Update: Partial<Database['public']['Tables']['appointments']['Row']>;
      };
    };
    Functions: {
      check_client_inter_salon_collision: {
        Args: {
          p_client_id: string;
          p_date_str: string;
          p_start_time: string;
          p_end_time: string;
          p_salon_id: string;
          p_salon_lat?: number | null;
          p_salon_lng?: number | null;
          p_exclude_appointment_id?: string | null;
        };
        Returns: Record<string, unknown>;
      };
    };
  };
}
