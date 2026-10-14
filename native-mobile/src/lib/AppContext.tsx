import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getLocale,
  normalizeLocale,
  setLocale,
  subscribeLocale,
  type Locale,
} from "../../../common/content/locale";
import {
  clearSession,
  getSession,
  restoreSession,
  subscribeSession,
} from "./session";
import { validSession } from "./validation";
const AppContext = createContext({
  ready: false,
  languageChosen: false,
  chooseLanguage: async (_locale: Locale) => {},
});
export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [languageChosen, setLanguageChosen] = useState(false);
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    getSession,
  );
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      restoreSession(),
      AsyncStorage.getItem("language")
        .then((saved) => {
          if (mounted && saved) {
            setLocale(normalizeLocale(saved));
            setLanguageChosen(true);
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    function check() {
      if (!validSession(getSession())) {
        void clearSession();
        return;
      }
      timer = setTimeout(
        check,
        Math.min(
          Math.max(1, Date.parse(session!.expiresAt) - Date.now()),
          2147483647,
        ),
      );
    }
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        clearTimeout(timer);
        check();
      }
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [session]);
  async function chooseLanguage(locale: Locale) {
    await AsyncStorage.setItem("language", locale);
    setLocale(locale);
    setLanguageChosen(true);
  }
  return (
    <AppContext.Provider value={{ ready, languageChosen, chooseLanguage }}>
      {children}
    </AppContext.Provider>
  );
}
export const useApp = () => useContext(AppContext);
export const useSession = () =>
  useSyncExternalStore(subscribeSession, getSession, getSession);
export const useLocale = () =>
  useSyncExternalStore(subscribeLocale, getLocale, getLocale);
