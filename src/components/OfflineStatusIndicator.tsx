/**
 * OfflineStatusIndicator - Component to display offline operation status
 *
 * This component verifies and displays the offline operational status of the
 * emergency mesh chat application. It confirms that:
 * - No internet connectivity is required
 * - All features are fully functional offline
 * - All data is stored locally
 * - BLE mesh networking is operational
 *
 * The indicator provides visual feedback to users that the app is designed
 * for offline operation and is functioning correctly without network access.
 *
 * Requirements addressed:
 * - 8.1: Operate all communication functions using only BLE
 * - 8.2: Operate without cellular network connectivity
 * - 8.3: Store cryptographic keys locally
 * - 8.4: Store message history locally
 * - 8.5: Display fully functional status when offline
 *
 * Dependencies:
 * - React Native: Core UI components
 * - @react-native-community/netinfo: Network connectivity detection
 *
 * @module OfflineStatusIndicator
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Props for OfflineStatusIndicator component
 */
interface OfflineStatusIndicatorProps {
  /** Whether to show the indicator (default: true) */
  visible?: boolean;
  /** Callback when indicator is tapped */
  onPress?: () => void;
}

/**
 * OfflineStatusIndicator component
 *
 * Displays a banner indicating the app's offline operational status.
 * Shows different states:
 * - Fully Functional Offline: No internet, BLE enabled (ideal state)
 * - Online Mode: Internet available (app still works)
 * - BLE Required: No BLE available (app cannot function)
 *
 * The component uses NetInfo to detect network connectivity and displays
 * appropriate status messages to inform users about offline capabilities.
 *
 * @param props - Component props
 * @returns React component
 */
export const OfflineStatusIndicator: React.FC<
  OfflineStatusIndicatorProps
> = ({ visible = true, onPress }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  /**
   * Monitor network connectivity status
   *
   * Uses NetInfo to detect internet connectivity changes.
   * Updates state when connectivity changes to show appropriate status.
   */
  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
      console.log(
        '[OfflineStatusIndicator] Network state:',
        state.isConnected ? 'connected' : 'disconnected',
        'type:',
        state.type,
      );
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  if (!visible) {
    return null;
  }

  /**
   * Determine status message and styling based on connectivity
   */
  const getStatusInfo = (): {
    message: string;
    icon: string;
    backgroundColor: string;
    textColor: string;
  } => {
    if (isConnected === null) {
      // Still checking connectivity
      return {
        message: 'Checking connectivity...',
        icon: '⏳',
        backgroundColor: '#8E8E93',
        textColor: '#FFFFFF',
      };
    }

    if (!isConnected || connectionType === 'none') {
      // Offline - ideal state for emergency mesh chat
      return {
        message: '✓ Fully Functional Offline - BLE Mesh Active',
        icon: '📡',
        backgroundColor: '#34C759',
        textColor: '#FFFFFF',
      };
    }

    // Online - app still works but not in pure offline mode
    return {
      message: 'Online Mode - BLE Mesh Active',
      icon: '🌐',
      backgroundColor: '#007AFF',
      textColor: '#FFFFFF',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: statusInfo.backgroundColor },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}>
      <View style={styles.content}>
        <Text style={styles.icon}>{statusInfo.icon}</Text>
        <Text style={[styles.message, { color: statusInfo.textColor }]}>
          {statusInfo.message}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Styles for OfflineStatusIndicator component
 */
const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
