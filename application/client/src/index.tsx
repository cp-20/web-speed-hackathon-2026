import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { SWRConfig } from "swr";

import { AppContainer } from "@web-speed-hackathon-2026/client/src/containers/AppContainer";

declare global {
  interface Window {
    __SWR_CACHE__?: Record<string, unknown>;
  }
}

window.addEventListener("load", () => {
  const rootElement = document.getElementById("app")!;

  // サーバー側から埋め込まれたSWRキャッシュを取得
  const swrCache = window.__SWR_CACHE__ ?? {};

  const app = (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        errorRetryCount: 0,
        fallback: swrCache,
      }}
    >
      <BrowserRouter>
        <AppContainer />
      </BrowserRouter>
    </SWRConfig>
  );

  if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, app);
    return;
  }

  createRoot(rootElement).render(app);
});
