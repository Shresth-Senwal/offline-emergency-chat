# 3-Device Mesh Relay Demonstration Setup Guide

## Quick Start Checklist

Before starting the demonstration, ensure you have:

- [ ] 3 devices with the app installed (iOS, Android, or mixed)
- [ ] Bluetooth enabled on all devices
- [ ] Location permissions granted (Android)
- [ ] Large space (20+ meters) for device positioning
- [ ] Video recording equipment ready
- [ ] All devices fully charged

## Device Preparation

### iOS Devices

1. **Install the App**
   ```bash
   cd OfflineEmergencyChat
   npm install
   cd ios
   pod install
   cd ..
   npx react-native run-ios --device
   ```

2. **Enable Bluetooth**
   - Settings → Bluetooth → ON

3. **Grant Permissions**
   - When prompted, allow Bluetooth access
   - The app will request permission on first launch

### Android Devices

1. **Install the App**
   ```bash
   cd OfflineEmergencyChat
   npm install
   npx react-native run-android
   ```

2. **Enable Bluetooth**
   - Settings → Connected devices → Connection preferences → Bluetooth → ON

3. **Grant Permissions**
   - When prompted, allow:
     - Bluetooth access
     - Location access (required for BLE scanning on Android)
     - Nearby devices (Android 12+)

4. **Enable Developer Options** (if not already enabled)
   - Settings → About phone → Tap "Build number" 7 times
   - Settings → System → Developer options → USB debugging → ON

## Physical Setup

### Recommended Layout

```
Device A (Sender)                Device B (Relay)                Device C (Recipient)
    📱                                📱                                📱
    |                                 |                                 |
    |<-------- 10-15m -------->|<-------- 10-15m -------->|
    |                                 |                                 |
    |                                 |                                 |
    X (Cannot see Device C)           X (Can see both)                  X (Cannot see Device A)
```

### Step-by-Step Positioning

1. **Place Device B (Relay Node) First**
   - Position in the center of your test area
   - This will be the relay node
   - Keep this device accessible for viewing relay logs

2. **Place Device A (Sender)**
   - Position 10-15 meters from Device B
   - Ensure clear line of sight to Device B
   - This will be the message sender

3. **Place Device C (Recipient)**
   - Position 10-15 meters from Device B in the opposite direction
   - Ensure clear line of sight to Device B
   - Ensure NO line of sight to Device A (use walls/obstacles if needed)

4. **Verify Isolation**
   - Launch app on Device A and Device C
   - Wait 15 seconds for peer discovery
   - Verify they CANNOT see each other in peer lists
   - If they can see each other, increase distance or add obstacles

## App Configuration for Demo

### Enable Relay Logging

The app includes built-in relay logging accessible via the floating 📊 button in the bottom-right corner.

**To view relay logs:**
1. Tap the 📊 button on any device
2. The relay log viewer will open showing all relay events
3. Keep this open on Device B during the demonstration

### Console Logging

For more detailed logs, connect devices to your development machine:

**iOS:**
```bash
# In Xcode
Window → Devices and Simulators → Select device → Open Console
# Filter for: RELAY
```

**Android:**
```bash
adb logcat | grep RELAY
```

## Demonstration Script

### Phase 1: Show Initial State (30 seconds)

1. **Record all three devices simultaneously**
   - Show Device A peer list (should show only Device B)
   - Show Device B peer list (should show Device A and Device C)
   - Show Device C peer list (should show only Device B)

2. **Narration:**
   > "We have three devices positioned in a line. Device A and Device C are out of direct Bluetooth range and cannot see each other. Device B is in the middle and can see both devices."

### Phase 2: Open Relay Logs on Device B (10 seconds)

1. **On Device B, tap the 📊 button**
   - Show the relay log viewer
   - Point out that it's currently empty

2. **Narration:**
   > "On Device B, we've opened the relay log viewer. This will show us when messages are relayed through this device."

### Phase 3: Send Message from A to C (30 seconds)

