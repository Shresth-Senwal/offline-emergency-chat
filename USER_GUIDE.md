# User Guide - Offline Emergency Mesh Chat

This guide explains how to use the Offline Emergency Mesh Chat application for secure, decentralized communication during emergencies.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Discovering Peers](#discovering-peers)
3. [Sending Messages](#sending-messages)
4. [Trust Verification](#trust-verification)
5. [Understanding Mesh Relay](#understanding-mesh-relay)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Getting Started

### First Launch

1. **Launch the app** on your device
2. **Grant Bluetooth permissions** when prompted
   - iOS: Tap "Allow" when asked for Bluetooth access
   - Android: Grant Bluetooth and Location permissions (Location is required for BLE scanning)
3. **Enable Bluetooth** if not already enabled
   - The app will show a banner if Bluetooth is disabled
   - Go to device Settings and enable Bluetooth
4. **Wait for initialization** (1-2 seconds)
   - The app generates encryption keys on first launch
   - These keys are stored securely on your device

### Understanding the Interface

The app has three main screens:

1. **Peer List**: Shows discovered and connected peers
2. **Conversation View**: Displays messages with a selected peer
3. **Trust Verification**: QR code display and scanning for identity verification

## Discovering Peers

### Automatic Discovery

The app automatically discovers nearby devices running the same app:

1. **Ensure Bluetooth is enabled** on both devices
2. **Keep the app in foreground** (app must be visible and active)
3. **Wait 5-10 seconds** for peer discovery
4. **Peers appear in the list** with:
   - Peer name (derived from their public key)
   - Connection status (green dot = connected, gray = disconnected)
   - Signal strength (RSSI value)

### Manual Refresh

If peers don't appear automatically:

1. **Pull down on the peer list** to refresh
2. **Wait a few seconds** for scan to complete
3. **Move closer** if peers still don't appear (BLE range is ~10-30 meters)

### Connection Status

- **Green dot**: Peer is connected and ready for messaging
- **Gray dot**: Peer was discovered but not currently connected
- **No peers found**: No other devices running the app are nearby

## Sending Messages

### Starting a Conversation

1. **Tap on a peer** in the peer list
2. **Wait for connection** (if not already connected)
3. **Conversation view opens** showing message history

### Composing Messages

1. **Type your message** in the text input at the bottom
2. **Character counter** shows remaining characters (max 500)
3. **Tap Send button** to send the message
4. **Message appears** in the conversation with status indicator

### Message Status Indicators

- **Clock icon**: Message is being sent
- **Single checkmark**: Message sent successfully
- **Red X**: Message failed to send (will retry automatically)

### Message Display

- **Right-aligned (blue)**: Messages you sent
- **Left-aligned (gray)**: Messages you received
- **Timestamp**: Shows when message was sent/received
- **Automatic scrolling**: New messages appear at the bottom

### Message Limitations

- **Maximum 500 characters** per message
- **Text only** (no images, files, or emojis in MVP)
- **No editing** after sending
- **No deletion** (messages stored locally)

## Trust Verification

Trust verification ensures you're communicating with the intended person and not a man-in-the-middle attacker. This is done by comparing cryptographic fingerprints via QR codes.

### Why Verify Trust?

Without verification, an attacker could intercept your connection and impersonate your peer. Trust verification prevents this by allowing you to confirm your peer's identity through a secure out-of-band channel (QR code scanning).

### How to Verify a Peer

#### Step 1: Open Trust Verification

1. **Open conversation** with the peer you want to verify
2. **Tap the verification button** (shield icon or "Verify" button)
3. **Trust Verification screen opens**

#### Step 2: Show Your QR Code

1. **Tap "Show My QR Code"** button
2. **Your fingerprint appears as a QR code**
3. **Show your screen** to your peer
4. **Keep the QR code visible** while they scan

#### Step 3: Scan Peer's QR Code

1. **Ask your peer to show their QR code**
2. **Tap "Scan Peer QR Code"** button
3. **Point your camera** at their QR code
4. **Wait for automatic scan** (1-2 seconds)

#### Step 4: Verification Result

**Success (Green Checkmark)**:
- Fingerprints match
- Peer identity verified
- Green shield icon appears in conversation header
- You can now communicate securely

**Failure (Red X)**:
- Fingerprints don't match
- **WARNING**: Possible man-in-the-middle attack
- **Do not send sensitive information**
- Try reconnecting or use a different device

### Best Practices for Verification

- **Verify in person** when possible (within visual range)
- **Verify before sending sensitive information**
- **Re-verify if you suspect compromise**
- **Verify all peers** in a mesh network for maximum security

### What is a Fingerprint?

A fingerprint is a short cryptographic hash (32 hexadecimal characters) derived from a peer's public key. It serves as a unique identifier that can be easily compared visually or via QR code.

Example fingerprint: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## Understanding Mesh Relay

### What is Mesh Relay?

Mesh relay allows messages to travel through intermediate devices to reach peers beyond direct Bluetooth range.

**Example**:
- Device A and Device C are too far apart to connect directly
- Device B is within range of both A and C
- Message from A → B → C (B acts as relay)

### How Relay Works

1. **You send a message** to a peer
2. **Message is encrypted** with your shared secret
3. **Message is sent to all connected peers**
4. **Each peer checks**:
   - Is this message for me? (decrypt and display)
   - Is this a duplicate? (discard if already seen)
   - Should I relay? (forward if TTL > 0)
5. **Relay peers forward** to their connected peers
6. **Process repeats** until message reaches destination or TTL expires

### Time-to-Live (TTL)

- **Initial TTL**: 10 hops
- **Decrements by 1** at each relay
- **Stops relaying** when TTL reaches 0
- **Maximum range**: ~100-300 meters (depending on device spacing)

### Duplicate Detection

The app prevents message loops by tracking message IDs:
- Each message has a unique ID
- Received messages are cached for 5 minutes
- Duplicate messages are discarded automatically

### Relay Indicators

- **No special indicator** for relayed messages (appears normal)
- **Same encryption** regardless of relay path
- **Automatic and transparent** to users

## Troubleshooting

### Peers Not Appearing

**Problem**: No peers show up in the list

**Solutions**:
1. **Check Bluetooth**: Ensure Bluetooth is enabled on both devices
2. **Check permissions**: Verify app has Bluetooth permissions
3. **Check range**: Move devices closer (within 10-30 meters)
4. **Restart app**: Force close and reopen the app
5. **Pull to refresh**: Swipe down on peer list to trigger manual scan
6. **Android only**: Ensure Location Services are enabled

### Connection Failures

**Problem**: Peer appears but won't connect

**Solutions**:
1. **Wait longer**: Connections can take 3-5 seconds
2. **Check interference**: Move away from other Bluetooth devices
3. **Restart Bluetooth**: Toggle Bluetooth off and on
4. **Restart app**: Force close and reopen
5. **Check device limit**: iOS supports max 7 concurrent connections

### Messages Not Sending

**Problem**: Messages show failed status (red X)

**Solutions**:
1. **Check connection**: Ensure peer shows green dot (connected)
2. **Check message length**: Must be under 500 characters
3. **Wait for retry**: App automatically retries failed messages
4. **Check range**: Peer may have moved out of range
5. **Reconnect**: Disconnect and reconnect to peer

### Messages Not Received

**Problem**: Peer says they sent a message but you didn't receive it

**Solutions**:
1. **Check connection**: Ensure you're connected to sender
2. **Check app state**: App must be in foreground
3. **Check relay path**: If using relay, ensure intermediate devices are connected
4. **Check encryption**: Verify trust to ensure keys match
5. **Restart app**: Force close and reopen

### Trust Verification Issues

**Problem**: QR code won't scan

**Solutions**:
1. **Check camera permission**: Ensure app has camera access
2. **Improve lighting**: Scan in well-lit environment
3. **Adjust distance**: Hold devices 6-12 inches apart
4. **Clean camera**: Wipe camera lens
5. **Increase brightness**: Turn up screen brightness on device showing QR code

**Problem**: Verification fails (red X)

**Solutions**:
1. **Disconnect and reconnect**: Break connection and reconnect
2. **Restart both apps**: Force close and reopen on both devices
3. **Check for interference**: Ensure no other devices are interfering
4. **If persistent**: May indicate actual man-in-the-middle attack - use different network

### Performance Issues

**Problem**: App is slow or unresponsive

**Solutions**:
1. **Check device memory**: Close other apps
2. **Clear message history**: Reinstall app to clear old messages
3. **Reduce connections**: Disconnect from unused peers
4. **Restart device**: Reboot your phone

**Problem**: Battery drains quickly

**Solutions**:
1. **Close app when not needed**: BLE scanning uses battery
2. **Reduce screen brightness**: Screen is major battery consumer
3. **Disable other Bluetooth devices**: Reduce Bluetooth interference
4. **Expected behavior**: Continuous BLE operation uses more battery than normal

## Best Practices

### For Reliable Communication

1. **Keep app in foreground**: Background operation is not supported
2. **Stay within range**: Maintain 10-30 meter distance for direct connection
3. **Verify trust**: Always verify peers before sending sensitive information
4. **Use relay wisely**: Position relay devices strategically for coverage
5. **Monitor connection status**: Check for green dot before sending important messages

### For Security

1. **Verify all peers**: Use QR code verification for all communication partners
2. **Verify in person**: When possible, verify trust face-to-face
3. **Don't share keys**: Never share your private key or fingerprint via insecure channels
4. **Reinstall if compromised**: If you suspect key compromise, reinstall app (generates new keys)
5. **Physical security**: Protect your device - anyone with physical access can read messages

### For Mesh Networks

1. **Strategic positioning**: Place relay devices between groups
2. **Maintain connections**: Keep relay devices powered and app running
3. **Test relay paths**: Verify messages reach destination before emergency
4. **Limit hops**: Keep networks under 10 hops for reliability
5. **Monitor relay devices**: Ensure intermediate devices stay connected

### For Emergency Situations

1. **Test beforehand**: Practice using the app before emergency
2. **Keep devices charged**: Maintain battery levels
3. **Establish network early**: Connect devices before communication is critical
4. **Use short messages**: Stay under 500 characters for faster transmission
5. **Confirm receipt**: Ask peers to acknowledge important messages

## Frequently Asked Questions

### Does this work without internet?

Yes, the app works completely offline using only Bluetooth. No internet or cellular connection is required.

### How far can messages travel?

Direct BLE range is 10-30 meters. With mesh relay, messages can travel up to 10 hops, potentially covering 100-300 meters depending on device spacing.

### Can iOS and Android devices communicate?

Yes, the app is fully compatible between iOS and Android devices.

### Are messages stored in the cloud?

No, all messages are stored locally on your device. There is no cloud synchronization.

### Can someone intercept my messages?

Messages are encrypted end-to-end with XChaCha20-Poly1305. Without your private key, messages cannot be decrypted. However, you should verify trust via QR codes to prevent man-in-the-middle attacks.

### What happens if I reinstall the app?

Reinstalling generates new encryption keys. You will need to re-verify trust with all peers, and previous message history will be lost.

### Can I use this for group chat?

The MVP version supports only peer-to-peer messaging. Group chat is a potential future enhancement.

### Does this drain my battery?

Yes, continuous BLE scanning and advertising uses more battery than normal. Close the app when not needed to conserve battery.

### Why does Android need Location permission?

Android requires Location permission for BLE scanning (Android 6.0+). The app does not access your GPS location - this is an Android platform requirement for BLE.

### Can I send images or files?

The MVP version supports text messages only (max 500 characters). File sharing is a potential future enhancement.

## Getting Help

If you encounter issues not covered in this guide:

1. **Check logs**: Enable developer mode to view detailed logs
2. **Restart everything**: Restart app, Bluetooth, and device
3. **Test with different devices**: Isolate hardware-specific issues
4. **Report bugs**: [Specify bug reporting method]

## Safety and Legal

- **Emergency use only**: This app is designed for emergency communication
- **Not a replacement**: Do not rely solely on this app - use all available communication methods
- **Legal compliance**: Ensure Bluetooth usage complies with local regulations
- **Privacy**: Be aware that Bluetooth signals can be detected by nearby devices
- **No warranty**: This is an MVP implementation - use at your own risk

## Appendix: Technical Details

For developers and advanced users, see:
- [API_REFERENCE.md](API_REFERENCE.md) - Technical specifications
- [README.md](README.md) - Installation and development guide
