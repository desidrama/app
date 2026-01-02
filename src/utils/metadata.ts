import { Platform, Dimensions, PixelRatio } from 'react-native';
import * as Application from 'expo-application';

// Comprehensive metadata collector (best effort, permission-light)
export async function collectClientMetadata() {
  const { width, height } = Dimensions.get('window');
  const scale = PixelRatio.get();

  // App info
  const appVersion = Application.nativeApplicationVersion || undefined;
  const buildNumber = Application.nativeBuildVersion || undefined;

  // Device info
  const deviceModel = undefined; // not available without expo-device
  const deviceType = Platform.OS === 'ios' || Platform.OS === 'android' ? 'mobile' : 'unknown';

  // Network info
  const networkType = undefined;
  const carrier = undefined;

  const battery = undefined;

  // Locale/timezone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    platform: Platform.OS,
    platformVersion: String(Platform.Version ?? ''),
    app: 'mobile',
    appVersion,
    buildNumber,
    deviceModel,
    deviceType,
    screen: {
      width,
      height,
      scale,
      dpi: scale * 160,
    },
    networkType,
    carrier,
    locale,
    timezone,
    battery,
  };
}

