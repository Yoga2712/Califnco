import React from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}