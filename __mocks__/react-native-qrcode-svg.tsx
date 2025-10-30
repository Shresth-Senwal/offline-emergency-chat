/**
 * Mock implementation of react-native-qrcode-svg for Jest tests.
 */

import React from 'react';
import { View } from 'react-native';

const QRCode = (props: any) => {
  return <View testID="qr-code" {...props} />;
};

export default QRCode;
