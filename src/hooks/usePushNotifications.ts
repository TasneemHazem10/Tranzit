import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../store/auth';
import { request } from '../api/client';

// Expo Go removed remote push-notification support with SDK 53+. Guard the
// expo-notifications import so the app still boots in Expo Go (notifications
// silently no-op there) while working in a development/production build.
let NotificationsApi: typeof import('expo-notifications') | null = null;
let notificationsAvailable = true;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NotificationsApi = require('expo-notifications') as typeof import('expo-notifications');
  NotificationsApi!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  notificationsAvailable = false;
}

const Notifications: typeof import('expo-notifications') | null = NotificationsApi;

export function usePushNotifications() {
  const { token: authToken } = useAuth();
  const notificationListener = useRef<{ remove?: () => void } | undefined>(undefined);
  const responseListener = useRef<{ remove?: () => void } | undefined>(undefined);

  useEffect(() => {
    if (!authToken) return;
    if (!notificationsAvailable || !Notifications) return;

    registerForPushNotificationsAsync().then((pushToken) => {
      if (pushToken) {
        sendTokenToServer(authToken, pushToken);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {
        // Foreground notification received
      },
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      () => {
        // Notification tapped
      },
    );

    return () => {
      notificationListener.current?.remove?.();
      responseListener.current?.remove?.();
    };
  }, [authToken]);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) return null;

  const { isDevice } = await import('expo-device').catch(() => ({ isDevice: false }));
  if (!isDevice) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.expoGoConfig?.extra?.eas?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

async function sendTokenToServer(authToken: string, pushToken: string): Promise<void> {
  try {
    await request('/api/v1/push-token', {
      method: 'POST',
      body: { push_token: pushToken },
      token: authToken,
    });
  } catch {
    // Silently fail - will retry on next app launch
  }
}
