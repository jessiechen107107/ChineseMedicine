import { authService } from '@/services/AuthService';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Go straight to the app when signed in, otherwise show the welcome screen
    authService.getCurrentUser().then((user) => {
      router.replace(user ? '/(tabs)' : '/welcome');
    });
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#86A79B" />
    </View>
  );
}
