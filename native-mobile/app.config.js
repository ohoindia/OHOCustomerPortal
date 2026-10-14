const preview = process.env.APP_VARIANT !== "production";
module.exports = {
  expo: {
    name: preview ? "OHOINDIA Native Preview" : "OHOINDIA",
    slug: "oho-customer-native",
    scheme: preview ? "ohoindia-native" : "ohoindia",
    version: "1.1.7",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/oho-brand.png",
    android: {
      package: preview
        ? "com.ohoindia.connect.nativepreview"
        : "com.ohoindia.connect",
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/oho-brand.png",
        backgroundColor: "#ffffff",
      },
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        ? {
            config: {
              googleMaps: {
                apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
              },
            },
          }
        : {}),
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: preview
        ? "com.ohoindia.connect.nativepreview"
        : "com.ohoindia.connect",
    },
    web: { bundler: "metro", favicon: "./assets/oho-brand.png" },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      [
        "expo-splash-screen",
        {
          image: "./assets/oho-brand.png",
          imageWidth: 150,
          resizeMode: "contain",
          backgroundColor: "#0094C6",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow OHOINDIA to find nearby network hospitals.",
        },
      ],
    ],
  },
};