1. **On Device A:**
   - Tap on Device C in the peer list
   - Type message: "Emergency: This message is being relayed through Device B"
   - Tap Send
   - Show message appearing with "sent" status

2. **Switch to Device B:**
   - Show relay log entry appearing
   - Point out the message ID, TTL value, and timestamp

3. **Switch to Device C:**
   - Show message appearing in conversation view
   - Verify message text matches

4. **Narration:**
   > "Device A sends a message to Device C. Watch as it appears in Device B's relay logs, and then arrives at Device C, even though these devices cannot communicate directly."

### Phase 4: Send Reply from C to A (30 seconds)

1. **On Device C:**
   - Type reply: "Received your message. Help is on the way."
   - Tap Send

2. **Switch to Device B:**
   - Show new relay log entry

3. **Switch to Device A:**
   - Show reply appearing

4. **Narration:**
   > "Device C can reply back to Device A, with the message again being relayed through Device B. This demonstrates bidirectional mesh communication."

### Phase 5: Show Relay Statistics (15 seconds)

1. **On Device B, show relay log viewer:**
   - Point out total relay count
   - Show successful relay count
   - Highlight the TTL values

2. **Narration:**
   > "Device B has successfully relayed [X] messages between Device A and Device C, demonstrating the mesh relay functionality."

## Troubleshooting During Demo

### Problem: Devices Can See Each Other Directly

**Solution:**
- Increase distance between Device A and Device C
- Add physical obstacles (walls, furniture)
- Move to a different location with more space

### Problem: Device B Cannot See Both Devices

**Solution:**
- Adjust Device B's position
- Ensure Device B is within 10 meters of both other devices
- Check that Bluetooth is enabled on all devices

### Problem: Messages Not Being Relayed

**Check:**
1. Relay logs on Device B - are messages being received?
2. Connection status - are all devices showing "connected"?
3. TTL value - should be 10 initially, decremented on each hop
4. Duplicate detection - restart all devices to clear cache

**Quick Fix:**
- Restart all three devices
- Clear app data (Settings → Apps → Offline Emergency Chat → Clear Data)
- Reposition devices

### Problem: Relay Logs Not Showing

**Solution:**
- Check console logs instead (see "Console Logging" section above)
- Verify relay is actually happening by checking message delivery
- Restart Device B

## Recording Tips

### Camera Setup

1. **Wide Angle Shot:**
   - Use a wide-angle camera or step back to capture all three screens
   - Ensure all screens are clearly visible and in focus

2. **Multi-Camera Setup:**
   - Use 3 cameras (or phones) to record each device individually
   - Combine videos in post-production using video editing software

3. **Screen Recording:**
   - Use built-in screen recording on each device
   - iOS: Control Center → Screen Recording
   - Android: Quick Settings → Screen Recorder
   - Sync videos in post-production using audio cues or timestamps

### Lighting

- Ensure good lighting on all device screens
- Avoid glare and reflections
- Use indoor lighting for consistent brightness

### Audio

- Record clear narration explaining what's happening
- Use a external microphone if possible
- Minimize background noise

### Video Editing

Recommended software:
- **iMovie** (Mac/iOS) - Free, easy to use
- **DaVinci Resolve** (Windows/Mac/Linux) - Free, professional
- **Adobe Premiere Pro** (Windows/Mac) - Professional, paid

Editing steps:
1. Import all video clips
2. Sync clips using timestamps or audio cues
3. Create split-screen layout showing all three devices
4. Add text overlays for device labels (Device A, Device B, Device C)
5. Add arrows or highlights to show message flow
6. Add narration or captions explaining the demonstration
7. Export as MP4 (1080p, 30fps)

## Post-Recording

### Video Upload

1. **YouTube** (Recommended)
   - Create unlisted video
   - Title: "Offline Emergency Mesh Chat - 3-Device Relay Demonstration"
   - Description: Include device models, OS versions, test environment
   - Add link to DEMO_VIDEO.md

2. **Vimeo**
   - Upload video
   - Set privacy to "Anyone with the link"
   - Add link to DEMO_VIDEO.md

