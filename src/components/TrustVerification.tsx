/**
 * TrustVerification Component - QR code fingerprint display and scanning
 *
 * This component provides trust verification functionality through QR code
 * fingerprint exchange. It enables users to verify peer identities by:
 * - Displaying their own public key fingerprint as a QR code
 * - Scanning a peer's QR code to verify their identity
 * - Comparing scanned fingerprints with stored public keys
 * - Updating peer verification status on successful match
 *
 * Trust verification prevents man-in-the-middle attacks by allowing users
 * to confirm peer identities through an out-of-band channel (visual QR code).
 *
 * Requirements addressed:
 * - 3.1: Compute SHA-256 hash of peer's public key
 * - 3.2: Display fingerprint as QR code
 * - 3.3: Scan peer's QR code
 * - 3.4: Compare scanned fingerprint with stored public key hash
 * - 3.5: Mark peer as verified and display visual indicator
 *
 * Architecture:
 * - Two modes: "Show My QR Code" and "Scan Peer QR Code"
 * - Uses react-native-qrcode-svg for QR code generation
 * - Uses react-native-camera for QR code scanning
 * - Integrates with CryptoService for fingerprint generation and verification
 * - Updates AppContext and StorageService on successful verification
 *
 * Dependencies:
 * - react-native-qrcode-svg: QR code generation
 * - react-native-camera: Camera and QR code scanning
 * - AppContext: Access to peers, crypto service, storage service
 * - CryptoService: Fingerprint generation and verification
 * - StorageService: Persist verification status
 *
 * Usage:
 * ```typescript
 * <TrustVerification
 *   visible={showVerification}
 *   peerId={selectedPeerId}
 *   onClose={() => setShowVerification(false)}
 * />
 * ```
 *
 * @module TrustVerification
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useAppState } from '../context/AppContext';

/**
 * Props for TrustVerification component.
 */
interface TrustVerificationProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** ID of the peer to verify (null for showing own QR code) */
  peerId: string | null;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Verification mode type.
 * - 'show': Display user's own QR code for peer to scan
 * - 'scan': Scan peer's QR code to verify their identity
 */
type VerificationMode = 'show' | 'scan';

/**
 * TrustVerification component - Modal for QR code fingerprint verification.
 *
 * Features:
 * - Toggle between "Show My QR Code" and "Scan Peer QR Code" modes
 * - Generate QR code from user's public key fingerprint
 * - Scan QR codes using device camera
 * - Verify scanned fingerprint matches peer's public key
 * - Display success/failure messages with visual indicators
 * - Update peer verification status in AppContext and storage
 * - Persist verification status across app restarts
 *
 * @param props - Component props
 * @returns React component
 */
