import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.praedictio.app',
  appName: 'Praedictio',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK', // or 'LIGHT' depending on your status bar icon color
    },
  },
};

export default config;
