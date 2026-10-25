import { authService } from '@/services/AuthService';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // 已登入就直接進 App，否則到歡迎頁
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
