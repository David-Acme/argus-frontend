import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_SERVICES_ENV = 'ARGUS_GOOGLE_SERVICES_FILE';

function googleServicesFile(): string | undefined {
  const file = process.env[GOOGLE_SERVICES_ENV]?.trim();
  if (file) return file;
  process.emitWarning(
    `${GOOGLE_SERVICES_ENV} is not set: this Android build has no Firebase configuration, so push (FCM) is off.`,
    { code: 'ARGUS_PUSH_OFF' },
  );
  return undefined;
}

export default (_context: ConfigContext): ExpoConfig => {
  const firebaseFile = googleServicesFile();
  return {
    name: 'Argus',
    slug: 'argus',
    version: '1.0.0',
    orientation: 'default',
    icon: './src/assets/images/icon.png',
    scheme: 'argus',
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.davidacme.argus',
      infoPlist: {
        UIBackgroundModes: ['audio'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './src/assets/images/adaptive-icon.png',
        backgroundColor: '#F4F1ED',
      },
      package: 'com.davidacme.argus',
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.WAKE_LOCK',
        'android.permission.BLUETOOTH_CONNECT',
      ],
      ...(firebaseFile ? { googleServicesFile: firebaseFile } : {}),
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './src/assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './src/assets/images/splash.png',
          backgroundColor: '#F4F1ED',
          dark: {
            backgroundColor: '#181816',
          },
        },
      ],
      'expo-localization',
      [
        'expo-audio',
        {
          microphonePermission: 'Argus usa el micrófono solo durante tus llamadas con Argus.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Argus necesita acceso a la cámara para vincular tu dispositivo con tu servidor.',
        },
      ],
      [
        'react-native-edge-to-edge',
        {
          android: {
            parentTheme: 'Default',
            enforceNavigationBarContrast: false,
          },
        },
      ],
      'expo-secure-store',
      'expo-asset',
      [
        'expo-screen-orientation',
        {
          initialOrientation: 'DEFAULT',
        },
      ],
      [
        '@livekit/react-native-expo-plugin',
        {
          android: {
            audioType: 'communication',
          },
        },
      ],
      'expo-background-task',
      [
        'expo-notifications',
        {
          color: '#F4F1ED',
          enableBackgroundRemoteNotifications: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
