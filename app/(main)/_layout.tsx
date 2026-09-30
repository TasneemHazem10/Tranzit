import React from 'react';
import { Stack } from 'expo-router';
import { useLanguage } from '../../src/store/language';
import { useTheme } from '../../src/theme';

export default function MainLayout() {
  const { isRTL } = useLanguage();
  const colors = useTheme();
  const slideAnim = isRTL ? 'slide_from_left' as const : 'slide_from_right' as const;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: slideAnim,
        animationDuration: 220,
        gestureEnabled: true,
      }}>
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="booking" options={{ animation: slideAnim }} />
      <Stack.Screen name="track/[code]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="confirm-delivery/[code]" options={{ animation: slideAnim }} />
      <Stack.Screen name="success/[code]" options={{ animation: 'simple_push', gestureEnabled: false }} />
      <Stack.Screen name="call/[driverId]" options={{ animation: 'fade' }} />
      <Stack.Screen name="history" options={{ animation: slideAnim }} />
      <Stack.Screen name="profile/index" options={{ animation: slideAnim }} />
      <Stack.Screen name="profile/edit-profile" options={{ animation: slideAnim }} />
      <Stack.Screen name="profile/change-password" options={{ animation: slideAnim }} />
    </Stack>
  );
}