import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, BackHandler, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { clientBootstrap } from "../lib/client-bootstrap";
import { createClientHost } from "../lib/client-host";
import type { ClientMessage } from "../lib/client-host";
import { Button, Copy, Page } from "./ui";

export type ClientViewProps = {
  apiBaseUrl: string;
  session: Record<string, string>;
  local: Record<string, string>;
  route: string;
  onRestart: (route: string) => void;
};
const bundle: { html: string } = require("../generated/client.json");

export default function ClientView(props: ClientViewProps) {
  const ref = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [failed, setFailed] = useState(false);
  const currentRoute = useRef(props.route);
  const host = useRef<ReturnType<typeof createClientHost> | null>(null);
  const { apiBaseUrl, session, local, route } = props;
  async function restart() {
    await host.current?.flush();
    props.onRestart(currentRoute.current);
  }
  const source = useMemo(
    () => ({
      html: bundle.html.replace(
        "<!--OHO_BOOTSTRAP-->",
        `<script>${clientBootstrap({ apiBaseUrl, session, local, route, native: true })}</script>`,
      ),
      baseUrl: "https://oho-mobile.invalid/",
    }),
    [apiBaseUrl, session, local, route],
  );

  useEffect(() => {
    const clientHost = createClientHost(apiBaseUrl, (value) => {
      ref.current?.injectJavaScript(
        `window.ohoReceive(${JSON.stringify(value).replace(/</g, "\\u003c")}); true;`,
      );
    });
    host.current = clientHost;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack.current) return false;
      ref.current?.injectJavaScript("history.back(); true;");
      return true;
    });
    const active = AppState.addEventListener("change", (state) => {
      if (state === "active")
        ref.current?.injectJavaScript(
          "window.dispatchEvent(new Event('oho-resume')); true;",
        );
    });
    return () => {
      back.remove();
      active.remove();
      clientHost.dispose();
      host.current = null;
    };
  }, [apiBaseUrl]);
  if (failed)
    return (
      <Page title="Unable to load the app" back={false}>
        <Copy>Please reopen the app or try again.</Copy>
        <Button title="Try again" onPress={() => void restart()} />
      </Page>
    );
  return (
    <WebView
      ref={ref}
      style={styles.view}
      source={source}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data) as ClientMessage;
          if (message.type === "navigation") {
            canGoBack.current = Boolean(message.canGoBack);
            if (typeof message.route === "string")
              currentRoute.current = message.route;
          } else void host.current?.receive(message);
        } catch {
          /* Ignore non-bridge messages. */
        }
      }}
      onShouldStartLoadWithRequest={(request) => {
        if (
          request.url === "about:blank" ||
          request.url.startsWith("https://oho-mobile.invalid/")
        )
          return true;
        void host.current?.receive({ type: "external", url: request.url });
        return false;
      }}
      onError={() => setFailed(true)}
      onContentProcessDidTerminate={() => void restart()}
      onRenderProcessGone={() => setFailed(true)}
    />
  );
}
const styles = StyleSheet.create({
  view: { flex: 1, backgroundColor: "#fff" },
});
