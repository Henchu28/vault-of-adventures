import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { sheetDb } from '@/lib/sheet/db';
import { toast } from 'sonner';

// Push needs google-services.json in the Android build; without it registering would fail natively.
const ENABLED = import.meta.env.VITE_PUSH_ENABLED === 'true';

let currentToken: string | null = null;

/** Opens the Ficha page on a given sheet (and tab) without a React router handle. */
export function openSheet(characterId: string, category?: string) {
  const params = new URLSearchParams({ sheet: characterId });
  // Power ideas live in the Poder tab; skill ideas in the shop.
  params.set('tab', category === 'power' ? 'poder' : 'tienda');
  window.history.pushState({}, '', `${import.meta.env.BASE_URL}ficha?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent('popstate')); // react-router listens to this
}
let listenersReady = false;

// Only the Android app is wired for push; iOS users are players and get no notifications.
export const pushAvailable = () => ENABLED && Capacitor.getPlatform() === 'android';

/** Asks for permission and stores this device's token so the notify-idea function can reach it. */
export async function registerPush(userId: string) {
  if (!pushAvailable()) return;
  try {
    if (!listenersReady) {
      listenersReady = true;
      await PushNotifications.addListener('registration', async ({ value }) => {
        currentToken = value;
        const { error } = await sheetDb
          .from('push_tokens')
          .upsert({ user_id: userId, token: value, platform: Capacitor.getPlatform() }, { onConflict: 'token' });
        if (error) console.error('Could not save push token', error.message);
      });
      await PushNotifications.addListener('registrationError', (error) => console.error('Push registration error', error));
      // With the app open the system shows nothing, so surface it in-app.
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const { character_id: characterId, category } = notification.data ?? {};
        toast(notification.title ?? 'Notificación', {
          description: notification.body,
          action: characterId ? { label: 'Abrir', onClick: () => openSheet(characterId, category) } : undefined,
        });
      });
      // Tapping the system notification (app closed or in the background) lands on that player's sheet.
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const { character_id: characterId, category } = notification.data ?? {};
        if (characterId) openSheet(characterId, category);
      });
    }
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') await PushNotifications.register();
  } catch (error) {
    console.error('Push setup failed', error);
  }
}

/** Removes this device's token so a signed-out device stops receiving the master's notifications. */
export async function unregisterPush() {
  if (!pushAvailable() || !currentToken) return;
  try {
    await sheetDb.from('push_tokens').delete().eq('token', currentToken);
  } catch (error) {
    console.error('Could not remove push token', error);
  }
  currentToken = null;
}
