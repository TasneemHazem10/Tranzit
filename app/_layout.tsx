import React from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SplashScreen } from 'expo-router';
import { useFonts } from '@expo-google-fonts/cairo';
import { AuthProvider } from '../src/store/auth';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Cairo_400Regular: require('@expo-google-fonts/cairo/400Regular'),
    Cairo_500Medium: require('@expo-google-fonts/cairo/500Medium'),
    Cairo_600SemiBold: require('@expo-google-fonts/cairo/600SemiBold'),
    Cairo_700Bold: require('@expo-google-fonts/cairo/700Bold'),
    Cairo_800ExtraBold: require('@expo-google-fonts/cairo/800ExtraBold'),
    Cairo_900Black: require('@expo-google-fonts/cairo/900Black'),
  });

  React.useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(main)" />
      </Stack>
    </AuthProvider>
  );
}
