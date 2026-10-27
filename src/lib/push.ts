import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { sheetDb } from '@/lib/sheet/db';
import { toast } from 'sonner';

// Push needs google-services.json in the Android build; without it registering would fail natively.
const ENABLED = import.meta.env.VITE_PUSH_ENABLED === 'true';

let currentToken: string | null = null;

const HANDLED_KEY = 'handledPushIds';

/** True if this notification id was already acted on; otherwise remembers it (last 50). */
function alreadyHandled(id?: string) {
  if (!id) return false;
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(HANDLED_KEY) ?? '[]');
    if (seen.includes(id)) return true;
    localStorage.setItem(HANDLED_KEY, JSON.stringify([...seen, id].slice(-50)));
  } catch {
    // Storage unavailable: better to act twice than to drop a tap.
  }
  return false;
}

/** Opens the Ficha page on a given sheet (and tab) without a React router handle. */
export function openSheet(characterId: string, category?: string) {
  const params = new URLSearchParams({ sheet: characterId });
  // Power ideas live in the Poder tab; skill ideas in the shop.
  params.set('tab', category === 'power' ? 'poder' : 'tienda');
  // Makes every tap a distinct navigation, so the sheet reopens on the new tab even if it is already open.
  params.set('n', String(Date.now()));
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
        const { character_id: characterId, category, idea_id: ideaId } = notification.data ?? {};
        // One persistent toast per idea (the Toaster is expanded), so each "Abrir" opens its own sheet
        // instead of the newest one stacked in front.
        toast(notification.title ?? 'Notificación', {
          id: ideaId,
          description: notification.body,
          duration: 20000,
          action: characterId ? { label: 'Abrir', onClick: () => openSheet(characterId, category) } : undefined,
        });
      });
      // Tapping the system notification (app closed or in the background) lands on that player's sheet.
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        // Android hands the launching intent to the app again whenever the activity is recreated, which
        // would replay an old tap; each notification is only acted on once.
        if (alreadyHandled(notification.id)) return;
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
