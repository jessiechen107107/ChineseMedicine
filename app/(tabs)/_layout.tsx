import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabIconSelected,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
            backgroundColor: Colors.background,
          },
          default: {
            backgroundColor: Colors.background,
          },
        }),
        // Removed invalid contentStyle for Tabs
        // contentStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <IconSymbol name="chart.bar.fill" size={28} color={color} />,
        }}
      />
              <Tabs.Screen
          name="diagnosis"
          options={{
            title: 'Assessment',
          tabBarIcon: ({ color }) => <IconSymbol name="stethoscope" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: 'Health Data',
          tabBarIcon: ({ color }) => <IconSymbol name="heart.text.square.fill" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
