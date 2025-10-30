/**
 * MessageItem Component - Renders individual message in conversation
 *
 * This component displays a single message bubble with:
 * - Message text with word wrapping
 * - Formatted timestamp (e.g., "10:30 AM" or "Yesterday 3:45 PM")
 * - Status indicator for sent messages (checkmark for delivered, clock for pending, X for failed)
 * - Different background colors for sent (light blue) and received (light gray) messages
 * - Border radius and padding for message bubble appearance
 *
 * The component provides clear visual distinction between sent and received messages
 * with appropriate alignment and styling optimized for emergency communication scenarios.
 *
 * Requirements addressed:
 * - 5.3: Display messages with sender identifier and timestamp
 * - 10.5: Display visual indicators for message status including sent, delivered, and failed states
 *
 * Architecture:
 * - Pure presentational component (no state management)
 * - Receives message data as props
 * - Handles timestamp formatting internally
 * - Applies conditional styling based on message properties
 *
 * Dependencies:
 * - React Native: View, Text, StyleSheet
 * - types.ts: Message interface
 *
 * Usage:
 * ```typescript
 * <MessageItem message={messageObject} />
 * ```
 *
 * @module MessageItem
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Message } from '../context/types';

/**
 * Props for MessageItem component.
 *
 * @property message - Message object containing text, timestamp, and status
 */
interface MessageItemProps {
  message: Message;
}

/**
 * MessageItem component - Renders a single message bubble.
 *
 * Features:
 * - Displays message text with word wrapping
 * - Shows formatted timestamp based on message age
 * - Displays status indicator for sent messages (✓ delivered, ○ pending, ✗ failed)
 * - Applies light blue background for sent messages
 * - Applies light gray background for received messages
 * - Aligns sent messages to the right, received to the left
 * - Rounded corners and padding for bubble appearance
 *
 * @param props - Component props
 * @returns React component
 */
export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  /**
   * Format timestamp for display.
   * Shows time in 12-hour format with AM/PM.
   * Shows "Yesterday" or date for older messages.
   *
   * Examples:
   * - Today: "10:30 AM"
   * - Yesterday: "Yesterday 3:45 PM"
   * - Older: "10/28 2:15 PM"
   *
   * @param timestamp - Unix timestamp in milliseconds
   * @returns Formatted time string
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    // Format time as 12-hour with AM/PM
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${hours}:${minutesStr} ${ampm}`;

    // Determine date prefix
    if (messageDate.getTime() === today.getTime()) {
      return timeStr;
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return `Yesterday ${timeStr}`;
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day} ${timeStr}`;
    }
  };

  /**
   * Get status icon for sent messages.
   * Returns appropriate symbol based on message status.
   *
   * Status indicators:
   * - ✓ (checkmark): Message delivered successfully
   * - ○ (circle): Message pending/sending
   * - ✗ (X): Message failed to send
   *
   * @param msg - Message object
   * @returns Status icon string
   */
  const getStatusIcon = (msg: Message): string => {
    if (msg.failed) {
      return '✗'; // X for failed
    } else if (msg.delivered) {
      return '✓'; // Checkmark for delivered
    } else {
      return '○'; // Circle for pending
    }
  };

  // Determine if message was sent by user
  const isSent = message.sent;

  return (
    <View
      style={[
        styles.messageContainer,
        isSent ? styles.sentMessageContainer : styles.receivedMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isSent ? styles.sentBubble : styles.receivedBubble,
        ]}
      >
        {/* Message text with word wrapping */}
        <Text
          style={[
            styles.messageText,
            isSent ? styles.sentText : styles.receivedText,
          ]}
        >
          {message.text}
        </Text>

        {/* Timestamp and status footer */}
        <View style={styles.messageFooter}>
          {/* Formatted timestamp */}
          <Text
            style={[
              styles.timestamp,
              isSent ? styles.sentTimestamp : styles.receivedTimestamp,
            ]}
          >
            {formatTimestamp(message.timestamp)}
          </Text>

          {/* Status indicator for sent messages only */}
          {isSent && (
            <Text
              style={[
                styles.statusIcon,
                message.failed && styles.statusFailed,
                message.delivered && styles.statusDelivered,
              ]}
            >
              {getStatusIcon(message)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * Styles for MessageItem component.
 *
 * Design principles:
 * - Clear visual distinction between sent (blue) and received (gray) messages
 * - High contrast colors for emergency visibility
 * - Message bubbles with rounded corners (18px border radius)
 * - Proper padding (16px horizontal, 10px vertical) for readability
 * - Appropriate spacing between messages
 * - Accessible text sizes (16px for message, 12px for timestamp)
 * - Maximum width of 75% to prevent messages from spanning full width
 * - Alignment: sent messages right-aligned, received messages left-aligned
 */
const styles = StyleSheet.create({
  // Container for entire message item with horizontal padding
  messageContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  // Align sent messages to the right
  sentMessageContainer: {
    alignItems: 'flex-end',
  },
  // Align received messages to the left
  receivedMessageContainer: {
    alignItems: 'flex-start',
  },
  // Message bubble with rounded corners and padding
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // Light blue background for sent messages
  sentBubble: {
    backgroundColor: '#007AFF',
  },
  // Light gray background for received messages
  receivedBubble: {
    backgroundColor: '#E5E5EA',
  },
  // Message text with word wrapping
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  // White text for sent messages (on blue background)
  sentText: {
    color: '#FFFFFF',
  },
  // Black text for received messages (on gray background)
  receivedText: {
    color: '#000000',
  },
  // Footer containing timestamp and status
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  // Timestamp text styling
  timestamp: {
    fontSize: 12,
  },
  // White timestamp for sent messages with slight transparency
  sentTimestamp: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  // Gray timestamp for received messages
  receivedTimestamp: {
    color: '#8E8E93',
  },
  // Status icon styling
  statusIcon: {
    fontSize: 12,
    marginLeft: 6,
  },
  // White color for delivered status (checkmark)
  statusDelivered: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  // Red color for failed status (X)
  statusFailed: {
    color: '#FF3B30',
  },
});
