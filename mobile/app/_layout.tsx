import React from 'react';
import { I18nManager } from 'react-native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from '@expo-google-fonts/cairo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/store/auth';
import { LanguageProvider } from '../src/store/language';
import { SettingsProvider, useSettings } from '../src/store/settings';
import { useTheme } from '../src/theme';
import AnimatedSplash from '../src/components/AnimatedSplash';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { setupWebAlerts } from '../src/utils/webAlert';

I18nManager.allowRTL(true);

setupWebAlerts();

SplashScreen.preventAutoHideAsync().catch(() => {});

function PushNotificationRegistrar() {
  usePushNotifications();
  return null;
}

function NotificationGate() {
  const { notifications } = useSettings();
  if (!notifications) return null;
  return <PushNotificationRegistrar />;
}

function AppStatusBar() {
  const { dark } = useSettings();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

function ThemedStack() {
  const colors = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 220,
      }}>
      <Stack.Screen name="index" options={{ animation: 'fade_from_bottom', animationDuration: 300 }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', animationDuration: 400 }} />
      <Stack.Screen name="login" options={{ animation: 'slide_from_bottom', animationDuration: 300 }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_bottom', animationDuration: 300 }} />
      <Stack.Screen name="otp" options={{ animation: 'slide_from_bottom', animationDuration: 300 }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_bottom', animationDuration: 300 }} />
      <Stack.Screen name="reset-password" options={{ animation: 'slide_from_bottom', animationDuration: 300 }} />
      <Stack.Screen name="terms" options={{ animation: 'slide_from_right', animationDuration: 260 }} />
      <Stack.Screen name="(main)" options={{ animation: 'fade', animationDuration: 350, gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular: require('@expo-google-fonts/cairo/400Regular'),
    Cairo_500Medium: require('@expo-google-fonts/cairo/500Medium'),
    Cairo_600SemiBold: require('@expo-google-fonts/cairo/600SemiBold'),
    Cairo_700Bold: require('@expo-google-fonts/cairo/700Bold'),
    Cairo_800ExtraBold: require('@expo-google-fonts/cairo/800ExtraBold'),
    Cairo_900Black: require('@expo-google-fonts/cairo/900Black'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <AnimatedSplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationGate />
            <AppStatusBar />
            <ThemedStack />
          </AuthProvider>
        </LanguageProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}