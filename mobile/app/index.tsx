import React from 'react';
import { Redirect } from 'expo-router';
import AnimatedSplash from '../src/components/AnimatedSplash';
import { useAuth } from '../src/store/auth';

export default function Gate() {
  const { token, seenOnboarding, loading } = useAuth();

  if (loading) {
    return <AnimatedSplash />;
  }

  if (!token && !seenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (token) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/login" />;
}
