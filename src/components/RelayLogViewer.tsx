/**
 * RelayLogViewer - Component for displaying mesh relay logs
 *
 * This component provides a real-time view of message relay events for demonstration
 * and debugging purposes. It shows when messages are relayed through this device,
 * including message IDs, TTL values, timestamps, and relay status.
 *
 * This is particularly useful for the 3-device mesh relay demonstration video,
 * where Device B (the relay node) needs to show evidence that messages are being
 * forwarded between Device A and Device C.
 *
 * Features:
 * - Real-time relay event logging
 * - Message ID tracking
 * - TTL value display
 * - Timestamp for each relay event
 * - Auto-scroll to latest events
 * - Clear log functionality
 * - Compact display suitable for screen recording
 *
 * Usage:
 * ```tsx
 * <RelayLogViewer
 *   visible={showRelayLogs}
 *   onClose={() => setShowRelayLogs(false)}
 * />
 * ```
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4 (demonstration support)
 *
 * @module RelayLogViewer
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

/**
 * Relay log entry interface
 * Represents a single relay event in the log
 */
export interface RelayLogEntry {
  id: string; // Unique log entry ID
  messageId: string; // Message ID being relayed
  timestamp: number; // When the relay occurred
  ttl: number; // TTL value after decrement
  direction: 'incoming' | 'outgoing'; // Message flow direction
  status: 'success' | 'failed'; // Relay status
}

/**
 * Props for RelayLogViewer component
 */
interface RelayLogViewerProps {
  visible: boolean; // Whether the modal is visible
  onClose: () => void; // Callback when modal is closed
}

/**
 * Global relay log storage
 * Stores relay events across component lifecycle
 */
const relayLogs: RelayLogEntry[] = [];

/**
 * Add a relay log entry
 * Called by MessageService when a message is relayed
 *
 * @param messageId - Message ID being relayed
 * @param ttl - TTL value after decrement
 * @param direction - Message flow direction
 * @param status - Relay status
 */
export function addRelayLog(
  messageId: string,
  ttl: number,
  direction: 'incoming' | 'outgoing',
  status: 'success' | 'failed',
): void {
  const entry: RelayLogEntry = {
    id: `${Date.now()}-${Math.random()}`,
    messageId,
    timestamp: Date.now(),
    ttl,
    direction,
    status,
  };

  relayLogs.push(entry);

  // Keep only last 100 entries to prevent memory issues
  if (relayLogs.length > 100) {
    relayLogs.shift();
  }

  console.log('[RELAY LOG]', {
    messageId: messageId.substring(0, 8),
    ttl,
    direction,
    status,
  });
}

/**
 * Get all relay logs
 * Returns a copy of the relay log array
 */
export function getRelayLogs(): RelayLogEntry[] {
  return [...relayLogs];
}

/**
 * Clear all relay logs
 * Removes all entries from the log
 */
export function clearRelayLogs(): void {
  relayLogs.length = 0;
}

/**
 * RelayLogViewer component
 *
 * Displays a modal with a scrollable list of relay events.
 * Updates in real-time as new relay events occur.
 */
export const RelayLogViewer: React.FC<RelayLogViewerProps> = ({
  visible,
  onClose,
}) => {
  const [logs, setLogs] = useState<RelayLogEntry[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update logs every second
  useEffect(() => {
    if (!visible) return;

    const updateLogs = () => {
      setLogs(getRelayLogs());
    };

    // Initial update
    updateLogs();

    // Set up interval for updates
    const interval = setInterval(updateLogs, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollViewRef.current && logs.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [logs]);

  /**
   * Format timestamp for display
   * Shows time in HH:MM:SS format
   */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  /**
   * Format message ID for display
   * Shows first 8 characters for readability
   */
  const formatMessageId = (messageId: string): string => {
    return messageId.substring(0, 8);
  };

  /**
   * Handle clear logs button press
   */
  const handleClearLogs = () => {
    clearRelayLogs();
    setLogs([]);
  };

  /**
   * Render a single log entry
   */
  const renderLogEntry = (entry: RelayLogEntry) => {
    const directionIcon = entry.direction === 'incoming' ? '⬇️' : '⬆️';
    const statusIcon = entry.status === 'success' ? '✅' : '❌';

    return (
      <View key={entry.id} style={styles.logEntry}>
        <View style={styles.logHeader}>
          <Text style={styles.logTime}>{formatTime(entry.timestamp)}</Text>
          <Text style={styles.logIcons}>
            {directionIcon} {statusIcon}
          </Text>
        </View>
        <View style={styles.logDetails}>
          <Text style={styles.logText}>
            Message: <Text style={styles.logValue}>{formatMessageId(entry.messageId)}</Text>
          </Text>
          <Text style={styles.logText}>
            TTL: <Text style={styles.logValue}>{entry.ttl}</Text>
          </Text>
          <Text style={styles.logText}>
            Direction: <Text style={styles.logValue}>{entry.direction}</Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Relay Logs</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearLogs}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            Total Relays: <Text style={styles.statsValue}>{logs.length}</Text>
          </Text>
          <Text style={styles.statsText}>
            Successful:{' '}
            <Text style={styles.statsValue}>
              {logs.filter(l => l.status === 'success').length}
            </Text>
          </Text>
          <Text style={styles.statsText}>
            Failed:{' '}
            <Text style={styles.statsValue}>
              {logs.filter(l => l.status === 'failed').length}
            </Text>
          </Text>
        </View>

        {/* Log entries */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.logList}
          contentContainerStyle={styles.logListContent}
        >
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No relay events yet</Text>
              <Text style={styles.emptySubtext}>
                Messages relayed through this device will appear here
              </Text>
            </View>
          ) : (
            logs.map(entry => renderLogEntry(entry))
          )}
        </ScrollView>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend:</Text>
          <Text style={styles.legendText}>⬇️ Incoming relay ⬆️ Outgoing relay</Text>
          <Text style={styles.legendText}>✅ Success ❌ Failed</Text>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Styles for RelayLogViewer component
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4a90e2',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  statsText: {
    color: '#cccccc',
    fontSize: 14,
  },
  statsValue: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  logList: {
    flex: 1,
  },
  logListContent: {
    padding: 16,
  },
  logEntry: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTime: {
    color: '#888888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  logIcons: {
    fontSize: 16,
  },
  logDetails: {
    gap: 4,
  },
  logText: {
    color: '#cccccc',
    fontSize: 14,
  },
  logValue: {
    color: '#4a90e2',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#888888',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
  },
  legend: {
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  legendTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  legendText: {
    color: '#cccccc',
    fontSize: 12,
  },
});
