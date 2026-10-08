module.exports = ({ config }) => ({
  ...config,
  name: process.env.APP_VARIANT === "preview" ? `${config.name} Preview` : config.name,
  scheme: process.env.APP_VARIANT === "preview" ? "ohoindia-preview" : config.scheme,
  android: {
    ...config.android,
    package: process.env.APP_VARIANT === "preview"
      ? "com.ohoindia.connect.preview"
      : config.android.package,
  },
  plugins: [
    ...(config.plugins || []),
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
  ],
});