export const TrustVerification: React.FC<TrustVerificationProps> = ({
  visible,
  peerId,
  onClose,
}) => {
  const {
    peers,
    ownPublicKey,
    cryptoService,
    storageService,
    updatePeer,
  } = useAppState();

  // Local state
  const [mode, setMode] = useState<VerificationMode>('show');
  const [scanning, setScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState<
    'success' | 'failure' | null
  >(null);

  /**
   * Get the current peer object.
   * Returns null if no peer is selected or peer not found.
   */
  const currentPeer = peerId ? peers.get(peerId) : null;

  /**
   * Generate fingerprint for user's own public key.
   * Returns null if crypto service not initialized or no public key.
   */
  const ownFingerprint = React.useMemo(() => {
    if (!cryptoService || !ownPublicKey) {
      return null;
    }
    try {
      return cryptoService.generateTrustFingerprint(ownPublicKey);
    } catch (error) {
      console.error('[TrustVerification] Failed to generate own fingerprint:', error);
      return null;
    }
  }, [cryptoService, ownPublicKey]);

  /**
   * Handle QR code scan event.
   *
   * Called when camera detects a QR code. Extracts the fingerprint,
   * verifies it against the peer's public key, and updates verification status.
   *
   * @param event - Barcode scan event from RNCamera
   */
  const handleBarCodeRead = useCallback(
    async (event: { data: string; type: string }) => {
      // Prevent multiple scans
      if (scanning || !currentPeer || !cryptoService || !storageService) {
        return;
      }

      // Only process QR codes
      if (event.type !== BarCodeScanner.Constants.BarCodeType.qr) {
        return;
      }

      setScanning(true);

      try {
        const scannedFingerprint = event.data.trim();

        // Validate fingerprint format (32 hex characters)
        if (!/^[0-9a-fA-F]{32}$/.test(scannedFingerprint)) {
          Alert.alert(
            'Invalid QR Code',
            'The scanned QR code does not contain a valid fingerprint.',
          );
          setScanning(false);
          return;
        }

        // Check if peer has public key
        if (!currentPeer.publicKey) {
          Alert.alert(
            'Peer Not Ready',
            'Key exchange with this peer has not completed yet. Please wait and try again.',
          );
          setScanning(false);
          return;
        }

        // Verify fingerprint matches peer's public key
        const isVerified = cryptoService.verifyFingerprint(
          scannedFingerprint,
          currentPeer.publicKey,
        );

        if (isVerified) {
          // Verification success
          setVerificationResult('success');

          // Update peer verification status in AppContext
          updatePeer(currentPeer.id, { verified: true });

          // Persist verification status to storage
          await storageService.storeTrustedPeer(currentPeer.id, true);

          console.log('[TrustVerification] Peer verified successfully:', currentPeer.id);

          // Show success message
          setTimeout(() => {
            Alert.alert(
              'Verification Successful',
              `${currentPeer.name} has been verified. You can now communicate securely.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setVerificationResult(null);
                    onClose();
                  },
                },
              ],
            );
          }, 500);
        } else {
          // Verification failure
          setVerificationResult('failure');

          console.warn('[TrustVerification] Fingerprint mismatch for peer:', currentPeer.id);

          // Show failure warning
          setTimeout(() => {
            Alert.alert(
              'Verification Failed',
              'The fingerprint does not match. This could indicate a man-in-the-middle attack. Do not communicate with this peer.',
              [
                {
                  text: 'OK',
                  style: 'destructive',
                  onPress: () => {
                    setVerificationResult(null);
                    setScanning(false);
                  },
                },
              ],
            );
          }, 500);
        }
      } catch (error) {
        console.error('[TrustVerification] Verification error:', error);
        Alert.alert(
          'Verification Error',
          'An error occurred during verification. Please try again.',
        );
        setScanning(false);
      }
    },
    [scanning, currentPeer, cryptoService, storageService, updatePeer, onClose],
  );

  /**
   * Handle mode switch between show and scan.
   *
   * @param newMode - New verification mode
   */
  const handleModeSwitch = (newMode: VerificationMode) => {
    setMode(newMode);
    setScanning(false);
    setVerificationResult(null);
  };

  /**
   * Handle modal close.
   * Resets state and calls onClose callback.
   */
  const handleClose = () => {
    setMode('show');
    setScanning(false);
    setVerificationResult(null);
    onClose();
  };

  /**
   * Render "Show My QR Code" mode.
   * Displays user's public key fingerprint as a QR code.
   */
  const renderShowMode = () => {
    if (!ownFingerprint) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to generate fingerprint. Please try again.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.showContainer}>
        <Text style={styles.instructionText}>
          Show this QR code to your peer so they can verify your identity.
        </Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <QRCode
            value={ownFingerprint}
            size={250}
            backgroundColor="white"
            color="black"
          />
        </View>

        {/* Fingerprint text */}
        <View style={styles.fingerprintContainer}>
          <Text style={styles.fingerprintLabel}>Your Fingerprint:</Text>
          <Text style={styles.fingerprintText}>{ownFingerprint}</Text>
        </View>

        <Text style={styles.helpText}>
          Your peer should scan this code to verify your identity.
        </Text>
      </View>
    );
  };

  /**
   * Render "Scan Peer QR Code" mode.
   * Displays camera view for scanning peer's QR code.
   */
  const renderScanMode = () => {
    if (!currentPeer) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No peer selected. Please select a peer to verify.
          </Text>
        </View>
      );
    }

    if (!currentPeer.publicKey) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Key exchange with {currentPeer.name} has not completed yet.
          </Text>
          <Text style={styles.errorSubtext}>
            Please wait for the connection to establish and try again.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.scanContainer}>
        <Text style={styles.instructionText}>
          Scan {currentPeer.name}'s QR code to verify their identity.
        </Text>

        {/* Camera view */}
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={Camera.Constants.Type.back}
            onBarCodeScanned={handleBarCodeRead}
            barCodeScannerSettings={{
              barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
            }}
          >
            {/* Scanning overlay */}
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              {verificationResult === 'success' && (
                <View style={styles.resultOverlay}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successText}>Verified!</Text>
                </View>
              )}
              {verificationResult === 'failure' && (
                <View style={styles.resultOverlay}>
                  <Text style={styles.failureIcon}>✗</Text>
                  <Text style={styles.failureText}>Verification Failed</Text>
                </View>
              )}
            </View>
          </Camera>
        </View>

        <Text style={styles.helpText}>
          Position the QR code within the frame to scan.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trust Verification</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'show' && styles.modeButtonActive,
            ]}
            onPress={() => handleModeSwitch('show')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'show' && styles.modeButtonTextActive,
              ]}
            >
              Show My QR Code
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'scan' && styles.modeButtonActive,
            ]}
            onPress={() => handleModeSwitch('scan')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'scan' && styles.modeButtonTextActive,
              ]}
            >
              Scan Peer QR Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {mode === 'show' ? renderShowMode() : renderScanMode()}
        </View>
      </View>
    </Modal>
  );
};

/**
 * Styles for TrustVerification component.
 *
 * Design principles:
 * - Clear visual hierarchy with prominent QR codes
 * - High contrast for emergency visibility
 * - Large touch targets for mode switching
 * - Centered layout for QR code display
 * - Full-screen camera view for scanning
 * - Clear success/failure indicators
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  showContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  scanContainer: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fingerprintContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  fingerprintLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  fingerprintText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
    letterSpacing: 1,
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 80,
    color: '#34C759',
    marginBottom: 16,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
  failureIcon: {
    fontSize: 80,
    color: '#FF3B30',
    marginBottom: 16,
  },
  failureText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