3. **Cloud Storage**
   - Upload to Google Drive, Dropbox, or OneDrive
   - Set sharing to "Anyone with the link"
   - Add link to DEMO_VIDEO.md

### Documentation

Update DEMO_VIDEO.md with:
- Video URL
- Recording date
- Device models and OS versions
- Test environment details
- Any notable observations or issues

## Verification Checklist

After recording, verify the video shows:

- [ ] All three device screens are clearly visible
- [ ] Device A and Device C peer lists show they cannot see each other
- [ ] Device B peer list shows both Device A and Device C
- [ ] Message sent from Device A appears on Device C
- [ ] Relay logs on Device B show the relay event
- [ ] Reply from Device C appears on Device A
- [ ] Relay logs show bidirectional relay
- [ ] Narration or captions explain what's happening
- [ ] Video quality is good (1080p minimum)
- [ ] Audio is clear (if narration included)

## Example Narration Script

```
[0:00-0:15] Introduction
"This is a demonstration of the Offline Emergency Mesh Chat application's 
mesh relay functionality. We have three devices positioned in a line, with 
Device A and Device C out of direct Bluetooth range."

[0:15-0:30] Show Device Positions
"Device A is here [show], Device B is in the middle [show], and Device C 
is here [show]. Device A and Device C are approximately 20 meters apart 
and cannot communicate directly."

[0:30-0:45] Show Peer Lists
"Looking at the peer lists, Device A can only see Device B. Device C can 
also only see Device B. But Device B can see both Device A and Device C."

[0:45-1:00] Open Relay Logs
"On Device B, we've opened the relay log viewer. This will show us when 
messages are relayed through this device."

[1:00-1:30] Send Message A to C
"Now, Device A will send a message to Device C. Watch as the message 
appears in Device B's relay logs, and then arrives at Device C."

[1:30-2:00] Send Reply C to A
"Device C can reply back to Device A. Again, the message is relayed 
through Device B, demonstrating bidirectional mesh communication."

[2:00-2:15] Show Statistics
"Device B has successfully relayed multiple messages between Device A 
and Device C, proving that the mesh relay functionality works as designed."

[2:15-2:30] Conclusion
"This demonstrates that the Offline Emergency Mesh Chat application can 
extend communication range beyond direct Bluetooth connectivity using 
multi-hop mesh relaying."
```

## Technical Details for Documentation

Include these details in DEMO_VIDEO.md:

### Device Information
- **Device A**: [Model], [OS Version], [Bluetooth Version]
- **Device B**: [Model], [OS Version], [Bluetooth Version]
- **Device C**: [Model], [OS Version], [Bluetooth Version]

### Test Environment
- **Location**: [Indoor/Outdoor]
- **Distance A-B**: [X meters]
- **Distance B-C**: [X meters]
- **Distance A-C**: [X meters]
- **Obstacles**: [Walls, furniture, etc.]
- **Date**: [YYYY-MM-DD]
- **Time**: [HH:MM]

### Performance Metrics
- **Peer Discovery Time**: [X seconds]
- **Message Relay Latency**: [X milliseconds]
- **Success Rate**: [X/X messages delivered]
- **Connection Stability**: [Stable/Unstable, any disconnections]

### Observations
- Any issues encountered
- Workarounds applied
- Notable behaviors
- Suggestions for improvement

## Support

If you encounter issues during the demonstration:

1. **Check the troubleshooting section above**
2. **Review the logs** (console or relay log viewer)
3. **Restart devices** and try again
4. **Adjust positioning** if connectivity issues persist
5. **Document any issues** for future reference

## Success Criteria

The demonstration is successful when:

✅ Video clearly shows 3-device mesh topology (A↔B↔C, not A↔C)
✅ Message sent from Device A appears on Device C
✅ Relay logs on Device B show the relay event
✅ Reply from Device C appears on Device A
✅ Video quality is good and all screens are visible
✅ Narration or captions explain the demonstration
✅ Video is uploaded and linked in DEMO_VIDEO.md

---

**Good luck with your demonstration!** 🎥📱📡
