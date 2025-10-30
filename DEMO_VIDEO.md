# 3-Device Mesh Relay Demonstration

## Overview

This document provides instructions for recording a demonstration video showing the mesh relay functionality of the Offline Emergency Chat application. The demonstration will prove that messages can be relayed through intermediate devices to reach recipients outside of direct BLE range.

## Requirements

### Hardware Requirements

- **3 Physical Devices**: iOS or Android devices (or 2 physical + 1 emulator if BLE emulation is supported)
  - Device A (Sender)
  - Device B (Relay Node)
  - Device C (Recipient)
- **Large Space**: Area with at least 20 meters of distance to position devices out of direct BLE range
- **Video Recording Equipment**: Camera or additional device to record all three screens simultaneously

### Software Requirements

- Offline Emergency Chat app installed on all three devices
- Bluetooth enabled on all devices
- Location permissions granted (Android requirement for BLE scanning)

## Setup Instructions

### Step 1: Enable Relay Logging

The app includes built-in relay logging that will help verify messages are being relayed through Device B. The logs are visible in the app's debug console or can be viewed through developer tools.

**For iOS:**
1. Connect device to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select device and view console logs
4. Filter for "RELAY" to see relay events

**For Android:**
1. Enable USB debugging on device
2. Connect device to computer
3. Run: `adb logcat | grep RELAY`
4. Relay events will be displayed in real-time

### Step 2: Position Devices

1. **Device A (Sender)**: Position at one end of the test area
2. **Device C (Recipient)**: Position at the opposite end, at least 10-15 meters away from Device A
3. **Device B (Relay Node)**: Position in the middle, within BLE range of both Device A and Device C

**Important**: Verify that Device A and Device C cannot directly discover each other by checking the peer list on both devices. If they can see each other, increase the distance or add physical obstacles (walls, furniture) between them.

### Step 3: Launch and Verify Peer Discovery

1. Launch the Offline Emergency Chat app on all three devices
2. Wait for peer discovery (up to 10 seconds)
3. **Verify on Device A**: Should see Device B in peer list, but NOT Device C
4. **Verify on Device B**: Should see both Device A and Device C in peer list
5. **Verify on Device C**: Should see Device B in peer list, but NOT Device A

If the peer discovery doesn't match this pattern, adjust device positions.

### Step 4: Establish Trust (Optional but Recommended)

For a complete demonstration, verify trust between all peers:

1. On Device A and Device B: Exchange QR code fingerprints
2. On Device B and Device C: Exchange QR code fingerprints
3. Verify that all connections show the verified indicator

### Step 5: Record the Demonstration

#### Recording Setup

Position your recording device to capture all three screens simultaneously. You can:
- Use a tripod and wide-angle camera
- Use screen recording on each device and combine videos in post-production
- Use a multi-camera setup

#### Recording Steps

1. **Start Recording**: Begin video capture showing all three device screens
2. **Show Initial State**: Pan across all three devices showing:
   - Device A peer list (showing only Device B)
   - Device B peer list (showing Device A and Device C)
   - Device C peer list (showing only Device B)
3. **Send Message from Device A**:
   - On Device A, select Device C from the peer list
   - Type a test message: "Emergency: This message is being relayed through Device B"
   - Press Send
   - Show the message appearing in Device A's conversation view with "sent" status
4. **Show Relay on Device B**:
   - Switch focus to Device B
   - Show the relay log entry (if visible in UI or console)
   - The message should appear in Device B's relay logs but not necessarily in the conversation view (unless Device B is also a recipient)
5. **Show Receipt on Device C**:
   - Switch focus to Device C
   - Show the message appearing in Device C's conversation view
   - Verify the message text matches what was sent from Device A
   - Show the timestamp and sender information
6. **Demonstrate Round-Trip**:
   - On Device C, send a reply message back to Device A
   - Show the message being relayed through Device B
   - Show the reply appearing on Device A
7. **Show Relay Logs** (if implemented):
   - Display the relay logs from Device B showing both message relays
   - Logs should show message IDs, TTL values, and relay timestamps

#### What to Highlight in the Video

