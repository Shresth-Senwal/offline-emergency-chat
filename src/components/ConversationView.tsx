/**
 * ConversationView Component - Displays messages for selected peer
 *
 * This component renders a conversation interface for messaging with a specific peer.
 * It provides:
 * - Scrollable message history with sent/received indicators
 * - Message composition input with character limit
 * - Send button for transmitting messages
 * - Message status indicators (sent, delivered, failed)
 * - Auto-scroll to bottom when new messages arrive
 * - Peer name and verification status in header
 *
 * The component uses a clear visual distinction between sent and received messages
 * with alignment and color coding optimized for emergency situations.
 *
 * Requirements addressed:
 * - 4.1: Message composition with 500 character limit
 * - 5.3: Display messages with sender identifier and timestamp
 * - 10.1: Display conversation view showing message history
 * - 10.3: Provide text input field and send button
 * - 10.4: Display visual indicators for message status
 * - 10.5: Show sent, delivered, and failed states
 *
 * Architecture:
 * - Consumes AppContext for message state and send functionality
 * - Uses FlatList for efficient rendering of message history
 * - Implements auto-scroll behavior for new messages
 * - Provides real-time character counter for message composition
 *
 * Dependencies:
 * - React Native: FlatList, TextInput, TouchableOpacity, View, Text, KeyboardAvoidingView
 * - AppContext: useAppState hook for message data and actions
 * - types.ts: Message, Peer interfaces
 * - constants.ts: MAX_MESSAGE_LENGTH
 *
 * Usage:
 * ```typescript
 * <ConversationView />
 * ```
 *
 * @module ConversationView
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppState } from '../context/AppContext';
import { Message } from '../context/types';
import { MAX_MESSAGE_LENGTH } from '../utils/constants';
import { TrustVerification } from './TrustVerification';
import { MessageItem } from './MessageItem';

/**
 * ConversationView component - Displays conversation with selected peer.
 *
 * Features:
 * - Shows message history filtered by current peer
 * - Displays messages with timestamp and sent/received alignment
 * - Provides text input with character limit and counter
 * - Send button calls MessageService.sendMessage
 * - Auto-scrolls to bottom when new messages arrive
 * - Shows peer name and verification status in header
 * - Clear visual distinction between sent and received messages
 *
 * @returns React component
 */
export const ConversationView: React.FC = () => {
  const {
    peers,
    messages,
    currentPeerId,
    setCurrentPeer,
    sendMessage,
  } = useAppState();

  // Local state for message composition
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Local state for trust verification modal
  const [showVerification, setShowVerification] = useState(false);

  // Ref for FlatList to enable auto-scroll
  const flatListRef = useRef<FlatList<Message>>(null);

  /**
   * Get current peer object from peers map.
   * Returns null if no peer is selected or peer not found.
   */
  const currentPeer = useMemo(() => {
    if (!currentPeerId) {
      return null;
    }
    return peers.get(currentPeerId) || null;
  }, [currentPeerId, peers]);

  /**
   * Get messages for current peer, sorted by timestamp (oldest first).
   * Returns empty array if no peer selected or no messages found.
   */
  const peerMessages = useMemo(() => {
    if (!currentPeerId) {
      return [];
    }
    const msgs = messages.get(currentPeerId) || [];
    // Sort by timestamp ascending (oldest first)
    return [...msgs].sort((a, b) => a.timestamp - b.timestamp);
  }, [currentPeerId, messages]);

  /**
   * Auto-scroll to bottom when new messages arrive.
   * Triggers when peerMessages array changes.
   */
  useEffect(() => {
    if (peerMessages.length > 0 && flatListRef.current) {
      // Small delay to ensure FlatList has rendered new items
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [peerMessages]);

  /**
   * Handle back button press.
   * Returns to peer list by clearing current peer selection.
   */
  const handleBack = () => {
    setCurrentPeer(null);
  };

  /**
   * Handle verify button press.
   * Opens the trust verification modal.
   */
  const handleVerify = () => {
    setShowVerification(true);
  };

  /**
   * Handle send button press.
   * Validates input, sends message via MessageService, and clears input.
   */
  const handleSend = async () => {
    // Validate input
    if (!messageText.trim()) {
      return;
    }

    if (!currentPeerId) {
      return;
    }

    if (messageText.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    try {
      setSending(true);

      // Send message via MessageService
      await sendMessage(currentPeerId, messageText.trim());

      // Clear input on success
      setMessageText('');
    } catch (error) {
      console.error('[ConversationView] Failed to send message:', error);
      // TODO: Show error toast/alert to user
    } finally {
      setSending(false);
    }
  };

  /**
   * Render individual message item.
   *
   * Delegates rendering to MessageItem component.
   *
   * @param item - Message object to render
   * @returns React element for message item
   */
  const renderMessageItem = ({ item }: { item: Message }) => {
    return <MessageItem message={item} />;
  };

  /**
   * Render empty state when no messages exist.
   *
   * @returns React element for empty state
   */
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>
          Send a message to start the conversation
        </Text>
      </View>
    );
  };

  // If no peer is selected, show error state
  if (!currentPeer) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No peer selected</Text>
        </View>
      </View>
    );
  }

  // Calculate remaining characters
  const remainingChars = MAX_MESSAGE_LENGTH - messageText.length;
  const isOverLimit = remainingChars < 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Peer info */}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{currentPeer.name}</Text>
          <View style={styles.headerStatus}>
            <View
              style={[
                styles.headerStatusDot,
                currentPeer.connected
                  ? styles.statusConnected
                  : styles.statusDisconnected,
              ]}
            />
            <Text style={styles.headerStatusText}>
              {currentPeer.connected ? 'Connected' : 'Disconnected'}
            </Text>
            {currentPeer.verified && (
              <Text style={styles.verifiedBadge}>✓ Verified</Text>
            )}
          </View>
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerify}
          activeOpacity={0.7}
        >
          <Text style={styles.verifyButtonText}>
            {currentPeer.verified ? '✓' : '?'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={peerMessages}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          peerMessages.length === 0 ? styles.emptyListContent : styles.listContent
        }
        onContentSizeChange={() => {
          // Auto-scroll to bottom when content size changes
          if (peerMessages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {/* Message input */}
      <View style={styles.inputContainer}>
        {/* Character counter */}
        <View style={styles.counterContainer}>
          <Text
            style={[
              styles.counterText,
              isOverLimit && styles.counterTextOverLimit,
            ]}
          >
            {remainingChars} characters remaining
          </Text>
        </View>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={MAX_MESSAGE_LENGTH + 50} // Allow typing over limit to show counter
            editable={!sending}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending || isOverLimit) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending || isOverLimit}
            activeOpacity={0.7}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trust Verification Modal */}
      <TrustVerification
        visible={showVerification}
        peerId={currentPeerId}
        onClose={() => setShowVerification(false)}
      />
    </KeyboardAvoidingView>
  );
};

/**
 * Styles for ConversationView component.
 *
 * Design principles:
 * - Clear visual distinction between sent and received messages
 * - High contrast colors for emergency visibility
 * - Message bubbles with rounded corners
 * - Proper spacing and alignment
 * - Accessible touch targets
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusConnected: {
    backgroundColor: '#34C759',
  },
  statusDisconnected: {
    backgroundColor: '#8E8E93',
  },
  headerStatusText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  verifyButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    paddingVertical: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  counterContainer: {
    marginBottom: 8,
  },
  counterText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  counterTextOverLimit: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
