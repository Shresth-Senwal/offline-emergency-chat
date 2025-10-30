/**
 * PeerList Component - Displays discovered and connected peers
 *
 * This component renders a list of all discovered and connected peer devices
 * in the mesh network. It provides:
 * - Visual list of peers with connection status indicators
 * - Signal strength (RSSI) display for each peer
 * - Tap-to-select functionality to open conversation with a peer
 * - Pull-to-refresh to manually trigger BLE scanning
 * - Empty state message when no peers are found
 *
 * The component uses a high-contrast design optimized for emergency situations
 * where visibility and quick recognition are critical.
 *
 * Requirements addressed:
 * - 10.2: Display list of discovered and connected peer nodes with status indicators
 * - 10.3: Enable user to tap on peer to display conversation view
 *
 * Architecture:
 * - Consumes AppContext for peer state and actions
 * - Uses FlatList for efficient rendering of peer list
 * - Implements RefreshControl for pull-to-refresh scanning
 * - Provides visual feedback for connection status and signal strength
 *
 * Dependencies:
 * - React Native: FlatList, RefreshControl, TouchableOpacity, View, Text
 * - AppContext: useAppState hook for peer data and actions
 * - types.ts: Peer interface
 *
 * Usage:
 * ```typescript
 * <PeerList />
 * ```
 *
 * @module PeerList
 */

import React, { useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppState } from '../context/AppContext';
import { Peer } from '../context/types';

/**
 * PeerList component - Displays list of discovered and connected peers.
 *
 * Features:
 * - Shows all peers from AppContext with connection status
 * - Displays peer name, connection indicator, and signal strength
 * - Allows user to tap peer to open conversation
 * - Pull-to-refresh triggers BLE scan
 * - Shows "No peers found" when list is empty
 *
 * @returns React component
 */
export const PeerList: React.FC = () => {
  const {
    peers,
    scanning,
    setCurrentPeer,
    startScanning,
  } = useAppState();

  /**
   * Convert peers Map to array for FlatList rendering.
   * Memoized to avoid unnecessary recalculations.
   */
  const peerArray = useMemo(() => {
    return Array.from(peers.values());
  }, [peers]);

  /**
   * Handle peer selection.
   * Sets the selected peer as current and triggers navigation to conversation view.
   *
   * @param peerId - ID of the selected peer
   */
  const handlePeerPress = (peerId: string) => {
    setCurrentPeer(peerId);
  };

  /**
   * Handle pull-to-refresh.
   * Manually triggers BLE scanning to discover new peers.
   */
  const handleRefresh = () => {
    startScanning();
  };

  /**
   * Render individual peer item.
   *
   * Displays:
   * - Peer name (derived from public key hash)
   * - Connection status indicator (green dot = connected, gray dot = disconnected)
   * - RSSI signal strength in dBm
   *
   * @param item - Peer object to render
   * @returns React element for peer item
   */
  const renderPeerItem = ({ item }: { item: Peer }) => {
    return (
      <TouchableOpacity
        style={styles.peerItem}
        onPress={() => handlePeerPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.peerInfo}>
          {/* Connection status indicator */}
          <View
            style={[
              styles.statusDot,
              item.connected ? styles.statusConnected : styles.statusDisconnected,
            ]}
          />

          {/* Peer name */}
          <Text style={styles.peerName}>{item.name}</Text>
        </View>

        {/* Signal strength */}
        <Text style={styles.rssi}>{item.rssi} dBm</Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state when no peers are found.
   *
   * @returns React element for empty state
   */
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No peers found</Text>
        <Text style={styles.emptySubtext}>
          Pull down to scan for nearby devices
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Mesh Chat</Text>
        <Text style={styles.headerSubtitle}>
          {peerArray.length} {peerArray.length === 1 ? 'peer' : 'peers'} found
        </Text>
      </View>

      {/* Peer list */}
      <FlatList
        data={peerArray}
        renderItem={renderPeerItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={scanning}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={
          peerArray.length === 0 ? styles.emptyListContent : undefined
        }
      />
    </View>
  );
};

/**
 * Styles for PeerList component.
 *
 * Design principles:
 * - High contrast colors for emergency visibility
 * - Large touch targets for easy interaction
 * - Clear visual hierarchy
 * - Simple, uncluttered layout
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  peerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  peerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusConnected: {
    backgroundColor: '#34C759',
  },
  statusDisconnected: {
    backgroundColor: '#8E8E93',
  },
  peerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  rssi: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
