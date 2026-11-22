import { supabase } from './supabase';

type TriadeRealtimeTable =
  | 'salons'
  | 'salon_ui_settings'
  | 'salon_members'
  | 'system_admins'
  | 'admin_preferences'
  | 'billing_invoices'
  | 'appointments'
  | 'media_assets'
  | 'notification_outbox'
  | 'professionals'
  | 'clients'
  | 'profiles'
  | 'dependents'
  | 'services'
  | 'service_offers';

interface RealtimeHubHandlers {
  onSalonsChange?: () => void;
  onAdminChange?: () => void;
  onUsersChange?: () => void;
  onAppointmentsChange?: () => void;
  onBillingChange?: () => void;
  onMediaChange?: () => void;
  onNotificationOutbox?: (payload: any) => void;
  onAnyChange?: (table: TriadeRealtimeTable, payload: any) => void;
}

const ADMIN_MONITORED_TABLES: TriadeRealtimeTable[] = [
  'salons',
  'salon_members',
  'system_admins',
  'admin_preferences',
  'billing_invoices',
  'appointments',
  'media_assets',
  'notification_outbox',
  'professionals',
  'clients',
  'profiles',
  'dependents',
];

export function subscribeAdminRealtimeHub(handlers: RealtimeHubHandlers): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const debounce = (key: string, fn?: () => void, ms = 650) => {
    if (!fn) return;
    const prev = timers.get(key);
    if (prev) clearTimeout(prev);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn();
      }, ms)
    );
  };

  let channel = supabase.channel('admvapp-triade-v6-realtime');

  for (const table of ADMIN_MONITORED_TABLES) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        handlers.onAnyChange?.(table, payload);

        if (table === 'salons') {
          debounce('salons', handlers.onSalonsChange);
        } else if (
          table === 'system_admins' ||
          table === 'professionals' ||
          table === 'clients' ||
          table === 'profiles' ||
          table === 'salon_members' ||
          table === 'dependents'
        ) {
          debounce('admin', handlers.onAdminChange);
          debounce('users', handlers.onUsersChange);
        } else if (table === 'appointments') {
          debounce('appointments', handlers.onAppointmentsChange);
        } else if (table === 'billing_invoices') {
          debounce('billing', handlers.onBillingChange);
        } else if (table === 'media_assets') {
          debounce('media', handlers.onMediaChange);
        } else if (table === 'notification_outbox') {
          handlers.onNotificationOutbox?.(payload);
        }
      }
    );
  }

  channel.subscribe();

  return () => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    supabase.removeChannel(channel);
  };
}
