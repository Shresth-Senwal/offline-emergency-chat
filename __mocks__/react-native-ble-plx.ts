/**
 * Mock implementation of react-native-ble-plx for Jest tests.
 * 
 * This mock provides a minimal implementation of the BLE library that can be used
 * in unit tests without requiring the native module.
 */

export enum State {
  Unknown = 'Unknown',
  Resetting = 'Resetting',
  Unsupported = 'Unsupported',
  Unauthorized = 'Unauthorized',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn',
}

export class BleError extends Error {
  errorCode: number;
  attErrorCode: number | null;
  iosErrorCode: number | null;
  androidErrorCode: number | null;
  reason: string | null;

  constructor(message: string, errorCode: number) {
    super(message);
    this.errorCode = errorCode;
    this.attErrorCode = null;
    this.iosErrorCode = null;
    this.androidErrorCode = null;
    this.reason = null;
  }
}

export class Device {
  id: string;
  name: string | null;
  rssi: number | null;
  mtu: number;
  manufacturerData: string | null;
  serviceData: { [key: string]: string } | null;
  serviceUUIDs: string[] | null;
  localName: string | null;
  txPowerLevel: number | null;
  solicitedServiceUUIDs: string[] | null;
  isConnectable: boolean | null;
  overflowServiceUUIDs: string[] | null;

  constructor(id: string, name: string | null) {
    this.id = id;
    this.name = name;
    this.rssi = -50;
    this.mtu = 512;
    this.manufacturerData = null;
    this.serviceData = null;
    this.serviceUUIDs = null;
    this.localName = name;
    this.txPowerLevel = null;
    this.solicitedServiceUUIDs = null;
    this.isConnectable = true;
    this.overflowServiceUUIDs = null;
  }

  connect = jest.fn();
  discoverAllServicesAndCharacteristics = jest.fn();
  isConnected = jest.fn();
  cancelConnection = jest.fn();
}

export class BleManager {
  state = jest.fn(async () => State.PoweredOn);
  onStateChange = jest.fn((callback: (state: State) => void) => {
    callback(State.PoweredOn);
    return { remove: jest.fn() };
  });
  startDeviceScan = jest.fn();
  stopDeviceScan = jest.fn();
  connectToDevice = jest.fn(async (deviceId: string) => new Device(deviceId, 'Mock Device'));
  cancelDeviceConnection = jest.fn();
  isDeviceConnected = jest.fn(async () => true);
  discoverAllServicesAndCharacteristicsForDevice = jest.fn();
  writeCharacteristicWithoutResponseForDevice = jest.fn();
  monitorCharacteristicForDevice = jest.fn(() => ({ remove: jest.fn() }));
  destroy = jest.fn();
}

export const BleErrorCode = {
  UnknownError: 0,
  BluetoothManagerDestroyed: 1,
  OperationCancelled: 2,
  OperationTimedOut: 3,
  OperationStartFailed: 4,
  InvalidIdentifiers: 5,
  BluetoothUnsupported: 100,
  BluetoothUnauthorized: 101,
  BluetoothPoweredOff: 102,
  BluetoothInUnknownState: 103,
  BluetoothResetting: 104,
  BluetoothStateChangeFailed: 105,
  DeviceConnectionFailed: 200,
  DeviceDisconnected: 201,
  DeviceRSSIReadFailed: 202,
  DeviceAlreadyConnected: 203,
  DeviceNotFound: 204,
  DeviceNotConnected: 205,
  DeviceMTUChangeFailed: 206,
  ServicesDiscoveryFailed: 300,
  IncludedServicesDiscoveryFailed: 301,
  ServiceNotFound: 302,
  ServicesNotDiscovered: 303,
  CharacteristicsDiscoveryFailed: 400,
  CharacteristicWriteFailed: 401,
  CharacteristicReadFailed: 402,
  CharacteristicNotifyChangeFailed: 403,
  CharacteristicNotFound: 404,
  CharacteristicsNotDiscovered: 405,
  CharacteristicInvalidDataFormat: 406,
  DescriptorsDiscoveryFailed: 500,
  DescriptorWriteFailed: 501,
  DescriptorReadFailed: 502,
  DescriptorNotFound: 503,
  DescriptorsNotDiscovered: 504,
  DescriptorInvalidDataFormat: 505,
  ScanStartFailed: 600,
  LocationServicesDisabled: 601,
};
