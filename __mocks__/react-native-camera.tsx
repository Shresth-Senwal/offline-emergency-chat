/**
 * Mock implementation of react-native-camera for Jest tests.
 */

import React from 'react';
import { View } from 'react-native';

export const RNCamera = {
  Constants: {
    Type: {
      back: 'back',
      front: 'front',
    },
    FlashMode: {
      on: 'on',
      off: 'off',
      auto: 'auto',
      torch: 'torch',
    },
    BarCodeType: {
      qr: 'QR_CODE',
    },
  },
};

export class Camera extends React.Component {
  render() {
    return <View testID="camera" {...this.props} />;
  }
}
