export type MobileHost = {
  apiBaseUrl: string;
  fetch: typeof globalThis.fetch;
};
declare global {
  interface Window {
    ohoMobile?: MobileHost;
  }
}
export const mobileHost = window.ohoMobile;
