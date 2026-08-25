import React from 'react';
import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="track/[code]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="confirm-delivery/[code]" />
      <Stack.Screen name="success/[code]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="chat/[driverId]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="wallet/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="wallet/add-funds" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notifications/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="driver-register/index" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
