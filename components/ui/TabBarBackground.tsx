import { Colors } from '@/constants/Colors';
import { StyleSheet, View } from 'react-native';

// Custom background for web and Android
export default function TabBarBackground() {
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]}
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
