import { supabase } from './supabase';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getAdminPushStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    return { supported: false, permission: 'unsupported', subscribed: false };
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: Boolean(subscription) && Notification.permission === 'granted',
    };
  } catch {
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: false,
    };
  }
}

export async function registerAdminWebPush(
  role = 'super_admin',
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    return { success: false, error: 'Navegador sem suporte a Web Push.' };
  }

  try {
    const keyRes = await fetch('/api/push/vapid-public-key', { cache: 'no-store' });
    const keyJson = await keyRes.json();
    if (!keyRes.ok || !keyJson.publicKey) {
      return { success: false, error: 'Chave pública VAPID não configurada no servidor.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permissão de notificação negada no dispositivo.' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey) as BufferSource,
      });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        app_origin: 'admvapp',
        role,
        admin_id: adminId,
      }),
    });

    const subJson = await subRes.json();
    if (!subRes.ok || !subJson.success) {
      return { success: false, error: subJson.error || 'Falha ao salvar assinatura Push.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao ativar notificações Push.' };
  }
}

export async function sendTestAdminPush(): Promise<{
  success: boolean;
  sent?: number;
  error?: string;
}> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch('/api/push/test', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Falha ao enviar push de teste.' };
    }
    return { success: true, sent: json.sent };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão ao testar push.' };
  }
}

export async function unregisterAdminWebPush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  } catch {}
}