- **Distance**: Show the physical distance between Device A and Device C
- **Peer Lists**: Clearly show that Device A and Device C cannot see each other directly
- **Message Flow**: Show the complete message journey from A → B → C
- **Timing**: Demonstrate the relay latency (should be under 1 second per hop)
- **Bidirectional**: Show messages can be relayed in both directions
- **Reliability**: Send multiple messages to show consistent relay behavior

## Verification Checklist

Before finalizing the video, verify:

- [ ] Device A and Device C are positioned out of direct BLE range (>10 meters)
- [ ] Device B is positioned within range of both Device A and Device C
- [ ] Peer discovery shows the correct topology (A↔B↔C, but not A↔C)
- [ ] Message sent from Device A appears on Device C
- [ ] Message sent from Device C appears on Device A
- [ ] Relay logs on Device B show both message relays (if logging implemented)
- [ ] Video clearly shows all three device screens
- [ ] Video demonstrates the complete message flow
- [ ] Audio narration explains what is happening (optional but recommended)

## Troubleshooting

### Device A and Device C Can See Each Other Directly

**Solution**: Increase distance between devices or add physical obstacles. BLE range can vary significantly based on environment and device hardware.

### Device B Cannot See Both Devices

**Solution**: Adjust Device B's position. It must be within approximately 10 meters of both Device A and Device C.

### Messages Not Being Relayed

**Possible Causes**:
1. TTL expired (check that initial TTL is set to 10 in constants)
2. Duplicate detection blocking relay (restart all devices to clear cache)
3. BLE connection dropped (check connection status indicators)
4. Encryption key mismatch (verify trust between all peers)

**Solution**: Check relay logs for error messages, restart all devices, and verify peer connections.

### Peer Discovery Takes Too Long

**Solution**: The app scans every 5 seconds. Wait up to 15 seconds for all peers to be discovered. You can also implement a manual "Refresh" button to trigger immediate scanning.

## Video Upload and Documentation

### Recommended Video Format

- **Resolution**: 1080p or higher
- **Frame Rate**: 30fps minimum
- **Duration**: 2-5 minutes
- **Format**: MP4 (H.264 codec)
- **Audio**: Include narration explaining the demonstration (optional)

### Upload Locations

Upload the video to one of the following platforms:

1. **YouTube**: Create an unlisted video and add the link below
2. **Vimeo**: Upload and add the link below
3. **Cloud Storage**: Upload to Google Drive, Dropbox, or similar and add a public link below

### Video Link

Once recorded and uploaded, add the video link here:

**Demo Video URL**: [To be added after recording]

**Recording Date**: [To be added]

**Devices Used**:
- Device A: [Model and OS version]
- Device B: [Model and OS version]
- Device C: [Model and OS version]

**Test Environment**: [Indoor/Outdoor, distance between devices, any obstacles]

## Additional Notes

### Performance Metrics

During the demonstration, note the following metrics:

- **Peer Discovery Time**: Time from app launch to all peers discovered
- **Message Relay Latency**: Time from send on Device A to receipt on Device C
- **Connection Stability**: Any disconnections or reconnections during the test
- **Message Success Rate**: Number of messages successfully relayed vs. sent

### Future Enhancements

Based on the demonstration, consider documenting:

- Maximum relay distance achieved
- Maximum number of hops tested
- Battery consumption during relay operations
- Performance with multiple simultaneous messages
- Behavior with more than 3 devices in the mesh

## Acceptance Criteria

This task is complete when:

1. ✅ Video demonstrates 3-device mesh relay topology (A↔B↔C)
2. ✅ Video shows Device A and Device C are out of direct BLE range
3. ✅ Video shows message sent from Device A appearing on Device C
4. ✅ Video shows relay logs on Device B (if implemented)
5. ✅ Video is uploaded and link is added to this document
6. ✅ Video clearly demonstrates the mesh relay functionality

## Related Requirements

This demonstration validates the following requirements from the requirements document:

- **Requirement 6.1**: Message envelope received from peer node
- **Requirement 6.2**: Message forwarding when TTL > 0 and not duplicate
- **Requirement 6.3**: Duplicate detection prevents reprocessing
- **Requirement 6.4**: Relay operation completes within 500ms

---

**Status**: Pending video recording and upload

**Last Updated**: [To be added]
