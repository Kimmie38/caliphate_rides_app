import type { ExpoConfig } from "expo/config";

// Brand colours used by the native splash screen (before JavaScript loads).
// Keep them in sync with src/theme/tokens.ts.
const GREEN = "#00874F";
const NIGHT = "#0D1813";

const LOCATION_WHY = "Caliphate Rides uses your location to set your pickup point, show drivers near you, and, when you drive, send you nearby ride requests.";
const CAMERA_WHY = "Caliphate Rides uses the camera when you sign up to drive, to photograph your licence, vehicle papers and profile photo.";
const PHOTOS_WHY = "Caliphate Rides lets drivers choose photos of their licence and vehicle papers.";

const config: ExpoConfig = {
  name: "Caliphate Rides",
  slug: "caliphate-rides",
  scheme: "caliphaterides",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "ng.caliphaterides.app",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_WHY,
      NSCameraUsageDescription: CAMERA_WHY,
      NSPhotoLibraryUsageDescription: PHOTOS_WHY,
      // Only standard HTTPS: answers Apple's export-compliance question so TestFlight builds aren't held up.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "ng.caliphaterides.app",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: GREEN },
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "CAMERA"],
  },
  web: { favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        // The native splash is a plain colour field; the knot draws itself in JS (src/components/AnimatedSplash.tsx).
        image: "./assets/splash-blank.png",
        imageWidth: 120,
        backgroundColor: GREEN,
        dark: { image: "./assets/splash-blank.png", backgroundColor: NIGHT },
      },
    ],
    ["expo-location", { locationWhenInUsePermission: LOCATION_WHY }],
    // Sign-in codes arrive as a notification from the app itself (no SMS, no push server).
    // Android draws this white silhouette of our castle in the status bar and the notification header,
    // tinted green. (Without it, Android shows a plain white square.)
    // enableRemoteNotifications false: the app only shows notifications it makes itself (no push server),
    // so the iPhone build needs no Apple push setup. Turn it on if we add server push later.
    // Finds our servers even when a mobile network's DNS can't look up .ng addresses.
    ["./plugins/withReliableDns", { domains: ["caliphaterides.com.ng"], serverAddresses: ["161.97.151.166"] }],
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: GREEN, defaultChannel: "sign-in-codes", enableRemoteNotifications: false }],
    ["expo-image-picker", { cameraPermission: CAMERA_WHY, photosPermission: PHOTOS_WHY }],
    // Our own map: MapLibre draws OpenStreetMap data in our style (src/map/style.ts). No Google key needed.
    "@maplibre/maplibre-react-native",
    [
      "expo-build-properties",
      {
        android: {
          // Real Android phones are ARM. Leaving out the x86 emulator builds roughly halves the app.
          // (To run on an x86 Android emulator, add "x86_64" back.)
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          // Release builds: strip unused code and resources.
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Store native libraries compressed inside the APK (smaller download).
          useLegacyPackaging: true,
        },
      },
    ],
  ],
  experiments: { typedRoutes: false },
};

export default config;
