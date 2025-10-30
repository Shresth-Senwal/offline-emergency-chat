/**
 * Mock implementation of react-native-safe-area-context for Jest tests.
 */

import React from 'react';

export const SafeAreaProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const SafeAreaView = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const useSafeAreaInsets = () => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});
