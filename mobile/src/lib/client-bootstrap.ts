type Bootstrap = {
  apiBaseUrl: string;
  session: Record<string, string>;
  local: Record<string, string>;
  route: string;
  native: boolean;
};

// Embedded before React runs; this works reliably on both Android and iOS.
export function clientBootstrap(options: Bootstrap) {
  const config = JSON.stringify(options).replace(/</g, "\\u003c");
  return `(() => {
    const config = ${config};
    // The native SafeAreaView already reserves space for system navigation.
    // Avoid reserving that same bottom inset again inside the document.
    if (config.native) {
      const style = document.createElement('style');
      style.textContent = '.bottom-nav { height: 56px; padding-bottom: 0; } .phone-content { padding-bottom: 72px; }';
      document.head.appendChild(style);
    }
    const send = value => {
      const message = JSON.stringify(value);
      if (config.native) window.ReactNativeWebView.postMessage(message);
      else window.parent.postMessage({ oho: message }, '*');
    };
    const memoryStorage = initial => {
      const values = { ...initial };
      return {
        get length() { return Object.keys(values).length; },
        key: index => Object.keys(values)[index] ?? null,
        getItem: key => values[key] ?? null,
        setItem: (key, value) => { values[key] = String(value); },
        removeItem: key => { delete values[key]; },
        clear: () => { for (const key of Object.keys(values)) delete values[key]; },
      };
    };
    // Opaque local/iframe origins may deny browser storage. Use a storage adapter
    // on devices so credentials never enter the WebView's disk storage.
    {
      Object.defineProperty(window, 'sessionStorage', { value: memoryStorage({}), configurable: true });
      Object.defineProperty(window, 'localStorage', { value: memoryStorage({}), configurable: true });
    }
    sessionStorage.clear();
    for (const [key, value] of Object.entries(config.session)) sessionStorage.setItem(key, value);
    for (const [key, value] of Object.entries(config.local)) localStorage.setItem(key, value);
    const snapshot = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => {
      const key = storage.key(i); return [key, storage.getItem(key)];
    }));
    window.addEventListener('auth-session-changed', () => send({ type: 'session', value: snapshot(sessionStorage) }));
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = localStorage[method].bind(localStorage);
      localStorage[method] = (...args) => { original(...args); send({ type: 'local', value: snapshot(localStorage) }); };
    }
    let sequence = 0;
    const pending = new Map();
    const call = (type, value, signal) => new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
      const id = ++sequence;
      const cancel = () => {
        clearTimeout(timer); pending.delete(id); send({ type: 'cancel', id });
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const timer = setTimeout(() => {
        pending.delete(id); signal?.removeEventListener('abort', cancel);
        send({ type: 'cancel', id }); reject(new Error('Request timed out. Please try again.'));
      }, 45000);
      pending.set(id, { resolve, reject, cleanup: () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); } });
      signal?.addEventListener('abort', cancel, { once: true });
      send({ type, id, ...value });
    });
    window.ohoReceive = message => {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id); task.cleanup();
      if (message.error) task.reject(new Error(message.error));
      else task.resolve(message.value);
    };
    window.addEventListener('message', event => {
      if (!config.native && event.source === window.parent && event.data?.ohoReply) window.ohoReceive(event.data.ohoReply);
    });
    window.ohoMobile = {
      apiBaseUrl: config.apiBaseUrl,
      fetch: async (url, init = {}) => {
        const result = await call('fetch', { url: String(url), method: init.method || 'GET', headers: init.headers, body: init.body }, init.signal);
        return new Response(result.body, { status: result.status, headers: result.headers });
      },
    };
    if (config.native) Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: (success, failure) => call('location', {}).then(success).catch(error => failure?.({ code: 2, message: error.message })),
    } });
    document.addEventListener('click', event => {
      const anchor = event.target.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (/^(https?:|tel:|mailto:)/i.test(href)) {
        event.preventDefault(); send({ type: 'external', url: anchor.href });
      }
    });
    if (config.route !== '/') window.location.hash = '#' + config.route;
    const navigation = () => {
      window.scrollTo(0, 0);
      send({ type: 'navigation', canGoBack: (history.state?.idx || 0) > 0, route: location.hash.slice(1) || '/' });
    };
    for (const name of ['pushState', 'replaceState']) {
      const original = history[name].bind(history);
      history[name] = (...args) => { original(...args); navigation(); };
    }
    window.addEventListener('popstate', navigation);
    window.addEventListener('oho-resume', () => {
      if (Date.parse(sessionStorage.getItem('tokenExpiresAt') || '') <= Date.now()) sessionStorage.clear();
      window.dispatchEvent(new Event('auth-session-changed'));
    });
    navigation();
  })(); true;`;
}
