import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { sheetDb } from '@/lib/sheet/db';
import { toast } from 'sonner';

// Push needs google-services.json in the Android build; without it registering would fail natively.
const ENABLED = import.meta.env.VITE_PUSH_ENABLED === 'true';

let currentToken: string | null = null;
let listenersReady = false;

export const pushAvailable = () => ENABLED && Capacitor.isNativePlatform();

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
          .upsert({ user_id: userId, token: value, platform: 'android' }, { onConflict: 'token' });
        if (error) console.error('Could not save push token', error.message);
      });
      await PushNotifications.addListener('registrationError', (error) => console.error('Push registration error', error));
      // With the app open the system shows nothing, so surface it in-app.
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast(notification.title ?? 'Notificación', { description: notification.body });
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
