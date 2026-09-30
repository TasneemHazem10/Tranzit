import { useEffect, useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID || undefined,
    androidClientId: ANDROID_CLIENT_ID || undefined,
    scopes: ['profile', 'email'],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (response && response !== null) {
      setLoading(false);
    }
  }, [response]);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    if (!WEB_CLIENT_ID || WEB_CLIENT_ID === 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com') {
      setLoading(false);
      throw new Error(' GOOGLE_CLIENT_ID غير مُعد. أضف EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID في mobile/.env');
    }
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'success') {
        const idToken = result.authentication?.idToken ?? result.params?.id_token;
        if (idToken) {
          return idToken;
        }
        throw new Error(' لم يُرجع Google رمز id_token. تحقق من إعدادات OAuth في Google Cloud Console.');
      }
      if (result.type === 'error') {
        throw new Error(' تعذّر تسجيل الدخول عبر Google.');
      }
      return null;
    } catch (e: any) {
      throw e;
    } finally {
      setLoading(false);
    }
  }, [promptAsync]);

  return { request, promptAsync, signInWithGoogle, loading };
}
