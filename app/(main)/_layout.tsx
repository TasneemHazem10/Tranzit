import React from 'react';
import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}>
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="booking" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="track/[code]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="confirm-delivery/[code]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="success/[code]" options={{ animation: 'simple_push', gestureEnabled: false }} />
      <Stack.Screen name="chat/[driverId]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="wallet/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="wallet/add-funds" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notifications/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="driver-register/index" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
