// import messaging from '@react-native-firebase/messaging';
// import { Platform } from 'react-native';

// /**
//  * Request notification permission and return an FCM token.
//  * Returns undefined if permission denied or token fetch fails.
//  */
// export async function getFcmToken(): Promise<string | undefined> {
//   try {
//     // iOS / Android 13+ permission prompt
//     const authStatus = await messaging().requestPermission();
//     const enabled =
//       authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//       authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//     if (!enabled) {
//       console.warn('[FCM] Permission not granted');
//       return undefined;
//     }

//     // Android: ensure registration
//     if (Platform.OS === 'android') {
//       await messaging().registerDeviceForRemoteMessages();
//     }

//     const token = await messaging().getToken();
//     if (!token) {
//       console.warn('[FCM] No token returned');
//       return undefined;
//     }

//     return token;
//   } catch (err) {
//     console.warn('[FCM] Failed to get token', err);
//     return undefined;
//   }
// }

