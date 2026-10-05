import { useEffect, useMemo, useRef } from "react";
import type { ClientViewProps } from "./ClientView";
import { clientBootstrap } from "../lib/client-bootstrap";
import { createClientHost } from "../lib/client-host";
const bundle: { html: string } = require("../generated/client.json");

export default function ClientView(props: ClientViewProps) {
  const bundledHtml = bundle.html;
  const ref = useRef<HTMLIFrameElement>(null);
  const html = useMemo(
    () =>
      bundledHtml.replace(
        "<!--OHO_BOOTSTRAP-->",
        `<script>${clientBootstrap({ ...props, native: false })}</script>`,
      ),
    [props, bundledHtml],
  );
  useEffect(() => {
    const host = createClientHost(props.apiBaseUrl, (value) =>
      ref.current?.contentWindow?.postMessage({ ohoReply: value }, "*"),
    );
    const receive = (event: MessageEvent) => {
      if (
        event.source !== ref.current?.contentWindow ||
        typeof event.data?.oho !== "string"
      )
        return;
      try {
        void host.receive(JSON.parse(event.data.oho));
      } catch {
        /* Ignore other messages. */
      }
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      host.dispose();
    };
  }, [props.apiBaseUrl]);
  return (
    <iframe
      ref={ref}
      srcDoc={html}
      title="OHOINDIA"
      style={{ flex: 1, width: "100%", height: "100%", border: 0 }}
    />
  );
}
