/**
 * App.tsx - Root component for Offline Emergency Mesh Chat
 *
 * This is the main entry point for the application. It provides:
 * - AppContext provider wrapping all components for global state management
 * - Simple state-based navigation between PeerList and ConversationView
 * - Error boundary for crash recovery
 * - Bluetooth disabled banner when BLE is not enabled
 * - Automatic BLE scanning initialization on app launch
 *
 * The navigation is intentionally simple (no react-navigation) to minimize
 * dependencies and complexity for the MVP. Navigation state is managed by
 * the currentPeerId in AppContext:
 * - null: Display PeerList (default view)
 * - string: Display ConversationView for selected peer
 *
 * Requirements addressed:
 * - 1.1: Initialize BLE scanning on app launch
 * - 1.2: Automatic peer discovery and connection
 * - 10.1: Display conversation view showing message history
 * - 10.2: Display list of discovered and connected peer nodes
 *
 * Architecture:
 * - AppProvider wraps entire app for global state access
 * - ErrorBoundary catches and recovers from crashes
 * - Conditional rendering based on currentPeerId for navigation
 * - StatusBar and SafeAreaView for proper UI layout
 *
 * Dependencies:
 * - React Native: Core UI components and hooks
 * - AppContext: Global state management and service initialization
 * - PeerList: Main peer discovery and selection view
 * - ConversationView: Message conversation interface
 * - ErrorBoundary: Crash recovery component
 *
 * Usage:
 * This component is the default export and should be registered as the
 * root component in index.js:
 * ```typescript
 * AppRegistry.registerComponent(appName, () => App);
 * ```
 *
 * @module App
 */

import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { StatusBar, StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppState } from './src/context/AppContext';
import { PeerList } from './src/components/PeerList';
import { ConversationView } from './src/components/ConversationView';
import { OfflineStatusIndicator } from './src/components/OfflineStatusIndicator';
import { RelayLogViewer } from './src/components/RelayLogViewer';

/**
 * Props for ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

/**
 * State for ErrorBoundary component.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component - Catches and recovers from React errors.
 *
 * This component provides crash recovery by catching errors that occur
 * in child components. When an error is caught:
 * 1. Display error message to user
 * 2. Log error details for debugging
 * 3. Provide option to reload the app
 *
 * This is critical for emergency situations where app stability is paramount.
 *
 * @class ErrorBoundary
 * @extends Component
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Static method called when an error is thrown in a child component.
   * Updates state to trigger error UI rendering.
   *
   * @param error - The error that was thrown
   * @returns New state object
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error is caught.
   * Logs error details for debugging.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Additional error information including component stack
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Show alert to user
    Alert.alert(
      'Application Error',
      'An unexpected error occurred. The app will attempt to recover.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset error state to attempt recovery
            this.setState({ hasError: false, error: null });
          },
        },
      ],
    );
  }

  /**
   * Render error UI or children.
   *
   * If an error has been caught, displays error message.
   * Otherwise, renders children normally.
   *
   * @returns React element
   */
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={styles.errorHelp}>
            The app will attempt to recover automatically.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * AppContent component - Main application content with navigation.
 *
 * This component handles the navigation logic between PeerList and
 * ConversationView based on the currentPeerId state from AppContext.
 *
 * Navigation logic:
 * - currentPeerId === null: Show PeerList (default view)
 * - currentPeerId !== null: Show ConversationView for selected peer
 *
 * Also displays a Bluetooth disabled banner if BLE is not enabled.
 * Includes a floating button to access relay logs for demonstration purposes.
 *
 * @returns React component
 */
const AppContent: React.FC = () => {
  const { currentPeerId, bleEnabled } = useAppState();
  const [showRelayLogs, setShowRelayLogs] = useState(false);

  return (
    <View style={styles.container}>
      {/* Status bar configuration */}
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

      {/* Offline status indicator - shows app is fully functional offline */}
      <OfflineStatusIndicator visible={bleEnabled} />

      {/* Bluetooth disabled banner */}
      {!bleEnabled && (
        <View style={styles.bleDisabledBanner}>
          <Text style={styles.bleDisabledText}>
            ⚠️ Bluetooth is disabled. Please enable Bluetooth to use this app.
          </Text>
        </View>
      )}

      {/* Navigation: Show PeerList or ConversationView based on currentPeerId */}
      {currentPeerId === null ? <PeerList /> : <ConversationView />}

      {/* Floating button to access relay logs (for demonstration) */}
      <TouchableOpacity
        style={styles.relayLogButton}
        onPress={() => setShowRelayLogs(true)}
      >
        <Text style={styles.relayLogButtonText}>📊</Text>
      </TouchableOpacity>

      {/* Relay log viewer modal */}
      <RelayLogViewer
        visible={showRelayLogs}
        onClose={() => setShowRelayLogs(false)}
      />
    </View>
  );
};

/**
 * App component - Root component with providers and error boundary.
 *
 * This component sets up the application structure:
 * 1. SafeAreaProvider for safe area handling
 * 2. ErrorBoundary for crash recovery
 * 3. AppProvider for global state management
 * 4. AppContent for main application UI
 *
 * The AppProvider initializes all services (CryptoService, BLEService,
 * MessageService, StorageService) and starts BLE scanning automatically
 * on app launch.
 *
 * @returns React component
 */
const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
};

/**
 * Styles for App component.
 *
 * Design principles:
 * - Full-screen layout with flex: 1
 * - High-contrast error messages for visibility
 * - Prominent Bluetooth disabled banner
 * - Clean, simple layout
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bleDisabledBanner: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bleDisabledText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorHelp: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  relayLogButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  relayLogButtonText: {
    fontSize: 24,
  },
});

export default App;
