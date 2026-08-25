import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/auth';
import { colors } from '../src/theme';

export default function Gate() {
  const { token, seenOnboarding, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.dark }} />;
  }

  if (!token && !seenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (token) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/login" />;
}
